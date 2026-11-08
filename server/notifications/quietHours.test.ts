import { describe, expect, it } from 'vitest';
import { getQuietHoursDeferral } from './quietHours';

describe('notification quiet hours', () => {
  const window = { enabled: true, start: '22:00', end: '07:00', timezone: 'Africa/Lagos' };

  it('defers a notification during a window crossing midnight', () => {
    const now = new Date('2026-11-08T22:30:00.000Z'); // 23:30 in Lagos
    expect(getQuietHoursDeferral(window, now)?.toISOString()).toBe('2026-11-09T06:00:00.000Z');
  });

  it('does not defer outside quiet hours', () => {
    expect(getQuietHoursDeferral(window, new Date('2026-11-08T12:00:00.000Z'))).toBeNull();
  });

  it('does not defer when disabled or when no preference exists', () => {
    expect(getQuietHoursDeferral({ ...window, enabled: false }, new Date())).toBeNull();
    expect(getQuietHoursDeferral({}, new Date())).toBeNull();
  });

  it('rejects an invalid timezone rather than silently bypassing the preference', () => {
    expect(() => getQuietHoursDeferral({ ...window, timezone: 'Not/A_Zone' }, new Date('2026-11-08T22:30:00.000Z')))
      .toThrow('NOTIFICATION_QUIET_HOURS_TIMEZONE_INVALID');
  });
});
