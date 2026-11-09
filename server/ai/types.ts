export type AIProviderName = string;
export type AITask = 'explanation' | 'tutor_chat' | 'content_draft' | 'study_plan';

export type AIUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type AIProviderResult = {
  text: string;
  provider: AIProviderName;
  model: string;
  usage: AIUsage;
};

export type AIGenerationInput = {
  task: AITask;
  systemInstruction: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
};

export type AIProviderConfig = {
  name: AIProviderName;
  apiKey: string | null;
  model: string | null;
  baseUrl?: string | null;
  inputPricePerMillion?: number | null;
  outputPricePerMillion?: number | null;
  configured: boolean;
};

export class AIUnavailableError extends Error {
  readonly code: 'AI_DISABLED' | 'AI_NOT_CONFIGURED' | 'AI_PROVIDER_FAILED';
  readonly providersTried: AIProviderName[];

  constructor(
    code: 'AI_DISABLED' | 'AI_NOT_CONFIGURED' | 'AI_PROVIDER_FAILED',
    message: string,
    providersTried: AIProviderName[] = [],
  ) {
    super(message);
    this.name = 'AIUnavailableError';
    this.code = code;
    this.providersTried = providersTried;
  }
}
