import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateTopicMastery } from './mastery';

test('does not label a topic mastered without enough attempts', () => {
  const result = calculateTopicMastery({ attemptCount: 1, correctCount: 1 });
  assert.equal(result.state, 'developing');
  assert.equal(result.evidenceConfidence, 1 / 6);
});

test('identifies strong evidence after repeated correct answers', () => {
  const result = calculateTopicMastery({ attemptCount: 10, correctCount: 10 });
  assert.equal(result.state, 'mastered');
  assert.equal(result.accuracy, 1);
  assert.ok(result.evidenceConfidence > 0.6);
});

test('identifies a weak topic after repeated incorrect answers', () => {
  const result = calculateTopicMastery({ attemptCount: 10, correctCount: 0 });
  assert.equal(result.state, 'needs_support');
});

test('uses a smoothed mastery estimate for sparse evidence', () => {
  const result = calculateTopicMastery({ attemptCount: 2, correctCount: 1 });
  assert.equal(result.masteryScore, 0.5);
  assert.equal(result.accuracy, 0.5);
});

test('rejects impossible counters', () => {
  assert.throws(() => calculateTopicMastery({ attemptCount: 2, correctCount: 3 }), RangeError);
});
