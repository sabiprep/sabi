export type ActiveEntitlement = {
  entitlement_key: string;
  entitlement_value: unknown;
  starts_at: string;
  expires_at: string | null;
};

export async function listActiveEntitlements(db: any, userId: string, now = new Date()): Promise<ActiveEntitlement[]> {
  const { data, error } = await db.from('student_entitlements')
    .select('entitlement_key, entitlement_value, starts_at, expires_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .lte('starts_at', now.toISOString());
  if (error) throw new Error('ENTITLEMENT_LOOKUP_FAILED');
  return (data || []).filter((row: ActiveEntitlement) =>
    !row.expires_at || new Date(row.expires_at).getTime() > now.getTime()
  );
}

export async function hasEntitlement(db: any, userId: string, entitlementKey: string, now = new Date()): Promise<boolean> {
  const entitlements = await listActiveEntitlements(db, userId, now);
  return entitlements.some((item) => item.entitlement_key === entitlementKey);
}

export async function getAICreditBalance(db: any, userId: string): Promise<number> {
  const { data, error } = await db.from('ai_credit_ledger')
    .select('credits_delta')
    .eq('user_id', userId);
  if (error) throw new Error('AI_CREDIT_BALANCE_LOOKUP_FAILED');
  return (data || []).reduce((sum: number, entry: { credits_delta: number }) => sum + Number(entry.credits_delta || 0), 0);
}
