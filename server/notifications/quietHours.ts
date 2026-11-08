export type QuietHours = {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
};

function clockMinutes(date: Date, timezone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value);
  return hour * 60 + minute;
}

function parseClock(value: string): number | null {
  if (!/^([01]\\d|2[0-3]):[0-5]\\d$/.test(value)) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function isQuietAt(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end
    ? minutes >= start && minutes < end
    : minutes >= start || minutes < end;
}

/** Returns the next instant outside a learner's local quiet window. */
export function getQuietHoursDeferral(
  value: unknown,
  now = new Date(),
): Date | null {
  if (!value || typeof value !== 'object') return null;
  const quiet = value as Partial<QuietHours>;
  if (quiet.enabled !== true) return null;
  const start = typeof quiet.start === 'string' ? parseClock(quiet.start) : null;
  const end = typeof quiet.end === 'string' ? parseClock(quiet.end) : null;
  const timezone = typeof quiet.timezone === 'string' && quiet.timezone.trim()
    ? quiet.timezone.trim()
    : 'Africa/Lagos';
  if (start === null || end === null || start === end) return null;

  let currentMinutes: number;
  try {
    currentMinutes = clockMinutes(now, timezone);
  } catch {
    throw new Error('NOTIFICATION_QUIET_HOURS_TIMEZONE_INVALID');
  }
  if (!isQuietAt(currentMinutes, start, end)) return null;

  // Minute stepping handles windows crossing midnight and daylight-saving
  // transitions without assuming a fixed UTC offset.
  for (let offset = 1; offset <= 26 * 60; offset += 1) {
    const candidate = new Date(Math.ceil(now.getTime() / 60000) * 60000 + offset * 60000);
    if (!isQuietAt(clockMinutes(candidate, timezone), start, end)) return candidate;
  }
  throw new Error('NOTIFICATION_QUIET_HOURS_END_NOT_FOUND');
}
