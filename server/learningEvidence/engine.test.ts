import { describe, expect, it } from 'vitest';
import { rankAdaptiveQuestions, targetDifficulty } from './engine';

const candidate = (id: string, topicId: string, subtopicId: string, difficulty: 'easy'|'medium'|'hard' = 'medium') =>
  ({ id, topicId, subtopicId, difficulty });

describe('adaptive recommendation engine', () => {
  it('prioritizes due spaced reviews over other candidates', () => {
    const result = rankAdaptiveQuestions({
      now: new Date('2026-11-07T12:00:00Z'),
      candidates: [candidate('new', 't2', 's2'), candidate('due', 't1', 's1')],
      mastery: [],
      schedules: [{ topicId: 't1', subtopicId: 's1', nextReviewAt: '2026-11-06T12:00:00Z', intervalDays: 3 }],
    });
    expect(result[0].question.id).toBe('due');
    expect(result[0].reasonCode).toBe('due_review');
  });

  it('prioritizes weak topics and recommends easier questions', () => {
    const result = rankAdaptiveQuestions({
      candidates: [candidate('strong', 't1', 's1', 'hard'), candidate('weak', 't2', 's2', 'easy')],
      mastery: [{ topicId: 't2', subtopicId: 's2', masteryScore: 0.2, evidenceConfidence: 0.8, masteryState: 'needs_support', attemptCount: 12 }],
      schedules: [],
    });
    expect(result[0].question.id).toBe('weak');
    expect(result[0].targetDifficulty).toBe('easy');
  });

  it('introduces unseen topics before optional challenges', () => {
    const result = rankAdaptiveQuestions({
      candidates: [candidate('known', 't1', 's1', 'hard'), candidate('new', 't2', 's2')],
      mastery: [{ topicId: 't1', subtopicId: 's1', masteryScore: 0.9, evidenceConfidence: 0.9, masteryState: 'mastered', attemptCount: 20 }],
      schedules: [],
    });
    expect(result[0].question.id).toBe('new');
    expect(result[0].reasonCode).toBe('new_topic');
  });

  it('demotes recently seen questions when fresh eligible questions exist', () => {
    const result = rankAdaptiveQuestions({
      candidates: [candidate('recent', 't1', 's1'), candidate('fresh', 't2', 's2')],
      mastery: [],
      schedules: [],
      recentQuestionIds: ['recent'],
    });
    expect(result.map(item => item.question.id)).toEqual(['fresh']);
  });

  it('uses bounded difficulty adaptation', () => {
    expect(targetDifficulty(0.2, 'needs_support')).toBe('easy');
    expect(targetDifficulty(0.55, 'developing')).toBe('medium');
    expect(targetDifficulty(0.9, 'mastered')).toBe('hard');
  });
});
