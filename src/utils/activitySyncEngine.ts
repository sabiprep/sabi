import { apiGetJson, apiPostJson, getAccessToken } from './apiClient';
import type { PracticeFeedQuestion } from './smartPracticeSession';
import { reconcileServerProgressSummary } from './userProgressStore';

export type SyncActivityMode = 'blitz' | 'smart' | 'custom' | 'cbt' | 'diagnostic';

export interface QueuedActivityEvent {
  clientEventId: string;
  eventType: 'question_attempt' | 'session_completed';
  mode: SyncActivityMode;
  questionId?: string | null;
  subject: string;
  topic: string;
  selectedOption?: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect?: boolean | null;
  elapsedSeconds: number;
  comboMultiplier?: number;
  occurredAt: string;
}

export interface ServerActivitySummaryPayload {
  timezone: string;
  todayWat: string;
  streakDays: number;
  longestStreak: number;
  lastActivityDate: string | null;
  totalXp: number;
  dailyXp: number;
  totalStudySeconds: number;
  dailyStudySeconds: number;
  dailyActivityLog: Record<
    string,
    {
      date: string;
      questionsPracticed: number;
      correctCount: number;
      xpEarned: number;
      studySeconds: number;
      sessionsCompleted: number;
      subjectsPracticed: string[];
    }
  >;
  subjectStats: Record<string, { solved: number; correct: number; rating: number }>;
  topicStats: Record<
    string,
    Record<
      string,
      { solved: number; correct: number; lastPracticedAt: string; lastMissedAt?: string }
    >
  >;
  source: 'supabase' | 'profile_fallback';
}

export interface LiveQuestionFeedItem extends PracticeFeedQuestion {
  year?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  source?: 'supabase' | 'curated' | 'seed';
}

export const OFFLINE_ACTIVITY_QUEUE_KEY = 'sabi_offline_activity_queue_v1';
export const QUESTION_BANK_CACHE_KEY = 'sabi_question_bank_cache_v1';
const MAX_QUEUED_EVENTS = 500;
const MAX_CACHED_QUESTIONS = 250;
const FLUSH_DEBOUNCE_MS = 1600;

let scheduledFlushTimer: ReturnType<typeof setTimeout> | null = null;
let activeFlushPromise: Promise<{ synced: number; remaining: number }> | null = null;

