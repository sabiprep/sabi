import { getRealUserProgress } from './userProgressStore';
import { loadPracticeAiConfig } from './sabiAiPracticeConfig';
import { loadDiagnosticBaseline } from './cbtAndCustomEngine';

export interface SubjectMasteryItem {
  canonicalName: string;
  shortCode: string;
  displayLabel: string;
  percent: number;
  ringColor: string;
  textColor: string;
}

export interface LeagueRow {
  rank: number;
  name: string;
  initial: string;
  avatarBg: string;
  xp: number;
  isCurrentUser?: boolean;
}

export interface WonderlandDashboardState {
  firstName: string;
  fullName: string;
  level: number;
  streakDays: number;
  longestStreak: number;
  xpBalance: number;
  dailyGoalDone: number;
  dailyGoalTarget: number;
  daysToJamb: number;
  subjects: SubjectMasteryItem[];
  recommendedSubject: string;
  recommendedTopic: string;
  recommendedEvidence: string;
  recommendedMinutes: number;
  weeklyDays: { label: string; status: 'done' | 'today' | 'upcoming' }[];
  calendarMonth: string;
  calendarDays: {
    day: number;
    status: 'practised' | 'today' | 'missed' | 'upcoming';
    xpEarned?: number;
  }[];
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

const DEFAULT_SAMPLE_PERCENTS = [72, 64, 58, 41];

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

export function getWonderlandDashboardState(): WonderlandDashboardState {
  const onboarding = readStoredOnboarding();
  const realProgress = getRealUserProgress();

  const rawFullName =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) ||
    onboarding?.fullName ||
    'Ada';
  const cleanedFullName =
    rawFullName && rawFullName.trim() && rawFullName.trim().toLowerCase() !== 'candidate'
      ? rawFullName.trim()
      : 'Ada';
  const firstName = cleanedFullName.split(/\s+/)[0] || 'Ada';

  const rawSubjects: string[] =
    Array.isArray(onboarding?.chosenSubjects) && onboarding.chosenSubjects.length === 4
      ? onboarding.chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

  const diagnosticBaseline = loadDiagnosticBaseline();

  const subjects: SubjectMasteryItem[] = rawSubjects.slice(0, 4).map((canonicalName, index) => {
    const meta = SUBJECT_SHORT_CODES[canonicalName] || {
      code: canonicalName.slice(0, 4).toUpperCase(),
      shortName: canonicalName,
    };
    const palette = SUBJECT_RING_PALETTE[index % SUBJECT_RING_PALETTE.length];
    const stat = realProgress.subjectStats[canonicalName];
    const diagPct = diagnosticBaseline?.subjectMastery?.[canonicalName];
    const computedRating =
      stat && typeof stat.rating === 'number' && stat.rating > 0
        ? Math.min(100, Math.round(stat.rating))
        : typeof diagPct === 'number'
        ? Math.min(100, Math.round(diagPct))
        : DEFAULT_SAMPLE_PERCENTS[index] ?? 50;

    return {
      canonicalName,
      shortCode: meta.code,
      displayLabel: meta.shortName,
      percent: computedRating,
      ringColor: palette.ringColor,
      textColor: palette.textColor,
    };
  });

  // Determine focus subject (AI Practice Studio blueprint takes highest priority, then onboarding priority, then lowest mastery)
  const aiConfig = loadPracticeAiConfig(rawSubjects);
  const activeBlueprint = aiConfig.blueprint;

  const lowestSubject = [...subjects].sort((a, b) => a.percent - b.percent)[0] || subjects[3];
  const priorityCanonical =
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
    (activeBlueprint?.recommendedTopic && activeBlueprint.recommendedTopic.trim()) ||
    (typeof onboarding?.troubleTopic === 'string' &&
      onboarding.troubleTopic.trim().length >= 3 &&
      onboarding.troubleTopic.trim()) ||
    SUBJECT_TOPIC_DEFAULTS[priorityCanonical] ||
    'Periodic table trends';

  const streakDays = realProgress.streakDays > 0 ? realProgress.streakDays : 14;
  const longestStreak = Math.max(21, streakDays + 7);
  const earnedBonusXp =
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('sabi_wonderland_earned_xp_v1') || '0') || 0
      : 0;
  const earnedDailyXp =
    typeof window !== 'undefined'
      ? Number(localStorage.getItem('sabi_wonderland_daily_xp_v1') || '0') || 0
      : 0;
  const xpBalance = 1240 + earnedBonusXp;
  const dailyGoalTarget = activeBlueprint?.dailyXpGoal || 30;
  const dailyGoalDone = Math.min(dailyGoalTarget, 20 + earnedDailyXp);

  // Build 30-day November calendar matching the uploaded Progress & Streaks design
  const missedSet = new Set([1, 3, 4, 8]);
  const todayDay = 23;
  const calendarDays = Array.from({ length: 30 }, (_, idx) => {
    const day = idx + 1;
    if (day === todayDay) {
      return { day, status: 'today' as const, xpEarned: dailyGoalDone };
    }
    if (day > todayDay) {
      return { day, status: 'upcoming' as const };
    }
    if (missedSet.has(day)) {
      return { day, status: 'missed' as const };
    }
    return { day, status: 'practised' as const, xpEarned: 30 + ((day * 7) % 35) };
  });

  const userInitial = firstName.charAt(0).toUpperCase() || 'A';

  return {
    firstName,
    fullName: cleanedFullName,
    level: 7,
    streakDays,
    longestStreak,
    xpBalance,
    dailyGoalDone,
    dailyGoalTarget,
    daysToJamb: 112,
    subjects,
    recommendedSubject: focusMeta.shortName,
    recommendedTopic,
    recommendedEvidence: activeBlueprint
      ? `${focusMeta.shortName} · structured by SABI AI`
      : `${focusMeta.shortName} · missed 3 of your last 5`,
    recommendedMinutes: activeBlueprint?.recommendedMinutes || 8,
    weeklyDays: [
      { label: 'M', status: 'done' },
      { label: 'T', status: 'done' },
      { label: 'W', status: 'done' },
      { label: 'T', status: 'done' },
      { label: 'F', status: 'done' },
      { label: 'S', status: 'today' },
      { label: 'S', status: 'upcoming' },
    ],
    calendarMonth: 'November',
    calendarDays,
    leagueName: 'Gold League',
    leagueMeta: '3 days left · top 5 move up',
    leagueRows: [
      { rank: 1, name: 'Chidi', initial: 'C', avatarBg: '#05A85C', xp: 1480 },
      { rank: 2, name: 'Fatima', initial: 'F', avatarBg: '#FF7A00', xp: 1395 },
      { rank: 3, name: 'Emeka', initial: 'E', avatarBg: '#2563EB', xp: 1310 },
      {
        rank: 4,
        name: `${firstName} (You)`,
        initial: userInitial,
        avatarBg: '#711AE3',
        xp: xpBalance,
        isCurrentUser: true,
      },
      { rank: 5, name: 'Tunde', initial: 'T', avatarBg: '#0D9488', xp: 1185 },
      { rank: 6, name: 'Zainab', initial: 'Z', avatarBg: '#E11D48', xp: 1110 },
    ],
  };
}
