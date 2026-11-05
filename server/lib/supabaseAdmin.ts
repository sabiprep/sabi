/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The single Supabase admin client used by the API.
 *
 * Phase 0 hardening (defect B3): the old code silently fell back to the public
 * anon key when SUPABASE_SERVICE_ROLE_KEY was missing, which made every
 * privilege check a lie. Booting without a service-role key is now a hard error.
 */

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, config } from '../config';

if (!SUPABASE_URL) {
  throw new Error(
    '[SABI] SUPABASE_URL (or VITE_SUPABASE_URL) is not set. The API cannot start without a Supabase project URL.'
  );
}

export const hasServiceRoleKey = Boolean(SUPABASE_SERVICE_ROLE_KEY);

if (!hasServiceRoleKey) {
  if (config.isTest) {
    // Tests inject their own mocked client, so a placeholder keeps the module importable.
    console.warn('[SABI] SUPABASE_SERVICE_ROLE_KEY is not set (test environment placeholder in use).');
  } else {
    throw new Error(
      '[SABI] SUPABASE_SERVICE_ROLE_KEY is not set. Privileged server operations (auth admin, profile writes) ' +
        'must never run with the public anon key. Add the service-role key to your environment before starting the API.'
    );
  }
}

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY || 'service-role-key-not-configured-for-tests',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export type SupabaseAdminClient = typeof supabaseAdmin;
