import { Router, type Request } from 'express';
import { z } from 'zod';
import { SEED_QUESTIONS } from '../../src/data/questions';
import {
  getCuratedStarterQuestions,
  getShortSubjectLabel,
} from '../../src/data/curatedStarterQuestions';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { recordStudyActivity as recordServerStreakRpc } from '../gamification/service';

export const LAGOS_TIMEZONE = 'Africa/Lagos';
const XP_PER_ACTIVE_MINUTE = 6;
const MAX_EVENTS_PER_SYNC = 100;

export const activityEventSchema = z.strictObject({
  clientEventId: z.string().trim().min(4).max(120),
  eventType: z.enum(['question_attempt', 'session_completed']),
  mode: z.enum(['blitz', 'smart', 'custom', 'cbt', 'diagnostic']),
  questionId: z.string().trim().max(120).optional().nullable(),
  subject: z.string().trim().min(1).max(100),
  topic: z.string().trim().min(1).max(180).default('Core Syllabus'),
  selectedOption: z.enum(['A', 'B', 'C', 'D']).optional().nullable(),
  isCorrect: z.boolean().optional().nullable(),
  elapsedSeconds: z.number().int().min(0).max(7200).default(12),
  comboMultiplier: z.number().int().min(1).max(3).optional(),
  occurredAt: z.string().trim().max(64).optional(),
});

export const batchActivitySyncSchema = z.strictObject({
  events: z.array(activityEventSchema).min(1).max(MAX_EVENTS_PER_SYNC),
});

export type ValidatedActivityEvent = z.infer<typeof activityEventSchema>;

export interface LiveFeedQuestionDto {
  id: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  year?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
  source: 'supabase' | 'curated' | 'seed';
}

export interface ServerDailyUsageRow {
  date: string;
  questionsPracticed: number;
  correctCount: number;
  xpEarned: number;
  studySeconds: number;
  sessionsCompleted: number;
  subjectsPracticed: string[];
}

export interface ServerActivitySummary {
  timezone: string;
  todayWat: string;
  streakDays: number;
  longestStreak: number;
  lastActivityDate: string | null;
  totalXp: number;
  dailyXp: number;
  totalStudySeconds: number;
  dailyStudySeconds: number;
  dailyActivityLog: Record<string, ServerDailyUsageRow>;
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

/**
 * Formats any Date/ISO timestamp as `YYYY-MM-DD` in Nigeria West Africa Time (Africa/Lagos).
 * Using a single server-authoritative timezone prevents device clock manipulation and keeps
 * Android APK and Desktop WebApp streaks aligned to midnight WAT.
 */
export function getLagosIsoDate(input?: Date | string | null): string {
  const date =
    input instanceof Date
      ? input
      : typeof input === 'string' && input.trim()
      ? new Date(input)
      : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: LAGOS_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(safeDate);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;
    if (year && month && day) {
      return `${year}-${month}-${day}`;
    }
  } catch {
    // Fallback to UTC+1 offset arithmetic if Intl timezone data is unavailable
  }

