import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Copy,
  CheckCircle2,
  Download,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiIronManAssemble } from '../components/common/SabiIronManAssemble';
import {
  SabiWonderlandShell,
  SabiPurpleBookLogo,
  SabiGraduationBooksIllustration,
  FloatingPurpleCube3D,
  FloatingPurpleTorus3D,
} from '../components/common/SabiWonderlandShell';
import { supabase, getSabiAuthRedirectUrl } from '../lib/supabase';
import { apiPostJson, describeApiFailure } from '../utils/apiClient';
import { saveRealUserProgress } from '../utils/userProgressStore';

/**
 * Generates or retrieves a deterministic 5-character SABI Unique ID (4 digits + 1 letter, e.g. "4829K")
 * tied to the normalized email address so Google Auth and Email Auth with the same email
 * always resolve to the exact same account & Unique ID without duplication.
 */
export function getOrGenerateSabiUniqueId(email: string): string {
  const normalized = (email || 'scholar@sabi.ng').trim().toLowerCase();
  const registryRaw =
    typeof window !== 'undefined' ? localStorage.getItem('sabi_email_id_registry') : null;
  let registry: Record<string, string> = {};
  if (registryRaw) {
    try {
      registry = JSON.parse(registryRaw);
    } catch {
      registry = {};
    }
  }

  if (registry[normalized] && /^\d{4}[A-Z]$/.test(registry[normalized])) {
    return registry[normalized];
  }

  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);
  const fourDigits = String((absHash % 9000) + 1000);
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const oneLetter = letters[absHash % letters.length];
  const uniqueId = `${fourDigits}${oneLetter}`;

  registry[normalized] = uniqueId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('sabi_email_id_registry', JSON.stringify(registry));
  }
  return uniqueId;
}

// ==========================================
// SCREEN 1: FULL SCREEN SABI IRON MAN ASSEMBLE
// ==========================================
export function SplashPage() {
  const navigate = useNavigate();

  const handleComplete = async () => {
    const isSigned =
      typeof window !== 'undefined' && localStorage.getItem('sabi_user_signed_in') === 'true';

    if (isSigned) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          navigate('/home');
          return;
        }
        localStorage.removeItem('sabi_user_signed_in');
      } catch {
        navigate('/welcome');
        return;
      }
    }
    navigate('/welcome');
  };

  return (
    <main
      onClick={handleComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060B18] text-white px-4 overflow-hidden select-none cursor-pointer"
      title="Click or tap anywhere to continue"
    >
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center justify-center animate-fade-in">
        <SabiIronManAssemble onComplete={handleComplete} autoCompleteDelay={4000} />
      </div>

      <button
        onClick={e => {
          e.stopPropagation();
          handleComplete();
        }}
        className="absolute bottom-6 text-[11px] font-mono tracking-wider text-slate-500 hover:text-slate-300 transition-colors uppercase py-1 px-3 rounded-lg"
      >
        TAP TO CONTINUE →
      </button>
    </main>
  );
}

// ==========================================
// SCREEN 2: WELCOME TO SABI (IMAGE 1 DESIGN)
// ==========================================
export function WelcomePage() {
  const navigate = useNavigate();

  return (
    <SabiWonderlandShell>
      <main className="w-full flex-1 flex flex-col items-center justify-center px-5 sm:px-8 py-8 sm:py-12">
        <div className="w-full max-w-[410px] sm:max-w-[440px] mx-auto flex flex-col items-center text-center">
          {/* Top SABI Open-Book Logo + Wordmark */}
          <div className="mb-4 sm:mb-5">
            <SabiPurpleBookLogo size="md" to="/welcome" />
          </div>

          {/* Headline: WELCOME TO SABI. */}
          <h1
            className="text-[28px] sm:text-[34px] font-bold tracking-[0.02em] text-[#31006E] leading-tight uppercase"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            WELCOME TO SABI.
          </h1>

          {/* Subheadline: LEARN. CONNECT. GROW. */}
          <p
            className="mt-1.5 text-[15px] sm:text-[17px] font-bold tracking-[0.06em] text-[#31006E] uppercase"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
            }}
          >
            LEARN. CONNECT. GROW.
          </p>

          {/* Center 3D Graduation Cap & Stacked Books Illustration */}
          <div className="w-full my-4 sm:my-6">
            <SabiGraduationBooksIllustration />
          </div>

          {/* Adventure Copy */}
          <p className="text-[15px] sm:text-[16.5px] font-semibold text-[#1E1035] leading-[1.45] max-w-[335px] sm:max-w-[360px] mx-auto mb-7 sm:mb-8">
            Want an adventure into the wonderland of excellent academic performance? You are in the
            right place.
          </p>

          {/* Primary 3D Glossy Purple Pill Button: SIGNUP -> */}
          <button
            type="button"
            onClick={() => navigate('/auth/sign-up')}
            className="w-full py-3.5 sm:py-4 px-8 rounded-full text-white font-bold text-[19px] sm:text-[21px] tracking-[0.04em] uppercase flex items-center justify-center gap-3 cursor-pointer transition-transform duration-150 active:scale-[0.98] hover:brightness-105"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              background: 'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
              boxShadow:
                '0 5px 0 #4A0B9E, 0 12px 24px rgba(92, 17, 194, 0.32), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
            }}
          >
            <span>SIGNUP</span>
            <ArrowRight size={23} strokeWidth={2.6} />
          </button>

          {/* Bottom Link: Already have an account? Sign in */}
          <div className="mt-5 sm:mt-6 text-[15px] sm:text-[16px] font-semibold text-[#1E1035]">
            <span>Already have an account? </span>
            <button
              type="button"
              onClick={() => navigate('/auth/sign-in')}
              className="text-[#5E14C4] font-bold underline decoration-2 underline-offset-4 hover:text-[#3B077E] cursor-pointer transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
      </main>
    </SabiWonderlandShell>
  );
}

