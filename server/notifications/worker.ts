import { supabaseAdmin } from '../lib/supabaseAdmin';
import { getNotificationReadiness, sendEmailNotification, sendSMSNotification, type NotificationChannel } from './providers';
import { renderNotificationTemplate } from './queue';
import { getQuietHoursDeferral } from './quietHours';

type NotificationJob = {
  id: string;
  user_id: string | null;
  channel: NotificationChannel;
  template_key: string | null;
  recipient: string | null;
  payload: Record<string, unknown>;
  attempts: number;
};

function configuredChannels(): NotificationChannel[] {
  const channels: NotificationChannel[] = ['in_app'];
  if (getNotificationReadiness('email').configured) channels.push('email');
  if (getNotificationReadiness('sms').configured) channels.push('sms');
  if (getNotificationReadiness('push').configured) channels.push('push');
  return channels;
}

async function getRecipient(job: NotificationJob): Promise<string | null> {
  if (job.recipient) return job.recipient;
  if (!job.user_id || job.channel !== 'email') return null;
  const { data, error } = await supabaseAdmin.auth.admin.getUserById(job.user_id);
  if (error) return null;
  return data.user?.email || null;
}

export async function dispatchNotificationBatch(limit = 25) {
  const channels = configuredChannels();
  const { data: jobs, error: claimError } = await supabaseAdmin.rpc('claim_notification_jobs', {
    p_limit: Math.max(1, Math.min(100, limit)),
    p_channels: channels,
  });
  if (claimError) throw new Error('NOTIFICATION_QUEUE_CLAIM_FAILED');

  let sent = 0;
  let failed = 0;
  let cancelled = 0;
  let deferred = 0;
  for (const job of (jobs || []) as NotificationJob[]) {
    try {
      if (job.user_id) {
        const { data: preference, error: preferenceError } = await supabaseAdmin
          .from('notification_preferences')
          .select('enabled, quiet_hours')
          .eq('user_id', job.user_id)
          .eq('channel', job.channel)
          .eq('notification_key', job.template_key || '')
          .maybeSingle();
        if (preferenceError) throw new Error('NOTIFICATION_PREFERENCE_LOOKUP_FAILED');
        if (preference?.enabled === false) {
          const { error } = await supabaseAdmin.from('notification_queue')
            .update({ status: 'cancelled', locked_at: null, last_error: 'preference_disabled', updated_at: new Date().toISOString() })
            .eq('id', job.id).eq('status', 'processing');
          if (error) throw new Error('NOTIFICATION_CANCEL_FAILED');
          cancelled += 1;
          continue;
        }
        const deferUntil = getQuietHoursDeferral(preference?.quiet_hours);
        if (deferUntil) {
          const { error } = await supabaseAdmin.from('notification_queue')
            .update({ status: 'pending', available_at: deferUntil.toISOString(), locked_at: null, updated_at: new Date().toISOString() })
            .eq('id', job.id).eq('status', 'processing');
          if (error) throw new Error('NOTIFICATION_QUIET_HOURS_DEFER_FAILED');
          deferred += 1;
          continue;
        }
      }

      const { data: template, error: templateError } = job.template_key
        ? await supabaseAdmin.from('notification_templates')
            .select('subject_template, body_template, version')
            .eq('template_key', job.template_key)
            .eq('channel', job.channel)
            .eq('status', 'active')
            .order('version', { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null, error: null };
      if (templateError) throw new Error('NOTIFICATION_TEMPLATE_LOOKUP_FAILED');

      const payload = job.payload || {};
      let provider = 'internal';
      let providerMessageId: string | null = null;
      let deliveryStatus: 'accepted' | 'delivered' = 'delivered';

      if (job.channel === 'in_app') {
        if (!job.user_id) throw new Error('IN_APP_NOTIFICATION_USER_REQUIRED');
        const titleTemplate = template?.subject_template || String(payload.title || '');
        const bodyTemplate = template?.body_template || String(payload.body || '');
        const title = renderNotificationTemplate(titleTemplate, payload).trim();
        const body = renderNotificationTemplate(bodyTemplate, payload).trim();
        if (!title || !body) throw new Error('IN_APP_NOTIFICATION_CONTENT_REQUIRED');
        const { data: notification, error } = await supabaseAdmin.from('in_app_notifications')
          .upsert({
            user_id: job.user_id,
            queue_id: job.id,
            notification_key: job.template_key || 'general',
            title,
            body,
            data: payload.data && typeof payload.data === 'object' ? payload.data : {},
          }, { onConflict: 'queue_id' })
          .select('id')
          .single();
        if (error || !notification) throw new Error('IN_APP_NOTIFICATION_PERSIST_FAILED');
        providerMessageId = notification.id;
      } else if (job.channel === 'email') {
        if (!template?.body_template) throw new Error('NOTIFICATION_TEMPLATE_NOT_ACTIVE');
        const recipient = await getRecipient(job);
        if (!recipient) throw new Error('NOTIFICATION_RECIPIENT_MISSING');
        const subject = renderNotificationTemplate(template.subject_template || 'Sabi update', payload);
        const body = renderNotificationTemplate(template.body_template, payload);
        const result = await sendEmailNotification({ to: recipient, subject, text: body });
        provider = result.provider;
        providerMessageId = result.providerMessageId;
        deliveryStatus = 'accepted';
      } else if (job.channel === 'sms') {
        if (!template?.body_template) throw new Error('NOTIFICATION_TEMPLATE_NOT_ACTIVE');
        const recipient = await getRecipient(job);
        if (!recipient) throw new Error('NOTIFICATION_RECIPIENT_MISSING');
        const body = renderNotificationTemplate(template.body_template, payload);
        const result = await sendSMSNotification({ to: recipient, text: body });
        provider = result.provider;
        providerMessageId = result.providerMessageId;
        deliveryStatus = 'accepted';
      } else {
        throw new Error('NOTIFICATION_CHANNEL_NOT_CONFIGURED');
      }

      const { data: finalized, error: finalizeError } = await supabaseAdmin.rpc('finalize_notification_job', {
        p_job_id: job.id,
        p_success: true,
        p_error: null,
      });
      if (finalizeError || finalized !== true) throw new Error('NOTIFICATION_JOB_FINALIZE_FAILED');

      const { error: logError } = await supabaseAdmin.from('notification_delivery_logs').insert({
        queue_id: job.id,
        provider,
        provider_message_id: providerMessageId,
        delivery_status: deliveryStatus,
      });
      if (logError) console.error('[SABI NOTIFICATIONS] Delivery log write failed:', logError.message);
      sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'delivery_failed';
      const { error: finalizeError } = await supabaseAdmin.rpc('finalize_notification_job', {
        p_job_id: job.id,
        p_success: false,
        p_error: reason.slice(0, 500),
      });
      if (finalizeError) console.error('[SABI NOTIFICATIONS] Retry scheduling failed:', finalizeError.message);
      failed += 1;
    }
  }

  return { claimed: (jobs || []).length, sent, failed, cancelled, deferred, channels };
}
