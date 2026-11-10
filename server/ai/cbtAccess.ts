import { isCBTExpired, type CBTSessionTimer } from '../learning/cbtTimer';

/**
 * A learner must not receive AI assistance while any timed CBT is still live.
 * Sessions without a valid expiry remain locked until the CBT flow finalizes them.
 */
export function hasLiveCBTSession(sessions: CBTSessionTimer[], now = Date.now()): boolean {
  return sessions.some((session) =>
    session.mode === 'cbt' && session.status === 'in_progress' && !isCBTExpired(session, now)
  );
}
