import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

function normalizeSupabaseUrl(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const env: Record<string, string | undefined> =
  typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ? (import.meta as unknown as { env: Record<string, string | undefined> }).env
    : {};

const supabaseUrl = normalizeSupabaseUrl(env.VITE_SUPABASE_URL || '');
const supabaseKey = (
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// When environment variables are not configured (e.g. unit tests or unconfigured local builds),
// pass non-routable placeholders so module imports never crash while `isSupabaseConfigured`
// truthfully reports `false`.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://unconfigured.invalid',
  supabaseKey || 'unconfigured-public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Resolves the absolute redirect URL Supabase should send a candidate back to after
 * email confirmation, password recovery, or OAuth.
 * - On Capacitor Android APK, returns the registered custom deep-link scheme `sabi://auth/callback`.
 * - On Web, prefers `VITE_PUBLIC_WEB_URL` / `VITE_PUBLIC_APP_URL`, then falls back to a public
 *   non-localhost browser origin (skipping AI Studio preview proxies).
 */
export function getSabiAuthRedirectUrl(
  path = '/auth/verify',
  options?: { isNativeOverride?: boolean; publicUrlOverride?: string }
): string {
  const isNative =
    typeof options?.isNativeOverride === 'boolean'
      ? options.isNativeOverride
      : typeof Capacitor !== 'undefined' &&
        typeof Capacitor.isNativePlatform === 'function' &&
        Capacitor.isNativePlatform();

  if (isNative) {
    return 'sabi://auth/callback';
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const configuredPublicUrl = (
    options?.publicUrlOverride ??
    env.VITE_PUBLIC_WEB_URL ??
    env.VITE_PUBLIC_APP_URL ??
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  if (
    configuredPublicUrl &&
    /^https?:\/\//i.test(configuredPublicUrl) &&
    !configuredPublicUrl.includes('localhost') &&
    !configuredPublicUrl.includes('127.0.0.1')
  ) {
    return `${configuredPublicUrl}${cleanPath}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const host = window.location.hostname;
    const isPrivateLan =
      host.startsWith('192.168.') ||
      /^10\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    const isPreviewProxy = /^ais-(pre|dev)-/i.test(host);
    const isPublicHost =
      Boolean(host) &&
      host !== 'localhost' &&
      host !== '127.0.0.1' &&
      !isPrivateLan &&
      !isPreviewProxy;
    if (isPublicHost) {
      return `${origin}${cleanPath}`;
    }
  }

  return '';
}

export interface ParsedOAuthCallbackParams {
  code: string;
  accessToken: string;
  refreshToken: string;
  error: string;
  errorDescription: string;
  hasAuthPayload: boolean;
}

/**
 * Extracts Supabase OAuth / email verification parameters from any callback URL,
 * including both Web URLs (`https://sabi-tan.vercel.app/auth/verify#access_token=...`)
 * and Capacitor Android deep links (`sabi://auth/callback?code=...` or `#access_token=...`).
 */
export function extractOAuthParamsFromUrl(rawUrl: string): ParsedOAuthCallbackParams {
  const empty: ParsedOAuthCallbackParams = {
    code: '',
    accessToken: '',
    refreshToken: '',
    error: '',
    errorDescription: '',
    hasAuthPayload: false,
  };
  if (!rawUrl || typeof rawUrl !== 'string') return empty;

  try {
    const qIndex = rawUrl.indexOf('?');
    const hIndex = rawUrl.indexOf('#');

    const queryPart =
      qIndex !== -1
        ? rawUrl.slice(qIndex + 1, hIndex !== -1 && hIndex > qIndex ? hIndex : undefined)
        : '';
    const hashPart = hIndex !== -1 ? rawUrl.slice(hIndex + 1) : '';

    const queryParams = new URLSearchParams(queryPart);
    const hashParams = new URLSearchParams(hashPart);

    const getParam = (key: string): string =>
      (hashParams.get(key) || queryParams.get(key) || '').trim();

    const code = getParam('code');
    const accessToken = getParam('access_token');
    const refreshToken = getParam('refresh_token');
    const error = getParam('error') || getParam('error_code');
    const errorDescription = getParam('error_description');

    const hasAuthPayload = Boolean(code || (accessToken && refreshToken) || error);

    return {
      code,
      accessToken,
      refreshToken,
      error,
      errorDescription,
      hasAuthPayload,
    };
  } catch {
    return empty;
  }
}

/**
 * Exchanges a Supabase OAuth callback URL (`?code=...` or `#access_token=...&refresh_token=...`)
 * into an active persisted Supabase session on both Web and Capacitor Android APK.
 */
export async function completeSupabaseOAuthFromUrl(rawUrl: string): Promise<{
  handled: boolean;
  ok: boolean;
  error?: string;
}> {
  const parsed = extractOAuthParamsFromUrl(rawUrl);
  if (!parsed.hasAuthPayload) {
    return { handled: false, ok: false };
  }

  if (parsed.error) {
    return {
      handled: true,
      ok: false,
      error: parsed.errorDescription || parsed.error || 'Google authentication was cancelled or failed.',
    };
  }

  if (!isSupabaseConfigured) {
    return {
      handled: true,
      ok: false,
      error: 'Supabase authentication is not configured for this build.',
    };
  }

  try {
    if (parsed.accessToken && parsed.refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: parsed.accessToken,
        refresh_token: parsed.refreshToken,
      });
      if (error || !data?.session) {
        return {
          handled: true,
          ok: false,
          error: error?.message || 'Could not establish your SABI session from Google Sign-In.',
        };
      }
      return { handled: true, ok: true };
    }

    if (parsed.code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(parsed.code);
      if (error || !data?.session) {
        // Check if detectSessionInUrl already exchanged the code automatically
        const existing = await supabase.auth.getSession();
        if (existing.data?.session) {
          return { handled: true, ok: true };
        }
        return {
          handled: true,
          ok: false,
          error: error?.message || 'Could not complete Google Sign-In code exchange.',
        };
      }
      return { handled: true, ok: true };
    }
  } catch (err: any) {
    return {
      handled: true,
      ok: false,
      error: err?.message || 'Unexpected error completing Google Sign-In.',
    };
  }

  return { handled: false, ok: false };
}

export interface SabiCandidateProfile {
  id?: string;
  email: string;
  sabi_unique_id: string;
  full_name: string;
  phone: string;
  state_of_origin: string;
  auth_providers: string[];
  onboarding_completed: boolean;
  onboarding_answers?: Record<string, any>;
  registered_subjects?: string[];
  target_score?: number;
  updated_at?: string;
}
