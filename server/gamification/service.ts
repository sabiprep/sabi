export type StudyStreak = {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  timezone: string;
  activityRecorded: boolean;
};

export async function recordStudyActivity(db: any, userId: string, timezone = 'UTC'): Promise<StudyStreak> {
  const { data, error } = await db.rpc('record_student_study_activity', {
    p_user_id: userId,
    p_timezone: timezone,
  });
  if (error) throw new Error('STUDY_STREAK_UPDATE_FAILED');
  const result = Array.isArray(data) ? data[0] : data;
  if (!result) throw new Error('STUDY_STREAK_UPDATE_FAILED');
  return {
    currentStreak: Number(result.current_streak || 0),
    longestStreak: Number(result.longest_streak || 0),
    lastActivityDate: result.last_activity_date || null,
    timezone: String(result.timezone || timezone),
    activityRecorded: result.activity_recorded === true,
  };
}

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
