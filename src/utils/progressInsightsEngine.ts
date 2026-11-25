import { apiFetch } from './apiClient';
import {
  loadDiagnosticBaseline,
  loadMistakesVault,
  type MistakeVaultEntry,
} from './cbtAndCustomEngine';
import { getRealUserProgress } from './userProgressStore';
import {
  getWonderlandDashboardState,
  type LeagueRow,
  type LeagueTierId,
  type SubjectMasteryItem,
} from './wonderlandStudentState';

export type PlacedLeagueTier = 'blue' | 'silver' | 'gold';
export type LeagueMovement = 'entered' | 'promoted' | 'demoted' | 'stayed';

export interface LeagueTierMeta {
  id: PlacedLeagueTier;
  name: string;
  shortLabel: string;
  minXp: number;
  promoteTarget: string | null;
  demoteTarget: string | null;
  tagline: string;
  bannerBg: string;
  bannerShadow: string;
  badgeBg: string;
  badgeText: string;
}

export interface MultiTierLeagueSnapshot {
  currentTier: LeagueTierId;
  previousTier: LeagueTierId;
  movement: LeagueMovement;
  isPlaced: boolean;
  xpBalance: number;
  streakDays: number;
  currentRank: number | null;
  currentZone: 'promote' | 'safe' | 'demote' | null;
  daysLeftInWeek: number;
  xpToNextTier: number;
  nextTierName: string | null;
  tables: Record<PlacedLeagueTier, LeagueRow[]>;
  syncSource: 'local' | 'supabase';
}

export interface TopicInsightRow {
  topicLabel: string;
  solved: number;
  correct: number;
  missed: number;
  accuracy: number;
  status: 'critical' | 'needs-work' | 'strong';
  missedInVault: number;
  lastPracticedAt?: string;
}

export interface SubjectRatingInsight {
  subject: SubjectMasteryItem;
  readinessLabel: 'Not Started' | 'Needs Urgent Focus' | 'Building Momentum' | 'Exam Ready' | 'Distinction Track';
  readinessTone: 'neutral' | 'danger' | 'amber' | 'emerald' | 'purple';
  topics: TopicInsightRow[];
  weakTopics: TopicInsightRow[];
  strongTopics: TopicInsightRow[];
  mistakes: MistakeVaultEntry[];
  aiSummary: string;
  recommendedAction: string;
  primaryWeakTopic: string | null;
}

export interface SubjectRatingsDashboardSnapshot {
  averageMastery: number;
  attemptedSubjectsCount: number;
  totalSolved: number;
  totalCorrect: number;
  totalMissedVault: number;
  weakestSubject: SubjectRatingInsight | null;
  subjects: SubjectRatingInsight[];
}

const LAST_LEAGUE_TIER_KEY = 'sabi_league_last_tier_v1';

export const LEAGUE_TIER_META: Record<PlacedLeagueTier, LeagueTierMeta> = {
  blue: {
    id: 'blue',
    name: 'Blue League',
    shortLabel: 'Blue',
    minXp: 1,
    promoteTarget: 'Silver League',
    demoteTarget: null,
    tagline: 'Entry division — top 5 promote to Silver League.',
    bannerBg: '#2563EB',
    bannerShadow: '#1D4ED8',
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
  },
  silver: {
    id: 'silver',
    name: 'Silver League',
    shortLabel: 'Silver',
    minXp: 450,
    promoteTarget: 'Gold League',
    demoteTarget: 'Blue League',
    tagline: 'Top 5 promote to Gold · bottom 3 drop back to Blue.',
    bannerBg: '#475569',
    bannerShadow: '#334155',
    badgeBg: '#E2E8F0',
    badgeText: '#334155',
  },
  gold: {
    id: 'gold',
    name: 'Gold League',
    shortLabel: 'Gold',
    minXp: 1200,
    promoteTarget: null,
    demoteTarget: 'Silver League',
    tagline: 'Elite JAMB division — stay sharp or risk demotion to Silver.',
    bannerBg: '#D97706',
    bannerShadow: '#92400E',
    badgeBg: '#FEF3C7',
    badgeText: '#92400E',
  },
};

