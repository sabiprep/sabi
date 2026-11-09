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
