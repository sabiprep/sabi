export type AdaptiveDifficulty = 'easy' | 'medium' | 'hard';
export type AdaptiveMasteryState = 'not_started' | 'needs_support' | 'developing' | 'proficient' | 'mastered';

export interface AdaptiveCandidate {
  id: string;
  topicId: string;
  subtopicId: string;
  difficulty: AdaptiveDifficulty;
}

export interface AdaptiveMastery {
  topicId: string;
  subtopicId: string;
  masteryScore: number;
  evidenceConfidence: number;
  masteryState: AdaptiveMasteryState;
  attemptCount: number;
}

export interface AdaptiveSchedule {
  topicId: string;
  subtopicId: string;
  nextReviewAt: string;
  intervalDays: number;
}

export interface AdaptiveRecommendation<T extends AdaptiveCandidate> {
  question: T;
  priorityScore: number;
  targetDifficulty: AdaptiveDifficulty;
  reason: string;
  reasonCode: 'due_review' | 'weak_topic' | 'new_topic' | 'reinforcement' | 'challenge';
}

function key(topicId: string, subtopicId: string): string {
  return topicId + ':' + subtopicId;
}

export function targetDifficulty(score: number, state: AdaptiveMasteryState | undefined): AdaptiveDifficulty {
  if (state === 'needs_support' || score < 0.4) return 'easy';
  if (state === 'proficient' || state === 'mastered' || score >= 0.7) return 'hard';
  return 'medium';
}

/**
 * Transparent deterministic recommendation baseline.
 * Due reviews outrank weak areas; unseen topics are introduced before mastered
 * topics receive optional challenge questions. Recent repeats are demoted when
 * other eligible candidates exist. This is a prioritizer, not an exam predictor.
 */
export function rankAdaptiveQuestions<T extends AdaptiveCandidate>(input: {
  candidates: T[];
  mastery: AdaptiveMastery[];
  schedules: AdaptiveSchedule[];
  recentQuestionIds?: string[];
  limit?: number;
  now?: Date;
}): AdaptiveRecommendation<T>[] {
  const now = input.now ?? new Date();
  const masteryMap = new Map(input.mastery.map(row => [key(row.topicId, row.subtopicId), row]));
  const scheduleMap = new Map(input.schedules.map(row => [key(row.topicId, row.subtopicId), row]));
  const recent = new Set(input.recentQuestionIds ?? []);
  const scored = input.candidates.map(question => {
    const k = key(question.topicId, question.subtopicId);
    const evidence = masteryMap.get(k);
    const schedule = scheduleMap.get(k);
    const due = Boolean(schedule && new Date(schedule.nextReviewAt).getTime() <= now.getTime());
    const state = evidence?.masteryState ?? 'not_started';
    const score = evidence?.masteryScore ?? 0.5;
    const target = targetDifficulty(score, evidence?.masteryState);
    const difficultyMatch = question.difficulty === target;
    let reasonCode: AdaptiveRecommendation<T>['reasonCode'];
    let reason: string;
    let priorityScore: number;

    if (due) {
      reasonCode = 'due_review';
      reason = 'This topic is due for spaced revision.';
      priorityScore = 1000 + Math.min(100, schedule!.intervalDays);
    } else if (state === 'needs_support' || (evidence && score < 0.4)) {
      reasonCode = 'weak_topic';
      reason = 'Recent answers show this topic needs more support.';
      priorityScore = 800 - score * 100;
    } else if (!evidence || state === 'not_started') {
      reasonCode = 'new_topic';
      reason = 'This introduces a topic with no recorded practice yet.';
      priorityScore = 600;
    } else if (state === 'developing') {
      reasonCode = 'reinforcement';
      reason = 'More practice will strengthen your understanding here.';
      priorityScore = 500 - score * 50;
    } else {
      reasonCode = 'challenge';
      reason = 'Your results support a more challenging practice question.';
      priorityScore = 300 + score * 50;
    }

    if (difficultyMatch) priorityScore += 35;
    else if (Math.abs(['easy','medium','hard'].indexOf(question.difficulty) - ['easy','medium','hard'].indexOf(target)) === 1) priorityScore += 10;
    if (recent.has(question.id)) priorityScore -= 250;

    return { question, priorityScore, targetDifficulty: target, reason, reasonCode };
  });

  const hasFreshCandidate = scored.some(item => !recent.has(item.question.id));
  return scored
    .filter(item => !hasFreshCandidate || !recent.has(item.question.id))
    .sort((a, b) => b.priorityScore - a.priorityScore
      || a.question.id.localeCompare(b.question.id))
    .slice(0, Math.max(1, Math.min(input.limit ?? 10, 30)));
}
