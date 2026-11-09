import { createHash } from 'node:crypto';
import type { AITask, AIUsage } from './types';

export type PrivacyClass = 'public' | 'pseudonymous_learner' | 'sensitive';
export type PrivacyPolicy = {
  allowExternalPublic: boolean;
  allowExternalPseudonymous: boolean;
  allowExternalSensitive: boolean;
};

const DIRECT_IDENTIFIERS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /(?:\+?234|0)[789][01]\d{8}\b/g,
  /\b(?:SABI[- ]?ID|student\s?id|learner\s?id)\s*[:#-]?\s*[A-Z0-9-]{5,}\b/gi,
];

export function classifyAIData(input: { userId?: string; prompt: string; systemInstruction: string }): PrivacyClass {
  const combined = `${input.systemInstruction}\n${input.prompt}`;
  if (DIRECT_IDENTIFIERS.some((pattern) => pattern.test(combined))) return 'sensitive';
  if (input.userId || /mastery|progress|registered subjects|learning session/i.test(combined)) return 'pseudonymous_learner';
  return 'public';
}

/** Remove direct identifiers before any external provider call. */
export function minimizeExternalPayload(text: string): string {
  return DIRECT_IDENTIFIERS.reduce((value, pattern) =>
    value.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]'), text);
}

export function assertProviderPrivacyAllowed(
  dataClass: PrivacyClass,
  policy: PrivacyPolicy,
  consentGranted: boolean,
): void {
  if (dataClass === 'sensitive') throw new Error('AI_PRIVACY_SENSITIVE_PAYLOAD_BLOCKED');
  if (dataClass === 'pseudonymous_learner' && (!consentGranted || !policy.allowExternalPseudonymous)) {
    throw new Error('AI_PRIVACY_POLICY_BLOCKED');
  }
  if (dataClass === 'public' && !policy.allowExternalPublic) {
    throw new Error('AI_PRIVACY_POLICY_BLOCKED');
  }
}

export function buildAIResponseCacheKey(input: {
  task: AITask;
  prompt: string;
  systemInstruction: string;
  promptVersion: string;
  syllabusVersion?: string | null;
  locale?: string;
}): string {
  // Only public, context-free requests should use this cache. Learner context
  // must never be stored or shared through this key.
  return createHash('sha256').update(JSON.stringify({
    task: input.task,
    prompt: input.prompt,
    systemInstruction: input.systemInstruction,
    promptVersion: input.promptVersion,
    syllabusVersion: input.syllabusVersion || null,
    locale: input.locale || 'en',
  })).digest('hex');
}

export type AIQualityResult = { valid: boolean; codes: string[]; escalate: boolean };

export function validateAIOutput(task: AITask, text: string): AIQualityResult {
  const codes: string[] = [];
  const trimmed = text.trim();
  if (trimmed.length < 20) codes.push('too_short');
  if (trimmed.length > 24000) codes.push('too_long');
  if (/\b(as an ai language model|system prompt|developer message)\b/i.test(trimmed)) codes.push('instruction_leak');
  if (task === 'study_plan' && !/(day|week|session|topic|review)/i.test(trimmed)) codes.push('study_plan_structure_missing');
  if (task === 'explanation' && !/(because|therefore|reason|correct|answer|step)/i.test(trimmed)) codes.push('explanation_reasoning_missing');
  if (task === 'content_draft' && trimmed.length < 80) codes.push('draft_incomplete');
  return { valid: codes.length === 0, codes, escalate: codes.length > 0 };
}

export function calculateAttemptCost(input: {
  usage: AIUsage;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
}): number | null {
  if (input.usage.inputTokens === null || input.usage.outputTokens === null
    || input.inputPricePerMillion === null || input.outputPricePerMillion === null) return null;
  if (![input.usage.inputTokens, input.usage.outputTokens, input.inputPricePerMillion, input.outputPricePerMillion]
    .every((n) => Number.isFinite(n) && n >= 0)) return null;
  return (input.usage.inputTokens * input.inputPricePerMillion
    + input.usage.outputTokens * input.outputPricePerMillion) / 1_000_000;
}

