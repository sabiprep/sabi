import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { requireAdminPermission } from '../middleware/requireAdminPermission';
import { getAIReadiness } from '../ai/gateway';

const router = Router();

async function countRows(table: string, configure?: (query: any) => any) {
  let query = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
  if (configure) query = configure(query);
  const { count, error } = await query;
  return { count: count ?? null, available: !error };
}

/** Operational snapshot for authorized administrators; never returns learner PII. */
router.get('/overview', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const [learners, questions, published, drafts, needsReview, rejected, sources, unclearedSources, audit] = await Promise.all([
    countRows('profiles'),
    countRows('question_bank'),
    countRows('question_bank', q => q.eq('status', 'published')),
    countRows('question_bank', q => q.in('status', ['ai-draft', 'draft'])),
    countRows('question_bank', q => q.eq('status', 'needs-review')),
    countRows('question_bank', q => q.eq('status', 'rejected')),
    countRows('question_sources'),
    countRows('question_sources', q => q.or('verification_status.neq.verified,permitted_use.eq.unknown')),
    supabaseAdmin.from('audit_logs')
      .select('id, actor_role, action, resource_type, resource_id, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const auditAvailable = !audit.error;
  res.set('Cache-Control', 'no-store');
  return res.json({
    generatedAt: new Date().toISOString(),
    metrics: {
      learners: learners.count,
      questions: questions.count,
      publishedQuestions: published.count,
      draftQuestions: drafts.count,
      reviewQueue: needsReview.count,
      rejectedQuestions: rejected.count,
      questionSources: sources.count,
      unclearedSources: unclearedSources.count,
    },
    availability: {
      learners: learners.available,
      questions: questions.available && published.available && drafts.available && needsReview.available && rejected.available,
      sources: sources.available && unclearedSources.available,
      audit: auditAvailable,
    },
    recentOperations: auditAvailable ? audit.data || [] : [],
  });
});

export default router;
