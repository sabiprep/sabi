/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bearer-token authentication for the SABI API.
 *
 * Phase 0 (defect B1): previously every API route was anonymous and trusted an
 * `email` (or `authUserId`) supplied in the request body. Identity is now
 * derived exclusively from a Supabase access token verified server-side.
 */

import type { Request, RequestHandler } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';

export interface AuthUser {
  id: string;
  email: string;
  /** Raw Supabase user metadata. Display data only: never used for authorization. */
  metadata: Record<string, any>;
  /** Auth-provider identities from Supabase-managed app metadata. */
  providers: string[];
  phone?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  role?: string;
}

/** Extracts the token from an `Authorization: Bearer <token>` header. */
export function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [scheme, ...rest] = header.split(' ');
  if (!scheme || scheme.toLowerCase() !== 'bearer') return null;
  const token = rest.join(' ').trim();
  return token.length > 0 ? token : null;
}

/**
 * Rejects the request with 401 unless a valid Supabase session token is present.
 * On success `req.user` is populated with the verified id and email.
 */
export const requireAuth: RequestHandler = async (req, res, next) => {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required. Send a valid Authorization: Bearer <token> header.' });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    const user = data?.user;
    if (error || !user?.id) {
      res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
      return;
    }
    (req as AuthenticatedRequest).user = {
      id: user.id,
      email: (user.email || '').trim().toLowerCase(),
      metadata: (user.user_metadata || {}) as Record<string, any>,
      providers: Array.isArray(user.app_metadata?.providers)
        ? user.app_metadata.providers.filter((provider: unknown): provider is string =>
            provider === 'email' || provider === 'google'
          )
        : [],
      phone: user.phone || undefined,
    };
    next();
  } catch {
    res.status(401).json({ error: 'Could not validate the session token.' });
  }
};

/**
 * Populates `req.user` when a valid token is present but never rejects the
 * request. Used by endpoints that are public yet benefit from knowing the caller.
 */
export const optionalAuth: RequestHandler = async (req, _res, next) => {
  const token = getBearerToken(req);
  if (token) {
    try {
      const { data } = await supabaseAdmin.auth.getUser(token);
      const user = data?.user;
      if (user?.id) {
        (req as AuthenticatedRequest).user = {
          id: user.id,
          email: (user.email || '').trim().toLowerCase(),
          metadata: (user.user_metadata || {}) as Record<string, any>,
          providers: Array.isArray(user.app_metadata?.providers)
            ? user.app_metadata.providers.filter((provider: unknown): provider is string =>
                provider === 'email' || provider === 'google'
              )
            : [],
          phone: user.phone || undefined,
        };
      }
    } catch {
      // Anonymous access is acceptable for these routes.
    }
  }
  next();
};
