/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Role-based authorization. Must be mounted after `requireAuth`.
 *
 * Roles land on public.profiles.role (Phase 0 migration). When the role cannot
 * be resolved the request fails closed as STUDENT, so a database problem can
 * never silently elevate a candidate.
 */

import type { RequestHandler } from 'express';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import type { AuthenticatedRequest } from './requireAuth';

export const ROLES = [
  'STUDENT',
  'SUPPORT',
  'ANALYST',
  'CONTENT_MANAGER',
  'ADMIN',
  'MASTER_ADMIN',
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'STUDENT';

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

/** Reads the caller's role from public.profiles, defaulting to STUDENT. */
export async function resolveUserRole(userId: string): Promise<Role> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[SABI] Could not resolve account role, failing closed as STUDENT:', error.message);
    return DEFAULT_ROLE;
  }

  const role = (data as { role?: unknown } | null)?.role;
  return isRole(role) ? role : DEFAULT_ROLE;
}

/**
 * Allows only the listed roles. Returns 403 for any other authenticated caller.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return async (req, res, next) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    const role = await resolveUserRole(authReq.user.id);
    authReq.role = role;

    if (!allowed.includes(role)) {
      res.status(403).json({
        error: 'Your account does not have permission to perform this action.',
        required_roles: allowed,
      });
      return;
    }

    next();
  };
}
