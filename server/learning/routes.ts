/**
 * Core Sabi learning API.
 *
 * All routes require a Supabase access token. Question answers are never sent
 * to the client until the database has accepted that student's submission.
 */
import { Router, type Request } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { requireRole } from '../middleware/requireRole';
import { isCBTExpired } from './cbtTimer';
import { isCbtFeedbackLocked } from './answerVisibility';
import { buildStoredAnswerReplay } from './answerReplay';
import { buildLearningAnalytics, buildStudyPlan, buildSyllabusCoverage } from './engineExecution';
import { selectPersonalizedQuestions } from './selectors';
import { enqueueNotification } from '../notifications/queue';
import { awardXP, recordStudyActivity } from '../gamification/service';

const router = Router();

const createSessionSchema = z.strictObject({
  mode: z.enum(['diagnostic', 'smart_practice', 'blitz', 'cbt', 'custom']),
  subject: z.string().trim().min(1).max(80).optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(4).optional(),
  topic: z.string().trim().min(1).max(160).optional(),
  topics: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
  subtopic: z.string().trim().min(1).max(160).optional(),
  difficulty: z.string().trim().min(1).max(40).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  limit: z.number().int().min(1).max(180).default(20),
  configurationKey: z.enum(['quick-mock', 'full-mock']).optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

const sourceReviewSchema = z.strictObject({
  verificationStatus: z.enum(['verified', 'restricted', 'rejected']),
  permittedUse: z.enum(['unknown', 'internal_review', 'practice_display', 'redistribution_allowed', 'restricted']),
  notes: z.string().trim().max(1000).optional(),
});

const questionTaxonomySchema = z.strictObject({
  topicId: z.string().uuid(),
  subtopicId: z.string().uuid().optional(),
});

const questionReviewSchema = z.strictObject({
  action: z.enum(['publish', 'needs-review', 'reject']),
  notes: z.string().trim().max(1000).optional(),
});

const answerSchema = z.strictObject({
  questionId: z.string().trim().min(1).max(100),
  selectedOption: z.enum(['A', 'B', 'C', 'D']),
  elapsedMs: z.number().int().min(0).max(3600000).optional(),
});

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}


async function validateVerifiedQuestionTaxonomy(input: {
  subject: string;
  topicId: string | null;
  subtopicId?: string | null;
}) {
  if (!input.topicId) {
    return { ok: false as const, code: 'QUESTION_TOPIC_NOT_MAPPED', message: 'Link the question to a verified syllabus topic before publication.' };
  }
  const [{ data: subjects, error: subjectsError }, { data: topic, error: topicError }] = await Promise.all([
    supabaseAdmin.from('jamb_subjects').select('slug, display_name, aliases').eq('is_active', true),
    supabaseAdmin.from('jamb_topics')
      .select('id, subject_slug, name, syllabus_version_id, verification_status, is_active')
      .eq('id', input.topicId).maybeSingle(),
  ]);
  if (subjectsError || topicError) {
    return { ok: false as const, code: 'TAXONOMY_LOOKUP_FAILED', message: 'The syllabus taxonomy could not be verified.' };
  }
  const normalizedSubject = input.subject.trim().toLowerCase();
  const subject = (subjects || []).find((row) =>
    row.display_name.trim().toLowerCase() === normalizedSubject ||
    (row.aliases || []).some((alias: string) => alias.trim().toLowerCase() === normalizedSubject)
  );
  if (!subject || !topic || topic.subject_slug !== subject.slug) {
    return { ok: false as const, code: 'QUESTION_TAXONOMY_MISMATCH', message: 'The selected topic does not belong to this question subject.' };
  }
  if (!topic.is_active || topic.verification_status !== 'verified' || !topic.syllabus_version_id) {
    return { ok: false as const, code: 'TOPIC_NOT_VERIFIED', message: 'The topic must belong to an active, verified syllabus version before publication.' };
  }
  const { data: version, error: versionError } = await supabaseAdmin
    .from('jamb_syllabus_versions')
    .select('id')
    .eq('id', topic.syllabus_version_id)
    .eq('verification_status', 'verified')
    .maybeSingle();
  if (versionError) {
    return { ok: false as const, code: 'TAXONOMY_LOOKUP_FAILED', message: 'The syllabus version could not be verified.' };
  }
  if (!version) {
    return { ok: false as const, code: 'SYLLABUS_VERSION_NOT_VERIFIED', message: 'The syllabus version has not been verified for publication.' };
  }

  let subtopic: { id: string; name: string } | null = null;
  if (input.subtopicId) {
    const { data, error } = await supabaseAdmin.from('jamb_subtopics')
      .select('id, topic_id, name, verification_status, is_active')
      .eq('id', input.subtopicId).maybeSingle();
    if (error) return { ok: false as const, code: 'TAXONOMY_LOOKUP_FAILED', message: 'The subtopic could not be verified.' };
    if (!data || data.topic_id !== topic.id || !data.is_active || data.verification_status !== 'verified') {
      return { ok: false as const, code: 'SUBTOPIC_NOT_VERIFIED', message: 'The selected subtopic must be active, verified, and belong to the selected topic.' };
    }
    subtopic = { id: data.id, name: data.name };
  }
  return { ok: true as const, topic: { id: topic.id, name: topic.name }, subtopic };
}


async function enqueueSessionCompletionNotification(userId: string, sessionId: string, mode: string) {
  try {
    // Until learner timezone preferences are exposed in profile settings, use
    // the product's explicit Nigeria default rather than an arbitrary server timezone.
    await recordStudyActivity(supabaseAdmin, userId, 'Africa/Lagos');
  } catch (error) {
    console.error('[SABI] Study streak update failed:', error instanceof Error ? error.name : 'unknown_error');
  }
  try {
    await awardXP(supabaseAdmin, {
      userId,
      eventKey: 'session_completed',
      referenceType: 'learning_sessions',
      referenceId: sessionId,
      idempotencyKey: `session-completed:${sessionId}`,
    });
  } catch (error) {
    console.error('[SABI] Session completion XP award failed:', error instanceof Error ? error.name : 'unknown_error');
  }
  try {
    await enqueueNotification(supabaseAdmin, {
      userId,
      channel: 'in_app',
      notificationKey: 'learning_session_completed',
      idempotencyKey: `learning-session-completed:${sessionId}`,
      payload: {
        title: 'Practice session completed',
        body: 'Your results are ready. Review your answers and next steps.',
        data: { sessionId, mode },
      },
    });
  } catch (error) {
    console.error('[SABI] Session completion notification enqueue failed:', error instanceof Error ? error.name : 'unknown_error');
  }
}

function authenticatedUser(req: Request): string | null {
  return (req as AuthenticatedRequest).user?.id || null;
}



/**
 * Content review is restricted to trusted content staff. AI-draft questions
 * never become student-facing until an authorized reviewer explicitly publishes
 * them after validating the answer and all four options.
 */

router.get('/content-review/sources', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('question_sources')
    .select('id, source_key, source_name, source_type, source_url, license_name, attribution_required, permitted_use, verification_status, notes')
    .order('updated_at', { ascending: false })
    .limit(100);
  if (error) return res.status(503).json({ error: 'Question source review is temporarily unavailable.' });
  return res.json({ sources: data || [] });
});