  const watMs = safeDate.getTime() + 60 * 60 * 1000;
  const wat = new Date(watMs);
  const y = wat.getUTCFullYear();
  const m = String(wat.getUTCMonth() + 1).padStart(2, '0');
  const d = String(wat.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const day = String(dt.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Computes strictly bounded, anti-cheat server-side XP for an activity event.
 * Clamps elapsed time and combo multipliers so tampered client payloads cannot farm XP.
 */
export function computeServerXpForEvent(event: ValidatedActivityEvent): {
  clampedSeconds: number;
  xpAwarded: number;
} {
  if (event.eventType === 'session_completed') {
    const clampedSeconds = Math.max(10, Math.min(7200, Math.round(event.elapsedSeconds || 60)));
    const timeBonusXp = Math.min(
      60,
      Math.max(4, Math.round((clampedSeconds / 60) * XP_PER_ACTIVE_MINUTE))
    );
    const completionBase = event.mode === 'cbt' ? 25 : 10;
    return {
      clampedSeconds,
      xpAwarded: Math.min(120, timeBonusXp + completionBase),
    };
  }

  const clampedSeconds = Math.max(2, Math.min(180, Math.round(event.elapsedSeconds || 12)));
  const timeXp = Math.max(1, Math.round((clampedSeconds / 60) * XP_PER_ACTIVE_MINUTE));
  const multiplier = Math.max(1, Math.min(3, Math.round(event.comboMultiplier || 1)));
  const baseAccuracyXp = event.isCorrect ? 10 * multiplier : 2;
  return {
    clampedSeconds,
    xpAwarded: Math.min(45, baseAccuracyXp + Math.floor(timeXp / 2)),
  };
}

/**
 * Computes authoritative current streak and longest streak from a sorted set of
 * `YYYY-MM-DD` (Africa/Lagos) active dates.
 */
export function computeAuthoritativeStreak(
  activeDatesInput: string[],
  todayWat: string = getLagosIsoDate()
): {
  streakDays: number;
  longestStreak: number;
  lastActivityDate: string | null;
} {
  const uniqueSortedDesc = Array.from(
    new Set(activeDatesInput.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))
  ).sort((a, b) => (a > b ? -1 : a < b ? 1 : 0));

  if (uniqueSortedDesc.length === 0) {
    return { streakDays: 0, longestStreak: 0, lastActivityDate: null };
  }

  const yesterdayWat = shiftIsoDate(todayWat, -1);
  const lastActivityDate = uniqueSortedDesc[0];
  const dateSet = new Set(uniqueSortedDesc);

  // Current streak is alive only if the student studied today (WAT) or yesterday (WAT)
  let streakDays = 0;
  if (lastActivityDate === todayWat || lastActivityDate === yesterdayWat) {
    let cursor = lastActivityDate;
    while (dateSet.has(cursor)) {
      streakDays += 1;
      cursor = shiftIsoDate(cursor, -1);
    }
  }

  // Compute longest consecutive run across recorded history
  const asc = [...uniqueSortedDesc].reverse();
  let longestStreak = 1;
  let running = 1;
  for (let i = 1; i < asc.length; i += 1) {
    if (shiftIsoDate(asc[i - 1], 1) === asc[i]) {
      running += 1;
      if (running > longestStreak) longestStreak = running;
    } else {
      running = 1;
    }
  }

  return {
    streakDays,
    longestStreak: Math.max(longestStreak, streakDays),
    lastActivityDate,
  };
}

function normalizeSubjectNameForQuery(raw: string): string {
  const trimmed = raw.trim();
  if (/^use of english$/i.test(trimmed)) return 'English Language';
  return trimmed;
}

function normalizeAnswerLetter(raw: unknown): 'A' | 'B' | 'C' | 'D' | null {
  const upper = String(raw || '').trim().toUpperCase();
  if (upper === 'A' || upper === 'B' || upper === 'C' || upper === 'D') return upper;
  return null;
}

function shuffleItems<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function mapSupabaseBankRow(row: any): LiveFeedQuestionDto | null {
  const answer = normalizeAnswerLetter(row.answer);
  if (!answer || !row.question || !row.option_a || !row.option_b || !row.option_c || !row.option_d) {
    return null;
  }
  const canonicalSubject = normalizeSubjectNameForQuery(String(row.subject || 'JAMB UTME'));
  const topicLabel = String(row.topic || row.subtopic || 'Core Syllabus').trim() || 'Core Syllabus';
  const explanationShort =
    String(row.explanation_short || '').trim() ||
    `Option ${answer} is correct based on the official JAMB ${canonicalSubject} syllabus.`;
  const explanationFull = String(row.explanation || '').trim() || explanationShort;
  const explanationPidgin = `Na Option ${answer} be the correct answer for dis ${canonicalSubject} (${topicLabel}) question. ${explanationShort}`;

  return {
    id: String(row.id),
    subjectCanonical: canonicalSubject,
    subjectLabel: getShortSubjectLabel(canonicalSubject),
    topicLabel,
    year: typeof row.year === 'number' ? row.year : undefined,
    difficulty:
      row.difficulty === 'easy' || row.difficulty === 'medium' || row.difficulty === 'hard'
        ? row.difficulty
        : 'medium',
    question: String(row.question),
    options: {
      A: String(row.option_a),
      B: String(row.option_b),
      C: String(row.option_c),
      D: String(row.option_d),
    },
    answer,
    explanationShort,
    explanationFull,
    explanationPidgin,
    source: 'supabase',
  };
}

function getAuthenticatedUserId(req: Request): string | null {
  return (req as AuthenticatedRequest).user?.id || null;
}

async function buildAuthoritativeSummaryForUser(userId: string): Promise<ServerActivitySummary> {
  const todayWat = getLagosIsoDate();

  const [usageRes, masteryRes, streakRes] = await Promise.all([
    supabaseAdmin
      .from('student_daily_usage')
      .select(
        'activity_date, questions_practiced, correct_count, xp_earned, study_seconds, sessions_completed, subjects_practiced'
      )
      .eq('user_id', userId)
      .order('activity_date', { ascending: false })
      .limit(90),
    supabaseAdmin
      .from('student_topic_mastery')
      .select('subject, topic, attempted_count, correct_count, last_attempt_at, last_result')
      .eq('user_id', userId)
      .limit(500),
    supabaseAdmin
      .from('student_streak_state')
      .select('current_streak, longest_streak, last_activity_date')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (usageRes.error) {
    // Graceful fallback if Stage 3 migration hasn't been applied on this environment yet
    return {
      timezone: LAGOS_TIMEZONE,
      todayWat,
      streakDays: Number(streakRes.data?.current_streak || 0),
      longestStreak: Number(streakRes.data?.longest_streak || 0),
      lastActivityDate: streakRes.data?.last_activity_date || null,
      totalXp: 0,
      dailyXp: 0,
      totalStudySeconds: 0,
      dailyStudySeconds: 0,
      dailyActivityLog: {},
      subjectStats: {},
      topicStats: {},
      source: 'profile_fallback',
    };
  }

  const usageRows = usageRes.data || [];
  const dailyActivityLog: Record<string, ServerDailyUsageRow> = {};
  const activeDates: string[] = [];
  let totalXp = 0;
  let dailyXp = 0;
  let totalStudySeconds = 0;
  let dailyStudySeconds = 0;

  for (const row of usageRows) {
    const dateKey = String(row.activity_date || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    const questionsPracticed = Number(row.questions_practiced || 0);
    const correctCount = Number(row.correct_count || 0);
    const xpEarned = Number(row.xp_earned || 0);
    const studySeconds = Number(row.study_seconds || 0);
    const sessionsCompleted = Number(row.sessions_completed || 0);
    const subjectsPracticed = Array.isArray(row.subjects_practiced)
      ? row.subjects_practiced.map(String)
      : [];

    dailyActivityLog[dateKey] = {
      date: dateKey,
      questionsPracticed,
      correctCount,
      xpEarned,
      studySeconds,
      sessionsCompleted,
      subjectsPracticed,
    };

    if (questionsPracticed > 0 || xpEarned > 0 || sessionsCompleted > 0) {
      activeDates.push(dateKey);
    }

    totalXp += xpEarned;
    totalStudySeconds += studySeconds;
    if (dateKey === todayWat) {
      dailyXp = xpEarned;
      dailyStudySeconds = studySeconds;
    }
  }

  const computedStreak = computeAuthoritativeStreak(activeDates, todayWat);
  const rpcCurrent = Number(streakRes.data?.current_streak || 0);
  const rpcLongest = Number(streakRes.data?.longest_streak || 0);

  const subjectStats: Record<string, { solved: number; correct: number; rating: number }> = {};
  const topicStats: ServerActivitySummary['topicStats'] = {};

  for (const m of masteryRes.data || []) {
    const subj = normalizeSubjectNameForQuery(String(m.subject || 'JAMB UTME'));
    const topic = String(m.topic || 'Core Syllabus').trim() || 'Core Syllabus';
    const solved = Number(m.attempted_count || 0);
    const correct = Number(m.correct_count || 0);
    if (solved <= 0) continue;

    if (!subjectStats[subj]) {
      subjectStats[subj] = { solved: 0, correct: 0, rating: 0 };
    }
    subjectStats[subj].solved += solved;
    subjectStats[subj].correct += correct;
    subjectStats[subj].rating = Math.round(
      (subjectStats[subj].correct / Math.max(1, subjectStats[subj].solved)) * 100
    );

    if (!topicStats[subj]) topicStats[subj] = {};
    const lastAttemptAt = String(m.last_attempt_at || new Date().toISOString());
    topicStats[subj][topic] = {
      solved,
      correct,
      lastPracticedAt: lastAttemptAt,
      ...(m.last_result === 'incorrect' ? { lastMissedAt: lastAttemptAt } : {}),
    };
  }

  return {
    timezone: LAGOS_TIMEZONE,
    todayWat,
    streakDays: Math.max(computedStreak.streakDays, rpcCurrent),
    longestStreak: Math.max(computedStreak.longestStreak, rpcLongest),
    lastActivityDate: computedStreak.lastActivityDate || streakRes.data?.last_activity_date || null,
    totalXp,
    dailyXp,
    totalStudySeconds,
    dailyStudySeconds,
    dailyActivityLog,
    subjectStats,
    topicStats,
    source: 'supabase',
  };
}

/**
 * Registers Stage 3 live Question Bank delivery & Authoritative Activity Sync endpoints
 * onto the existing `/api/learning` router.
 */
export function registerStage3LearningRoutes(router: Router): void {
  /**
   * GET /api/learning/question-feed
   * Serves real published JAMB questions from Supabase `question_bank` prioritized by
   * the student's weak topics in `student_topic_mastery`, with seamless verified catalog
   * backfill when a subject needs more rows so practice never stalls.
   */
  router.get('/question-feed', requireAuth, async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    const rawSubjects =
      typeof req.query.subjects === 'string'
        ? req.query.subjects
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];
    const focusSubject =
      typeof req.query.focus === 'string' && req.query.focus.trim()
        ? req.query.focus.trim().slice(0, 80)
        : rawSubjects[0] || '';
    const scope = req.query.scope === 'single' ? 'single' : 'merged';
    const rawLimit = req.query.limit === undefined ? 30 : Number(req.query.limit);
    const limit = Number.isInteger(rawLimit) ? Math.max(1, Math.min(80, rawLimit)) : 30;
    const rawYear = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const yearFilter =
      rawYear !== undefined && Number.isInteger(rawYear) && rawYear >= 1978 && rawYear <= 2100
        ? rawYear
        : undefined;
    const difficultyFilter =
      req.query.difficulty === 'easy' ||
      req.query.difficulty === 'medium' ||
      req.query.difficulty === 'hard'
        ? req.query.difficulty
        : undefined;

    const targetSubjects =
      scope === 'single' && focusSubject
        ? [focusSubject]
        : rawSubjects.length > 0
        ? rawSubjects
        : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

    // Match both "English Language" and "Use of English" in Supabase question_bank
    const dbSubjects = Array.from(
      new Set(
        targetSubjects.flatMap((s) =>
          /^english language$/i.test(s)
            ? ['English Language', 'Use of English']
            : /^use of english$/i.test(s)
            ? ['Use of English', 'English Language']
            : [s]
        )
      )
    );

    const supabaseQuestions: LiveFeedQuestionDto[] = [];
    const weakTopicsSet = new Set<string>();

    try {
      const [bankRes, masteryRes] = await Promise.all([
        (() => {
          let q = supabaseAdmin
            .from('question_bank')
            .select(
              'id, subject, topic, subtopic, year, difficulty, question, option_a, option_b, option_c, option_d, answer, explanation, explanation_short'
            )
            .eq('status', 'published')
            .in('subject', dbSubjects);
          if (yearFilter) q = q.eq('year', yearFilter);
          if (difficultyFilter) q = q.ilike('difficulty', difficultyFilter);
          return q.limit(200);
        })(),
        supabaseAdmin
          .from('student_topic_mastery')
          .select('subject, topic, mastery_score')
          .eq('user_id', userId)
          .lt('mastery_score', 75)
          .limit(40),
      ]);

      if (!masteryRes.error && Array.isArray(masteryRes.data)) {
        for (const m of masteryRes.data) {
          if (m.topic) weakTopicsSet.add(String(m.topic).toLowerCase());
        }
      }

      if (!bankRes.error && Array.isArray(bankRes.data)) {
        for (const row of bankRes.data) {
          const mapped = mapSupabaseBankRow(row);
          if (mapped) supabaseQuestions.push(mapped);
        }
      }
    } catch {
      // Keep practice flowing smoothly via verified catalog below
    }

    // Prioritize student's weak topics first among live Supabase questions
    const prioritizedLive = [
      ...shuffleItems(
        supabaseQuestions.filter((q) => weakTopicsSet.has(q.topicLabel.toLowerCase()))
      ),
      ...shuffleItems(
        supabaseQuestions.filter((q) => !weakTopicsSet.has(q.topicLabel.toLowerCase()))
      ),
    ];

    const seenIds = new Set<string>();
    const combined: LiveFeedQuestionDto[] = [];
    for (const q of prioritizedLive) {
      if (combined.length >= limit) break;
      if (!seenIds.has(q.id)) {
        seenIds.add(q.id);
        combined.push(q);
      }
    }

    // Seamless verified catalog backfill if Supabase question_bank has fewer rows than requested
    if (combined.length < limit) {
      const subjectLowerSet = new Set(targetSubjects.map((s) => s.toLowerCase()));
      const curatedBackfill: LiveFeedQuestionDto[] = getCuratedStarterQuestions()
        .filter((q) => subjectLowerSet.has(q.subjectCanonical.toLowerCase()))
        .map((q) => ({ ...q, source: 'curated' as const }));
      const seedBackfill: LiveFeedQuestionDto[] = SEED_QUESTIONS.filter((q) => {
        if (!subjectLowerSet.has(q.subject.toLowerCase())) return false;
        if (yearFilter && q.year !== yearFilter) return false;
        if (difficultyFilter && q.difficulty !== difficultyFilter) return false;
        return true;
      }).map((q) => ({
        id: q.id,
        subjectCanonical: q.subject,
        subjectLabel: getShortSubjectLabel(q.subject),
        topicLabel: q.topic || q.subtopic || 'Core Syllabus',
        year: q.year,
        difficulty: q.difficulty,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanationShort:
          q.explanation_short ||
          `Option ${q.answer} is correct based on the official JAMB ${q.subject} syllabus.`,
        explanationFull: q.explanation || q.explanation_short || '',
        explanationPidgin:
          q.explanation_pidgin ||
          `Na Option ${q.answer} be the correct answer for dis ${q.subject} question.`,
        source: 'seed' as const,
      }));

      for (const item of shuffleItems([...curatedBackfill, ...seedBackfill])) {
        if (combined.length >= limit) break;
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          combined.push(item);
        }
      }
    }

    const supabaseCount = combined.filter((q) => q.source === 'supabase').length;
    res.set('Cache-Control', 'no-store');
    return res.json({
      source: supabaseCount > 0 ? 'supabase' : 'verified_catalog',
      supabaseCount,
      total: combined.length,
      questions: combined,
    });
  });

  /**
   * POST /api/learning/activity/sync
   * Authoritative, idempotent batch sync endpoint for Android APK & Desktop WebApp.
   * Replays offline-queued attempts & sessions, enforces server-side WAT streak and
   * anti-cheat XP caps, updates `student_daily_usage` and `student_topic_mastery`,
   * and returns the authoritative cross-device summary.
   */
  router.post(
    '/activity/sync',
    requireAuth,
    validateBody(batchActivitySyncSchema),
    async (req, res) => {
      const userId = getAuthenticatedUserId(req);
      if (!userId) return res.status(401).json({ error: 'Authentication required.' });

      const { events } = req.body as z.infer<typeof batchActivitySyncSchema>;
      const syncedEventIds: string[] = [];

      // Deduplicate within the incoming payload by clientEventId
      const uniqueEventsMap = new Map<string, ValidatedActivityEvent>();
      for (const ev of events) {
        if (!uniqueEventsMap.has(ev.clientEventId)) {
          uniqueEventsMap.set(ev.clientEventId, ev);
        }
      }
      const uniqueEvents = Array.from(uniqueEventsMap.values());
      const clientIds = uniqueEvents.map((e) => e.clientEventId);

      try {
        // 1. Check which clientEventIds were already persisted (strict idempotency)
        const { data: existingRows, error: existingErr } = await supabaseAdmin
          .from('student_activity_events')
          .select('client_event_id')
          .eq('user_id', userId)
          .in('client_event_id', clientIds);

        if (existingErr) {
          // If the new migration hasn't been applied yet, still update streak RPC safely
          try {
            await recordServerStreakRpc(supabaseAdmin, userId, LAGOS_TIMEZONE);
          } catch {
            // ignore
          }
          const fallbackSummary = await buildAuthoritativeSummaryForUser(userId);
          return res.status(200).json({
            status: 'fallback_local',
            syncedEventIds: [],
            summary: fallbackSummary,
          });
        }

        const alreadyStored = new Set(
          (existingRows || []).map((r: any) => String(r.client_event_id))
        );
        for (const id of alreadyStored) {
          syncedEventIds.push(id);
        }

        const freshEvents = uniqueEvents.filter((e) => !alreadyStored.has(e.clientEventId));

        if (freshEvents.length > 0) {
          const eventInsertRows = freshEvents.map((ev) => {
            const { clampedSeconds, xpAwarded } = computeServerXpForEvent(ev);
            const occurredIso =
              ev.occurredAt && !Number.isNaN(new Date(ev.occurredAt).getTime())
                ? new Date(ev.occurredAt).toISOString()
                : new Date().toISOString();
            const activityDateWat = getLagosIsoDate(occurredIso);

            return {
              user_id: userId,
              client_event_id: ev.clientEventId,
              event_type: ev.eventType,
              mode: ev.mode,
              question_id: ev.questionId || null,
              subject: normalizeSubjectNameForQuery(ev.subject),
              topic: ev.topic || 'Core Syllabus',
              selected_option: ev.selectedOption || null,
              is_correct: typeof ev.isCorrect === 'boolean' ? ev.isCorrect : null,
              elapsed_seconds: clampedSeconds,
              xp_awarded: xpAwarded,
              activity_date_wat: activityDateWat,
              occurred_at: occurredIso,
            };
          });

          const { error: insertErr } = await supabaseAdmin
            .from('student_activity_events')
            .upsert(eventInsertRows, {
              onConflict: 'user_id,client_event_id',
              ignoreDuplicates: true,
            });

          if (insertErr) {
            return res.status(503).json({
              error: 'Could not persist activity events right now. They remain queued on your device.',
              code: 'ACTIVITY_SYNC_RETRY',
            });
          }

          for (const row of eventInsertRows) {
            syncedEventIds.push(row.client_event_id);
          }

          // 2. Roll up into `student_daily_usage` grouped by Africa/Lagos activity date
          const deltasByDate = new Map<
            string,
            {
              questionsPracticed: number;
              correctCount: number;
              xpEarned: number;
              studySeconds: number;
              sessionsCompleted: number;
              subjects: Set<string>;
            }
          >();

          const topicDeltas = new Map<
            string,
            {
              subject: string;
              topic: string;
              attempted: number;
              correct: number;
              lastResult: 'correct' | 'incorrect';
              lastAttemptAt: string;
            }
          >();

          for (const row of eventInsertRows) {
            const bucket = deltasByDate.get(row.activity_date_wat) || {
              questionsPracticed: 0,
              correctCount: 0,
              xpEarned: 0,
              studySeconds: 0,
              sessionsCompleted: 0,
              subjects: new Set<string>(),
            };
            if (row.event_type === 'question_attempt') {
              bucket.questionsPracticed += 1;
              if (row.is_correct) bucket.correctCount += 1;

              const tKey = `${row.subject}::${row.topic}`;
              const tBucket = topicDeltas.get(tKey) || {
                subject: row.subject,
                topic: row.topic,
                attempted: 0,
                correct: 0,
                lastResult: row.is_correct ? 'correct' : 'incorrect',
                lastAttemptAt: row.occurred_at,
              };
              tBucket.attempted += 1;
              if (row.is_correct) tBucket.correct += 1;
              tBucket.lastResult = row.is_correct ? 'correct' : 'incorrect';
              if (row.occurred_at > tBucket.lastAttemptAt) {
                tBucket.lastAttemptAt = row.occurred_at;
              }
              topicDeltas.set(tKey, tBucket);
            } else {
              bucket.sessionsCompleted += 1;
            }
            bucket.xpEarned += row.xp_awarded;
            bucket.studySeconds += row.elapsed_seconds;
            if (row.subject) bucket.subjects.add(row.subject);
            deltasByDate.set(row.activity_date_wat, bucket);
          }

          const affectedDates = Array.from(deltasByDate.keys());
          const { data: existingDaily } = await supabaseAdmin
            .from('student_daily_usage')
            .select(
              'activity_date, questions_practiced, correct_count, xp_earned, study_seconds, sessions_completed, subjects_practiced'
            )
            .eq('user_id', userId)
            .in('activity_date', affectedDates);

          const existingByDate = new Map(
            (existingDaily || []).map((r: any) => [String(r.activity_date).slice(0, 10), r])
          );

          const dailyUpserts = affectedDates.map((dateKey) => {
            const prev = existingByDate.get(dateKey);
            const delta = deltasByDate.get(dateKey)!;
            const mergedSubjects = Array.from(
              new Set([
                ...(Array.isArray(prev?.subjects_practiced) ? prev.subjects_practiced : []),
                ...Array.from(delta.subjects),
              ])
            );
            return {
              user_id: userId,
              activity_date: dateKey,
              questions_practiced: Number(prev?.questions_practiced || 0) + delta.questionsPracticed,
              correct_count: Number(prev?.correct_count || 0) + delta.correctCount,
              xp_earned: Number(prev?.xp_earned || 0) + delta.xpEarned,
              study_seconds: Number(prev?.study_seconds || 0) + delta.studySeconds,
              sessions_completed: Number(prev?.sessions_completed || 0) + delta.sessionsCompleted,
              subjects_practiced: mergedSubjects,
              updated_at: new Date().toISOString(),
            };
          });

          await supabaseAdmin
            .from('student_daily_usage')
            .upsert(dailyUpserts, { onConflict: 'user_id,activity_date' });

          // 3. Update `student_topic_mastery` for every practiced topic (feeds Stage 4 AI Failure Intelligence)
          if (topicDeltas.size > 0) {
            const { data: existingMastery } = await supabaseAdmin
              .from('student_topic_mastery')
              .select('subject, topic, attempted_count, correct_count, correct_streak, interval_days')
              .eq('user_id', userId);

            const masteryMap = new Map(
              (existingMastery || []).map((m: any) => [`${m.subject}::${m.topic}`, m])
            );

            const masteryUpserts = Array.from(topicDeltas.values()).map((delta) => {
              const prev = masteryMap.get(`${delta.subject}::${delta.topic}`);
              const nextAttempted = Number(prev?.attempted_count || 0) + delta.attempted;
              const nextCorrect = Number(prev?.correct_count || 0) + delta.correct;
              const nextScore = Math.round((nextCorrect / Math.max(1, nextAttempted)) * 100);
              const nextStreak =
                delta.lastResult === 'correct' ? Number(prev?.correct_streak || 0) + 1 : 0;
              const nextInterval =
                delta.lastResult === 'correct'
                  ? Math.min(30, Math.max(1, Number(prev?.interval_days || 1) * 2))
                  : 1;
              const nextReview = new Date(
                Date.now() + nextInterval * 24 * 60 * 60 * 1000
              ).toISOString();

              return {
                user_id: userId,
                subject: delta.subject,
                topic: delta.topic,
                attempted_count: nextAttempted,
                correct_count: nextCorrect,
                mastery_score: nextScore,
                correct_streak: nextStreak,
                interval_days: nextInterval,
                last_result: delta.lastResult,
                last_attempt_at: delta.lastAttemptAt,
                next_review_at: nextReview,
                updated_at: new Date().toISOString(),
              };
            });

            await supabaseAdmin
              .from('student_topic_mastery')
              .upsert(masteryUpserts, { onConflict: 'user_id,subject,topic' });
          }

          // 4. Advance server-side daily streak RPC in Africa/Lagos timezone
          try {
            await recordServerStreakRpc(supabaseAdmin, userId, LAGOS_TIMEZONE);
          } catch {
            // Summary also derives streak deterministically from student_daily_usage
          }
        }

        const summary = await buildAuthoritativeSummaryForUser(userId);
        res.set('Cache-Control', 'no-store');
        return res.status(200).json({
          status: 'synced',
          syncedEventIds: Array.from(new Set(syncedEventIds)),
          freshCount: freshEvents.length,
          summary,
        });
      } catch (err) {
        console.error(
          '[SABI] Activity sync error:',
          err instanceof Error ? err.message : 'unknown_error'
        );
        return res.status(503).json({
          error: 'Activity sync is temporarily unavailable. Your progress stays safely queued on-device.',
          code: 'ACTIVITY_SYNC_RETRY',
        });
      }
    }
  );

  /**
   * GET /api/learning/activity/summary
   * Hydrates the authenticated student's authoritative cross-device streak, XP,
   * Nigeria-time daily usage calendar, and subject/topic mastery from Supabase.
   */
  router.get('/activity/summary', requireAuth, async (req, res) => {
    const userId = getAuthenticatedUserId(req);
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });

    try {
      const summary = await buildAuthoritativeSummaryForUser(userId);
      res.set('Cache-Control', 'no-store');
      return res.json(summary);
    } catch {
      return res.status(503).json({
        error: 'Could not load your study activity summary right now.',
        code: 'ACTIVITY_SUMMARY_UNAVAILABLE',
      });
    }
  });
}