// ==========================================
// CUSTOM SOLID PURPLE FORM ICONS (MATCHING IMAGE 2)
// ==========================================
function PurpleUserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0 text-[#5E14C4]"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 3.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM4.5 19.2c0-2.9 3.6-4.7 7.5-4.7s7.5 1.8 7.5 4.7v1.3H4.5v-1.3Z" />
    </svg>
  );
}

function PurpleEnvelopeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0 text-[#5E14C4]"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Zm2.4.5 6.6 5.1L18.6 6H5.4Zm13.6 2.1-6.4 5a1 1 0 0 1-1.2 0L5 8.1V18h14V8.1Z" />
    </svg>
  );
}

function PurplePadlockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 shrink-0 text-[#5E14C4]"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2a5 5 0 0 0-5 5v3H5.5A1.5 1.5 0 0 0 4 11.5v9A1.5 1.5 0 0 0 5.5 22h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 18.5 10H17V7a5 5 0 0 0-5-5Zm-2.5 5a2.5 2.5 0 0 1 5 0v3h-5V7Zm2.5 7.2a1.6 1.6 0 0 1 .8 3v1.8h-1.6v-1.8a1.6 1.6 0 0 1 .8-3Z" />
    </svg>
  );
}

// ==========================================
// SCREEN 3: AUTH PAGE (CREATE ACCOUNT / SIGN IN — IMAGE 2 DESIGN)
// ==========================================
type AuthMode = 'choice' | 'sign-up' | 'sign-in' | 'verify' | 'forgot-password';

