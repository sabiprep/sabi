import { describe, expect, it } from 'vitest';
import { addBillingPeriod } from './period';

describe('subscription billing periods', () => {
  it('clamps month-end dates instead of rolling into the following month', () => {
    expect(addBillingPeriod(new Date('2026-01-31T12:00:00.000Z'), 'monthly')?.toISOString())
      .toBe('2026-02-28T12:00:00.000Z');
  });

  it('preserves leap-day anniversary semantics', () => {
    expect(addBillingPeriod(new Date('2028-02-29T00:00:00.000Z'), 'yearly')?.toISOString())
      .toBe('2029-02-28T00:00:00.000Z');
  });

  it('does not assign an expiry to a one-time purchase', () => {
    expect(addBillingPeriod(new Date('2026-11-08T00:00:00.000Z'), 'one_time')).toBeNull();
  });

  it('rejects unknown intervals', () => {
    expect(() => addBillingPeriod(new Date(), 'weekly')).toThrow('SUBSCRIPTION_INTERVAL_UNSUPPORTED');
  });
});
