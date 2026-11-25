import type { SubjectName } from '../types';
import { apiFetch } from './apiClient';

export interface SubjectProgressStat {
  solved: number;
  correct: number;
  levelsAttempted?: number;
  flawlessLevels?: number;
  /**
   * Real Subject Mastery Estimate (0 - 100%) calculated strictly from actual
   * candidate attempts across Smart Practice, Blitz, Custom, Diagnostic, and CBT.
   */
  rating?: number;
}

export interface TopicProgressStat {
  solved: number;
  correct: number;
  lastPracticedAt: string;
  lastMissedAt?: string;
}

export interface DailyActivityEntry {
  date: string; // YYYY-MM-DD
  questionsPracticed: number;
  correctCount: number;
  levelsAttempted: number;
  flawlessLevelsCleared: number;
  subjectsPracticed: string[];
  xpEarned?: number;
  studySeconds?: number;
}

export interface DiamondSectionBreakdown {
  blitzUnlock: number;       // Paid subscription allocation
  smartRoadUnlock: number;   // Paid subscription allocation
  cbtSimulators: number;     // Paid subscription allocation
  aiVerifications: number;   // Paid subscription allocation
}

export interface UserRealProgress {
  /**
   * Total available diamonds (streakBonusDiamonds + mainDiamonds).
   * Always starts at 0 — never fake pre-populated diamonds.
   */
  diamonds: number;
  /**
   * Main purchased diamonds from the candidate's active subscription plan.
   * Subscription is the primary source of Diamonds / AI Credits.
   */
  mainDiamonds: number;
  /**
   * Limited Performance & XP Assistance Diamonds earned through consistent study.
   * Always consumed FIRST before `mainDiamonds` is touched!
   */
  streakBonusDiamonds: number;
  diamondSections: DiamondSectionBreakdown;
  subscriptionPlan: 'free' | 'scholar_pass' | 'citadel_pro';
  streakDays: number;
  longestStreak: number;
  lastActiveDate: string | null;
  /**
   * Real cumulative XP calculated strictly from active study usage, duration, and answers.
   * Starts at 0 until the student actually practices.
   */
  totalXp: number;
  dailyXp: number;
  dailyXpDate: string | null;
  totalStudySeconds: number;
  dailyStudySeconds: number;
  /** Tracks how much XP has already been converted into limited Assistance Diamonds */
  xpConvertedToDiamonds: number;
  dailyAssistanceDiamondsEarned: number;
  dailyAssistanceDiamondsDate: string | null;
  dailyBlitzSolved: number;
  dailySmartLevelsCleared: number;
  dailyDiagnosticsCompleted: number;
  blitzUnlockedLevel: number;
  blitzStarsByLevel: Record<number, number>;
  blitzSet1GeneralTestPassed?: boolean;
  smartUnlockedLevel: number;
  smartStarsByLevel: Record<number, number>;
  smartSet1GeneralTestPassed?: boolean;
  subjectStats: Record<string, SubjectProgressStat>;
  topicStats: Record<string, Record<string, TopicProgressStat>>;
  dailyActivityLog: Record<string, DailyActivityEntry>;
}

/**
 * Economy Constants (Subscription is primary; XP Assistance Diamonds are intentionally limited).
 * - Every 250 real XP grants +1 Assistance Diamond, capped at 3 Assistance Diamonds per day.
 * - Active study duration awards 6 XP per active minute (capped per question/session to prevent idle farming).
 */
export const XP_PER_ASSISTANCE_DIAMOND = 250;
export const DAILY_ASSISTANCE_DIAMOND_CAP = 3;
export const XP_PER_ACTIVE_MINUTE = 6;

const STORAGE_KEY = 'sabi_real_user_progress_v1';

const DEFAULT_SECTIONS: DiamondSectionBreakdown = {
  blitzUnlock: 0,
  smartRoadUnlock: 0,
  cbtSimulators: 0,
  aiVerifications: 0,
};

