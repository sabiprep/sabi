import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateAIText, getAIReadiness } from './gateway';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('Sabi AI gateway configuration', () => {
  it('keeps AI disabled unless explicitly enabled', () => {
    delete process.env.SABI_AI_ENABLED;
    expect(getAIReadiness().enabled).toBe(false);
  });

  it('returns an explicit disabled error instead of fabricating a response', async () => {
    delete process.env.SABI_AI_ENABLED;
    await expect(generateAIText({ task: 'explanation', systemInstruction: 'test', prompt: 'test' }))
      .rejects.toMatchObject({ code: 'AI_DISABLED' });
  });

  it('does not mark a native provider ready without both a key and model ID', () => {
    process.env.SABI_AI_ENABLED = 'true';
    process.env.SABI_AI_PROVIDER_ORDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.SABI_GEMINI_MODEL;
    expect(getAIReadiness().configuredProviders).toEqual([]);
    expect(getAIReadiness().missingConfiguration[0].missing).toContain('SABI_GEMINI_MODEL (or task-specific model)');
  });

  it('supports arbitrary OpenAI-compatible provider IDs without exposing credentials', () => {
    process.env.SABI_AI_ENABLED = 'true';
    process.env.SABI_AI_PROVIDER_ORDER = 'openrouter,groq';
    process.env.OPENROUTER_API_KEY = 'secret-openrouter';
    process.env.SABI_OPENROUTER_MODEL = 'free-model';
    process.env.SABI_OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.GROQ_API_KEY = 'secret-groq';
    process.env.SABI_GROQ_MODEL = 'fast-model';
    delete process.env.SABI_GROQ_BASE_URL;

    const readiness = getAIReadiness('explanation');
    expect(readiness.configuredProviders).toEqual(['openrouter']);
    expect(readiness.missingConfiguration[0].provider).toBe('groq');
    expect(JSON.stringify(readiness)).not.toContain('secret-openrouter');
    expect(JSON.stringify(readiness)).not.toContain('secret-groq');
  });

  it('reports configured native providers without exposing credentials', () => {
    process.env.SABI_AI_ENABLED = 'true';
    process.env.SABI_AI_PROVIDER_ORDER = 'gemini,openai';
    process.env.GEMINI_API_KEY = 'secret-test-key';
    process.env.SABI_GEMINI_MODEL = 'test-model';
    process.env.OPENAI_API_KEY = 'another-secret';
    delete process.env.SABI_OPENAI_MODEL;
    const readiness = getAIReadiness('explanation');
    expect(readiness.configuredProviders).toEqual(['gemini']);
    expect(JSON.stringify(readiness)).not.toContain('secret-test-key');
    expect(JSON.stringify(readiness)).not.toContain('another-secret');
  });
});


describe('Sabi AI mock provider readiness', () => {
  it('keeps the mock provider disabled unless explicitly enabled', () => {
    process.env.SABI_AI_PROVIDER_ORDER = 'mock';
    delete process.env.SABI_AI_MOCK_ENABLED;
    expect(getAIReadiness().configuredProviders).toEqual([]);
    expect(getAIReadiness().missingConfiguration[0].missing).toContain('SABI_AI_MOCK_ENABLED=true');
  });

  it('reports an enabled mock provider without requiring or exposing a vendor key', () => {
    process.env.SABI_AI_PROVIDER_ORDER = 'mock';
    process.env.SABI_AI_MOCK_ENABLED = 'true';
    const readiness = getAIReadiness('tutor_chat');
    expect(readiness.configuredProviders).toEqual(['mock']);
    expect(JSON.stringify(readiness)).not.toContain('mock-provider-no-secret');
  });
});
