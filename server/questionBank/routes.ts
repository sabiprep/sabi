import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { questionReviewBodySchema } from './workflow';
import { createQuestionFingerprint } from './validation';
import { validateQuestionImport } from './importValidation';

const router = Router();
const contentRoles = ['CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'] as const;
const importValidationBodySchema = z.strictObject({
  sourceLabel: z.string().trim().min(1).max(500).optional(),
  sourceUrl: z.string().trim().url().max(2000).optional(),
  rows: z.array(z.unknown()).min(1).max(1000),
});
const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
  subject: z.string().trim().min(1).max(100).optional(),
});

router.get('/eligible', requireAuth, async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid question-bank query.', details: parsed.error.issues });
  }

  const { limit, offset, subject } = parsed.data;
  const { data, error } = await supabaseAdmin.rpc('get_eligible_question_bank', {
    p_subject_slug: subject ?? null,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) {
    console.error('[SABI] Eligible question retrieval failed:', error.message);
    return res.status(503).json({ error: 'The verified question pool is temporarily unavailable.' });
  }

  // The RPC deliberately never returns the answer key or explanation.
  return res.json({ status: 'success', questions: data ?? [], limit, offset });
});

router.get('/review-queue', requireAuth, requireRole(...contentRoles), async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid review-queue query.', details: parsed.error.issues });
  }

  const { limit, offset, subject } = parsed.data;
  let query = supabaseAdmin
    .from('question_bank')
    .select('id,subject,topic,subtopic,topic_id,subtopic_id,year,question,option_a,option_b,option_c,option_d,answer,explanation,explanation_short,difficulty,source,status,review_state,current_version,created_at,updated_at', { count: 'exact' })
    .eq('review_state', 'pending_review')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (subject) query = query.eq('subject', subject);

  const { data, error, count } = await query;
  if (error) {
    console.error('[SABI] Question review queue failed:', error.message);
    return res.status(503).json({ error: 'The question review queue is temporarily unavailable.' });
  }

  return res.json({ status: 'success', questions: data ?? [], total: count ?? 0, limit, offset });
});

router.post('/import/validate', requireAuth, requireRole(...contentRoles), validateBody(importValidationBodySchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { sourceLabel, sourceUrl, rows } = req.body;

  // Build a read-only duplicate index from the current bank. Pagination avoids
  // PostgREST's default row cap; no question-bank records are changed.
  const existingFingerprints = new Map<string, string>();
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabaseAdmin
      .from('question_bank')
      .select('id,question,option_a,option_b,option_c,option_d,topic:jamb_topics!question_bank_topic_id_fkey(subject_slug)')
      .range(offset, offset + pageSize - 1);

    if (error) {
      console.error('[SABI] Existing question duplicate index failed:', error.message);
      return res.status(503).json({ error: 'Existing question records could not be checked for duplicates.' });
    }

    for (const record of data ?? []) {
      const row = record as any;
      const topic = Array.isArray(row.topic) ? row.topic[0] : row.topic;
      if (!topic?.subject_slug || !row.question || !row.option_a || !row.option_b || !row.option_c || !row.option_d) continue;
      const fingerprint = createQuestionFingerprint({
        subjectSlug: topic.subject_slug,
        question: row.question,
        options: { A: row.option_a, B: row.option_b, C: row.option_c, D: row.option_d },
      });
      existingFingerprints.set(fingerprint, row.id);
    }

    if (!data || data.length < pageSize) break;
  }

  const report = validateQuestionImport(rows, existingFingerprints);
  const { data: batch, error: batchError } = await supabaseAdmin
    .from('question_import_batches')
    .insert({
      source_label: sourceLabel ?? null,
      source_url: sourceUrl ?? null,
      created_by: authReq.user!.id,
      status: 'validating',
      total_rows: report.totalRows,
    })
    .select('id')
    .single();

  if (batchError || !batch) {
    console.error('[SABI] Question import batch creation failed:', batchError?.message);
    return res.status(503).json({ error: 'The import validation batch could not be created.' });
  }

  const persistedRows = report.rows.map((result) => ({
    batch_id: batch.id,
    row_number: result.rowNumber,
    raw_payload: rows[result.rowNumber - 1],
    normalized_payload: result.outcome === 'valid' ? result.normalized : null,
    validation_errors: result.outcome === 'invalid'
      ? result.errors
      : result.outcome === 'duplicate'
        ? [{ code: 'duplicate', field: 'question', message: result.duplicateQuestionId
            ? `Matches existing question ${result.duplicateQuestionId}.`
            : `Duplicates row ${result.duplicateOfRow} in this batch.` }]
        : [],
    duplicate_question_id: result.outcome === 'duplicate' ? result.duplicateQuestionId ?? null : null,
    outcome: result.outcome,
  }));

  const { error: rowsError } = await supabaseAdmin.from('question_import_rows').insert(persistedRows);
  if (rowsError) {
    await supabaseAdmin.from('question_import_batches')
      .update({ status: 'failed', summary: { error: 'Could not persist import validation rows.' }, completed_at: new Date().toISOString() })
      .eq('id', batch.id);
    console.error('[SABI] Question import rows could not be saved:', rowsError.message);
    return res.status(503).json({ error: 'The import validation report could not be saved.' });
  }

  const summary = {
    totalRows: report.totalRows,
    validRows: report.validRows,
    invalidRows: report.invalidRows,
    duplicateRows: report.duplicateRows,
  };
  const { error: completeError } = await supabaseAdmin.from('question_import_batches')
    .update({
      status: 'validated',
      valid_rows: report.validRows,
      invalid_rows: report.invalidRows,
      duplicate_rows: report.duplicateRows,
      summary,
      completed_at: new Date().toISOString(),
    })
    .eq('id', batch.id);

  if (completeError) {
    console.error('[SABI] Question import batch finalization failed:', completeError.message);
    return res.status(503).json({ error: 'The import validation report was saved but could not be finalized.' });
  }

  return res.status(201).json({ status: 'validated', batchId: batch.id, ...summary, rows: report.rows });
});

