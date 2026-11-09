import { randomUUID } from 'node:crypto';
import { AI_PROVIDER_NAMES, invokeProvider } from './providers';
import { assertProviderPrivacyAllowed, calculateAttemptCost, classifyAIData, minimizeExternalPayload, writeAICostAttempt } from './controlPlane';
import {
  AIUnavailableError,
  type AIGenerationInput,
  type AIProviderConfig,
  type AIProviderName,
  type AIProviderResult,
} from './types';

function enabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === 'true';
}

function priceFromEnv(name: string, direction: 'INPUT' | 'OUTPUT'): number | null {
  const raw = process.env[`SABI_${name.toUpperCase()}_${direction}_PRICE_PER_MILLION`];
  if (raw === undefined || raw.trim() === '') return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function providerConfig(name: AIProviderName, task: AIGenerationInput['task']): AIProviderConfig {
  const upper = name.toUpperCase();
  const taskKey = task.toUpperCase();
  const apiKey = process.env[`${upper}_API_KEY`]?.trim() || null;
  const model = process.env[`SABI_${upper}_${taskKey}_MODEL`]?.trim()
    || process.env[`SABI_${upper}_MODEL`]?.trim()
    || null;
  const native = AI_PROVIDER_NAMES.includes(name as any);
  const baseUrl = native ? null : process.env[`SABI_${upper}_BASE_URL`]?.trim().replace(/\/+$/, '') || null;
  return {
    name, apiKey, model, baseUrl,
    inputPricePerMillion: priceFromEnv(name, 'INPUT'),
    outputPricePerMillion: priceFromEnv(name, 'OUTPUT'),
    configured: Boolean(apiKey && model && (native || baseUrl)),
  };
}

function providerOrder(task: AIGenerationInput['task']): AIProviderName[] {
  const taskSpecific = process.env[`SABI_AI_${task.toUpperCase()}_PROVIDER_ORDER`];
  const raw = taskSpecific || process.env.SABI_AI_PROVIDER_ORDER || 'gemini,openai,anthropic';
  const parsed = raw.split(',').map((item) => item.trim().toLowerCase())
    .filter((item) => /^[a-z0-9][a-z0-9_-]{0,47}$/.test(item));
  return [...new Set(parsed)];
}

function estimateCost(config: AIProviderConfig, input: AIGenerationInput): number {
  // Conservative prompt estimate. Unknown prices are deliberately ranked last,
  // never treated as free. Actual provider token usage is recorded separately.
  if (config.inputPricePerMillion === null || config.inputPricePerMillion === undefined
    || config.outputPricePerMillion === null || config.outputPricePerMillion === undefined) {
    return Number.POSITIVE_INFINITY;
  }
  const inputTokens = Math.ceil((input.systemInstruction.length + input.prompt.length) / 4);
  const outputTokens = input.maxOutputTokens ?? 900;
  return (inputTokens * config.inputPricePerMillion + outputTokens * config.outputPricePerMillion) / 1_000_000;
}

export function getAIReadiness(task: AIGenerationInput['task'] = 'explanation') {
  const providers = providerOrder(task).map((name) => providerConfig(name, task));
  return {
    enabled: enabled(process.env.SABI_AI_ENABLED),
    task,
    providerOrder: providers.map((provider) => provider.name),
    configuredProviders: providers.filter((provider) => provider.configured).map((provider) => provider.name),
    missingConfiguration: providers.filter((provider) => !provider.configured).map((provider) => ({
      provider: provider.name,
      missing: [
        ...(!provider.apiKey ? [`${provider.name.toUpperCase()}_API_KEY`] : []),
        ...(!provider.model ? [`SABI_${provider.name.toUpperCase()}_MODEL (or task-specific model)`] : []),
        ...(provider.name !== 'gemini' && provider.name !== 'openai' && provider.name !== 'anthropic' && !provider.baseUrl
          ? [`SABI_${provider.name.toUpperCase()}_BASE_URL`] : []),
      ],
    })),
  };
}

export async function generateAIText(input: AIGenerationInput & {
  control?: { db: any; userId: string; consentGranted: boolean; requestId?: string };
}): Promise<AIProviderResult> {
  if (!enabled(process.env.SABI_AI_ENABLED)) {
    throw new AIUnavailableError('AI_DISABLED', 'AI features are currently disabled.');
  }

  const control = input.control;
  if (!control) throw new Error('AI_CONTROL_CONTEXT_REQUIRED');
  const dataClass = classifyAIData({ userId: control.userId, prompt: input.prompt, systemInstruction: input.systemInstruction });
  const privacyPolicy = {
    allowExternalPublic: enabled(process.env.SABI_AI_ALLOW_EXTERNAL_PUBLIC),
    allowExternalPseudonymous: enabled(process.env.SABI_AI_ALLOW_EXTERNAL_PSEUDONYMOUS),
    allowExternalSensitive: false,
  };
  assertProviderPrivacyAllowed(dataClass, privacyPolicy, control.consentGranted);
  const safeSystemInstruction = minimizeExternalPayload(input.systemInstruction);
  const safePrompt = minimizeExternalPayload(input.prompt);
  const requestId = input.control.requestId || randomUUID();

  const configured = providerOrder(input.task).map((name) => providerConfig(name, input.task))
    .filter((provider) => provider.configured && Number.isFinite(estimateCost(provider, { ...input, systemInstruction: safeSystemInstruction, prompt: safePrompt })))
    .sort((a, b) => estimateCost(a, { ...input, systemInstruction: safeSystemInstruction, prompt: safePrompt })
      - estimateCost(b, { ...input, systemInstruction: safeSystemInstruction, prompt: safePrompt }));
  if (!configured.length) {
    throw new AIUnavailableError('AI_NOT_CONFIGURED', 'No AI provider with complete credentials and pricing is configured.');
  }

  const failures: AIProviderName[] = [];
  let attempt = 0;
  for (const config of configured) {
    attempt += 1;
    const reservedUsd = estimateCost(config, { ...input, systemInstruction: safeSystemInstruction, prompt: safePrompt });
    const reservation = await input.control.db.rpc('reserve_ai_budget', {
      p_request_id: requestId,
      p_user_id: input.control.userId,
      p_task: input.task,
      p_provider: config.name,
      p_estimated_usd: reservedUsd,
    });
    if (reservation.error) throw new Error('AI_BUDGET_RESERVATION_FAILED');
    const reservationRow = Array.isArray(reservation.data) ? reservation.data[0] : reservation.data;
    if (!reservationRow?.allowed || !reservationRow?.reservation_id) {
      throw new Error(reservationRow?.reason || 'AI_BUDGET_BLOCKED');
    }

    const startedAt = Date.now();
    try {
      const result = await invokeProvider(config.name, config, {
        systemInstruction: safeSystemInstruction,
        prompt: safePrompt,
        temperature: input.temperature ?? 0.3,
        maxOutputTokens: input.maxOutputTokens ?? 900,
        timeoutMs: input.timeoutMs ?? 8000,
      });
      const actualUsd = calculateAttemptCost({
        usage: result.usage,
        inputPricePerMillion: config.inputPricePerMillion ?? null,
        outputPricePerMillion: config.outputPricePerMillion ?? null,
      });
      if (actualUsd === null) throw new Error('AI_PROVIDER_USAGE_UNAVAILABLE');
      await writeAICostAttempt(input.control.db, {
        requestId, attempt, userId: input.control.userId, task: input.task,
        provider: config.name, model: config.model!, usage: result.usage,
        inputPricePerMillion: config.inputPricePerMillion ?? null,
        outputPricePerMillion: config.outputPricePerMillion ?? null,
        outcome: 'success', durationMs: Date.now() - startedAt,
        promptVersion: process.env.SABI_AI_PROMPT_VERSION || 'v1',
      });
      const settlement = await input.control.db.rpc('settle_ai_budget', {
        p_reservation_id: reservationRow.reservation_id,
        p_actual_usd: actualUsd,
        p_release: false,
      });
      if (settlement.error || settlement.data !== true) throw new Error('AI_BUDGET_SETTLEMENT_FAILED');
      return { ...result, provider: config.name, model: config.model! };
    } catch (error) {
      // If the provider call itself failed, retain the full estimate as a
      // conservative charge. For post-response accounting failures, fail closed.
      const providerFailure = error instanceof Error
        && /provider_|provider_http_|provider_empty_response|AbortError|TimeoutError/.test(error.message + error.name);
      if (!providerFailure) throw error;
      const settlement = await input.control.db.rpc('settle_ai_budget', {
        p_reservation_id: reservationRow.reservation_id,
        p_actual_usd: reservedUsd,
        p_release: false,
      });
      if (settlement.error || settlement.data !== true) throw new Error('AI_BUDGET_SETTLEMENT_FAILED');
      await writeAICostAttempt(input.control.db, {
        requestId, attempt, userId: input.control.userId, task: input.task,
        provider: config.name, model: config.model!,
        usage: { inputTokens: null, outputTokens: null },
        inputPricePerMillion: config.inputPricePerMillion ?? null,
        outputPricePerMillion: config.outputPricePerMillion ?? null,
        outcome: 'provider_failed', durationMs: Date.now() - startedAt,
        promptVersion: process.env.SABI_AI_PROMPT_VERSION || 'v1',
      });
      failures.push(config.name);
      console.warn(`[SABI AI] ${config.name} provider failed:`, error instanceof Error ? error.name : 'unknown_error');
    }
  }

  throw new AIUnavailableError(
    'AI_PROVIDER_FAILED',
    'All configured AI providers are temporarily unavailable.',
    failures,
  );
}
