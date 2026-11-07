import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';

export const jambExamRouter = Router();

const startSchema = z.strictObject({
  configurationKey: z.enum(['full-mock', 'quick-mock']),
  subjectSlugs: z.array(z.string().trim().min(1).max(80)).length(4),
}).refine(input => new Set(input.subjectSlugs).size === 4, {
  message: 'Choose four different subjects.',
  path: ['subjectSlugs'],
});
const answerSchema = z.strictObject({
  answer: z.enum(['A', 'B', 'C', 'D']),
  responseTimeMs: z.number().int().min(0).max(3600000).optional(),
});

function publicQuestion(payload: Record<string, any>, item: Record<string, any>) {
  return {
    id: item.question_id,
    subjectSlug: item.subject_slug,
    topicId: item.topic_id,
    subtopicId: item.subtopic_id,
    question: payload.question,
    option_a: payload.option_a,
    option_b: payload.option_b,
    option_c: payload.option_c,
    option_d: payload.option_d,
    difficulty: payload.difficulty,
    year: payload.year ?? null,
  };
}

async function getOwnedRun(runId: string, studentId: string) {
  return supabaseAdmin.from('jamb_exam_runs')
    .select('id,student_id,learning_session_id,configuration_key,subject_slugs,status,total_questions,duration_seconds,started_at,deadline_at,submitted_at')
    .eq('id', runId).eq('student_id', studentId).maybeSingle();
}

async function expireRun(run: any) {
  await supabaseAdmin.from('jamb_exam_runs')
    .update({ status: 'expired', submitted_at: new Date().toISOString() })
    .eq('id', run.id).eq('status', 'in_progress');
  await supabaseAdmin.rpc('complete_learning_session', {
    p_student_id: run.student_id,
    p_session_id: run.learning_session_id,
    p_status: 'completed',
  });
}

jambExamRouter.get('/configurations', requireAuth, async (_req, res) => {
  const [configs, subjects, allowed] = await Promise.all([
    supabaseAdmin.from('exam_configurations')
      .select('key,title,question_count,duration_seconds,total_subjects,compulsory_subject_slug')
      .eq('is_active', true).order('question_count'),
    supabaseAdmin.from('jamb_subjects')
      .select('slug,display_name,category').eq('is_active', true).order('display_name'),
    supabaseAdmin.from('exam_configuration_subjects')
      .select('configuration_key,subject_slug').eq('is_allowed', true),
  ]);
  const error = configs.error || subjects.error || allowed.error;
  if (error) {
    console.error('[SABI] JAMB exam configuration lookup failed:', error.message);
    return res.status(503).json({ error: 'Exam setup is temporarily unavailable.' });
  }
  return res.json({
    status: 'success',
    configurations: configs.data ?? [],
    subjects: subjects.data ?? [],
    allowedSubjects: allowed.data ?? [],
  });
});

jambExamRouter.post('/runs', requireAuth, validateBody(startSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data, error } = await supabaseAdmin.rpc('create_jamb_exam_run', {
    p_student_id: authReq.user!.id,
    p_configuration_key: req.body.configurationKey,
    p_subject_slugs: req.body.subjectSlugs,
  });
  if (error) {
    const status = error.code === '22023' ? 422 : 503;
    if (status === 503) console.error('[SABI] JAMB exam creation failed:', error.message);
    return res.status(status).json({ error: status === 422 ? error.message : 'The exam could not be started.' });
  }
  return res.status(201).json({ status: 'in_progress', examRunId: data });
});

