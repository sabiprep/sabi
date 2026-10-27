import React, { useEffect, useState } from 'react';
import { 
  ArrowRight, 
  LockKeyhole, 
  Mail, 
  Phone, 
  ShieldCheck, 
  BookOpenCheck, 
  Layers, 
  UserPlus, 
  LogIn, 
  Sun, 
  Moon,
  ChevronRight,
  Flame,
  Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';

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
// SCREEN 1: FULL SCREEN SABI LOGO SPLASH (4-5s)
// ==========================================
export function SplashPage() {
  const navigate = useNavigate();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(4.5);
  const [progressPercent, setProgressPercent] = useState<number>(0);

  useEffect(() => {
    const totalDuration = 4500; // 4.5 seconds
    const intervalTime = 50;
    const step = (intervalTime / totalDuration) * 100;

    const timer = setInterval(() => {
      setProgressPercent((prev) => Math.min(100, prev + step));
      setSecondsRemaining((prev) => Math.max(0, +(prev - 0.05).toFixed(1)));
    }, intervalTime);

    const navTimer = setTimeout(() => {
      navigate('/welcome', { replace: true });
    }, totalDuration);

    return () => {
      clearInterval(timer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070D1F] text-white px-6 overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      {/* Main Full-Screen SABI Brand Presentation */}
      <div className="relative z-10 flex flex-col items-center max-w-lg w-full text-center animate-fade-in">
        {/* Full Screen Logo */}
        <div className="w-full max-w-sm sm:max-w-md px-4 py-8 mb-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-xl shadow-2xl shadow-blue-950/60 transition-transform duration-500 hover:scale-[1.02]">
          <img 
            src="/sabi-logo.svg" 
            alt="SABI" 
            className="w-full h-auto max-h-36 object-contain filter drop-shadow-[0_10px_20px_rgba(0,102,255,0.35)]" 
          />
        </div>

        {/* Brand Mission Tagline */}
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          JAMB Preparation Re-engineered
        </h2>
        <p className="text-sm sm:text-base text-slate-400 font-medium max-w-md mb-8">
          The CBT data engine with endless Blitz and Smart Practice.
        </p>

        {/* 4.5s Progress Bar & Countdown */}
        <div className="w-full max-w-xs space-y-3">
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-amber-500 rounded-full transition-all duration-75 shadow-sm shadow-amber-400/50" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" /> Initializing Simulator…
            </span>
            <span>{secondsRemaining.toFixed(1)}s</span>
          </div>
        </div>

        {/* Quick Skip button for review */}
        <button
          onClick={() => navigate('/welcome', { replace: true })}
          className="mt-8 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-wider py-1 px-3 rounded-lg hover:bg-slate-800/40"
        >
          Skip Intro →
        </button>
      </div>

      {/* Footer Branding Note */}
      <footer className="absolute bottom-6 text-center text-xs text-slate-500 font-mono">
        SABI CBT Software · Built for Nigeria JAMB 2026/2027
      </footer>
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
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Top Navbar */}
      <header className={`px-6 py-4 border-b ${isDark ? 'bg-[#080D1A]/80 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <BrandLockup />

          <div className="flex items-center gap-3">
            <Link
              to="/mascots"
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition-all flex items-center gap-1.5"
            >
              <Layers size={14} />
              <span>🎨 Inspect Mascots (15)</span>
            </Link>

            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Toggle Light/Dark Theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Welcome Hero Section */}
      <main className="max-w-6xl mx-auto px-6 py-8 flex-1 flex flex-col items-center justify-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Column: Animated Man and Woman at Laptop Table */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className={`relative w-full max-w-2xl rounded-3xl p-6 sm:p-8 border shadow-xl overflow-hidden transition-all duration-300 ${
              isDark ? 'bg-gradient-to-b from-slate-900 via-slate-900/90 to-blue-950/40 border-slate-800' : 'bg-gradient-to-b from-white via-blue-50/50 to-amber-50/40 border-blue-100'
            }`}>
              {/* Decorative Background Orb */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* The Vector Illustration Asset */}
              <div className="relative z-10 w-full flex items-center justify-center">
                <img 
                  src="/assets/mascots/welcome_students_study.svg" 
                  alt="Nigerian Students Preparing on SABI with Laptops"
                  className="w-full h-auto max-h-[380px] object-contain filter drop-shadow-lg"
                />
              </div>

              {/* Live Badge On Top of Artwork */}
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-200">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Simulating Live JAMB Sessions</span>
              </div>
            </div>
          </div>

          {/* Right Column: Copy & The Bold "Get Started" CTA */}
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

            {/* Feature Pills */}
            <div className="grid grid-cols-2 gap-3 w-full">
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex items-center gap-2.5`}>
                <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black"><BookOpenCheck size={16} /></div>
                <div>
                  <h4 className="text-xs font-extrabold">Endless Blitz</h4>
                  <p className="text-[11px] text-slate-400">Past & recent questions</p>
                </div>
              </div>
              <div className={`p-3 rounded-2xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} flex items-center gap-2.5`}>
                <div className="p-2 rounded-xl bg-blue-600 text-white font-black"><ShieldCheck size={16} /></div>
                <div>
                  <h4 className="text-xs font-extrabold">Smart Practice</h4>
                  <p className="text-[11px] text-slate-400">4-Subject rotation</p>
                </div>
              </div>
            </div>

            {/* THE BOLD "GET STARTED" BUTTON */}
            <div className="w-full space-y-3 pt-2">
              <button
                onClick={() => navigate('/auth/choice')}
                className="w-full py-4 px-6 rounded-2xl font-black text-lg bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 shadow-xl shadow-amber-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3 group"
              >
                <span>Get Started</span>
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={() => navigate('/auth/sign-in')}
                className={`w-full py-3 px-6 rounded-2xl font-bold text-sm border transition-all ${
                  isDark ? 'bg-slate-900/80 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                } flex items-center justify-center gap-2`}
              >
                <span>Already have an account? Sign in</span>
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`px-6 py-4 border-t text-center text-xs ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SABI · Nigerian Joint Admissions and Matriculation Board CBT Simulator</span>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <Link to="/mascots" className="text-amber-500 hover:underline">Mascot SVGs</Link>
            <Link to="/onboarding/1" className="text-blue-500 hover:underline">Onboarding Gateway</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// SCREEN 3: ANIMATED AUTH PAGE (CREATE ACCOUNT OR SIGN IN)
// ==========================================
type AuthMode = 'choice' | 'sign-up' | 'sign-in' | 'verify' | 'forgot-password';

export function AuthPage({ mode: initialMode = 'choice' }: { mode?: AuthMode }) {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [currentMode, setCurrentMode] = useState<AuthMode>(initialMode);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  // Handle direct sign in into dashboard
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Direct preview sign-in to dashboard; when backend is ready, this will be automatic session authentication
    navigate('/home');
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Header */}
      <header className={`px-6 py-4 border-b ${isDark ? 'bg-[#080D1A]/80 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md`}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <BrandLockup />
          <div className="flex items-center gap-3">
            <Link
              to="/mascots"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20"
            >
              🎨 Mascots Hub
            </Link>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'}`}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Auth Content */}
      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 flex items-center justify-center w-full">
        <div className="w-full max-w-xl">
          
          {/* BACK BUTTON */}
          <button
            onClick={() => {
              if (currentMode !== 'choice') setCurrentMode('choice');
              else navigate('/welcome');
            }}
            className="mb-6 text-xs font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            ← {currentMode === 'choice' ? 'Back to Welcome' : 'Back to Choice'}
          </button>

          {/* CARD CONTAINER */}
          <div className={`rounded-3xl border p-8 shadow-2xl relative overflow-hidden ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            {/* Top Logo / Slogan */}
            <div className="text-center mb-8">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/20 text-amber-500 border border-amber-500/30">
                SABI Access Gateway
              </span>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-3">
                {currentMode === 'choice' && 'Choose Your Journey'}
                {currentMode === 'sign-up' && 'Start Your JAMB Journey'}
                {currentMode === 'sign-in' && 'Welcome Back to SABI'}
                {currentMode === 'verify' && 'Verify Your Phone'}
                {currentMode === 'forgot-password' && 'Reset Password'}
              </h2>
              <p className={`text-xs sm:text-sm mt-1.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {currentMode === 'choice' && 'Join thousands of Nigerian scholars mastering CBT with high scores.'}
                {currentMode === 'sign-up' && 'Setup your 4 subjects in our gamified Gateway Onboarding.'}
                {currentMode === 'sign-in' && 'Enter your credentials to continue to your study dashboard.'}
              </p>
            </div>

            {/* OPTION 1: THE TWO BIG ANIMATED BUTTONS (CHOICE MODE) */}
            {currentMode === 'choice' && (
              <div className="space-y-4 animate-fade-in">
                {/* 1. CREATE ACCOUNT BUTTON -> ONBOARDING */}
                <button
                  onClick={() => navigate('/onboarding/1')}
                  className="w-full p-5 rounded-2xl border-2 border-amber-500 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/20 flex items-center justify-between group transition-all transform hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 rounded-xl bg-slate-950/20 text-slate-950">
                      <UserPlus size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black leading-tight">Create Account</h3>
                      <p className="text-xs text-slate-900 font-semibold opacity-90">
                        First time? Enter the Gamified Gateway to set up your 4 subjects
                      </p>
                    </div>
                  </div>
                  <ArrowRight size={22} className="group-hover:translate-x-1.5 transition-transform" />
                </button>

                {/* 2. ALREADY HAVE ACCOUNT BUTTON -> OPENS SIGN IN */}
                <button
                  onClick={() => setCurrentMode('sign-in')}
                  className={`w-full p-5 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                    isDark 
                      ? 'border-blue-600/40 bg-blue-950/20 hover:border-blue-500 text-white' 
                      : 'border-blue-200 bg-blue-50/50 hover:border-blue-400 text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 rounded-xl bg-blue-600 text-white font-bold">
                      <LogIn size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black leading-tight">Already Have an Account</h3>
                      <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        Log in with phone or email & password directly to your Dashboard
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={22} className="group-hover:translate-x-1.5 transition-transform text-blue-500" />
                </button>

                {/* Direct Onboarding Test Route */}
                <div className="pt-4 text-center">
                  <p className="text-xs text-slate-500">
                    Ready to test the Sabi Scholar pushing gates?{' '}
                    <Link to="/onboarding/1" className="text-amber-500 font-bold hover:underline">
                      Launch Gateway Level 1 →
                    </Link>
                  </p>
                </div>
              </div>
            )}

            {/* OPTION 2: SIGN-IN FORM */}
            {currentMode === 'sign-in' && (
              <form onSubmit={handleSignInSubmit} className="space-y-4 animate-fade-in">
                {/* Method Switch: Email or Phone */}
                <div className="flex rounded-xl p-1 bg-slate-800/40 border border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('email')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      authMethod === 'email' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Email Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('phone')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      authMethod === 'phone' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Phone (+234)
                  </button>
                </div>

                {authMethod === 'email' ? (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="scholar@example.com"
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-500'
                        } outline-none`}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                      Nigerian Phone Number
                    </label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="080 1234 5678"
                        required
                        className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                          isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-500'
                        } outline-none`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setCurrentMode('forgot-password')}
                      className="text-xs text-blue-500 hover:underline font-semibold"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole size={16} className="absolute left-3.5 top-3.5 text-slate-500" />
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      required
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                        isDark ? 'bg-slate-950 border-slate-800 focus:border-blue-500' : 'bg-slate-50 border-slate-300 focus:border-blue-500'
                      } outline-none`}
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 flex items-center gap-2">
                  <ShieldCheck size={16} className="shrink-0" />
                  <span>Automatic signed-in token active on connection. Instant preview to Dashboard.</span>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl font-black text-base bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>Sign In to Dashboard</span>
                  <ArrowRight size={18} />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCurrentMode('choice')}
                    className="text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Need an account? Go to Create Account
                  </button>
                </div>
              </form>
            )}

            {/* FORGOT PASSWORD MODE */}
            {currentMode === 'forgot-password' && (
              <div className="space-y-4 animate-fade-in">
                <p className="text-xs text-slate-400">
                  Enter your email address or phone number and we will send you an OTP reset link.
                </p>
                <input
                  type="email"
                  placeholder="scholar@example.com"
                  className={`w-full px-4 py-3 rounded-xl border text-sm ${
                    isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-300'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setCurrentMode('sign-in')}
                  className="w-full py-3 rounded-xl bg-amber-500 font-bold text-slate-950 text-sm"
                >
                  Send Recovery Link
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className={`px-6 py-4 border-t text-center text-xs ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
        SABI CBT Platform · Secure Student Authentication Flow
      </footer>
    </div>
  );
}
