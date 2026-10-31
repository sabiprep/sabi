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
 * Resolves a public non-localhost SABI redirect URL for email verification & OAuth links.
 * Prevents links in candidate emails from ever pointing to http://localhost:3000 or https://localhost.
 */
export function getSabiAuthRedirectUrl(path = '/auth/verify'): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const configuredPublicUrl = (
    import.meta.env.VITE_PUBLIC_APP_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    ''
  )
    .trim()
    .replace(/\/+$/, '');

  if (configuredPublicUrl && !configuredPublicUrl.includes('localhost')) {
    return `${configuredPublicUrl}${cleanPath}`;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1' && !host.startsWith('192.168.')) {
      return `${origin}${cleanPath}`;
    }
  }

  return `https://ais-pre-hexoysblc7dzfjy3yyprez-26118416277.europe-west1.run.app${cleanPath}`;
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
