import { describe, expect, it, vi } from 'vitest';
import { recordAIUsage } from './usage';

describe('AI usage ledger', () => {
  it('persists token and routing metadata without storing prompts', async () => {
    const insert = vi.fn(async (row: any) => ({ error: null, row }));
    const db = { from: vi.fn(() => ({ insert })) };
    const requestId = await recordAIUsage(db, {
      userId: 'user-123',
      task: 'explanation',
      provider: 'gemini',
      model: 'test-model',
      usage: { inputTokens: 120, outputTokens: 80 },
      outcome: 'success',
      promptVersion: 'verified-explanation-v1',
      durationMs: 800,
    });
    expect(requestId).toBeTruthy();
    expect(db.from).toHaveBeenCalledWith('ai_usage_events');
    const saved = insert.mock.calls[0][0];
    expect(saved).toMatchObject({
      user_id: 'user-123',
      task: 'explanation',
      provider: 'gemini',
      model: 'test-model',
      input_tokens: 120,
      output_tokens: 80,
      credit_cost: 0,
      outcome: 'success',
    });
    expect(saved).not.toHaveProperty('prompt');
    expect(saved).not.toHaveProperty('system_instruction');
  });

  it('fails closed when durable usage recording fails', async () => {
    const db = { from: () => ({ insert: async () => ({ error: { message: 'db unavailable' } }) }) };
    await expect(recordAIUsage(db, {
      userId: 'user-123', task: 'tutor_chat', provider: 'none', model: 'none',
      outcome: 'blocked', promptVersion: 'tutor-chat-v1',
    })).rejects.toThrow('AI_USAGE_RECORD_FAILED');
  });
});
