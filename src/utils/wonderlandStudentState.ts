import {
  DAILY_ASSISTANCE_DIAMOND_CAP,
  XP_PER_ASSISTANCE_DIAMOND,
  getEconomySnapshot,
  getRealUserProgress,
  getTodayIsoDate,
} from './userProgressStore';
import { loadPracticeAiConfig } from './sabiAiPracticeConfig';
import {
  getDailyFailureDrillPlan,
  loadDiagnosticBaseline,
} from './dailyFailurePlan';

export interface SubjectMasteryItem {
  canonicalName: string;
  shortCode: string;
  displayLabel: string;
  percent: number;
  attempts: number;
  correct: number;
  hasRealData: boolean;
  ringColor: string;
  textColor: string;
}

export type LeagueTierId = 'unranked' | 'blue' | 'silver' | 'gold';

export interface LeagueRow {
  rank: number;
  name: string;
  initial: string;
  avatarBg: string;
  xp: number;
  isCurrentUser?: boolean;
  zone?: 'promote' | 'safe' | 'demote';
}

export interface WonderlandDashboardState {
  firstName: string;
  fullName: string;
  level: number;
  streakDays: number;
  longestStreak: number;
  practicedToday: boolean;
  xpBalance: number;
  diamondsBalance: number;
  subscriptionDiamonds: number;
  assistanceDiamonds: number;
  xpPerAssistanceDiamond: number;
  xpTowardNextDiamond: number;
  dailyAssistanceDiamondsEarned: number;
  dailyAssistanceDiamondCap: number;
  dailyStudyMinutes: number;
  totalQuestionsSolved: number;
  dailyGoalDone: number;
  dailyGoalTarget: number;
  daysToJamb: number;
  subjects: SubjectMasteryItem[];
  recommendedSubject: string;
  recommendedSubjectCanonical: string;
  recommendedTopic: string;
  recommendedEvidence: string;
  recommendedMinutes: number;
  dailyDrillIsFailureDriven: boolean;
  dailyDrillMissedCount: number;
  dailyDrillWeakTopicsCount: number;
  weeklyDays: { label: string; status: 'done' | 'today' | 'upcoming' }[];
  calendarMonth: string;
  calendarTodayDay: number;
  calendarDays: {
    day: number;
    status: 'practised' | 'today' | 'missed' | 'upcoming';
    xpEarned?: number;
  }[];
  leagueTier: LeagueTierId;
  leagueName: string;
  leagueMeta: string;
  leagueRows: LeagueRow[];
}

const SUBJECT_SHORT_CODES: Record<string, { code: string; shortName: string }> = {
  'English Language': { code: 'ENG', shortName: 'English' },
  Mathematics: { code: 'MATH', shortName: 'Mathematics' },
  Physics: { code: 'PHY', shortName: 'Physics' },
  Chemistry: { code: 'CHM', shortName: 'Chemistry' },
  Biology: { code: 'BIO', shortName: 'Biology' },
  Economics: { code: 'ECON', shortName: 'Economics' },
  Government: { code: 'GOVT', shortName: 'Government' },
  'Literature-in-English': { code: 'LIT', shortName: 'Literature' },
  Commerce: { code: 'COMM', shortName: 'Commerce' },
  Geography: { code: 'GEO', shortName: 'Geography' },
  'Agricultural Science': { code: 'AGRI', shortName: 'Agric Science' },
  'Christian Religious Studies': { code: 'CRS', shortName: 'CRS' },
  'Islamic Religious Studies': { code: 'IRS', shortName: 'IRS' },
  'Financial Accounting': { code: 'ACCT', shortName: 'Accounting' },
};

const SUBJECT_RING_PALETTE = [
  { ringColor: '#711AE3', textColor: '#6C19E5' }, // Purple (ENG)
  { ringColor: '#2563EB', textColor: '#1D4ED8' }, // Blue (MATH)
  { ringColor: '#059669', textColor: '#047857' }, // Emerald (PHY)
  { ringColor: '#EA580C', textColor: '#C2410C' }, // Orange (CHM)
];

const SUBJECT_TOPIC_DEFAULTS: Record<string, string> = {
  Chemistry: 'Periodic table trends',
  Physics: 'Projectile motion & vectors',
  Mathematics: 'Quadratic equations & roots',
  'English Language': 'Oral stress & concord',
  Biology: 'Genetics & variation',
  Economics: 'Elasticity of demand',
  Government: 'Nigerian federalism',
  'Literature-in-English': 'Literary devices & prose',
  Commerce: 'Money & banking systems',
  Geography: 'Map reading & climate',
  'Agricultural Science': 'Soil fertility & crops',
  'Christian Religious Studies': 'Synoptic Gospels',
  'Islamic Religious Studies': 'Hadith & Fiqh',
  'Financial Accounting': 'Control accounts',
};

