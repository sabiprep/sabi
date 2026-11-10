import { afterEach, describe, expect, it, vi } from 'vitest';
import { invokeProvider } from './providers';

const originalMockFlag = process.env.SABI_AI_MOCK_ENABLED;

afterEach(() => {
  if (originalMockFlag === undefined) delete process.env.SABI_AI_MOCK_ENABLED;
  else process.env.SABI_AI_MOCK_ENABLED = originalMockFlag;
  vi.restoreAllMocks();
});

describe('offline SABI mock provider', () => {
  it('returns a visibly simulated deterministic tutor response without a vendor key', async () => {
    process.env.SABI_AI_MOCK_ENABLED = 'true';
    const result = await invokeProvider('mock', {
      name: 'mock',
      apiKey: null,
      model: 'sabi-mock-v1',
      baseUrl: null,
      inputPricePerMillion: 0,
      outputPricePerMillion: 0,
      configured: true,
    }, {
      task: 'tutor_chat',
      systemInstruction: 'You are Sabi.',
      prompt: 'Explain photosynthesis.',
      temperature: 0.2,
      maxOutputTokens: 500,
      timeoutMs: 1000,
    });

    expect(result.text).toContain('SIMULATED OUTPUT');
    expect(result.text).toContain('does not reason over the syllabus');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(result.usage.outputTokens).toBeGreaterThan(0);
  });

  it('blocks mock execution unless the explicit simulation flag is enabled', async () => {
    delete process.env.SABI_AI_MOCK_ENABLED;
    await expect(invokeProvider('mock', {
      name: 'mock', apiKey: null, model: 'sabi-mock-v1', configured: false,
    }, {
      task: 'explanation',
      systemInstruction: 'You are Sabi.',
      prompt: 'Verified correct option: A — 42',
      temperature: 0,
      maxOutputTokens: 300,
      timeoutMs: 1000,
    })).rejects.toThrow('mock_provider_disabled');
  });

  it('labels synthetic question drafts as requiring human review', async () => {
    process.env.SABI_AI_MOCK_ENABLED = 'true';
    const result = await invokeProvider('mock', {
      name: 'mock', apiKey: null, model: 'sabi-mock-v1', configured: true,
    }, {
      task: 'content_draft',
      systemInstruction: 'Generate a draft.',
      prompt: 'Create one practice question.',
      temperature: 0,
      maxOutputTokens: 500,
      timeoutMs: 1000,
    });
    expect(result.text).toContain('SYNTHETIC CONTENT DRAFT');
    expect(result.text).toContain('HUMAN REVIEW REQUIRED');
  });
});