const TIER_COHORT_PEERS: Record<PlacedLeagueTier, Omit<LeagueRow, 'rank'>[]> = {
  blue: [
    { name: 'Bola', initial: 'B', avatarBg: '#2563EB', xp: 410 },
    { name: 'Ibrahim', initial: 'I', avatarBg: '#05A85C', xp: 345 },
    { name: 'Chisom', initial: 'C', avatarBg: '#FF7A00', xp: 290 },
    { name: 'Tope', initial: 'T', avatarBg: '#0D9488', xp: 225 },
    { name: 'Hauwa', initial: 'H', avatarBg: '#E11D48', xp: 170 },
    { name: 'Daniel', initial: 'D', avatarBg: '#7C3AED', xp: 115 },
    { name: 'Rukayat', initial: 'R', avatarBg: '#0284C7', xp: 75 },
    { name: 'Samuel', initial: 'S', avatarBg: '#EA580C', xp: 35 },
  ],
  silver: [
    { name: 'Emeka', initial: 'E', avatarBg: '#2563EB', xp: 1140 },
    { name: 'Fatima', initial: 'F', avatarBg: '#FF7A00', xp: 1020 },
    { name: 'Kemi', initial: 'K', avatarBg: '#05A85C', xp: 910 },
    { name: 'Sadiq', initial: 'S', avatarBg: '#0D9488', xp: 805 },
    { name: 'Zainab', initial: 'Z', avatarBg: '#E11D48', xp: 710 },
    { name: 'Tunde', initial: 'T', avatarBg: '#7C3AED', xp: 605 },
    { name: 'Blessing', initial: 'B', avatarBg: '#0284C7', xp: 525 },
    { name: 'Musa', initial: 'M', avatarBg: '#EA580C', xp: 465 },
  ],
  gold: [
    { name: 'Chidi', initial: 'C', avatarBg: '#05A85C', xp: 2150 },
    { name: 'Amina', initial: 'A', avatarBg: '#FF7A00', xp: 1940 },
    { name: 'Damilola', initial: 'D', avatarBg: '#2563EB', xp: 1760 },
    { name: 'Uche', initial: 'U', avatarBg: '#0D9488', xp: 1580 },
    { name: 'Ngozi', initial: 'N', avatarBg: '#E11D48', xp: 1455 },
    { name: 'Yusuf', initial: 'Y', avatarBg: '#7C3AED', xp: 1340 },
    { name: 'Precious', initial: 'P', avatarBg: '#0284C7', xp: 1265 },
    { name: 'Olamide', initial: 'O', avatarBg: '#EA580C', xp: 1210 },
  ],
};

const TIER_ORDER: Record<LeagueTierId, number> = {
  unranked: 0,
  blue: 1,
  silver: 2,
  gold: 3,
};

function computeDaysLeftInWeek(): number {
  const now = new Date();
  const jsDay = now.getDay(); // 0=Sun..6=Sat
  return jsDay === 0 ? 1 : 8 - jsDay;
}

function buildTierTable(
  tier: PlacedLeagueTier,
  currentUserTier: LeagueTierId,
  firstName: string,
  xpBalance: number,
  remoteRows?: LeagueRow[]
): LeagueRow[] {
  if (remoteRows && remoteRows.length >= 2) {
    return remoteRows;
  }

  const base: Omit<LeagueRow, 'rank'>[] = [...TIER_COHORT_PEERS[tier]];
  if (currentUserTier === tier) {
    const initial = firstName.charAt(0).toUpperCase() || 'S';
    base.push({
      name: `${firstName} (You)`,
      initial,
      avatarBg: '#711AE3',
      xp: xpBalance,
      isCurrentUser: true,
    });
  }

  const sorted = base.sort((a, b) => b.xp - a.xp);
  const total = sorted.length;
  const promoteCutoff = tier === 'gold' ? 0 : 5;
  const demoteStart = tier === 'blue' ? total + 1 : Math.max(promoteCutoff + 1, total - 2);

  return sorted.map((row, idx) => {
    const rank = idx + 1;
    let zone: 'promote' | 'safe' | 'demote' = 'safe';
    if (promoteCutoff > 0 && rank <= promoteCutoff) {
      zone = 'promote';
    } else if (rank >= demoteStart) {
      zone = 'demote';
    }
    return {
      ...row,
      rank,
      zone,
    };
  });
}

