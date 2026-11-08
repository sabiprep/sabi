import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { generateAIText, getAIReadiness } from './gateway';
import { AIUnavailableError } from './types';

const router = Router();

const explanationRequestSchema = z.strictObject({
  sessionId: z.string().uuid(),
  questionId: z.string().trim().min(1).max(100),
  preference: z.enum(['short', 'detailed']).default('detailed'),
  language: z.enum(['english', 'pidgin', 'mixed']).default('english'),
});

export function buildVerifiedExplanationPrompt(input: {
  subject: string;
  topic: string | null;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  correctOption: 'A' | 'B' | 'C' | 'D';
  selectedOption: 'A' | 'B' | 'C' | 'D';
  storedExplanation: string | null;
  preference: 'short' | 'detailed';
  language: 'english' | 'pidgin' | 'mixed';
}) {
  const correctText = input.options[input.correctOption];
  const selectedText = input.options[input.selectedOption];
  return {
    systemInstruction: [
      'You are Sabi, a careful Nigerian UTME tutor.',
      'The supplied answer key is verified and authoritative. Never change, dispute, reinterpret, or override it.',
      'Do not invent facts, formulas, syllabus references, or question details that are not supported by the supplied question.',
      'Explain why the verified correct option is correct and why the student-selected option is correct or incorrect.',
      'If the supplied question or answer key appears ambiguous, state that clearly and recommend human content review. Do not silently repair it.',
      'Do not calculate or alter the learner score. Your output is tutoring content only.',
      'Use readable headings and concise steps. Format mathematical expressions in LaTeX.',
    ].join(' '),
    prompt: [
      `Subject: ${input.subject}`,
      `Topic: ${input.topic || 'Not classified'}`,
      `Question: ${input.question}`,
      `Option A: ${input.options.A}`,
      `Option B: ${input.options.B}`,
      `Option C: ${input.options.C}`,
      `Option D: ${input.options.D}`,
      `Verified correct option: ${input.correctOption} — ${correctText}`,
      `Student selected: ${input.selectedOption} — ${selectedText}`,
      `Approved database explanation (may be empty): ${input.storedExplanation || 'No approved explanation is stored.'}`,
      `Preferred depth: ${input.preference}`,
      `Language: ${input.language}`,
      'Teach the concept, show the reasoning step by step, address the selected distractor, and finish with one short exam tip.',
    ].join('\n'),
  };
}

router.post('/explanations', requireAuth, validateBody(explanationRequestSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const { sessionId, questionId, preference, language } = req.body as z.infer<typeof explanationRequestSchema>;

  try {
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('learning_sessions')
      .select('id, mode, status')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (sessionError) {
      console.error('[SABI AI] Session lookup failed:', sessionError.message);
      return res.status(503).json({ error: 'The learning session could not be verified.' });
    }
    if (!session) return res.status(404).json({ error: 'Learning session not found.' });

    // AI assistance is prohibited while a timed CBT is active. A completed CBT
    // may request explanations only in its post-exam review state.
    if (session.mode === 'cbt' && session.status !== 'completed') {
      return res.status(403).json({
        error: 'AI explanations are available after you submit your CBT.',
        code: 'CBT_AI_LOCKED',
      });
    }

    const { data: item, error: itemError } = await supabaseAdmin
      .from('learning_session_items')
      .select('id, selected_option, answered_at')
      .eq('session_id', sessionId)
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .maybeSingle();

    if (itemError) {
      console.error('[SABI AI] Session item lookup failed:', itemError.message);
      return res.status(503).json({ error: 'The submitted answer could not be verified.' });
    }
    if (!item || !item.answered_at || !item.selected_option) {
      return res.status(409).json({
        error: 'Answer this question before requesting an explanation.',
        code: 'ANSWER_REQUIRED',
      });
    }

    const { data: question, error: questionError } = await supabaseAdmin
      .from('question_bank')
      .select('id, subject, topic, question, option_a, option_b, option_c, option_d, answer, explanation, explanation_short, status')
      .eq('id', questionId)
      .eq('status', 'published')
      .maybeSingle();

    if (questionError) {
      console.error('[SABI AI] Verified question lookup failed:', questionError.message);
      return res.status(503).json({ error: 'The verified question could not be loaded.' });
    }
    if (!question) return res.status(404).json({ error: 'The published question was not found.' });

    const correctOption = String(question.answer || '').trim().toUpperCase() as 'A' | 'B' | 'C' | 'D';
    const selectedOption = String(item.selected_option || '').trim().toUpperCase() as 'A' | 'B' | 'C' | 'D';
    const options = {
      A: String(question.option_a || ''),
      B: String(question.option_b || ''),
      C: String(question.option_c || ''),
      D: String(question.option_d || ''),
    };
    if (!['A', 'B', 'C', 'D'].includes(correctOption) ||
        !['A', 'B', 'C', 'D'].includes(selectedOption) ||
        Object.values(options).some((option) => !option.trim())) {
      return res.status(422).json({
        error: 'This question is not eligible for an AI explanation until its answer key and options are verified.',
        code: 'QUESTION_NOT_VERIFIED',
      });
    }

    const storedExplanation = String(question.explanation_short || question.explanation || '').trim() || null;
    const readiness = getAIReadiness('explanation');
    if (!readiness.enabled || readiness.configuredProviders.length === 0) {
      return res.json({
        aiAvailable: false,
        reason: readiness.enabled ? 'AI_PROVIDER_NOT_CONFIGURED' : 'AI_DISABLED',
        storedExplanation,
        selectedOption,
        correctOption,
      });
    }

    const prompt = buildVerifiedExplanationPrompt({
      subject: String(question.subject || 'UTME'),
      topic: question.topic ? String(question.topic) : null,
      question: String(question.question || ''),
      options,
      correctOption,
      selectedOption,
      storedExplanation,
      preference,
      language,
    });

    try {
      const generated = await generateAIText({
        task: 'explanation',
        ...prompt,
        temperature: 0.2,
        maxOutputTokens: preference === 'short' ? 500 : 1100,
        timeoutMs: 9000,
      });
      return res.json({
        aiAvailable: true,
        explanation: generated.text,
        storedExplanation,
        provider: generated.provider,
        model: generated.model,
        selectedOption,
        correctOption,
      });
    } catch (error) {
      if (error instanceof AIUnavailableError) {
        return res.json({
          aiAvailable: false,
          reason: error.code,
          storedExplanation,
          selectedOption,
          correctOption,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('[SABI AI] Explanation request failed:', error);
    return res.status(503).json({ error: 'The explanation service is temporarily unavailable.' });
  }
});

export default router;
