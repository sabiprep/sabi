import type { SubjectName } from '../types';
import { supabase } from '../lib/supabase';

export interface SubjectProgressStat {
  solved: number;
  correct: number;
  levelsAttempted?: number;
  flawlessLevels?: number;
  /**
   * Official Subject Rating (0 - 100%).
   * Strictly increases ONLY when a candidate completes a level 100% right
   * without failing any question in that level.
   */
  rating?: number;
}

export interface DailyActivityEntry {
  date: string; // YYYY-MM-DD
  questionsPracticed: number;
  correctCount: number;
  levelsAttempted: number;
  flawlessLevelsCleared: number;
  subjectsPracticed: string[];
}

export interface DiamondSectionBreakdown {
  blitzUnlock: number;       // 1,500 💎 allocation when ₦10,000 pass is unlocked
  smartRoadUnlock: number;   // 1,500 💎 allocation
  cbtSimulators: number;     // 1,000 💎 allocation
  aiVerifications: number;   // 1,000 💎 allocation
}

export interface UserRealProgress {
  /**
   * Total available diamonds (streakBonusDiamonds + mainDiamonds).
   * Always starts at 0 — never fake pre-populated diamonds.
   */
  diamonds: number;
  /**
   * Main purchased diamonds from the ₦10,000 One-Time Pass (5,000 💎 total).
   * Starts at 0 until subscribed.
   */
  mainDiamonds: number;
  /**
   * Duolingo-style free Bonus Diamonds earned by serious candidates maintaining a daily streak.
   * Always consumed FIRST before `mainDiamonds` is touched!
   */
  streakBonusDiamonds: number;
  diamondSections: DiamondSectionBreakdown;
  subscriptionPlan: 'free' | 'scholar_pass' | 'citadel_pro';
  streakDays: number;
  lastActiveDate: string | null;
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
  dailyActivityLog: Record<string, DailyActivityEntry>;
}

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
  lastActiveDate: null,
  dailyBlitzSolved: 0,
  dailySmartLevelsCleared: 0,
  dailyDiagnosticsCompleted: 0,
  blitzUnlockedLevel: 1,
  blitzStarsByLevel: {},
  blitzSet1GeneralTestPassed: false,
  smartUnlockedLevel: 1,
  smartStarsByLevel: {},
  smartSet1GeneralTestPassed: false,
  subjectStats: {
    'English Language': { solved: 0, correct: 0, levelsAttempted: 0, flawlessLevels: 0, rating: 0 },
    Mathematics: { solved: 0, correct: 0, levelsAttempted: 0, flawlessLevels: 0, rating: 0 },
    Physics: { solved: 0, correct: 0, levelsAttempted: 0, flawlessLevels: 0, rating: 0 },
    Chemistry: { solved: 0, correct: 0, levelsAttempted: 0, flawlessLevels: 0, rating: 0 },
  },
  dailyActivityLog: {},
};

function getTodayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getRealUserProgress(): UserRealProgress {
  if (typeof window === 'undefined') return DEFAULT_PROGRESS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<UserRealProgress>;
    const today = getTodayIsoDate();
    const isSameDay = parsed.lastActiveDate === today;

    const mainDiamonds =
      typeof parsed.mainDiamonds === 'number' && parsed.mainDiamonds >= 0
        ? parsed.mainDiamonds
        : 0;
    const streakBonusDiamonds =
      typeof parsed.streakBonusDiamonds === 'number' && parsed.streakBonusDiamonds >= 0
        ? parsed.streakBonusDiamonds
        : 0;
    const totalDiamonds = mainDiamonds + streakBonusDiamonds;

    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      mainDiamonds,
      streakBonusDiamonds,
      diamonds: totalDiamonds,
      diamondSections: {
        ...DEFAULT_SECTIONS,
        ...(parsed.diamondSections || {}),
      },
      dailyBlitzSolved: isSameDay ? (parsed.dailyBlitzSolved || 0) : 0,
      dailySmartLevelsCleared: isSameDay ? (parsed.dailySmartLevelsCleared || 0) : 0,
      dailyDiagnosticsCompleted: isSameDay ? (parsed.dailyDiagnosticsCompleted || 0) : 0,
      subjectStats: {
        ...DEFAULT_PROGRESS.subjectStats,
        ...(parsed.subjectStats || {}),
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
  };

  if (typeof window === 'undefined') return normalized;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    window.dispatchEvent(new Event('sabi-progress-updated'));

    const email = localStorage.getItem('sabi_user_email');
    if (email) {
      const normalizedEmail = email.trim().toLowerCase();
      fetch('/api/profile/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, progress: normalized }),
      }).catch(() => {});

      // Also sync directly to Supabase public.profiles when configured (for Android APK & Vercel)
      if (supabase) {
        (async () => {
          const { data: existing } = await supabase
            .from('profiles')
            .select('onboarding_answers')
            .eq('email', normalizedEmail)
            .maybeSingle();
          const mergedAnswers = {
            ...(existing?.onboarding_answers || {}),
            live_progress: normalized,
          };
          await supabase
            .from('profiles')
            .update({
              onboarding_answers: mergedAnswers,
              updated_at: new Date().toISOString(),
            })
            .eq('email', normalizedEmail);
        })().catch(() => {});
      }
    }
  } catch {
    // ignore storage errors
  }
  return normalized;
}