router.post('/content-review/sources/:sourceId', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), validateBody(sourceReviewSchema), async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const sourceId = String(req.params.sourceId || '').trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sourceId)) {
    return res.status(400).json({ error: 'A valid source ID is required.' });
  }
  const { verificationStatus, permittedUse, notes } = req.body as z.infer<typeof sourceReviewSchema>;
  const { data: source, error } = await supabaseAdmin
    .from('question_sources')
    .update({
      verification_status: verificationStatus,
      permitted_use: permittedUse,
      checked_at: new Date().toISOString(),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sourceId)
    .select('id, source_key, source_name, verification_status, permitted_use, checked_at')
    .maybeSingle();
  if (error) return res.status(503).json({ error: 'The source verification decision could not be saved.' });
  if (!source) return res.status(404).json({ error: 'Question source not found.' });
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'question_source.reviewed',
    resource_type: 'question_sources',
    resource_id: sourceId,
    metadata: { verification_status: verificationStatus, permitted_use: permittedUse, notes: notes || null },
  });
  if (auditError) console.error('[SABI] Source review audit log failed:', auditError.message);
  return res.json({ status: 'updated', source });
});


router.get('/content-review/quality-report', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const [questionsResult, sourcesResult, versionsResult, objectivesResult] = await Promise.all([
    supabaseAdmin.from('question_bank')
      .select('id, subject, status, source_id, topic_id, content_fingerprint')
      .limit(10000),
    supabaseAdmin.from('question_sources')
      .select('id, verification_status, permitted_use')
      .limit(2000),
    supabaseAdmin.from('jamb_syllabus_versions')
      .select('id')
      .eq('verification_status', 'verified')
      .limit(5000),
    supabaseAdmin.from('jamb_syllabus_objectives')
      .select('id')
      .eq('verification_status', 'verified')
      .limit(10000),
  ]);
  const queryError = questionsResult.error || sourcesResult.error || versionsResult.error || objectivesResult.error;
  if (queryError) {
    console.error('[SABI] Question quality report failed:', queryError.message);
    return res.status(503).json({ error: 'The question quality report is temporarily unavailable.' });
  }

  const sourceById = new Map((sourcesResult.data || []).map((source) => [source.id, source]));
  const subjectStatus = new Map<string, Record<string, number>>();
  const fingerprints = new Map<string, number>();
  let missingSource = 0;
  let unclearedSource = 0;
  let missingTopic = 0;
  let published = 0;
  let drafts = 0;
  for (const question of questionsResult.data || []) {
    const counts = subjectStatus.get(question.subject) || {};
    counts[question.status] = (counts[question.status] || 0) + 1;
    subjectStatus.set(question.subject, counts);
    if (question.status === 'published') published += 1;
    if (['ai-draft', 'needs-review'].includes(question.status)) drafts += 1;
    if (!question.source_id) missingSource += 1;
    else {
      const source = sourceById.get(question.source_id);
      if (!source || source.verification_status !== 'verified' ||
          !['practice_display', 'redistribution_allowed'].includes(source.permitted_use)) unclearedSource += 1;
    }
    if (!question.topic_id) missingTopic += 1;
    if (question.content_fingerprint) fingerprints.set(question.content_fingerprint, (fingerprints.get(question.content_fingerprint) || 0) + 1);
  }
  const duplicateFingerprints = [...fingerprints.values()].filter((count) => count > 1).length;
  res.set('Cache-Control', 'no-store');
  return res.json({
    totalQuestions: questionsResult.data?.length || 0,
    publishedQuestions: published,
    reviewQueueQuestions: drafts,
    bySubject: [...subjectStatus.entries()].map(([subject, statuses]) => ({ subject, statuses })).sort((a, b) => a.subject.localeCompare(b.subject)),
    publicationBlockers: {
      questionsMissingSource: missingSource,
      questionsWithUnclearedSource: unclearedSource,
      questionsMissingVerifiedTopicMapping: missingTopic,
      verifiedSyllabusVersions: versionsResult.data?.length || 0,
      verifiedSyllabusObjectives: objectivesResult.data?.length || 0,
    },
    duplicateContentFingerprints: duplicateFingerprints,
    truncated: (questionsResult.data || []).length >= 10000,
  });
});

router.get('/content-review/queue', requireAuth, requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const rawLimit = req.query.limit === undefined ? 50 : Number(req.query.limit);
  const rawOffset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  const subject = typeof req.query.subject === 'string' ? req.query.subject.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status.trim() : '';
  if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100 ||
      !Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset > 50000 ||
      (status && !['ai-draft', 'needs-review'].includes(status)) || subject.length > 80) {
    return res.status(400).json({ error: 'Invalid content review filters.' });
  }

  let query = supabaseAdmin
    .from('question_bank')
    .select('id, exam_type, subject, topic, subtopic, topic_id, subtopic_id, year, question, option_a, option_b, option_c, option_d, answer, explanation, explanation_short, difficulty, source, source_id, content_fingerprint, review_status, status, confidence_score, flag_count, created_at', { count: 'exact' })
    .in('status', status ? [status] : ['ai-draft', 'needs-review']);
  if (subject) query = query.eq('subject', subject);
  const { data, error, count } = await query
    .order('created_at', { ascending: true })
    .range(rawOffset, rawOffset + rawLimit - 1);
  if (error) {
    console.error('[SABI] Content review queue lookup failed:', error.message);
    return res.status(503).json({ error: 'The content review queue is temporarily unavailable.' });
  }
  res.set('Cache-Control', 'no-store');
  const total = count || 0;
  const nextOffset = rawOffset + (data || []).length;
  return res.json({
    questions: data || [],
    returned: (data || []).length,
    total,
    offset: rawOffset,
    limit: rawLimit,
    nextOffset: nextOffset < total ? nextOffset : null,
  });
});


router.post('/content-review/:questionId/taxonomy', requireAuth, requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'), validateBody(questionTaxonomySchema), async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const questionId = String(req.params.questionId || '').trim();
  if (!questionId || questionId.length > 100) return res.status(400).json({ error: 'A valid question ID is required.' });
  const { topicId, subtopicId } = req.body as z.infer<typeof questionTaxonomySchema>;

  const { data: question, error: questionError } = await supabaseAdmin
    .from('question_bank').select('id, subject, status')
    .eq('id', questionId).maybeSingle();
  if (questionError) return res.status(503).json({ error: 'The question could not be loaded.' });
  if (!question) return res.status(404).json({ error: 'Question not found.' });
  if (!['ai-draft', 'needs-review'].includes(question.status)) {
    return res.status(409).json({ error: 'Only unpublished questions can have review taxonomy changed.' });
  }

  const taxonomy = await validateVerifiedQuestionTaxonomy({ subject: question.subject, topicId, subtopicId: subtopicId || null });
  if (!taxonomy.ok) return res.status(409).json({ error: taxonomy.message, code: taxonomy.code });

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('question_bank')
    .update({
      topic_id: taxonomy.topic.id,
      subtopic_id: taxonomy.subtopic?.id || null,
      topic: taxonomy.topic.name,
      subtopic: taxonomy.subtopic?.name || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', questionId)
    .in('status', ['ai-draft', 'needs-review'])
    .select('id, topic_id, subtopic_id, topic, subtopic')
    .maybeSingle();
  if (updateError) return res.status(503).json({ error: 'The question taxonomy could not be saved.' });
  if (!updated) return res.status(409).json({ error: 'The question changed during taxonomy review. Reload and retry.' });

  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    actor_role: (req as AuthenticatedRequest).role || 'CONTENT_MANAGER',
    action: 'question.taxonomy_linked',
    resource_type: 'question_bank',
    resource_id: questionId,
    metadata: { topic_id: updated.topic_id, subtopic_id: updated.subtopic_id },
  });
  if (auditError) console.error('[SABI] Question taxonomy audit log failed:', auditError.message);
  return res.json({ status: 'updated', question: updated });
});