const DEFAULT_PROGRESS: UserRealProgress = {
  diamonds: 0,
  mainDiamonds: 0,
  streakBonusDiamonds: 0,
  diamondSections: DEFAULT_SECTIONS,
  subscriptionPlan: 'free',
  streakDays: 0,
  longestStreak: 0,
  lastActiveDate: null,
  totalXp: 0,
  dailyXp: 0,
  dailyXpDate: null,
  totalStudySeconds: 0,
  dailyStudySeconds: 0,
  xpConvertedToDiamonds: 0,
  dailyAssistanceDiamondsEarned: 0,
  dailyAssistanceDiamondsDate: null,
  dailyBlitzSolved: 0,
  dailySmartLevelsCleared: 0,
  dailyDiagnosticsCompleted: 0,
  blitzUnlockedLevel: 1,
  blitzStarsByLevel: {},
  blitzSet1GeneralTestPassed: false,
  smartUnlockedLevel: 1,
  smartStarsByLevel: {},
  smartSet1GeneralTestPassed: false,
  subjectStats: {},
  topicStats: {},
  dailyActivityLog: {},
};

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayIsoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeNextStreak(current: UserRealProgress, today: string): {
  streakDays: number;
  longestStreak: number;
} {
  if (current.lastActiveDate === today) {
    const days = Math.max(1, current.streakDays);
    return {
      streakDays: days,
      longestStreak: Math.max(current.longestStreak || 0, days),
    };
  }
  const yesterday = getYesterdayIsoDate();
  const nextStreak =
    current.lastActiveDate === yesterday ? Math.max(1, current.streakDays) + 1 : 1;
  return {
    streakDays: nextStreak,
    longestStreak: Math.max(current.longestStreak || 0, nextStreak),
  };
}

function applyXpToLimitedDiamonds(progress: UserRealProgress, today: string): UserRealProgress {
  const dailyCount =
    progress.dailyAssistanceDiamondsDate === today
      ? progress.dailyAssistanceDiamondsEarned || 0
      : 0;
  const remainingToday = Math.max(0, DAILY_ASSISTANCE_DIAMOND_CAP - dailyCount);
  const unconvertedXp = Math.max(0, progress.totalXp - (progress.xpConvertedToDiamonds || 0));
  const rawConvertible = Math.floor(unconvertedXp / XP_PER_ASSISTANCE_DIAMOND);
  const awardedNow = Math.min(remainingToday, rawConvertible);

  if (awardedNow <= 0) {
    return {
      ...progress,
      dailyAssistanceDiamondsEarned: dailyCount,
      dailyAssistanceDiamondsDate: today,
    };
  }

  return {
    ...progress,
    streakBonusDiamonds: progress.streakBonusDiamonds + awardedNow,
    xpConvertedToDiamonds:
      (progress.xpConvertedToDiamonds || 0) + awardedNow * XP_PER_ASSISTANCE_DIAMOND,
    dailyAssistanceDiamondsEarned: dailyCount + awardedNow,
    dailyAssistanceDiamondsDate: today,
  };
}

