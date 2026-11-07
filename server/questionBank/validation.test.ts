import { describe, expect, it } from 'vitest';
import {
  createQuestionFingerprint,
  isQuestionEligibleForServing,
  validateQuestionDraft,
  type QuestionDraftInput,
} from './validation';

const validDraft: QuestionDraftInput = {
  subjectSlug: 'mathematics',
  topicId: '2a7f56d8-26ad-4b73-9eab-5d9fba17b432',
  subtopicId: '9baf2b5c-f6a0-4d1d-9a8b-6f6c2d39e3e8',
  question: 'Solve the equation 2x + 4 = 10.',
  options: { A: '2', B: '3', C: '4', D: '5' },
  answer: 'b',
  explanation: 'Subtract 4 from both sides, then divide by 2. Therefore x = 3.',
  difficulty: 'easy',
  provenance: { sourceType: 'official_exam', sourceLabel: 'JAMB 2022' },
};

describe('validateQuestionDraft', () => {
  it('normalizes answer keys and returns stable hashes', () => {
    const result = validateQuestionDraft(validDraft);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.value.answer).toBe('B');
      expect(result.fingerprint).toHaveLength(64);
      expect(result.contentHash).toHaveLength(64);
    }
  });

  it('rejects missing options and malformed taxonomy IDs', () => {
    const result = validateQuestionDraft({ ...validDraft, topicId: 'not-a-uuid', options: { A: '1' } });
    expect(result.valid).toBe(false);
  });

  it('rejects unknown fields instead of silently accepting protected data', () => {
    const result = validateQuestionDraft({ ...validDraft, status: 'published', verifiedBy: 'admin' });
    expect(result.valid).toBe(false);
  });

  it('rejects duplicate answer options', () => {
    const result = validateQuestionDraft({
      ...validDraft,
      options: { A: '3', B: '3', C: '4', D: '5' },
    });
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues[0].code).toBe('duplicate_option');
  });

  it('rejects invalid answer keys and empty explanations', () => {
    expect(validateQuestionDraft({ ...validDraft, answer: 'E' }).valid).toBe(false);
    expect(validateQuestionDraft({ ...validDraft, explanation: ' ' }).valid).toBe(false);
  });

  it('detects whitespace/case-normalized duplicates', () => {
    const one = validateQuestionDraft(validDraft);
    const two = validateQuestionDraft({
      ...validDraft,
      question: '  SOLVE   THE EQUATION 2x + 4 = 10. ',
      options: { A: '2', B: '3', C: '4', D: '5' },
    });
    expect(one.valid && two.valid).toBe(true);
    if (one.valid && two.valid) expect(one.fingerprint).toBe(two.fingerprint);
  });

  it('scopes duplicate fingerprints by subject', () => {
    const one = validateQuestionDraft(validDraft);
    const two = validateQuestionDraft({ ...validDraft, subjectSlug: 'physics' });
    expect(one.valid && two.valid).toBe(true);
    if (one.valid && two.valid) {
      expect(createQuestionFingerprint(one.value)).not.toBe(createQuestionFingerprint(two.value));
    }
  });
});

describe('isQuestionEligibleForServing', () => {
  const approved = {
    legacyStatus: 'published',
    reviewState: 'approved',
    provenanceStatus: 'verified',
    topicVerificationStatus: 'verified',
    subtopicVerificationStatus: 'verified',
  };

  it('allows only fully reviewed and source/taxonomy-verified questions', () => {
    expect(isQuestionEligibleForServing(approved)).toBe(true);
  });

  it('does not trust the legacy published status by itself', () => {
    expect(isQuestionEligibleForServing({ ...approved, reviewState: 'pending_review' })).toBe(false);
    expect(isQuestionEligibleForServing({ ...approved, provenanceStatus: 'unverified' })).toBe(false);
    expect(isQuestionEligibleForServing({ ...approved, topicVerificationStatus: 'draft' })).toBe(false);
    expect(isQuestionEligibleForServing({ ...approved, legacyStatus: 'ai-draft' })).toBe(false);
  });
});
