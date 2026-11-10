import { describe, expect, it } from 'vitest';
import { buildAdaptiveDecisionRows, selectPersonalizedQuestions } from './selectors';

const candidates = [
  { id: 'due', subject: 'Math', topic: 'Algebra', difficulty: 'standard' },
  { id: 'weak', subject: 'Math', topic: 'Geometry', difficulty: 'foundation' },
  { id: 'strong', subject: 'Physics', topic: 'Motion', difficulty: 'challenge' },
  { id: 'new-a', subject: 'Chemistry', topic: 'Atomic structure', difficulty: 'standard' },
  { id: 'new-b', subject: 'English', topic: 'Comprehension', difficulty: 'standard' },
  { id: 'new-c', subject: 'Biology', topic: 'Cells', difficulty: 'standard' },
];

const mastery = [
  { subject: 'Math', topic: 'Algebra', mastery_score: 32, next_review_at: '2026-11-01T00:00:00Z', attempted_count: 4, last_result: 'incorrect' },
  { subject: 'Math', topic: 'Geometry', mastery_score: 48, next_review_at: null, attempted_count: 3, last_result: 'incorrect' },
  { subject: 'Physics', topic: 'Motion', mastery_score: 95, next_review_at: null, attempted_count: 12, last_result: 'correct' },
];

describe('selectPersonalizedQuestions', () => {
  it('prioritizes due reviews and weak topics for Smart Practice', () => {
    const result = selectPersonalizedQuestions({ candidates, mastery, recentQuestionIds: [], limit: 3, mode: 'smart_practice', now: Date.parse('2026-11-10T00:00:00Z') });
    expect(result.map((row) => row.question.id)).toEqual(['due', 'weak', 'new-a']);
    expect(result[0].reason).toBe('spaced_review_due');
    expect(result[1].reason).toBe('recent_miss');
  });

  it('reserves a discovery portion of Blitz while retaining weak-topic priorities', () => {
    const result = selectPersonalizedQuestions({ candidates, mastery, recentQuestionIds: [], limit: 5, mode: 'blitz', now: Date.parse('2026-11-10T00:00:00Z') });
    expect(result).toHaveLength(5);
    expect(result.slice(0, 2).map((row) => row.question.id)).toEqual(['due', 'weak']);
    expect(result.some((row) => row.reason === 'syllabus_discovery')).toBe(true);
  });

  it('avoids recently answered questions when enough unseen inventory exists', () => {
    const result = selectPersonalizedQuestions({ candidates, mastery, recentQuestionIds: ['due', 'weak'], limit: 3, mode: 'smart_practice', now: Date.parse('2026-11-10T00:00:00Z') });
    expect(result.every((row) => !['due', 'weak'].includes(row.question.id))).toBe(true);
  });

  it('returns an empty selection for an empty eligible pool', () => {
    expect(selectPersonalizedQuestions({ candidates: [], mastery, recentQuestionIds: [], limit: 10, mode: 'blitz' })).toEqual([]);
  });
});

describe('buildAdaptiveDecisionRows', () => {
  it('persists bounded difficulty labels and selection evidence for engine audit', () => {
    const rows = buildAdaptiveDecisionRows({
      userId: 'student-1',
      sessionId: 'session-1',
      mode: 'smart_practice',
      selections: [
        { question: { id: 'q1', subject: 'Math', topic: 'Algebra', difficulty: 'Easy' }, reason: 'spaced_review_due' },
        { question: { id: 'q2', subject: 'Physics', topic: 'Motion', difficulty: 'Hard' }, reason: 'weak_topic' },
        { question: { id: 'q3', subject: 'Chemistry', topic: 'Atoms', difficulty: 'Medium' }, reason: 'syllabus_discovery' },
      ],
    });
    expect(rows.map((row) => row.selected_difficulty)).toEqual(['foundation', 'challenge', 'standard']);
    expect(rows[0]).toMatchObject({
      user_id: 'student-1',
      session_id: 'session-1',
      selected_question_id: 'q1',
      decision_reason: 'spaced_review_due',
      engine_version: 'adaptive-selector-v1',
      evidence: { mode: 'smart_practice', subject: 'Math', topic: 'Algebra' },
    });
  });
});
