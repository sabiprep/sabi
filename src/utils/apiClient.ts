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

import { Capacitor } from '@capacitor/core';
import { supabase } from '../lib/supabase';

const DEFAULT_PRODUCTION_API_ORIGIN = 'https://sabi-tan.vercel.app';

/**
 * AI Studio preview hosts (`https://ais-pre-….run.app`, `https://ais-dev-….run.app`)
 * are proxied *static* previews: they answer `/api/*` with `302 → /__cookie_check.html`
 * and an HTML body, never with the Express API. Pointing the app at one is the single
 * most common cause of a "sign-up failed" report, so it is detected explicitly instead
 * of being reported as a generic connectivity problem.
 */
export function isPreviewProxyHost(url: string): boolean {
  const match = /^https?:\/\/([^/:?#]+)/i.exec((url || '').trim());
  return Boolean(match && /^ais-(pre|dev)-/i.test(match[1]));
}

function isNativeCapacitorRuntime(): boolean {
  try {
    return (
      typeof Capacitor !== 'undefined' &&
      typeof Capacitor.isNativePlatform === 'function' &&
      Capacitor.isNativePlatform()
    );
  } catch {
    return false;
  }
}

const RAW_CONFIGURED_API_BASE = (import.meta.env.VITE_API_BASE_URL || '')
  .trim()
  .replace(/\/+$/, '');

const PUBLIC_WEB_FALLBACK_BASE = (
  import.meta.env.VITE_PUBLIC_WEB_URL ||
  import.meta.env.VITE_PUBLIC_APP_URL ||
  DEFAULT_PRODUCTION_API_ORIGIN
)
  .trim()
  .replace(/\/+$/, '');

/**
 * The effective API base URL:
 * - Uses `VITE_API_BASE_URL` when explicitly configured.
 * - On Capacitor Android/iOS (`https://localhost` WebView), automatically falls back to
 *   `VITE_PUBLIC_WEB_URL` or `https://sabi-tan.vercel.app` so native APK API calls never
 *   hit the local WebView asset server.
 * - On Web, defaults to `''` (same-origin `/api/*`).
 */
export function getApiBaseUrl(): string {
  if (RAW_CONFIGURED_API_BASE) return RAW_CONFIGURED_API_BASE;
  if (isNativeCapacitorRuntime()) {
    return PUBLIC_WEB_FALLBACK_BASE || DEFAULT_PRODUCTION_API_ORIGIN;
  }
  return '';
}

if (RAW_CONFIGURED_API_BASE && isPreviewProxyHost(RAW_CONFIGURED_API_BASE)) {
  console.warn(
    `[SABI] VITE_API_BASE_URL points at an AI Studio preview proxy (${RAW_CONFIGURED_API_BASE}). ` +
      'That host does not serve the SABI API: /api/* is answered with an HTML redirect to ' +
      '__cookie_check.html. Rebuild with VITE_API_BASE_URL empty (same-origin deployment) or ' +
      'set it to the host that runs server.ts.'
  );
}

/**
 * Absolute URLs pass through untouched. Relative `/api/...` paths get the
 * configured base prefix, except when that base is this very origin (in which
 * case the relative path is already correct and no cross-origin call is needed).
 */
export function resolveApiUrl(input: string, base: string = getApiBaseUrl()): string {
  if (/^https?:\/\//i.test(input)) return input;
  const normalizedBase = (base || '').trim().replace(/\/+$/, '');
  if (!normalizedBase) return input;

  if (typeof window !== 'undefined' && window.location?.origin) {
    let baseOrigin = normalizedBase;
    try {
      baseOrigin = new URL(normalizedBase).origin;
    } catch {
      // Not an absolute URL: fall through and use it as a prefix.
    }
    if (baseOrigin === window.location.origin) return input;
  }

  return `${normalizedBase}${input.startsWith('/') ? '' : '/'}${input}`;
}


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
 * `fetch` wrapper that attaches the caller's bearer token and resolves the API
 * base URL. Behaviour is otherwise identical, so existing call sites keep working.
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

  return fetch(resolveApiUrl(input), { ...init, headers });
}

/** Outcome of a JSON API call, with enough detail to explain a failure. */
export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  /** Response `content-type` ('' when the request never completed). */
  contentType: string;
  /** First ~140 characters of a non-JSON body, for diagnostics. */
  snippet: string;
  /** The absolute URL that was called. */
  url: string;
  /** Set when `fetch` itself failed (offline, DNS, CORS block, timeout). */
  networkError?: string;
}

function summarizeSnippet(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, 140);
}

