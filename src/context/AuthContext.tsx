import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { Navigate, useLocation } from 'react-router-dom';
import { isSupabaseConfigured, supabase, type SabiCandidateProfile } from '../lib/supabase';
import { apiGetJson } from '../utils/apiClient';
import {
  flushOfflineActivityQueue,
  hydrateProgressFromServer,
  scheduleBackgroundActivityFlush,
} from '../utils/activitySyncEngine';
import { saveRealUserProgress } from '../utils/userProgressStore';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  isConfigured: boolean;
  session: Session | null;
  user: User | null;
  profile: SabiCandidateProfile | null;
  onboardingCompleted: boolean;
  refreshProfile: () => Promise<SabiCandidateProfile | null>;
  markOnboardingCompleted: (updatedAnswers?: Record<string, any>, subjects?: string[]) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const ACCOUNT_SCOPED_STORAGE_KEYS = [
  'sabi_active_user_id',
  'sabi_user_signed_in',
  'sabi_user_email',
  'sabi_user_name',
  'sabi_user_phone',
  'sabi_user_state',
  'sabi_unique_id',
  'sabi_auth_provider',
  'sabi_onboarding_completed',
  'sabi_onboarding_v3_answers',
  'sabi_onboarding_v2_answers',
  'sabi_onboarding_v2_10q',
  'sabi_onboarding_wonderland_v3_draft',
  'sabi_onboarding_profile_v1',
  'sabi_onboarding_submission_key',
  'sabi_real_user_progress_v1',
  'sabi_real_progress_v1',
  'sabi_offline_activity_queue_v1',
  'sabi_question_bank_cache_v1',
  'sabi_question_snapshots_v1',
  'sabi_saved_question_ids_v1',
  'sabi_saved_questions_v1',
  'sabi_mistakes_vault_v1',
  'sabi_plan_label',
  'sabi_assistant_threads_v1',
  'sabi_assistant_active_thread_v1',
  'sabi_practice_ai_config_v1',
  'sabi_cbt_last_result_v1',
  'sabi_cbt_mock_history_v1',
  'sabi_custom_practice_config_v1',
  'sabi_custom_practice_history_v1',
  'sabi_diagnostic_baseline_v1',
  'sabi_last_smart_practice_result_v1',
  'sabi_smart_practice_last_result_v1',
  'sabi_notifications_v1',
  'sabi_league_previous_tier_v1',
] as const;

/**
 * Purges every account-scoped localStorage entry so signing out on a shared PC
 * or mobile device never leaks the previous student's profile, progress, or snapshots.
 */
export function clearUserDeviceCache(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of ACCOUNT_SCOPED_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore storage access errors in restricted environments
  }
}

/**
 * Hydrates the device's fast local cache from a real, server-verified Supabase profile.
 * If the signed-in user ID differs from the last cached user on this device, clears
 * stale data first to prevent cross-account bleed.
 */
export function applyProfileToDeviceCache(
  profile: SabiCandidateProfile,
  fallbackEmail?: string
): void {
  if (typeof window === 'undefined') return;
  try {
    const previousUserId = localStorage.getItem('sabi_active_user_id');
    if (profile.id && previousUserId && previousUserId !== profile.id) {
      clearUserDeviceCache();
    }

    const email = (profile.email || fallbackEmail || '').trim().toLowerCase();
    if (profile.id) localStorage.setItem('sabi_active_user_id', profile.id);
    if (email) localStorage.setItem('sabi_user_email', email);
    if (profile.full_name) localStorage.setItem('sabi_user_name', profile.full_name);
    if (profile.phone) localStorage.setItem('sabi_user_phone', profile.phone);
    if (profile.state_of_origin) localStorage.setItem('sabi_user_state', profile.state_of_origin);
    if (profile.sabi_unique_id) localStorage.setItem('sabi_unique_id', profile.sabi_unique_id);
    localStorage.setItem('sabi_user_signed_in', 'true');
    localStorage.setItem(
      'sabi_onboarding_completed',
      profile.onboarding_completed ? 'true' : 'false'
    );

    if (profile.onboarding_answers && typeof profile.onboarding_answers === 'object') {
      const { live_progress, ...onboardingOnly } = profile.onboarding_answers;
      if (Object.keys(onboardingOnly).length > 0) {
        const normalizedOnboarding = {
          ...onboardingOnly,
          ...(Array.isArray(profile.registered_subjects) && profile.registered_subjects.length === 4
            ? { chosenSubjects: profile.registered_subjects }
            : {}),
          ...(profile.full_name ? { fullName: profile.full_name } : {}),
        };
        localStorage.setItem('sabi_onboarding_v3_answers', JSON.stringify(normalizedOnboarding));
        localStorage.setItem('sabi_onboarding_v2_answers', JSON.stringify(normalizedOnboarding));
        localStorage.setItem('sabi_onboarding_v2_10q', JSON.stringify(normalizedOnboarding));
      }
      if (live_progress && typeof live_progress === 'object') {
        saveRealUserProgress(live_progress as any, { skipRemoteSync: true });
      }
    }
  } catch {
    // Ignore storage quota issues
  }
}

