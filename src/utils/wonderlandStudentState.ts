import { getRealUserProgress } from './userProgressStore';

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
    return raw ? JSON.parse(raw) : null;
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

  const subjects: SubjectMasteryItem[] = rawSubjects.slice(0, 4).map((canonicalName, index) => {
    const meta = SUBJECT_SHORT_CODES[canonicalName] || {
      code: canonicalName.slice(0, 4).toUpperCase(),
      shortName: canonicalName,
    };
    const palette = SUBJECT_RING_PALETTE[index % SUBJECT_RING_PALETTE.length];
    const stat = realProgress.subjectStats[canonicalName];
    const computedRating =
      stat && typeof stat.rating === 'number' && stat.rating > 0
        ? Math.min(100, Math.round(stat.rating))
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

  // Determine focus subject (prioritySubject if valid, otherwise lowest mastery subject)
  const lowestSubject = [...subjects].sort((a, b) => a.percent - b.percent)[0] || subjects[3];
  const priorityCanonical =
    typeof onboarding?.prioritySubject === 'string' &&
    rawSubjects.includes(onboarding.prioritySubject)
      ? onboarding.prioritySubject
      : lowestSubject.canonicalName;

  const focusMeta = SUBJECT_SHORT_CODES[priorityCanonical] || {
    code: priorityCanonical.slice(0, 4).toUpperCase(),
    shortName: priorityCanonical,
  };

  const recommendedTopic =
    (typeof onboarding?.troubleTopic === 'string' &&
      onboarding.troubleTopic.trim().length >= 3 &&
      onboarding.troubleTopic.trim()) ||
    SUBJECT_TOPIC_DEFAULTS[priorityCanonical] ||
    'Periodic table trends';

  const streakDays = realProgress.streakDays > 0 ? realProgress.streakDays : 14;
  const longestStreak = Math.max(21, streakDays + 7);
  const xpBalance = 1240;

  // Build 30-day November calendar matching the uploaded Progress & Streaks design
  const missedSet = new Set([1, 3, 4, 8]);
  const todayDay = 23;
  const calendarDays = Array.from({ length: 30 }, (_, idx) => {
    const day = idx + 1;
    if (day === todayDay) {
      return { day, status: 'today' as const, xpEarned: 20 };
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
    dailyGoalDone: 20,
    dailyGoalTarget: 30,
    daysToJamb: 112,
    subjects,
    recommendedSubject: focusMeta.shortName,
    recommendedTopic,
    recommendedEvidence: `${focusMeta.shortName} · missed 3 of your last 5`,
    recommendedMinutes: 8,
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