router.post('/content-review/:questionId', requireAuth, requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'), validateBody(questionReviewSchema), async (req, res) => {
  const userId = authenticatedUser(req);
  const reviewerRole = (req as AuthenticatedRequest).role || 'CONTENT_MANAGER';
  const questionId = String(req.params.questionId || '').trim();
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  if (!questionId || questionId.length > 100) return res.status(400).json({ error: 'A valid question ID is required.' });

  const { action, notes } = req.body as z.infer<typeof questionReviewSchema>;
  try {
    const { data: question, error: lookupError } = await supabaseAdmin
      .from('question_bank')
      .select('id, exam_type, subject, topic_id, subtopic_id, question, option_a, option_b, option_c, option_d, answer, explanation, source_id, content_fingerprint, status')
      .eq('id', questionId)
      .maybeSingle();
    if (lookupError) {
      console.error('[SABI] Content review question lookup failed:', lookupError.message);
      return res.status(503).json({ error: 'The question could not be loaded for review.' });
    }
    if (!question) return res.status(404).json({ error: 'Question not found.' });
    if (!['ai-draft', 'needs-review'].includes(question.status)) {
      return res.status(409).json({ error: 'Only draft or flagged questions can be reviewed here.' });
    }

    if (action === 'publish') {
      const taxonomy = await validateVerifiedQuestionTaxonomy({
        subject: question.subject,
        topicId: question.topic_id,
        subtopicId: question.subtopic_id,
      });
      if (!taxonomy.ok) {
        return res.status(409).json({ error: taxonomy.message, code: taxonomy.code });
      }
      if (!question.source_id) {
        return res.status(409).json({
          error: 'Question provenance must be recorded and cleared for student practice before publication.',
          code: 'QUESTION_SOURCE_NOT_CLEARED',
        });
      }
      const { data: source, error: sourceError } = await supabaseAdmin
        .from('question_sources')
        .select('verification_status, permitted_use')
        .eq('id', question.source_id)
        .maybeSingle();
      if (sourceError) return res.status(503).json({ error: 'Question provenance could not be verified.' });
      if (!source || source.verification_status !== 'verified' ||
          !['practice_display', 'redistribution_allowed'].includes(source.permitted_use)) {
        return res.status(409).json({
          error: 'The question source is not cleared for student-facing practice.',
          code: 'QUESTION_SOURCE_NOT_CLEARED',
        });
      }
      const options = [question.option_a, question.option_b, question.option_c, question.option_d];
      if (question.exam_type !== 'UTME' || !question.question?.trim() ||
          options.some((option) => !option?.trim()) ||
          !['a', 'b', 'c', 'd'].includes(String(question.answer || '').trim().toLowerCase())) {
        return res.status(422).json({
          error: 'This question is incomplete. Confirm the UTME question text, all four options, and a valid answer key before publishing.',
        });
      }
    }

    const nextStatus = action === 'publish' ? 'published' : action === 'reject' ? 'rejected' : 'needs-review';
    const nextReviewStatus = action === 'publish' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_review';
    const reviewedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('question_bank')
      .update({
        status: nextStatus,
        review_status: nextReviewStatus,
        last_reviewed_at: reviewedAt,
        verified_by: action === 'publish' ? userId : null,
        updated_at: reviewedAt,
      })
      .eq('id', questionId)
      .in('status', ['ai-draft', 'needs-review'])
      .select('id, status, verified_by, updated_at')
      .maybeSingle();

    if (updateError) {
      console.error('[SABI] Content review update failed:', updateError.message);
      return res.status(503).json({ error: 'The review decision could not be saved.' });
    }
    if (!updated) return res.status(409).json({ error: 'The question changed during review. Reload the queue and try again.' });

    const { error: historyError } = await supabaseAdmin.from('question_review_history').insert({
      question_id: questionId,
      reviewer_user_id: userId,
      review_decision: action === 'publish' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_revision',
      reviewer_notes: notes || null,
      reviewed_at: reviewedAt,
    });
    if (historyError) console.error('[SABI] Question review history write failed:', historyError.message);

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: userId,
      actor_role: reviewerRole,
      action: `question.${action}`,
      resource_type: 'question_bank',
      resource_id: questionId,
      metadata: { notes: notes || null, resulting_status: nextStatus },
    });
    if (auditError) console.error('[SABI] Question review audit log failed:', auditError.message);

    return res.json({ status: 'updated', question: updated, reviewHistoryRecorded: !historyError });
  } catch (error) {
    console.error('[SABI] Unexpected content review error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while reviewing the question.' });
  }
});

router.get('/exam-configurations', requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('exam_configurations')
    .select('key, title, question_count, duration_seconds, total_subjects, compulsory_subject_slug, optional_subject_count')
    .eq('is_active', true)
    .order('question_count', { ascending: true });
  if (error) {
    console.error('[SABI] Exam configuration lookup failed:', error.message);
    return res.status(503).json({ error: 'Exam configurations are temporarily unavailable.' });
  }
  return res.json({ configurations: data || [] });
});

