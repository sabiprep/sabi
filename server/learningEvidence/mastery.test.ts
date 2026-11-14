import { describe, expect, it } from 'vitest';
import { calculateTopicMastery } from './mastery';

describe('calculateTopicMastery', () => {
  it('does not label a topic mastered without enough attempts', () => {
    const result = calculateTopicMastery({ attemptCount: 1, correctCount: 1 });
    expect(result.state).toBe('developing');
    expect(result.evidenceConfidence).toBe(1 / 6);
  });

  it('identifies strong evidence after repeated correct answers', () => {
    const result = calculateTopicMastery({ attemptCount: 10, correctCount: 10 });
    expect(result.state).toBe('mastered');
    expect(result.accuracy).toBe(1);
    expect(result.evidenceConfidence).toBeGreaterThan(0.6);
  });

  it('identifies a weak topic after repeated incorrect answers', () => {
    const result = calculateTopicMastery({ attemptCount: 10, correctCount: 0 });
    expect(result.state).toBe('needs_support');
  });

  it('uses a smoothed mastery estimate for sparse evidence', () => {
    const result = calculateTopicMastery({ attemptCount: 2, correctCount: 1 });
    expect(result.masteryScore).toBe(0.5);
    expect(result.accuracy).toBe(0.5);
  });

  it('rejects impossible counters', () => {
    expect(() => calculateTopicMastery({ attemptCount: 2, correctCount: 3 })).toThrow(RangeError);
  });
});
