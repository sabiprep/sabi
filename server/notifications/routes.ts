import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { dispatchNotificationBatch } from './worker';

const router = Router();
const dispatchSchema = z.strictObject({ limit: z.number().int().min(1).max(100).default(25) });
const preferenceSchema = z.strictObject({
  channel: z.enum(['email', 'push', 'in_app', 'sms']),
  notificationKey: z.string().trim().min(1).max(100),
  enabled: z.boolean(),
  quietHours: z.record(z.string(), z.unknown()).default({}),
});
const templateSchema = z.strictObject({
  templateKey: z.string().trim().regex(/^[a-z0-9][a-z0-9_.-]{1,99}$/),
  channel: z.enum(['email', 'push', 'in_app', 'sms']),
  locale: z.string().trim().min(2).max(12).default('en'),
  subjectTemplate: z.string().trim().max(300).optional(),
  bodyTemplate: z.string().trim().min(1).max(10000),
  variablesSchema: z.record(z.string(), z.unknown()).default({}),
});

function secretMatches(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}


router.get('/', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const limit = req.query.limit === undefined ? 20 : Number(req.query.limit);
  const offset = req.query.offset === undefined ? 0 : Number(req.query.offset);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100 || !Number.isInteger(offset) || offset < 0) {
    return res.status(400).json({ error: 'Invalid notification pagination.' });
  }
  const { data, error, count } = await supabaseAdmin.from('in_app_notifications')
    .select('id, notification_key, title, body, data, read_at, created_at', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return res.status(503).json({ error: 'Notifications are temporarily unavailable.' });
  return res.json({ notifications: data || [], total: count || 0, limit, offset });
});

router.patch('/read-all', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const { error } = await supabaseAdmin.from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);
  if (error) return res.status(503).json({ error: 'Notifications could not be marked as read.' });
  return res.json({ status: 'updated' });
});

router.patch('/:id/read', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const notificationId = String(req.params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) {
    return res.status(400).json({ error: 'A valid notification ID is required.' });
  }
  const { data, error } = await supabaseAdmin.from('in_app_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select('id, read_at')
    .maybeSingle();
  if (error) return res.status(503).json({ error: 'Notification could not be marked as read.' });
  if (!data) return res.status(404).json({ error: 'Notification not found.' });
  return res.json({ notification: data });
});

router.get('/preferences', requireAuth, async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const { data, error } = await supabaseAdmin.from('notification_preferences')
    .select('channel, notification_key, enabled, quiet_hours')
    .eq('user_id', userId);
  if (error) return res.status(503).json({ error: 'Notification preferences are temporarily unavailable.' });
  return res.json({ preferences: data || [] });
});

router.put('/preferences', requireAuth, validateBody(preferenceSchema), async (req, res) => {
  const userId = (req as AuthenticatedRequest).user?.id;
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const input = req.body as z.infer<typeof preferenceSchema>;
  const { data, error } = await supabaseAdmin.from('notification_preferences')
    .upsert({
      user_id: userId,
      channel: input.channel,
      notification_key: input.notificationKey,
      enabled: input.enabled,
      quiet_hours: input.quietHours,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,channel,notification_key' })
    .select('channel, notification_key, enabled, quiet_hours')
    .single();
  if (error) return res.status(503).json({ error: 'Notification preference could not be saved.' });
  return res.json({ preference: data });
});

router.get('/admin/templates', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('notification_templates')
    .select('*').order('template_key').order('channel').order('version', { ascending: false });
  if (error) return res.status(503).json({ error: 'Notification templates are temporarily unavailable.' });
  return res.json({ templates: data || [] });
});

router.post('/admin/templates', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), validateBody(templateSchema), async (req, res) => {
  const input = req.body as z.infer<typeof templateSchema>;
  const { data, error } = await supabaseAdmin.from('notification_templates').insert({
    template_key: input.templateKey,
    channel: input.channel,
    locale: input.locale,
    subject_template: input.subjectTemplate || null,
    body_template: input.bodyTemplate,
    variables_schema: input.variablesSchema,
    status: 'draft',
  }).select('*').single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This template version already exists.' });
    return res.status(503).json({ error: 'Notification template could not be saved.' });
  }
  return res.status(201).json({ template: data });
});

