import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { validateBody } from '../middleware/validate';
import { getXPBalance } from './service';

const router = Router();
const ruleSchema = z.strictObject({
  description: z.string().trim().min(3).max(300),
  xpDelta: z.number().int().min(1).max(100000),
  maxAwardsPerDay: z.number().int().min(0).max(10000).default(1),
  isActive: z.boolean().default(false),
});

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