/**
 * Validates an optional `?redirect=` query parameter so post-login navigation can ONLY
 * target safe internal app routes (never external URLs, protocol-relative URLs, or auth loops).
 */
export function sanitizeAuthRedirectPath(raw: string | null | undefined, fallback = '/home'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.includes('\\') ||
    /^[a-z]+:/i.test(trimmed) ||
    trimmed.startsWith('/auth') ||
    trimmed === '/welcome' ||
    trimmed === '/'
  ) {
    return fallback;
  }
  return trimmed;
}

/**
 * Pure helper to determine whether a route guard should allow, wait, or redirect.
 */
export function resolveProtectedRouteTarget(params: {
  status: AuthStatus;
  onboardingCompleted: boolean;
  requireOnboarding: boolean;
  currentPath: string;
}): 'loading' | 'allow' | string {
  if (params.status === 'loading') return 'loading';
  if (params.status !== 'authenticated') {
    const safeRedirect = sanitizeAuthRedirectPath(params.currentPath, '/home');
    return `/auth/sign-in?redirect=${encodeURIComponent(safeRedirect)}`;
  }
  if (params.requireOnboarding && !params.onboardingCompleted) {
    return '/onboarding/1';
  }
  return 'allow';
}

function buildFallbackProfileFromUser(user: User): SabiCandidateProfile {
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const email = (user.email || '').trim().toLowerCase();
  const cachedOnboardingCompleted =
    typeof window !== 'undefined' && localStorage.getItem('sabi_onboarding_completed') === 'true';
  return {
    id: user.id,
    email,
    sabi_unique_id:
      (typeof meta.sabi_unique_id === 'string' && meta.sabi_unique_id) ||
      (typeof window !== 'undefined' && localStorage.getItem('sabi_unique_id')) ||
      '',
    full_name:
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) ||
      'Candidate',
    phone: typeof meta.phone === 'string' ? meta.phone : '',
    state_of_origin:
      typeof meta.state_of_origin === 'string' && meta.state_of_origin.trim()
        ? meta.state_of_origin
        : 'Lagos',
    auth_providers: ['email'],
    onboarding_completed: cachedOnboardingCompleted,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    isSupabaseConfigured ? 'loading' : 'unauthenticated'
  );
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<SabiCandidateProfile | null>(null);

  const hydrateProfileForUser = useCallback(async (activeUser: User): Promise<SabiCandidateProfile | null> => {
    try {
      const apiRes = await apiGetJson<{
        status?: string;
        profile?: SabiCandidateProfile;
      }>('/api/profile/me');

      if (apiRes.ok && apiRes.data?.profile) {
        applyProfileToDeviceCache(apiRes.data.profile, activeUser.email);
        setProfile(apiRes.data.profile);
        void hydrateProgressFromServer();
        return apiRes.data.profile;
      }

      // Direct RLS-protected fallback if the Express API is unreachable on mobile/web
      const { data: directProfile } = await supabase
        .from('profiles')
        .select(
          'id, email, sabi_unique_id, full_name, phone, state_of_origin, auth_providers, onboarding_completed, onboarding_answers, registered_subjects, target_score, updated_at'
        )
        .eq('id', activeUser.id)
        .maybeSingle();

      if (directProfile) {
        const typedProfile = directProfile as SabiCandidateProfile;
        applyProfileToDeviceCache(typedProfile, activeUser.email);
        setProfile(typedProfile);
        void hydrateProgressFromServer();
        return typedProfile;
      }
    } catch {
      // Fall through to metadata profile below
    }

    const fallback = buildFallbackProfileFromUser(activeUser);
    applyProfileToDeviceCache(fallback, activeUser.email);
    setProfile(fallback);
    void hydrateProgressFromServer();
    return fallback;
  }, []);

  const refreshProfile = useCallback(async (): Promise<SabiCandidateProfile | null> => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      return null;
    }

    const { data } = await supabase.auth.getSession();
    const activeSession = data?.session ?? null;
    if (!activeSession?.user) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      return null;
    }

    setSession(activeSession);
    setUser(activeSession.user);
    const hydrated = await hydrateProfileForUser(activeSession.user);
    setStatus('authenticated');
    return hydrated;
  }, [hydrateProfileForUser]);

  const markOnboardingCompleted = useCallback(
    (updatedAnswers?: Record<string, any>, subjects?: string[]) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('sabi_onboarding_completed', 'true');
      }
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          onboarding_completed: true,
          ...(updatedAnswers
            ? { onboarding_answers: { ...(prev.onboarding_answers || {}), ...updatedAnswers } }
            : {}),
          ...(subjects ? { registered_subjects: subjects } : {}),
        };
      });
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch {
      // Always clear local session state even if network sign-out fails
    }
    clearUserDeviceCache();
    setSession(null);
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStatus('unauthenticated');
      return;
    }

    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        const activeSession = data?.session ?? null;
        if (activeSession?.user) {
          setSession(activeSession);
          setUser(activeSession.user);
          await hydrateProfileForUser(activeSession.user);
          if (!cancelled) setStatus('authenticated');
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setStatus('unauthenticated');
        }
      } catch {
        if (!cancelled) {
          setSession(null);
          setUser(null);
          setProfile(null);
          setStatus('unauthenticated');
        }
      }
    };

    void bootstrapSession();

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT' || !nextSession?.user) {
        if (event === 'SIGNED_OUT') {
          clearUserDeviceCache();
        }
        setSession(null);
        setUser(null);
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }

      setSession(nextSession);
      setUser(nextSession.user);
      setStatus('authenticated');
      void hydrateProfileForUser(nextSession.user);
    });

    return () => {
      cancelled = true;
      authSubscription?.subscription?.unsubscribe();
    };
  }, [hydrateProfileForUser]);

  // Stage 3: Automatically flush offline study activity events when queued, back online, or app resumes
  useEffect(() => {
    if (status !== 'authenticated' || typeof window === 'undefined') return;

    const handleQueued = () => {
      scheduleBackgroundActivityFlush();
    };
    const handleOnline = () => {
      void hydrateProgressFromServer();
    };
    const handleVisibility = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void flushOfflineActivityQueue();
      }
    };

    window.addEventListener('sabi-activity-queued', handleQueued);
    window.addEventListener('online', handleOnline);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      window.removeEventListener('sabi-activity-queued', handleQueued);
      window.removeEventListener('online', handleOnline);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [status]);

  const onboardingCompleted = useMemo(() => {
    if (profile) return Boolean(profile.onboarding_completed);
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sabi_onboarding_completed') === 'true';
    }
    return false;
  }, [profile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isConfigured: isSupabaseConfigured,
      session,
      user,
      profile,
      onboardingCompleted,
      refreshProfile,
      markOnboardingCompleted,
      signOut,
    }),
    [
      status,
      session,
      user,
      profile,
      onboardingCompleted,
      refreshProfile,
      markOnboardingCompleted,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}