export function getRealUserProgress(): UserRealProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<UserRealProgress>;
    const today = getTodayIsoDate();
    const yesterday = getYesterdayIsoDate();
    const isSameDay = parsed.lastActiveDate === today;
    const isStreakAlive = parsed.lastActiveDate === today || parsed.lastActiveDate === yesterday;

    const mainDiamonds =
      typeof parsed.mainDiamonds === 'number' && parsed.mainDiamonds >= 0
        ? parsed.mainDiamonds
        : 0;
    const streakBonusDiamonds =
      typeof parsed.streakBonusDiamonds === 'number' && parsed.streakBonusDiamonds >= 0
        ? parsed.streakBonusDiamonds
        : 0;
    const totalDiamonds = mainDiamonds + streakBonusDiamonds;

    // Preserve real earned streak only if active today or yesterday
    const rawStreak = typeof parsed.streakDays === 'number' ? Math.max(0, parsed.streakDays) : 0;
    const liveStreak = isStreakAlive ? rawStreak : 0;
    const longestStreak = Math.max(
      typeof parsed.longestStreak === 'number' ? parsed.longestStreak : 0,
      rawStreak
    );

    const totalXp = typeof parsed.totalXp === 'number' && parsed.totalXp >= 0 ? parsed.totalXp : 0;
    const dailyXp = parsed.dailyXpDate === today && typeof parsed.dailyXp === 'number' ? parsed.dailyXp : 0;
    const dailyStudySeconds =
      parsed.dailyXpDate === today && typeof parsed.dailyStudySeconds === 'number'
        ? parsed.dailyStudySeconds
        : 0;
    const dailyAssistanceDiamondsEarned =
      parsed.dailyAssistanceDiamondsDate === today &&
      typeof parsed.dailyAssistanceDiamondsEarned === 'number'
        ? parsed.dailyAssistanceDiamondsEarned
        : 0;

    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      mainDiamonds,
      streakBonusDiamonds,
      diamonds: totalDiamonds,
      streakDays: liveStreak,
      longestStreak,
      totalXp,
      dailyXp,
      dailyXpDate: parsed.dailyXpDate === today ? today : null,
      totalStudySeconds:
        typeof parsed.totalStudySeconds === 'number' && parsed.totalStudySeconds >= 0
          ? parsed.totalStudySeconds
          : 0,
      dailyStudySeconds,
      xpConvertedToDiamonds:
        typeof parsed.xpConvertedToDiamonds === 'number' && parsed.xpConvertedToDiamonds >= 0
          ? parsed.xpConvertedToDiamonds
          : 0,
      dailyAssistanceDiamondsEarned,
      dailyAssistanceDiamondsDate:
        parsed.dailyAssistanceDiamondsDate === today ? today : null,
      diamondSections: {
        ...DEFAULT_SECTIONS,
        ...(parsed.diamondSections || {}),
      },
      dailyBlitzSolved: isSameDay ? (parsed.dailyBlitzSolved || 0) : 0,
      dailySmartLevelsCleared: isSameDay ? (parsed.dailySmartLevelsCleared || 0) : 0,
      dailyDiagnosticsCompleted: isSameDay ? (parsed.dailyDiagnosticsCompleted || 0) : 0,
      subjectStats: {
        ...(parsed.subjectStats || {}),
      },
      topicStats: {
        ...(parsed.topicStats || {}),
      },
      dailyActivityLog: parsed.dailyActivityLog || {},
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export function saveRealUserProgress(next: UserRealProgress): UserRealProgress {
  const normalized: UserRealProgress = {
    ...next,
    mainDiamonds: Math.max(0, next.mainDiamonds || 0),
    streakBonusDiamonds: Math.max(0, next.streakBonusDiamonds || 0),
    diamonds: Math.max(0, (next.mainDiamonds || 0) + (next.streakBonusDiamonds || 0)),
    totalXp: Math.max(0, Math.round(next.totalXp || 0)),
    dailyXp: Math.max(0, Math.round(next.dailyXp || 0)),
    totalStudySeconds: Math.max(0, Math.round(next.totalStudySeconds || 0)),
    dailyStudySeconds: Math.max(0, Math.round(next.dailyStudySeconds || 0)),
    longestStreak: Math.max(next.longestStreak || 0, next.streakDays || 0),
  };

  if (typeof window === 'undefined') return normalized;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('sabi-progress-updated'));

    // Signed-out callers receive 401 which is ignored silently.
    apiFetch('/api/profile/progress', {
      method: 'POST',
      body: JSON.stringify({ progress: normalized }),
    }).catch(() => {});
  } catch {
    // ignore storage errors
  }
  return normalized;
}