function readPreviousTier(): LeagueTierId {
  if (typeof window === 'undefined') return 'unranked';
  try {
    const raw = localStorage.getItem(LAST_LEAGUE_TIER_KEY);
    if (raw === 'blue' || raw === 'silver' || raw === 'gold' || raw === 'unranked') {
      return raw;
    }
    return 'unranked';
  } catch {
    return 'unranked';
  }
}

function writePreviousTier(tier: LeagueTierId): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_LEAGUE_TIER_KEY, tier);
  } catch {
    // ignore
  }
}

export function getMultiTierLeagueSnapshot(options?: {
  remoteTables?: Partial<Record<PlacedLeagueTier, LeagueRow[]>>;
  syncSource?: 'local' | 'supabase';
}): MultiTierLeagueSnapshot {
  const dashboard = getWonderlandDashboardState();
  const currentTier = dashboard.leagueTier;
  const previousTier = readPreviousTier();

  let movement: LeagueMovement = 'stayed';
  if (previousTier === 'unranked' && currentTier !== 'unranked') {
    movement = 'entered';
  } else if (TIER_ORDER[currentTier] > TIER_ORDER[previousTier]) {
    movement = 'promoted';
  } else if (TIER_ORDER[currentTier] < TIER_ORDER[previousTier] && currentTier !== 'unranked') {
    movement = 'demoted';
  }

  if (currentTier !== previousTier) {
    writePreviousTier(currentTier);
  }

  const tables: Record<PlacedLeagueTier, LeagueRow[]> = {
    blue: buildTierTable(
      'blue',
      currentTier,
      dashboard.firstName,
      dashboard.xpBalance,
      options?.remoteTables?.blue
    ),
    silver: buildTierTable(
      'silver',
      currentTier,
      dashboard.firstName,
      dashboard.xpBalance,
      options?.remoteTables?.silver
    ),
    gold: buildTierTable(
      'gold',
      currentTier,
      dashboard.firstName,
      dashboard.xpBalance,
      options?.remoteTables?.gold
    ),
  };

  let currentRank: number | null = null;
  let currentZone: 'promote' | 'safe' | 'demote' | null = null;
  if (currentTier !== 'unranked') {
    const myRow = tables[currentTier].find(r => r.isCurrentUser);
    currentRank = myRow?.rank ?? null;
    currentZone = myRow?.zone ?? null;
  }

  let xpToNextTier = 0;
  let nextTierName: string | null = null;
  if (currentTier === 'unranked') {
    xpToNextTier = 1;
    nextTierName = 'Blue League';
  } else if (currentTier === 'blue') {
    xpToNextTier = Math.max(0, LEAGUE_TIER_META.silver.minXp - dashboard.xpBalance);
    nextTierName = 'Silver League';
  } else if (currentTier === 'silver') {
    xpToNextTier = Math.max(0, LEAGUE_TIER_META.gold.minXp - dashboard.xpBalance);
    nextTierName = 'Gold League';
  }

  return {
    currentTier,
    previousTier,
    movement,
    isPlaced: currentTier !== 'unranked',
    xpBalance: dashboard.xpBalance,
    streakDays: dashboard.streakDays,
    currentRank,
    currentZone,
    daysLeftInWeek: computeDaysLeftInWeek(),
    xpToNextTier,
    nextTierName,
    tables,
    syncSource: options?.syncSource || 'local',
  };
}

/**
 * Syncs the student's current real XP/streak to the Express + Supabase league backend
 * and fetches live standings for the chosen tier. Gracefully falls back when signed out.
 */