function readStoredOnboarding(): Record<string, any> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem('sabi_onboarding_v3_answers') ||
      localStorage.getItem('sabi_onboarding_wonderland_v3_draft') ||
      localStorage.getItem('sabi_onboarding_v2_answers');
    const base = raw ? JSON.parse(raw) : {};
    const profileRaw = localStorage.getItem('sabi_onboarding_profile_v1');
    const profileOverride = profileRaw ? JSON.parse(profileRaw) : {};
    return { ...base, ...profileOverride };
  } catch {
    return null;
  }
}

function computeDaysToNextJamb(): number {
  const now = new Date();
  const year = now.getFullYear();
  // JAMB UTME sitting window is typically late April (April 20)
  let target = new Date(year, 3, 20);
  if (target.getTime() <= now.getTime()) {
    target = new Date(year + 1, 3, 20);
  }
  const diffMs = target.getTime() - now.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function resolveLeagueTier(xpBalance: number, totalQuestionsSolved: number): LeagueTierId {
  if (xpBalance <= 0 && totalQuestionsSolved <= 0) return 'unranked';
  if (xpBalance >= 1200) return 'gold';
  if (xpBalance >= 450) return 'silver';
  return 'blue';
}

function parseIsoDateUtc(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y || 2026, (m || 1) - 1, d || 1));
}

function formatUtcIsoDate(dt: Date): string {
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const d = String(dt.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildCurrentWeekDays(
  dailyActivityLog: Record<string, { questionsPracticed?: number; xpEarned?: number }>,
  todayIso: string
): { label: string; status: 'done' | 'today' | 'upcoming' }[] {
  const labels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const anchor = parseIsoDateUtc(todayIso);
  const jsDay = anchor.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay;

  return labels.map((label, idx) => {
    const d = new Date(anchor.getTime());
    d.setUTCDate(anchor.getUTCDate() + mondayOffset + idx);
    const iso = formatUtcIsoDate(d);
    const entry = dailyActivityLog[iso];
    const hasActivity = Boolean(entry && ((entry.questionsPracticed || 0) > 0 || (entry.xpEarned || 0) > 0));

    if (hasActivity) return { label, status: 'done' as const };
    if (iso === todayIso) return { label, status: 'today' as const };
    return { label, status: 'upcoming' as const };
  });
}

function buildCurrentMonthCalendar(
  dailyActivityLog: Record<string, { questionsPracticed?: number; xpEarned?: number }>,
  dailyGoalDone: number,
  todayIso: string
): {
  monthLabel: string;
  todayDay: number;
  days: { day: number; status: 'practised' | 'today' | 'missed' | 'upcoming'; xpEarned?: number }[];
} {
  const anchor = parseIsoDateUtc(todayIso);
  const year = anchor.getUTCFullYear();
  const monthIdx = anchor.getUTCMonth();
  const todayDay = anchor.getUTCDate();
  const daysInMonth = new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();
  const monthLabel = anchor.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });

  const days = Array.from({ length: daysInMonth }, (_, idx) => {
    const day = idx + 1;
    const iso = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const entry = dailyActivityLog[iso];
    const xp = entry?.xpEarned || 0;
    const practised = Boolean(entry && ((entry.questionsPracticed || 0) > 0 || xp > 0));

    if (day === todayDay) {
      return { day, status: 'today' as const, xpEarned: dailyGoalDone };
    }
    if (day > todayDay) {
      return { day, status: 'upcoming' as const };
    }
    if (practised) {
      return { day, status: 'practised' as const, xpEarned: xp };
    }
    return { day, status: 'missed' as const };
  });

  return { monthLabel, todayDay, days };
}

