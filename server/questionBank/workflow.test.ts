import { describe, expect, it } from 'vitest';
import { canTransitionQuestionReview, nextQuestionReviewState } from './workflow';

describe('question review workflow', () => {
  it('allows pending questions to be approved, rejected, flagged or returned', () => {
    for (const decision of ['approved', 'rejected', 'flagged', 'changes_requested', 'retired'] as const) {
      expect(canTransitionQuestionReview('pending_review', decision)).toBe(true);
    }
  });

  it('prevents retired questions from re-entering the workflow', () => {
    expect(canTransitionQuestionReview('retired', 'approved')).toBe(false);
    expect(canTransitionQuestionReview('retired', 'changes_requested')).toBe(false);
  });

  it('only allows approved questions to be flagged or retired', () => {
    expect(canTransitionQuestionReview('approved', 'flagged')).toBe(true);
    expect(canTransitionQuestionReview('approved', 'retired')).toBe(true);
    expect(canTransitionQuestionReview('approved', 'rejected')).toBe(false);
  });

  it('returns changes_requested to the pending review queue', () => {
    expect(nextQuestionReviewState('changes_requested')).toBe('pending_review');
    expect(nextQuestionReviewState('approved')).toBe('approved');
  });
});
