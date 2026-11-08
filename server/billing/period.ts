export function addBillingPeriod(start: Date, interval: string): Date | null {
  if (interval === 'one_time') return null;
  const months = interval === 'monthly' ? 1 : interval === 'quarterly' ? 3 : interval === 'yearly' ? 12 : null;
  if (months === null) throw new Error('SUBSCRIPTION_INTERVAL_UNSUPPORTED');
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}
