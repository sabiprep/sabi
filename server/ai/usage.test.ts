import { afterEach, describe, expect, it, vi } from 'vitest';
import { recordAIUsage, refundAIRequestCredits, reserveAIRequestCredits } from './usage';

const originalEnv = { ...process.env };
afterEach(() => { process.env = { ...originalEnv }; });

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

describe('AI credit controls', () => {
  it('leaves credits unenforced until explicitly enabled', async () => {
    delete process.env.SABI_AI_CREDITS_ENABLED;
    const rpc = vi.fn();
    const result = await reserveAIRequestCredits({ rpc }, 'user-1', 'explanation', 'request-12345678');
    expect(result).toEqual({ allowed: true, creditCost: 0, reason: 'credits_disabled' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('returns the atomic reservation decision from the database', async () => {
    process.env.SABI_AI_CREDITS_ENABLED = 'true';
    const rpc = vi.fn(async () => ({
      data: [{ allowed: false, credit_cost: 3, reason: 'insufficient_credits' }],
      error: null,
    }));
    const result = await reserveAIRequestCredits({ rpc }, 'user-1', 'content_draft', 'request-12345678');
    expect(result).toEqual({ allowed: false, creditCost: 3, reason: 'insufficient_credits' });
    expect(rpc).toHaveBeenCalledWith('reserve_ai_credits', {
      p_user_id: 'user-1', p_task: 'content_draft', p_request_id: 'request-12345678',
    });
  });

  it('supports idempotent credit refunds after provider failures', async () => {
    process.env.SABI_AI_CREDITS_ENABLED = 'true';
    const rpc = vi.fn(async () => ({ data: true, error: null }));
    await expect(refundAIRequestCredits({ rpc }, 'user-1', 'request-12345678', 'provider_failed')).resolves.toBe(true);
    expect(rpc).toHaveBeenCalledWith('refund_ai_credits', {
      p_user_id: 'user-1', p_request_id: 'request-12345678', p_reason: 'provider_failed',
    });
  });
});