router.post('/sessions', requireAuth, validateBody(createSessionSchema), async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const { mode, subject, subjects, topic, topics, subtopic, difficulty, year, limit, configurationKey, metadata } = req.body as z.infer<typeof createSessionSchema>;

  try {
    let selected: any[] = [];
    const requestedSubjects = [...new Set([...(subjects || []), ...(subject ? [subject] : [])]
      .map((value) => /^english language$/i.test(value.trim()) ? 'Use of English' : value.trim()))];
    if (mode === 'custom' && !requestedSubjects.length && !topic && !topics?.length && !subtopic && !difficulty && year === undefined) {
      return res.status(400).json({
        error: 'Choose at least one subject, topic, subtopic, difficulty or year filter for Custom Practice.',
        code: 'CUSTOM_FILTER_REQUIRED',
      });
    }
    let sessionSubject = requestedSubjects.length ? requestedSubjects.join(', ') : null;
    let sessionMetadata: Record<string, unknown> = {
      ...metadata,
      requestedFilters: {
        subjects: requestedSubjects,
        topic: topic || null,
        topics: topics || [],
        subtopic: subtopic || null,
        difficulty: difficulty || null,
        year: year ?? null,
      },
    };

    if (mode === 'cbt') {
      const configKey = configurationKey || 'quick-mock';
      const [configurationResult, profileResult, catalogueResult] = await Promise.all([
        supabaseAdmin.from('exam_configurations')
          .select('key, title, question_count, duration_seconds, total_subjects, compulsory_subject_slug, optional_subject_count')
          .eq('key', configKey).eq('is_active', true).maybeSingle(),
        supabaseAdmin.from('profiles').select('registered_subjects').eq('id', userId).maybeSingle(),
        supabaseAdmin.from('jamb_subjects').select('slug, display_name, aliases').eq('is_active', true),
      ]);

      if (configurationResult.error || profileResult.error || catalogueResult.error) {
        console.error('[SABI] CBT configuration lookup failed:',
          configurationResult.error?.message || profileResult.error?.message || catalogueResult.error?.message);
        return res.status(503).json({ error: 'CBT configuration is temporarily unavailable.' });
      }

      const examConfig = configurationResult.data;
      const registeredSubjects = profileResult.data?.registered_subjects || [];
      const catalogue = catalogueResult.data || [];
      if (!examConfig) return res.status(404).json({ error: 'The selected CBT configuration is unavailable.' });
      if (registeredSubjects.length !== 4) {
        return res.status(400).json({ error: 'Complete onboarding and select your four UTME subjects before starting a CBT.' });
      }

      const canonicalSubjects = registeredSubjects.map((raw: string) => {
        const normalized = String(raw).trim().toLowerCase();
        const match = catalogue.find((item: any) =>
          item.display_name.toLowerCase() === normalized ||
          (item.aliases || []).some((alias: string) => alias.toLowerCase() === normalized)
        );
        return match ? match : null;
      });
      const compulsory = catalogue.find((item: any) => item.slug === examConfig.compulsory_subject_slug);
      if (canonicalSubjects.some((item: any) => !item) || !compulsory ||
          canonicalSubjects.filter((item: any) => item.slug === compulsory.slug).length !== 1) {
        return res.status(400).json({ error: 'Your saved UTME subject combination is invalid. Please update onboarding.' });
      }

      const optionalSubjects = canonicalSubjects.filter((item: any) => item.slug !== compulsory.slug);
      if (optionalSubjects.length !== examConfig.optional_subject_count) {
        return res.status(400).json({ error: 'Your saved UTME subject combination does not match the exam configuration.' });
      }

      const compulsoryCount = configKey === 'full-mock' ? 60 : 10;
      const optionalCount = Math.floor((examConfig.question_count - compulsoryCount) / optionalSubjects.length);
      const sections = [
        { subject: compulsory, count: compulsoryCount },
        ...optionalSubjects.map((item: any) => ({ subject: item, count: optionalCount })),
      ];

      for (const section of sections) {
        const questionBankSubject = section.subject.slug === examConfig.compulsory_subject_slug
          ? 'Use of English'
          : section.subject.display_name;
        const { data: subjectQuestions, error: subjectError } = await supabaseAdmin
          .from('question_bank')
          .select('id, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, difficulty, question_sources!inner(verification_status, permitted_use)')
          .eq('exam_type', 'UTME')
          .eq('status', 'published')
          .eq('review_status', 'approved')
          .eq('question_sources.verification_status', 'verified')
          .in('question_sources.permitted_use', ['practice_display', 'redistribution_allowed'])
          .ilike('subject', questionBankSubject)
          .limit(1000);

        if (subjectError) {
          console.error('[SABI] CBT subject question retrieval failed:', subjectError.message);
          return res.status(503).json({ error: 'CBT questions are temporarily unavailable.' });
        }
        if ((subjectQuestions || []).length < section.count) {
          return res.status(409).json({
            error: 'There are not enough approved questions to build this complete CBT yet.',
            code: 'CBT_QUESTION_SHORTAGE',
            subject: section.subject.display_name,
            required: section.count,
            available: (subjectQuestions || []).length,
          });
        }
        selected.push(...shuffle(subjectQuestions || []).slice(0, section.count));
      }

      sessionSubject = sections.map((section) => section.subject.display_name).join(', ');
      const cbtStartedAt = new Date();
      const cbtExpiresAt = new Date(cbtStartedAt.getTime() + Number(examConfig.duration_seconds) * 1000);
      sessionMetadata = {
        ...metadata,
        examConfiguration: {
          key: examConfig.key,
          title: examConfig.title,
          durationSeconds: examConfig.duration_seconds,
          startedAt: cbtStartedAt.toISOString(),
          expiresAt: cbtExpiresAt.toISOString(),
          sections: sections.map((section) => ({
            subject: section.subject.display_name,
            subjectSlug: section.subject.slug,
            questionCount: section.count,
          })),
        },
      };
    } else {
      let query = supabaseAdmin
        .from('question_bank')
        .select('id, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, difficulty, question_sources!inner(verification_status, permitted_use)')
        .eq('exam_type', 'UTME')
        .eq('status', 'published')
        .eq('review_status', 'approved')
        .eq('question_sources.verification_status', 'verified')
        .in('question_sources.permitted_use', ['practice_display', 'redistribution_allowed']);

      if (requestedSubjects.length === 1) query = query.ilike('subject', requestedSubjects[0]);
      else if (requestedSubjects.length > 1) query = query.in('subject', requestedSubjects);
      if (topic) query = query.ilike('topic', topic);
      if (topics?.length) query = query.in('topic', topics);
      if (subtopic) query = query.ilike('subtopic', subtopic);
      if (difficulty) query = query.ilike('difficulty', difficulty);
      if (year !== undefined) query = query.eq('year', year);

      const { data: candidates, error: questionError } = await query.limit(1000);
      if (questionError) {
        console.error('[SABI] Learning question retrieval failed:', questionError.message);
        return res.status(503).json({ error: 'Questions are temporarily unavailable.' });
      }

      const orderedCandidates = shuffle(candidates || []);

      if (mode === 'smart_practice' || mode === 'blitz') {
        const [masteryResult, recentResult] = await Promise.all([
          supabaseAdmin.from('student_topic_mastery')
            .select('subject, topic, mastery_score, next_review_at, attempted_count, correct_streak, interval_days, last_result')
            .eq('user_id', userId),
          supabaseAdmin.from('learning_session_items')
            .select('question_id')
            .eq('user_id', userId)
            .not('answered_at', 'is', null)
            .order('answered_at', { ascending: false })
            .limit(120),
        ]);
        if (masteryResult.error || recentResult.error) {
          console.error('[SABI] Adaptive practice lookup failed:', masteryResult.error?.message || recentResult.error?.message);
          return res.status(503).json({ error: 'Personalized practice is temporarily unavailable.' });
        }
        const ranked = selectPersonalizedQuestions({
          candidates: orderedCandidates,
          mastery: masteryResult.data || [],
          recentQuestionIds: (recentResult.data || []).map((row) => row.question_id),
          limit,
          mode,
        });
        selected = ranked.map((item) => item.question);
        sessionMetadata = {
          ...sessionMetadata,
          selectionPolicy: mode === 'blitz' ? 'hybrid_personalized_discovery_v1' : 'mastery_adaptive_v1',
          selectionReasons: ranked.reduce<Record<string, number>>((counts, item) => {
            counts[item.reason] = (counts[item.reason] || 0) + 1;
            return counts;
          }, {}),
        };
      } else {
        selected = orderedCandidates.slice(0, limit);
        sessionMetadata = {
          ...sessionMetadata,
          selectionPolicy: mode === 'custom' ? 'explicit_filters_v1' : 'balanced_diagnostic_v1',
        };
      }
    }

    if (!selected.length) {
      return res.status(404).json({
        error: 'No approved questions match those filters yet.',
        code: 'NO_PUBLISHED_QUESTIONS',
      });
    }

    const { data: session, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .insert({
        user_id: userId,
        mode,
        subject: sessionSubject,
        total_questions: selected.length,
        metadata: sessionMetadata,
      })
      .select('id, mode, subject, status, total_questions, answered_count, correct_count, started_at, metadata')
      .single();

    if (sessionError || !session) {
      console.error('[SABI] Learning session creation failed:', sessionError?.message);
      return res.status(503).json({ error: 'Could not start the learning session.' });
    }

    const items = selected.map((question, position) => ({
      session_id: session.id,
      user_id: userId,
      question_id: question.id,
      position,
    }));

    const { error: itemsError } = await supabaseAdmin.from('learning_session_items').insert(items);
    if (itemsError) {
      await supabaseAdmin.from('learning_sessions').delete().eq('id', session.id).eq('user_id', userId);
      console.error('[SABI] Learning session item creation failed:', itemsError.message);
      return res.status(503).json({ error: 'Could not prepare the questions. Please try again.' });
    }

    res.set('Cache-Control', 'no-store');
    return res.status(201).json({
      session,
      questions: selected.map((question, position) => ({
        id: question.id,
        position,
        subject: question.subject,
        topic: question.topic,
        subtopic: question.subtopic,
        year: question.year,
        question: question.question,
        options: {
          A: question.option_a,
          B: question.option_b,
          C: question.option_c,
          D: question.option_d,
        },
        difficulty: question.difficulty,
      })),
    });
  } catch (error) {
    console.error('[SABI] Unexpected learning session error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while starting the session.' });
  }
});


