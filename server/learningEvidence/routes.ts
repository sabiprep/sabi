import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { rankAdaptiveQuestions, type AdaptiveCandidate, type AdaptiveMastery, type AdaptiveSchedule } from './engine';

const router = Router();

const startSessionSchema = z.strictObject({
  mode: z.enum(['diagnostic', 'smart', 'blitz', 'custom', 'cbt']),
  subjectSlug: z.string().trim().min(1).max(80).optional(),
});
const attemptSchema = z.strictObject({
  eventId: z.string().uuid(),
  questionId: z.string().trim().min(1).max(128),
  answer: z.enum(['A', 'B', 'C', 'D']),
  responseTimeMs: z.number().int().min(0).max(3600000).optional(),
});
const completeSessionSchema = z.strictObject({
  status: z.enum(['completed', 'abandoned']).default('completed'),
});

router.post('/sessions', requireAuth, validateBody(startSessionSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabaseAdmin.rpc('create_learning_session', {
    p_student_id: authReq.user!.id,
    p_mode: req.body.mode,
    p_subject_slug: req.body.subjectSlug ?? null,
  });
  if (error) {
    console.error('[SABI] Learning session creation failed:', error.message);
    return res.status(error.code === '22023' ? 400 : 503).json({
      error: error.code === '22023' ? error.message : 'A learning session could not be started.',
    });
  }
  return res.status(201).json({ status: 'active', sessionId: data });
});

router.post('/sessions/:sessionId/attempts', requireAuth, validateBody(attemptSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabaseAdmin.rpc('record_learning_attempt', {
    p_student_id: authReq.user!.id,
    p_event_id: req.body.eventId,
    p_session_id: req.params.sessionId,
    p_question_id: req.body.questionId,
    p_submitted_option: req.body.answer.toLowerCase(),
    p_response_time_ms: req.body.responseTimeMs ?? null,
  });
  if (error) {
    const status = error.code === '42501' ? 403
      : error.code === '22023' ? 422
      : error.code === '23505' ? 409
      : 503;
    if (status >= 500) console.error('[SABI] Learning attempt write failed:', error.message);
    return res.status(status).json({
      error: status >= 500 ? 'The learning attempt could not be recorded.' : error.message,
    });
  }
  return res.status(data?.status === 'duplicate' ? 200 : 201).json({ status: data?.status, result: data });
});

router.post('/sessions/:sessionId/complete', requireAuth, validateBody(completeSessionSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabaseAdmin.rpc('complete_learning_session', {
    p_student_id: authReq.user!.id,
    p_session_id: req.params.sessionId,
    p_status: req.body.status,
  });
  if (error) {
    console.error('[SABI] Learning session completion failed:', error.message);
    return res.status(503).json({ error: 'The learning session could not be completed.' });
  }
  if (!data) return res.status(404).json({ error: 'Active learning session not found.' });
  return res.json({ status: req.body.status });
});

router.get('/sessions/:sessionId/summary', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('learning_sessions')
    .select('id,mode,status,started_at,completed_at')
    .eq('id', req.params.sessionId)
    .eq('student_id', authReq.user!.id)
    .maybeSingle();

  if (sessionError) {
    console.error('[SABI] Learning session summary lookup failed:', sessionError.message);
    return res.status(503).json({ error: 'The session summary is temporarily unavailable.' });
  }
  if (!session) return res.status(404).json({ error: 'Learning session not found.' });

  const { data: attempts, error: attemptsError } = await supabaseAdmin
    .from('learning_attempts')
    .select('is_correct,response_time_ms,subject_slug,topic_id,subtopic_id')
    .eq('session_id', session.id)
    .eq('student_id', authReq.user!.id);

  if (attemptsError) {
    console.error('[SABI] Learning attempt summary lookup failed:', attemptsError.message);
    return res.status(503).json({ error: 'The session summary is temporarily unavailable.' });
  }

  const saved = attempts ?? [];
  const correct = saved.filter(attempt => attempt.is_correct).length;
  const responseTimes = saved
    .map(attempt => attempt.response_time_ms)
    .filter((value): value is number => typeof value === 'number');
  const topicMap = new Map<string, { topicId: string; subtopicId: string; attempts: number; correct: number }>();
  for (const attempt of saved) {
    const key = `${attempt.topic_id}:${attempt.subtopic_id}`;
    const current = topicMap.get(key) ?? {
      topicId: attempt.topic_id,
      subtopicId: attempt.subtopic_id,
      attempts: 0,
      correct: 0,
    };
    current.attempts += 1;
    if (attempt.is_correct) current.correct += 1;
    topicMap.set(key, current);
  }

  return res.json({
    status: 'success',
    session,
    performance: {
      attempts: saved.length,
      correct,
      incorrect: saved.length - correct,
      accuracy: saved.length ? correct / saved.length : 0,
      averageResponseTimeMs: responseTimes.length
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
    },
    topics: Array.from(topicMap.values()).map(topic => ({
      ...topic,
      accuracy: topic.attempts ? topic.correct / topic.attempts : 0,
    })),
  });
});

