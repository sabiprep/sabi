import React, { useState, useEffect } from 'react';
import { 
  ArrowRight, 
  LockKeyhole, 
  Mail, 
  Phone, 
  ShieldCheck, 
  BookOpenCheck, 
  UserPlus, 
  LogIn, 
  Sun, 
  Moon,
  ChevronRight,
  User,
  MapPin,
  KeyRound,
  Copy,
  CheckCircle2,
  Download,
  Chrome
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';
import { SabiIronManAssemble } from '../components/common/SabiIronManAssemble';
import { supabase, getSabiAuthRedirectUrl } from '../lib/supabase';
import { saveRealUserProgress } from '../utils/userProgressStore';

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

/**
 * Generates or retrieves a deterministic 5-character SABI Unique ID (4 digits + 1 letter, e.g. "4829K")
 * tied to the normalized email address so Google Auth and Email Auth with the same email
 * always resolve to the exact same account & Unique ID without duplication.
 */
export function getOrGenerateSabiUniqueId(email: string): string {
  const normalized = (email || 'scholar@sabi.ng').trim().toLowerCase();
  const registryRaw = typeof window !== 'undefined' ? localStorage.getItem('sabi_email_id_registry') : null;
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

  // Deterministic hash from normalized email so same email always gets same 4 digits + 1 letter
  let hash = 2166136261;
  for (let i = 0; i < normalized.length; i++) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const absHash = Math.abs(hash);
  const fourDigits = String((absHash % 9000) + 1000); // 1000 - 9999
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excludes I and O to avoid confusion with 1 and 0
  const oneLetter = letters[absHash % letters.length];
  const uniqueId = `${fourDigits}${oneLetter}`;

  registry[normalized] = uniqueId;
  if (typeof window !== 'undefined') {
    localStorage.setItem('sabi_email_id_registry', JSON.stringify(registry));
  }
  return uniqueId;
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <Link 
      to="/welcome" 
      className={`inline-flex items-center gap-3 transition-transform hover:scale-[1.02] ${compact ? 'h-8' : 'h-11'}`} 
      aria-label="SABI Home"
    >
      <img src="/sabi-logo.svg" alt="SABI" className="h-full w-auto object-contain" />
    </Link>
  );
}

