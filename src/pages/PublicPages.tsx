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
  ChevronRight
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

import { SabiIronManAssemble } from '../components/common/SabiIronManAssemble';

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
      {/* Background subtle radial glow */}
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      {/* Centerpiece: Sabi SVG Scattering & Assembling like Iron Man */}
      <div className="relative z-10 w-full flex flex-col items-center justify-center animate-fade-in">
        <SabiIronManAssemble onComplete={handleComplete} autoCompleteDelay={4000} />
      </div>

      {/* Subtle discreet bypass hint */}
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
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Top Navbar */}
      <header className={`px-6 py-4 border-b ${isDark ? 'bg-[#080D1A]/80 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
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

            {/* Feature Highlights */}
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

            {/* CTA Buttons */}
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

      {/* Footer */}
      <footer className={`px-6 py-4 border-t text-center text-xs ${isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          <span>SABI © 2026 · Nigeria's Joint Admissions and Matriculation Board UTME CBT Platform</span>
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

  // Handle direct sign in into dashboard or requested redirect directory
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('sabi_user_signed_in', 'true');
    const params = new URLSearchParams(window.location.search);
    const redirectUrl = params.get('redirect');
    if (redirectUrl && redirectUrl.startsWith('/')) {
      navigate(redirectUrl);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col justify-between`}>
      {/* Header */}
      <header className={`px-6 py-4 border-b ${isDark ? 'bg-[#080D1A]/80 border-slate-800' : 'bg-white/90 border-slate-200'} backdrop-blur-md sticky top-0 z-30`}>
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
          
          {/* Left Hero Column on Large Screens (Citadel Identity Showcase) */}
          <div className={`hidden lg:flex lg:col-span-6 flex-col justify-between p-8 xl:p-12 rounded-3xl border shadow-2xl relative overflow-hidden ${
            isDark 
              ? 'bg-gradient-to-br from-[#0F1E3D] via-[#0A1428] to-[#060B16] border-blue-900/60 text-white' 
              : 'bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 border-blue-800 text-white'
          }`}>
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm mb-6">
                <span>Citadel Access · Official JAMB 2027</span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight mb-4">
                Enter the Arena of Nigerian Champions.
              </h1>
              <p className="text-sm xl:text-base text-blue-100 font-medium leading-relaxed max-w-md">
                Experience high-speed 60-second Blitz, 4-subject past question rotation, and instant step-by-step corrections built to secure 320+ in JAMB.
              </p>
            </div>

            {/* Sabi Scholar Mascot Artwork */}
            <div className="relative z-10 my-4 flex items-center justify-center">
              <div className="w-full max-w-xs h-48 xl:h-56 flex items-center justify-center">
                <img
                  src="/assets/mascots/onboarding/scholar_welcome_salute.svg"
                  alt="Sabi Scholar"
                  className="w-full h-full object-contain filter drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Live Platform Proof Bullets */}
            <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-white/10 text-xs">
              <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="font-black text-amber-400 text-sm mb-0.5">⚡ Endless Blitz</div>
                <div className="text-blue-100/80 text-[11px]">60s questions with Eagle speed streak</div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="font-black text-amber-400 text-sm mb-0.5">🎯 Smart Practice</div>
                <div className="text-blue-100/80 text-[11px]">4-subject rotation with instant solutions</div>
              </div>
            </div>
          </div>

          {/* Right Auth Interaction Column (Expansive, Full-Bleed) */}
          <div className={`lg:col-span-6 w-full flex flex-col justify-center p-6 sm:p-10 xl:p-12 rounded-3xl border shadow-xl transition-all ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="w-full max-w-md mx-auto">
              {/* Back Navigation */}
              {currentMode !== 'choice' && (
                <button
                  type="button"
                  onClick={() => setCurrentMode('choice')}
                  className="mb-4 text-xs font-black uppercase tracking-wider text-blue-500 hover:text-amber-500 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  ← Back to Options
                </button>
              )}

              {/* Header Titles */}
              <div className="text-center sm:text-left mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {currentMode === 'choice' && 'Choose Your Journey'}
                  {currentMode === 'sign-in' && 'Welcome Back'}
                  {currentMode === 'forgot-password' && 'Reset Password'}
                </h2>
                <p className={`text-xs sm:text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentMode === 'choice' && 'Join thousands of Nigerian scholars mastering CBT with high scores.'}
                  {currentMode === 'sign-in' && 'Enter your credentials to continue your study streak.'}
                  {currentMode === 'forgot-password' && 'Enter your email or phone to reset your password.'}
                </p>
              </div>

              {/* CHOICE MODE */}
              {currentMode === 'choice' && (
                <div className="space-y-4 animate-fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/onboarding/1');
                    }}
                    className="w-full p-5 sm:p-6 rounded-2xl bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white font-black shadow-lg shadow-blue-600/25 hover:shadow-amber-400/30 flex items-center justify-between group transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 active:ring-4 active:ring-amber-400/40 cursor-pointer border-2 border-blue-500 hover:border-amber-400"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-xl bg-white/20 group-hover:bg-slate-950/20 text-white group-hover:text-slate-950 transition-colors">
                        <UserPlus size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black leading-tight">Create Account</h3>
                        <p className="text-xs text-blue-100 group-hover:text-slate-900 font-semibold opacity-90 transition-colors mt-0.5">
                          First time? Enter the Gateway to set up your 4 subjects
                        </p>
                      </div>
                    </div>
                    <ArrowRight size={22} className="group-hover:translate-x-2 transition-transform shrink-0" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCurrentMode('sign-in');
                    }}
                    className="w-full p-5 sm:p-6 rounded-2xl bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white font-black shadow-lg shadow-blue-600/25 hover:shadow-amber-400/30 flex items-center justify-between group transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 active:ring-4 active:ring-amber-400/40 cursor-pointer border-2 border-blue-500 hover:border-amber-400"
                  >
                    <div className="flex items-center gap-4 text-left">
                      <div className="p-3 rounded-xl bg-white/20 group-hover:bg-slate-950/20 text-white group-hover:text-slate-950 transition-colors font-bold">
                        <LogIn size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black leading-tight">Already Have an Account</h3>
                        <p className="text-xs text-blue-100 group-hover:text-slate-900 font-semibold opacity-90 transition-colors mt-0.5">
                          Log in directly to your Sabi Student Dashboard
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={22} className="group-hover:translate-x-2 transition-transform shrink-0" />
                  </button>
                </div>
              )}

              {/* SIGN-IN FORM */}
              {currentMode === 'sign-in' && (
                <form onSubmit={handleSignInSubmit} className="space-y-4 animate-fade-in">
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
                          placeholder="candidate@example.com"
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
                        onClick={() => setCurrentMode('forgot-password')}
                        className="text-xs text-blue-500 hover:text-amber-500 hover:underline font-bold"
                      >
                        Forgot?
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
                    className="w-full py-4 rounded-2xl font-black text-base bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white shadow-lg shadow-blue-600/25 hover:shadow-amber-400/30 transition-all duration-200 active:scale-95 active:ring-4 active:ring-amber-400/40 flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    <span>Sign In to Dashboard</span>
                    <ArrowRight size={18} />
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setCurrentMode('choice')}
                      className={`text-xs font-bold ${isDark ? 'text-slate-400 hover:text-amber-400' : 'text-slate-600 hover:text-amber-600'} transition-colors cursor-pointer`}
                    >
                      Don't have an account? Create one
                    </button>
                  </div>
                </form>
              )}

              {/* FORGOT PASSWORD MODE */}
              {currentMode === 'forgot-password' && (
                <div className="space-y-4 animate-fade-in">
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Enter your email address or phone number and we will send you an OTP recovery link.
                  </p>
                  <input
                    type="email"
                    placeholder="candidate@example.com"
                    className={`w-full px-4 py-3.5 rounded-xl border text-sm font-medium ${
                      isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    } outline-none`}
                  />
                  <button
                    type="button"
                    onClick={() => setCurrentMode('sign-in')}
                    className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-amber-400 hover:text-slate-950 font-black text-white text-sm transition-all cursor-pointer shadow-lg shadow-blue-600/20 hover:shadow-amber-400/30 active:scale-95"
                  >
                    Send Recovery Link
                  </button>
                </div>
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