export interface EconomySnapshot {
  totalXp: number;
  dailyXp: number;
  dailyStudyMinutes: number;
  totalStudyMinutes: number;
  subscriptionDiamonds: number;
  assistanceDiamonds: number;
  totalDiamonds: number;
  aiCreditsAvailable: number;
  xpPerAssistanceDiamond: number;
  xpTowardNextDiamond: number;
  xpNeededForNextDiamond: number;
  dailyAssistanceDiamondsEarned: number;
  dailyAssistanceDiamondCap: number;
  subscriptionPlan: 'free' | 'scholar_pass' | 'citadel_pro';
}

export function getEconomySnapshot(): EconomySnapshot {
  const progress = getRealUserProgress();
  const unconverted = Math.max(0, progress.totalXp - (progress.xpConvertedToDiamonds || 0));
  const xpTowardNextDiamond = unconverted % XP_PER_ASSISTANCE_DIAMOND;
  const xpNeededForNextDiamond = XP_PER_ASSISTANCE_DIAMOND - xpTowardNextDiamond;

  return {
    totalXp: progress.totalXp,
    dailyXp: progress.dailyXp,
    dailyStudyMinutes: Math.floor((progress.dailyStudySeconds || 0) / 60),
    totalStudyMinutes: Math.floor((progress.totalStudySeconds || 0) / 60),
    subscriptionDiamonds: progress.mainDiamonds,
    assistanceDiamonds: progress.streakBonusDiamonds,
    totalDiamonds: progress.diamonds,
    // 1 Diamond = 1 AI Credit unit; Subscription vault is the main source, XP Assistance Diamonds provide limited backup.
    aiCreditsAvailable: progress.diamonds,
    xpPerAssistanceDiamond: XP_PER_ASSISTANCE_DIAMOND,
    xpTowardNextDiamond,
    xpNeededForNextDiamond,
    dailyAssistanceDiamondsEarned: progress.dailyAssistanceDiamondsEarned || 0,
    dailyAssistanceDiamondCap: DAILY_ASSISTANCE_DIAMOND_CAP,
    subscriptionPlan: progress.subscriptionPlan,
  };
}

/**
 * Consumes diamonds by ALWAYS deducting from `streakBonusDiamonds` (limited assistance bonus)
 * first before touching the user's paid `mainDiamonds` subscription vault.
 */
export function spendUserDiamonds(amount: number): {
  success: boolean;
  usedStreakBonus: number;
  usedMainDiamonds: number;
  progress: UserRealProgress;
} {
  const current = getRealUserProgress();
  if (amount <= 0) {
    return { success: true, usedStreakBonus: 0, usedMainDiamonds: 0, progress: current };
  }
  const totalAvailable = current.streakBonusDiamonds + current.mainDiamonds;
  if (totalAvailable < amount) {
    return { success: false, usedStreakBonus: 0, usedMainDiamonds: 0, progress: current };
  }

  const usedStreakBonus = Math.min(current.streakBonusDiamonds, amount);
  const remainingToDeduct = amount - usedStreakBonus;
  const usedMainDiamonds = remainingToDeduct;

  const next = saveRealUserProgress({
    ...current,
    streakBonusDiamonds: current.streakBonusDiamonds - usedStreakBonus,
    mainDiamonds: current.mainDiamonds - usedMainDiamonds,
  });

  return {
    success: true,
    usedStreakBonus,
    usedMainDiamonds,
    progress: next,
  };
}

/**
 * Records a single real question attempt across Smart Practice, Blitz, Custom, Diagnostic, or CBT.
 * Computes real Subject Mastery %, Topic-level breakdown, usage-time XP, daily streak,
 * and limited XP -> Assistance Diamond conversion.
 */
