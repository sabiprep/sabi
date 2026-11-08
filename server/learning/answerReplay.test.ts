import { describe, expect, it } from 'vitest';
import { buildStoredAnswerReplay } from './answerReplay';

const base = {
  requestedOption: 'B',
  storedOption: 'B',
  isCorrect: true,
  correctOption: 'B',
  explanation: 'Stored answer explanation.',
  answeredCount: 1,
  totalQuestions: 20,
  mode: 'smart_practice',
  status: 'in_progress',
};

describe('buildStoredAnswerReplay', () => {
  it('replays the stored result for an identical retry', () => {
    expect(buildStoredAnswerReplay(base)).toEqual({
      kind: 'replay',
      result: {
        correct: true,
        correct_option: 'B',
        explanation: 'Stored answer explanation.',
        answered_count: 1,
        total_questions: 20,
        session_completed: false,
      },
    });
  });

  it('rejects a retry that changes the already-recorded option', () => {
    expect(buildStoredAnswerReplay({ ...base, requestedOption: 'A' })).toEqual({ kind: 'conflict' });
  });

  it('does not reveal feedback when replaying an active CBT answer', () => {
    const result = buildStoredAnswerReplay({ ...base, mode: 'cbt' });
    expect(result).toEqual({
      kind: 'replay',
      result: {
        recorded: true,
        answered_count: 1,
        total_questions: 20,
        session_completed: false,
      },
    });
    expect(JSON.stringify(result)).not.toContain('correct_option');
    expect(JSON.stringify(result)).not.toContain('explanation');
  });

  it('releases CBT feedback after the exam has completed', () => {
    const result = buildStoredAnswerReplay({ ...base, mode: 'cbt', status: 'completed' });
    expect(result.kind).toBe('replay');
    if (result.kind === 'replay') {
      expect(result.result).toHaveProperty('correct_option', 'B');
      expect(result.result).toHaveProperty('explanation', 'Stored answer explanation.');
      expect(result.result).toHaveProperty('session_completed', true);
    }
  });
});
