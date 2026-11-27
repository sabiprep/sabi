import http from 'node:http';
import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockFrom,
  mockRecordServerStreakRpc,
  mockAuthUserId,
} = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRecordServerStreakRpc: vi.fn(),
  mockAuthUserId: { current: 'user-stage3-1' as string | null },
}));

vi.mock('../lib/supabaseAdmin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('../middleware/requireAuth', () => ({
  requireAuth: (req: any, res: any, next: any) => {
    if (!mockAuthUserId.current) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.user = { id: mockAuthUserId.current, email: 'student@sabi.ng' };
    return next();
  },
}));

vi.mock('../gamification/service', () => ({
  recordStudyActivity: (...args: unknown[]) => mockRecordServerStreakRpc(...args),
}));

import {
  computeAuthoritativeStreak,
  computeServerXpForEvent,
  getLagosIsoDate,
  registerStage3LearningRoutes,
  shiftIsoDate,
} from './activitySync';

function createChain(resolvedValue: { data: any; error: any }) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    upsert: vi.fn(() => Promise.resolve(resolvedValue)),
    maybeSingle: vi.fn(() => Promise.resolve(resolvedValue)),
    then: (resolve: any, reject: any) =>
      Promise.resolve(resolvedValue).then(resolve, reject),
  };
  return chain;
}

async function requestApp(
  app: express.Express,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown
): Promise<{ status: number; json: any }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe('Stage 3: Pure WAT Date, Anti-Cheat XP, and Authoritative Streak Logic', () => {
  it('rolls dates at midnight West Africa Time (Africa/Lagos, UTC+1)', () => {
    // 23:30 UTC on Nov 26 is 00:30 WAT on Nov 27 in Lagos
    expect(getLagosIsoDate('2026-11-26T23:30:00.000Z')).toBe('2026-11-27');
    // 22:59 UTC on Nov 26 is 23:59 WAT on Nov 26 in Lagos
    expect(getLagosIsoDate('2026-11-26T22:59:00.000Z')).toBe('2026-11-26');
    expect(shiftIsoDate('2026-11-27', -1)).toBe('2026-11-26');
    expect(shiftIsoDate('2026-11-27', 1)).toBe('2026-11-28');
  });

  it('enforces server-side anti-cheat caps on XP and elapsed study seconds', () => {
    const attempt = computeServerXpForEvent({
      clientEventId: 'evt-1',
      eventType: 'question_attempt',
      mode: 'blitz',
      subject: 'Chemistry',
      topic: 'Stoichiometry',
      isCorrect: true,
      elapsedSeconds: 5000, // tampered duration
      comboMultiplier: 3,
    });
    expect(attempt.clampedSeconds).toBe(180);
    expect(attempt.xpAwarded).toBeLessThanOrEqual(45);
    expect(attempt.xpAwarded).toBeGreaterThanOrEqual(30);

    const wrongAttempt = computeServerXpForEvent({
      clientEventId: 'evt-2',
      eventType: 'question_attempt',
      mode: 'smart',
      subject: 'Physics',
      topic: 'Optics',
      isCorrect: false,
      elapsedSeconds: 15,
      comboMultiplier: 3,
    });
    expect(wrongAttempt.xpAwarded).toBeLessThanOrEqual(10);

    const session = computeServerXpForEvent({
      clientEventId: 'evt-3',
      eventType: 'session_completed',
      mode: 'cbt',
      subject: 'All Subjects',
      topic: 'Session Summary',
      elapsedSeconds: 7200,
    });
    expect(session.clampedSeconds).toBe(7200);
    expect(session.xpAwarded).toBeLessThanOrEqual(120);
  });

  it('computes authoritative streak when active today, active yesterday, or broken', () => {
    const aliveToday = computeAuthoritativeStreak(
      ['2026-11-27', '2026-11-26', '2026-11-25', '2026-11-20'],
      '2026-11-27'
    );
    expect(aliveToday).toEqual({
      streakDays: 3,
      longestStreak: 3,
      lastActivityDate: '2026-11-27',
    });

    const aliveYesterday = computeAuthoritativeStreak(
      ['2026-11-26', '2026-11-25'],
      '2026-11-27'
    );
    expect(aliveYesterday).toEqual({
      streakDays: 2,
      longestStreak: 2,
      lastActivityDate: '2026-11-26',
    });

    const brokenWithHistoricalRecord = computeAuthoritativeStreak(
      ['2026-11-24', '2026-11-23', '2026-11-22', '2026-11-21', '2026-11-20'],
      '2026-11-27'
    );
    expect(brokenWithHistoricalRecord).toEqual({
      streakDays: 0,
      longestStreak: 5,
      lastActivityDate: '2026-11-24',
    });
  });
});

