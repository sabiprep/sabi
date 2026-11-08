export async function awardXP(
  db: any,
  input: {
    userId: string;
    eventKey: string;
    referenceType?: string;
    referenceId?: string;
    idempotencyKey: string;
  },
): Promise<{ awarded: boolean; xpDelta: number; reason: string }> {
  const { data, error } = await db.rpc('award_student_xp', {
    p_user_id: input.userId,
    p_event_key: input.eventKey,
    p_reference_type: input.referenceType || null,
    p_reference_id: input.referenceId || null,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw new Error('XP_AWARD_FAILED');
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error('XP_AWARD_FAILED');
  return {
    awarded: result.awarded === true,
    xpDelta: Number(result.xp_delta || 0),
    reason: String(result.reason || 'unknown'),
  };
}

export async function getXPBalance(db: any, userId: string): Promise<number> {
  const { data, error } = await db.from('student_xp_ledger')
    .select('xp_delta')
    .eq('user_id', userId);
  if (error) throw new Error('XP_BALANCE_LOOKUP_FAILED');
  return (data || []).reduce((sum: number, row: { xp_delta: number }) => sum + Number(row.xp_delta || 0), 0);
}
