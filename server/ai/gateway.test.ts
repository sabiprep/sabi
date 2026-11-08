import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAIReadiness } from './gateway';

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

  it('does not mark a provider ready without both a key and model ID', () => {
    process.env.SABI_AI_ENABLED = 'true';
    process.env.SABI_AI_PROVIDER_ORDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-key';
    delete process.env.SABI_GEMINI_MODEL;
    expect(getAIReadiness().configuredProviders).toEqual([]);
    expect(getAIReadiness().missingConfiguration[0].missing).toContain('SABI_GEMINI_MODEL');
  });

  it('reports configured providers without exposing credentials', () => {
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
