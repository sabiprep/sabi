import { describe, expect, it, vi } from 'vitest';
import { awardXP, getXPBalance } from './service';

describe('gamification service', () => {
  it('awards XP only through the database rule and idempotency function', async () => {
    const rpc = vi.fn(async () => ({
      data: [{ awarded: true, xp_delta: 15, reason: 'awarded' }],
      error: null,
    }));
    const result = await awardXP({ rpc }, {
      userId: 'user-1',
      eventKey: 'correct_answer',
      referenceType: 'learning_session_items',
      referenceId: 'answer-1',
      idempotencyKey: 'answer:session-1:question-1',
    });
    expect(result).toEqual({ awarded: true, xpDelta: 15, reason: 'awarded' });
    expect(rpc).toHaveBeenCalledWith('award_student_xp', {
      p_user_id: 'user-1',
      p_event_key: 'correct_answer',
      p_reference_type: 'learning_session_items',
      p_reference_id: 'answer-1',
      p_idempotency_key: 'answer:session-1:question-1',
    });
  });

  it('calculates XP balance from the append-only ledger', async () => {
    const select = vi.fn(() => ({
      eq: async () => ({ data: [{ xp_delta: 10 }, { xp_delta: 5 }, { xp_delta: -2 }], error: null }),
    }));
    const db = { from: vi.fn(() => ({ select })) };
    await expect(getXPBalance(db, 'user-1')).resolves.toBe(13);
  });
});
