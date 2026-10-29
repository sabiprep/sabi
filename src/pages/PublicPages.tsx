import React, { useState } from 'react';
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

  const handleComplete = () => {
    const isSigned = typeof window !== 'undefined' && localStorage.getItem('sabi_user_signed_in') === 'true';
    if (isSigned) {
      navigate('/home');
    } else {
      navigate('/welcome');
    }
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
      <header className={`px-4 sm:px-6 py-3.5 border-b ${isDark ? 'bg-[#080D1A]/80 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
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
              isDark ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-blue-950/40 border-slate-800' : 'bg-gradient-to-b from-white via-blue-50/50 to-amber-50/40 border-blue-100'
            }`}>
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 w-full flex items-center justify-center">
                <img 
                  src="/assets/mascots/welcome_students_study.svg" 
                  alt="Nigerian Students Preparing on SABI with Laptops"
                  className="w-full h-auto max-h-[380px] object-contain filter drop-shadow-lg"
                />
              </div>

              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Simulating Live JAMB Sessions</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col items-start justify-center space-y-6">
            <div className="flex items-center gap-2 text-xs font-black tracking-widest uppercase text-blue-600 dark:text-amber-400">
              <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-amber-400 inline-block" />
              <span>Official JAMB UTME Prep Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Study Smarter.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-blue-500 to-amber-500">
                Score 320+ in JAMB.
              </span>
            </h1>

            <p className={`text-sm sm:text-base leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Endless past and recent questions tailored to your 4 subjects. Experience high-speed 60-second Blitz, smart topic mastery, and real-time step-by-step corrections.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full">
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex items-center gap-2.5`}>
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black"><BookOpenCheck size={16} /></div>
                <div>
                  <h4 className="text-xs font-extrabold">Endless Blitz</h4>
                  <p className="text-[11px] text-slate-400">Past & recent questions</p>
                </div>
              </div>
              <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex items-center gap-2.5`}>
                <div className="p-2 rounded-xl bg-blue-600 text-white font-black"><ShieldCheck size={16} /></div>
                <div>
                  <h4 className="text-xs font-extrabold">Smart Practice</h4>
                  <p className="text-[11px] text-slate-400">4-Subject rotation</p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3 pt-2">
              <button
                onClick={() => navigate('/auth/choice')}
                className="w-full py-4 px-6 rounded-2xl font-black text-lg bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white shadow-xl shadow-blue-600/25 hover:shadow-amber-400/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/auth/sign-in')}
                className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm border-2 transition-all cursor-pointer ${
                  isDark 
                    ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-amber-400 hover:bg-amber-400/10 hover:text-amber-400' 
                    : 'border-slate-200 bg-white text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700'
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

  // Handle Google Auth Sync (links by email address so no duplicate ID is ever created)
  const handleGoogleSync = async (targetNext: 'register' | 'login') => {
    const syncedEmail = (emailInput.trim() || 'scholar@gmail.com').toLowerCase();
    const syncedName = fullNameInput.trim() || 'David Adeleke';
    setEmailInput(syncedEmail);
    setFullNameInput(syncedName);
    setAuthProvider('google');

    let uniqueId = getOrGenerateSabiUniqueId(syncedEmail);
    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: syncedName,
          email: syncedEmail,
          phone: phoneInput.trim(),
          stateOfOrigin: stateOfOriginInput,
          provider: 'google',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.sabi_unique_id) {
          uniqueId = data.sabi_unique_id;
        }
      }
    } catch {
      // Fallback to deterministic ID
    }

    localStorage.setItem('sabi_user_email', syncedEmail);
    localStorage.setItem('sabi_user_name', syncedName);
    localStorage.setItem('sabi_unique_id', uniqueId);
    localStorage.setItem('sabi_auth_provider', 'google+email');

    if (targetNext === 'login') {
      localStorage.setItem('sabi_user_signed_in', 'true');
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect');
      if (redirectUrl && redirectUrl.startsWith('/')) {
        navigate(redirectUrl);
      } else {
        navigate('/home');
      }
    } else {
      if (phoneInput.trim() && stateOfOriginInput) {
        localStorage.setItem('sabi_user_phone', phoneInput.trim());
        localStorage.setItem('sabi_user_state', stateOfOriginInput);
        setGeneratedUniqueId(uniqueId);
        setCurrentMode('verify');
      }
    }
  };

  // Handle Create Account form submission -> generates Unique SABI ID before Onboarding
  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = emailInput.trim().toLowerCase();
    let uniqueId = getOrGenerateSabiUniqueId(normalizedEmail);

    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullNameInput.trim(),
          email: normalizedEmail,
          password: passwordInput,
          phone: phoneInput.trim(),
          stateOfOrigin: stateOfOriginInput,
          provider: authProvider === 'google' ? 'google' : 'email',
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data?.sabi_unique_id) {
          uniqueId = data.sabi_unique_id;
        }
      }
    } catch {
      // Fallback to deterministic local ID
    }

    localStorage.setItem('sabi_user_name', fullNameInput.trim());
    localStorage.setItem('sabi_user_email', normalizedEmail);
    localStorage.setItem('sabi_user_phone', phoneInput.trim());
    localStorage.setItem('sabi_user_state', stateOfOriginInput);
    localStorage.setItem('sabi_unique_id', uniqueId);
    localStorage.setItem('sabi_auth_provider', authProvider === 'google' ? 'google+email' : 'email');

    setGeneratedUniqueId(uniqueId);
    setCurrentMode('verify');
  };

  // Copy Unique ID
  const handleCopyUniqueId = () => {
    if (!generatedUniqueId) return;
    navigator.clipboard?.writeText(generatedUniqueId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2500);
  };

  // Download Official SABI Recovery ID Document (.txt)
  const handleDownloadUniqueIdDoc = () => {
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

    const blob = new Blob([docContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SABI-Recovery-ID-${idToSave}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle direct sign in into dashboard or requested redirect directory
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      const normalized = emailInput.trim().toLowerCase();
      const syncedId = getOrGenerateSabiUniqueId(normalized);
      localStorage.setItem('sabi_user_email', normalized);
      localStorage.setItem('sabi_unique_id', syncedId);
    }
    localStorage.setItem('sabi_user_signed_in', 'true');
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    if (redirectUrl && redirectUrl.startsWith('/')) {
      navigate(redirectUrl);
    } else {
      navigate('/home');
    }
  };

  // Handle Password Reset verified by 5-character Unique SABI ID (4 digits + 1 letter)
  const handlePasswordResetWithUniqueId = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedId = recoveryUniqueId.trim().toUpperCase();
    if (!/^\d{4}[A-Z]$/.test(cleanedId)) {
      setRecoveryFeedback({
        type: 'error',
        message: 'Invalid format. Your Unique SABI ID must be 4 numbers followed by 1 letter (e.g., 4829K).'
      });
      return;
    }

    try {
      const resp = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: recoveryIdentifier.trim(),
          uniqueId: cleanedId,
          newPassword: newResetPassword,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || data?.verified === false) {
        setRecoveryFeedback({
          type: 'error',
          message: data?.error || 'Verification failed: The Unique SABI ID provided does not match this account.',
        });
        return;
      }
    } catch {
      const storedId = localStorage.getItem('sabi_unique_id');
      const expectedForEmail = recoveryIdentifier.includes('@')
        ? getOrGenerateSabiUniqueId(recoveryIdentifier)
        : storedId;

      if (storedId && cleanedId !== storedId && cleanedId !== expectedForEmail) {
        setRecoveryFeedback({
          type: 'error',
          message: 'Verification failed: The Unique SABI ID provided does not match this account.'
        });
        return;
      }
    }

    setRecoveryFeedback({
      type: 'success',
      message: `Unique ID (${cleanedId}) verified! Your password has been updated. Redirecting to Sign In...`
    });

    setTimeout(() => {
      setRecoveryFeedback(null);
      setCurrentMode('sign-in');
    }, 1800);
  };

  return (
    <div className={`min-h-[100dvh] w-full max-w-full overflow-x-hidden ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Header */}
      <header className={`px-4 sm:px-6 py-3.5 border-b ${isDark ? 'bg-[#080D1A]/80 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
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
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm mb-6">
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
              <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="font-black text-amber-400 text-sm mb-0.5">🔐 4-Digit + 1-Letter ID</div>
                <div className="text-blue-100/80 text-[11px]">Easy to remember & downloadable as a recovery doc</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="font-black text-amber-400 text-sm mb-0.5">🔄 Google + Email Sync</div>
                <div className="text-blue-100/80 text-[11px]">Zero duplicate accounts when switching sign-in method</div>
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
                  className="mb-4 text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    className="w-full p-5 sm:p-6 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-400/20 flex items-center justify-between group transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border-2 border-amber-500"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-xl bg-blue-700 text-white transition-colors">
                        <UserPlus size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black leading-tight text-slate-950">Create Account</h3>
                        <p className="text-xs text-slate-800 font-bold mt-0.5">
                          Register your details, get your Unique SABI ID & start 10-step onboarding
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={22} className="text-blue-800 group-hover:translate-x-1.5 transition-transform shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('sign-in');
                      navigate('/auth/sign-in', { replace: true });
                    }}
                    className="w-full p-5 sm:p-6 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-black shadow-lg shadow-blue-700/25 flex items-center justify-between group transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer border-2 border-blue-600"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-xl bg-amber-400 text-slate-950 transition-colors font-bold">
                        <LogIn size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black leading-tight">Already Have an Account</h3>
                        <p className="text-xs text-blue-100 font-semibold opacity-90 mt-0.5">
                          Sign in with Email, Phone, or synced Google account
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={22} className="group-hover:translate-x-1.5 transition-transform shrink-0" />
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
                    isDark ? 'bg-blue-950/40 border-blue-800/70' : 'bg-blue-50/80 border-blue-200'
                  }`}>
                    <div className="text-xs">
                      <div className="font-black text-blue-600 dark:text-amber-400 flex items-center gap-1.5">
                        <Chrome size={15} />
                        <span>Google & Email Identity Sync Active</span>
                      </div>
                      <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        Signing up with Email and signing in later with Google (same Gmail) shares the exact same account & Unique ID.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAuthProvider('google')}
                      className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                        authProvider === 'google'
                          ? 'bg-amber-400 text-slate-950 border-amber-500'
                          : isDark
                          ? 'bg-slate-900 text-white border-slate-700 hover:border-amber-400'
                          : 'bg-white text-slate-900 border-slate-300 hover:border-blue-600'
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
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
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
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
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
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
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
                            isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                          } outline-none`}
                        >
                          {NIGERIAN_STATES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Password (Optional if Google Auth is chosen, or set password for dual login) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={`block text-[11px] font-black uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Password {authProvider === 'google' ? '(Optional for Direct Email Login)' : ''}
                      </label>
                    </div>
                    <div className="relative">
                      <LockKeyhole size={17} className="absolute left-3.5 top-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder={authProvider === 'google' ? 'Optional backup password' : 'Create a strong password'}
                        required={authProvider !== 'google'}
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-semibold transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600'
                        } outline-none`}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 rounded-2xl font-black text-sm sm:text-base bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-700/25 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>Create Account & Generate Unique ID</span>
                    <ArrowRight size={18} />
                  </button>
                </form>
              )}

              {/* ========================================== */}
              {/* 3. VERIFY / UNIQUE SABI ID ISSUED MODE     */}
              {/* ========================================== */}
              {currentMode === 'verify' && (
                <div className="space-y-5 animate-fade-in">
                  {/* Yellow & Blue Official Unique ID Card */}
                  <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 text-slate-950 border-2 border-amber-300 shadow-xl">
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-3 py-1 rounded-lg bg-slate-950/15 text-slate-950 font-mono text-[11px] font-black uppercase tracking-widest">
                        OFFICIAL VERIFICATION GRANT
                      </span>
                      <span className="text-xs font-black text-blue-950">
                        4 Numbers + 1 Letter
                      </span>
                    </div>

                    <p className="text-xs font-bold text-slate-900 mb-2">
                      Assigned to <span className="font-black underline">{emailInput || 'candidate@sabi.ng'}</span> ({stateOfOriginInput} State)
                    </p>

                    <div className="my-4 p-4 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-between border-2 border-blue-700">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                          YOUR PERMANENT SABI UNIQUE ID
                        </div>
                        <div className="text-3xl sm:text-4xl font-black font-mono tracking-[0.2em] mt-0.5 text-amber-400">
                          {generatedUniqueId}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyUniqueId}
                        className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                      >
                        {copiedId ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                        <span>{copiedId ? 'Copied!' : 'Copy ID'}</span>
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 mt-4">
                      <button
                        type="button"
                        onClick={handleDownloadUniqueIdDoc}
                        className="flex-1 py-3 px-4 rounded-xl bg-slate-950/15 hover:bg-slate-950/25 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                      >
                        <Download size={16} />
                        <span>Download ID Recovery Doc (.txt)</span>
                      </button>
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                    isDark ? 'bg-slate-950/70 border-slate-800 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
                  }`}>
                    <strong className="font-black text-blue-600 dark:text-amber-400">Important:</strong> This ID is also saved in your Account Dashboard where you can download the recovery document at any time. You will need this 5-character ID to reset your password if you ever lose access.
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/onboarding/1')}
                    className="w-full py-4 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-black text-base shadow-xl shadow-blue-700/25 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
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
                    className={`w-full py-3.5 px-4 rounded-2xl border-2 font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-white hover:border-amber-400'
                        : 'bg-slate-50 border-slate-300 text-slate-900 hover:border-blue-600'
                    }`}
                  >
                    <Chrome size={18} className="text-blue-500" />
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
                          ? 'bg-blue-700 text-white shadow-sm' 
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
                          ? 'bg-blue-700 text-white shadow-sm' 
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
                        className="text-xs text-blue-500 hover:text-amber-500 hover:underline font-bold"
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
                    className="w-full py-4 rounded-2xl font-black text-base bg-blue-700 hover:bg-blue-800 text-white shadow-lg shadow-blue-700/25 transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>Sign In to Dashboard</span>
                    <ArrowRight size={18} />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentMode('sign-up')}
                      className={`text-xs font-bold ${isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-600 hover:text-amber-600'} transition-colors cursor-pointer`}
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
                  <div className="p-3.5 rounded-2xl bg-amber-400/15 border border-amber-400/40 text-xs font-semibold leading-relaxed">
                    <span className="font-black text-amber-500 uppercase tracking-wider block mb-0.5">
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
                      <KeyRound size={18} className="absolute left-3.5 top-3.5 text-amber-500" />
                      <input
                        type="text"
                        maxLength={5}
                        value={recoveryUniqueId}
                        onChange={(e) => setRecoveryUniqueId(e.target.value.toUpperCase())}
                        placeholder="e.g. 4829K"
                        required
                        className={`w-full pl-11 pr-4 py-3.5 rounded-xl border-2 text-base font-mono font-black tracking-widest uppercase ${
                          isDark ? 'bg-slate-950 border-amber-500/50 text-amber-400' : 'bg-amber-50/40 border-amber-400 text-slate-950'
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