export function recordStudyActivity(params: {
  subject: SubjectName | string;
  topic?: string;
  isCorrect: boolean;
  mode: 'blitz' | 'smart' | 'custom' | 'cbt' | 'diagnostic';
  elapsedSeconds?: number;
  xpOverride?: number;
}): UserRealProgress {
  const current = getRealUserProgress();
  const today = getTodayIsoDate();
  const { streakDays, longestStreak } = computeNextStreak(current, today);

  const clampedSeconds = Math.max(2, Math.min(180, Math.round(params.elapsedSeconds || 12)));
  // Real XP: usage time + answer effort + accuracy bonus
  const timeXp = Math.max(1, Math.round((clampedSeconds / 60) * XP_PER_ACTIVE_MINUTE));
  const accuracyXp = params.isCorrect ? 8 : 2;
  const xpGain =
    typeof params.xpOverride === 'number'
      ? Math.max(2, Math.round(params.xpOverride + Math.floor(timeXp / 2)))
      : timeXp + accuracyXp;

  const subjectKey = String(params.subject);
  const prevSub = current.subjectStats[subjectKey] || {
    solved: 0,
    correct: 0,
    levelsAttempted: 0,
    flawlessLevels: 0,
    rating: 0,
  };
  const nextSolved = prevSub.solved + 1;
  const nextCorrect = prevSub.correct + (params.isCorrect ? 1 : 0);
  const realRating = nextSolved > 0 ? Math.round((nextCorrect / nextSolved) * 100) : 0;

  const updatedSub: SubjectProgressStat = {
    ...prevSub,
    solved: nextSolved,
    correct: nextCorrect,
    rating: realRating,
  };

  // Topic-level real mastery tracking
  const topicName = (params.topic || 'Core Syllabus').trim() || 'Core Syllabus';
  const prevSubjectTopics = current.topicStats[subjectKey] || {};
  const prevTopic = prevSubjectTopics[topicName] || {
    solved: 0,
    correct: 0,
    lastPracticedAt: new Date().toISOString(),
  };
  const nowIso = new Date().toISOString();
  const updatedTopic: TopicProgressStat = {
    solved: prevTopic.solved + 1,
    correct: prevTopic.correct + (params.isCorrect ? 1 : 0),
    lastPracticedAt: nowIso,
    lastMissedAt: params.isCorrect ? prevTopic.lastMissedAt : nowIso,
  };

  const prevDaily = current.dailyActivityLog[today] || {
    date: today,
    questionsPracticed: 0,
    correctCount: 0,
    levelsAttempted: 0,
    flawlessLevelsCleared: 0,
    subjectsPracticed: [],
    xpEarned: 0,
    studySeconds: 0,
  };

  const updatedSubjectsPracticed = Array.from(
    new Set([...(prevDaily.subjectsPracticed || []), subjectKey])
  );

  const nextDailyXp = (current.dailyXpDate === today ? current.dailyXp : 0) + xpGain;
  const nextDailySeconds =
    (current.dailyXpDate === today ? current.dailyStudySeconds : 0) + clampedSeconds;

  const draft: UserRealProgress = {
    ...current,
    streakDays,
    longestStreak,
    lastActiveDate: today,
    totalXp: current.totalXp + xpGain,
    dailyXp: nextDailyXp,
    dailyXpDate: today,
    totalStudySeconds: current.totalStudySeconds + clampedSeconds,
    dailyStudySeconds: nextDailySeconds,
    dailyBlitzSolved:
      params.mode === 'blitz' ? current.dailyBlitzSolved + 1 : current.dailyBlitzSolved,
    subjectStats: {
      ...current.subjectStats,
      [subjectKey]: updatedSub,
    },
    topicStats: {
      ...current.topicStats,
      [subjectKey]: {
        ...prevSubjectTopics,
        [topicName]: updatedTopic,
      },
    },
    dailyActivityLog: {
      ...current.dailyActivityLog,
      [today]: {
        ...prevDaily,
        questionsPracticed: prevDaily.questionsPracticed + 1,
        correctCount: prevDaily.correctCount + (params.isCorrect ? 1 : 0),
        subjectsPracticed: updatedSubjectsPracticed,
        xpEarned: (prevDaily.xpEarned || 0) + xpGain,
        studySeconds: (prevDaily.studySeconds || 0) + clampedSeconds,
      },
    },
  };

  const withLimitedDiamonds = applyXpToLimitedDiamonds(draft, today);
  return saveRealUserProgress(withLimitedDiamonds);
}