function SabiAuthLoadingScreen() {
  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center px-6 text-center select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
      }}
    >
      <div
        className="w-16 h-16 rounded-[22px] bg-[#6C19E5] text-[#FFE824] flex items-center justify-center font-extrabold text-[26px] animate-bounce mb-4"
        style={{
          fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
          boxShadow: '0 5px 0 #46099E',
        }}
      >
        S
      </div>
      <div
        className="text-[20px] font-bold text-[#260559] tracking-wide"
        style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
      >
        Syncing your SABI account...
      </div>
      <p className="mt-1 text-[13.5px] font-semibold text-[#463266]">
        Loading your JAMB profile and study progress.
      </p>
    </div>
  );
}

/**
 * Protects all authenticated candidate screens. Redirects unauthenticated visitors
 * cleanly to `/auth/sign-in?redirect=<intended-path>` and optionally enforces
 * onboarding completion before entering the study dashboard.
 */
export function RequireAuthRoute({
  children,
  requireOnboarding = true,
}: {
  children: React.ReactElement;
  requireOnboarding?: boolean;
}) {
  const { status, onboardingCompleted } = useAuth();
  const location = useLocation();
  const currentPath = `${location.pathname}${location.search}`;
  const decision = resolveProtectedRouteTarget({
    status,
    onboardingCompleted,
    requireOnboarding,
    currentPath,
  });

  if (decision === 'loading') {
    return <SabiAuthLoadingScreen />;
  }
  if (decision !== 'allow') {
    return <Navigate to={decision} replace />;
  }
  return children;
}

/**
 * Wraps public-only entry screens (`/welcome`, `/auth/sign-in`, `/auth/sign-up`) so
 * already signed-in candidates skip straight into their real dashboard or onboarding.
 */
export function PublicOnlyAuthRoute({ children }: { children: React.ReactElement }) {
  const { status, onboardingCompleted } = useAuth();

  if (status === 'loading') {
    return <SabiAuthLoadingScreen />;
  }
  if (status === 'authenticated') {
    return <Navigate to={onboardingCompleted ? '/home' : '/onboarding/1'} replace />;
  }
  return children;
}
