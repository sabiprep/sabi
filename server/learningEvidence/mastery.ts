export type MasteryState = 'not_started' | 'needs_support' | 'developing' | 'proficient' | 'mastered';

export interface TopicMasteryInput {
  attemptCount: number;
  correctCount: number;
}

export interface TopicMastery {
  attemptCount: number;
  correctCount: number;
  accuracy: number;
  masteryScore: number;
  evidenceConfidence: number;
  state: MasteryState;
}

/**
 * Evidence score used by Phase 3. A Beta(2,2) prior avoids overreacting to
 * one or two answers; confidence is tracked separately from estimated mastery.
 * This is a transparent baseline, not a claim that mastery is fully learned.
 */
export function calculateTopicMastery(input: TopicMasteryInput): TopicMastery {
  const { attemptCount, correctCount } = input;
  if (!Number.isInteger(attemptCount) || attemptCount < 0 ||
      !Number.isInteger(correctCount) || correctCount < 0 ||
      correctCount > attemptCount) {
    throw new RangeError('correctCount and attemptCount must be valid non-negative integers.');
  }

  if (attemptCount === 0) {
    return {
      attemptCount: 0,
      correctCount: 0,
      accuracy: 0,
      masteryScore: 0.5,
      evidenceConfidence: 0,
      state: 'not_started',
    };
  }

  const accuracy = correctCount / attemptCount;
  const masteryScore = (correctCount + 2) / (attemptCount + 4);
  const evidenceConfidence = attemptCount / (attemptCount + 5);
  const state: MasteryState = attemptCount < 5 ? 'developing'
    : masteryScore < 0.4 ? 'needs_support'
    : masteryScore < 0.65 ? 'developing'
    : masteryScore < 0.82 ? 'proficient'
    : 'mastered';

  return { attemptCount, correctCount, accuracy, masteryScore, evidenceConfidence, state };
}