/**
 * Credits session completion duration bonus (e.g. finishing a CBT mock, Custom set, or Diagnostic)
 * without double-counting per-question mastery.
 */
export function recordSessionDurationBonus(params: {
  mode: 'blitz' | 'smart' | 'custom' | 'cbt' | 'diagnostic';
  durationSeconds: number;
  completionBonusXp?: number;
}): UserRealProgress {
  const current = getRealUserProgress();
  const today = getTodayIsoDate();
  const { streakDays, longestStreak } = computeNextStreak(current, today);

  const clampedDuration = Math.max(10, Math.min(7200, Math.round(params.durationSeconds || 60)));
  const timeBonusXp = Math.min(
    60,
    Math.max(4, Math.round((clampedDuration / 60) * XP_PER_ACTIVE_MINUTE))
  );
  const xpGain = timeBonusXp + Math.max(0, Math.round(params.completionBonusXp || 0));

  const prevDaily = current.dailyActivityLog[today] || {
    date: today,
    questionsPracticed: 0,
    correctCount: 0,
    levelsAttempted: 0,
    flawlessLevelsCleared: 0,
    subjectsPracticed: [],
    xpEarned: 0,
    studySeconds: 0,
  };

  const draft: UserRealProgress = {
    ...current,
    streakDays,
    longestStreak,
    lastActiveDate: today,
    totalXp: current.totalXp + xpGain,
    dailyXp: (current.dailyXpDate === today ? current.dailyXp : 0) + xpGain,
    dailyXpDate: today,
    totalStudySeconds: current.totalStudySeconds + clampedDuration,
    dailyStudySeconds:
      (current.dailyXpDate === today ? current.dailyStudySeconds : 0) + clampedDuration,
    dailyDiagnosticsCompleted:
      params.mode === 'diagnostic'
        ? current.dailyDiagnosticsCompleted + 1
        : current.dailyDiagnosticsCompleted,
    dailyActivityLog: {
      ...current.dailyActivityLog,
      [today]: {
        ...prevDaily,
        levelsAttempted: prevDaily.levelsAttempted + 1,
        xpEarned: (prevDaily.xpEarned || 0) + xpGain,
        studySeconds: (prevDaily.studySeconds || 0) + clampedDuration,
      },
    },
  };

  const withLimitedDiamonds = applyXpToLimitedDiamonds(draft, today);
  return saveRealUserProgress(withLimitedDiamonds);
}

/**
 * Legacy-compatible single-attempt wrapper kept for backwards compatibility.
 */
export function recordQuestionAttempt(
  subject: SubjectName | string,
  isCorrect: boolean,
  mode: 'blitz' | 'smart' | 'cbt' | 'diagnostic',
  topic?: string,
  elapsedSeconds?: number
): UserRealProgress {
  return recordStudyActivity({
    subject,
    topic,
    isCorrect,
    mode,
    elapsedSeconds,
  });
}

/**
 * Legacy-compatible level completion recorder (updated to respect limited Assistance Diamond cap).
 */
