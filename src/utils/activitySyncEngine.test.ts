// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetAccessToken, mockApiPostJson, mockApiGetJson } = vi.hoisted(() => ({
  mockGetAccessToken: vi.fn(),
  mockApiPostJson: vi.fn(),
  mockApiGetJson: vi.fn(),
}));

vi.mock('./apiClient', () => ({
  getAccessToken: () => mockGetAccessToken(),
  apiPostJson: (...args: unknown[]) => mockApiPostJson(...args),
  apiGetJson: (...args: unknown[]) => mockApiGetJson(...args),
  apiPutJson: vi.fn(() => Promise.resolve({ ok: true, status: 200, data: {} })),
}));

import {
  OFFLINE_ACTIVITY_QUEUE_KEY,
  QUESTION_BANK_CACHE_KEY,
  fetchLiveQuestionFeed,
  flushOfflineActivityQueue,
  loadCachedLiveQuestions,
  loadOfflineActivityQueue,
} from './activitySyncEngine';
import {
  getRealUserProgress,
  getTodayIsoDate,
  reconcileServerProgressSummary,
  recordSessionDurationBonus,
  recordStudyActivity,
} from './userProgressStore';
import {
  loadLastSmartPracticeResult,
  mergeLiveQuestionsIntoDeck,
  type PracticeFeedQuestion,
} from './smartPracticeSession';
import { clearUserDeviceCache } from '../context/AuthContext';

function makeQuestion(id: string, subject = 'Chemistry'): PracticeFeedQuestion {
  return {
    id,
    subjectCanonical: subject,
    subjectLabel: subject,
    topicLabel: 'Periodic Table',
    question: `Question ${id}?`,
    options: { A: '1', B: '2', C: '3', D: '4' },
    answer: 'A',
    explanationShort: 'Short explanation',
    explanationFull: 'Full explanation',
    explanationPidgin: 'Pidgin explanation',
  };
}

