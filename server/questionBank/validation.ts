/**
 * Phase 2 question-bank domain validation.
 *
 * This module is deliberately pure: importers, moderation endpoints and
 * question-selection services share the same validation and eligibility rules.
 * It never promotes content or trusts legacy status as verification.
 */
import { createHash } from 'node:crypto';
import { z } from 'zod';

const optionSchema = z.string().trim().min(1).max(2000);

export const questionDraftSchema = z.strictObject({
  examType: z.string().trim().min(1).max(80).optional(),
  subjectSlug: z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  topicId: z.string().uuid(),
  subtopicId: z.string().uuid(),
  year: z.number().int().min(1960).max(2100).optional(),
  question: z.string().trim().min(8).max(12000),
  options: z.strictObject({
    A: optionSchema,
    B: optionSchema,
    C: optionSchema,
    D: optionSchema,
  }),
  answer: z.string().trim().toUpperCase().regex(/^[ABCD]$/),
  explanation: z.string().trim().min(8).max(24000),
  explanationShort: z.string().trim().max(4000).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  concepts: z.array(z.string().trim().min(1).max(120)).max(30).default([]),
  provenance: z.strictObject({
    sourceType: z.enum(['official_exam', 'publisher', 'contributor', 'ai_generated', 'other', 'unknown']),
    sourceLabel: z.string().trim().min(1).max(500).optional(),
    sourceUrl: z.string().trim().url().max(2000).optional(),
    attribution: z.string().trim().max(1000).optional(),
  }).optional(),
});

export type QuestionDraftInput = z.input<typeof questionDraftSchema>;
export type NormalizedQuestionDraft = z.output<typeof questionDraftSchema>;

export type QuestionValidationIssue = {
  code: string;
  field: string;
  message: string;
};

export type QuestionValidationResult =
  | { valid: true; value: NormalizedQuestionDraft; fingerprint: string; contentHash: string }
  | { valid: false; issues: QuestionValidationIssue[] };

function canonicalText(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

/** Stable duplicate key for semantically identical stems/options in one subject. */
export function createQuestionFingerprint(
  value: Pick<NormalizedQuestionDraft, 'subjectSlug' | 'question' | 'options'>
): string {
  return digest({
    subjectSlug: value.subjectSlug,
    question: canonicalText(value.question),
    options: {
      A: canonicalText(value.options.A),
      B: canonicalText(value.options.B),
      C: canonicalText(value.options.C),
      D: canonicalText(value.options.D),
    },
  });
}

/**
 * Validate and normalize a candidate question. Repeated option text is
 * rejected because it can make a single-answer MCQ ambiguous.
 */
export function validateQuestionDraft(input: unknown): QuestionValidationResult {
  const parsed = questionDraftSchema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        field: issue.path.join('.') || '(body)',
        message: issue.message,
      })),
    };
  }

  const value = parsed.data;
  const normalizedOptions = Object.values(value.options).map(canonicalText);
  if (new Set(normalizedOptions).size !== 4) {
    return {
      valid: false,
      issues: [{
        code: 'duplicate_option',
        field: 'options',
        message: 'Each answer option must be distinct.',
      }],
    };
  }

  const fingerprint = createQuestionFingerprint(value);
  return {
    valid: true,
    value,
    fingerprint,
    contentHash: digest(value),
  };
}

export type QuestionServingState = {
  legacyStatus: string | null;
  reviewState: string;
  provenanceStatus: string;
  topicVerificationStatus: string;
  subtopicVerificationStatus: string;
};

/**
 * Only a published, reviewed, source-verified question mapped to verified
 * syllabus taxonomy can enter student practice or CBT pools.
 */
export function isQuestionEligibleForServing(state: QuestionServingState): boolean {
  return state.legacyStatus === 'published'
    && state.reviewState === 'approved'
    && state.provenanceStatus === 'verified'
    && state.topicVerificationStatus === 'verified'
    && state.subtopicVerificationStatus === 'verified';
}
