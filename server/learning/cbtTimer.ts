export type CBTSessionTimer = {
  mode?: string | null;
  status?: string | null;
  metadata?: unknown;
};

export function getCBTExpiry(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const examConfiguration = (metadata as Record<string, unknown>).examConfiguration;
  if (!examConfiguration || typeof examConfiguration !== 'object' || Array.isArray(examConfiguration)) return null;
  const expiresAt = (examConfiguration as Record<string, unknown>).expiresAt;
  if (typeof expiresAt !== 'string') return null;
  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function isCBTExpired(session: CBTSessionTimer, now = Date.now()): boolean {
  if (session.mode !== 'cbt' || session.status !== 'in_progress') return false;
  const expiresAt = getCBTExpiry(session.metadata);
  return expiresAt !== null && now >= expiresAt;
}