export function AuthPage({ mode: initialMode = 'choice' }: { mode?: AuthMode }) {
  const navigate = useNavigate();
  // Map 'choice' directly to 'sign-up' so /auth and /auth/sign-up render the exact Screen 3 design
  const normalizedInitial: AuthMode = initialMode === 'choice' ? 'sign-up' : initialMode;
  const [currentMode, setCurrentMode] = useState<AuthMode>(normalizedInitial);

  useEffect(() => {
    setCurrentMode(initialMode === 'choice' ? 'sign-up' : initialMode);
  }, [initialMode]);

  // Registration & Sign-In fields
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [phoneInput] = useState('+2348000000000');
  const [stateOfOriginInput] = useState('Lagos');

  // Generated 5-character Unique SABI ID (4 numbers + 1 letter)
  const [generatedUniqueId, setGeneratedUniqueId] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);

  // Recovery / Reset Password fields
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // Auth loading & status banner
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{
    type: 'error' | 'success' | 'info';
    message: string;
  } | null>(null);
  const [unconfirmedEmailForResend, setUnconfirmedEmailForResend] = useState<string>('');

  // Syncs a verified Supabase profile into local storage & restores progress
  const applySyncedProfileToLocal = (
    profile: any,
    fallbackEmail: string,
    fallbackName?: string
  ) => {
    const email = (profile?.email || fallbackEmail || '').trim().toLowerCase();
    const uniqueId = profile?.sabi_unique_id || getOrGenerateSabiUniqueId(email);
    const fullName =
      profile?.full_name ||
      fallbackName ||
      localStorage.getItem('sabi_user_name') ||
      'Candidate';
    const phone =
      profile?.phone || phoneInput.trim() || localStorage.getItem('sabi_user_phone') || '';
    const state =
      profile?.state_of_origin ||
      stateOfOriginInput ||
      localStorage.getItem('sabi_user_state') ||
      'Lagos';

    localStorage.setItem('sabi_user_email', email);
    localStorage.setItem('sabi_user_name', fullName);
    localStorage.setItem('sabi_user_phone', phone);
    localStorage.setItem('sabi_user_state', state);
    localStorage.setItem('sabi_unique_id', uniqueId);
    localStorage.setItem('sabi_user_signed_in', 'true');

    if (profile?.onboarding_answers && typeof profile.onboarding_answers === 'object') {
      const { live_progress, ...onboardingOnly } = profile.onboarding_answers;
      if (Object.keys(onboardingOnly).length > 0) {
        localStorage.setItem('sabi_onboarding_v2_10q', JSON.stringify(onboardingOnly));
        localStorage.setItem('sabi_onboarding_v2_answers', JSON.stringify(onboardingOnly));
      }
      if (live_progress && typeof live_progress === 'object') {
        saveRealUserProgress(live_progress);
      }
    }
    return { email, uniqueId, fullName };
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedId = localStorage.getItem('sabi_unique_id');
    const savedMail = localStorage.getItem('sabi_user_email');
    if (savedId && !generatedUniqueId) {
      setGeneratedUniqueId(savedId);
    }
    if (savedMail && !emailInput) {
      setEmailInput(savedMail);
    }

    const hash = window.location.hash || '';
    const search = window.location.search || '';
    const combined = `${hash}&${search}`;

    if (
      combined.includes('access_token=') ||
      combined.includes('verified=true') ||
      combined.includes('error_code=') ||
      combined.includes('type=signup')
    ) {
      window.history.replaceState({}, document.title, window.location.pathname);
      setAuthFeedback({
        type: 'success',
        message:
          '✓ SABI Account Verified! Your candidate profile is confirmed. You can now sign in.',
      });
    }
  }, []);

  const handleResendVerificationEmail = async () => {
    const targetEmail = (unconfirmedEmailForResend || emailInput).trim().toLowerCase();
    if (!targetEmail) return;
    setAuthLoading(true);
    try {
      const redirectTo = getSabiAuthRedirectUrl('/auth/verify');
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        ...(redirectTo ? { options: { emailRedirectTo: redirectTo } } : {}),
      });
      setAuthLoading(false);
      if (error) {
        setAuthFeedback({
          type: 'error',
          message:
            error.message ||
            'Could not verify account right now. Please try signing in again.',
        });
      } else {
        setAuthFeedback({
          type: 'success',
          message: `SABI verification link sent to ${targetEmail}!`,
        });
      }
    } catch (err: any) {
      setAuthLoading(false);
      setAuthFeedback({
        type: 'error',
        message: err?.message || 'Verification request failed.',
      });
    }
  };

  // Handle Create Account form submission
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setUnconfirmedEmailForResend('');

    const normalizedEmail = emailInput.trim().toLowerCase();
    const cleanedName = fullNameInput.trim();
    const cleanedPhone = phoneInput.trim() || '+2348000000000';

    if (!cleanedName || !normalizedEmail) {
      setAuthFeedback({
        type: 'error',
        message: 'Please enter your Full Name and Email Address.',
      });
      return;
    }

    if (!passwordInput || passwordInput.length < 6) {
      setAuthFeedback({
        type: 'error',
        message: 'Your password must be at least 6 characters long.',
      });
      return;
    }

    if (confirmPasswordInput !== passwordInput) {
      setAuthFeedback({
        type: 'error',
        message: 'Passwords do not match. Please confirm your password.',
      });
      return;
    }

    setAuthLoading(true);
    let uniqueId = getOrGenerateSabiUniqueId(normalizedEmail);
    let syncedProfile: any = null;
    let requiresEmailVerification = false;

    try {
      const result = await apiPostJson('/api/auth/register', {
        fullName: cleanedName,
        email: normalizedEmail,
        password: passwordInput,
        phone: cleanedPhone,
        stateOfOrigin: stateOfOriginInput,
        provider: 'email',
      });

      if (result.status === 409) {
        setAuthLoading(false);
        setAuthFeedback({
          type: 'error',
          message:
            result.data?.error ||
            `An account with ${normalizedEmail} is already registered. Please tap "Sign in" below.`,
        });
        return;
      }

      if (!result.ok) {
        const isUnconfiguredOrOffline =
          result.status === 0 ||
          result.status === 503 ||
          result.data?.code === 'API_NOT_CONFIGURED' ||
          result.data?.code === 'API_BOOT_FAILED';

        if (isUnconfiguredOrOffline) {
          const redirectTo = getSabiAuthRedirectUrl('/auth/verify');
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: passwordInput,
            options: {
              ...(redirectTo ? { emailRedirectTo: redirectTo } : {}),
              data: {
                full_name: cleanedName,
                phone: cleanedPhone,
                state_of_origin: stateOfOriginInput,
                sabi_unique_id: uniqueId,
                issuer: 'SABI',
              },
            },
          });

          if (signUpErr) {
            setAuthLoading(false);
            setAuthFeedback({
              type: 'error',
              message:
                signUpErr.message ||
                describeApiFailure(result, 'Could not create your account.'),
            });
            return;
          }

          if (signUpData?.user?.identities && signUpData.user.identities.length === 0) {
            setAuthLoading(false);
            setAuthFeedback({
              type: 'error',
              message: `An account with ${normalizedEmail} is already registered. Please tap "Sign in" below.`,
            });
            return;
          }

          const createdId = signUpData?.user?.id || '';
          uniqueId = signUpData?.user?.user_metadata?.sabi_unique_id || uniqueId;
          requiresEmailVerification = Boolean(
            signUpData?.user && !signUpData?.session && !signUpData?.user?.email_confirmed_at
          );
          syncedProfile = {
            id: createdId,
            email: normalizedEmail,
            sabi_unique_id: uniqueId,
            full_name: cleanedName,
            phone: cleanedPhone,
            state_of_origin: stateOfOriginInput,
            auth_providers: ['email'],
            onboarding_completed: false,
          };
        } else {
          setAuthLoading(false);
          setAuthFeedback({
            type: 'error',
            message: describeApiFailure(result, 'Could not create your account.'),
          });
          return;
        }
      } else {
        const data = result.data || {};
        uniqueId = data.sabi_unique_id || uniqueId;
        syncedProfile = data.profile || null;
        requiresEmailVerification = Boolean(data.requires_email_verification);
      }
    } catch (err: any) {
      setAuthLoading(false);
      setAuthFeedback({
        type: 'error',
        message: `Unable to create your SABI account: ${
          err?.message || 'unexpected client error'
        }. Please try again.`,
      });
      return;
    }

    if (requiresEmailVerification) {
      setAuthLoading(false);
      setUnconfirmedEmailForResend(normalizedEmail);
      setAuthFeedback({
        type: 'info',
        message: `Your SABI account was created. Check ${normalizedEmail} for the verification link, then sign in.`,
      });
      return;
    }

    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: passwordInput,
      });
      if (signInErr) {
        setAuthLoading(false);
        setUnconfirmedEmailForResend(normalizedEmail);
        setAuthFeedback({
          type: 'info',
          message: `Your SABI account was created. Check ${normalizedEmail} for the verification link, then sign in.`,
        });
        return;
      }
    } catch {
      // Session established on next sign in
    }

    if (!syncedProfile) {
      syncedProfile = {
        id: '',
        email: normalizedEmail,
        sabi_unique_id: uniqueId,
        full_name: cleanedName,
        phone: cleanedPhone,
        state_of_origin: stateOfOriginInput,
        auth_providers: ['email'],
        onboarding_completed: false,
      };
    }

    applySyncedProfileToLocal(syncedProfile, normalizedEmail, cleanedName);
    localStorage.setItem('sabi_user_phone', cleanedPhone);
    localStorage.setItem('sabi_user_state', stateOfOriginInput);
    localStorage.setItem('sabi_unique_id', uniqueId);
    localStorage.setItem('sabi_auth_provider', 'email');
    localStorage.setItem('sabi_user_signed_in', 'true');

    setGeneratedUniqueId(uniqueId);
    setAuthLoading(false);
    navigate('/onboarding/1');
  };

  // Copy Unique ID
  const handleCopyUniqueId = () => {
    if (!generatedUniqueId) return;
    navigator.clipboard?.writeText(generatedUniqueId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Download Official SABI Recovery ID Document (.txt)
  const handleDownloadUniqueIdDoc = async () => {
    const idToSave = generatedUniqueId || localStorage.getItem('sabi_unique_id') || '4829K';
    const docContent = [
      '==========================================================',
      '        SABI JAMB CBT - OFFICIAL CANDIDATE RECOVERY DOC   ',
      '==========================================================',
      '',
      `Candidate Full Name : ${fullNameInput || localStorage.getItem('sabi_user_name') || 'Candidate'}`,
      `Registered Email    : ${emailInput || localStorage.getItem('sabi_user_email') || 'scholar@sabi.ng'}`,
      '----------------------------------------------------------',
      `UNIQUE SABI ID      : ${idToSave}`,
      '----------------------------------------------------------',
      '==========================================================',
    ].join('\n');

    try {
      const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SABI-Recovery-ID-${idToSave}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback for mobile WebViews
    }
  };

  // Handle Sign In
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setUnconfirmedEmailForResend('');

    const identifier = emailInput.trim().toLowerCase();
    if (!identifier) {
      setAuthFeedback({
        type: 'error',
        message: 'Please enter your registered email address.',
      });
      return;
    }
    if (!passwordInput) {
      setAuthFeedback({
        type: 'error',
        message: 'Please enter your password to sign in.',
      });
      return;
    }

    setAuthLoading(true);
    let matchedProfile: any = null;
    let resolvedEmail = identifier;
    let authenticatedUserId: string | undefined;
    let signInErrorMessage = '';

    try {
      const loginResult = await apiPostJson('/api/auth/login', {
        identifier,
        password: passwordInput,
        method: 'email',
      });
      if (loginResult.ok && loginResult.data?.auth_user_id) {
        authenticatedUserId = loginResult.data.auth_user_id;
        matchedProfile = loginResult.data.profile || matchedProfile;
        resolvedEmail = matchedProfile?.email || resolvedEmail;
      } else if (loginResult.data?.error) {
        signInErrorMessage = loginResult.data.error;
      } else if (!loginResult.ok) {
        signInErrorMessage = describeApiFailure(loginResult, 'Sign in failed.');
      }
    } catch (err: any) {
      signInErrorMessage = err?.message || 'Sign in failed.';
    }

    if (resolvedEmail) {
      try {
        let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: passwordInput,
        });

        if (
          signInErr &&
          (signInErr.message || '').toLowerCase().includes('email not confirmed')
        ) {
          await new Promise(r => setTimeout(r, 400));
          const retry = await supabase.auth.signInWithPassword({
            email: resolvedEmail,
            password: passwordInput,
          });
          signInData = retry.data;
          signInErr = retry.error;
        }

        if (signInData?.user) {
          authenticatedUserId = signInData.user.id;
          if (!matchedProfile) {
            const { data: profileRow } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', signInData.user.id)
              .maybeSingle();

            if (profileRow) {
              matchedProfile = profileRow;
            } else {
              const fallbackId =
                signInData.user.user_metadata?.sabi_unique_id ||
                getOrGenerateSabiUniqueId(resolvedEmail);
              matchedProfile = {
                id: signInData.user.id,
                email: resolvedEmail,
                sabi_unique_id: fallbackId,
                full_name: signInData.user.user_metadata?.full_name || 'Candidate',
                phone: signInData.user.user_metadata?.phone || '',
                state_of_origin: signInData.user.user_metadata?.state_of_origin || 'Lagos',
                auth_providers: ['email'],
              };
            }
          }
        } else if (signInErr && !authenticatedUserId) {
          const errMsg = (signInErr.message || '').toLowerCase();
          if (errMsg.includes('email not confirmed')) {
            setAuthLoading(false);
            setUnconfirmedEmailForResend(resolvedEmail);
            setAuthFeedback({
              type: 'error',
              message: `Your account (${resolvedEmail}) needs verification. Tap below to resend your link.`,
            });
            return;
          }
          signInErrorMessage =
            'Incorrect email or password. Forgot your password? Tap "Forgot Password?" below.';
        }
      } catch (err: any) {
        if (!authenticatedUserId) {
          signInErrorMessage = err?.message || 'Sign in request failed.';
        }
      }
    }

    if (!authenticatedUserId || !matchedProfile) {
      setAuthLoading(false);
      setAuthFeedback({
        type: 'error',
        message:
          signInErrorMessage ||
          'Account not found or incorrect password. Please check your credentials or Create an Account.',
      });
      return;
    }

    applySyncedProfileToLocal(matchedProfile, matchedProfile.email || resolvedEmail);
    localStorage.setItem('sabi_user_signed_in', 'true');
    setAuthLoading(false);

    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    if (redirectUrl && redirectUrl.startsWith('/')) {
      navigate(redirectUrl);
    } else if (matchedProfile.onboarding_completed === false) {
      navigate('/onboarding/1');
    } else {
      navigate('/home');
    }
  };

  // Handle Password Reset Request
  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(null);

    const cleanIdent = recoveryIdentifier.trim().toLowerCase();
    if (!cleanIdent) {
      setRecoveryFeedback({
        type: 'error',
        message: 'Enter the email address registered on your SABI account.',
      });
      return;
    }

    setAuthLoading(true);
    const requestResult = await apiPostJson('/api/auth/reset-password/request', {
      identifier: cleanIdent,
    });

    if (!requestResult.ok) {
      const isUnconfiguredOrOffline =
        requestResult.status === 0 ||
        requestResult.status === 503 ||
        requestResult.data?.code === 'API_NOT_CONFIGURED' ||
        requestResult.data?.code === 'API_BOOT_FAILED';

      if (isUnconfiguredOrOffline && cleanIdent.includes('@')) {
        const redirectTo = getSabiAuthRedirectUrl('/auth/forgot-password');
        await supabase.auth.resetPasswordForEmail(cleanIdent, {
          ...(redirectTo ? { redirectTo } : {}),
        });
        setAuthLoading(false);
        setRecoveryStep('confirm');
        setRecoveryFeedback({
          type: 'success',
          message:
            'If that account exists, a 6-digit recovery code has been emailed to it.',
        });
        return;
      }

      setAuthLoading(false);
      setRecoveryFeedback({
        type: 'error',
        message: describeApiFailure(
          requestResult,
          'Unable to send a recovery code right now.'
        ),
      });
      return;
    }

    setAuthLoading(false);
    setRecoveryStep('confirm');
    setRecoveryFeedback({
      type: 'success',
      message:
        requestResult.data?.message ||
        'If that account exists, a 6-digit recovery code has been emailed to it.',
    });
  };

  const handleRecoveryConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(null);

    const cleanIdent = recoveryIdentifier.trim().toLowerCase();
    const cleanOtp = recoveryOtp.replace(/\D/g, '');

    if (!cleanIdent.includes('@')) {
      setRecoveryFeedback({
        type: 'error',
        message: 'Enter the email address that received the recovery code.',
      });
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setRecoveryFeedback({
        type: 'error',
        message: 'Enter the 6-digit recovery code from your email.',
      });
      return;
    }

    if (!newResetPassword || newResetPassword.length < 6) {
      setRecoveryFeedback({
        type: 'error',
        message: 'Your new password must be at least 6 characters long.',
      });
      return;
    }

    setAuthLoading(true);
    const confirmResult = await apiPostJson('/api/auth/reset-password/confirm', {
      email: cleanIdent,
      otp: cleanOtp,
      newPassword: newResetPassword,
    });

    if (!confirmResult.ok || confirmResult.data?.verified === false) {
      const isUnconfiguredOrOffline =
        confirmResult.status === 0 ||
        confirmResult.status === 503 ||
        confirmResult.data?.code === 'API_NOT_CONFIGURED' ||
        confirmResult.data?.code === 'API_BOOT_FAILED';

      if (isUnconfiguredOrOffline) {
        const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
          email: cleanIdent,
          token: cleanOtp,
          type: 'recovery',
        });

        if (verifyErr || !verifyData?.user) {
          setAuthLoading(false);
          setRecoveryFeedback({
            type: 'error',
            message: 'That recovery code is invalid or has expired.',
          });
          return;
        }

        const { error: updateErr } = await supabase.auth.updateUser({
          password: newResetPassword,
        });

        if (updateErr) {
          setAuthLoading(false);
          setRecoveryFeedback({
            type: 'error',
            message: updateErr.message || 'Could not update password.',
          });
          return;
        }
      } else {
        setAuthLoading(false);
        setRecoveryFeedback({
          type: 'error',
          message: confirmResult.data?.error
            ? describeApiFailure(
                confirmResult,
                'That recovery code is invalid or has expired.'
              )
            : 'That recovery code is invalid or has expired.',
        });
        return;
      }
    }

    setAuthLoading(false);
    setRecoveryOtp('');
    setNewResetPassword('');
    setRecoveryStep('request');
    setRecoveryFeedback({
      type: 'success',
      message: 'Password updated! Redirecting you to Sign In...',
    });

    setTimeout(() => {
      setRecoveryFeedback(null);
      setCurrentMode('sign-in');
      navigate('/auth/sign-in', { replace: true });
    }, 1500);
  };

  return (
    <SabiWonderlandShell>
      <main className="w-full flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-full max-w-[400px] sm:max-w-[435px] mx-auto flex flex-col items-center">
          {/* 1. Top SABI Open-Book Logo + Wordmark */}
          <div className="mb-3">
            <SabiPurpleBookLogo size="md" to="/welcome" />
          </div>

          {/* 2. Screen Headline + Subtitle with Purple Curved Underline */}
          <div className="text-center mb-5 sm:mb-6">
            <h1
              className="text-[25px] sm:text-[29px] font-bold tracking-[0.02em] text-[#31006E] leading-tight uppercase"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
              }}
            >
              {currentMode === 'sign-up' && 'CREATE YOUR ACCOUNT'}
              {currentMode === 'sign-in' && 'WELCOME BACK'}
              {currentMode === 'verify' && 'YOUR SABI ID IS READY'}
              {currentMode === 'forgot-password' && 'RESET YOUR PASSWORD'}
            </h1>

            <div className="relative inline-block mt-1">
              <p className="text-[13.5px] sm:text-[14.5px] font-bold text-[#22064B]">
                {currentMode === 'sign-up' &&
                  'Your journey to academic excellence starts here.'}
                {currentMode === 'sign-in' &&
                  'Sign in to continue your journey to academic excellence.'}
                {currentMode === 'verify' &&
                  'Keep your permanent 5-character SABI Unique ID safe.'}
                {currentMode === 'forgot-password' &&
                  'We will email you a 6-digit recovery code.'}
              </p>

              {/* Hand-drawn Purple Curved Brush Underline under "to academic" */}
              <svg
                viewBox="0 0 180 14"
                className="w-32 sm:w-36 h-3 mx-auto -mt-0.5 text-[#7C2AE8]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 10 C48 3, 122 3, 174 8"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>

          {/* =============================================================== */}
          {/* 3. FROSTED GLASS AUTH CARD WITH 3D PURPLE CUBE & TORUS RING      */}
          {/* =============================================================== */}
          <div className="relative w-full">
            {/* Soft Warm Ambient Glow Behind Top-Right Cube */}
            <div className="pointer-events-none absolute -top-6 right-2 w-28 h-28 rounded-full bg-[#F59E0B]/30 blur-xl z-0" />

            {/* Floating 3D Purple Cube (Top-Right Corner of Card) */}
            <FloatingPurpleCube3D className="absolute -top-9 -right-3 sm:-right-5 w-[74px] h-[74px] sm:w-[84px] sm:h-[84px] z-20" />

            {/* Floating 3D Glossy Orange Sphere (Middle-Right Edge of Card) */}
            <div
              className="pointer-events-none absolute top-[38%] -right-3.5 sm:-right-4 w-7 h-7 rounded-full z-20"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #FFD180 0%, #FB8C00 55%, #E65100 100%)',
                boxShadow: '0 6px 14px rgba(230, 81, 0, 0.32)',
              }}
            />

            {/* Floating 3D Purple Torus / Donut Ring (Bottom-Left Corner of Card) */}
            <FloatingPurpleTorus3D className="absolute -bottom-5 -left-6 sm:-left-8 w-[76px] h-[76px] sm:w-[86px] sm:h-[86px] z-20" />

            {/* Frosted Translucent Yellow-Glass Card Container */}
            <div
              className="relative z-10 w-full rounded-[28px] px-5 sm:px-7 py-6 sm:py-7 border-[1.5px] border-white/65"
              style={{
                background:
                  'linear-gradient(155deg, rgba(255, 247, 174, 0.78) 0%, rgba(255, 240, 122, 0.68) 100%)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                boxShadow:
                  '0 20px 45px rgba(185, 118, 0, 0.20), inset 0 1.5px 2px rgba(255, 255, 255, 0.75)',
              }}
            >
              {/* Status / Error Feedback Banner */}
              {authFeedback && (
                <div
                  className={`mb-4 p-3 rounded-2xl text-xs font-bold border ${
                    authFeedback.type === 'error'
                      ? 'bg-rose-600/15 border-rose-600/35 text-rose-950'
                      : authFeedback.type === 'success'
                      ? 'bg-emerald-600/15 border-emerald-600/35 text-emerald-950'
                      : 'bg-purple-600/15 border-purple-600/35 text-[#2B055C]'
                  }`}
                >
                  <div>{authFeedback.message}</div>
                  {unconfirmedEmailForResend && (
                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                      disabled={authLoading}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#6E18E0] hover:bg-[#5B10B8] text-white font-bold text-[11px] cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Resend Verification ({unconfirmedEmailForResend})</span>
                    </button>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* MODE A: CREATE YOUR ACCOUNT (IMAGE 2)      */}
              {/* ========================================== */}
              {currentMode === 'sign-up' && (
                <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5">
                  {/* 1. Full Name */}
                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurpleUserIcon />
                      <span>Full Name</span>
                    </label>
                    <input
                      type="text"
                      value={fullNameInput}
                      onChange={e => setFullNameInput(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      className="w-full px-5 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                    />
                  </div>

                  {/* 2. Email Address */}
                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurpleEnvelopeIcon />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full px-5 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                    />
                  </div>

                  {/* 3. Password */}
                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurplePadlockIcon />
                      <span>Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        minLength={6}
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="Create a password"
                        required
                        className="w-full pl-5 pr-12 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-[#7C2AE8] hover:text-[#4C0E9F] cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* 4. Confirm Password */}
                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurplePadlockIcon />
                      <span>Confirm Password</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        minLength={6}
                        value={confirmPasswordInput}
                        onChange={e => setConfirmPasswordInput(e.target.value)}
                        placeholder="Confirm your password"
                        required
                        className="w-full pl-5 pr-12 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(prev => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-[#7C2AE8] hover:text-[#4C0E9F] cursor-pointer"
                        aria-label={
                          showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'
                        }
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* 5. 3D Glossy Purple Pill Button: CREATE ACCOUNT */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3.5 sm:py-4 px-6 rounded-full text-white font-bold text-[17px] sm:text-[18px] tracking-[0.04em] uppercase flex items-center justify-center gap-2 cursor-pointer transition-transform duration-150 active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
                      style={{
                        fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                        background:
                          'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
                        boxShadow:
                          '0 5px 0 #4A0B9E, 0 10px 20px rgba(92, 17, 194, 0.30), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                      }}
                    >
                      <span>{authLoading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================== */}
              {/* MODE B: SIGN IN                            */}
              {/* ========================================== */}
              {currentMode === 'sign-in' && (
                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  {/* 1. Email Address */}
                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurpleEnvelopeIcon />
                      <span>Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={e => setEmailInput(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full px-5 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                    />
                  </div>

                  {/* 2. Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5 pl-1 pr-2">
                      <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B]">
                        <PurplePadlockIcon />
                        <span>Password</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryFeedback(null);
                          setCurrentMode('forgot-password');
                          navigate('/auth/forgot-password', { replace: true });
                        }}
                        className="text-xs font-bold text-[#5E14C4] hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        placeholder="Enter your password"
                        required
                        className="w-full pl-5 pr-12 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(prev => !prev)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-[#7C2AE8] hover:text-[#4C0E9F] cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* 3. 3D Glossy Purple Pill Button: SIGN IN */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={authLoading}
                      className="w-full py-3.5 sm:py-4 px-6 rounded-full text-white font-bold text-[17px] sm:text-[18px] tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 cursor-pointer transition-transform duration-150 active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
                      style={{
                        fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                        background:
                          'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
                        boxShadow:
                          '0 5px 0 #4A0B9E, 0 10px 20px rgba(92, 17, 194, 0.30), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                      }}
                    >
                      <span>{authLoading ? 'SIGNING IN...' : 'SIGN IN'}</span>
                      <ArrowRight size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================== */}
              {/* MODE C: VERIFY / UNIQUE SABI ID ISSUED     */}
              {/* ========================================== */}
              {currentMode === 'verify' && (
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-2xl bg-[#F4EBD0]/95 border border-white/80 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-widest text-[#5E14C4]">
                      YOUR PERMANENT SABI UNIQUE ID
                    </div>
                    <div className="text-3xl font-black font-mono tracking-[0.2em] text-[#22064B]">
                      {generatedUniqueId || '4829K'}
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleCopyUniqueId}
                        className="px-4 py-2 rounded-full bg-white text-[#5E14C4] font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        {copiedId ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadUniqueIdDoc}
                        className="px-4 py-2 rounded-full bg-white text-[#22064B] font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Save .txt</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/onboarding/1')}
                    className="w-full py-3.5 sm:py-4 px-6 rounded-full text-white font-bold text-[17px] tracking-[0.04em] uppercase flex items-center justify-center gap-2 cursor-pointer"
                    style={{
                      fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                      background:
                        'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
                      boxShadow:
                        '0 5px 0 #4A0B9E, 0 10px 20px rgba(92, 17, 194, 0.30), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    <span>CONTINUE</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}

              {/* ========================================== */}
              {/* MODE D: FORGOT PASSWORD                    */}
              {/* ========================================== */}
              {currentMode === 'forgot-password' && recoveryStep === 'request' && (
                <form onSubmit={handleRecoveryRequest} className="space-y-4">
                  {recoveryFeedback && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-bold border ${
                        recoveryFeedback.type === 'success'
                          ? 'bg-emerald-600/15 border-emerald-600/35 text-emerald-950'
                          : 'bg-rose-600/15 border-rose-600/35 text-rose-950'
                      }`}
                    >
                      {recoveryFeedback.message}
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurpleEnvelopeIcon />
                      <span>Registered Email Address</span>
                    </label>
                    <input
                      type="email"
                      value={recoveryIdentifier}
                      onChange={e => setRecoveryIdentifier(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full px-5 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 sm:py-4 px-6 rounded-full text-white font-bold text-[16px] tracking-[0.04em] uppercase cursor-pointer disabled:opacity-60"
                    style={{
                      fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                      background:
                        'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
                      boxShadow:
                        '0 5px 0 #4A0B9E, 0 10px 20px rgba(92, 17, 194, 0.30), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    {authLoading ? 'SENDING CODE...' : 'SEND RECOVERY CODE'}
                  </button>
                </form>
              )}

              {currentMode === 'forgot-password' && recoveryStep === 'confirm' && (
                <form onSubmit={handleRecoveryConfirm} className="space-y-3.5">
                  {recoveryFeedback && (
                    <div
                      className={`p-3 rounded-2xl text-xs font-bold border ${
                        recoveryFeedback.type === 'success'
                          ? 'bg-emerald-600/15 border-emerald-600/35 text-emerald-950'
                          : 'bg-rose-600/15 border-rose-600/35 text-rose-950'
                      }`}
                    >
                      {recoveryFeedback.message}
                    </div>
                  )}

                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <KeyRound size={15} className="text-[#5E14C4]" />
                      <span>6-Digit Recovery Code</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={recoveryOtp}
                      onChange={e => setRecoveryOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      required
                      className="w-full px-5 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[15px] font-mono font-black tracking-widest text-[#22064B] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#22064B] mb-1.5 pl-1">
                      <PurplePadlockIcon />
                      <span>New Password</span>
                    </label>
                    <input
                      type="password"
                      value={newResetPassword}
                      onChange={e => setNewResetPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className="w-full px-5 py-3.5 rounded-full bg-[#F4EBD0]/95 border border-white/70 text-[14px] font-semibold text-[#22064B] placeholder:text-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#7C2AE8]/50 shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3.5 sm:py-4 px-6 rounded-full text-white font-bold text-[16px] tracking-[0.04em] uppercase cursor-pointer disabled:opacity-60"
                    style={{
                      fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                      background:
                        'linear-gradient(180deg, #8F38F8 0%, #711AE3 65%, #5C11C2 100%)',
                      boxShadow:
                        '0 5px 0 #4A0B9E, 0 10px 20px rgba(92, 17, 194, 0.30), inset 0 2px 3px rgba(255, 255, 255, 0.35)',
                    }}
                  >
                    {authLoading ? 'UPDATING...' : 'RESET PASSWORD'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* 4. Bottom Switch Prompt (Already have an account? Sign in / Don't have an account? Sign up) */}
          <div className="mt-5 sm:mt-6 text-[15px] sm:text-[16px] font-bold text-[#22064B] text-center">
            {currentMode === 'sign-up' ? (
              <>
                <span>Already have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthFeedback(null);
                    setCurrentMode('sign-in');
                    navigate('/auth/sign-in', { replace: true });
                  }}
                  className="text-[#5E14C4] font-extrabold underline decoration-2 underline-offset-4 hover:text-[#3B077E] cursor-pointer transition-colors"
                >
                  Sign in
                </button>
              </>
            ) : (
              <>
                <span>Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthFeedback(null);
                    setCurrentMode('sign-up');
                    navigate('/auth/sign-up', { replace: true });
                  }}
                  className="text-[#5E14C4] font-extrabold underline decoration-2 underline-offset-4 hover:text-[#3B077E] cursor-pointer transition-colors"
                >
                  Sign up
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </SabiWonderlandShell>
  );
}
