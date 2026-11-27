import { Router } from 'express';
import { z } from 'zod';
import { SEED_QUESTIONS } from '../../src/data/questions';
import {
  getCuratedStarterQuestions,
  getShortSubjectLabel,
} from '../../src/data/curatedStarterQuestions';
import { hasServiceRoleKey, supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';

type OptionKey = 'A' | 'B' | 'C' | 'D';

interface ResolvedServerQuestion {
  id: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  year?: number;
  question: string;
  options: Record<OptionKey, string>;
  answer: OptionKey;
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
  source: 'supabase' | 'curated' | 'seed';
}

const OPTION_KEY_SCHEMA = z.enum(['A', 'B', 'C', 'D']);

const checkPublicAnswerSchema = z.strictObject({
  selectedOption: OPTION_KEY_SCHEMA,
});

const upsertSnapshotSchema = z.strictObject({
  snapshotId: z.string().trim().min(1).max(140),
  questionId: z.string().trim().min(1).max(120),
  canonicalQuestionId: z.string().trim().min(1).max(100),
  mode: z.enum(['blitz', 'smart', 'custom', 'cbt']),
  subjectCanonical: z.string().trim().min(1).max(100),
  subjectLabel: z.string().trim().min(1).max(80),
  topicLabel: z.string().trim().min(1).max(180),
  year: z.number().int().min(1978).max(2100).optional(),
  question: z.string().trim().min(1).max(4000),
  options: z.strictObject({
    A: z.string().trim().min(1).max(1000),
    B: z.string().trim().min(1).max(1000),
    C: z.string().trim().min(1).max(1000),
    D: z.string().trim().min(1).max(1000),
  }),
  answer: OPTION_KEY_SCHEMA,
  explanationShort: z.string().max(2500).default(''),
  explanationFull: z.string().max(6000).default(''),
  explanationPidgin: z.string().max(6000).default(''),
  wasAnswered: z.boolean(),
  selectedOption: OPTION_KEY_SCHEMA.nullable(),
  isCorrect: z.boolean().nullable(),
  explanationStyle: z.enum(['english', 'pidgin']).default('english'),
  savedAt: z.string().trim().max(64).optional(),
});

const recordAttemptSchema = z.strictObject({
  selectedOption: OPTION_KEY_SCHEMA,
});

function normalizeCanonicalId(rawId: string): string {
  const trimmed = String(rawId || '').trim();
  if (!trimmed) return '';
  const withoutLoop = trimmed.replace(/-(?:loop|y)\d+$/i, '');
  return withoutLoop.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);
}

function normalizeAnswerKey(raw: unknown): OptionKey | null {
  const upper = String(raw || '').trim().toUpperCase();
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') {
    return upper;
  }
  return null;
}

/**
 * Resolves a question for public share links:
 * 1. Queries live Supabase `question_bank` first (when configured) so real JAMB DB items work.
 * 2. Falls back cleanly to SABI curated starters and official seed questions.
 */
