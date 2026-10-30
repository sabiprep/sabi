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
