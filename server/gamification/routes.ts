import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { getXPBalance } from './service';
import {
  annotateStandingsWithZones,
  getCurrentIsoWeekKey,
  resolveAuthoritativeLeagueTier,
  sanitizeDisplayFirstName,
  type PlacedLeagueTier,
  type ServerLeagueTier,
} from './leagueService';

const router = Router();
const ruleSchema = z.strictObject({
  description: z.string().trim().min(3).max(300),
  xpDelta: z.number().int().min(1).max(100000),
  maxAwardsPerDay: z.number().int().min(0).max(10000).default(1),
  isActive: z.boolean().default(false),
});

const leagueSyncSchema = z.strictObject({
  totalXp: z.number().int().min(0).max(500000),
  weeklyXp: z.number().int().min(0).max(100000).optional(),
  streakDays: z.number().int().min(0).max(3650),
  questionsSolved: z.number().int().min(0).max(200000),
  displayName: z.string().trim().min(1).max(40).optional(),
});

const TIER_QUERY_SCHEMA = z.enum(['blue', 'silver', 'gold']);

router.get('/me', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const [balance, streakResult, ledgerResult] = await Promise.all([
      getXPBalance(supabaseAdmin, userId),
      supabaseAdmin.from('student_streak_state')
        .select('timezone, current_streak, longest_streak, last_activity_date')
        .eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('student_xp_ledger')
        .select('event_key, xp_delta, reason, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(25),
    ]);
    if (streakResult.error || ledgerResult.error) {
      return res.status(503).json({ error: 'Gamification progress is temporarily unavailable.' });
    }
    return res.json({
      xpBalance: balance,
      streak: streakResult.data || { timezone: 'Africa/Lagos', current_streak: 0, longest_streak: 0, last_activity_date: null },
      recentAwards: ledgerResult.data || [],
    });
  } catch {
    return res.status(503).json({ error: 'Gamification progress is temporarily unavailable.' });
  }
});

/**
 * Sync the authenticated student's verified XP & activity to cross-device league standings.
 * League tier and promotion/demotion movement are derived strictly on the server.
 */
