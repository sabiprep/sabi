import { createHmac, timingSafeEqual } from 'node:crypto';

export type PaymentProviderName = 'paystack' | 'flutterwave';

export type PaymentProviderReadiness = {
  enabled: boolean;
  provider: PaymentProviderName | null;
  configured: boolean;
  missing: string[];
};

export type PaymentInitializationInput = {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, unknown>;
};

export type PaymentInitializationResult = {
  checkoutUrl: string;
  providerReference: string | null;
};

export type PaymentVerification = {
  successful: boolean;
  reference: string;
  amount: number;
  currency: string;
  providerReference: string | null;
};

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function getPaymentProviderReadiness(): PaymentProviderReadiness {
  const enabled = process.env.SABI_PAYMENT_ENABLED?.trim().toLowerCase() === 'true';
  const rawProvider = process.env.SABI_PAYMENT_PROVIDER?.trim().toLowerCase();
  const provider = rawProvider === 'paystack' || rawProvider === 'flutterwave' ? rawProvider : null;
  const missing: string[] = [];
  if (!provider) missing.push('SABI_PAYMENT_PROVIDER');
  if (provider === 'paystack' && !process.env.PAYSTACK_SECRET_KEY?.trim()) missing.push('PAYSTACK_SECRET_KEY');
  if (provider === 'flutterwave') {
    if (!process.env.FLUTTERWAVE_SECRET_KEY?.trim()) missing.push('FLUTTERWAVE_SECRET_KEY');
    if (!process.env.FLW_SECRET_HASH?.trim()) missing.push('FLW_SECRET_HASH');
  }
  if (!process.env.SABI_PAYMENT_CALLBACK_URL?.trim()) missing.push('SABI_PAYMENT_CALLBACK_URL');
  return { enabled, provider, configured: missing.length === 0, missing };
}

export function verifyPaymentWebhookSignature(
  provider: PaymentProviderName,
  signature: string | undefined,
  rawBody: Buffer | undefined,
): boolean {
  if (!signature || !rawBody?.length) return false;
  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret) return false;
    const expected = createHmac('sha512', secret).update(rawBody).digest('hex');
    return safeEqual(signature.toLowerCase(), expected.toLowerCase());
  }
  const secretHash = process.env.FLW_SECRET_HASH?.trim();
  if (!secretHash) return false;
  return safeEqual(signature, secretHash);
}

async function readProviderJson(response: Response): Promise<any> {
  const text = await response.text();
  let parsed: any;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`PAYMENT_PROVIDER_INVALID_JSON_${response.status}`);
  }
  if (!response.ok || parsed?.status === false) {
    throw new Error(`PAYMENT_PROVIDER_HTTP_${response.status}`);
  }
  return parsed;
}

export async function initializeProviderPayment(
  provider: PaymentProviderName,
  input: PaymentInitializationInput,
): Promise<PaymentInitializationResult> {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('PAYMENT_AMOUNT_INVALID');
  if (input.currency.toUpperCase() !== 'NGN') throw new Error('PAYMENT_CURRENCY_NOT_SUPPORTED');

  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    const data = await readProviderJson(await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        amount: Math.round(input.amount * 100),
        currency: 'NGN',
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
      signal: AbortSignal.timeout(12000),
    }));
    const checkoutUrl = data?.data?.authorization_url;
    if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('https://')) {
      throw new Error('PAYMENT_CHECKOUT_URL_INVALID');
    }
    return {
      checkoutUrl,
      providerReference: data?.data?.reference ? String(data.data.reference) : input.reference,
    };
  }

  const secret = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (!secret) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  const data = await readProviderJson(await fetch('https://api.flutterwave.com/v3/payments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_ref: input.reference,
      amount: input.amount,
      currency: 'NGN',
      redirect_url: input.callbackUrl,
      customer: { email: input.email },
      meta: input.metadata,
    }),
    signal: AbortSignal.timeout(12000),
  }));
  const checkoutUrl = data?.data?.link;
  if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith('https://')) {
    throw new Error('PAYMENT_CHECKOUT_URL_INVALID');
  }
  return { checkoutUrl, providerReference: input.reference };
}

export async function verifyProviderPayment(
  provider: PaymentProviderName,
  input: { reference: string; providerTransactionId?: string | null },
): Promise<PaymentVerification> {
  if (provider === 'paystack') {
    const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
    if (!secret) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
    const data = await readProviderJson(await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(input.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10000) },
    ));
    const transaction = data?.data;
    return {
      successful: transaction?.status === 'success',
      reference: String(transaction?.reference || ''),
      amount: Number(transaction?.amount || 0) / 100,
      currency: String(transaction?.currency || '').toUpperCase(),
      providerReference: transaction?.id === undefined ? null : String(transaction.id),
    };
  }

  const secret = process.env.FLUTTERWAVE_SECRET_KEY?.trim();
  if (!secret) throw new Error('PAYMENT_PROVIDER_NOT_CONFIGURED');
  if (!input.providerTransactionId) throw new Error('PAYMENT_PROVIDER_TRANSACTION_ID_REQUIRED');
  const data = await readProviderJson(await fetch(
    `https://api.flutterwave.com/v3/transactions/${encodeURIComponent(input.providerTransactionId)}/verify`,
    { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10000) },
  ));
  const transaction = data?.data;
  return {
    successful: transaction?.status === 'successful',
    reference: String(transaction?.tx_ref || ''),
    amount: Number(transaction?.amount || 0),
    currency: String(transaction?.currency || '').toUpperCase(),
    providerReference: transaction?.id === undefined ? null : String(transaction.id),
  };
}

export function extractPaymentWebhook(provider: PaymentProviderName, payload: any) {
  if (provider === 'paystack') {
    return {
      eventType: String(payload?.event || 'unknown'),
      eventId: String(payload?.data?.id || payload?.data?.reference || ''),
      reference: String(payload?.data?.reference || ''),
      providerTransactionId: payload?.data?.id === undefined ? null : String(payload.data.id),
    };
  }
  return {
    eventType: String(payload?.event || payload?.type || 'unknown'),
    eventId: String(payload?.data?.id || payload?.data?.tx_ref || ''),
    reference: String(payload?.data?.tx_ref || ''),
    providerTransactionId: payload?.data?.id === undefined ? null : String(payload.data.id),
  };
}