router.get('/:questionId', requireAuth, requireRole(...contentRoles), async (req, res) => {
  const { data: question, error } = await supabaseAdmin
    .from('question_bank')
    .select('id,exam_type,subject,topic,subtopic,topic_id,subtopic_id,year,question,option_a,option_b,option_c,option_d,answer,explanation,explanation_short,difficulty,concepts,source,status,review_state,current_version,created_at,updated_at')
    .eq('id', req.params.questionId)
    .maybeSingle();

  if (error) {
    console.error('[SABI] Question review detail failed:', error.message);
    return res.status(503).json({ error: 'Question details are temporarily unavailable.' });
  }
  if (!question) return res.status(404).json({ error: 'Question not found.' });

  const [{ data: provenance }, { data: reviews }, { data: flags }] = await Promise.all([
    supabaseAdmin.from('question_provenance').select('*').eq('question_id', req.params.questionId).maybeSingle(),
    supabaseAdmin.from('question_review_events').select('*').eq('question_id', req.params.questionId).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('question_flags').select('*').eq('question_id', req.params.questionId).order('created_at', { ascending: false }).limit(20),
  ]);

  return res.json({ status: 'success', question, provenance, reviews: reviews ?? [], flags: flags ?? [] });
});

router.post('/:questionId/review', requireAuth, requireRole(...contentRoles), validateBody(questionReviewBodySchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { decision, comments, qualityChecks } = req.body;

  const { data, error } = await supabaseAdmin.rpc('review_question_bank_item', {
    p_question_id: req.params.questionId,
    p_decision: decision,
    p_reviewer_id: authReq.user!.id,
    p_reviewer_role: authReq.role!,
    p_comments: comments ?? null,
    p_quality_checks: qualityChecks ?? {},
  });

  if (error) {
    const status = error.code === 'P0002' ? 404
      : error.code === '42501' ? 403
      : error.code === '22023' ? 409
      : error.code === '23514' ? 422
      : 503;
    return res.status(status).json({ error: error.message || 'Question review could not be completed.' });
  }

  return res.json({ status: 'success', review: data });
});

export { router as questionBankRouter };
