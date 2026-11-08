import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import {
  extractPaymentWebhook,
  getPaymentProviderReadiness,
  initializeProviderPayment,
  verifyPaymentWebhookSignature,
  verifyProviderPayment,
  type PaymentProviderName,
} from './providers';

const router = Router();

const checkoutSchema = z.strictObject({
  planKey: z.string().trim().min(1).max(80),
  idempotencyKey: z.string().trim().min(12).max(128),
});

function authenticatedUser(req: AuthenticatedRequest): string | null {
  return req.user?.id || null;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function addBillingPeriod(start: Date, interval: string): Date | null {
  const end = new Date(start);
  if (interval === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (interval === 'quarterly') end.setMonth(end.getMonth() + 3);
  else if (interval === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else if (interval === 'one_time') return null;
  else throw new Error('SUBSCRIPTION_INTERVAL_UNSUPPORTED');
  return end;
}

router.get('/plans', requireAuth, async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('plan_key, display_name, description, price_amount, currency, billing_interval, features, limits, ai_credit_allowance')
    .eq('is_active', true)
    .order('display_order', { ascending: true });
  if (error) return res.status(503).json({ error: 'Subscription plans are temporarily unavailable.' });
  return res.json({ plans: data || [] });
});

router.get('/readiness', requireAuth, async (_req, res) => {
  const readiness = getPaymentProviderReadiness();
  return res.json({
    enabled: readiness.enabled,
    configured: readiness.configured,
    provider: readiness.provider,
    missingConfiguration: readiness.missing,
  });
});

router.post('/checkout', requireAuth, validateBody(checkoutSchema), async (req, res) => {
  const userId = authenticatedUser(req as AuthenticatedRequest);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const { planKey, idempotencyKey } = req.body as z.infer<typeof checkoutSchema>;
  const readiness = getPaymentProviderReadiness();
  if (!readiness.enabled || !readiness.configured || !readiness.provider) {
    return res.status(503).json({
      error: 'Payments are not configured yet.',
      code: 'PAYMENTS_NOT_CONFIGURED',
      missingConfiguration: readiness.missing,
    });
  }

  try {
    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, plan_key, price_amount, currency, billing_interval')
      .eq('plan_key', planKey)
      .eq('is_active', true)
      .maybeSingle();
    if (planError) return res.status(503).json({ error: 'The selected plan could not be loaded.' });
    if (!plan) return res.status(404).json({ error: 'This subscription plan is not available.' });

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, reference, status, checkout_url')
      .eq('user_id', userId)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();
    if (existingError) return res.status(503).json({ error: 'Payment status could not be checked.' });
    if (existing?.status === 'pending' && existing.checkout_url) {
      return res.json({ checkoutUrl: existing.checkout_url, reference: existing.reference, reused: true });
    }
    if (existing) {
      return res.status(409).json({
        error: existing.status === 'successful'
          ? 'This payment request has already completed.'
          : 'This payment request already exists. Use a new idempotency key to start another attempt.',
        reference: existing.reference,
        status: existing.status,
      });
    }

    const { data: authResult, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (authError || !authResult.user?.email) {
      return res.status(422).json({ error: 'A verified account email is required before payment.' });
    }

    const reference = `SABI-${randomUUID().replace(/-/g, '').toUpperCase()}`;
    const amount = roundMoney(Number(plan.price_amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(409).json({ error: 'This plan does not have an approved payable price.' });
    }

    const { data: transaction, error: insertError } = await supabaseAdmin
      .from('payment_transactions')
      .insert({
        user_id: userId,
        plan_id: plan.id,
        provider: readiness.provider,
        reference,
        idempotency_key: idempotencyKey,
        amount,
        currency: String(plan.currency || 'NGN').toUpperCase(),
        status: 'pending',
        metadata: { plan_key: plan.plan_key, billing_interval: plan.billing_interval },
      })
      .select('id, reference')
      .single();
    if (insertError || !transaction) {
      if (insertError?.code === '23505') {
        return res.status(409).json({ error: 'A payment request with this idempotency key already exists.' });
      }
      console.error('[SABI PAYMENTS] Transaction record creation failed:', insertError?.message);
      return res.status(503).json({ error: 'The payment request could not be started.' });
    }

    try {
      const initialized = await initializeProviderPayment(readiness.provider, {
        email: authResult.user.email,
        amount,
        currency: String(plan.currency || 'NGN').toUpperCase(),
        reference,
        callbackUrl: process.env.SABI_PAYMENT_CALLBACK_URL!.trim(),
        metadata: { user_id: userId, plan_key: plan.plan_key, transaction_id: transaction.id },
      });
      const { error: updateError } = await supabaseAdmin.from('payment_transactions')
        .update({
          checkout_url: initialized.checkoutUrl,
          provider_reference: initialized.providerReference,
          updated_at: new Date().toISOString(),
        })
        .eq('id', transaction.id);
      if (updateError) throw new Error('PAYMENT_CHECKOUT_PERSIST_FAILED');
      return res.status(201).json({
        checkoutUrl: initialized.checkoutUrl,
        reference,
        provider: readiness.provider,
      });
    } catch (providerError) {
      await supabaseAdmin.from('payment_transactions')
        .update({ status: 'failed', updated_at: new Date().toISOString(), metadata: { plan_key: plan.plan_key, failure: 'provider_initialization_failed' } })
        .eq('id', transaction.id);
      console.error('[SABI PAYMENTS] Checkout initialization failed:', providerError instanceof Error ? providerError.name : 'unknown_error');
      return res.status(503).json({ error: 'The payment provider could not initialize checkout.' });
    }
  } catch (error) {
    console.error('[SABI PAYMENTS] Checkout failed:', error instanceof Error ? error.name : 'unknown_error');
    return res.status(503).json({ error: 'Payment checkout is temporarily unavailable.' });
  }
});

router.post('/webhooks/:provider', async (req, res) => {
  const providerParam = String(req.params.provider || '').toLowerCase();
  if (providerParam !== 'paystack' && providerParam !== 'flutterwave') {
    return res.status(404).json({ error: 'Payment provider not supported.' });
  }
  const provider = providerParam as PaymentProviderName;
  const readiness = getPaymentProviderReadiness();
  if (!readiness.configured || readiness.provider !== provider) {
    return res.status(503).json({ error: 'Webhook verification is not configured for this provider.' });
  }

  const rawBody = (req as any).rawBody as Buffer | undefined;
  const signature = provider === 'paystack' ? req.get('x-paystack-signature') : req.get('verif-hash');
  if (!verifyPaymentWebhookSignature(provider, signature, rawBody)) {
    return res.status(401).json({ error: 'Invalid payment webhook signature.' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody!.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid payment webhook payload.' });
  }
  const event = extractPaymentWebhook(provider, payload);
  if (!event.eventId || !event.reference) {
    return res.status(400).json({ error: 'Payment webhook is missing its event identity or transaction reference.' });
  }

  try {
    const { data: existingEvent, error: existingEventError } = await supabaseAdmin
      .from('payment_webhook_events')
      .select('id, processing_status')
      .eq('provider', provider)
      .eq('provider_event_id', event.eventId)
      .maybeSingle();
    if (existingEventError) return res.status(503).json({ error: 'Webhook event state could not be checked.' });
    if (existingEvent?.processing_status === 'processed' || existingEvent?.processing_status === 'ignored') {
      return res.json({ received: true, duplicate: true });
    }

    const { data: webhookEvent, error: eventError } = await supabaseAdmin
      .from('payment_webhook_events')
      .upsert({
        provider,
        provider_event_id: event.eventId,
        event_type: event.eventType,
        signature_valid: true,
        processing_status: 'processing',
        payload,
        failure_reason: null,
        received_at: new Date().toISOString(),
      }, { onConflict: 'provider,provider_event_id' })
      .select('id')
      .single();
    if (eventError || !webhookEvent) {
      console.error('[SABI PAYMENTS] Webhook event persistence failed:', eventError?.message);
      return res.status(503).json({ error: 'Webhook event could not be recorded.' });
    }

    const isSuccessEvent = provider === 'paystack'
      ? event.eventType === 'charge.success'
      : event.eventType === 'charge.completed' && String(payload?.data?.status || '').toLowerCase() === 'successful';
    if (!isSuccessEvent) {
      await supabaseAdmin.from('payment_webhook_events')
        .update({ processing_status: 'ignored', processed_at: new Date().toISOString() })
        .eq('id', webhookEvent.id);
      return res.json({ received: true, ignored: true });
    }

    const { data: transaction, error: transactionError } = await supabaseAdmin
      .from('payment_transactions')
      .select('id, user_id, plan_id, amount, currency, status, reference, metadata')
      .eq('reference', event.reference)
      .eq('provider', provider)
      .maybeSingle();
    if (transactionError) throw new Error('PAYMENT_TRANSACTION_LOOKUP_FAILED');
    if (!transaction) {
      await supabaseAdmin.from('payment_webhook_events')
        .update({ processing_status: 'ignored', processed_at: new Date().toISOString(), failure_reason: 'transaction_not_found' })
        .eq('id', webhookEvent.id);
      return res.json({ received: true, ignored: true });
    }
    if (transaction.status === 'successful') {
      await supabaseAdmin.from('payment_webhook_events')
        .update({ processing_status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', webhookEvent.id);
      return res.json({ received: true, alreadyProcessed: true });
    }

    const verified = await verifyProviderPayment(provider, {
      reference: transaction.reference,
      providerTransactionId: event.providerTransactionId,
    });
    if (!verified.successful || verified.reference !== transaction.reference ||
        roundMoney(verified.amount) !== roundMoney(Number(transaction.amount)) ||
        verified.currency !== String(transaction.currency).toUpperCase()) {
      await supabaseAdmin.from('payment_webhook_events')
        .update({ processing_status: 'failed', failure_reason: 'provider_verification_mismatch' })
        .eq('id', webhookEvent.id);
      return res.status(400).json({ error: 'Provider verification did not match the expected transaction.' });
    }

    const { data: plan, error: planError } = await supabaseAdmin
      .from('subscription_plans')
      .select('id, billing_interval, features, ai_credit_allowance')
      .eq('id', transaction.plan_id)
      .maybeSingle();
    if (planError || !plan) throw new Error('PAYMENT_PLAN_LOOKUP_FAILED');

    const now = new Date();
    const { data: existingSubscription, error: subscriptionLookupError } = await supabaseAdmin
      .from('student_subscriptions')
      .select('id, current_period_end')
      .eq('user_id', transaction.user_id)
      .eq('plan_id', plan.id)
      .eq('status', 'active')
      .maybeSingle();
    if (subscriptionLookupError) throw new Error('SUBSCRIPTION_LOOKUP_FAILED');

    // Persist the billing period on the payment before entitlement writes. A
    // retried webhook must reuse the exact same period, never extend it twice.
    const transactionMetadata = transaction.metadata && typeof transaction.metadata === 'object'
      ? transaction.metadata as Record<string, any>
      : {};
    let periodStart: Date;
    let periodEnd: Date | null;
    const savedPeriod = transactionMetadata.activationPeriod;
    if (savedPeriod?.start) {
      periodStart = new Date(savedPeriod.start);
      periodEnd = savedPeriod.end ? new Date(savedPeriod.end) : null;
    } else {
      periodStart = existingSubscription?.current_period_end && new Date(existingSubscription.current_period_end) > now
        ? new Date(existingSubscription.current_period_end)
        : now;
      periodEnd = addBillingPeriod(periodStart, plan.billing_interval);
      const { error: periodPersistError } = await supabaseAdmin.from('payment_transactions')
        .update({
          metadata: {
            ...transactionMetadata,
            activationPeriod: { start: periodStart.toISOString(), end: periodEnd?.toISOString() || null },
          },
          updated_at: now.toISOString(),
        })
        .eq('id', transaction.id);
      if (periodPersistError) throw new Error('PAYMENT_PERIOD_PERSIST_FAILED');
    }
    if (!Number.isFinite(periodStart.getTime()) || (periodEnd && !Number.isFinite(periodEnd.getTime()))) {
      throw new Error('PAYMENT_PERIOD_INVALID');
    }
    let subscriptionId = existingSubscription?.id || null;

    if (subscriptionId) {
      const { error } = await supabaseAdmin.from('student_subscriptions')
        .update({
          provider,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd?.toISOString() || null,
          updated_at: now.toISOString(),
        })
        .eq('id', subscriptionId);
      if (error) throw new Error('SUBSCRIPTION_UPDATE_FAILED');
    } else {
      const { data: subscription, error } = await supabaseAdmin.from('student_subscriptions')
        .insert({
          user_id: transaction.user_id,
          plan_id: plan.id,
          provider,
          status: 'active',
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd?.toISOString() || null,
        })
        .select('id')
        .single();
      if (error || !subscription) throw new Error('SUBSCRIPTION_CREATE_FAILED');
      subscriptionId = subscription.id;
    }

    const featureMap = plan.features && typeof plan.features === 'object' && !Array.isArray(plan.features)
      ? plan.features as Record<string, unknown>
      : {};
    const featureKeys = Object.entries(featureMap).filter(([, value]) => value !== false && value !== null && value !== undefined).map(([key]) => key);
    if (featureKeys.length) {
      const { data: catalogue, error: catalogueError } = await supabaseAdmin
        .from('entitlement_catalogue')
        .select('entitlement_key')
        .in('entitlement_key', featureKeys)
        .eq('is_active', true);
      if (catalogueError) throw new Error('ENTITLEMENT_CATALOGUE_LOOKUP_FAILED');
      const activeKeys = new Set((catalogue || []).map((row) => row.entitlement_key));
      const entitlementRows = featureKeys.filter((key) => activeKeys.has(key)).map((key) => ({
        user_id: transaction.user_id,
        entitlement_key: key,
        source_type: 'subscription',
        source_id: subscriptionId,
        status: 'active',
        starts_at: periodStart.toISOString(),
        expires_at: periodEnd?.toISOString() || null,
        entitlement_value: featureMap[key],
      }));
      if (entitlementRows.length) {
        const { error } = await supabaseAdmin.from('student_entitlements')
          .upsert(entitlementRows, { onConflict: 'user_id,entitlement_key,source_type,source_id' });
        if (error) throw new Error('ENTITLEMENT_GRANT_FAILED');
      }
    }

    const creditAllowance = Number(plan.ai_credit_allowance || 0);
    if (creditAllowance > 0) {
      const { error } = await supabaseAdmin.from('ai_credit_ledger').upsert({
        user_id: transaction.user_id,
        entry_type: 'grant',
        credits_delta: creditAllowance,
        reason: 'subscription_period_allowance',
        reference_type: 'student_subscriptions',
        reference_id: subscriptionId,
        idempotency_key: `payment:${transaction.reference}:ai-credit-grant`,
        metadata: { plan_id: plan.id, period_end: periodEnd?.toISOString() || null },
      }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
      if (error) throw new Error('AI_CREDIT_GRANT_FAILED');
    }

    const { error: transactionUpdateError } = await supabaseAdmin.from('payment_transactions')
      .update({
        status: 'successful',
        subscription_id: subscriptionId,
        provider_reference: verified.providerReference,
        verified_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', transaction.id);
    if (transactionUpdateError) throw new Error('PAYMENT_TRANSACTION_FINALIZE_FAILED');

    await supabaseAdmin.from('payment_webhook_events')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString(), failure_reason: null })
      .eq('id', webhookEvent.id);
    return res.json({ received: true, processed: true });
  } catch (error) {
    console.error('[SABI PAYMENTS] Webhook processing failed:', error instanceof Error ? error.name : 'unknown_error');
    return res.status(503).json({ error: 'Payment webhook processing will be retried.' });
  }
});

export default router;
