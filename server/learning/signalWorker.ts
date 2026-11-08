export type AnswerSample = {
  is_correct: boolean | null;
  elapsed_ms: number | null;
};

export type LearningSignalObservation = {
  user_id: string;
  signal_key: 'learning.answer_accuracy' | 'learning.answer_time_ms' | 'learning.mastery_score';
  schema_version: 1;
  source_key: 'learning-event-stream';
  source_event_id: string;
  value: number;
  confidence: number;
  purpose_key: 'personalized_learning';
  provenance: {
    method: 'rolling_answer_window' | 'phase2_mastery_state';
    sample_size: number;
    subject?: string;
    topic?: string;
  };
  observed_at: string;
  idempotency_key: string;
};

export function buildAnswerSignalObservations(input: {
  userId: string;
  eventId: string;
  observedAt: string;
  samples: AnswerSample[];
}): LearningSignalObservation[] {
  const answers = input.samples.filter(
    (sample): sample is { is_correct: boolean; elapsed_ms: number | null } =>
      typeof sample.is_correct === 'boolean'
  );
  if (!answers.length) return [];

  const accuracy = answers.filter((sample) => sample.is_correct).length / answers.length;
  const confidence = Math.min(1, answers.length / 20);
  const base = {
    user_id: input.userId,
    schema_version: 1 as const,
    source_key: 'learning-event-stream' as const,
    source_event_id: input.eventId,
    confidence,
    purpose_key: 'personalized_learning' as const,
    provenance: { method: 'rolling_answer_window' as const, sample_size: answers.length },
    observed_at: input.observedAt,
  };

  const observations: LearningSignalObservation[] = [{
    ...base,
    signal_key: 'learning.answer_accuracy',
    value: Number(accuracy.toFixed(4)),
    idempotency_key: `learning-event:${input.eventId}:answer-accuracy`,
  }];

  const timedAnswers = answers.filter(
    (sample): sample is { is_correct: boolean; elapsed_ms: number } =>
      typeof sample.elapsed_ms === 'number' && Number.isFinite(sample.elapsed_ms) && sample.elapsed_ms >= 0
  );
  if (timedAnswers.length) {
    const averageMs = timedAnswers.reduce((sum, sample) => sum + sample.elapsed_ms, 0) / timedAnswers.length;
    observations.push({
      ...base,
      signal_key: 'learning.answer_time_ms',
      value: Math.round(averageMs),
      confidence: Math.min(1, timedAnswers.length / 20),
      provenance: { method: 'rolling_answer_window', sample_size: timedAnswers.length },
      idempotency_key: `learning-event:${input.eventId}:answer-time`,
    });
  }

  return observations;
}

export function buildMasterySignalObservation(input: {
  userId: string;
  eventId: string;
  observedAt: string;
  subject: string;
  topic: string;
  masteryScore: number;
  attemptedCount: number;
}): LearningSignalObservation {
  const attempts = Math.max(0, Math.trunc(input.attemptedCount));
  return {
    user_id: input.userId,
    signal_key: 'learning.mastery_score',
    schema_version: 1,
    source_key: 'learning-event-stream',
    source_event_id: input.eventId,
    value: Number(Math.max(0, Math.min(100, input.masteryScore)).toFixed(2)),
    confidence: Math.min(1, attempts / 10),
    purpose_key: 'personalized_learning',
    provenance: {
      method: 'phase2_mastery_state',
      sample_size: attempts,
      subject: input.subject,
      topic: input.topic,
    },
    observed_at: input.observedAt,
    idempotency_key: `learning-event:${input.eventId}:mastery:${input.subject.toLowerCase()}:${input.topic.toLowerCase()}`,
  };
}
