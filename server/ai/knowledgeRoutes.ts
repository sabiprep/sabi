import { createHash } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';

const router = Router();

const knowledgeDocumentSchema = z.strictObject({
  title: z.string().trim().min(3).max(200),
  subject: z.string().trim().max(80).optional(),
  topic: z.string().trim().max(160).optional(),
  sourceType: z.enum(['official_syllabus', 'approved_textbook', 'teacher_note', 'question_explanation', 'other']),
  sourceReference: z.string().trim().min(3).max(300),
  sourceUrl: z.string().url().refine((value) => value.startsWith('https://'), 'Source URL must use HTTPS.').optional(),
  content: z.string().trim().min(100).max(100000),
});

export function chunkText(content: string, maxLength = 1800): string[] {
  const paragraphs = content.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    if (paragraph.length > maxLength) {
      if (current) { chunks.push(current); current = ''; }
      for (let offset = 0; offset < paragraph.length; offset += maxLength) {
        chunks.push(paragraph.slice(offset, offset + maxLength));
      }
      continue;
    }
    if (current.length + paragraph.length + 2 > maxLength && current) {
      chunks.push(current);
      current = paragraph;
    } else {
      current = current ? `${current}\n\n${paragraph}` : paragraph;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

router.get('/documents', requireAuth, requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : '';
  if (status && !['draft', 'approved', 'archived'].includes(status)) {
    return res.status(400).json({ error: 'Invalid knowledge document status.' });
  }
  let query = supabaseAdmin.from('knowledge_documents')
    .select('id, title, subject, topic, source_type, source_reference, source_url, status, approved_at, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return res.status(503).json({ error: 'Knowledge documents are temporarily unavailable.' });
  return res.json({ documents: data || [] });
});

router.post('/documents', requireAuth, requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'), validateBody(knowledgeDocumentSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const input = req.body as z.infer<typeof knowledgeDocumentSchema>;
  const content = input.content.trim();
  const contentHash = createHash('sha256').update(content).digest('hex');
  const chunks = chunkText(content);
  if (!chunks.length) return res.status(400).json({ error: 'The knowledge document has no usable content.' });

  const { data: existing, error: duplicateError } = await supabaseAdmin.from('knowledge_documents')
    .select('id').eq('content_hash', contentHash).maybeSingle();
  if (duplicateError) return res.status(503).json({ error: 'Knowledge duplicate check is temporarily unavailable.' });
  if (existing) return res.status(409).json({ error: 'This knowledge content already exists.', documentId: existing.id });

  const { data: document, error: documentError } = await supabaseAdmin.from('knowledge_documents')
    .insert({
      title: input.title,
      subject: input.subject || null,
      topic: input.topic || null,
      source_type: input.sourceType,
      source_reference: input.sourceReference,
      source_url: input.sourceUrl || null,
      content_hash: contentHash,
      status: 'draft',
      metadata: { chunk_count: chunks.length, created_by: userId },
    })
    .select('id, title, subject, topic, status, source_reference, created_at')
    .single();
  if (documentError || !document) {
    if (documentError?.code === '23505') return res.status(409).json({ error: 'This knowledge content already exists.' });
    return res.status(503).json({ error: 'Knowledge document could not be saved.' });
  }

  const chunkRows = chunks.map((chunk, index) => ({
    document_id: document.id,
    chunk_index: index,
    content: chunk,
    token_count: null,
    metadata: { source_reference: input.sourceReference },
  }));
  const { error: chunkError } = await supabaseAdmin.from('knowledge_chunks').insert(chunkRows);
  if (chunkError) {
    await supabaseAdmin.from('knowledge_documents').delete().eq('id', document.id);
    return res.status(503).json({ error: 'Knowledge chunks could not be saved; the draft was rolled back.' });
  }

  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    actor_role: (req as AuthenticatedRequest).role || 'CONTENT_MANAGER',
    action: 'knowledge_document.created',
    resource_type: 'knowledge_documents',
    resource_id: document.id,
    metadata: { source_type: input.sourceType, chunk_count: chunks.length, content_hash: contentHash },
  });
  if (auditError) console.error('[SABI AI] Knowledge document audit failed:', auditError.message);
  return res.status(201).json({ document, chunkCount: chunks.length, requiresApproval: true });
});

router.post('/documents/:documentId/approve', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const documentId = String(req.params.documentId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) {
    return res.status(400).json({ error: 'A valid knowledge document ID is required.' });
  }
  const { data, error } = await supabaseAdmin.from('knowledge_documents')
    .update({ status: 'approved', approved_by: userId, approved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', documentId).eq('status', 'draft')
    .select('id, title, subject, topic, status, approved_at')
    .maybeSingle();
  if (error) return res.status(503).json({ error: 'Knowledge document could not be approved.' });
  if (!data) return res.status(404).json({ error: 'Draft knowledge document not found.' });
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'knowledge_document.approved',
    resource_type: 'knowledge_documents',
    resource_id: documentId,
    metadata: { title: data.title },
  });
  if (auditError) console.error('[SABI AI] Knowledge approval audit failed:', auditError.message);
  return res.json({ document: data });
});

router.post('/documents/:documentId/archive', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const documentId = String(req.params.documentId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(documentId)) {
    return res.status(400).json({ error: 'A valid knowledge document ID is required.' });
  }
  const { data, error } = await supabaseAdmin.from('knowledge_documents')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', documentId).neq('status', 'archived')
    .select('id, title, status')
    .maybeSingle();
  if (error) return res.status(503).json({ error: 'Knowledge document could not be archived.' });
  if (!data) return res.status(404).json({ error: 'Knowledge document not found.' });
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'knowledge_document.archived',
    resource_type: 'knowledge_documents',
    resource_id: documentId,
    metadata: { title: data.title },
  });
  if (auditError) console.error('[SABI AI] Knowledge archive audit failed:', auditError.message);
  return res.json({ document: data });
});

export default router;