export type CostSimulatorInput = {
  requestsPerMonth: number;
  taskMix: Partial<Record<AITask, number>>;
  providers: Array<{
    id: string;
    inputPricePerMillion: number | null;
    outputPricePerMillion: number | null;
    avgInputTokens: number;
    avgOutputTokens: number;
    expectedSuccessRate: number;
    fallbackShare?: number;
  }>;
  cacheHitRate?: number;
  retryRate?: number;
  currency?: string;
};

export function simulateAICost(input: CostSimulatorInput) {
  const requests = Math.max(0, Math.floor(input.requestsPerMonth));
  const cacheHitRate = Math.min(1, Math.max(0, input.cacheHitRate || 0));
  const retryRate = Math.min(3, Math.max(0, input.retryRate || 0));
  const billableRequests = requests * (1 - cacheHitRate);
  const providerRows = input.providers.map((provider) => {
    const known = provider.inputPricePerMillion !== null && provider.outputPricePerMillion !== null;
    const successRate = Math.min(1, Math.max(0.01, provider.expectedSuccessRate));
    const perAttempt = known
      ? (provider.avgInputTokens * provider.inputPricePerMillion!
        + provider.avgOutputTokens * provider.outputPricePerMillion!) / 1_000_000
      : null;
    const attemptsPerRequest = 1 + retryRate + Math.max(0, provider.fallbackShare || 0);
    return {
      provider: provider.id,
      knownPricing: known,
      estimatedCostPerAttemptUsd: perAttempt,
      expectedMonthlyCostUsd: perAttempt === null ? null
        : billableRequests * attemptsPerRequest * perAttempt / successRate,
      expectedSuccessfulRequests: billableRequests * successRate,
    };
  });
  const knownTotal = providerRows.reduce((sum, row) => sum + (row.expectedMonthlyCostUsd ?? 0), 0);
  const unknownPricingProviders = providerRows.filter((row) => !row.knownPricing).map((row) => row.provider);
  return {
    requestsPerMonth: requests,
    billableRequests: Math.round(billableRequests),
    cacheHitRate,
    retryRate,
    currency: input.currency || 'USD',
    providers: providerRows,
    estimatedMonthlyCostUsd: unknownPricingProviders.length ? null : knownTotal,
    unknownPricingProviders,
    disclaimer: 'Forecast only. Actual cost depends on provider tokenization, model pricing, retries, fallback and usage. Free-tier capacity is not guaranteed.',
  };
}

export async function writeAICostAttempt(db: any, input: {
  requestId: string; attempt: number; userId?: string | null; task: AITask;
  provider: string; model: string; usage: AIUsage; inputPricePerMillion: number | null;
  outputPricePerMillion: number | null; outcome: 'success' | 'provider_failed' | 'quality_rejected' | 'budget_blocked' | 'cache_hit';
  durationMs?: number; cacheStatus?: 'hit' | 'miss' | 'bypass'; qualityStatus?: string;
  promptVersion: string; metadata?: Record<string, unknown>;
}) {
  const estimated = calculateAttemptCost({
    usage: input.usage,
    inputPricePerMillion: input.inputPricePerMillion,
    outputPricePerMillion: input.outputPricePerMillion,
  });
  const { error } = await db.from('ai_cost_ledger').insert({
    request_id: input.requestId, attempt: input.attempt, user_id: input.userId || null,
    task: input.task, provider: input.provider, model: input.model,
    input_tokens: input.usage.inputTokens, output_tokens: input.usage.outputTokens,
    input_price_per_million: input.inputPricePerMillion,
    output_price_per_million: input.outputPricePerMillion,
    estimated_cost_usd: estimated, final_cost_usd: estimated,
    outcome: input.outcome, duration_ms: input.durationMs ?? null,
    cache_status: input.cacheStatus || 'miss', quality_status: input.qualityStatus || null,
    prompt_version: input.promptVersion, metadata: input.metadata || {},
  });
  if (error) throw new Error('AI_COST_LEDGER_WRITE_FAILED');
  return estimated;
}