export async function syncAndFetchRemoteLeague(
  tier: PlacedLeagueTier
): Promise<{ standings: LeagueRow[]; source: 'supabase' | 'local' }> {
  const dashboard = getWonderlandDashboardState();
  const realProgress = getRealUserProgress();

  try {
    if (dashboard.xpBalance > 0 || dashboard.totalQuestionsSolved > 0) {
      await apiFetch('/api/gamification/leagues/sync', {
        method: 'POST',
        body: JSON.stringify({
          totalXp: dashboard.xpBalance,
          weeklyXp: dashboard.xpBalance,
          streakDays: dashboard.streakDays,
          questionsSolved: dashboard.totalQuestionsSolved,
          displayName: dashboard.firstName,
        }),
      }).catch(() => {});
    }

    const res = await apiFetch(`/api/gamification/leagues?tier=${tier}`, {
      method: 'GET',
    });
    if (!res.ok) {
      return { standings: [], source: 'local' };
    }
    const payload = (await res.json()) as {
      source?: string;
      standings?: Array<{
        rank: number;
        displayName: string;
        initial: string;
        avatarColor: string;
        xp: number;
        isCurrentUser?: boolean;
        zone?: 'promote' | 'safe' | 'demote';
      }>;
    };

    if (
      payload.source === 'supabase' &&
      Array.isArray(payload.standings) &&
      payload.standings.length > 0
    ) {
      const mapped: LeagueRow[] = payload.standings.map(row => ({
        rank: row.rank,
        name: row.displayName,
        initial: row.initial,
        avatarBg: row.avatarColor,
        xp: row.xp,
        isCurrentUser: row.isCurrentUser,
        zone: row.zone,
      }));
      // Only use remote rows if there is real league population (>1) or the user is placed
      if (mapped.length >= 2 || realProgress.totalXp > 0) {
        return { standings: mapped, source: 'supabase' };
      }
    }
  } catch {
    // Offline or unauthenticated — keep seamless local state
  }

  return { standings: [], source: 'local' };
}

function classifyReadiness(
  percent: number,
  hasRealData: boolean
): {
  label: SubjectRatingInsight['readinessLabel'];
  tone: SubjectRatingInsight['readinessTone'];
} {
  if (!hasRealData) return { label: 'Not Started', tone: 'neutral' };
  if (percent >= 82) return { label: 'Distinction Track', tone: 'purple' };
  if (percent >= 68) return { label: 'Exam Ready', tone: 'emerald' };
  if (percent >= 50) return { label: 'Building Momentum', tone: 'amber' };
  return { label: 'Needs Urgent Focus', tone: 'danger' };
}

/**
 * Computes real Subject Performance Ratings & tap-to-inspect Topic Weakness Insights
 * directly from userProgressStore.subjectStats, userProgressStore.topicStats, and Mistakes Vault.
 */