router.post('/admin/templates/:templateId/activate', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const templateId = String(req.params.templateId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(templateId)) {
    return res.status(400).json({ error: 'A valid template ID is required.' });
  }
  const { data: draft, error: draftError } = await supabaseAdmin.from('notification_templates')
    .select('id, template_key, channel, locale, version')
    .eq('id', templateId).eq('status', 'draft').maybeSingle();
  if (draftError) return res.status(503).json({ error: 'Notification template could not be loaded.' });
  if (!draft) return res.status(404).json({ error: 'Draft notification template not found.' });

  const { data: previousActive, error: activeLookupError } = await supabaseAdmin.from('notification_templates')
    .select('id')
    .eq('template_key', draft.template_key)
    .eq('channel', draft.channel)
    .eq('locale', draft.locale)
    .eq('status', 'active')
    .maybeSingle();
  if (activeLookupError) return res.status(503).json({ error: 'Active notification template could not be checked.' });

  if (previousActive) {
    const { error: archiveError } = await supabaseAdmin.from('notification_templates')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', previousActive.id).eq('status', 'active');
    if (archiveError) return res.status(503).json({ error: 'Previous template version could not be archived.' });
  }

  const { data, error } = await supabaseAdmin.from('notification_templates')
    .update({ status: 'active', updated_at: new Date().toISOString() })
    .eq('id', templateId).eq('status', 'draft')
    .select('*')
    .maybeSingle();
  if (error || !data) {
    if (previousActive) {
      await supabaseAdmin.from('notification_templates')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', previousActive.id).eq('status', 'archived');
    }
    if (error?.code === '23505') return res.status(409).json({ error: 'Another version of this template is already active.' });
    return res.status(503).json({ error: 'Notification template could not be activated.' });
  }
  const actorId = (req as AuthenticatedRequest).user?.id;
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: actorId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'notification_template.activated',
    resource_type: 'notification_templates',
    resource_id: templateId,
    metadata: { template_key: data.template_key, channel: data.channel, version: data.version, replaced_template_id: previousActive?.id || null },
  });
  if (auditError) console.error('[SABI NOTIFICATIONS] Template activation audit failed:', auditError.message);
  return res.json({ template: data });
});

router.post('/admin/templates/:templateId/archive', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const templateId = String(req.params.templateId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(templateId)) {
    return res.status(400).json({ error: 'A valid template ID is required.' });
  }
  const { data, error } = await supabaseAdmin.from('notification_templates')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', templateId).neq('status', 'archived')
    .select('id, template_key, channel, version, status')
    .maybeSingle();
  if (error) return res.status(503).json({ error: 'Notification template could not be archived.' });
  if (!data) return res.status(404).json({ error: 'Notification template not found.' });
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: (req as AuthenticatedRequest).user?.id,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'notification_template.archived',
    resource_type: 'notification_templates',
    resource_id: templateId,
    metadata: { template_key: data.template_key, channel: data.channel, version: data.version },
  });
  if (auditError) console.error('[SABI NOTIFICATIONS] Template archive audit failed:', auditError.message);
  return res.json({ template: data });
});

router.post('/dispatch', validateBody(dispatchSchema), async (req, res) => {
  const expected = process.env.NOTIFICATION_WORKER_SECRET?.trim();
  const received = req.get('x-sabi-notification-secret');
  if (!secretMatches(received, expected)) {
    return res.status(401).json({ error: 'Invalid notification worker credentials.' });
  }
  try {
    const result = await dispatchNotificationBatch((req.body as z.infer<typeof dispatchSchema>).limit);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[SABI NOTIFICATIONS] Worker batch failed:', error instanceof Error ? error.name : 'unknown_error');
    return res.status(503).json({ error: 'Notification dispatch is temporarily unavailable.' });
  }
});

export default router;
