import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { extractPaymentWebhook, getPaymentProviderReadiness, verifyPaymentWebhookSignature } from './providers';

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

describe('payment provider configuration', () => {
  it('remains disabled and unconfigured until explicitly enabled', () => {
    delete process.env.SABI_PAYMENT_ENABLED;
    delete process.env.SABI_PAYMENT_PROVIDER;
    expect(getPaymentProviderReadiness()).toMatchObject({ enabled: false, configured: false, provider: null });
  });

  it('requires provider secret and callback URL', () => {
    process.env.SABI_PAYMENT_ENABLED = 'true';
    process.env.SABI_PAYMENT_PROVIDER = 'paystack';
    process.env.PAYSTACK_SECRET_KEY = 'test-secret';
    delete process.env.SABI_PAYMENT_CALLBACK_URL;
    expect(getPaymentProviderReadiness().configured).toBe(false);
    expect(getPaymentProviderReadiness().missing).toContain('SABI_PAYMENT_CALLBACK_URL');
  });
});

describe('payment webhook verification', () => {
  it('validates Paystack HMAC against the exact raw request body', () => {
    const body = Buffer.from('{"event":"charge.success","data":{"reference":"SABI-123"}}');
    process.env.PAYSTACK_SECRET_KEY = 'unit-test-secret';
    const signature = createHmac('sha512', 'unit-test-secret').update(body).digest('hex');
    expect(verifyPaymentWebhookSignature('paystack', signature, body)).toBe(true);
    expect(verifyPaymentWebhookSignature('paystack', signature, Buffer.from('{}'))).toBe(false);
  });

  it('validates Flutterwave secret hash without parsing payload', () => {
    process.env.FLW_SECRET_HASH = 'configured-hash';
    expect(verifyPaymentWebhookSignature('flutterwave', 'configured-hash', Buffer.from('{}'))).toBe(true);
    expect(verifyPaymentWebhookSignature('flutterwave', 'wrong-hash', Buffer.from('{}'))).toBe(false);
  });
});

describe('payment webhook extraction', () => {
  it('extracts Paystack reference and event identity', () => {
    expect(extractPaymentWebhook('paystack', {
      event: 'charge.success',
      data: { id: 987, reference: 'SABI-REF' },
    })).toMatchObject({ eventType: 'charge.success', eventId: '987', reference: 'SABI-REF', providerTransactionId: '987' });
  });
});