describe('Stage 3: Client Device-vs-Supabase Sync Engine & Offline Outbox', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    mockGetAccessToken.mockResolvedValue('valid-jwt-token');
  });

  it('queues study attempts & session bonuses into offline outbox and flushes idempotently to Supabase', async () => {
    const todayWat = getTodayIsoDate();

    recordStudyActivity({
      questionId: 'SABI-CHM-101',
      subject: 'Chemistry',
      topic: 'Stoichiometry',
      selectedOption: 'B',
      isCorrect: true,
      mode: 'blitz',
      elapsedSeconds: 14,
      comboMultiplier: 2,
    });

    recordSessionDurationBonus({
      mode: 'blitz',
      durationSeconds: 180,
      completionBonusXp: 20,
    });

    const queued = loadOfflineActivityQueue();
    expect(queued).toHaveLength(2);
    expect(queued[0].eventType).toBe('question_attempt');
    expect(queued[0].questionId).toBe('SABI-CHM-101');
    expect(queued[1].eventType).toBe('session_completed');

    mockApiPostJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        status: 'synced',
        syncedEventIds: queued.map((e) => e.clientEventId),
        summary: {
          timezone: 'Africa/Lagos',
          todayWat,
          streakDays: 4,
          longestStreak: 7,
          lastActivityDate: todayWat,
          totalXp: 420,
          dailyXp: 85,
          totalStudySeconds: 900,
          dailyStudySeconds: 200,
          dailyActivityLog: {
            [todayWat]: {
              date: todayWat,
              questionsPracticed: 6,
              correctCount: 5,
              xpEarned: 85,
              studySeconds: 200,
              sessionsCompleted: 1,
              subjectsPracticed: ['Chemistry'],
            },
          },
          subjectStats: {
            Chemistry: { solved: 6, correct: 5, rating: 83 },
          },
          topicStats: {
            Chemistry: {
              Stoichiometry: {
                solved: 4,
                correct: 3,
                lastPracticedAt: new Date().toISOString(),
              },
            },
          },
          source: 'supabase',
        },
      },
    });

    const flushResult = await flushOfflineActivityQueue();
    expect(flushResult).toEqual({ synced: 2, remaining: 0 });
    expect(loadOfflineActivityQueue()).toHaveLength(0);

    // Local cache must now reflect authoritative server summary
    const progress = getRealUserProgress();
    expect(progress.streakDays).toBe(4);
    expect(progress.longestStreak).toBe(7);
    expect(progress.totalXp).toBe(420);
    expect(progress.dailyXp).toBe(85);
    expect(progress.subjectStats.Chemistry.solved).toBe(6);
  });

  it('keeps offline queue intact when unauthenticated or when server returns 503', async () => {
    recordStudyActivity({
      questionId: 'SABI-PHY-1',
      subject: 'Physics',
      topic: 'Waves',
      selectedOption: 'A',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 20,
    });

    mockGetAccessToken.mockResolvedValue(null);
    const skipped = await flushOfflineActivityQueue();
    expect(skipped).toEqual({ synced: 0, remaining: 1 });
    expect(loadOfflineActivityQueue()).toHaveLength(1);

    mockGetAccessToken.mockResolvedValue('valid-jwt-token');
    mockApiPostJson.mockResolvedValue({ ok: false, status: 503, error: 'Retry later' });
    const retried = await flushOfflineActivityQueue();
    expect(retried).toEqual({ synced: 0, remaining: 1 });
    expect(loadOfflineActivityQueue()).toHaveLength(1);
  });

  it('reconciles authoritative server progress without losing higher local progress and dispatches UI event', () => {
    const todayWat = getTodayIsoDate();
    const eventsFired: number[] = [];
    const listener = () => eventsFired.push(1);
    window.addEventListener('sabi-progress-updated', listener);

    reconcileServerProgressSummary({
      todayWat,
      streakDays: 5,
      longestStreak: 9,
      lastActivityDate: todayWat,
      totalXp: 650,
      dailyXp: 110,
      totalStudySeconds: 1800,
      dailyStudySeconds: 360,
      dailyActivityLog: {
        [todayWat]: {
          date: todayWat,
          questionsPracticed: 12,
          correctCount: 10,
          xpEarned: 110,
          studySeconds: 360,
          sessionsCompleted: 1,
          subjectsPracticed: ['Mathematics'],
        },
      },
      subjectStats: {
        Mathematics: { solved: 12, correct: 10, rating: 83 },
      },
      topicStats: {},
    });

    window.removeEventListener('sabi-progress-updated', listener);

    const updated = getRealUserProgress();
    expect(updated.streakDays).toBe(5);
    expect(updated.longestStreak).toBe(9);
    expect(updated.totalXp).toBe(650);
    expect(updated.dailyActivityLog[todayWat].questionsPracticed).toBe(12);
    expect(eventsFired.length).toBeGreaterThanOrEqual(1);
  });

  it('fetches live Supabase question feed, caches on-device, and merges unseen cards cleanly', async () => {
    const liveItems = [makeQuestion('supa-1'), makeQuestion('supa-2')];
    mockApiGetJson.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        source: 'supabase',
        questions: liveItems,
      },
    });

    const fetched = await fetchLiveQuestionFeed({
      subjects: ['Chemistry'],
      focusSubject: 'Chemistry',
      scope: 'single',
      limit: 10,
    });

    expect(fetched.source).toBe('supabase');
    expect(fetched.questions).toHaveLength(2);
    expect(loadCachedLiveQuestions().map((q) => q.id)).toEqual(['supa-1', 'supa-2']);

    const localDeck = [makeQuestion('local-0'), makeQuestion('local-1'), makeQuestion('local-2')];
    // Student is currently viewing index 0; index 0 must remain untouched while unseen cards upgrade
    const merged = mergeLiveQuestionsIntoDeck(localDeck, liveItems, 0);
    expect(merged[0].id).toBe('local-0');
    expect(merged[1].id).toBe('supa-1');
    expect(merged[2].id).toBe('supa-2');
    expect(merged.map((q) => q.id)).toContain('local-1');
  });

  it('returns an honest 0-question empty state instead of fake preview results and purges device cache cleanly', () => {
    const empty = loadLastSmartPracticeResult('Chidi');
    expect(empty.totalQuestions).toBe(0);
    expect(empty.totalXp).toBe(0);
    expect(empty.topics).toEqual([]);

    localStorage.setItem('sabi_real_user_progress_v1', '{"totalXp":999}');
    localStorage.setItem(OFFLINE_ACTIVITY_QUEUE_KEY, '[{"clientEventId":"e1"}]');
    localStorage.setItem(QUESTION_BANK_CACHE_KEY, '[{"id":"q1"}]');

    clearUserDeviceCache();
    expect(localStorage.getItem('sabi_real_user_progress_v1')).toBeNull();
    expect(localStorage.getItem(OFFLINE_ACTIVITY_QUEUE_KEY)).toBeNull();
    expect(localStorage.getItem(QUESTION_BANK_CACHE_KEY)).toBeNull();
  });
});
