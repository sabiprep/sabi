import { createClient, SupabaseClient } from '@supabase/supabase-js';

function normalizeSupabaseUrl(raw: string): string {
  return (raw || '')
    .trim()
    .replace(/\/rest\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

const DEFAULT_PUBLIC_SUPABASE_URL = 'https://dnrzixaasphxiswjyglj.supabase.co';
const DEFAULT_PUBLIC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRucnppeGFhc3BoeGlzd2p5Z2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTg3MzQsImV4cCI6MjEwODg3NDczNH0.B0SXI_Ds7MaVvtwcBnfQqZl8x8PNKen-UZkYrTnMzk4';

const supabaseUrl = normalizeSupabaseUrl(
  import.meta.env.VITE_SUPABASE_URL || DEFAULT_PUBLIC_SUPABASE_URL
);
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  DEFAULT_PUBLIC_SUPABASE_ANON_KEY
).trim();

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Resolves the absolute app URL Supabase should send a candidate back to after
 * email confirmation or OAuth ('' when this deployment cannot determine one).
 *
 * Phase 0 fix: this used to fall back to `VITE_API_BASE_URL` and finally to an
 * AI Studio preview proxy (`https://ais-pre-….run.app`), which answers with a
 * `/__cookie_check.html` redirect — so every confirmation link led to a dead
 * page. The API base is deliberately not consulted here: it is a different
 * origin from the app. An empty result means "use the Supabase Auth Site URL"
 * (docs/runbooks/phase0-rollout.md §4a), which stays the single source of truth.
 */
export function getSabiAuthRedirectUrl(path = '/auth/verify'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const configuredPublicUrl = (import.meta.env.VITE_PUBLIC_APP_URL || '')
    .trim()
    .replace(/\/+$/, '');

  if (configuredPublicUrl && !configuredPublicUrl.includes('localhost')) {
    return `${configuredPublicUrl}${cleanPath}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const host = window.location.hostname;
    const isPrivateLan =
      host.startsWith('192.168.') || /^10\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);
    const isPublicHost =
      Boolean(host) && host !== 'localhost' && host !== '127.0.0.1' && !isPrivateLan;
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
}
