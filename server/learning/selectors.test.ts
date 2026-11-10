import { describe, expect, it } from 'vitest';
import { selectPersonalizedQuestions } from './selectors';

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
