import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth';
import { validateBody } from '../middleware/validate';
import { requireRole } from '../middleware/requireRole';
import {
  extractPaymentWebhook,
  getPaymentProviderReadiness,
  initializeProviderPayment,
  verifyPaymentWebhookSignature,
  verifyProviderPayment,
  type PaymentProviderName,
} from './providers';
import { addBillingPeriod } from './period';
import { getAICreditBalance, listActiveEntitlements } from './entitlements';

const router = Router();


const planSchema = z.strictObject({
  planKey: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,79}$/),
  displayName: z.string().trim().min(2).max(100),
  description: z.string().trim().max(1000).optional(),
  priceAmount: z.number().finite().min(0),
  currency: z.literal('NGN').default('NGN'),
  billingInterval: z.enum(['monthly', 'quarterly', 'yearly', 'one_time']),
  features: z.record(z.string(), z.unknown()).default({}),
  limits: z.record(z.string(), z.unknown()).default({}),
  aiCreditAllowance: z.number().int().min(0).default(0),
  isActive: z.boolean().default(false),
  displayOrder: z.number().int().default(0),
});

const entitlementSchema = z.strictObject({
  entitlementKey: z.string().trim().regex(/^[a-z0-9][a-z0-9_.-]{1,99}$/),
  description: z.string().trim().min(2).max(500),
  valueSchema: z.record(z.string(), z.unknown()).default({}),
  isActive: z.boolean().default(false),
});

async function validatePlanFeatureKeys(features: Record<string, unknown>) {
  const keys = Object.keys(features);
  if (!keys.length) return { ok: true as const };
  const { data, error } = await supabaseAdmin.from('entitlement_catalogue')
    .select('entitlement_key').in('entitlement_key', keys).eq('is_active', true);
  if (error) return { ok: false as const, code: 'ENTITLEMENT_LOOKUP_FAILED' };
  const active = new Set((data || []).map((row) => row.entitlement_key));
  const missing = keys.filter((key) => !active.has(key));
  return missing.length
    ? { ok: false as const, code: 'PLAN_FEATURE_NOT_CONFIGURED', missing }
    : { ok: true as const };
}

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


router.get('/admin/plans', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('subscription_plans')
    .select('*').order('display_order', { ascending: true });
  if (error) return res.status(503).json({ error: 'Plan catalogue is temporarily unavailable.' });
  return res.json({ plans: data || [] });
});

router.post('/admin/plans', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), validateBody(planSchema), async (req, res) => {
  const input = req.body as z.infer<typeof planSchema>;
  if (input.isActive) {
    const featureCheck = await validatePlanFeatureKeys(input.features);
    if (!featureCheck.ok) return res.status(409).json({ error: 'Plan references inactive or unknown entitlements.', ...featureCheck });
  }
  const { data, error } = await supabaseAdmin.from('subscription_plans').insert({
    plan_key: input.planKey,
    display_name: input.displayName,
    description: input.description || null,
    price_amount: input.priceAmount,
    currency: input.currency.toUpperCase(),
    billing_interval: input.billingInterval,
    features: input.features,
    limits: input.limits,
    ai_credit_allowance: input.aiCreditAllowance,
    is_active: input.isActive,
    display_order: input.displayOrder,
  }).select('*').single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'A plan with this key already exists.' });
    return res.status(503).json({ error: 'The subscription plan could not be saved.' });
  }
  const actorId = authenticatedUser(req as AuthenticatedRequest);
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: actorId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'subscription_plan.created',
    resource_type: 'subscription_plans',
    resource_id: data.id,
    metadata: { plan_key: data.plan_key, is_active: data.is_active, price_amount: data.price_amount, currency: data.currency },
  });
  if (auditError) console.error('[SABI BILLING] Plan creation audit failed:', auditError.message);
  return res.status(201).json({ plan: data });
});

router.patch('/admin/plans/:planId', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (req, res) => {
  const planId = String(req.params.planId || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(planId)) {
    return res.status(400).json({ error: 'A valid plan ID is required.' });
  }
  const patchSchema = planSchema.omit({ planKey: true }).partial().strict();
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid plan update.', details: parsed.error.flatten() });
  const input = parsed.data;
  const { data: currentPlan, error: currentPlanError } = await supabaseAdmin
    .from('subscription_plans').select('features').eq('id', planId).maybeSingle();
  if (currentPlanError) return res.status(503).json({ error: 'The subscription plan could not be loaded.' });
  if (!currentPlan) return res.status(404).json({ error: 'Subscription plan not found.' });
  if (input.isActive === true || input.features) {
    const featureCheck = await validatePlanFeatureKeys(input.features || currentPlan.features || {});
    if (!featureCheck.ok) return res.status(409).json({ error: 'Plan references inactive or unknown entitlements.', ...featureCheck });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.displayName !== undefined) updates.display_name = input.displayName;
  if (input.description !== undefined) updates.description = input.description;
  if (input.priceAmount !== undefined) updates.price_amount = input.priceAmount;
  if (input.currency !== undefined) updates.currency = input.currency.toUpperCase();
  if (input.billingInterval !== undefined) updates.billing_interval = input.billingInterval;
  if (input.features !== undefined) updates.features = input.features;
  if (input.limits !== undefined) updates.limits = input.limits;
  if (input.aiCreditAllowance !== undefined) updates.ai_credit_allowance = input.aiCreditAllowance;
  if (input.isActive !== undefined) updates.is_active = input.isActive;
  if (input.displayOrder !== undefined) updates.display_order = input.displayOrder;
  const { data, error } = await supabaseAdmin.from('subscription_plans')
    .update(updates).eq('id', planId).select('*').maybeSingle();
  if (error) return res.status(503).json({ error: 'The subscription plan could not be updated.' });
  if (!data) return res.status(404).json({ error: 'Subscription plan not found.' });
  const actorId = authenticatedUser(req as AuthenticatedRequest);
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: actorId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'subscription_plan.updated',
    resource_type: 'subscription_plans',
    resource_id: planId,
    metadata: { changed_fields: Object.keys(input), is_active: data.is_active },
  });
  if (auditError) console.error('[SABI BILLING] Plan update audit failed:', auditError.message);
  return res.json({ plan: data });
});

