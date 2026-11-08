import { describe, expect, it } from 'vitest';
import { getCBTExpiry, isCBTExpired } from './cbtTimer';

describe('CBT server timer', () => {
  it('reads only the server-written expiry field', () => {
    expect(getCBTExpiry({ examConfiguration: { expiresAt: '2026-11-08T12:00:00.000Z' } }))
      .toBe(Date.parse('2026-11-08T12:00:00.000Z'));
    expect(getCBTExpiry({ expiresAt: '2026-11-08T12:00:00.000Z' })).toBeNull();
    expect(getCBTExpiry(null)).toBeNull();
  });

  it('expires only an in-progress CBT at or after its deadline', () => {
    const session = {
      mode: 'cbt',
      status: 'in_progress',
      metadata: { examConfiguration: { expiresAt: '2026-11-08T12:00:00.000Z' } },
    };
    expect(isCBTExpired(session, Date.parse('2026-11-08T11:59:59.999Z'))).toBe(false);
    expect(isCBTExpired(session, Date.parse('2026-11-08T12:00:00.000Z'))).toBe(true);
    expect(isCBTExpired({ ...session, status: 'completed' }, Date.parse('2026-11-08T12:30:00Z'))).toBe(false);
    expect(isCBTExpired({ ...session, mode: 'smart_practice' }, Date.parse('2026-11-08T12:30:00Z'))).toBe(false);
  });

  it('fails closed on malformed timer metadata without expiring a session', () => {
    expect(isCBTExpired({ mode: 'cbt', status: 'in_progress', metadata: {} }, Date.now())).toBe(false);
  });
});
