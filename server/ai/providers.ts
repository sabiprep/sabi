import type { AIProviderConfig, AIProviderName, AIUsage } from './types';

type ProviderRequest = {
  systemInstruction: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
};

export type ProviderResponse = {
  text: string;
  usage: AIUsage;
};

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

async function readJson(response: Response): Promise<any> {
  const body = await response.text();
  let parsed: any;
  try {
    parsed = body ? JSON.parse(body) : {};
  } catch {
    throw new Error(`provider_invalid_json_http_${response.status}`);
  }
  if (!response.ok) {
    const providerMessage = String(parsed?.error?.message || parsed?.message || 'request_failed');
    throw new Error(`provider_http_${response.status}: ${providerMessage.slice(0, 300)}`);
  }
  return parsed;
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return readJson(response);
}

function openAICompatibleUrl(baseUrl: string): string {
  const normalized = baseUrl.replace(/\/+$/, '');
  return normalized.endsWith('/chat/completions') ? normalized : `${normalized}/chat/completions`;
}

function normalizeChatCompletion(data: any): ProviderResponse {
  const text = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!text) throw new Error('provider_empty_response');
  return {
    text,
    usage: {
      inputTokens: numberOrNull(data?.usage?.prompt_tokens ?? data?.usage?.input_tokens),
      outputTokens: numberOrNull(data?.usage?.completion_tokens ?? data?.usage?.output_tokens),
    },
  };
}

export async function invokeProvider(
  provider: AIProviderName,
  config: AIProviderConfig,
  input: ProviderRequest,
): Promise<ProviderResponse> {
  if (!config.apiKey || !config.model) throw new Error('provider_not_configured');

  if (provider === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(config.apiKey)}`;
    const data = await postJson(url, {}, {
      systemInstruction: { parts: [{ text: input.systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
      generationConfig: { temperature: input.temperature, maxOutputTokens: input.maxOutputTokens },
    }, input.timeoutMs);
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((part: any) => typeof part?.text === 'string' ? part.text : '').join('').trim();
    if (!text) throw new Error('provider_empty_response');
    return {
      text,
      usage: {
        inputTokens: numberOrNull(data?.usageMetadata?.promptTokenCount),
        outputTokens: numberOrNull(data?.usageMetadata?.candidatesTokenCount),
      },
    };
  }

  if (provider === 'openai') {
    const data = await postJson('https://api.openai.com/v1/chat/completions', {
      Authorization: `Bearer ${config.apiKey}`,
    }, {
      model: config.model,
      messages: [{ role: 'system', content: input.systemInstruction }, { role: 'user', content: input.prompt }],
      temperature: input.temperature,
      max_tokens: input.maxOutputTokens,
    }, input.timeoutMs);
    return normalizeChatCompletion(data);
  }

  if (provider === 'anthropic') {
    const data = await postJson('https://api.anthropic.com/v1/messages', {
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    }, {
      model: config.model,
      system: input.systemInstruction,
      messages: [{ role: 'user', content: input.prompt }],
      temperature: input.temperature,
      max_tokens: input.maxOutputTokens,
    }, input.timeoutMs);
    const text = (data?.content || [])
      .map((part: any) => typeof part?.text === 'string' ? part.text : '').join('').trim();
    if (!text) throw new Error('provider_empty_response');
    return {
      text,
      usage: {
        inputTokens: numberOrNull(data?.usage?.input_tokens),
        outputTokens: numberOrNull(data?.usage?.output_tokens),
      },
    };
  }

  // Universal OpenAI-compatible adapter: supports gateways and self-hosted
  // inference endpoints without coupling educational logic to a vendor.
  if (!config.baseUrl) throw new Error('provider_base_url_missing');
  const data = await postJson(openAICompatibleUrl(config.baseUrl), {
    Authorization: `Bearer ${config.apiKey}`,
  }, {
    model: config.model,
    messages: [{ role: 'system', content: input.systemInstruction }, { role: 'user', content: input.prompt }],
    temperature: input.temperature,
    max_tokens: input.maxOutputTokens,
  }, input.timeoutMs);
  return normalizeChatCompletion(data);
}

export const AI_PROVIDER_NAMES: AIProviderName[] = ['gemini', 'openai', 'anthropic'];
