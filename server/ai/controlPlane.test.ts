import { describe, expect, it } from 'vitest';
import {
  assertProviderPrivacyAllowed,
  calculateAttemptCost,
  classifyAIData,
  minimizeExternalPayload,
} from './controlPlane';

describe('AI privacy controls', () => {
  it('classifies repeated direct identifiers consistently', () => {
    const input = {
      prompt: 'Contact learner at student@example.com',
      systemInstruction: 'You are a tutor.',
    };
    expect(classifyAIData(input)).toBe('sensitive');
    expect(classifyAIData(input)).toBe('sensitive');
    expect(classifyAIData(input)).toBe('sensitive');
  });

  it('classifies Nigerian phone numbers and learner IDs as sensitive', () => {
    expect(classifyAIData({ prompt: 'Call 08031234567', systemInstruction: '' })).toBe('sensitive');
    expect(classifyAIData({ prompt: 'Student ID: SABI-12345', systemInstruction: '' })).toBe('sensitive');
  });

  it('redacts direct identifiers before external transmission', () => {
    expect(minimizeExternalPayload('Email student@example.com or call 08031234567'))
      .not.toContain('student@example.com');
    expect(minimizeExternalPayload('Email student@example.com or call 08031234567'))
      .not.toContain('08031234567');
  });

  it('fails closed for sensitive payloads and unapproved pseudonymous data', () => {
    expect(() => assertProviderPrivacyAllowed('sensitive', {
      allowExternalPublic: true,
      allowExternalPseudonymous: true,
      allowExternalSensitive: false,
    }, true)).toThrow('AI_PRIVACY_SENSITIVE_PAYLOAD_BLOCKED');
    expect(() => assertProviderPrivacyAllowed('pseudonymous_learner', {
      allowExternalPublic: true,
      allowExternalPseudonymous: false,
      allowExternalSensitive: false,
    }, true)).toThrow('AI_PRIVACY_POLICY_BLOCKED');
  });
});

describe('AI cost accounting', () => {
  it('calculates cost from provider-reported token usage', () => {
    expect(calculateAttemptCost({
      usage: { inputTokens: 1000000, outputTokens: 500000 },
      inputPricePerMillion: 2,
      outputPricePerMillion: 4,
    })).toBe(4);
  });

  it('does not treat missing token usage or pricing as free', () => {
    expect(calculateAttemptCost({
      usage: { inputTokens: null, outputTokens: 100 },
      inputPricePerMillion: 1,
      outputPricePerMillion: 1,
    })).toBeNull();
  });
});


describe('AI cost ledger failed attempts', () => {
  it('persists conservative reserved cost when provider usage is unavailable', async () => {
    const inserted: any[] = [];
    const db = {
      from: () => ({
        insert: async (row: any) => { inserted.push(row); return { error: null }; },
      }),
    };
    const { writeAICostAttempt } = await import('./controlPlane');
    await writeAICostAttempt(db, {
      requestId: '00000000-0000-4000-8000-000000000001',
      attempt: 1,
      task: 'tutor_chat',
      provider: 'openrouter',
      model: 'test-model',
      usage: { inputTokens: null, outputTokens: null },
      inputPricePerMillion: 1,
      outputPricePerMillion: 2,
      outcome: 'provider_failed',
      promptVersion: 'test',
      costOverrideUsd: 0.0042,
    });
    expect(inserted[0].estimated_cost_usd).toBe(0.0042);
    expect(inserted[0].final_cost_usd).toBe(0.0042);
  });
});
