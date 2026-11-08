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
};

export async function recordAIUsage(db: any, entry: AIUsageRecord): Promise<string> {
  const requestId = randomUUID();
  const { error } = await db.from('ai_usage_events').insert({
    user_id: entry.userId,
    request_id: requestId,
    task: entry.task,
    provider: entry.provider,
    model: entry.model,
    prompt_version: entry.promptVersion,
    input_tokens: entry.usage?.inputTokens ?? null,
    output_tokens: entry.usage?.outputTokens ?? null,
    credit_cost: 0,
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
