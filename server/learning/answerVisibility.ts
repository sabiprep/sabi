export function isCbtFeedbackLocked(mode: string | null | undefined, status: string | null | undefined): boolean {
  return mode === 'cbt' && status === 'in_progress';
}