async function resolveQuestionForPublicShare(rawId: string): Promise<ResolvedServerQuestion | null> {
  const cleanedRaw = String(rawId || '').trim().slice(0, 100);
  const canonical = normalizeCanonicalId(cleanedRaw);
  if (!canonical) return null;

  // 1. Live Supabase `question_bank` lookup
  if (hasServiceRoleKey) {
    try {
      const candidateIds = Array.from(new Set([cleanedRaw, canonical].filter(Boolean)));
      const { data: row, error } = await supabaseAdmin
        .from('question_bank')
        .select(
          'id, subject, topic, subtopic, year, question, option_a, option_b, option_c, option_d, answer, explanation, explanation_short'
        )
        .in('id', candidateIds)
        .limit(1)
        .maybeSingle();

      if (!error && row) {
        const answerKey = normalizeAnswerKey(row.answer);
        if (
          answerKey &&
          row.question &&
          row.option_a &&
          row.option_b &&
          row.option_c &&
          row.option_d
        ) {
          const subjectCanonical = String(row.subject || 'JAMB UTME');
          const topicLabel = String(row.topic || row.subtopic || 'Core Syllabus');
          const explanationShort =
            String(row.explanation_short || '').trim() ||
            `Option ${answerKey} is correct based on the official JAMB ${subjectCanonical} syllabus.`;
          const explanationFull =
            String(row.explanation || '').trim() || explanationShort;
          const explanationPidgin = `Na Option ${answerKey} be the correct answer for dis ${subjectCanonical} (${topicLabel}) question. ${explanationShort}`;

          return {
            id: String(row.id),
            subjectCanonical,
            subjectLabel: getShortSubjectLabel(subjectCanonical),
            topicLabel,
            year: typeof row.year === 'number' ? row.year : undefined,
            question: String(row.question),
            options: {
              A: String(row.option_a),
              B: String(row.option_b),
              C: String(row.option_c),
              D: String(row.option_d),
            },
            answer: answerKey,
            explanationShort,
            explanationFull,
            explanationPidgin,
            source: 'supabase',
          };
        }
      }
    } catch {
      // Fall through cleanly to curated/seed catalog
    }
  }

  // 2. Curated Blitz / Smart Practice starters
  const curated = getCuratedStarterQuestions();
  const curatedMatch = curated.find(
    (q) =>
      q.id.toLowerCase() === cleanedRaw.toLowerCase() ||
      q.id.toLowerCase() === canonical.toLowerCase()
  );
  if (curatedMatch) {
    return {
      ...curatedMatch,
      source: 'curated',
    };
  }

  // 3. Official Seed Questions bank
  const seedMatch = SEED_QUESTIONS.find(
    (q) =>
      q.id.toLowerCase() === cleanedRaw.toLowerCase() ||
      q.id.toLowerCase() === canonical.toLowerCase()
  );
  if (seedMatch) {
    return {
      id: seedMatch.id,
      subjectCanonical: seedMatch.subject,
      subjectLabel: getShortSubjectLabel(seedMatch.subject),
      topicLabel: seedMatch.topic || seedMatch.subtopic || 'Core Syllabus',
      year: seedMatch.year,
      question: seedMatch.question,
      options: seedMatch.options,
      answer: seedMatch.answer,
      explanationShort:
        seedMatch.explanation_short ||
        `Option ${seedMatch.answer} is correct based on the official JAMB ${seedMatch.subject} syllabus.`,
      explanationFull:
        seedMatch.explanation ||
        seedMatch.explanation_short ||
        `Option ${seedMatch.answer} is the verified JAMB answer.`,
      explanationPidgin:
        seedMatch.explanation_pidgin ||
        `Na Option ${seedMatch.answer} be the correct answer for dis ${seedMatch.subject} question.`,
      source: 'seed',
    };
  }

  return null;
}

function mapDbRowToSnapshot(row: any) {
  return {
    snapshotId: String(row.snapshot_id),
    questionId: String(row.question_id),
    canonicalQuestionId: String(row.canonical_question_id),
    mode: row.mode as 'blitz' | 'smart' | 'custom' | 'cbt',
    subjectCanonical: String(row.subject_canonical),
    subjectLabel: String(row.subject_label),
    topicLabel: String(row.topic_label),
    year: typeof row.question_year === 'number' ? row.question_year : undefined,
    question: String(row.question_text),
    options: row.options as Record<OptionKey, string>,
    answer: row.correct_answer as OptionKey,
    explanationShort: String(row.explanation_short || ''),
    explanationFull: String(row.explanation_full || ''),
    explanationPidgin: String(row.explanation_pidgin || ''),
    wasAnswered: Boolean(row.was_answered),
    selectedOption: (row.selected_option as OptionKey | null) ?? null,
    isCorrect: typeof row.is_correct === 'boolean' ? row.is_correct : null,
    explanationStyle: (row.explanation_style === 'pidgin' ? 'pidgin' : 'english') as
      | 'english'
      | 'pidgin',
    savedAt: String(row.saved_at || new Date().toISOString()),
  };
}

