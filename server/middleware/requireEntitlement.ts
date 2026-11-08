import type { NextFunction, Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { hasEntitlement } from '../billing/entitlements';
import type { AuthenticatedRequest } from './requireAuth';

export function requireEntitlement(entitlementKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required.' });
    try {
      const allowed = await hasEntitlement(supabaseAdmin, userId, entitlementKey);
      if (!allowed) {
        return res.status(403).json({
          error: 'Your current plan does not include this feature.',
          code: 'ENTITLEMENT_REQUIRED',
          entitlement: entitlementKey,
        });
      }
      return next();
    } catch {
      return res.status(503).json({ error: 'Your feature access could not be verified.' });
    }
  };
}
