import { describe, expect, it } from 'vitest';
import { buildScorePrediction, buildTopicRecommendations } from './engineExecution';

describe('buildScorePrediction', () => {
  it('requires ten answered questions in each of four subjects', () => {
    const result = buildScorePrediction([
      { subject: 'English', attempted: 10, correct: 8 },
      { subject: 'Mathematics', attempted: 10, correct: 7 },
      { subject: 'Physics', attempted: 10, correct: 6 },
      { subject: 'Chemistry', attempted: 9, correct: 8 },
    ]);
    expect(result.status).toBe('insufficient_data');
    expect(result.predictedScore).toBeNull();
  });

  it('calculates a bounded 0-400 prediction and confidence from the Phase 2 prior', () => {
    const result = buildScorePrediction([
      { subject: 'English', attempted: 50, correct: 40 },
      { subject: 'Mathematics', attempted: 50, correct: 35 },
      { subject: 'Physics', attempted: 50, correct: 30 },
      { subject: 'Chemistry', attempted: 50, correct: 45 },
    ]);
    expect(result.status).toBe('ready');
    expect(result.predictedScore).toBe(283);
    expect(result.lowerBound).toBe(277);
    expect(result.upperBound).toBe(289);
    expect(result.confidence).toBe('high');
  });
});

describe('buildTopicRecommendations', () => {
  it('prioritizes due reviews and weakest topics without duplicates', () => {
    const result = buildTopicRecommendations([
      { subject: 'Math', topic: 'Algebra', attempted_count: 4, correct_count: 1, mastery_score: 25, next_review_at: '2026-11-07T00:00:00Z' },
      { subject: 'Physics', topic: 'Motion', attempted_count: 3, correct_count: 1, mastery_score: 33, next_review_at: null },
      { subject: 'Math', topic: 'Geometry', attempted_count: 1, correct_count: 1, mastery_score: 100, next_review_at: '2026-11-10T00:00:00Z' },
    ], Date.parse('2026-11-08T00:00:00Z'));
    expect(result).toHaveLength(2);
    expect(result[0].target_id).toBe('Math::Algebra');
    expect(result[0].rationale.reason).toBe('spaced_review_due');
    expect(result[1].target_id).toBe('Physics::Motion');
  });
});
