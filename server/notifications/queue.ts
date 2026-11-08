import type { NotificationChannel } from './providers';

export type EnqueueNotificationInput = {
  userId?: string | null;
  channel: NotificationChannel;
  notificationKey: string;
  templateKey?: string | null;
  recipient?: string | null;
  payload?: Record<string, unknown>;
  idempotencyKey: string;
  availableAt?: string;
};

export async function enqueueNotification(db: any, input: EnqueueNotificationInput): Promise<{ id: string; reused: boolean }> {
  const { data, error } = await db.from('notification_queue').insert({
    user_id: input.userId || null,
    channel: input.channel,
    template_key: input.templateKey || input.notificationKey,
    recipient: input.recipient || null,
    payload: input.payload || {},
    idempotency_key: input.idempotencyKey,
    status: 'pending',
    available_at: input.availableAt || new Date().toISOString(),
  }).select('id').single();

  if (!error && data?.id) return { id: data.id, reused: false };
  if (error?.code === '23505') {
    const { data: existing, error: lookupError } = await db.from('notification_queue')
      .select('id').eq('idempotency_key', input.idempotencyKey).maybeSingle();
    if (!lookupError && existing?.id) return { id: existing.id, reused: true };
  }
  throw new Error('NOTIFICATION_ENQUEUE_FAILED');
}

export function renderNotificationTemplate(template: string, payload: Record<string, unknown>): string {
  return template.replace(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g, (_match, path: string) => {
    const value = path.split('.').reduce<unknown>((current, key) => {
      if (!current || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[key];
    }, payload);
    return value === null || value === undefined ? '' : String(value).slice(0, 4000);
  });
}