async function apiRequestJson<T = any>(
  input: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  payload?: unknown
): Promise<ApiResult<T>> {
  const url = resolveApiUrl(input);

  let response: Response;
  try {
    const init: RequestInit = { method };
    if (payload !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(payload);
    }
    response = await apiFetch(input, init);
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      contentType: '',
      snippet: '',
      url,
      networkError: err?.message || 'Network request failed',
    };
  }

  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const rawBody = await response.text().catch(() => '');

  let data: any = null;
  try {
    data = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
    contentType,
    snippet: data ? '' : summarizeSnippet(rawBody),
    url,
  };
}

/**
 * Fetches JSON with the authenticated Supabase Bearer token and never throws on transport failure.
 */
export function apiGetJson<T = any>(input: string): Promise<ApiResult<T>> {
  return apiRequestJson<T>(input, 'GET');
}

/**
 * Posts JSON and never throws for transport failures: the caller gets a
 * structured result so the UI can explain what actually went wrong.
 */
export function apiPostJson<T = any>(input: string, payload: unknown): Promise<ApiResult<T>> {
  return apiRequestJson<T>(input, 'POST', payload);
}

/**
 * Sends an authenticated PATCH JSON request and returns a structured result.
 */
export function apiPatchJson<T = any>(input: string, payload: unknown): Promise<ApiResult<T>> {
  return apiRequestJson<T>(input, 'PATCH', payload);
}

/**
 * Turns an `ApiResult` into a message a candidate (or a developer on support)
 * can act on. Never returns the old "check your internet connection" line
 * without the underlying reason attached.
 */
export function describeApiFailure(result: ApiResult, fallback: string): string {
  if (result.networkError) {
    return `${fallback} The SABI API could not be reached at ${result.url} (${result.networkError}). Check your connection, the API deployment and ALLOWED_ORIGINS.`;
  }

  // Deployment-side failures get a candidate-safe sentence first, then the
  // technical detail, so a candidate is not shown "FUNCTION_INVOCATION_FAILED"
  // while support still learns exactly which variable is missing.
  const code = typeof result.data?.code === 'string' ? result.data.code : '';

  if (code === 'API_NOT_CONFIGURED') {
    const missing = Array.isArray(result.data?.missing)
      ? result.data.missing.filter((name: unknown) => typeof name === 'string').join(', ')
      : '';

    return (
      `${fallback} The SABI API is running but not fully configured` +
      `${missing ? ` (missing ${missing})` : ''}, so nothing was saved. ` +
      'This is a deployment issue rather than a problem with your account - please report it and try again once it is fixed. ' +
      'GET /api/health confirms which variables the deployment can see.'
    );
  }

  if (code === 'API_BOOT_FAILED') {
    return (
      `${fallback} The SABI API failed to start on this deployment, so nothing was saved. ` +
      'This is a deployment issue rather than a problem with your account - please report it and try again once it is fixed. ' +
      'Check the deployment logs for the [SABI] boot error.'
    );
  }

  const serverMessage = typeof result.data?.error === 'string' ? result.data.error : '';
  const issues = Array.isArray(result.data?.details)
    ? result.data.details
        .map((issue: { message?: string }) => issue?.message)
        .filter(Boolean)
        .slice(0, 3)
        .join(' ')
    : '';

  if (serverMessage) {
    return `${fallback} ${serverMessage}${issues ? ` (${issues})` : ''}`.trim();
  }

  const looksLikeHtml =
    result.contentType.includes('text/html') || /^<!doctype html/i.test(result.snippet);

  if (looksLikeHtml) {
    if (isPreviewProxyHost(result.url)) {
      return `${fallback} ${result.url} is an AI Studio preview proxy, not the SABI API: it answers /api/* with an HTML redirect to __cookie_check.html. Serve /api/* from server.ts on the app's own origin, or set VITE_API_BASE_URL to the real API host, then rebuild the client.`;
    }
    if (result.status >= 500) {
      return `${fallback} The SABI API at ${result.url} returned a hosting error page (HTTP ${result.status}), which usually means the server failed to start or crashed (missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL). Check ${result.url.replace(/\/api\/.*$/, '')}/api/health and the server logs.`;
    }
    return `${fallback} The server answered HTTP ${result.status} with an HTML page instead of the SABI API at ${result.url}. Either the API is not served from this host (set VITE_API_BASE_URL to the API host) or /api is falling through to the SPA.`;
  }

  return `${fallback} (HTTP ${result.status}${result.snippet ? `: ${result.snippet}` : ''})`;
}