router.get('/admin/entitlements', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), async (_req, res) => {
  const { data, error } = await supabaseAdmin.from('entitlement_catalogue')
    .select('*').order('entitlement_key', { ascending: true });
  if (error) return res.status(503).json({ error: 'Entitlement catalogue is temporarily unavailable.' });
  return res.json({ entitlements: data || [] });
});

router.post('/admin/entitlements', requireAuth, requireRole('ADMIN', 'MASTER_ADMIN'), validateBody(entitlementSchema), async (req, res) => {
  const input = req.body as z.infer<typeof entitlementSchema>;
  const { data, error } = await supabaseAdmin.from('entitlement_catalogue').insert({
    entitlement_key: input.entitlementKey,
    description: input.description,
    value_schema: input.valueSchema,
    is_active: input.isActive,
  }).select('*').single();
  if (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'This entitlement key already exists.' });
    return res.status(503).json({ error: 'The entitlement could not be saved.' });
  }
  const actorId = authenticatedUser(req as AuthenticatedRequest);
  const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
    actor_user_id: actorId,
    actor_role: (req as AuthenticatedRequest).role || 'ADMIN',
    action: 'entitlement_catalogue.created',
    resource_type: 'entitlement_catalogue',
    resource_id: data.entitlement_key,
    metadata: { is_active: data.is_active },
  });
  if (auditError) console.error('[SABI BILLING] Entitlement creation audit failed:', auditError.message);
  return res.status(201).json({ entitlement: data });
});


router.get('/me', requireAuth, async (req, res) => {
  const userId = authenticatedUser(req as AuthenticatedRequest);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  try {
    const [subscriptionsResult, entitlements, aiCredits] = await Promise.all([
      supabaseAdmin.from('student_subscriptions')
        .select('id, status, current_period_start, current_period_end, cancel_at_period_end, subscription_plans(plan_key, display_name, billing_interval)')
        .eq('user_id', userId)
        .in('status', ['active', 'past_due', 'pending'])
        .order('created_at', { ascending: false }),
      listActiveEntitlements(supabaseAdmin, userId),
      getAICreditBalance(supabaseAdmin, userId),
    ]);
    if (subscriptionsResult.error) return res.status(503).json({ error: 'Your subscription status is temporarily unavailable.' });
    return res.json({
      subscriptions: subscriptionsResult.data || [],
      entitlements: entitlements.map((item) => ({
        key: item.entitlement_key,
        value: item.entitlement_value,
        expiresAt: item.expires_at,
      })),
      aiCredits: Math.max(0, aiCredits),
    });
  } catch (error) {
    console.error('[SABI BILLING] Account billing summary failed:', error instanceof Error ? error.name : 'unknown_error');
    return res.status(503).json({ error: 'Your billing summary is temporarily unavailable.' });
  }
});

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
    checkoutConfigured: readiness.checkoutConfigured,
    provider: readiness.provider,
    missingConfiguration: readiness.missing,
  });
});

router.post('/checkout', requireAuth, validateBody(checkoutSchema), async (req, res) => {
  const userId = authenticatedUser(req as AuthenticatedRequest);
  if (!userId) return res.status(401).json({ error: 'Authentication required.' });
  const { planKey, idempotencyKey } = req.body as z.infer<typeof checkoutSchema>;
  const readiness = getPaymentProviderReadiness();
  if (!readiness.enabled || !readiness.checkoutConfigured || !readiness.provider) {
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

    const { error: eventFinalizeError } = await supabaseAdmin.from('payment_webhook_events')
      .update({ processing_status: 'processed', processed_at: new Date().toISOString(), failure_reason: null })
      .eq('id', webhookEvent.id);
    if (eventFinalizeError) throw new Error('PAYMENT_WEBHOOK_FINALIZE_FAILED');
    return res.json({ received: true, processed: true });
  } catch (error) {
    console.error('[SABI PAYMENTS] Webhook processing failed:', error instanceof Error ? error.name : 'unknown_error');
    return res.status(503).json({ error: 'Payment webhook processing will be retried.' });
  }
});

export default router;
