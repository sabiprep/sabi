import { describe, expect, it } from 'vitest';
import { buildAnswerSignalObservations, buildMasterySignalObservation } from './signalWorker';

describe('buildAnswerSignalObservations', () => {
  const base = {
    userId: 'user-1',
    eventId: 'event-1',
    observedAt: '2026-11-08T10:00:00.000Z',
  };

  it('derives accuracy and average response time from verified answer records', () => {
    const result = buildAnswerSignalObservations({
      ...base,
      samples: [
        { is_correct: true, elapsed_ms: 1000 },
        { is_correct: false, elapsed_ms: 3000 },
        { is_correct: true, elapsed_ms: 2000 },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ signal_key: 'learning.answer_accuracy', value: 0.6667, confidence: 0.15 });
    expect(result[1]).toMatchObject({ signal_key: 'learning.answer_time_ms', value: 2000, confidence: 0.15 });
  });

  it('does not create signals from missing or unverified correctness', () => {
    expect(buildAnswerSignalObservations({
      ...base, samples: [{ is_correct: null, elapsed_ms: 1000 }],
    })).toEqual([]);
  });

  it('omits timing when no verified elapsed time exists', () => {
    const result = buildAnswerSignalObservations({
      ...base, samples: [{ is_correct: true, elapsed_ms: null }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].signal_key).toBe('learning.answer_accuracy');
  });

  it('uses stable event-scoped idempotency keys', () => {
    const input = { ...base, samples: [{ is_correct: true, elapsed_ms: 500 }] };
    expect(buildAnswerSignalObservations(input).map((item) => item.idempotency_key))
      .toEqual(buildAnswerSignalObservations(input).map((item) => item.idempotency_key));
  });
});

describe('buildMasterySignalObservation', () => {
  it('records a bounded mastery score with confidence based on attempt count', () => {
    const result = buildMasterySignalObservation({
      userId: 'user-1', eventId: 'event-2', observedAt: '2026-11-08T10:00:00.000Z',
      subject: 'Mathematics', topic: 'Algebra', masteryScore: 84.567, attemptedCount: 5,
    });
    expect(result).toMatchObject({
      signal_key: 'learning.mastery_score', value: 84.57, confidence: 0.5,
      provenance: { method: 'phase2_mastery_state', sample_size: 5, subject: 'Mathematics', topic: 'Algebra' },
    });
  });

  it('bounds mastery values and confidence', () => {
    const result = buildMasterySignalObservation({
      userId: 'user-1', eventId: 'event-3', observedAt: '2026-11-08T10:00:00.000Z',
      subject: 'Mathematics', topic: 'Algebra', masteryScore: 140, attemptedCount: 30,
    });
    expect(result.value).toBe(100);
    expect(result.confidence).toBe(1);
  });
});
