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

function providerConfig(name: AIProviderName, task: AIGenerationInput['task']): AIProviderConfig {
  const upper = name.toUpperCase();
  const taskKey = task.toUpperCase();
  const apiKey = process.env[`${upper}_API_KEY`]?.trim() || null;
  const model = process.env[`SABI_${upper}_${taskKey}_MODEL`]?.trim()
    || process.env[`SABI_${upper}_MODEL`]?.trim()
    || null;
  return { name, apiKey, model, configured: Boolean(apiKey && model) };
}

function providerOrder(task: AIGenerationInput['task']): AIProviderName[] {
  const taskSpecific = process.env[`SABI_AI_${task.toUpperCase()}_PROVIDER_ORDER`];
  const raw = taskSpecific || process.env.SABI_AI_PROVIDER_ORDER || 'gemini,openai,anthropic';
  const parsed = raw.split(',').map((item) => item.trim().toLowerCase())
    .filter((item): item is AIProviderName => AI_PROVIDER_NAMES.includes(item as AIProviderName));
  return [...new Set(parsed)];
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
        ...(!provider.model ? [`SABI_${provider.name.toUpperCase()}_MODEL (or SABI_${provider.name.toUpperCase()}_${task.toUpperCase()}_MODEL)`] : []),
      ],
    })),
  };
}

export async function generateAIText(input: AIGenerationInput): Promise<AIProviderResult> {
  if (!enabled(process.env.SABI_AI_ENABLED)) {
    throw new AIUnavailableError('AI_DISABLED', 'AI features are currently disabled.');
  }

  const order = providerOrder(input.task);
  const configured = order.map((name) => providerConfig(name, input.task))
    .filter((provider) => provider.configured);
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
      // Provider errors are deliberately not returned to clients. Continue to
      // the next configured provider; core learning never depends on this path.
      console.warn(`[SABI AI] ${config.name} provider failed:`, error instanceof Error ? error.message : 'unknown_error');
    }
  }

  throw new AIUnavailableError(
    'AI_PROVIDER_FAILED',
    'All configured AI providers are temporarily unavailable.',
    failures,
  );
}
