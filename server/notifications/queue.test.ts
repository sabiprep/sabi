import { describe, expect, it, vi } from 'vitest';
import { enqueueNotification, renderNotificationTemplate } from './queue';

describe('notification queue helpers', () => {
  it('renders only named payload placeholders without evaluating expressions', () => {
    expect(renderNotificationTemplate('Hello {{ student.name }}. {{missing}}', {
      student: { name: 'Ada' },
    })).toBe('Hello Ada. ');
  });

  it('enqueues idempotently and returns the existing job after a unique conflict', async () => {
    const insert = vi.fn(() => ({
      select: () => ({ single: async () => ({ data: null, error: { code: '23505' } }) }),
    }));
    const select = vi.fn(() => ({
      eq: () => ({ maybeSingle: async () => ({ data: { id: 'existing-job' }, error: null }) }),
    }));
    const db = { from: vi.fn((table: string) => table === 'notification_queue' ? { insert, select } : {}) };
    const result = await enqueueNotification(db, {
      userId: 'user-1',
      channel: 'in_app',
      notificationKey: 'weekly_summary',
      idempotencyKey: 'weekly_summary:user-1:2026-11-08',
      payload: { title: 'Weekly summary', body: 'Your progress is ready.' },
    });
    expect(result).toEqual({ id: 'existing-job', reused: true });
    expect(db.from).toHaveBeenCalledWith('notification_queue');
  });
});