router.get('/sessions/:sessionId', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const sessionId = String(req.params.sessionId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ error: 'A valid session ID is required.' });
  }

  try {
    const { data: loadedSession, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, mode, subject, status, total_questions, answered_count, correct_count, started_at, completed_at, metadata')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (sessionError) {
      console.error('[SABI] Session lookup failed:', sessionError.message);
      return res.status(503).json({ error: 'Learning session is temporarily unavailable.' });
    }
    if (!loadedSession) return res.status(404).json({ error: 'Learning session not found.' });

    let session = loadedSession;
    if (isCBTExpired(session)) {
      const completedAt = new Date().toISOString();
      const { error: expiryError } = await supabaseAdmin.from('learning_sessions')
        .update({ status: 'completed', completed_at: completedAt })
        .eq('id', sessionId).eq('user_id', userId).eq('status', 'in_progress');
      if (expiryError) {
        console.error('[SABI] CBT auto-submit failed:', expiryError.message);
        return res.status(503).json({ error: 'The expired CBT could not be finalized. Please retry.' });
      }
      const { error: completionEventError } = await supabaseAdmin.from('learning_events').upsert({
        user_id: userId,
        session_id: sessionId,
        client_event_id: `cbt-auto-submit:${sessionId}`,
        event_type: 'session_completed',
        event_payload: { source: 'server_cbt_timer', reason: 'time_expired' },
        occurred_at: completedAt,
        schema_version: 1,
      }, { onConflict: 'user_id,client_event_id', ignoreDuplicates: true });
      if (completionEventError) console.error('[SABI] CBT completion event could not be recorded:', completionEventError.message);
      await enqueueSessionCompletionNotification(userId, sessionId, session.mode);
      session = { ...session, status: 'completed', completed_at: completedAt };
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('learning_session_items')
      .select('question_id, position, selected_option, is_correct, elapsed_ms, answered_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .order('position', { ascending: true });
    if (itemsError) {
      console.error('[SABI] Session items lookup failed:', itemsError.message);
      return res.status(503).json({ error: 'Session questions are temporarily unavailable.' });
    }

    const questionIds = (items || []).map((item) => item.question_id);
    const { data: questions, error: questionsError } = questionIds.length
      ? await supabaseAdmin
          .from('question_bank')
          .select('id, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, difficulty, answer, explanation_short, explanation')
          .in('id', questionIds)
          .eq('status', 'published')
      : { data: [], error: null };
    if (questionsError) {
      console.error('[SABI] Session question content lookup failed:', questionsError.message);
      return res.status(503).json({ error: 'Session questions are temporarily unavailable.' });
    }

    const questionById = new Map((questions || []).map((question) => [question.id, question]));
    res.set('Cache-Control', 'no-store');
    return res.json({
      session,
      questions: (items || []).flatMap((item) => {
        const question = questionById.get(item.question_id);
        if (!question) return [];
        const answered = Boolean(item.answered_at);
        return [{
          id: question.id,
          position: item.position,
          subject: question.subject,
          topic: question.topic,
          subtopic: question.subtopic,
          year: question.year,
          question: question.question,
          options: { A: question.option_a, B: question.option_b, C: question.option_c, D: question.option_d },
          difficulty: question.difficulty,
          answerState: answered ? (isCbtFeedbackLocked(session.mode, session.status)
            ? {
                selectedOption: item.selected_option,
                elapsedMs: item.elapsed_ms,
                answeredAt: item.answered_at,
              }
            : {
                selectedOption: item.selected_option,
                isCorrect: item.is_correct,
                correctOption: String(question.answer || '').trim().toUpperCase(),
                explanation: question.explanation_short || question.explanation || '',
                elapsedMs: item.elapsed_ms,
                answeredAt: item.answered_at,
              }) : null,
        }];
      }),
    });
  } catch (error) {
    console.error('[SABI] Unexpected session retrieval error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while loading the session.' });
  }
});