/**
 * Consumes diamonds by ALWAYS deducting from `streakBonusDiamonds` first
 * before touching the user's `mainDiamonds` (5,000 💎 subscription vault).
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

export function recordQuestionAttempt(
  subject: SubjectName | string,
  isCorrect: boolean,
  mode: 'blitz' | 'smart' | 'cbt' | 'diagnostic'
): UserRealProgress {
  const current = getRealUserProgress();
  const today = getTodayIsoDate();

  let streakDays = current.streakDays;
  let streakBonusDiamonds = current.streakBonusDiamonds;

  // When a user logs their first practice on a new day, their daily streak advances.
  // Serious users on an active streak (>= 2 days) earn free Streak Bonus Diamonds (+15 💎)
  // that are used FIRST before their main diamonds!
  if (current.lastActiveDate !== today) {
    streakDays = current.streakDays + 1;
    if (streakDays >= 2) {
      streakBonusDiamonds += 15;
    }
  }

  const prevSub = current.subjectStats[subject] || {
    solved: 0,
    correct: 0,
    levelsAttempted: 0,
    flawlessLevels: 0,
    rating: 0,
  };
  const updatedSub: SubjectProgressStat = {
    ...prevSub,
    solved: prevSub.solved + 1,
    correct: prevSub.correct + (isCorrect ? 1 : 0),
  };

  const prevDaily = current.dailyActivityLog[today] || {
    date: today,
    questionsPracticed: 0,
    correctCount: 0,
    levelsAttempted: 0,
    flawlessLevelsCleared: 0,
    subjectsPracticed: [],
  };

  const updatedSubjectsPracticed = Array.from(
    new Set([...(prevDaily.subjectsPracticed || []), String(subject)])
  );

  const next: UserRealProgress = {
    ...current,
    streakDays,
    streakBonusDiamonds,
    lastActiveDate: today,
    dailyBlitzSolved: mode === 'blitz' ? current.dailyBlitzSolved + 1 : current.dailyBlitzSolved,
    subjectStats: {
      ...current.subjectStats,
      [subject]: updatedSub,
    },
    dailyActivityLog: {
      ...current.dailyActivityLog,
      [today]: {
        ...prevDaily,
        questionsPracticed: prevDaily.questionsPracticed + 1,
        correctCount: prevDaily.correctCount + (isCorrect ? 1 : 0),
        subjectsPracticed: updatedSubjectsPracticed,
      },
    },
  };

  return saveRealUserProgress(next);
}

/**
 * Records completion of a Blitz or Smart level.
 * STRICT SUBJECT RATING RULE:
 * A user's Subject Rating (%) ONLY increases when they complete a level 100% right
 * without failing any question in that level (`correctCount === totalQuestions && totalQuestions > 0`).
 * Every level attempt is still logged in daily activities and `levelsAttempted`.
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
  const streakDays =
    current.lastActiveDate === today ? Math.max(1, current.streakDays) : current.streakDays + 1;

  const isFlawless =
    levelResult !== undefined &&
    levelResult.totalQuestions > 0 &&
    levelResult.correctCount === levelResult.totalQuestions;

  // Update Subject Rating ONLY if 100% Flawless
  const updatedSubjectStats = { ...current.subjectStats };
  if (levelResult?.subject) {
    const subj = levelResult.subject;
    const prevSub = updatedSubjectStats[subj] || {
      solved: 0,
      correct: 0,
      levelsAttempted: 0,
      flawlessLevels: 0,
      rating: 0,
    };
    const nextLevelsAttempted = (prevSub.levelsAttempted || 0) + 1;
    const nextFlawlessLevels = (prevSub.flawlessLevels || 0) + (isFlawless ? 1 : 0);
    // Strict Flawless Rating: Each 100% flawless level adds +10% to Subject Rating (up to 100%).
    // Non-flawless levels add 0% to Subject Rating!
    const currentRating = prevSub.rating || 0;
    const nextRating = isFlawless ? Math.min(100, currentRating + 10) : currentRating;

    updatedSubjectStats[subj] = {
      ...prevSub,
      levelsAttempted: nextLevelsAttempted,
      flawlessLevels: nextFlawlessLevels,
      rating: nextRating,
    };
  }

  // Serious streak users clearing a 100% flawless level earn +10 Streak Bonus Diamonds
  let streakBonusDiamonds = current.streakBonusDiamonds;
  if (isFlawless && streakDays >= 1) {
    streakBonusDiamonds += 10;
  }

  const prevDaily = current.dailyActivityLog[today] || {
    date: today,
    questionsPracticed: 0,
    correctCount: 0,
    levelsAttempted: 0,
    flawlessLevelsCleared: 0,
    subjectsPracticed: [],
  };

  const updatedDailyLog = {
    ...current.dailyActivityLog,
    [today]: {
      ...prevDaily,
      levelsAttempted: prevDaily.levelsAttempted + 1,
      flawlessLevelsCleared: prevDaily.flawlessLevelsCleared + (isFlawless ? 1 : 0),
    },
  };

  if (mode === 'blitz') {
    const prevStars = current.blitzStarsByLevel[levelId] || 0;
    const passedGeneral =
      current.blitzSet1GeneralTestPassed ||
      Boolean(levelResult?.isGeneralTest && levelResult.correctCount / Math.max(1, levelResult.totalQuestions) >= 0.7);
    return saveRealUserProgress({
      ...current,
      streakDays,
      streakBonusDiamonds,
      lastActiveDate: today,
      blitzUnlockedLevel: Math.max(current.blitzUnlockedLevel, levelId + 1),
      blitzStarsByLevel: {
        ...current.blitzStarsByLevel,
        [levelId]: Math.max(prevStars, starsEarned),
      },
      blitzSet1GeneralTestPassed: passedGeneral,
      subjectStats: updatedSubjectStats,
      dailyActivityLog: updatedDailyLog,
    });
  } else {
    const prevStars = current.smartStarsByLevel[levelId] || 0;
    const passedGeneral =
      current.smartSet1GeneralTestPassed ||
      Boolean(levelResult?.isGeneralTest && levelResult.correctCount / Math.max(1, levelResult.totalQuestions) >= 0.7);
    return saveRealUserProgress({
      ...current,
      streakDays,
      streakBonusDiamonds,
      lastActiveDate: today,
      dailySmartLevelsCleared: current.dailySmartLevelsCleared + 1,
      smartUnlockedLevel: Math.max(current.smartUnlockedLevel, levelId + 1),
      smartStarsByLevel: {
        ...current.smartStarsByLevel,
        [levelId]: Math.max(prevStars, starsEarned),
      },
      smartSet1GeneralTestPassed: passedGeneral,
      subjectStats: updatedSubjectStats,
      dailyActivityLog: updatedDailyLog,
    });
  }
}
