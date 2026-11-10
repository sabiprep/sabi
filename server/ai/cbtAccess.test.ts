import { describe, expect, it } from 'vitest';
import { hasLiveCBTSession } from './cbtAccess';

describe('AI Coach CBT access guard', () => {
  const now = Date.parse('2026-11-10T12:00:00.000Z');

  it('blocks AI when a timed CBT has not expired', () => {
    expect(hasLiveCBTSession([{
      mode: 'cbt', status: 'in_progress',
      metadata: { examConfiguration: { expiresAt: new Date(now + 60_000).toISOString() } },
    }], now)).toBe(true);
  });

  it('allows AI after the CBT expiry time', () => {
    expect(hasLiveCBTSession([{
      mode: 'cbt', status: 'in_progress',
      metadata: { examConfiguration: { expiresAt: new Date(now - 1).toISOString() } },
    }], now)).toBe(false);
  });

  it('fails closed when an in-progress CBT has no valid expiry metadata', () => {
    expect(hasLiveCBTSession([{ mode: 'cbt', status: 'in_progress', metadata: {} }], now)).toBe(true);
  });

  it('does not block AI for completed CBTs or other session modes', () => {
    expect(hasLiveCBTSession([
      { mode: 'cbt', status: 'completed', metadata: { examConfiguration: { expiresAt: new Date(now + 60_000).toISOString() } } },
      { mode: 'smart_practice', status: 'in_progress', metadata: {} },
    ], now)).toBe(false);
  });
});
