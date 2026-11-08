import { describe, expect, it } from 'vitest';
import { isCbtFeedbackLocked } from './answerVisibility';

describe('isCbtFeedbackLocked', () => {
  it('locks answer feedback during an active CBT', () => {
    expect(isCbtFeedbackLocked('cbt', 'in_progress')).toBe(true);
  });

  it('releases answer feedback after a CBT is completed', () => {
    expect(isCbtFeedbackLocked('cbt', 'completed')).toBe(false);
  });

  it('does not lock feedback for practice sessions', () => {
    expect(isCbtFeedbackLocked('smart_practice', 'in_progress')).toBe(false);
  });
});