router.post('/sessions/:sessionId/answers', requireAuth, validateBody(answerSchema), async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const sessionId = String(req.params.sessionId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
    return res.status(400).json({ error: 'A valid session ID is required.' });
  }

  const { questionId, selectedOption, elapsedMs } = req.body as z.infer<typeof answerSchema>;

  try {
    const { data: activeSession, error: activeSessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, mode, status, metadata, answered_count, total_questions')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (activeSessionError) {
      console.error('[SABI] Answer session verification failed:', activeSessionError.message);
      return res.status(503).json({ error: 'Your learning session could not be verified.' });
    }
    if (!activeSession) return res.status(404).json({ error: 'Learning session not found.' });

    // A previous request may have committed in Postgres while its HTTP response
    // was lost. Recover the stored result before rejecting a retry as already
    // answered or as a completed session. Never accept a different option.
    const { data: priorAnswer, error: priorAnswerError } = await supabaseAdmin
      .from('learning_session_items')
      .select('selected_option, is_correct')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .not('answered_at', 'is', null)
      .maybeSingle();
    if (priorAnswerError) {
      console.error('[SABI] Prior answer lookup failed:', priorAnswerError.message);
      return res.status(503).json({ error: 'Your saved answer could not be recovered. Please retry.' });
    }

    let data: any = null;
    let replayed = false;
    const restoreStoredAnswer = async (stored: { selected_option: string | null; is_correct: boolean | null }) => {
      if (stored.selected_option !== selectedOption) return { conflict: true as const };
      const { data: replaySession, error: replaySessionError } = await supabaseAdmin
        .from('learning_sessions')
        .select('status, answered_count, total_questions')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .maybeSingle();
      if (replaySessionError || !replaySession) return { unavailable: true as const };
      const { data: replayQuestion, error: replayQuestionError } = await supabaseAdmin
        .from('question_bank')
        .select('answer, explanation_short, explanation')
        .eq('id', questionId)
        .maybeSingle();
      if (replayQuestionError || !replayQuestion) return { unavailable: true as const };
      return {
        replay: buildStoredAnswerReplay({
          requestedOption: selectedOption,
          storedOption: stored.selected_option,
          isCorrect: Boolean(stored.is_correct),
          correctOption: String(replayQuestion.answer || '').trim().toUpperCase(),
          explanation: replayQuestion.explanation_short || replayQuestion.explanation || '',
          answeredCount: Number(replaySession.answered_count || 0),
          totalQuestions: Number(replaySession.total_questions || 0),
          mode: activeSession.mode,
          status: replaySession.status,
        }),
      };
    };

    if (priorAnswer) {
      const restored = await restoreStoredAnswer(priorAnswer);
      if ('conflict' in restored) {
        return res.status(409).json({ error: 'This question was already answered with a different option. Your recorded answer was not changed.' });
      }
      if ('unavailable' in restored) {
        return res.status(503).json({ error: 'The saved answer could not be restored. Please retry.' });
      }
      if (restored.replay.kind !== 'replay') {
        return res.status(409).json({ error: 'This question was already answered with a different option.' });
      }
      data = restored.replay.result;
      replayed = true;
    }

    if (!replayed && activeSession.status !== 'in_progress') {
      return res.status(409).json({ error: 'This learning session has already ended.' });
    }
    if (!replayed && isCBTExpired(activeSession)) {
      const completedAt = new Date().toISOString();
      const { error: expiryError } = await supabaseAdmin.from('learning_sessions')
        .update({ status: 'completed', completed_at: completedAt })
        .eq('id', sessionId).eq('user_id', userId).eq('status', 'in_progress');
      if (expiryError) {
        console.error('[SABI] CBT expiry finalization failed:', expiryError.message);
        return res.status(503).json({ error: 'The expired CBT could not be finalized. Please retry.' });
      }
      const { error: completionEventError } = await supabaseAdmin.from('learning_events').upsert({
        user_id: userId,
        session_id: sessionId,
        client_event_id: `cbt-auto-submit:${sessionId}`,
        event_type: 'session_completed',
        event_payload: { source: 'server_cbt_timer', reason: 'time_expired' },
        occurred_at: completedAt,
        schema_version: 1,
      }, { onConflict: 'user_id,client_event_id', ignoreDuplicates: true });
      if (completionEventError) console.error('[SABI] CBT completion event could not be recorded:', completionEventError.message);
      await enqueueSessionCompletionNotification(userId, sessionId, activeSession.mode);
      return res.status(409).json({
        error: 'Time is up. Your CBT has been submitted automatically.',
        code: 'CBT_TIME_EXPIRED',
      });
    }

    if (!replayed) {
      const { data: submittedData, error } = await supabaseAdmin.rpc('submit_learning_answer', {
        p_session_id: sessionId,
        p_question_id: questionId,
        p_selected_option: selectedOption,
        p_elapsed_ms: elapsedMs ?? null,
        p_user_id: userId,
      });

      if (error) {
        const message = error.message || '';
        // Another in-flight request may have won the race after the preflight
        // lookup. Re-read the committed row and replay only the exact same choice.
        if (/already answered|not active/i.test(message)) {
          const { data: concurrentAnswer, error: concurrentAnswerError } = await supabaseAdmin
            .from('learning_session_items')
            .select('selected_option, is_correct')
            .eq('session_id', sessionId)
            .eq('user_id', userId)
            .eq('question_id', questionId)
            .not('answered_at', 'is', null)
            .maybeSingle();
          if (concurrentAnswerError) {
            console.error('[SABI] Concurrent answer recovery failed:', concurrentAnswerError.message);
            return res.status(503).json({ error: 'Your saved answer could not be recovered. Please retry.' });
          }
          if (concurrentAnswer) {
            const restored = await restoreStoredAnswer(concurrentAnswer);
            if ('conflict' in restored) {
              return res.status(409).json({ error: 'This question was already answered with a different option. Your recorded answer was not changed.' });
            }
            if ('unavailable' in restored) {
              return res.status(503).json({ error: 'The saved answer could not be restored. Please retry.' });
            }
            if (restored.replay.kind === 'replay') {
              data = restored.replay.result;
              replayed = true;
            }
          }
        }
        if (!replayed) {
          if (/not found|not part of|already answered|no longer available/i.test(message)) {
            return res.status(404).json({ error: 'This question is not available in your active session.' });
          }
          if (/not active/i.test(message)) {
            return res.status(409).json({ error: 'This learning session has already ended.' });
          }
          if (/invalid answer|invalid elapsed/i.test(message)) {
            return res.status(400).json({ error: 'The submitted answer is invalid.' });
          }
          console.error('[SABI] Answer submission failed:', message);
          return res.status(503).json({ error: 'Your answer could not be recorded. Please try again.' });
        }
      } else {
        data = submittedData;
      }
    }

    // The answer RPC has already verified correctness and updated Phase 2
    // mastery/review state. Persist a server-authored event so the transactional
    // outbox can reliably feed the universal signal and engine workers.
    const { data: answeredItem, error: answeredItemError } = await supabaseAdmin
      .from('learning_session_items')
      .select('id, answered_at, is_correct')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .not('answered_at', 'is', null)
      .maybeSingle();

    let telemetryQueued = false;
    if (answeredItemError) {
      console.error('[SABI] Could not load verified answer for signal event:', answeredItemError.message);
    } else if (answeredItem) {
      const { error: eventError } = await supabaseAdmin
        .from('learning_events')
        .upsert({
          user_id: userId,
          session_id: sessionId,
          session_item_id: answeredItem.id,
          question_id: questionId,
          client_event_id: `answer-api:${sessionId}:${questionId}`,
          event_type: 'answer_submitted',
          elapsed_ms: elapsedMs ?? null,
          event_payload: { source: 'server_answer_api' },
          occurred_at: answeredItem.answered_at || new Date().toISOString(),
          schema_version: 1,
        }, { onConflict: 'user_id,client_event_id', ignoreDuplicates: true });
      if (eventError) {
        console.error('[SABI] Could not queue verified answer signal event:', eventError.message);
      } else {
        telemetryQueued = true;
      }
      try {
        await awardXP(supabaseAdmin, {
          userId,
          eventKey: answeredItem.is_correct ? 'correct_answer' : 'answer_submitted',
          referenceType: 'learning_session_items',
          referenceId: answeredItem.id,
          idempotencyKey: `answer:${sessionId}:${questionId}`,
        });
      } catch (xpError) {
        console.error('[SABI] Answer XP award failed:', xpError instanceof Error ? xpError.name : 'unknown_error');
      }
    }

    const { data: updatedSession, error: updatedSessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('status, mode')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (updatedSessionError) {
      console.error('[SABI] Completed session status lookup failed:', updatedSessionError.message);
    } else if (updatedSession?.status === 'completed') {
      await enqueueSessionCompletionNotification(userId, sessionId, updatedSession.mode);
    }

    const feedbackLocked = isCbtFeedbackLocked(activeSession.mode, updatedSession?.status || activeSession.status);
    const responseResult = feedbackLocked
      ? {
          recorded: true,
          answered_count: data?.answered_count,
          total_questions: data?.total_questions,
          session_completed: false,
        }
      : data;

    res.set('Cache-Control', 'no-store');
    return res.json({ status: 'recorded', result: responseResult, telemetryQueued });
  } catch (error) {
    console.error('[SABI] Unexpected answer submission error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while recording your answer.' });
  }
});



