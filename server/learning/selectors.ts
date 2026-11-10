export type LearningCandidate = {
  id: string;
  subject: string;
  topic: string | null;
  difficulty: string | null;
  year?: number | null;
};

export type LearningMastery = {
  subject: string;
  topic: string;
  mastery_score: number;
  next_review_at: string | null;
  attempted_count: number;
  last_result?: string | null;
};

export type PersonalizedSelection<T extends LearningCandidate> = {
  question: T;
  reason: 'spaced_review_due' | 'weak_topic' | 'recent_miss' | 'syllabus_discovery' | 'balanced_practice';
};

function topicKey(subject: string, topic: string | null | undefined) {
  return `${subject.trim().toLowerCase()}::${String(topic || 'unmapped').trim().toLowerCase()}`;
}

/** Shared, deterministic selector for Smart Practice and the hybrid Blitz feed. */
export function selectPersonalizedQuestions<T extends LearningCandidate>(input: {
  candidates: T[];
  mastery: LearningMastery[];
  recentQuestionIds: string[];
  limit: number;
  mode: 'smart_practice' | 'blitz';
  now?: number;
}): PersonalizedSelection<T>[] {
  const limit = Math.max(0, Math.min(180, Math.trunc(input.limit)));
  if (!limit || !input.candidates.length) return [];
  const now = input.now ?? Date.now();
  const masteryByTopic = new Map(input.mastery.map((row) => [topicKey(row.subject, row.topic), row]));
  const recent = new Set(input.recentQuestionIds);
  const unseen = input.candidates.filter((question) => !recent.has(question.id));
  const pool = unseen.length >= Math.min(limit, 5) ? unseen : input.candidates;

  const ranked = pool.map((question, index) => {
    const state = masteryByTopic.get(topicKey(question.subject, question.topic));
    const score = Math.max(0, Math.min(100, Number(state?.mastery_score ?? 50)));
    const due = Boolean(state?.next_review_at && Date.parse(state.next_review_at) <= now);
    const recentMiss = state?.last_result === 'incorrect';
    const difficulty = String(question.difficulty || '').toLowerCase();
    const difficultyFit = score < 45
      ? (difficulty.includes('easy') || difficulty.includes('foundation') ? 18 : difficulty.includes('hard') ? -12 : 6)
      : score < 72
        ? (difficulty.includes('medium') || difficulty.includes('standard') ? 18 : 4)
        : (difficulty.includes('hard') || difficulty.includes('challenge') ? 18 : difficulty.includes('easy') ? -8 : 5);
    const priority = (due ? 1000 : 0) + (100 - score) * 1.2 +
      (recentMiss ? 24 : 0) + Math.min(Number(state?.attempted_count || 0), 8) + difficultyFit;
    const reason: PersonalizedSelection<T>['reason'] = due ? 'spaced_review_due'
      : recentMiss ? 'recent_miss'
        : state && score < 75 ? 'weak_topic' : 'balanced_practice';
    return { question, reason, priority, index, hasMastery: Boolean(state) };
  }).sort((a, b) => b.priority - a.priority || a.index - b.index);

  if (input.mode === 'smart_practice') {
    return ranked.slice(0, limit).map(({ question, reason }) => ({ question, reason }));
  }

  // Blitz deliberately reserves at least 30% of its feed for new topic/question discovery.
  // A one-question continuation request must still prioritize due/weak topics.
  // Reserve discovery only when a multi-question batch can contain both intents.
  const discoveryCount = limit <= 1 ? 0 : Math.min(limit, Math.max(1, Math.floor(limit * 0.3)));
  const targetedCount = limit - discoveryCount;
  const targeted = ranked.filter((row) => row.reason !== 'balanced_practice').slice(0, targetedCount);
  const targetedIds = new Set(targeted.map((row) => row.question.id));
  const targetedTopics = new Set(targeted.map((row) => topicKey(row.question.subject, row.question.topic)));
  const discovery = ranked.filter((row) =>
    !targetedIds.has(row.question.id) &&
    (!row.hasMastery || !targetedTopics.has(topicKey(row.question.subject, row.question.topic)))
  );
  const selected = [...targeted, ...discovery].slice(0, limit);
  if (selected.length < limit) {
    const used = new Set(selected.map((row) => row.question.id));
    selected.push(...ranked.filter((row) => !used.has(row.question.id)).slice(0, limit - selected.length));
  }
  return selected.map((row) => ({
    question: row.question,
    reason: targetedIds.has(row.question.id) ? row.reason : 'syllabus_discovery',
  }));
}

export function buildAdaptiveDecisionRows(input: {
  userId: string;
  sessionId: string;
  mode: 'smart_practice' | 'blitz';
  selections: Array<{ question: LearningCandidate; reason: PersonalizedSelection<LearningCandidate>['reason'] }>;
}) {
  return input.selections.map(({ question, reason }) => {
    const rawDifficulty = String(question.difficulty || '').toLowerCase();
    const selectedDifficulty = rawDifficulty.includes('easy') || rawDifficulty.includes('beginner') || rawDifficulty.includes('foundation')
      ? 'foundation'
      : rawDifficulty.includes('hard') || rawDifficulty.includes('advanced') || rawDifficulty.includes('challenge')
        ? 'challenge'
        : 'standard';
    return {
      user_id: input.userId,
      session_id: input.sessionId,
      selected_difficulty: selectedDifficulty,
      selected_question_id: question.id,
      decision_reason: reason,
      evidence: {
        mode: input.mode,
        subject: question.subject,
        topic: question.topic,
        year: question.year ?? null,
        source_difficulty: question.difficulty,
        policy_version: input.mode === 'blitz' ? 'hybrid_personalized_discovery_v1' : 'mastery_adaptive_v1',
      },
      engine_version: 'adaptive-selector-v1',
    };
  });
}