export function getSubjectRatingsSnapshot(): SubjectRatingsDashboardSnapshot {
  const dashboard = getWonderlandDashboardState();
  const progress = getRealUserProgress();
  const mistakes = loadMistakesVault();
  const diagnostic = loadDiagnosticBaseline();

  const insights: SubjectRatingInsight[] = dashboard.subjects.map(subj => {
    const rawTopics = progress.topicStats[subj.canonicalName] || {};
    const subjMistakes = mistakes.filter(
      m => m.subjectCanonical.toLowerCase() === subj.canonicalName.toLowerCase()
    );

    const vaultCountByTopic = new Map<string, number>();
    subjMistakes.forEach(m => {
      const key = (m.topicLabel || 'Core Syllabus').trim();
      vaultCountByTopic.set(key, (vaultCountByTopic.get(key) || 0) + (m.missedCount || 1));
    });

    const topicMap = new Map<string, TopicInsightRow>();

    Object.entries(rawTopics).forEach(([topicLabel, stat]) => {
      const solved = stat?.solved || 0;
      const correct = stat?.correct || 0;
      const missed = Math.max(0, solved - correct);
      const accuracy = solved > 0 ? Math.round((correct / solved) * 100) : 0;
      const missedInVault = vaultCountByTopic.get(topicLabel) || 0;
      const status: TopicInsightRow['status'] =
        accuracy < 55 || missedInVault >= 2
          ? 'critical'
          : accuracy < 75 || missed > 0
          ? 'needs-work'
          : 'strong';

      topicMap.set(topicLabel, {
        topicLabel,
        solved,
        correct,
        missed,
        accuracy,
        status,
        missedInVault,
        lastPracticedAt: stat?.lastPracticedAt,
      });
    });

    // Include any Mistakes Vault topics not yet in topicStats
    subjMistakes.forEach(m => {
      const topicLabel = (m.topicLabel || 'Core Syllabus').trim();
      if (!topicMap.has(topicLabel)) {
        topicMap.set(topicLabel, {
          topicLabel,
          solved: Math.max(1, m.missedCount || 1),
          correct: 0,
          missed: Math.max(1, m.missedCount || 1),
          accuracy: 0,
          status: 'critical',
          missedInVault: m.missedCount || 1,
          lastPracticedAt: m.lastMissedAt,
        });
      }
    });

    const topics = Array.from(topicMap.values()).sort(
      (a, b) => a.accuracy - b.accuracy || b.missedInVault - a.missedInVault || b.missed - a.missed
    );
    const weakTopics = topics.filter(t => t.status !== 'strong');
    const strongTopics = topics.filter(t => t.status === 'strong');
    const primaryWeakTopic = weakTopics[0]?.topicLabel || null;

    const readiness = classifyReadiness(subj.percent, subj.hasRealData);

    let aiSummary = '';
    let recommendedAction = '';

    if (!subj.hasRealData) {
      aiSummary = `You haven't solved any ${subj.displayLabel} questions yet. Complete a quick 10-question Smart Practice or Diagnostic set so SABI can map your exact strong and weak topics.`;
      recommendedAction = `Start a ${subj.displayLabel} baseline drill`;
    } else if (weakTopics.length > 0) {
      const topWeak = weakTopics[0];
      aiSummary = `SABI detected friction in ${topWeak.topicLabel} (${topWeak.accuracy}% accuracy across ${topWeak.solved} attempt${topWeak.solved === 1 ? '' : 's'}${
        subjMistakes.length > 0 ? `, with ${subjMistakes.length} logged mistake${subjMistakes.length === 1 ? '' : 's'}` : ''
      }). Fixing this topic first gives your fastest ${subj.displayLabel} score lift.`;
      recommendedAction = `Drill ${topWeak.topicLabel} in ${subj.displayLabel}`;
    } else if (topics.length > 0) {
      aiSummary = `Strong control across ${topics.length} tracked ${subj.displayLabel} topic${topics.length === 1 ? '' : 's'} (${subj.percent}% accuracy). Keep pushing harder JAMB past questions to lock in 80+ UTME points.`;
      recommendedAction = `Take a timed ${subj.displayLabel} challenge`;
    } else if (typeof diagnostic?.subjectMastery?.[subj.canonicalName] === 'number') {
      aiSummary = `Baseline estimated at ${subj.percent}% from your Diagnostic check. Practise individual ${subj.displayLabel} sets to unlock full topic-by-topic tracking.`;
      recommendedAction = `Unlock topic tracking in ${subj.displayLabel}`;
    } else {
      aiSummary = `Current ${subj.displayLabel} accuracy sits at ${subj.percent}%. Keep solving questions to deepen SABI's topic diagnostics.`;
      recommendedAction = `Practise ${subj.displayLabel}`;
    }

    return {
      subject: subj,
      readinessLabel: readiness.label,
      readinessTone: readiness.tone,
      topics,
      weakTopics,
      strongTopics,
      mistakes: subjMistakes,
      aiSummary,
      recommendedAction,
      primaryWeakTopic,
    };
  });

  const attempted = insights.filter(i => i.subject.hasRealData);
  const averageMastery =
    attempted.length > 0
      ? Math.round(
          attempted.reduce((sum, item) => sum + item.subject.percent, 0) / attempted.length
        )
      : 0;

  const totalSolved = insights.reduce((sum, item) => sum + item.subject.attempts, 0);
  const totalCorrect = insights.reduce((sum, item) => sum + item.subject.correct, 0);
  const weakestSubject =
    [...attempted].sort((a, b) => a.subject.percent - b.subject.percent)[0] ||
    insights[0] ||
    null;

  return {
    averageMastery,
    attemptedSubjectsCount: attempted.length,
    totalSolved,
    totalCorrect,
    totalMissedVault: mistakes.length,
    weakestSubject,
    subjects: insights,
  };
}