jambExamRouter.get('/runs/:runId', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data: run, error } = await getOwnedRun(req.params.runId, authReq.user!.id);
  if (error) {
    console.error('[SABI] JAMB exam lookup failed:', error.message);
    return res.status(503).json({ error: 'The exam could not be loaded.' });
  }
  if (!run) return res.status(404).json({ error: 'Exam not found.' });
  if (run.status === 'in_progress' && Date.now() >= new Date(run.deadline_at).getTime()) {
    await expireRun(run);
    return res.status(410).json({ error: 'The exam time has ended. Your saved answers are retained.', expired: true });
  }
  const [{ data: items, error: itemsError }, { data: attempts, error: attemptsError }] = await Promise.all([
    supabaseAdmin.from('jamb_exam_run_items')
      .select('id,question_number,question_id,question_version_id,subject_slug,topic_id,subtopic_id,learning_attempt_id')
      .eq('exam_run_id', run.id).order('question_number'),
    supabaseAdmin.from('learning_attempts')
      .select('question_id,submitted_option,is_correct')
      .eq('student_id', authReq.user!.id).eq('session_id', run.learning_session_id),
  ]);
  if (itemsError || attemptsError) {
    console.error('[SABI] JAMB exam item lookup failed:', itemsError?.message || attemptsError?.message);
    return res.status(503).json({ error: 'Exam questions could not be loaded.' });
  }
  const versions = await supabaseAdmin.from('question_bank_versions')
    .select('id,payload').in('id', (items ?? []).map(item => item.question_version_id));
  if (versions.error) {
    console.error('[SABI] JAMB exam snapshot lookup failed:', versions.error.message);
    return res.status(503).json({ error: 'Exam questions could not be loaded.' });
  }
  const versionMap = new Map((versions.data ?? []).map(row => [row.id, row.payload as Record<string, any>]));
  const attemptMap = new Map((attempts ?? []).map(row => [row.question_id, row.submitted_option]));
  const questions = (items ?? []).map(item => {
    const payload = versionMap.get(item.question_version_id) ?? {};
    return {
      ...publicQuestion(payload, item),
      questionNumber: item.question_number,
      selectedAnswer: attemptMap.get(item.question_id) ?? null,
      answered: attemptMap.has(item.question_id),
    };
  });
  res.set('Cache-Control', 'private, no-store');
  return res.json({
    status: run.status,
    exam: {
      id: run.id, configurationKey: run.configuration_key, subjectSlugs: run.subject_slugs,
      totalQuestions: run.total_questions, durationSeconds: run.duration_seconds,
      startedAt: run.started_at, deadlineAt: run.deadline_at, submittedAt: run.submitted_at,
      remainingSeconds: Math.max(0, Math.floor((new Date(run.deadline_at).getTime() - Date.now()) / 1000)),
    },
    questions,
  });
});

jambExamRouter.post('/runs/:runId/questions/:questionId/answer', requireAuth, validateBody(answerSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data: run, error: runError } = await getOwnedRun(req.params.runId, authReq.user!.id);
  if (runError) return res.status(503).json({ error: 'The exam could not be loaded.' });
  if (!run) return res.status(404).json({ error: 'Exam not found.' });
  if (run.status !== 'in_progress') return res.status(409).json({ error: 'This exam is no longer accepting answers.' });
  if (Date.now() >= new Date(run.deadline_at).getTime()) {
    await expireRun(run);
    return res.status(410).json({ error: 'The exam time has ended. Your saved answers are retained.', expired: true });
  }
  const { data: item, error: itemError } = await supabaseAdmin.from('jamb_exam_run_items')
    .select('id,question_id,subject_slug,question_version_id')
    .eq('exam_run_id', run.id).eq('question_id', req.params.questionId).maybeSingle();
  if (itemError) return res.status(503).json({ error: 'The exam question could not be found.' });
  if (!item) return res.status(404).json({ error: 'Question is not part of this exam.' });

  const [{ data: pinnedVersion, error: pinnedError }, { data: currentQuestion, error: currentError }] = await Promise.all([
    supabaseAdmin.from('question_bank_versions')
      .select('id,version_number,review_state')
      .eq('id', item.question_version_id).maybeSingle(),
    supabaseAdmin.from('question_bank')
      .select('current_version,review_state,status')
      .eq('id', item.question_id).maybeSingle(),
  ]);
  if (pinnedError || currentError) {
    console.error('[SABI] Pinned exam version check failed:', pinnedError?.message || currentError?.message);
    return res.status(503).json({ error: 'The exam question could not be validated.' });
  }
  if (!pinnedVersion || !currentQuestion || pinnedVersion.review_state !== 'approved'
      || currentQuestion.review_state !== 'approved' || currentQuestion.status !== 'published'
      || currentQuestion.current_version !== pinnedVersion.version_number) {
    return res.status(409).json({ error: 'This question version has changed since the exam began. Contact support before continuing.' });
  }

  const { data: prior } = await supabaseAdmin.from('learning_attempts')
    .select('id,submitted_option,is_correct')
    .eq('student_id', authReq.user!.id)
    .eq('session_id', run.learning_session_id)
    .eq('question_id', item.question_id)
    .maybeSingle();
  if (prior) return res.status(409).json({ error: 'This question has already been answered. Submitted answers cannot be changed.' });

  const { data: result, error } = await supabaseAdmin.rpc('record_learning_attempt', {
    p_student_id: authReq.user!.id,
    p_event_id: randomUUID(),
    p_session_id: run.learning_session_id,
    p_question_id: item.question_id,
    p_submitted_option: req.body.answer.toLowerCase(),
    p_response_time_ms: req.body.responseTimeMs ?? null,
  });
  if (error) {
    const status = error.code === '42501' ? 403 : error.code === '22023' ? 422 : 503;
    if (status === 503) console.error('[SABI] JAMB exam answer write failed:', error.message);
    return res.status(status).json({ error: status === 503 ? 'Your answer could not be saved.' : error.message });
  }
  const { error: linkError } = await supabaseAdmin.from('jamb_exam_run_items')
    .update({ learning_attempt_id: result.attempt_id ?? null })
    .eq('id', item.id);
  if (linkError) console.error('[SABI] Exam attempt link update failed:', linkError.message);
  return res.status(201).json({
    status: 'saved',
    questionId: item.question_id,
    saved: true,
    // Do not disclose correctness or answer key during an active timed exam.
  });
});

