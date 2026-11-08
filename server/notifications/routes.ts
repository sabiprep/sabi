import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate';
import { dispatchNotificationBatch } from './worker';

const router = Router();
const dispatchSchema = z.strictObject({ limit: z.number().int().min(1).max(100).default(25) });

function secretMatches(received: string | undefined, expected: string | undefined): boolean {
  if (!received || !expected) return false;
  const left = Buffer.from(received);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

router.post('/dispatch', validateBody(dispatchSchema), async (req, res) => {
  const expected = process.env.NOTIFICATION_WORKER_SECRET?.trim();
  const received = req.get('x-sabi-notification-secret');
  if (!secretMatches(received, expected)) {
    return res.status(401).json({ error: 'Invalid notification worker credentials.' });
  }
  try {
    const result = await dispatchNotificationBatch((req.body as z.infer<typeof dispatchSchema>).limit);
    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error('[SABI NOTIFICATIONS] Worker batch failed:', error instanceof Error ? error.name : 'unknown_error');
    return res.status(503).json({ error: 'Notification dispatch is temporarily unavailable.' });
  }
});

export default router;
