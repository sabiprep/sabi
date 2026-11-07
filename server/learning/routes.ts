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
  limit: z.number().int().min(1).max(180).default(20),
  configurationKey: z.enum(['quick-mock', 'full-mock']).optional(),
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

  const { mode, subject, topic, topics, limit, configurationKey, metadata } = req.body as z.infer<typeof createSessionSchema>;

  try {
    let selected: any[] = [];
    let sessionSubject = subject || null;
    let sessionMetadata: Record<string, unknown> = { ...metadata };

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
          .select('id, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, difficulty')
          .eq('exam_type', 'UTME')
          .eq('status', 'published')
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
      sessionMetadata = {
        ...metadata,
        examConfiguration: {
          key: examConfig.key,
          title: examConfig.title,
          durationSeconds: examConfig.duration_seconds,
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

      selected = orderedCandidates.slice(0, limit);
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
