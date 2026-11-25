import { describe, expect, it } from 'vitest';
import {
  annotateStandingsWithZones,
  resolveAuthoritativeLeagueTier,
  sanitizeDisplayFirstName,
} from './leagueService';

describe('Server League Service — Authoritative Tier, Promotion/Demotion & Privacy', () => {
  it('keeps users unranked with zero XP and zero questions solved', () => {
    const res = resolveAuthoritativeLeagueTier({
      totalXp: 0,
      questionsSolved: 0,
      previousTier: 'unranked',
    });
    expect(res.tier).toBe('unranked');
    expect(res.movement).toBe('stayed');
  });

  it('promotes Unranked -> Blue -> Silver -> Gold and demotes when XP drops below maintenance floor', () => {
    const enterBlue = resolveAuthoritativeLeagueTier({
      totalXp: 40,
      questionsSolved: 5,
      previousTier: 'unranked',
    });
    expect(enterBlue).toEqual({ tier: 'blue', movement: 'entered' });

    const promoteSilver = resolveAuthoritativeLeagueTier({
      totalXp: 500,
      questionsSolved: 50,
      previousTier: 'blue',
    });
    expect(promoteSilver).toEqual({ tier: 'silver', movement: 'promoted' });

    const promoteGold = resolveAuthoritativeLeagueTier({
      totalXp: 1250,
      questionsSolved: 120,
      previousTier: 'silver',
    });
    expect(promoteGold).toEqual({ tier: 'gold', movement: 'promoted' });

    // Hysteresis keeps Gold at 1100 XP (>= 1050 floor)
    const holdGold = resolveAuthoritativeLeagueTier({
      totalXp: 1100,
      questionsSolved: 120,
      previousTier: 'gold',
    });
    expect(holdGold).toEqual({ tier: 'gold', movement: 'stayed' });

    // Dropping below 1050 demotes Gold -> Silver
    const demoteSilver = resolveAuthoritativeLeagueTier({
      totalXp: 900,
      questionsSolved: 120,
      previousTier: 'gold',
    });
    expect(demoteSilver).toEqual({ tier: 'silver', movement: 'demoted' });

    // Dropping below 380 demotes Silver -> Blue
    const demoteBlue = resolveAuthoritativeLeagueTier({
      totalXp: 200,
      questionsSolved: 40,
      previousTier: 'silver',
    });
    expect(demoteBlue).toEqual({ tier: 'blue', movement: 'demoted' });
  });

  it('sanitizes display names and never leaks peer userIds in standings output', () => {
    expect(sanitizeDisplayFirstName('Ada<script>alert(1)</script> Okafor')).toBe('Ada');
    expect(sanitizeDisplayFirstName('Candidate')).toBe('Scholar');

    const rows = annotateStandingsWithZones(
      [
        { userId: 'u-1', displayName: 'Chidi', avatarColor: '#05A85C', leagueTier: 'silver', xp: 1000, streakDays: 5 },
        { userId: 'u-2', displayName: 'Fatima', avatarColor: '#FF7A00', leagueTier: 'silver', xp: 850, streakDays: 4 },
        { userId: 'u-me', displayName: 'Tobi', avatarColor: '#711AE3', leagueTier: 'silver', xp: 700, streakDays: 3 },
        { userId: 'u-4', displayName: 'Musa', avatarColor: '#2563EB', leagueTier: 'silver', xp: 480, streakDays: 1 },
      ],
      'silver',
      'u-me'
    );

    expect(rows[0].rank).toBe(1);
    expect(rows[0].userId).toBe('peer_1'); // Never leaks internal UUID of peers
    expect(rows[0].zone).toBe('promote');
    const me = rows.find(r => r.isCurrentUser);
    expect(me?.displayName).toBe('Tobi (You)');
    expect(me?.userId).toBe('u-me');
    expect(rows[rows.length - 1].zone).toBe('demote');
  });
});