// =============================================================================
// PUBLIC SHARED QUESTION ROUTER (`/api/public/questions`)
// =============================================================================

export const publicQuestionRouter = Router();

/**
 * GET /api/public/questions/:questionId
 * Publicly serves the single shared question WITHOUT exposing the correct answer
 * or worked solution until the recipient actually submits an option.
 */
publicQuestionRouter.get('/:questionId', async (req, res) => {
  const questionId = String(req.params.questionId || '').trim();
  const resolved = await resolveQuestionForPublicShare(questionId);
  if (!resolved) {
    return res.status(404).json({
      error: 'This shared JAMB question could not be found.',
      code: 'QUESTION_NOT_FOUND',
    });
  }

  res.set('Cache-Control', 'public, max-age=120');
  return res.json({
    question: {
      id: resolved.id,
      subjectCanonical: resolved.subjectCanonical,
      subjectLabel: resolved.subjectLabel,
      topicLabel: resolved.topicLabel,
      year: resolved.year,
      question: resolved.question,
      options: resolved.options,
    },
    source: resolved.source,
  });
});

/**
 * POST /api/public/questions/:questionId/check
 * Grades a visitor's answer on a public shared question link and reveals the
 * official verdict + English & Pidgin explanations.
 */
publicQuestionRouter.post(
  '/:questionId/check',
  validateBody(checkPublicAnswerSchema),
  async (req, res) => {
    const questionId = String(req.params.questionId || '').trim();
    const { selectedOption } = req.body as z.infer<typeof checkPublicAnswerSchema>;
    const resolved = await resolveQuestionForPublicShare(questionId);

    if (!resolved) {
      return res.status(404).json({
        error: 'This shared JAMB question could not be found.',
        code: 'QUESTION_NOT_FOUND',
      });
    }

    return res.json({
      questionId: resolved.id,
      selectedOption,
      correctAnswer: resolved.answer,
      isCorrect: selectedOption === resolved.answer,
      explanationShort: resolved.explanationShort,
      explanationFull: resolved.explanationFull,
      explanationPidgin: resolved.explanationPidgin,
    });
  }
);

// =============================================================================
// AUTHENTICATED SAVED SNAPSHOTS VAULT ROUTER (`/api/snapshots`)
// =============================================================================

export const snapshotRouter = Router();

snapshotRouter.get('/', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  try {
    const { data, error } = await supabaseAdmin
      .from('saved_question_snapshots')
      .select(
        'snapshot_id, question_id, canonical_question_id, mode, subject_canonical, subject_label, topic_label, question_year, question_text, options, correct_answer, explanation_short, explanation_full, explanation_pidgin, was_answered, selected_option, is_correct, explanation_style, saved_at'
      )
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .limit(100);

    if (error) {
      return res.status(503).json({
        error: 'Saved snapshots table is unavailable. Run the latest Supabase migration.',
        code: 'SNAPSHOTS_UNAVAILABLE',
      });
    }

    return res.json({
      source: 'supabase',
      snapshots: (data || []).map(mapDbRowToSnapshot),
    });
  } catch {
    return res.status(503).json({
      error: 'Saved snapshots could not be loaded right now.',
      code: 'SNAPSHOTS_UNAVAILABLE',
    });
  }
});