// ==========================================
// SCREEN 1: FULL SCREEN SABI IRON MAN ASSEMBLE
// ==========================================
export function SplashPage() {
  const navigate = useNavigate();

  const handleComplete = async () => {
    const isSigned = typeof window !== 'undefined' && localStorage.getItem('sabi_user_signed_in') === 'true';
    const savedEmail = typeof window !== 'undefined' ? (localStorage.getItem('sabi_user_email') || '').trim().toLowerCase() : '';

    if (isSigned && savedEmail) {
      try {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id, email, sabi_unique_id')
          .eq('email', savedEmail)
          .maybeSingle();

        if (existingProfile?.email) {
          navigate('/home');
          return;
        } else {
          // Clear any stale localStorage-only session that does not exist in Supabase
          localStorage.removeItem('sabi_user_signed_in');
        }
      } catch {
        navigate('/home');
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
        onClick={(e) => {
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
// SCREEN 2: WELCOME PAGE WITH MAN & WOMAN STUDYING
// ==========================================
export function WelcomePage() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`min-h-[100dvh] w-full max-w-full overflow-x-hidden ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      <header className={`sabi-top-safe-bar px-4 sm:px-6 py-3.5 border-b ${isDark ? 'bg-[#080D1A]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLockup />

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
              }`}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 border shadow-xl overflow-hidden transition-all duration-300 ${
              isDark ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-blue-950/40 border-slate-800' : 'bg-gradient-to-b from-white via-blue-50/40 to-white border-blue-100'
            }`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-full flex items-center justify-center">
                <img 
                  src="/assets/mascots/welcome_students_study.svg" 
                  alt="Nigerian Students Preparing on SABI with Laptops"
                  className="w-full h-auto max-h-[380px] object-contain filter drop-shadow-lg"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-start justify-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-extrabold tracking-wider uppercase text-blue-700 dark:text-blue-300">
              <span>Official JAMB UTME Prep Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Study Smarter.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 dark:from-blue-400 dark:via-blue-300 dark:to-sky-300">
                Score 320+ in JAMB.
              </span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Endless past and recent questions tailored to your 4 subjects. Experience high-speed 60-second Blitz, smart topic mastery, and real-time step-by-step corrections.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} flex items-center gap-2.5`}>
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800/60 font-black"><BookOpenCheck size={16} /></div>
                <div>
                  <h4 className="text-xs font-extrabold">Endless Blitz</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Past & recent questions</p>
                </div>
              </div>
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'} flex items-center gap-2.5`}>
                <div className="p-2 rounded-xl bg-blue-600 text-white font-black"><ShieldCheck size={16} /></div>
                <div>
                  <h4 className="text-xs font-extrabold">Smart Practice</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">4-Subject rotation</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3 pt-2">
              <button
                onClick={() => navigate('/auth/choice')}
                className="w-full py-4 px-6 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-700/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/auth/sign-in')}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm border transition-all cursor-pointer ${
                  isDark 
                    ? 'border-slate-800 bg-slate-900/80 text-slate-200 hover:border-blue-500 hover:bg-blue-950/30 hover:text-blue-300' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 shadow-xs'
                } flex items-center justify-center gap-2`}
              >
                <span>Already have an account? Sign in</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      <footer className={`px-6 py-4 border-t text-center text-xs ${isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <span>SABI © 2026 · Nigeria's Joint Admissions and Matriculation Board UTME CBT Platform</span>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// SCREEN 3: AUTH & CANDIDATE REGISTRATION PAGE
// (WITH SYNCED EMAIL/GOOGLE + 4-DIGIT & 1-LETTER UNIQUE ID)
// ==========================================
type AuthMode = 'choice' | 'sign-up' | 'sign-in' | 'verify' | 'forgot-password';

export function AuthPage({ mode: initialMode = 'choice' }: { mode?: AuthMode }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [currentMode, setCurrentMode] = useState<AuthMode>(initialMode);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  // Registration & Sign-In fields
  const [fullNameInput, setFullNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [stateOfOriginInput, setStateOfOriginInput] = useState('Lagos');
  const [authProvider, setAuthProvider] = useState<'email' | 'google'>('email');

  // Generated 5-character Unique SABI ID (4 numbers + 1 letter)
  const [generatedUniqueId, setGeneratedUniqueId] = useState<string>('');
  const [copiedId, setCopiedId] = useState(false);

  // Recovery / Reset Password fields (requires Unique SABI ID grant)
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryUniqueId, setRecoveryUniqueId] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [recoveryFeedback, setRecoveryFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Auth loading & status banner for both Android APK and Webapp
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(null);

  const [unconfirmedEmailForResend, setUnconfirmedEmailForResend] = useState<string>('');

  // Syncs a verified Supabase profile into local storage & restores progress
  const applySyncedProfileToLocal = (profile: any, fallbackEmail: string, fallbackName?: string) => {
    const email = (profile?.email || fallbackEmail || '').trim().toLowerCase();
    const uniqueId = profile?.sabi_unique_id || getOrGenerateSabiUniqueId(email);
    const fullName = profile?.full_name || fallbackName || localStorage.getItem('sabi_user_name') || 'Candidate';
    const phone = profile?.phone || phoneInput.trim() || localStorage.getItem('sabi_user_phone') || '';
    const state = profile?.state_of_origin || stateOfOriginInput || localStorage.getItem('sabi_user_state') || 'Lagos';

    localStorage.setItem('sabi_user_email', email);
    localStorage.setItem('sabi_user_name', fullName);
    localStorage.setItem('sabi_user_phone', phone);
    localStorage.setItem('sabi_user_state', state);
    localStorage.setItem('sabi_unique_id', uniqueId);
    localStorage.setItem('sabi_user_signed_in', 'true');

    // Restore onboarding answers & live progress if saved in Supabase profile
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

  // Handle incoming verification links / URL callback parameters or initialize saved Unique ID
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
      // Clean URL bar so no broken token or error hash remains visible
      window.history.replaceState({}, document.title, window.location.pathname);

      const targetEmail = (emailInput || savedMail || '').trim().toLowerCase();
      if (targetEmail) {
        fetch('/api/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: targetEmail }),
        }).catch(() => {});
      }

      setAuthFeedback({
        type: 'success',
        message: '✓ SABI Account Verified! Your candidate profile is confirmed. You can now sign in or proceed.',
      });
    }
  }, []);

  // Instant SABI Account Verification (confirms user directly in Supabase Auth via /api/auth/verify)
  const handleResendVerificationEmail = async () => {
    const targetEmail = (unconfirmedEmailForResend || emailInput).trim().toLowerCase();
    if (!targetEmail) return;
    setAuthLoading(true);
    try {
      // 1. Verify directly via SABI Server Admin API so the user doesn't need any email link
      const verifyResp = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const verifyData = await verifyResp.json().catch(() => ({}));

      if (verifyResp.ok && verifyData?.verified) {
        setAuthLoading(false);
        setUnconfirmedEmailForResend('');
        setAuthFeedback({
          type: 'success',
          message: `✓ SABI has verified your account (${targetEmail})! Tap "Sign In to Dashboard" below to continue immediately.`,
        });
        return;
      }

      // 2. Fallback: Resend with public non-localhost SABI URL
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: targetEmail,
        options: {
          emailRedirectTo: getSabiAuthRedirectUrl('/auth/verify'),
        },
      });
      setAuthLoading(false);
      if (error) {
        setAuthFeedback({
          type: 'error',
          message: error.message || 'Could not verify account right now. Please try signing in again.',
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

  // Handle Google Auth Sync (links by email address in Supabase so no duplicate ID is ever created)
  const handleGoogleSync = async (targetNext: 'register' | 'login') => {
    setAuthFeedback(null);
    setUnconfirmedEmailForResend('');

    if (targetNext === 'register') {
      setAuthProvider('google');
      setAuthFeedback({
        type: 'info',
        message: 'Google Gmail sync enabled! Enter your Gmail address, phone number, state of origin, and password below to create your synced SABI account.',
      });
      return;
    }

    const rawEmail = emailInput.trim().toLowerCase();
    if (!rawEmail || !passwordInput) {
      setAuthFeedback({
        type: 'info',
        message: 'Enter your registered Gmail address and password below, then tap "Sign In to Dashboard" (or "Continue with Google") to verify with SABI.',
      });
      return;
    }

    setAuthLoading(true);
    try {
      // Auto-verify via SABI backend first if needed
      await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: rawEmail }),
      }).catch(() => {});

      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: rawEmail,
        password: passwordInput,
      });

      if (signInErr || !signInData?.user) {
        setAuthLoading(false);
        setAuthFeedback({
          type: 'error',
          message: signInErr?.message || 'Google/Email authentication failed. Ensure your Gmail and password are registered.',
        });
        return;
      }

      const uniqueId = getOrGenerateSabiUniqueId(rawEmail);
      const { data: existing } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', rawEmail)
        .maybeSingle();

      const updatedProviders = Array.from(
        new Set([...(existing?.auth_providers || ['email']), 'google'])
      );

      const { data: syncedProfile } = await supabase
        .from('profiles')
        .upsert(
          {
            id: signInData.user.id,
            email: rawEmail,
            sabi_unique_id: existing?.sabi_unique_id || uniqueId,
            full_name: existing?.full_name || signInData.user.user_metadata?.full_name || rawEmail.split('@')[0],
            phone: existing?.phone || signInData.user.user_metadata?.phone || '',
            state_of_origin: existing?.state_of_origin || signInData.user.user_metadata?.state_of_origin || 'Lagos',
            auth_providers: updatedProviders,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('*')
        .maybeSingle();

      applySyncedProfileToLocal(syncedProfile || existing, rawEmail);
      localStorage.setItem('sabi_auth_provider', 'google+email');
      localStorage.setItem('sabi_user_signed_in', 'true');
      setAuthLoading(false);

      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl);
      } else if (syncedProfile && syncedProfile.onboarding_completed === false) {
        navigate('/onboarding/1');
      } else {
        navigate('/home');
      }
    } catch (err: any) {
      setAuthLoading(false);
      setAuthFeedback({
        type: 'error',
        message: err?.message || 'Unable to authenticate with SABI. Please check your connection.',
      });
    }
  };

  // Handle Create Account form submission -> Creates & Immediately Verifies User in Supabase under SABI
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setUnconfirmedEmailForResend('');

    const normalizedEmail = emailInput.trim().toLowerCase();
    const cleanedName = fullNameInput.trim();
    const cleanedPhone = phoneInput.trim();

    if (!cleanedName || !normalizedEmail || !cleanedPhone) {
      setAuthFeedback({
        type: 'error',
        message: 'Please complete your Full Name, Email Address, and Nigerian Phone Number.',
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

    setAuthLoading(true);
    let uniqueId = getOrGenerateSabiUniqueId(normalizedEmail);
    let syncedProfile: any = null;
    let authUserId: string | undefined;
    let lastErrorMessage = '';

    // 1. Primary Path: Call SABI Backend /api/auth/register FIRST!
    //    This creates the user via supabaseAdmin.auth.admin.createUser({ email_confirm: true })
    //    so the candidate is immediately verified under SABI and Supabase NEVER sends a "Supabase"
    //    email with a broken localhost:3000 link!
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: cleanedName,
          email: normalizedEmail,
          password: passwordInput,
          phone: cleanedPhone,
          stateOfOrigin: stateOfOriginInput,
          provider: authProvider === 'google' ? 'google' : 'email',
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.status === 409) {
        setAuthLoading(false);
        setAuthFeedback({
          type: 'error',
          message:
            data?.error ||
            `An account with ${normalizedEmail} is already registered. Please switch to "Sign In" or use "Forgot Password".`,
        });
        return;
      }
      if (resp.ok && data?.auth_user_id) {
        authUserId = data.auth_user_id;
        if (data.sabi_unique_id) {
          uniqueId = data.sabi_unique_id;
        }
        if (data.profile) {
          syncedProfile = data.profile;
        }
      } else if (data?.error) {
        lastErrorMessage = data.error;
      }
    } catch {
      // Fallback to direct Supabase Auth below if backend route was unreachable
    }

    // 2. Fallback Path (only if /api/auth/register didn't already create the user):
    //    Uses public non-localhost SABI redirect URL and then calls /api/auth/verify to auto-confirm.
    if (!authUserId) {
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: passwordInput,
          options: {
            emailRedirectTo: getSabiAuthRedirectUrl('/auth/verify'),
            data: {
              full_name: cleanedName,
              phone: cleanedPhone,
              state_of_origin: stateOfOriginInput,
              sabi_unique_id: uniqueId,
              issuer: 'SABI',
            },
          },
        });

        if (signUpError) {
          lastErrorMessage = signUpError.message;
          const lowerErr = signUpError.message.toLowerCase();
          if (lowerErr.includes('already registered') || lowerErr.includes('already exists')) {
            setAuthLoading(false);
            setAuthFeedback({
              type: 'error',
              message: `An account with ${normalizedEmail} already exists in SABI. Please switch to "Sign In".`,
            });
            return;
          }
        } else if (signUpData?.user) {
          if (Array.isArray(signUpData.user.identities) && signUpData.user.identities.length === 0) {
            setAuthLoading(false);
            setAuthFeedback({
              type: 'error',
              message: `An account with ${normalizedEmail} is already registered. Please Sign In instead.`,
            });
            return;
          }
          authUserId = signUpData.user.id;

          // Request instant verification from backend if reachable
          try {
            const verifyResp = await fetch('/api/auth/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: normalizedEmail,
                uniqueId,
                authUserId,
              }),
            });
            const verifyData = await verifyResp.json().catch(() => ({}));
            if (verifyData?.profile) {
              syncedProfile = verifyData.profile;
              uniqueId = verifyData.sabi_unique_id || uniqueId;
            }
          } catch {
            // PostgreSQL trigger on_auth_user_created handles profile creation
          }
        }
      } catch (err: any) {
        lastErrorMessage = err?.message || 'Account creation request failed.';
      }
    }

    if (!authUserId) {
      setAuthLoading(false);
      setAuthFeedback({
        type: 'error',
        message:
          lastErrorMessage ||
          'Could not create your account. Please check your internet connection and try again.',
      });
      return;
    }

    // 3. Establish active authenticated Supabase session on the client now that user is confirmed
    try {
      const { error: firstSignInErr } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: passwordInput,
      });
      if (firstSignInErr && (firstSignInErr.message || '').toLowerCase().includes('email not confirmed')) {
        // Wait briefly for the 2.5s SABI verification guardian to confirm the user in Supabase Auth, then retry
        await new Promise((r) => setTimeout(r, 2600));
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: passwordInput,
        });
      }
    } catch {
      // Session will also be synced on next login
    }

    // 4. Sync or construct verified profile (PostgreSQL trigger on_auth_user_created already inserts public.profiles)
    if (!syncedProfile) {
      try {
        const { data: upsertedProfile } = await supabase
          .from('profiles')
          .upsert(
            {
              id: authUserId,
              email: normalizedEmail,
              sabi_unique_id: uniqueId,
              full_name: cleanedName,
              phone: cleanedPhone,
              state_of_origin: stateOfOriginInput,
              auth_providers: authProvider === 'google' ? ['google', 'email'] : ['email'],
              onboarding_completed: false,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'email' }
          )
          .select('*')
          .maybeSingle();

        if (upsertedProfile) {
          syncedProfile = upsertedProfile;
          uniqueId = upsertedProfile.sabi_unique_id || uniqueId;
        }
      } catch {
        // Ignore RLS error if session is still propagating; trigger already created the row in public.profiles
      }
    }

    if (!syncedProfile) {
      syncedProfile = {
        id: authUserId,
        email: normalizedEmail,
        sabi_unique_id: uniqueId,
        full_name: cleanedName,
        phone: cleanedPhone,
        state_of_origin: stateOfOriginInput,
        auth_providers: authProvider === 'google' ? ['google', 'email'] : ['email'],
        onboarding_completed: false,
      };
    }

    applySyncedProfileToLocal(syncedProfile, normalizedEmail, cleanedName);
    localStorage.setItem('sabi_user_phone', cleanedPhone);
    localStorage.setItem('sabi_user_state', stateOfOriginInput);
    localStorage.setItem('sabi_unique_id', uniqueId);
    localStorage.setItem('sabi_auth_provider', authProvider === 'google' ? 'google+email' : 'email');
    localStorage.setItem('sabi_user_signed_in', 'true');

    setGeneratedUniqueId(uniqueId);
    setAuthLoading(false);
    setCurrentMode('verify');
  };

  // Copy Unique ID
  const handleCopyUniqueId = () => {
    if (!generatedUniqueId) return;
    navigator.clipboard?.writeText(generatedUniqueId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Download or Share Official SABI Recovery ID Document (.txt) — works on both Webapp & Android APK
  const handleDownloadUniqueIdDoc = async () => {
    const idToSave = generatedUniqueId || localStorage.getItem('sabi_unique_id') || '4829K';
    const docContent = [
      '==========================================================',
      '        SABI JAMB CBT - OFFICIAL CANDIDATE RECOVERY DOC   ',
      '==========================================================',
      '',
      `Candidate Full Name : ${fullNameInput || localStorage.getItem('sabi_user_name') || 'Candidate'}`,
      `Registered Email    : ${emailInput || localStorage.getItem('sabi_user_email') || 'scholar@sabi.ng'}`,
      `Phone Number (+234) : ${phoneInput || localStorage.getItem('sabi_user_phone') || 'N/A'}`,
      `State of Origin     : ${stateOfOriginInput || localStorage.getItem('sabi_user_state') || 'Lagos'}`,
      '----------------------------------------------------------',
      `UNIQUE SABI ID      : ${idToSave}`,
      '----------------------------------------------------------',
      '',
      'IMPORTANT SECURITY NOTICE:',
      '1. Your 5-character Unique SABI ID (4 numbers + 1 letter) is your',
      '   permanent verification grant.',
      '2. Whether you sign in with Email/Password or Google Auth using',
      '   this email address, your account and Unique ID remain synced.',
      '3. Keep this document safe. You will be required to provide this',
      '   Unique ID to reset your password or recover your account.',
      '=========================================================='
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

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(docContent).catch(() => {});
    }
  };

  // Handle Sign In (Email or Phone + Password) — Verifies against SABI Backend + Supabase Auth with auto-confirmation
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthFeedback(null);
    setUnconfirmedEmailForResend('');

    const identifier = (authMethod === 'email' ? emailInput : phoneInput).trim().toLowerCase();
    if (!identifier) {
      setAuthFeedback({
        type: 'error',
        message: 'Please enter your registered email address or Nigerian phone number.',
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
    let resolvedEmail = authMethod === 'email' ? identifier : '';
    let authenticatedUserId: string | undefined;
    let signInErrorMessage = '';

    // 1. Authenticate via SABI Backend /api/auth/login first (auto-confirms any unconfirmed user & resolves phone numbers)
    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          password: passwordInput,
          method: authMethod,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok && data?.auth_user_id) {
        authenticatedUserId = data.auth_user_id;
        matchedProfile = data.profile || matchedProfile;
        resolvedEmail = matchedProfile?.email || resolvedEmail;
      } else if (data?.error) {
        signInErrorMessage = data.error;
      }
    } catch {
      // Fall back to direct Supabase Auth below
    }

    // 1b. If on Android APK without backend and user signed in via Phone Number, resolve email directly from Supabase profiles
    if (!resolvedEmail) {
      try {
        const { data: phoneProfile } = await supabase
          .from('profiles')
          .select('*')
          .or(`phone.eq.${identifier},email.eq.${identifier}`)
          .maybeSingle();
        if (phoneProfile?.email) {
          matchedProfile = phoneProfile;
          resolvedEmail = phoneProfile.email.trim().toLowerCase();
        }
      } catch {
        // Ignore lookup error
      }
    }

    // 2. Also establish client-side Supabase Auth session (or authenticate directly if backend wasn't reached)
    if (resolvedEmail) {
      try {
        let { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email: resolvedEmail,
          password: passwordInput,
        });

        // If client received "Email not confirmed", trigger /api/auth/verify, wait for SABI guardian, and retry immediately!
        if (signInErr && (signInErr.message || '').toLowerCase().includes('email not confirmed')) {
          await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: resolvedEmail }),
          }).catch(() => {});

          await new Promise((r) => setTimeout(r, 2600));

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
              message: `Your account (${resolvedEmail}) needs instant SABI verification. Tap the button below to verify your account right now.`,
            });
            return;
          }
          signInErrorMessage =
            'Incorrect email or password. Forgot your password? Click "Forgot Password" to reset using your 5-character Unique SABI ID.';
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
          'Account not found or incorrect password. Please check your credentials or Create an Account first.',
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

  // Handle Password Reset verified by 5-character Unique SABI ID (4 digits + 1 letter)
  const handlePasswordResetWithUniqueId = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryFeedback(null);
    const cleanedId = recoveryUniqueId.trim().toUpperCase();
    const cleanIdent = recoveryIdentifier.trim().toLowerCase();

    if (!/^\d{4}[A-Z]$/.test(cleanedId)) {
      setRecoveryFeedback({
        type: 'error',
        message: 'Invalid format. Your Unique SABI ID must be 4 numbers followed by 1 letter (e.g., 4829K).'
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

    // 1. Verify account & Unique SABI ID in Supabase public.profiles
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.eq.${cleanIdent},phone.eq.${cleanIdent}`)
        .maybeSingle();

      if (!profile) {
        setAuthLoading(false);
        setRecoveryFeedback({
          type: 'error',
          message: 'No registered SABI account found in Supabase for that email or phone number.',
        });
        return;
      }

      if (String(profile.sabi_unique_id).toUpperCase() !== cleanedId) {
        setAuthLoading(false);
        setRecoveryFeedback({
          type: 'error',
          message: 'Verification failed: The Unique SABI ID provided does not match this account.',
        });
        return;
      }
    } catch {
      // Proceed to backend verification
    }

    // 2. Call Backend /api/auth/reset-password to update password in Supabase Auth
    try {
      const resp = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanIdent,
          uniqueId: cleanedId,
          newPassword: newResetPassword,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.verified === false) {
        setAuthLoading(false);
        setRecoveryFeedback({
          type: 'error',
          message: data?.error || 'Verification failed: Could not update password in Supabase.',
        });
        return;
      }
    } catch {
      setAuthLoading(false);
      setRecoveryFeedback({
        type: 'error',
        message: 'Unable to reach password reset server. Please check your internet connection.',
      });
      return;
    }

    setAuthLoading(false);
    setRecoveryFeedback({
      type: 'success',
      message: `Unique ID (${cleanedId}) verified! Your password has been updated in Supabase. Redirecting to Sign In...`
    });

    setTimeout(() => {
      setRecoveryFeedback(null);
      setCurrentMode('sign-in');
    }, 1800);
  };

  return (
    <div className={`min-h-[100dvh] w-full max-w-full overflow-x-hidden ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Header */}
      <header className={`sabi-top-safe-bar px-4 sm:px-6 py-3.5 border-b ${isDark ? 'bg-[#080D1A]/95 border-slate-800' : 'bg-white/95 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLockup />
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all ${
                isDark ? 'bg-slate-800/80 border-slate-700 text-amber-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
              }`}
              aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Full-Screen Auth Content */}
      <main className="w-full flex-1 flex flex-col justify-center px-3 sm:px-6 lg:px-12 py-3 sm:py-6">
        <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-10 items-stretch justify-center">
          
          {/* Left Hero Column on Large Screens */}
          <div className={`hidden lg:flex lg:col-span-5 flex-col justify-between p-8 xl:p-10 rounded-3xl border shadow-2xl relative overflow-hidden ${
            isDark 
              ? 'bg-gradient-to-br from-[#0F1E3D] via-[#0A1428] to-[#060B16] border-blue-900/60 text-white' 
              : 'bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 border-blue-800 text-white'
          }`}>
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 text-white border border-white/20 font-black text-xs uppercase tracking-wider shadow-xs mb-6">
                <span>Unified Candidate Identity · JAMB 2027</span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight mb-4">
                One Account. One Unique SABI ID.
              </h1>
              <p className="text-sm xl:text-base text-blue-100 font-medium leading-relaxed">
                Register with your Email or Google account—both stay automatically synced without duplicate profiles. Receive your 5-character Unique SABI ID (4 numbers + 1 letter) before starting your 10-step diagnostic onboarding.
              </p>
            </div>

            <div className="relative z-10 my-4 flex items-center justify-center">
              <div className="w-full max-w-xs h-44 xl:h-52 flex items-center justify-center">
                <img
                  src="/assets/mascots/onboarding/scholar_welcome_salute.svg"
                  alt="Sabi Scholar"
                  className="w-full h-full object-contain filter drop-shadow-2xl"
                />
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="font-black text-white text-sm mb-0.5">🔐 4-Digit + 1-Letter ID</div>
                <div className="text-blue-100/85 text-[11px]">Easy to remember & downloadable as a recovery doc</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15">
                <div className="font-black text-white text-sm mb-0.5">🔄 Google + Email Sync</div>
                <div className="text-blue-100/85 text-[11px]">Zero duplicate accounts when switching sign-in method</div>
              </div>
            </div>
          </div>

          {/* Right Auth Interaction Column */}
          <div className={`lg:col-span-7 w-full flex flex-col justify-center p-5 sm:p-8 xl:p-10 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-full max-w-lg mx-auto">
              {/* Back Navigation */}
              {currentMode !== 'choice' && currentMode !== 'verify' && (
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryFeedback(null);
                    setCurrentMode('choice');
                  }}
                  className="mb-4 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  ← Back to Account Options
                </button>
              )}

              {/* Header Titles */}
              <div className="text-center sm:text-left mb-5">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {currentMode === 'choice' && 'Choose Your Journey'}
                  {currentMode === 'sign-up' && 'Create Candidate Account'}
                  {currentMode === 'verify' && 'Your Unique SABI ID is Ready'}
                  {currentMode === 'sign-in' && 'Welcome Back, Scholar'}
                  {currentMode === 'forgot-password' && 'Account Recovery & Reset'}
                </h2>
                <p className={`text-xs sm:text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentMode === 'choice' && 'Create your candidate profile or sign in to your SABI dashboard.'}
                  {currentMode === 'sign-up' && 'Complete your details below to generate your permanent 5-character SABI Unique ID before onboarding.'}
                  {currentMode === 'verify' && 'Copy or download your 4-digit + 1-letter Unique ID. You will need it if you ever reset your password.'}
                  {currentMode === 'sign-in' && 'Sign in with Email, Phone, or Google—your account is automatically synced by email.'}
                  {currentMode === 'forgot-password' && 'Provide your registered email/phone and your 5-character Unique SABI ID as verification grant.'}
                </p>
              </div>

              {authFeedback && (
                <div
                  className={`mb-4 p-3.5 rounded-xl text-xs font-bold border ${
                    authFeedback.type === 'error'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
                      : authFeedback.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  }`}
                >
                  <div>{authFeedback.message}</div>
                  {unconfirmedEmailForResend && (
                    <button
                      type="button"
                      onClick={handleResendVerificationEmail}
                      disabled={authLoading}
                      className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] transition-all cursor-pointer"
                    >
                      <CheckCircle2 size={14} />
                      <span>Verify SABI Account Instantly ({unconfirmedEmailForResend})</span>
                    </button>
                  )}
                </div>
              )}

              {/* ========================================== */}
              {/* 1. CHOICE MODE                             */}
              {/* ========================================== */}
              {currentMode === 'choice' && (
                <div className="space-y-4 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('sign-up');
                      navigate('/auth/sign-up', { replace: true });
                    }}
                    className="w-full p-5 sm:p-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20 flex items-center justify-between group transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border border-blue-500"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-xl bg-white/15 text-white transition-colors">
                        <UserPlus size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black leading-tight text-white">Create Account</h3>
                        <p className="text-xs text-blue-100 font-semibold mt-0.5">
                          Register your details, get your Unique SABI ID & start 10-step onboarding
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={22} className="text-white group-hover:translate-x-1.5 transition-transform shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('sign-in');
                      navigate('/auth/sign-in', { replace: true });
                    }}
                    className={`w-full p-5 sm:p-6 rounded-2xl font-black shadow-sm flex items-center justify-between group transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border-2 ${
                      isDark
                        ? 'bg-slate-950 hover:bg-slate-900 text-white border-slate-800 hover:border-blue-500'
                        : 'bg-white hover:bg-blue-50/40 text-slate-900 border-slate-200 hover:border-blue-400'
                    }`}
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 transition-colors font-bold">
                        <LogIn size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black leading-tight">Already Have an Account</h3>
                        <p className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          Sign in with Email, Phone, or synced Google account
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={22} className="text-blue-600 dark:text-blue-400 group-hover:translate-x-1.5 transition-transform shrink-0" />
                  </button>
                </div>
              )}

              {/* ========================================== */}
              {/* 2. SIGN-UP MODE (CANDIDATE INBOX FORM)     */}
              {/* ========================================== */}
              {currentMode === 'sign-up' && (
                <form onSubmit={handleCreateAccountSubmit} className="space-y-3.5 animate-fade-in">
                  {/* Synced Google Auth Quick-Link Banner */}
                  <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isDark ? 'bg-blue-950/30 border-blue-800/60' : 'bg-blue-50/60 border-blue-200'
                  }`}>
                    <div className="text-xs">
                      <div className="font-black text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <Chrome size={15} />
                        <span>Google & Email Identity Sync Active</span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Signing up with Email and signing in later with Google (same Gmail) shares the exact same account & Unique ID.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleGoogleSync('register')}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        authProvider === 'google'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : isDark
                          ? 'bg-slate-900 text-white border-slate-700 hover:border-blue-400'
                          : 'bg-white text-blue-700 border-blue-200 hover:border-blue-600'
                      }`}
                    >
                      {authProvider === 'google' ? '✓ Google Linked' : 'Link Google Gmail'}
                    </button>
                  </div>

                  {/* Full Name */}
                  <div>
                    <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Full Name (Surname First)
                    </label>
                    <div className="relative">
                      <User size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={fullNameInput}
                        onChange={(e) => setFullNameInput(e.target.value)}
                        placeholder="e.g. Adeleke David Oluwaseun"
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                        } outline-none`}
                      />
                    </div>
                  </div>

                  {/* Email Address (Primary Sync Key) */}
                  <div>
                    <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Email / Gmail Address (Synced Across Google & Email Auth)
                    </label>
                    <div className="relative">
                      <Mail size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="candidate@gmail.com"
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                        } outline-none`}
                      />
                    </div>
                  </div>

                  {/* Grid: Phone Number (+234 SMS ready) & State of Origin */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Phone Number (SMS Ready)
                      </label>
                      <div className="relative">
                        <Phone size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+234 803 123 4567"
                          required
                          className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                          } outline-none`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[11px] font-black uppercase tracking-wider mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        State of Origin
                      </label>
                      <div className="relative">
                        <MapPin size={17} className="absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                        <select
                          value={stateOfOriginInput}
                          onChange={(e) => setStateOfOriginInput(e.target.value)}
                          required
                          className={`w-full pl-10 pr-3 py-3 rounded-xl border text-sm font-semibold transition-all ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                          } outline-none`}
                        >
                          {NIGERIAN_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Password (Always required for Supabase Auth user creation) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Password (Minimum 6 Characters)
                      </label>
                    </div>
                    <div className="relative">
                      <LockKeyhole size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        minLength={6}
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Create a strong password (min. 6 chars)"
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                        } outline-none`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-4 rounded-2xl font-black text-sm sm:text-base bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-lg shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>{authLoading ? 'Creating Account & Verifying SABI ID...' : 'Create Account & Generate Unique ID'}</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {/* ========================================== */}
              {/* 3. VERIFY / UNIQUE SABI ID ISSUED MODE     */}
              {/* ========================================== */}
              {currentMode === 'verify' && (
                <div className="space-y-5 animate-fade-in">
                  {/* Blue & White Official Unique ID Card with subtle light yellow accent */}
                  <div className={`rounded-3xl p-6 border-2 shadow-xl ${
                    isDark ? 'bg-slate-950 border-blue-800 text-white' : 'bg-white border-blue-200 text-slate-900'
                  }`}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-mono text-[11px] font-black uppercase tracking-widest">
                        SABI OFFICIAL VERIFICATION GRANT
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-black">
                        <CheckCircle2 size={13} />
                        <span>Verified by SABI</span>
                      </span>
                    </div>

                    <p className={`text-xs font-bold mb-2 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      Assigned to <span className="font-black text-blue-600 dark:text-blue-400 underline">{emailInput || 'candidate@sabi.ng'}</span> ({stateOfOriginInput} State)
                    </p>

                    <div className="my-4 p-4 rounded-2xl bg-gradient-to-r from-blue-700 to-blue-900 text-white flex items-center justify-between border border-blue-500 shadow-md">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-blue-200">
                          YOUR PERMANENT SABI UNIQUE ID
                        </div>
                        <div className="text-3xl sm:text-4xl font-black font-mono tracking-[0.2em] mt-0.5 text-white">
                          {generatedUniqueId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUniqueId}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-800 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      >
                        {copiedId ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
                      <button
                        type="button"
                        onClick={handleDownloadUniqueIdDoc}
                        className={`flex-1 py-3 px-4 rounded-xl border font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isDark
                            ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                            : 'bg-slate-50 hover:bg-blue-50/50 border-slate-200 text-blue-800'
                        }`}
                      >
                        <Download size={16} />
                        <span>Download ID Recovery Doc (.txt)</span>
                      </button>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-yellow-50/70 border-yellow-200/80 text-slate-700'
                  }`}>
                    <strong className="font-black text-blue-700 dark:text-blue-400">Important:</strong> This ID is also saved in your Account Dashboard where you can download the recovery document at any time. You will need this 5-character ID to reset your password if you ever lose access.
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/onboarding/1')}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-base shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <span>Proceed to 10-Step Onboarding</span>
                    <ArrowRight size={20} />
                  </button>
                </div>
              )}

              {/* ========================================== */}
              {/* 4. SIGN-IN FORM (EMAIL, PHONE, OR GOOGLE)  */}
              {/* ========================================== */}
              {currentMode === 'sign-in' && (
                <form onSubmit={handleSignInSubmit} className="space-y-4 animate-fade-in">
                  {/* Google One-Tap Sync Sign-In */}
                  <button
                    type="button"
                    onClick={() => handleGoogleSync('login')}
                    className={`w-full py-3.5 px-4 rounded-2xl border font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white hover:border-blue-500'
                        : 'bg-white border-slate-300 text-slate-900 hover:border-blue-600 shadow-xs'
                    }`}
                  >
                    <Chrome size={18} className="text-blue-600" />
                    <span>Continue with Google (Synced with Email Account)</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                    <span className="flex-shrink mx-3 text-[11px] font-bold uppercase text-slate-400">or sign in with credentials</span>
                    <div className={`flex-grow border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`} />
                  </div>

                  {/* Method Switch: Email or Phone */}
                  <div className={`flex rounded-xl p-1 border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('email')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${
                        authMethod === 'email' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Email Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthMethod('phone')}
                      className={`flex-1 py-2.5 rounded-lg text-xs font-black transition-all ${
                        authMethod === 'phone' 
                          ? 'bg-blue-600 text-white shadow-sm' 
                          : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Phone (+234)
                    </button>
                  </div>

                  {authMethod === 'email' ? (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="candidate@gmail.com"
                          required
                          className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                          } outline-none`}
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Nigerian Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="080 1234 5678"
                          required
                          className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                          } outline-none`}
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={`block text-xs font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryFeedback(null);
                          setCurrentMode('forgot-password');
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold"
                      >
                        Forgot Password? (Verify with Unique ID)
                      </button>
                    </div>
                    <div className="relative">
                      <LockKeyhole size={18} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border text-sm font-medium transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        } outline-none`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-4 rounded-2xl font-black text-base bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white shadow-lg shadow-blue-600/20 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>{authLoading ? 'Signing In & Syncing...' : 'Sign In to Dashboard'}</span>
                    <ArrowRight size={18} />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentMode('sign-up')}
                      className={`text-xs font-bold ${isDark ? 'text-slate-400 hover:text-blue-400' : 'text-slate-600 hover:text-blue-600'} transition-colors cursor-pointer`}
                    >
                      Don't have an account? Create one & get your Unique ID
                    </button>
                  </div>
                </form>
              )}

              {/* ========================================== */}
              {/* 5. FORGOT PASSWORD (REQUIRES UNIQUE ID)    */}
              {/* ========================================== */}
              {currentMode === 'forgot-password' && (
                <form onSubmit={handlePasswordResetWithUniqueId} className="space-y-4 animate-fade-in">
                  <div className={`p-3.5 rounded-2xl border text-xs font-semibold leading-relaxed ${
                    isDark ? 'bg-blue-950/40 border-blue-800/60 text-slate-200' : 'bg-yellow-50/80 border-yellow-200 text-slate-700'
                  }`}>
                    <span className="font-black text-blue-700 dark:text-blue-300 uppercase tracking-wider block mb-0.5">
                      Mandatory Security Grant
                    </span>
                    To reset your password or recover your account, you must enter the <strong>5-character Unique SABI ID (4 numbers + 1 letter)</strong> issued to you at registration.
                  </div>

                  {recoveryFeedback && (
                    <div className={`p-3.5 rounded-xl text-xs font-bold border ${
                      recoveryFeedback.type === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
                    }`}>
                      {recoveryFeedback.message}
                    </div>
                  )}

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      Registered Email or Phone Number
                    </label>
                    <input
                      type="text"
                      value={recoveryIdentifier}
                      onChange={(e) => setRecoveryIdentifier(e.target.value)}
                      placeholder="candidate@gmail.com or +234..."
                      required
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      } outline-none`}
                    />
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      5-Character Unique SABI ID (4 Numbers + 1 Letter)
                    </label>
                    <div className="relative">
                      <KeyRound size={18} className="absolute left-3.5 top-3.5 text-blue-600" />
                      <input
                        type="text"
                        maxLength={5}
                        value={recoveryUniqueId}
                        onChange={(e) => setRecoveryUniqueId(e.target.value.toUpperCase())}
                        placeholder="e.g. 4829K"
                        required
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 text-base font-mono font-black tracking-widest uppercase ${
                          isDark ? 'bg-slate-950 border-blue-500/50 text-blue-300' : 'bg-blue-50/40 border-blue-300 text-slate-950'
                        } outline-none`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newResetPassword}
                      onChange={(e) => setNewResetPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                      className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium ${
                        isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      } outline-none`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl bg-blue-700 hover:bg-blue-800 font-black text-white text-sm transition-all cursor-pointer shadow-lg shadow-blue-700/25 active:scale-95"
                  >
                    Verify Unique ID & Reset Password
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`px-6 py-3 border-t text-center text-xs ${isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
        <span>SABI © 2026 · Nigeria's Joint Admissions and Matriculation Board UTME CBT Platform</span>
      </footer>
    </div>
  );
}
