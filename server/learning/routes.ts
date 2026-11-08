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

function authenticatedUser(req: Request): string | null {
  return (req as AuthenticatedRequest).user?.id || null;
}



/**
 * Content review is restricted to trusted content staff. AI-draft questions
 * never become student-facing until an authorized reviewer explicitly publishes
 * them after validating the answer and all four options.
 */
router.get('/content-review/queue', requireAuth, requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('question_bank')
    .select('id, exam_type, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, answer, explanation, explanation_short, difficulty, source, status, confidence_score, flag_count')
    .in('status', ['ai-draft', 'needs-review'])
    .order('confidence_score', { ascending: false })
    .limit(50);
  if (error) {
    console.error('[SABI] Content review queue lookup failed:', error.message);
    return res.status(503).json({ error: 'The content review queue is temporarily unavailable.' });
  }
  res.set('Cache-Control', 'no-store');
  return res.json({ questions: data || [], returned: (data || []).length });
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
      .select('id, exam_type, question, option_a, option_b, option_c, option_d, answer, status')
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
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('question_bank')
      .update({
        status: nextStatus,
        verified_by: action === 'publish' ? userId : null,
        updated_at: new Date().toISOString(),
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

    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      actor_user_id: userId,
      actor_role: reviewerRole,
      action: `question.${action}`,
      resource_type: 'question_bank',
      resource_id: questionId,
      metadata: { notes: notes || null, resulting_status: nextStatus },
    });
    if (auditError) console.error('[SABI] Question review audit log failed:', auditError.message);

    return res.json({ status: 'updated', question: updated });
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
          return res.status(503).json({ error: 'Adaptive practice is temporarily unavailable.' });
        }
        const masteryByKey = new Map((masteryResult.data || []).map((row) => [
          `${String(row.subject).toLowerCase()}::${String(row.topic).toLowerCase()}`, row,
        ]));
        const recentIds = new Set((recentResult.data || []).map((row) => row.question_id));
        const unseen = orderedCandidates.filter((question) => !recentIds.has(question.id));
        const adaptivePool = unseen.length >= Math.min(limit, 5) ? unseen : orderedCandidates;
        const now = Date.now();
        const difficultyFit = (difficulty: unknown, score: number) => {
          const value = String(difficulty || '').toLowerCase();
          if (score < 45) return value.includes('easy') || value.includes('beginner') ? 24 : value.includes('hard') ? -12 : 8;
          if (score < 72) return value.includes('medium') || value.includes('moderate') ? 22 : 5;
          return value.includes('hard') || value.includes('advanced') ? 24 : value.includes('easy') ? -8 : 8;
        };
        adaptivePool.sort((a, b) => {
          const aMastery = masteryByKey.get(`${String(a.subject).toLowerCase()}::${String(a.topic).toLowerCase()}`);
          const bMastery = masteryByKey.get(`${String(b.subject).toLowerCase()}::${String(b.topic).toLowerCase()}`);
          const aScore = Number(aMastery?.mastery_score ?? 50);
          const bScore = Number(bMastery?.mastery_score ?? 50);
          const aDue = Boolean(aMastery?.next_review_at && new Date(aMastery.next_review_at).getTime() <= now);
          const bDue = Boolean(bMastery?.next_review_at && new Date(bMastery.next_review_at).getTime() <= now);
          const aPriority = (aDue ? 1000 : 0) + (100 - aScore) + difficultyFit(a.difficulty, aScore) +
            (aMastery?.last_result === 'incorrect' ? 12 : 0) + Math.min(Number(aMastery?.attempted_count || 0), 10);
          const bPriority = (bDue ? 1000 : 0) + (100 - bScore) + difficultyFit(b.difficulty, bScore) +
            (bMastery?.last_result === 'incorrect' ? 12 : 0) + Math.min(Number(bMastery?.attempted_count || 0), 10);
          return bPriority - aPriority;
        });
        orderedCandidates = adaptivePool;
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
        .select('question_id, is_correct')
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
    const questionIds = [...new Set(attempts.map((item) => item.question_id))];
    const questionResult = questionIds.length
      ? await supabaseAdmin.from('question_bank').select('id, subject').in('id', questionIds)
      : { data: [], error: null };
    if (questionResult.error) {
      console.error('[SABI] Score prediction question lookup failed:', questionResult.error.message);
      return res.status(503).json({ error: 'Your score prediction is temporarily unavailable.' });
    }
    const subjectByQuestion = new Map((questionResult.data || []).map((question) => [
      question.id, String(question.subject || '').toLowerCase(),
    ]));
    const breakdown = subjects.map((subject: any) => {
      const relevant = attempts.filter((attempt) =>
        subjectByQuestion.get(attempt.question_id) === String(subject.bankName).toLowerCase()
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
