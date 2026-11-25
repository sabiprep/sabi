export type ServerLeagueTier = 'unranked' | 'blue' | 'silver' | 'gold';
export type PlacedLeagueTier = 'blue' | 'silver' | 'gold';
export type LeagueMovement = 'entered' | 'promoted' | 'demoted' | 'stayed';

export interface LeagueStandingEntry {
  userId: string;
  displayName: string;
  initial: string;
  avatarColor: string;
  leagueTier: PlacedLeagueTier;
  xp: number;
  streakDays: number;
  rank: number;
  zone: 'promote' | 'safe' | 'demote';
  isCurrentUser: boolean;
}

export const LEAGUE_THRESHOLDS = {
  silverMinXp: 450,
  goldMinXp: 1200,
  /** Hysteresis buffer so minor fluctuations don't flicker tiers unfairly */
  silverDemoteBelowXp: 380,
  goldDemoteBelowXp: 1050,
} as const;

const TIER_RANK_ORDER: Record<ServerLeagueTier, number> = {
  unranked: 0,
  blue: 1,
  silver: 2,
  gold: 3,
};

export function getCurrentIsoWeekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Derives a candidate's authoritative league tier strictly from verified activity & XP.
 * Supports Unranked -> Blue -> Silver -> Gold promotion AND Gold -> Silver -> Blue demotion
 * if performance drops below tier maintenance thresholds.
 */
export function resolveAuthoritativeLeagueTier(params: {
  totalXp: number;
  questionsSolved: number;
  previousTier?: ServerLeagueTier | null;
}): { tier: ServerLeagueTier; movement: LeagueMovement } {
  const xp = Math.max(0, Math.round(params.totalXp || 0));
  const solved = Math.max(0, Math.round(params.questionsSolved || 0));
  const prev: ServerLeagueTier = params.previousTier || 'unranked';

  if (xp <= 0 && solved <= 0) {
    return { tier: 'unranked', movement: 'stayed' };
  }

  let nextTier: PlacedLeagueTier = 'blue';
  if (xp >= LEAGUE_THRESHOLDS.goldMinXp) {
    nextTier = 'gold';
  } else if (prev === 'gold' && xp >= LEAGUE_THRESHOLDS.goldDemoteBelowXp) {
    nextTier = 'gold';
  } else if (xp >= LEAGUE_THRESHOLDS.silverMinXp) {
    nextTier = 'silver';
  } else if (prev === 'silver' && xp >= LEAGUE_THRESHOLDS.silverDemoteBelowXp) {
    nextTier = 'silver';
  } else {
    nextTier = 'blue';
  }

  if (prev === 'unranked') {
    return { tier: nextTier, movement: 'entered' };
  }
  if (TIER_RANK_ORDER[nextTier] > TIER_RANK_ORDER[prev]) {
    return { tier: nextTier, movement: 'promoted' };
  }
  if (TIER_RANK_ORDER[nextTier] < TIER_RANK_ORDER[prev]) {
    return { tier: nextTier, movement: 'demoted' };
  }
  return { tier: nextTier, movement: 'stayed' };
}

export function sanitizeDisplayFirstName(raw?: string | null): string {
  const withoutTags = String(raw || '').replace(/<[^>]*>/g, ' ');
  const cleaned = withoutTags
    .replace(/[^a-zA-Z0-9\s'-]/g, '')
    .trim()
    .split(/\s+/)[0];
  if (!cleaned || cleaned.toLowerCase() === 'candidate') return 'Scholar';
  return cleaned.slice(0, 20);
}

export function annotateStandingsWithZones(
  rows: Array<{
    userId: string;
    displayName: string;
    avatarColor: string;
    leagueTier: PlacedLeagueTier;
    xp: number;
    streakDays: number;
  }>,
  tier: PlacedLeagueTier,
  currentUserId: string
): LeagueStandingEntry[] {
  const sorted = [...rows].sort((a, b) => b.xp - a.xp || b.streakDays - a.streakDays);
  const total = sorted.length;
  const promoteSlots = tier === 'gold' ? 0 : Math.min(5, Math.max(1, Math.ceil(total * 0.35)));
  const demoteSlots = tier === 'blue' || total < 4 ? 0 : Math.min(3, Math.floor(total * 0.25));

  return sorted.map((row, idx) => {
    const rank = idx + 1;
    let zone: 'promote' | 'safe' | 'demote' = 'safe';
    if (promoteSlots > 0 && rank <= promoteSlots) {
      zone = 'promote';
    } else if (demoteSlots > 0 && rank > total - demoteSlots) {
      zone = 'demote';
    }

    const safeName = sanitizeDisplayFirstName(row.displayName);
    const isCurrentUser = row.userId === currentUserId;

    return {
      userId: isCurrentUser ? row.userId : `peer_${idx + 1}`,
      displayName: isCurrentUser ? `${safeName} (You)` : safeName,
      initial: safeName.charAt(0).toUpperCase() || 'S',
      avatarColor: isCurrentUser ? '#711AE3' : row.avatarColor || '#2563EB',
      leagueTier: tier,
      xp: Math.max(0, Math.round(row.xp || 0)),
      streakDays: Math.max(0, Math.round(row.streakDays || 0)),
      rank,
      zone,
      isCurrentUser,
    };
  });
}