router.get('/coverage', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data: objectiveRows, error: objectiveError } = await supabaseAdmin
      .from('jamb_syllabus_objectives')
      .select('id, topic_id, subtopic_id')
      .eq('verification_status', 'verified')
      .limit(10000);
    if (objectiveError) {
      console.error('[SABI] Verified syllabus objectives lookup failed:', objectiveError.message);
      return res.status(503).json({ error: 'Syllabus coverage is temporarily unavailable.' });
    }
    if (!objectiveRows?.length) {
      return res.json(buildSyllabusCoverage([], []));
    }

    const topicIds = [...new Set(objectiveRows.map((row) => row.topic_id))];
    const versionIds: string[] = [];
    const [topicResult, subjectResult] = await Promise.all([
      supabaseAdmin.from('jamb_topics')
        .select('id, subject_slug, name, syllabus_version_id, verification_status, is_active')
        .in('id', topicIds)
        .eq('verification_status', 'verified')
        .eq('is_active', true),
      supabaseAdmin.from('jamb_subjects').select('slug, display_name'),
    ]);
    if (topicResult.error || subjectResult.error) {
      console.error('[SABI] Syllabus taxonomy lookup failed:', topicResult.error?.message || subjectResult.error?.message);
      return res.status(503).json({ error: 'Syllabus coverage is temporarily unavailable.' });
    }
    const topics = topicResult.data || [];
    const topicById = new Map(topics.map((topic) => [topic.id, topic]));
    for (const topic of topics) if (topic.syllabus_version_id) versionIds.push(topic.syllabus_version_id);

    let verifiedVersionIds = new Set<string>();
    if (versionIds.length) {
      const { data: versions, error: versionError } = await supabaseAdmin
        .from('jamb_syllabus_versions')
        .select('id')
        .in('id', [...new Set(versionIds)])
        .eq('verification_status', 'verified');
      if (versionError) {
        console.error('[SABI] Syllabus version lookup failed:', versionError.message);
        return res.status(503).json({ error: 'Syllabus coverage is temporarily unavailable.' });
      }
      verifiedVersionIds = new Set((versions || []).map((version) => version.id));
    }
    const objectiveSubtopicIds = [...new Set(objectiveRows.map((objective) => objective.subtopic_id).filter(Boolean))] as string[];
    let verifiedSubtopicIds = new Set<string>();
    if (objectiveSubtopicIds.length) {
      const { data: subtopics, error: subtopicError } = await supabaseAdmin
        .from('jamb_subtopics')
        .select('id, topic_id')
        .in('id', objectiveSubtopicIds)
        .eq('verification_status', 'verified')
        .eq('is_active', true);
      if (subtopicError) {
        console.error('[SABI] Verified subtopic lookup failed:', subtopicError.message);
        return res.status(503).json({ error: 'Syllabus coverage is temporarily unavailable.' });
      }
      verifiedSubtopicIds = new Set((subtopics || []).map((subtopic) => subtopic.id));
    }
    const subjectNames = new Map((subjectResult.data || []).map((subject) => [subject.slug, subject.display_name]));
    const objectives = objectiveRows.flatMap((objective) => {
      const topic = topicById.get(objective.topic_id);
      if (!topic) return [];
      if (topic.syllabus_version_id && !verifiedVersionIds.has(topic.syllabus_version_id)) return [];
      if (objective.subtopic_id && !verifiedSubtopicIds.has(objective.subtopic_id)) return [];
      const subjectName = subjectNames.get(topic.subject_slug);
      if (!subjectName) return [];
      return [{
        subject: subjectName,
        topicId: objective.topic_id,
        subtopicId: objective.subtopic_id,
      }];
    });
    if (!objectives.length) return res.json(buildSyllabusCoverage([], []));

    const { data: answeredItems, error: answeredError } = await supabaseAdmin
      .from('learning_session_items')
      .select('question_id')
      .eq('user_id', userId)
      .not('answered_at', 'is', null)
      .limit(10000);
    if (answeredError) {
      console.error('[SABI] Answered learning evidence lookup failed:', answeredError.message);
      return res.status(503).json({ error: 'Syllabus coverage is temporarily unavailable.' });
    }
    const questionIds = [...new Set((answeredItems || []).map((item) => item.question_id))];
    let answeredContent: Array<{ topicId: string | null; subtopicId: string | null }> = [];
    if (questionIds.length) {
      const { data: questionRows, error: questionError } = await supabaseAdmin
        .from('question_bank')
        .select('topic_id, subtopic_id')
        .in('id', questionIds)
        .eq('status', 'published')
        .limit(10000);
      if (questionError) {
        console.error('[SABI] Answered question taxonomy lookup failed:', questionError.message);
        return res.status(503).json({ error: 'Syllabus coverage is temporarily unavailable.' });
      }
      answeredContent = (questionRows || []).map((question) => ({
        topicId: question.topic_id,
        subtopicId: question.subtopic_id,
      }));
    }

    res.set('Cache-Control', 'no-store');
    return res.json({
      ...buildSyllabusCoverage(objectives, answeredContent),
      basis: 'Verified syllabus objectives with at least one submitted answer mapped to the objective topic or subtopic.',
    });
  } catch (error) {
    console.error('[SABI] Unexpected syllabus coverage error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while calculating syllabus coverage.' });
  }
});

router.get('/recommendations', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data, error } = await supabaseAdmin
      .from('student_topic_mastery')
      .select('subject, topic, attempted_count, correct_count, mastery_score, last_attempt_at, next_review_at, correct_streak, interval_days, last_result')
      .eq('user_id', userId)
      .order('mastery_score', { ascending: true });
    if (error) {
      console.error('[SABI] Recommendation lookup failed:', error.message);
      return res.status(503).json({ error: 'Recommendations are temporarily unavailable.' });
    }

    const mastery = data || [];
    const now = Date.now();
    const dueReviews = mastery
      .filter((item) => item.next_review_at && new Date(item.next_review_at).getTime() <= now)
      .sort((a, b) => new Date(a.next_review_at!).getTime() - new Date(b.next_review_at!).getTime());
    const focusTopics = mastery
      .filter((item) => item.attempted_count >= 2 && item.mastery_score < 75)
      .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))
      .slice(0, 5);
    const weakestTopic = focusTopics[0] || mastery[0] || null;
    const reviewPlan = dueReviews.slice(0, 10).map((item) => ({
      subject: item.subject, topic: item.topic, masteryScore: Number(item.mastery_score),
      intervalDays: item.interval_days || 1, reason: item.last_result === 'incorrect'
        ? 'Your last answer was incorrect; revisit this topic.' : 'This topic is due for spaced review.',
    }));

    return res.json({
      dueReviews,
      dueReviewCount: dueReviews.length,
      reviewPlan,
      focusTopics,
      weakestTopic,
      nextAction: dueReviews.length
        ? { type: 'review', subject: dueReviews[0].subject, topic: dueReviews[0].topic }
        : weakestTopic
          ? { type: 'practice', subject: weakestTopic.subject, topic: weakestTopic.topic }
          : { type: 'diagnostic', message: 'Complete a diagnostic session to establish your starting point.' },
    });
  } catch (error) {
    console.error('[SABI] Unexpected recommendation error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while preparing recommendations.' });
  }
});

