/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authenticated fetch helper for the SABI API.
 *
 * Phase 0 (defect B1): every privileged API route now identifies the caller from
 * a Supabase access token instead of an `email` in the request body, so all API
 * calls must go through this helper.
 */

import { supabase } from '../lib/supabase';

/** Returns the current Supabase access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * `fetch` wrapper that attaches the caller's bearer token.
 * Behaviour is otherwise identical, so existing call sites keep working.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(input, { ...init, headers });
}

/** Convenience wrapper that posts JSON and tolerates non-JSON error bodies. */
export async function apiPostJson(
  input: string,
  payload: unknown
): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await apiFetch(input, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data: any = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  return { ok: response.ok, status: response.status, data };
}
