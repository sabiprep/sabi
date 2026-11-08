import { randomUUID } from 'node:crypto';
import type { AITask, AIUsage } from './types';

export type AIUsageRecord = {
  userId: string;
  task: AITask;
  provider: string;
  model: string;
  usage?: AIUsage;
  outcome: 'success' | 'provider_failed' | 'blocked';
  promptVersion: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
  requestId?: string;
  creditCost?: number;
};

export async function recordAIUsage(db: any, entry: AIUsageRecord): Promise<string> {
  const requestId = entry.requestId || randomUUID();
  const { error } = await db.from('ai_usage_events').insert({
    user_id: entry.userId,
    request_id: requestId,
    task: entry.task,
    provider: entry.provider,
    model: entry.model,
    prompt_version: entry.promptVersion,
    input_tokens: entry.usage?.inputTokens ?? null,
    output_tokens: entry.usage?.outputTokens ?? null,
    credit_cost: Math.max(0, entry.creditCost || 0),
    estimated_cost: null,
    duration_ms: entry.durationMs ?? null,
    outcome: entry.outcome,
    metadata: entry.metadata || {},
  });
  if (error) {
    console.error('[SABI AI] Durable usage record failed:', error.message);
    throw new Error('AI_USAGE_RECORD_FAILED');
  }
  return requestId;
}

export async function reserveAIRequestCredits(
  db: any,
  userId: string,
  task: AITask,
  requestId: string,
): Promise<{ allowed: boolean; creditCost: number; reason: string }> {
  if (process.env.SABI_AI_CREDITS_ENABLED?.trim().toLowerCase() !== 'true') {
    return { allowed: true, creditCost: 0, reason: 'credits_disabled' };
  }
  const { data, error } = await db.rpc('reserve_ai_credits', {
    p_user_id: userId,
    p_task: task,
    p_request_id: requestId,
  });
  if (error) throw new Error('AI_CREDIT_RESERVATION_FAILED');
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error('AI_CREDIT_RESERVATION_FAILED');
  return {
    allowed: result.allowed === true,
    creditCost: Number(result.credit_cost || 0),
    reason: String(result.reason || 'unknown'),
  };
}

export async function refundAIRequestCredits(
  db: any,
  userId: string,
  requestId: string,
  reason: string,
): Promise<boolean> {
  if (process.env.SABI_AI_CREDITS_ENABLED?.trim().toLowerCase() !== 'true') return false;
  const { data, error } = await db.rpc('refund_ai_credits', {
    p_user_id: userId,
    p_request_id: requestId,
    p_reason: reason,
  });
  if (error) throw new Error('AI_CREDIT_REFUND_FAILED');
  return data === true;
}
