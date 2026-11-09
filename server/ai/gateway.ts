import { AI_PROVIDER_NAMES, invokeProvider } from './providers';
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

export async function generateAIText(input: AIGenerationInput): Promise<AIProviderResult> {
  if (!enabled(process.env.SABI_AI_ENABLED)) {
    throw new AIUnavailableError('AI_DISABLED', 'AI features are currently disabled.');
  }

  const configured = providerOrder(input.task).map((name) => providerConfig(name, input.task))
    .filter((provider) => provider.configured)
    .sort((a, b) => estimateCost(a, input) - estimateCost(b, input));
  if (!configured.length) {
    throw new AIUnavailableError('AI_NOT_CONFIGURED', 'No AI provider is fully configured.');
  }

  const failures: AIProviderName[] = [];
  for (const config of configured) {
    try {
      const result = await invokeProvider(config.name, config, {
        systemInstruction: input.systemInstruction,
        prompt: input.prompt,
        temperature: input.temperature ?? 0.3,
        maxOutputTokens: input.maxOutputTokens ?? 900,
        timeoutMs: input.timeoutMs ?? 8000,
      });
      return { ...result, provider: config.name, model: config.model! };
    } catch (error) {
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
