import { afterEach, describe, expect, it } from 'vitest';
import { getNotificationReadiness } from './providers';

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

describe('notification provider readiness', () => {
  it('keeps in-app delivery available without external credentials', () => {
    expect(getNotificationReadiness('in_app')).toMatchObject({ configured: true, provider: 'internal' });
  });

  it('does not claim email delivery is ready without Brevo credentials', () => {
    delete process.env.BREVO_API_KEY;
    delete process.env.BREVO_SENDER_EMAIL;
    expect(getNotificationReadiness('email')).toMatchObject({
      configured: false,
      provider: 'brevo',
      missing: ['BREVO_API_KEY', 'BREVO_SENDER_EMAIL'],
    });
  });

  it('does not claim SMS delivery is ready without Termii credentials', () => {
    delete process.env.TERMII_API_KEY;
    delete process.env.TERMII_SENDER_ID;
    expect(getNotificationReadiness('sms').configured).toBe(false);
  });
});
