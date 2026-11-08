export type NotificationChannel = 'email' | 'push' | 'in_app' | 'sms';

export function getNotificationReadiness(channel: NotificationChannel) {
  const missing: string[] = [];
  if (channel === 'in_app') return { configured: true, provider: 'internal', missing };
  if (channel === 'email') {
    if (!process.env.BREVO_API_KEY?.trim()) missing.push('BREVO_API_KEY');
    if (!process.env.BREVO_SENDER_EMAIL?.trim()) missing.push('BREVO_SENDER_EMAIL');
    return { configured: missing.length === 0, provider: 'brevo', missing };
  }
  if (channel === 'sms') {
    if (!process.env.TERMII_API_KEY?.trim()) missing.push('TERMII_API_KEY');
    if (!process.env.TERMII_SENDER_ID?.trim()) missing.push('TERMII_SENDER_ID');
    return { configured: missing.length === 0, provider: 'termii', missing };
  }
  missing.push('FCM_PROJECT_ID', 'FCM_ACCESS_TOKEN');
  return { configured: false, provider: 'fcm', missing };
}

async function parseProviderResponse(response: Response): Promise<any> {
  const text = await response.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { throw new Error('NOTIFICATION_PROVIDER_INVALID_JSON'); }
  if (!response.ok) throw new Error(`NOTIFICATION_PROVIDER_HTTP_${response.status}`);
  return data;
}

export async function sendEmailNotification(input: {
  to: string;
  subject: string;
  text: string;
}): Promise<{ provider: string; providerMessageId: string | null }> {
  const readiness = getNotificationReadiness('email');
  if (!readiness.configured) throw new Error('NOTIFICATION_PROVIDER_NOT_CONFIGURED');
  const data = await parseProviderResponse(await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY!.trim(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: process.env.BREVO_SENDER_EMAIL!.trim(),
        name: process.env.BREVO_SENDER_NAME?.trim() || 'Sabi',
      },
      to: [{ email: input.to }],
      subject: input.subject,
      textContent: input.text,
    }),
    signal: AbortSignal.timeout(12000),
  }));
  return { provider: 'brevo', providerMessageId: data?.messageId ? String(data.messageId) : null };
}

export async function sendSMSNotification(input: {
  to: string;
  text: string;
}): Promise<{ provider: string; providerMessageId: string | null }> {
  const readiness = getNotificationReadiness('sms');
  if (!readiness.configured) throw new Error('NOTIFICATION_PROVIDER_NOT_CONFIGURED');
  const data = await parseProviderResponse(await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TERMII_API_KEY!.trim(),
      to: input.to,
      from: process.env.TERMII_SENDER_ID!.trim(),
      sms: input.text,
      type: 'plain',
      channel: 'generic',
    }),
    signal: AbortSignal.timeout(12000),
  }));
  return { provider: 'termii', providerMessageId: data?.message_id ? String(data.message_id) : null };
}
