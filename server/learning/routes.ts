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

const router = Router();

const createSessionSchema = z.strictObject({
  mode: z.enum(['diagnostic', 'smart_practice', 'blitz', 'cbt', 'custom']),
  subject: z.string().trim().min(1).max(80).optional(),
  topic: z.string().trim().min(1).max(160).optional(),
  topics: z.array(z.string().trim().min(1).max(160)).max(20).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  metadata: z.record(z.string(), z.unknown()).default({}),
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

function authenticatedUser(req: Request): string | null {
  return (req as AuthenticatedRequest).user?.id || null;
}

router.post('/sessions', requireAuth, validateBody(createSessionSchema), async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const { mode, subject, topic, topics, limit, metadata } = req.body as z.infer<typeof createSessionSchema>;

  try {
    let query = supabaseAdmin
      .from('question_bank')
      .select('id, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, difficulty')
      .eq('exam_type', 'UTME')
      .eq('status', 'published');

    if (subject) {
      const normalizedSubject = /^english language$/i.test(subject) ? 'Use of English' : subject;
      query = query.ilike('subject', normalizedSubject);
    }
    if (topic) query = query.ilike('topic', topic);
    if (topics?.length) query = query.in('topic', topics);

    const { data: candidates, error: questionError } = await query.limit(1000);
    if (questionError) {
      console.error('[SABI] Learning question retrieval failed:', questionError.message);
      return res.status(503).json({ error: 'Questions are temporarily unavailable.' });
    }

    let orderedCandidates = shuffle(candidates || []);

    // Smart Practice prioritizes due reviews first, then the student's weakest
    // known topics. Students with no history receive a randomized starter set.
    if (mode === 'smart_practice') {
      const { data: masteryRows, error: masteryError } = await supabaseAdmin
        .from('student_topic_mastery')
        .select('topic, mastery_score, next_review_at')
        .eq('user_id', userId);
      if (masteryError) {
        console.error('[SABI] Adaptive mastery lookup failed:', masteryError.message);
        return res.status(503).json({ error: 'Adaptive practice is temporarily unavailable.' });
      }
      const masteryByTopic = new Map((masteryRows || []).map((row) => [row.topic, row]));
      const now = Date.now();
      orderedCandidates.sort((a, b) => {
        const aMastery = masteryByTopic.get(a.topic);
        const bMastery = masteryByTopic.get(b.topic);
        const aDue = Boolean(aMastery?.next_review_at && new Date(aMastery.next_review_at).getTime() <= now);
        const bDue = Boolean(bMastery?.next_review_at && new Date(bMastery.next_review_at).getTime() <= now);
        if (aDue !== bDue) return aDue ? -1 : 1;
        return (aMastery?.mastery_score ?? 50) - (bMastery?.mastery_score ?? 50);
      });
    }

    const selected = orderedCandidates.slice(0, limit);
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
        subject: subject || null,
        total_questions: selected.length,
        metadata,
      })
      .select('id, mode, subject, status, total_questions, answered_count, correct_count, started_at')
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
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, mode, subject, status, total_questions, answered_count, correct_count, started_at, completed_at')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();
    if (sessionError) {
      console.error('[SABI] Session lookup failed:', sessionError.message);
      return res.status(503).json({ error: 'Learning session is temporarily unavailable.' });
    }
    if (!session) return res.status(404).json({ error: 'Learning session not found.' });

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
          answerState: answered ? {
            selectedOption: item.selected_option,
            isCorrect: item.is_correct,
            correctOption: String(question.answer || '').trim().toUpperCase(),
            explanation: question.explanation_short || question.explanation || '',
            elapsedMs: item.elapsed_ms,
            answeredAt: item.answered_at,
          } : null,
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
    const { data, error } = await supabaseAdmin.rpc('submit_learning_answer', {
      p_session_id: sessionId,
      p_question_id: questionId,
      p_selected_option: selectedOption,
      p_elapsed_ms: elapsedMs ?? null,
      p_user_id: userId,
    });

    if (error) {
      const message = error.message || '';
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

    res.set('Cache-Control', 'no-store');
    return res.json({ status: 'recorded', result: data });
  } catch (error) {
    console.error('[SABI] Unexpected answer submission error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while recording your answer.' });
  }
});


router.get('/recommendations', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data, error } = await supabaseAdmin
      .from('student_topic_mastery')
      .select('subject, topic, attempted_count, correct_count, mastery_score, last_attempt_at, next_review_at')
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
    const focusTopics = mastery.filter((item) => item.attempted_count >= 2 && item.mastery_score < 70).slice(0, 5);
    const weakestTopic = mastery[0] || null;

    return res.json({
      dueReviews,
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

router.get('/diagnostic/latest', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data: diagnostic, error } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, subject, status, total_questions, answered_count, correct_count, started_at, completed_at')
      .eq('user_id', userId)
      .eq('mode', 'diagnostic')
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('[SABI] Diagnostic lookup failed:', error.message);
      return res.status(503).json({ error: 'Diagnostic results are temporarily unavailable.' });
    }

    const { data: mastery, error: masteryError } = await supabaseAdmin
      .from('student_topic_mastery')
      .select('subject, topic, attempted_count, correct_count, mastery_score')
      .eq('user_id', userId)
      .order('mastery_score', { ascending: true });
    if (masteryError) {
      console.error('[SABI] Diagnostic mastery lookup failed:', masteryError.message);
      return res.status(503).json({ error: 'Diagnostic results are temporarily unavailable.' });
    }

    return res.json({
      diagnostic: diagnostic ? {
        ...diagnostic,
        accuracy: diagnostic.answered_count
          ? Math.round((diagnostic.correct_count / diagnostic.answered_count) * 100)
          : 0,
      } : null,
      topicStrengths: mastery || [],
      needsDiagnostic: !diagnostic,
    });
  } catch (error) {
    console.error('[SABI] Unexpected diagnostic lookup error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while loading diagnostic results.' });
  }
});

router.get('/progress', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const [masteryResult, sessionsResult] = await Promise.all([
      supabaseAdmin
        .from('student_topic_mastery')
        .select('subject, topic, attempted_count, correct_count, mastery_score, last_attempt_at, next_review_at')
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

export default router;
