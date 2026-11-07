/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fails the *request*, not the *process*, when the API is deployed without its
 * Supabase credentials.
 *
 * Why this exists: `server/lib/supabaseAdmin.ts` used to throw while the module
 * was being imported. On a long-running host that is a visible crash; on Vercel
 * it is an opaque `FUNCTION_INVOCATION_FAILED` HTML page, so the sign-up form
 * could only report "HTTP 500: A server error has occurred" and everybody went
 * hunting for a client bug. A 503 JSON carrying the missing variable name is
 * strictly more useful and just as safe: no route runs, so the client is never
 * touched, and no secret is ever included in the response.
 */

import type { RequestHandler } from 'express';
import { config } from '../config';
import { SUPABASE_ADMIN_ERROR } from '../lib/supabaseAdmin';

/** Status used when the deployment itself is incomplete. */
export const CONFIGURATION_STATUS = 503;

export interface ConfigurationFailure {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Pure decision function, so the message contract can be unit tested without
 * booting Express: returns `null` when the deployment is complete.
 */
export function configurationResponse(
  adminError: string | null,
  route = '/api/*'
): ConfigurationFailure | null {
  if (!adminError) return null;

  return {
    status: CONFIGURATION_STATUS,
    body: {
      error:
        `The SABI API is deployed without its Supabase credentials (${adminError}) ` +
        `so ${route} cannot be served.`,
      code: 'API_NOT_CONFIGURED',
      missing: adminError,
      fix:
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for this deployment ' +
        '(Vercel: Project -> Settings -> Environment Variables -> Production), then redeploy. ' +
        'GET /api/health reports supabase_url_configured and service_role_configured.',
    },
  };
}

/**
 * Mounted right after the API rate limiter. `/api/health` stays reachable on
 * purpose: it is the one endpoint that explains which variables are missing.
 */
export const configurationGuard: RequestHandler = (req, res, next) => {
  if (!req.path.startsWith('/api/') || req.path === '/api/health') {
    next();
    return;
  }

  // Tests inject their own Supabase client through vi.mock.
  if (config.isTest) {
    next();
    return;
  }

  const failure = configurationResponse(SUPABASE_ADMIN_ERROR, `${req.method} ${req.path}`);

  if (!failure) {
    next();
    return;
  }

  console.error(
    `[SABI] Refused ${req.method} ${req.path}: ${SUPABASE_ADMIN_ERROR} ` +
      'The API is up but not configured; see GET /api/health.'
  );

  res.set('Cache-Control', 'no-store').status(failure.status).json(failure.body);
};