jambExamRouter.post('/runs/:runId/submit', requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const { data: run, error: runError } = await getOwnedRun(req.params.runId, authReq.user!.id);
  if (runError) return res.status(503).json({ error: 'The exam could not be loaded.' });
  if (!run) return res.status(404).json({ error: 'Exam not found.' });
  if (run.status !== 'in_progress') return res.status(409).json({ error: 'This exam has already ended.' });

  const expired = Date.now() >= new Date(run.deadline_at).getTime();
  const now = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin.from('jamb_exam_runs')
    .update({ status: expired ? 'expired' : 'submitted', submitted_at: now })
    .eq('id', run.id).eq('student_id', authReq.user!.id).eq('status', 'in_progress');
  if (updateError) {
    console.error('[SABI] JAMB exam submission failed:', updateError.message);
    return res.status(503).json({ error: 'The exam could not be submitted.' });
  }
  await supabaseAdmin.rpc('complete_learning_session', {
    p_student_id: authReq.user!.id,
    p_session_id: run.learning_session_id,
    p_status: 'completed',
  });

  const { data: attempts, error: attemptsError } = await supabaseAdmin.from('learning_attempts')
    .select('question_id,subject_slug,is_correct,response_time_ms,topic_id,subtopic_id')
    .eq('student_id', authReq.user!.id).eq('session_id', run.learning_session_id);
  if (attemptsError) {
    console.error('[SABI] JAMB exam results lookup failed:', attemptsError.message);
    return res.status(503).json({ error: 'The exam was submitted, but its results are temporarily unavailable.' });
  }
  const allAttempts = attempts ?? [];
  const bySubject = run.subject_slugs.map((slug: string) => {
    const subjectAttempts = allAttempts.filter(row => row.subject_slug === slug);
    const correct = subjectAttempts.filter(row => row.is_correct).length;
    return {
      subjectSlug: slug,
      attempted: subjectAttempts.length,
      correct,
      incorrect: subjectAttempts.length - correct,
      accuracy: subjectAttempts.length ? correct / subjectAttempts.length : 0,
    };
  });
  const correct = allAttempts.filter(row => row.is_correct).length;
  const responseTimes = allAttempts.map(row => row.response_time_ms).filter((n): n is number => typeof n === 'number');
  const topicMap = new Map<string, { topicId: string; subtopicId: string; attempts: number; correct: number }>();
  for (const row of allAttempts) {
    const key = row.topic_id + ':' + row.subtopic_id;
    const current = topicMap.get(key) ?? { topicId: row.topic_id, subtopicId: row.subtopic_id, attempts: 0, correct: 0 };
    current.attempts += 1;
    if (row.is_correct) current.correct += 1;
    topicMap.set(key, current);
  }
  res.set('Cache-Control', 'private, no-store');
  return res.json({
    status: expired ? 'expired' : 'submitted',
    result: {
      totalQuestions: run.total_questions,
      attempted: allAttempts.length,
      unanswered: Math.max(0, run.total_questions - allAttempts.length),
      correct,
      incorrect: allAttempts.length - correct,
      accuracy: allAttempts.length ? correct / allAttempts.length : 0,
      averageResponseTimeMs: responseTimes.length
        ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
        : null,
      subjects: bySubject,
      topics: Array.from(topicMap.values()).map(topic => ({
        ...topic, accuracy: topic.attempts ? topic.correct / topic.attempts : 0,
      })),
      readiness: {
        estimateAvailable: false,
        reason: 'A reliable JAMB readiness estimate requires multiple representative mock exams and sufficient verified syllabus coverage.',
      },
    },
  });
});