export function recordLevelCompletion(
  mode: 'blitz' | 'smart',
  levelId: number,
  starsEarned: number,
  levelResult?: {
    subject: SubjectName | string;
    correctCount: number;
    totalQuestions: number;
    isGeneralTest?: boolean;
  }
): UserRealProgress {
  const current = getRealUserProgress();
  const today = getTodayIsoDate();
  const { streakDays, longestStreak } = computeNextStreak(current, today);

  const isFlawless =
    levelResult !== undefined &&
    levelResult.totalQuestions > 0 &&
    levelResult.correctCount === levelResult.totalQuestions;

  const updatedSubjectStats = { ...current.subjectStats };
  if (levelResult?.subject) {
    const subj = String(levelResult.subject);
    const prevSub = updatedSubjectStats[subj] || {
      solved: 0,
      correct: 0,
      levelsAttempted: 0,
      flawlessLevels: 0,
      rating: 0,
    };
    const nextSolved = prevSub.solved + (levelResult.totalQuestions || 0);
    const nextCorrect = prevSub.correct + (levelResult.correctCount || 0);
    const realRating = nextSolved > 0 ? Math.round((nextCorrect / nextSolved) * 100) : 0;

    updatedSubjectStats[subj] = {
      ...prevSub,
      solved: nextSolved,
      correct: nextCorrect,
      levelsAttempted: (prevSub.levelsAttempted || 0) + 1,
      flawlessLevels: (prevSub.flawlessLevels || 0) + (isFlawless ? 1 : 0),
      rating: realRating,
    };
  }

  const completionXp = isFlawless ? 30 : 15;
  const prevDaily = current.dailyActivityLog[today] || {
    date: today,
    questionsPracticed: 0,
    correctCount: 0,
    levelsAttempted: 0,
    flawlessLevelsCleared: 0,
    subjectsPracticed: [],
    xpEarned: 0,
    studySeconds: 0,
  };

  const updatedDailyLog = {
    ...current.dailyActivityLog,
    [today]: {
      ...prevDaily,
      levelsAttempted: prevDaily.levelsAttempted + 1,
      flawlessLevelsCleared: prevDaily.flawlessLevelsCleared + (isFlawless ? 1 : 0),
      xpEarned: (prevDaily.xpEarned || 0) + completionXp,
    },
  };

  const baseDraft: UserRealProgress = {
    ...current,
    streakDays,
    longestStreak,
    lastActiveDate: today,
    totalXp: current.totalXp + completionXp,
    dailyXp: (current.dailyXpDate === today ? current.dailyXp : 0) + completionXp,
    dailyXpDate: today,
    subjectStats: updatedSubjectStats,
    dailyActivityLog: updatedDailyLog,
  };

  if (mode === 'blitz') {
    const prevStars = current.blitzStarsByLevel[levelId] || 0;
    const passedGeneral =
      current.blitzSet1GeneralTestPassed ||
      Boolean(
        levelResult?.isGeneralTest &&
          levelResult.correctCount / Math.max(1, levelResult.totalQuestions) >= 0.7
      );
    return saveRealUserProgress(
      applyXpToLimitedDiamonds(
        {
          ...baseDraft,
          blitzUnlockedLevel: Math.max(current.blitzUnlockedLevel, levelId + 1),
          blitzStarsByLevel: {
            ...current.blitzStarsByLevel,
            [levelId]: Math.max(prevStars, starsEarned),
          },
          blitzSet1GeneralTestPassed: passedGeneral,
        },
        today
      )
    );
  }

  const prevStars = current.smartStarsByLevel[levelId] || 0;
  const passedGeneral =
    current.smartSet1GeneralTestPassed ||
    Boolean(
      levelResult?.isGeneralTest &&
        levelResult.correctCount / Math.max(1, levelResult.totalQuestions) >= 0.7
    );
  return saveRealUserProgress(
    applyXpToLimitedDiamonds(
      {
        ...baseDraft,
        dailySmartLevelsCleared: current.dailySmartLevelsCleared + 1,
        smartUnlockedLevel: Math.max(current.smartUnlockedLevel, levelId + 1),
        smartStarsByLevel: {
          ...current.smartStarsByLevel,
          [levelId]: Math.max(prevStars, starsEarned),
        },
        smartSet1GeneralTestPassed: passedGeneral,
      },
      today
    )
  );
}