function generateClientEventId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now()}-${rand}`;
}

export function loadOfflineActivityQueue(): QueuedActivityEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_ACTIVITY_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedActivityEvent[]) : [];
  } catch {
    return [];
  }
}

function saveOfflineActivityQueue(queue: QueuedActivityEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      OFFLINE_ACTIVITY_QUEUE_KEY,
      JSON.stringify(queue.slice(-MAX_QUEUED_EVENTS))
    );
  } catch {
    // ignore storage quota failures
  }
}

/**
 * Enqueues a real study attempt or session completion into the device's offline-safe
 * outbox and schedules an automatic debounced batch flush to Supabase (`/api/learning/activity/sync`).
 */
export function enqueueStudyActivityEvent(
  input: Omit<QueuedActivityEvent, 'clientEventId' | 'occurredAt'> & {
    clientEventId?: string;
    occurredAt?: string;
  }
): QueuedActivityEvent {
  const event: QueuedActivityEvent = {
    ...input,
    clientEventId: input.clientEventId || generateClientEventId(input.eventType),
    occurredAt: input.occurredAt || new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    const existing = loadOfflineActivityQueue();
    if (!existing.some((e) => e.clientEventId === event.clientEventId)) {
      saveOfflineActivityQueue([...existing, event]);
    }
    scheduleBackgroundActivityFlush();
  }

  return event;
}

export function scheduleBackgroundActivityFlush(delayMs = FLUSH_DEBOUNCE_MS): void {
  if (typeof window === 'undefined') return;
  if (scheduledFlushTimer) {
    clearTimeout(scheduledFlushTimer);
  }
  scheduledFlushTimer = setTimeout(() => {
    scheduledFlushTimer = null;
    void flushOfflineActivityQueue();
  }, delayMs);
}

/**
 * Flushes all pending offline activity events to `/api/learning/activity/sync` in batches of 100.
 * Idempotent: acknowledged `syncedEventIds` are removed from local queue and the server's
 * authoritative WAT streak, daily usage, XP, and topic mastery are reconciled into local cache.
 */
export async function flushOfflineActivityQueue(): Promise<{
  synced: number;
  remaining: number;
}> {
  if (typeof window === 'undefined') return { synced: 0, remaining: 0 };
  if (activeFlushPromise) return activeFlushPromise;

  activeFlushPromise = (async () => {
    const pending = loadOfflineActivityQueue();
    if (pending.length === 0) return { synced: 0, remaining: 0 };

    // Skip network request cleanly if offline or unauthenticated
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return { synced: 0, remaining: pending.length };
    }

    const token = await getAccessToken();
    if (!token) {
      return { synced: 0, remaining: pending.length };
    }

    let totalSynced = 0;
    let remaining = pending;

    while (remaining.length > 0) {
      const batch = remaining.slice(0, 100);
      const res = await apiPostJson<{
        status?: string;
        syncedEventIds?: string[];
        summary?: ServerActivitySummaryPayload;
      }>('/api/learning/activity/sync', { events: batch });

      if (!res.ok || !res.data) {
        break;
      }

      const acked = new Set(
        Array.isArray(res.data.syncedEventIds) ? res.data.syncedEventIds : []
      );

      if (res.data.summary && res.data.summary.source === 'supabase') {
        reconcileServerProgressSummary(res.data.summary);
      }

      if (acked.size === 0) {
        // Server responded with fallback_local (e.g. migration not yet applied); keep queue safe for next retry
        break;
      }

      totalSynced += acked.size;
      const latestQueue = loadOfflineActivityQueue();
      remaining = latestQueue.filter((item) => !acked.has(item.clientEventId));
      saveOfflineActivityQueue(remaining);

      if (batch.length < 100) break;
    }

    return { synced: totalSynced, remaining: remaining.length };
  })().finally(() => {
    activeFlushPromise = null;
  });

  return activeFlushPromise;
}

/**
 * Hydrates authoritative Supabase streak, XP, daily usage calendar, and subject/topic mastery
 * into the device cache (called on sign-in, session restore, and cross-device app resume).
 */
export async function hydrateProgressFromServer(): Promise<{
  source: 'supabase' | 'local';
  summary: ServerActivitySummaryPayload | null;
}> {
  if (typeof window === 'undefined') return { source: 'local', summary: null };

  // First flush any unsynced local events so the server summary reflects offline work too
  await flushOfflineActivityQueue();

  try {
    const token = await getAccessToken();
    if (!token) return { source: 'local', summary: null };

    const res = await apiGetJson<ServerActivitySummaryPayload>('/api/learning/activity/summary');
    if (!res.ok || !res.data || res.data.source !== 'supabase') {
      return { source: 'local', summary: null };
    }

    reconcileServerProgressSummary(res.data);
    return { source: 'supabase', summary: res.data };
  } catch {
    return { source: 'local', summary: null };
  }
}

// =============================================================================
// LIVE SUPABASE QUESTION BANK FEED & OFFLINE DEVICE PACK CACHE
// =============================================================================

export function loadCachedLiveQuestions(): LiveQuestionFeedItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUESTION_BANK_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LiveQuestionFeedItem[]) : [];
  } catch {
    return [];
  }
}

function saveCachedLiveQuestions(questions: LiveQuestionFeedItem[]): void {
  if (typeof window === 'undefined' || questions.length === 0) return;
  try {
    const existing = loadCachedLiveQuestions();
    const byId = new Map<string, LiveQuestionFeedItem>();
    for (const q of questions) {
      byId.set(q.id, q);
    }
    for (const q of existing) {
      if (!byId.has(q.id)) byId.set(q.id, q);
    }
    const merged = Array.from(byId.values()).slice(0, MAX_CACHED_QUESTIONS);
    localStorage.setItem(QUESTION_BANK_CACHE_KEY, JSON.stringify(merged));
  } catch {
    // ignore storage quota errors
  }
}

/**
 * Fetches live questions from Supabase (`GET /api/learning/question-feed`) for Blitz,
 * Smart Practice, Custom, or CBT, caches them on-device for offline Android replay,
 * and falls back gracefully to cached questions when offline.
 */
export async function fetchLiveQuestionFeed(params: {
  subjects: string[];
  focusSubject?: string;
  scope?: 'merged' | 'single';
  limit?: number;
  year?: number | null;
  difficulty?: 'mix' | 'easy' | 'medium' | 'hard';
}): Promise<{
  source: 'supabase' | 'verified_catalog' | 'device_cache';
  questions: LiveQuestionFeedItem[];
}> {
  const qs = new URLSearchParams();
  if (params.subjects.length > 0) qs.set('subjects', params.subjects.slice(0, 4).join(','));
  if (params.focusSubject) qs.set('focus', params.focusSubject);
  if (params.scope) qs.set('scope', params.scope);
  if (params.limit) qs.set('limit', String(Math.max(1, Math.min(80, params.limit))));
  if (typeof params.year === 'number' && params.year >= 1978) qs.set('year', String(params.year));
  if (params.difficulty && params.difficulty !== 'mix') qs.set('difficulty', params.difficulty);

  try {
    const token = await getAccessToken();
    if (token) {
      const res = await apiGetJson<{
        source?: 'supabase' | 'verified_catalog';
        questions?: LiveQuestionFeedItem[];
      }>(`/api/learning/question-feed?${qs.toString()}`);

      if (res.ok && Array.isArray(res.data?.questions) && res.data.questions.length > 0) {
        saveCachedLiveQuestions(res.data.questions);
        return {
          source: res.data.source || 'verified_catalog',
          questions: res.data.questions,
        };
      }
    }
  } catch {
    // Fall back cleanly to on-device cache below
  }

  const cached = loadCachedLiveQuestions();
  const targetLower = new Set(
    (params.scope === 'single' && params.focusSubject
      ? [params.focusSubject]
      : params.subjects
    ).map((s) => s.toLowerCase())
  );
  const filteredCache =
    targetLower.size > 0
      ? cached.filter((q) => targetLower.has(q.subjectCanonical.toLowerCase()))
      : cached;

  return {
    source: 'device_cache',
    questions: filteredCache.slice(0, params.limit || 30),
  };
}