snapshotRouter.post('/', requireAuth, validateBody(upsertSnapshotSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const input = req.body as z.infer<typeof upsertSnapshotSchema>;
  const canonicalId = normalizeCanonicalId(input.canonicalQuestionId || input.questionId);
  if (!canonicalId) {
    return res.status(400).json({ error: 'Invalid question identifier.' });
  }

  const nowIso = new Date().toISOString();
  const payload = {
    user_id: userId,
    snapshot_id: input.snapshotId,
    question_id: input.questionId,
    canonical_question_id: canonicalId,
    mode: input.mode,
    subject_canonical: input.subjectCanonical,
    subject_label: input.subjectLabel,
    topic_label: input.topicLabel,
    question_year: input.year ?? null,
    question_text: input.question,
    options: input.options,
    correct_answer: input.answer,
    explanation_short: input.explanationShort,
    explanation_full: input.explanationFull,
    explanation_pidgin: input.explanationPidgin,
    was_answered: Boolean(input.wasAnswered && input.selectedOption),
    selected_option: input.wasAnswered ? input.selectedOption : null,
    is_correct: input.wasAnswered ? input.isCorrect : null,
    explanation_style: input.explanationStyle,
    saved_at: input.savedAt || nowIso,
    updated_at: nowIso,
  };

  try {
    const { data, error } = await supabaseAdmin
      .from('saved_question_snapshots')
      .upsert(payload, { onConflict: 'user_id,canonical_question_id' })
      .select(
        'snapshot_id, question_id, canonical_question_id, mode, subject_canonical, subject_label, topic_label, question_year, question_text, options, correct_answer, explanation_short, explanation_full, explanation_pidgin, was_answered, selected_option, is_correct, explanation_style, saved_at'
      )
      .single();

    if (error || !data) {
      return res.status(503).json({
        error: 'Could not sync saved snapshot to Supabase.',
        code: 'SNAPSHOT_SYNC_FAILED',
      });
    }

    return res.status(200).json({
      status: 'synced',
      snapshot: mapDbRowToSnapshot(data),
    });
  } catch {
    return res.status(503).json({
      error: 'Could not sync saved snapshot to Supabase.',
      code: 'SNAPSHOT_SYNC_FAILED',
    });
  }
});

snapshotRouter.patch(
  '/:canonicalQuestionId/attempt',
  requireAuth,
  validateBody(recordAttemptSchema),
  async (req, res) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const canonicalId = normalizeCanonicalId(String(req.params.canonicalQuestionId || ''));
    if (!canonicalId) {
      return res.status(400).json({ error: 'Invalid question identifier.' });
    }

    const { selectedOption } = req.body as z.infer<typeof recordAttemptSchema>;

    try {
      const { data: existing, error: fetchErr } = await supabaseAdmin
        .from('saved_question_snapshots')
        .select('id, correct_answer')
        .eq('user_id', userId)
        .eq('canonical_question_id', canonicalId)
        .maybeSingle();

      if (fetchErr) {
        return res.status(503).json({ error: 'Could not update saved snapshot right now.' });
      }
      if (!existing) {
        return res.status(404).json({ error: 'Saved snapshot not found.' });
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await supabaseAdmin
        .from('saved_question_snapshots')
        .update({
          was_answered: true,
          selected_option: selectedOption,
          is_correct: selectedOption === existing.correct_answer,
          saved_at: nowIso,
          updated_at: nowIso,
        })
        .eq('user_id', userId)
        .eq('canonical_question_id', canonicalId)
        .select(
          'snapshot_id, question_id, canonical_question_id, mode, subject_canonical, subject_label, topic_label, question_year, question_text, options, correct_answer, explanation_short, explanation_full, explanation_pidgin, was_answered, selected_option, is_correct, explanation_style, saved_at'
        )
        .single();

      if (error || !data) {
        return res.status(503).json({ error: 'Could not save your snapshot attempt.' });
      }

      return res.json({
        status: 'updated',
        snapshot: mapDbRowToSnapshot(data),
      });
    } catch {
      return res.status(503).json({ error: 'Could not save your snapshot attempt.' });
    }
  }
);

snapshotRouter.delete('/:canonicalQuestionId', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const canonicalId = normalizeCanonicalId(String(req.params.canonicalQuestionId || ''));
  if (!canonicalId) {
    return res.status(400).json({ error: 'Invalid question identifier.' });
  }

  try {
    const { error } = await supabaseAdmin
      .from('saved_question_snapshots')
      .delete()
      .eq('user_id', userId)
      .eq('canonical_question_id', canonicalId);

    if (error) {
      return res.status(503).json({ error: 'Could not remove saved snapshot.' });
    }

    return res.json({ status: 'removed', canonicalQuestionId: canonicalId });
  } catch {
    return res.status(503).json({ error: 'Could not remove saved snapshot.' });
  }
});
