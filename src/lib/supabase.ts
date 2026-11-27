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
