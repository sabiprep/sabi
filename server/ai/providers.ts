import type { AIProviderConfig, AIProviderName, AIUsage } from './types';

type ProviderRequest = {
  systemInstruction: string;
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  task?: string;
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
  if (provider === 'mock') {
    if (process.env.SABI_AI_MOCK_ENABLED?.trim().toLowerCase() !== 'true') {
      throw new Error('mock_provider_disabled');
    }
    const marker = '[SIMULATED OUTPUT — MOCK PROVIDER; NOT A REAL AI RESPONSE]';
    const task = input.task || 'tutor_chat';
    let text: string;
    if (task === 'explanation') {
      const answer = input.prompt.match(/Verified correct option:\s*([A-D])\s*[—-]\s*([^\n]+)/i);
      text = [
        marker,
        answer
          ? `The verified answer is option ${answer[1]} — ${answer[2].trim()}. This is the answer supplied by the test fixture; the mock does not independently verify its correctness.`
          : 'This is a simulated explanation response. The mock provider cannot verify an answer key.',
        'A real provider would explain the underlying concept, show the reasoning step by step, and address the selected option.',
        'This output is for backend integration testing only and must not be presented as genuine tutoring.',
      ].join('\n\n');
    } else if (task === 'study_plan') {
      text = [marker, 'Day 1 — Review the selected topic and record a baseline.', 'Day 2 — Practise a short question set and review mistakes.', 'Day 3 — Complete a retrieval session and revise weak areas.', 'This synthetic plan validates response handling only; it is not personalized educational advice.'].join('\n');
    } else if (task === 'content_draft') {
      text = [marker, 'SYNTHETIC CONTENT DRAFT — HUMAN REVIEW REQUIRED', 'Question: Which statement best describes the concept being tested?', 'A. First illustrative option', 'B. Second illustrative option', 'C. Third illustrative option', 'D. Fourth illustrative option', 'Answer: A', 'Explanation: This placeholder demonstrates the expected draft workflow. Replace it with a real provider response and verify the answer before publication.'].join('\n');
    } else {
      text = [marker, 'This is a simulated Sabi tutor response used to test the AI request pipeline.', 'The mock provider has received your request and returned a deterministic placeholder. It does not reason over the syllabus or independently check facts.', 'When a real provider is configured, this response path can be replaced without changing the learner-facing API.'].join('\n');
    }
    const inputTokens = Math.ceil((input.systemInstruction.length + input.prompt.length) / 4);
    return { text, usage: { inputTokens, outputTokens: Math.ceil(text.length / 4) } };
  }
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

export const AI_PROVIDER_NAMES: AIProviderName[] = ['gemini', 'openai', 'anthropic', 'mock'];
