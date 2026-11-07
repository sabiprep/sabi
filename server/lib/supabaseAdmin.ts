/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The single Supabase admin client used by the API.
 *
 * Phase 0 hardening (defect B3): the old code silently fell back to the public
 * anon key when SUPABASE_SERVICE_ROLE_KEY was missing, which made every
 * privilege check a lie. There is still no anon-key fallback today.
 *
 * Phase 0, second pass: "booting without a key is a hard error" is kept for
 * long-running hosts (`npm start`, Cloud Run, Docker) where a crash shows up in
 * the logs. A *serverless* host (Vercel) turns an import-time throw into a bare
 * `FUNCTION_INVOCATION_FAILED` HTML page: no JSON body, no CORS headers, no hint
 * in the browser - which is how a missing environment variable ended up
 * surfacing as "HTTP 500: A server error has occurred". There this module loads,
 * publishes `SUPABASE_ADMIN_ERROR`, and `configurationGuard` answers privileged
 * routes with a 503 JSON that names the missing variable.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, config } from '../config';

/**
 * Serverless runtimes must never crash on import: Vercel sets `VERCEL=1`,
 * AWS Lambda sets `AWS_LAMBDA_FUNCTION_NAME`, Netlify sets `NETLIFY`.
 */
const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY
);

export const hasServiceRoleKey = Boolean(SUPABASE_SERVICE_ROLE_KEY);

/** Human readable reason why the privileged client is unusable, or `null`. */
export const SUPABASE_ADMIN_ERROR: string | null = !SUPABASE_URL
  ? 'SUPABASE_URL (or VITE_SUPABASE_URL) is not set.'
  : !hasServiceRoleKey
    ? 'SUPABASE_SERVICE_ROLE_KEY is not set.'
    : null;

const MISSING_KEY_HINT =
  'Privileged server operations (auth admin, profile writes) must never run with the public anon key, ' +
  'so there is no fallback. Add it to the hosting environment (Vercel: Project -> Settings -> ' +
  'Environment Variables -> Production) and redeploy.';

if (SUPABASE_ADMIN_ERROR) {
  const message = `[SABI] ${SUPABASE_ADMIN_ERROR} ${MISSING_KEY_HINT}`;

  if (config.isTest) {
    // Tests inject their own mocked client, so a placeholder keeps the module importable.
    console.warn(`${message} (test environment placeholder in use).`);
  } else if (isServerless) {
    // Never crash a function at import time: the browser would only see Vercel's
    // opaque FUNCTION_INVOCATION_FAILED page. configurationGuard answers instead.
    console.error(
      `${message} Serverless host detected, so the API stays up and answers 503 JSON instead of ` +
        'crashing: call GET /api/health to confirm which variables the deployment can see.'
    );
  } else {
    throw new Error(message);
  }
}

/**
 * Placeholders used only when the deployment is misconfigured. `configurationGuard`
 * refuses every privileged route before this client can be touched, so these
 * values are never sent anywhere.
 */
const PLACEHOLDER_SUPABASE_URL = 'https://supabase-not-configured.invalid';
const PLACEHOLDER_SUPABASE_KEY = 'service-role-key-not-configured';

export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL || PLACEHOLDER_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_SUPABASE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type SupabaseAdminClient = typeof supabaseAdmin;
