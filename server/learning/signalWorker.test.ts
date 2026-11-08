import { describe, expect, it } from 'vitest';
import { buildAnswerSignalObservations } from './signalWorker';

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
    expect(result[0]).toMatchObject({
      signal_key: 'learning.answer_accuracy',
      value: 0.6667,
      confidence: 0.15,
      source_event_id: 'event-1',
    });
    expect(result[1]).toMatchObject({
      signal_key: 'learning.answer_time_ms',
      value: 2000,
      confidence: 0.15,
    });
  });

  it('does not create signals from missing or unverified correctness', () => {
    expect(buildAnswerSignalObservations({
      ...base,
      samples: [{ is_correct: null, elapsed_ms: 1000 }],
    })).toEqual([]);
  });

  it('omits the timing signal when no verified elapsed time exists', () => {
    const result = buildAnswerSignalObservations({
      ...base,
      samples: [{ is_correct: true, elapsed_ms: null }],
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
