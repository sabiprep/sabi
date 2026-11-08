import { describe, expect, it } from 'vitest';
import { buildLearningAnalytics, buildScorePrediction, buildStudyPlan, buildSyllabusCoverage, buildTopicRecommendations } from './engineExecution';

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

describe('buildStudyPlan', () => {
  it('requests a diagnostic when no mastery evidence exists', () => {
    expect(buildStudyPlan([]).status).toBe('diagnostic_required');
  });

  it('prioritizes due review and weak topics in a deterministic plan', () => {
    const result = buildStudyPlan([
      { subject: 'Math', topic: 'Algebra', attempted_count: 4, correct_count: 1, mastery_score: 25, next_review_at: '2026-11-07T00:00:00Z' },
      { subject: 'Physics', topic: 'Motion', attempted_count: 3, correct_count: 1, mastery_score: 40, next_review_at: null },
    ], Date.parse('2026-11-08T00:00:00Z'), 5);
    expect(result.status).toBe('ready');
    expect(result.days).toHaveLength(5);
    expect(result.days[0].actions[0]).toMatchObject({ subject: 'Math', topic: 'Algebra', action: 'spaced_review' });
  });
});

describe('buildLearningAnalytics', () => {
  it('aggregates only authoritative answered outcomes by subject and topic', () => {
    const result = buildLearningAnalytics([
      { is_correct: true, elapsed_ms: 1000, question_bank: { subject: 'Math', topic: 'Algebra' } },
      { is_correct: false, elapsed_ms: 3000, question_bank: { subject: 'Math', topic: 'Algebra' } },
      { is_correct: true, elapsed_ms: null, question_bank: { subject: 'Physics', topic: 'Motion' } },
      { is_correct: null, elapsed_ms: 500, question_bank: { subject: 'Physics', topic: 'Motion' } },
    ]);
    expect(result.total_attempts).toBe(3);
    expect(result.correct_attempts).toBe(2);
    expect(result.accuracy).toBe(67);
    expect(result.subjects.find((row) => row.subject === 'Math')).toMatchObject({
      attempted: 2, correct: 1, accuracy: 50, average_elapsed_ms: 2000,
    });
    expect(result.weakest_topics[0]).toMatchObject({ subject: 'Math', topic: 'Algebra', accuracy: 50 });
  });
});

describe('buildSyllabusCoverage', () => {
  it('does not claim coverage when there are no verified syllabus objectives', () => {
    expect(buildSyllabusCoverage([], []).status).toBe('syllabus_not_verified');
  });

  it('measures objective exposure separately from mastery', () => {
    const result = buildSyllabusCoverage([
      { subject: 'Mathematics', topicId: 'topic-1', subtopicId: null },
      { subject: 'Mathematics', topicId: 'topic-1', subtopicId: 'sub-2' },
      { subject: 'Physics', topicId: 'topic-3', subtopicId: null },
    ], [
      { topicId: 'topic-1', subtopicId: null },
      { topicId: 'topic-1', subtopicId: 'sub-2' },
    ]);
    expect(result.status).toBe('ready');
    expect(result.total_objectives).toBe(3);
    expect(result.covered_objectives).toBe(2);
    expect(result.coverage_percent).toBe(67);
    expect(result.subjects.find((row) => row.subject === 'Physics')?.coverage_percent).toBe(0);
  });

  it('requires subtopic evidence when an objective is subtopic-specific', () => {
    const result = buildSyllabusCoverage([
      { subject: 'Chemistry', topicId: 'topic-1', subtopicId: 'sub-1' },
    ], [{ topicId: 'topic-1', subtopicId: null }]);
    expect(result.covered_objectives).toBe(0);
  });
});