router.post('/leagues/sync', requireAuth, validateBody(leagueSyncSchema), async (req, res) => {
  const user = (req as AuthenticatedRequest).user;
  if (!user?.id) return res.status(401).json({ error: 'Authentication required.' });

  const input = req.body as z.infer<typeof leagueSyncSchema>;
  const safeName = sanitizeDisplayFirstName(input.displayName || user.email?.split('@')[0]);
  const weekKey = getCurrentIsoWeekKey();

  try {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from('student_league_standings')
      .select('league_tier, total_xp, weekly_xp')
      .eq('user_id', user.id)
      .maybeSingle();

    if (lookupError) {
      const derived = resolveAuthoritativeLeagueTier({
        totalXp: input.totalXp,
        questionsSolved: input.questionsSolved,
      });
      return res.json({
        status: 'synced_locally',
        tier: derived.tier,
        previousTier: 'unranked',
        movement: derived.movement,
        totalXp: input.totalXp,
        weekKey,
      });
    }

    const previousTier: ServerLeagueTier =
      existing?.league_tier === 'blue' ||
      existing?.league_tier === 'silver' ||
      existing?.league_tier === 'gold'
        ? existing.league_tier
        : 'unranked';

    const derived = resolveAuthoritativeLeagueTier({
      totalXp: input.totalXp,
      questionsSolved: input.questionsSolved,
      previousTier,
    });

    if (derived.tier === 'unranked') {
      return res.json({
        status: 'unranked',
        tier: 'unranked',
        previousTier,
        movement: 'stayed',
        totalXp: 0,
        weekKey,
      });
    }

    const { error: upsertError } = await supabaseAdmin
      .from('student_league_standings')
      .upsert(
        {
          user_id: user.id,
          display_name: safeName,
          avatar_color: '#711AE3',
          league_tier: derived.tier,
          previous_tier: previousTier,
          movement: derived.movement,
          weekly_xp: input.weeklyXp ?? input.totalXp,
          total_xp: input.totalXp,
          streak_days: input.streakDays,
          questions_solved: input.questionsSolved,
          week_key: weekKey,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (upsertError) {
      return res.json({
        status: 'synced_locally',
        tier: derived.tier,
        previousTier,
        movement: derived.movement,
        totalXp: input.totalXp,
        weekKey,
      });
    }

    return res.json({
      status: 'synced',
      tier: derived.tier,
      previousTier,
      movement: derived.movement,
      totalXp: input.totalXp,
      weekKey,
    });
  } catch {
    const derived = resolveAuthoritativeLeagueTier({
      totalXp: input.totalXp,
      questionsSolved: input.questionsSolved,
    });
    return res.json({
      status: 'synced_locally',
      tier: derived.tier,
      previousTier: 'unranked',
      movement: derived.movement,
      totalXp: input.totalXp,
      weekKey,
    });
  }
});

/**
 * Fetch cross-device league standings for a requested tier (blue | silver | gold).
 * Never exposes PII (emails or internal IDs of other students).
 */
router.get('/leagues', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });

  const rawTier = typeof req.query.tier === 'string' ? req.query.tier.toLowerCase() : undefined;
  let requestedTier: PlacedLeagueTier | undefined;
  if (rawTier !== undefined) {
    const parsed = TIER_QUERY_SCHEMA.safeParse(rawTier);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid league tier. Use blue, silver, or gold.' });
    }
    requestedTier = parsed.data;
  }

  try {
    const { data: myStanding, error: myErr } = await supabaseAdmin
      .from('student_league_standings')
      .select('user_id, display_name, league_tier, previous_tier, movement, total_xp, streak_days')
      .eq('user_id', userId)
      .maybeSingle();

    if (myErr) {
      return res.json({
        source: 'local_fallback',
        currentUserTier: 'unranked',
        requestedTier: requestedTier || 'blue',
        standings: [],
      });
    }

    const userTier: ServerLeagueTier =
      myStanding?.league_tier === 'blue' ||
      myStanding?.league_tier === 'silver' ||
      myStanding?.league_tier === 'gold'
        ? myStanding.league_tier
        : 'unranked';

    const activeTier: PlacedLeagueTier =
      requestedTier || (userTier === 'unranked' ? 'blue' : userTier);

    const { data: rows, error: rowsErr } = await supabaseAdmin
      .from('student_league_standings')
      .select('user_id, display_name, avatar_color, league_tier, total_xp, streak_days')
      .eq('league_tier', activeTier)
      .order('total_xp', { ascending: false })
      .limit(30);

    if (rowsErr) {
      return res.json({
        source: 'local_fallback',
        currentUserTier: userTier,
        requestedTier: activeTier,
        standings: [],
      });
    }

    const normalizedRows = (rows || []).map((r: any) => ({
      userId: String(r.user_id),
      displayName: String(r.display_name || 'Scholar'),
      avatarColor: String(r.avatar_color || '#2563EB'),
      leagueTier: activeTier,
      xp: Number(r.total_xp || 0),
      streakDays: Number(r.streak_days || 0),
    }));

    const standings = annotateStandingsWithZones(normalizedRows, activeTier, userId);
    const myRow = standings.find(r => r.isCurrentUser) || null;

    return res.json({
      source: 'supabase',
      currentUserTier: userTier,
      previousTier: myStanding?.previous_tier || 'unranked',
      movement: myStanding?.movement || 'stayed',
      requestedTier: activeTier,
      currentUserRank: myRow?.rank ?? null,
      standings,
    });
  } catch {
    return res.json({
      source: 'local_fallback',
      currentUserTier: 'unranked',
      requestedTier: requestedTier || 'blue',
      standings: [],
    });
  }
});

router.get('/admin/rules', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('gamification_rules')
    .select('event_key, description, xp_delta, max_awards_per_day, is_active, updated_at')
    .order('event_key');
  if (error) return res.status(503).json({ error: 'Gamification rules are temporarily unavailable.' });
  return res.json({ rules: data || [] });
});

router.put('/admin/rules/:eventKey', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), validateBody(ruleSchema), async (req, res) => {
  const eventKey = String(req.params.eventKey || '').trim();
  if (!/^[a-z0-9][a-z0-9_.-]{1,79}$/.test(eventKey)) {
    return res.status(400).json({ error: 'Invalid gamification event key.' });
  }
  const userId = (req as AuthenticatedRequest).user?.id;
  const input = req.body as z.infer<typeof ruleSchema>;
  const { data, error } = await supabaseAdmin.from('gamification_rules')
    .upsert({
      event_key: eventKey,
      description: input.description,
      xp_delta: input.xpDelta,
      max_awards_per_day: input.maxAwardsPerDay,
      is_active: input.isActive,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'event_key' })
    .select('event_key, description, xp_delta, max_awards_per_day, is_active, updated_at')
    .single();
  if (error) return res.status(503).json({ error: 'Gamification rule could not be saved.' });
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: userId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'gamification_rule.updated',
    resource_type: 'gamification_rules',
    resource_id: eventKey,
    metadata: { xp_delta: input.xpDelta, max_awards_per_day: input.maxAwardsPerDay, is_active: input.isActive },
  });
  if (auditError) console.error('[SABI GAMIFICATION] Rule audit failed:', auditError.message);
  return res.json({ rule: data });
});

export default router;