router.get('/score-prediction', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const [profileResult, catalogueResult, attemptsResult] = await Promise.all([
      supabaseAdmin.from('profiles').select('registered_subjects').eq('id', userId).maybeSingle(),
      supabaseAdmin.from('jamb_subjects').select('slug, display_name, aliases').eq('is_active', true),
      supabaseAdmin.from('learning_session_items')
        .select('question_id, is_correct, question_bank(subject)')
        .eq('user_id', userId)
        .not('answered_at', 'is', null)
        .order('answered_at', { ascending: false })
        .limit(5000),
    ]);
    if (profileResult.error || catalogueResult.error || attemptsResult.error) {
      console.error('[SABI] Score prediction data lookup failed:',
        profileResult.error?.message || catalogueResult.error?.message || attemptsResult.error?.message);
      return res.status(503).json({ error: 'Your score prediction is temporarily unavailable.' });
    }

    const registered = profileResult.data?.registered_subjects || [];
    if (registered.length !== 4) {
      return res.status(400).json({
        error: 'Complete your four-subject UTME combination before requesting a score prediction.',
        code: 'SUBJECT_COMBINATION_REQUIRED',
      });
    }
    const catalogue = catalogueResult.data || [];
    const subjects = registered.map((raw: string) => {
      const normalized = String(raw).trim().toLowerCase();
      const match = catalogue.find((item: any) =>
        String(item.display_name).toLowerCase() === normalized ||
        (item.aliases || []).some((alias: string) => String(alias).toLowerCase() === normalized)
      );
      return match ? {
        slug: match.slug,
        name: match.display_name,
        bankName: match.slug === 'use-of-english' ? 'Use of English' : match.display_name,
      } : null;
    });
    if (subjects.some((item: any) => !item) || new Set(subjects.map((item: any) => item.slug)).size !== 4) {
      return res.status(400).json({ error: 'Your saved UTME subject combination is invalid. Update your subjects first.' });
    }

    const attempts = attemptsResult.data || [];
    const breakdown = subjects.map((subject: any) => {
      const relevant = attempts.filter((attempt: any) =>
        String(attempt.question_bank?.subject || '').toLowerCase() === String(subject.bankName).toLowerCase()
      );
      const attempted = relevant.length;
      const correct = relevant.filter((attempt) => attempt.is_correct).length;
      // A 50% prior across ten virtual questions reduces volatility in early practice.
      const estimatedAccuracy = attempted ? (correct + 5) / (attempted + 10) : null;
      const projectedSubjectScore = estimatedAccuracy === null ? null : Math.round(estimatedAccuracy * 100);
      return {
        subject: subject.name,
        attempted,
        correct,
        accuracy: attempted ? Math.round((correct / attempted) * 100) : null,
        projectedScore: projectedSubjectScore,
        ready: attempted >= 10,
      };
    });
    const readySubjects = breakdown.filter((item) => item.ready);
    const enoughData = readySubjects.length === 4;
    const minSample = Math.min(...breakdown.map((item) => item.attempted));
    const projectedScore = enoughData
      ? Math.max(0, Math.min(400, breakdown.reduce((sum, item) => sum + (item.projectedScore || 0), 0)))
      : null;
    const margin = enoughData ? Math.max(5, Math.min(25, Math.round(40 / Math.sqrt(minSample)))) : null;

    return res.json({
      status: enoughData ? 'ready' : 'insufficient_data',
      predictedScore: projectedScore,
      scoreRange: projectedScore === null ? null : {
        lower: Math.max(0, projectedScore - margin!),
        upper: Math.min(400, projectedScore + margin!),
      },
      confidence: enoughData
        ? minSample >= 50 ? 'high' : minSample >= 25 ? 'medium' : 'low'
        : 'insufficient',
      minimumAttemptsPerSubject: 10,
      totalAttempts: attempts.length,
      subjects: breakdown,
      message: enoughData
        ? 'This is an estimate from your recent answered UTME practice questions, not a guaranteed examination result.'
        : 'Complete at least 10 answered questions in each of your four UTME subjects to unlock a meaningful 0–400 score estimate.',
    });
  } catch (error) {
    console.error('[SABI] Unexpected score prediction error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while preparing your score prediction.' });
  }
});

router.get('/progress', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const [masteryResult, sessionsResult] = await Promise.all([
      supabaseAdmin
        .from('student_topic_mastery')
        .select('subject, topic, attempted_count, correct_count, mastery_score, last_attempt_at, next_review_at, correct_streak, ease_factor, interval_days, last_result')
        .eq('user_id', userId)
        .order('mastery_score', { ascending: true }),
      supabaseAdmin
        .from('learning_sessions')
        .select('id, mode, subject, status, total_questions, answered_count, correct_count, started_at, completed_at')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20),
    ]);

    if (masteryResult.error || sessionsResult.error) {
      console.error('[SABI] Progress retrieval failed:', masteryResult.error?.message || sessionsResult.error?.message);
      return res.status(503).json({ error: 'Student progress is temporarily unavailable.' });
    }

    const mastery = masteryResult.data || [];
    return res.json({
      mastery,
      dueReviews: mastery.filter((item) => item.next_review_at && new Date(item.next_review_at).getTime() <= Date.now()),
      recentSessions: sessionsResult.data || [],
    });
  } catch (error) {
    console.error('[SABI] Unexpected progress retrieval error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while loading progress.' });
  }
});


/**
 * Learner-owned analytics are derived only from server-recorded answer outcomes.
 * The endpoint reports when the recent-history query reaches its safety cap.
 */
router.get('/analytics', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data, error } = await supabaseAdmin.from('learning_session_items')
      .select('is_correct, elapsed_ms, question_bank(subject, topic)')
      .eq('user_id', userId)
      .not('answered_at', 'is', null)
      .order('answered_at', { ascending: false })
      .limit(5000);
    if (error) {
      console.error('[SABI] Learning analytics lookup failed:', error.message);
      return res.status(503).json({ error: 'Learning analytics are temporarily unavailable.' });
    }

    // PostgREST may return a one-to-many relation as an array; the analytics
    // engine consumes the single related question row for each session item.
    const attempts = (data || []).map((item) => ({
      ...item,
      question_bank: Array.isArray(item.question_bank) ? item.question_bank[0] || null : item.question_bank,
    }));
    const analytics = buildLearningAnalytics(attempts);
    res.set('Cache-Control', 'no-store');
    return res.json({
      ...analytics,
      sample: {
        basis: 'server_recorded_answered_attempts',
        returned_attempts: attempts.length,
        capped: attempts.length === 5000,
      },
    });
  } catch (error) {
    console.error('[SABI] Unexpected learning analytics error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while preparing learning analytics.' });
  }
});

router.get('/study-plan', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const requestedDays = req.query.days === undefined ? 7 : Number(req.query.days);
  if (!Number.isInteger(requestedDays) || requestedDays < 1 || requestedDays > 14) {
    return res.status(400).json({ error: 'Study plan days must be an integer between 1 and 14.' });
  }

  try {
    const { data, error } = await supabaseAdmin.from('student_topic_mastery')
      .select('subject, topic, attempted_count, correct_count, mastery_score, next_review_at, interval_days, last_result')
      .eq('user_id', userId)
      .order('mastery_score', { ascending: true });
    if (error) {
      console.error('[SABI] Study plan mastery lookup failed:', error.message);
      return res.status(503).json({ error: 'Your study plan is temporarily unavailable.' });
    }

    res.set('Cache-Control', 'no-store');
    return res.json(buildStudyPlan(data || [], Date.now(), requestedDays));
  } catch (error) {
    console.error('[SABI] Unexpected study plan error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while preparing your study plan.' });
  }
});

export default router;