describe('Stage 3: Live Question Feed & Activity Sync API Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUserId.current = 'user-stage3-1';
    mockRecordServerStreakRpc.mockResolvedValue({ ok: true });

    app = express();
    app.use(express.json());
    const router = express.Router();
    registerStage3LearningRoutes(router);
    app.use('/api/learning', router);
  });

  it('GET /api/learning/question-feed requires authentication', async () => {
    mockAuthUserId.current = null;
    const res = await requestApp(app, 'GET', '/api/learning/question-feed?subjects=Chemistry');
    expect(res.status).toBe(401);
  });

  it('GET /api/learning/question-feed prioritizes live Supabase questions on weak topics and backfills cleanly', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'question_bank') {
        return createChain({
          data: [
            {
              id: 'supa-q-strong',
              subject: 'Chemistry',
              topic: 'Acids and Bases',
              year: 2023,
              difficulty: 'medium',
              question: 'Which indicator turns pink in alkaline solution?',
              option_a: 'Litmus',
              option_b: 'Phenolphthalein',
              option_c: 'Methyl orange',
              option_d: 'Bromothymol blue',
              answer: 'B',
              explanation_short: 'Phenolphthalein turns pink in basic media.',
            },
            {
              id: 'supa-q-weak',
              subject: 'Chemistry',
              topic: 'Stoichiometry',
              year: 2024,
              difficulty: 'hard',
              question: 'How many moles of oxygen react with 2 moles of hydrogen?',
              option_a: '1 mole',
              option_b: '2 moles',
              option_c: '3 moles',
              option_d: '4 moles',
              answer: 'A',
              explanation_short: '2H2 + O2 -> 2H2O gives a 2:1 ratio.',
            },
          ],
          error: null,
        });
      }
      if (table === 'student_topic_mastery') {
        return createChain({
          data: [{ subject: 'Chemistry', topic: 'Stoichiometry', mastery_score: 40 }],
          error: null,
        });
      }
      return createChain({ data: [], error: null });
    });

    const res = await requestApp(
      app,
      'GET',
      '/api/learning/question-feed?subjects=Chemistry&scope=single&focus=Chemistry&limit=6'
    );

    expect(res.status).toBe(200);
    expect(res.json.source).toBe('supabase');
    expect(res.json.supabaseCount).toBe(2);
    expect(res.json.questions).toHaveLength(6);
    // Weak-topic Supabase question must appear first
    expect(res.json.questions[0].id).toBe('supa-q-weak');
    expect(res.json.questions[0].source).toBe('supabase');
    expect(res.json.questions[1].id).toBe('supa-q-strong');
  });

  it('POST /api/learning/activity/sync rejects invalid payloads with strict Zod validation', async () => {
    const res = await requestApp(app, 'POST', '/api/learning/activity/sync', {
      events: [
        {
          clientEventId: 'evt-bad',
          eventType: 'question_attempt',
          mode: 'blitz',
          subject: 'Chemistry',
          topic: 'Mole Concept',
          injectedField: 'should-fail-strict',
        },
      ],
    });
    expect(res.status).toBe(400);
  });

  it('POST /api/learning/activity/sync deduplicates idempotently and updates daily usage & topic mastery', async () => {
    const todayWat = getLagosIsoDate();
    const insertedEvents: any[] = [];
    const upsertedDaily: any[] = [];
    const upsertedMastery: any[] = [];

    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_activity_events') {
        const chain = createChain({
          data: [{ client_event_id: 'evt-already-synced' }],
          error: null,
        });
        chain.upsert = vi.fn((rows: any[]) => {
          insertedEvents.push(...rows);
          return Promise.resolve({ data: rows, error: null });
        });
        return chain;
      }

      if (table === 'student_daily_usage') {
        const chain = createChain({
          data: [
            {
              activity_date: todayWat,
              questions_practiced: 2,
              correct_count: 2,
              xp_earned: 40,
              study_seconds: 35,
              sessions_completed: 0,
              subjects_practiced: ['Chemistry'],
            },
          ],
          error: null,
        });
        chain.upsert = vi.fn((rows: any[]) => {
          upsertedDaily.push(...rows);
          return Promise.resolve({ data: rows, error: null });
        });
        return chain;
      }

      if (table === 'student_topic_mastery') {
        const chain = createChain({
          data: [
            {
              subject: 'Chemistry',
              topic: 'Periodic Table',
              attempted_count: 3,
              correct_count: 2,
              correct_streak: 1,
              interval_days: 1,
              last_attempt_at: new Date().toISOString(),
              last_result: 'correct',
            },
          ],
          error: null,
        });
        chain.upsert = vi.fn((rows: any[]) => {
          upsertedMastery.push(...rows);
          return Promise.resolve({ data: rows, error: null });
        });
        return chain;
      }

      if (table === 'student_streak_state') {
        return createChain({
          data: {
            current_streak: 1,
            longest_streak: 4,
            last_activity_date: todayWat,
          },
          error: null,
        });
      }

      return createChain({ data: [], error: null });
    });

    const res = await requestApp(app, 'POST', '/api/learning/activity/sync', {
      events: [
        {
          clientEventId: 'evt-already-synced',
          eventType: 'question_attempt',
          mode: 'blitz',
          questionId: 'SABI-CHM-1',
          subject: 'Chemistry',
          topic: 'Periodic Table',
          selectedOption: 'A',
          isCorrect: true,
          elapsedSeconds: 14,
          comboMultiplier: 2,
          occurredAt: new Date().toISOString(),
        },
        {
          clientEventId: 'evt-fresh-1',
          eventType: 'question_attempt',
          mode: 'blitz',
          questionId: 'SABI-CHM-2',
          subject: 'Chemistry',
          topic: 'Periodic Table',
          selectedOption: 'C',
          isCorrect: true,
          elapsedSeconds: 18,
          comboMultiplier: 2,
          occurredAt: new Date().toISOString(),
        },
      ],
    });

    expect(res.status).toBe(200);
    expect(res.json.status).toBe('synced');
    expect(res.json.freshCount).toBe(1);
    expect(res.json.syncedEventIds).toEqual(
      expect.arrayContaining(['evt-already-synced', 'evt-fresh-1'])
    );
    // Only the fresh event should have been inserted
    expect(insertedEvents).toHaveLength(1);
    expect(insertedEvents[0].client_event_id).toBe('evt-fresh-1');
    expect(insertedEvents[0].user_id).toBe('user-stage3-1');
    // Daily usage and topic mastery must be updated
    expect(upsertedDaily).toHaveLength(1);
    expect(upsertedDaily[0].questions_practiced).toBe(3);
    expect(upsertedMastery).toHaveLength(1);
    expect(upsertedMastery[0].attempted_count).toBe(4);
    expect(upsertedMastery[0].correct_count).toBe(3);
    expect(mockRecordServerStreakRpc).toHaveBeenCalledWith(
      expect.anything(),
      'user-stage3-1',
      'Africa/Lagos'
    );
    expect(res.json.summary.timezone).toBe('Africa/Lagos');
    expect(res.json.summary.source).toBe('supabase');
  });

  it('GET /api/learning/activity/summary returns authoritative WAT usage, streak, and mastery', async () => {
    const todayWat = getLagosIsoDate();
    const yesterdayWat = shiftIsoDate(todayWat, -1);

    mockFrom.mockImplementation((table: string) => {
      if (table === 'student_daily_usage') {
        return createChain({
          data: [
            {
              activity_date: todayWat,
              questions_practiced: 10,
              correct_count: 8,
              xp_earned: 150,
              study_seconds: 420,
              sessions_completed: 1,
              subjects_practiced: ['Chemistry', 'Physics'],
            },
            {
              activity_date: yesterdayWat,
              questions_practiced: 6,
              correct_count: 5,
              xp_earned: 80,
              study_seconds: 240,
              sessions_completed: 1,
              subjects_practiced: ['Mathematics'],
            },
          ],
          error: null,
        });
      }
      if (table === 'student_topic_mastery') {
        return createChain({
          data: [
            {
              subject: 'Physics',
              topic: 'Motion',
              attempted_count: 5,
              correct_count: 4,
              last_attempt_at: new Date().toISOString(),
              last_result: 'correct',
            },
          ],
          error: null,
        });
      }
      if (table === 'student_streak_state') {
        return createChain({
          data: {
            current_streak: 2,
            longest_streak: 5,
            last_activity_date: todayWat,
          },
          error: null,
        });
      }
      return createChain({ data: [], error: null });
    });

    const res = await requestApp(app, 'GET', '/api/learning/activity/summary');
    expect(res.status).toBe(200);
    expect(res.json.timezone).toBe('Africa/Lagos');
    expect(res.json.streakDays).toBe(2);
    expect(res.json.longestStreak).toBe(5);
    expect(res.json.totalXp).toBe(230);
    expect(res.json.dailyXp).toBe(150);
    expect(res.json.subjectStats.Physics).toEqual({
      solved: 5,
      correct: 4,
      rating: 80,
    });
    expect(res.json.dailyActivityLog[todayWat].questionsPracticed).toBe(10);
  });
});