const recommendationQuerySchema = z.object({
  subject: z.string().trim().min(1).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(30).default(10),
});

router.get('/recommendations', requireAuth, async (req, res) => {
  const parsed = recommendationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid recommendation query.' });
  }
  const authReq = req as AuthenticatedRequest;
  const { subject, limit } = parsed.data;

  const { data: eligible, error: eligibleError } = await supabaseAdmin.rpc('get_eligible_question_bank', {
    p_subject_slug: subject ?? null,
    p_limit: 100,
    p_offset: 0,
  });
  if (eligibleError) {
    console.error('[SABI] Adaptive eligible-pool lookup failed:', eligibleError.message);
    return res.status(503).json({ error: 'Adaptive recommendations are temporarily unavailable.' });
  }
  const pool = eligible ?? [];
  if (pool.length === 0) return res.json({ status: 'success', recommendations: [], strategy: 'evidence_adaptive_v1' });

  const ids = pool.map((row: any) => row.id);
  const [questionMeta, masteryResult, scheduleResult, recentResult] = await Promise.all([
    supabaseAdmin.from('question_bank').select('id,topic_id,subtopic_id').in('id', ids),
    supabaseAdmin.from('student_topic_mastery')
      .select('topic_id,subtopic_id,mastery_score,evidence_confidence,mastery_state,attempt_count')
      .eq('student_id', authReq.user!.id)
      .limit(500),
    supabaseAdmin.from('student_topic_review_schedule')
      .select('topic_id,subtopic_id,next_review_at,interval_days')
      .eq('student_id', authReq.user!.id)
      .lte('next_review_at', new Date().toISOString())
      .order('next_review_at', { ascending: true })
      .limit(500),
    supabaseAdmin.from('learning_attempts')
      .select('question_id')
      .eq('student_id', authReq.user!.id)
      .gte('attempted_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('attempted_at', { ascending: false })
      .limit(200),
  ]);

  const lookupError = questionMeta.error || masteryResult.error || scheduleResult.error || recentResult.error;
  if (lookupError) {
    console.error('[SABI] Adaptive evidence lookup failed:', lookupError.message);
    return res.status(503).json({ error: 'Your learning evidence could not be loaded for recommendations.' });
  }

  const metaById = new Map((questionMeta.data ?? []).map((row: any) => [row.id, row]));
  const candidates = pool.flatMap((row: any) => {
    const meta = metaById.get(row.id);
    if (!meta?.topic_id || !meta?.subtopic_id) return [];
    return [{
      ...row,
      topicId: meta.topic_id,
      subtopicId: meta.subtopic_id,
      difficulty: (['easy', 'medium', 'hard'].includes(row.difficulty) ? row.difficulty : 'medium') as 'easy' | 'medium' | 'hard',
    }];
  });

  const mastery: AdaptiveMastery[] = (masteryResult.data ?? []).map((row: any) => ({
    topicId: row.topic_id,
    subtopicId: row.subtopic_id,
    masteryScore: Number(row.mastery_score),
    evidenceConfidence: Number(row.evidence_confidence),
    masteryState: row.mastery_state,
    attemptCount: row.attempt_count,
  }));
  const schedules: AdaptiveSchedule[] = (scheduleResult.data ?? []).map((row: any) => ({
    topicId: row.topic_id,
    subtopicId: row.subtopic_id,
    nextReviewAt: row.next_review_at,
    intervalDays: row.interval_days,
  }));
  const ranked = rankAdaptiveQuestions({
    candidates: candidates as AdaptiveCandidate[],
    mastery,
    schedules,
    recentQuestionIds: (recentResult.data ?? []).map((row: any) => row.question_id),
    limit,
  });

  const recommendations = ranked.map(item => ({
    question: item.question,
    reason: item.reason,
    reasonCode: item.reasonCode,
    targetDifficulty: item.targetDifficulty,
    priorityScore: item.priorityScore,
  }));
  return res.set('Cache-Control', 'private, no-store').json({
    status: 'success',
    strategy: 'evidence_adaptive_v1',
    evidenceBased: mastery.length > 0 || schedules.length > 0,
    recommendations,
    poolSize: candidates.length,
  });
});

router.get('/mastery', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabaseAdmin
    .from('student_topic_mastery')
    .select('subject_slug,topic_id,subtopic_id,topic:jamb_topics!student_topic_mastery_topic_id_fkey(name),subtopic:jamb_subtopics!student_topic_mastery_subtopic_id_fkey(name),attempt_count,correct_count,accuracy,mastery_score,evidence_confidence,mastery_state,last_attempted_at,updated_at')
    .eq('student_id', authReq.user!.id)
    .order('updated_at', { ascending: false })
    .limit(500);
  if (error) {
    console.error('[SABI] Student mastery retrieval failed:', error.message);
    return res.status(503).json({ error: 'Learning progress is temporarily unavailable.' });
  }
  return res.json({ status: 'success', topics: data ?? [] });
});

export const learningEvidenceRouter = router;