export function getWonderlandDashboardState(): WonderlandDashboardState {
  const onboarding = readStoredOnboarding();
  const realProgress = getRealUserProgress();
  const economy = getEconomySnapshot();
  const todayIso = getTodayIsoDate();

  const rawFullName =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) ||
    onboarding?.fullName ||
    'Scholar';
  const cleanedFullName =
    rawFullName && rawFullName.trim() && rawFullName.trim().toLowerCase() !== 'candidate'
      ? rawFullName.trim()
      : 'Scholar';
  const firstName = cleanedFullName.split(/\s+/)[0] || 'Scholar';

  const rawSubjects: string[] =
    Array.isArray(onboarding?.chosenSubjects) && onboarding.chosenSubjects.length === 4
      ? onboarding.chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

  const diagnosticBaseline = loadDiagnosticBaseline();

  // Strictly real Mastery Estimates — starts at 0% until real answers or diagnostic results exist.
  const subjects: SubjectMasteryItem[] = rawSubjects.slice(0, 4).map((canonicalName, index) => {
    const meta = SUBJECT_SHORT_CODES[canonicalName] || {
      code: canonicalName.slice(0, 4).toUpperCase(),
      shortName: canonicalName,
    };
    const palette = SUBJECT_RING_PALETTE[index % SUBJECT_RING_PALETTE.length];
    const stat = realProgress.subjectStats[canonicalName];
    const diagPct = diagnosticBaseline?.subjectMastery?.[canonicalName];
    const solved = stat?.solved || 0;
    const correct = stat?.correct || 0;

    let percent = 0;
    let hasRealData = false;
    if (solved > 0) {
      percent = Math.min(100, Math.round((correct / solved) * 100));
      hasRealData = true;
    } else if (typeof diagPct === 'number') {
      percent = Math.min(100, Math.round(diagPct));
      hasRealData = true;
    }

    return {
      canonicalName,
      shortCode: meta.code,
      displayLabel: meta.shortName,
      percent,
      attempts: solved,
      correct,
      hasRealData,
      ringColor: palette.ringColor,
      textColor: palette.textColor,
    };
  });

  const totalQuestionsSolved = Object.values(realProgress.subjectStats).reduce(
    (sum, s) => sum + (s?.solved || 0),
    0
  );

  // Determine daily prepared focus: Real Failure-Driven Drill -> AI Practice Studio blueprint -> Onboarding priority
  const aiConfig = loadPracticeAiConfig(rawSubjects);
  const activeBlueprint = aiConfig.blueprint;
  const failurePlan = getDailyFailureDrillPlan(rawSubjects);

  const lowestSubject = [...subjects].sort((a, b) => a.percent - b.percent)[0] || subjects[0];
  const priorityCanonical =
    (failurePlan.isFailureDriven && failurePlan.subjectCanonical) ||
    (activeBlueprint?.recommendedSubjectCanonical &&
      rawSubjects.includes(activeBlueprint.recommendedSubjectCanonical) &&
      activeBlueprint.recommendedSubjectCanonical) ||
    (typeof onboarding?.prioritySubject === 'string' &&
      rawSubjects.includes(onboarding.prioritySubject) &&
      onboarding.prioritySubject) ||
    lowestSubject.canonicalName;

  const focusMeta = SUBJECT_SHORT_CODES[priorityCanonical] || {
    code: priorityCanonical.slice(0, 4).toUpperCase(),
    shortName: priorityCanonical,
  };

  const recommendedTopic =
    (failurePlan.isFailureDriven && failurePlan.topicLabel) ||
    (activeBlueprint?.recommendedTopic && activeBlueprint.recommendedTopic.trim()) ||
    (typeof onboarding?.troubleTopic === 'string' &&
      onboarding.troubleTopic.trim().length >= 3 &&
      onboarding.troubleTopic.trim()) ||
    SUBJECT_TOPIC_DEFAULTS[priorityCanonical] ||
    'Periodic table trends';

  const recommendedEvidence = failurePlan.isFailureDriven
    ? failurePlan.evidence
    : activeBlueprint
    ? `${focusMeta.shortName} · structured by SABI AI`
    : failurePlan.evidence;

  // Strictly real streak, XP, level, and daily goal — zero fake defaults
  const streakDays = realProgress.streakDays;
  const longestStreak = realProgress.longestStreak;
  const xpBalance = economy.totalXp;
  const level = Math.max(1, Math.floor(xpBalance / 250) + 1);
  const dailyGoalTarget = activeBlueprint?.dailyXpGoal || 40;
  const dailyGoalDone = Math.min(dailyGoalTarget, economy.dailyXp);
  const practicedToday = realProgress.lastActiveDate === todayIso && economy.dailyXp > 0;

  const weeklyDays = buildCurrentWeekDays(realProgress.dailyActivityLog, todayIso);
  const monthCal = buildCurrentMonthCalendar(
    realProgress.dailyActivityLog,
    dailyGoalDone,
    todayIso
  );
  const leagueTier = resolveLeagueTier(xpBalance, totalQuestionsSolved);
  const userInitial = firstName.charAt(0).toUpperCase() || 'S';

  const leagueTitles: Record<LeagueTierId, { name: string; meta: string }> = {
    unranked: { name: 'No League Yet', meta: 'Complete 1 practice session to enter Blue League' },
    blue: { name: 'Blue League', meta: 'Top 5 promote to Silver League' },
    silver: { name: 'Silver League', meta: 'Top 5 promote to Gold · bottom 3 drop to Blue' },
    gold: { name: 'Gold League', meta: 'Top tier · defend your spot to stay in Gold' },
  };

  const tierSeeds: Record<Exclude<LeagueTierId, 'unranked'>, Omit<LeagueRow, 'rank'>[]> = {
    blue: [
      { name: 'Bola', initial: 'B', avatarBg: '#2563EB', xp: 360 },
      { name: 'Ibrahim', initial: 'I', avatarBg: '#05A85C', xp: 295 },
      { name: 'Chisom', initial: 'C', avatarBg: '#FF7A00', xp: 220 },
      { name: 'Tope', initial: 'T', avatarBg: '#0D9488', xp: 145 },
      { name: 'Hauwa', initial: 'H', avatarBg: '#E11D48', xp: 80 },
    ],
    silver: [
      { name: 'Emeka', initial: 'E', avatarBg: '#2563EB', xp: 1080 },
      { name: 'Fatima', initial: 'F', avatarBg: '#FF7A00', xp: 940 },
      { name: 'Kemi', initial: 'K', avatarBg: '#05A85C', xp: 790 },
      { name: 'Sadiq', initial: 'S', avatarBg: '#0D9488', xp: 610 },
      { name: 'Zainab', initial: 'Z', avatarBg: '#E11D48', xp: 495 },
    ],
    gold: [
      { name: 'Chidi', initial: 'C', avatarBg: '#05A85C', xp: 1840 },
      { name: 'Amina', initial: 'A', avatarBg: '#FF7A00', xp: 1620 },
      { name: 'Damilola', initial: 'D', avatarBg: '#2563EB', xp: 1470 },
      { name: 'Uche', initial: 'U', avatarBg: '#0D9488', xp: 1310 },
      { name: 'Ngozi', initial: 'N', avatarBg: '#E11D48', xp: 1215 },
    ],
  };

  let leagueRows: LeagueRow[] = [];
  if (leagueTier !== 'unranked') {
    const combined: Omit<LeagueRow, 'rank'>[] = [
      ...tierSeeds[leagueTier],
      {
        name: `${firstName} (You)`,
        initial: userInitial,
        avatarBg: '#711AE3',
        xp: xpBalance,
        isCurrentUser: true,
      },
    ].sort((a, b) => b.xp - a.xp);

    leagueRows = combined.map((row, idx) => ({
      ...row,
      rank: idx + 1,
      zone:
        idx < 3 && leagueTier !== 'gold'
          ? 'promote'
          : idx >= combined.length - 2 && leagueTier !== 'blue'
          ? 'demote'
          : 'safe',
    }));
  }

  return {
    firstName,
    fullName: cleanedFullName,
    level,
    streakDays,
    longestStreak,
    practicedToday,
    xpBalance,
    diamondsBalance: economy.totalDiamonds,
    subscriptionDiamonds: economy.subscriptionDiamonds,
    assistanceDiamonds: economy.assistanceDiamonds,
    xpPerAssistanceDiamond: XP_PER_ASSISTANCE_DIAMOND,
    xpTowardNextDiamond: economy.xpTowardNextDiamond,
    dailyAssistanceDiamondsEarned: economy.dailyAssistanceDiamondsEarned,
    dailyAssistanceDiamondCap: DAILY_ASSISTANCE_DIAMOND_CAP,
    dailyStudyMinutes: economy.dailyStudyMinutes,
    totalQuestionsSolved,
    dailyGoalDone,
    dailyGoalTarget,
    daysToJamb: computeDaysToNextJamb(),
    subjects,
    recommendedSubject: focusMeta.shortName,
    recommendedSubjectCanonical: priorityCanonical,
    recommendedTopic,
    recommendedEvidence,
    recommendedMinutes: failurePlan.isFailureDriven
      ? failurePlan.estimatedMinutes
      : activeBlueprint?.recommendedMinutes || 8,
    dailyDrillIsFailureDriven: failurePlan.isFailureDriven,
    dailyDrillMissedCount: failurePlan.missedCount,
    dailyDrillWeakTopicsCount: failurePlan.weakTopicsCount,
    weeklyDays,
    calendarMonth: monthCal.monthLabel,
    calendarTodayDay: monthCal.todayDay,
    calendarDays: monthCal.days,
    leagueTier,
    leagueName: leagueTitles[leagueTier].name,
    leagueMeta: leagueTitles[leagueTier].meta,
    leagueRows,
  };
}
