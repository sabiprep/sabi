import { useState, type ReactNode } from 'react';
import {
  Activity, ArrowRight, Bell, BookMarked, BookOpen, BookOpenCheck,
  Calculator, CheckCircle, ChevronRight, ClipboardList, Coins,
  Compass, FileQuestion, Flame, HelpCircle, Home, Info, LogOut,
  Menu, Moon, Settings, Shield, ShieldCheck, Star, Sun, Target,
  TrendingUp, UserRound, X, Zap, Award
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';

const MAIN_NAV = [
  { to: '/home', label: 'Dashboard', Icon: Home },
  { to: '/blitz', label: 'Blitz 60s', Icon: Zap },
  { to: '/smart', label: 'Smart Practice', Icon: Compass },
  { to: '/practice', label: 'Practice Hub', Icon: BookOpen },
  { to: '/cbt', label: 'CBT Simulator', Icon: FileQuestion },
  { to: '/progress', label: 'Progress', Icon: Activity },
];

const MENU_ITEMS = [
  { to: '/menu/mistakes', label: 'Mistake Notebook', Icon: ClipboardList, description: 'Review questions to revisit' },
  { to: '/menu/resources', label: 'Study Resources', Icon: BookMarked, description: 'Formula sheet and syllabus' },
  { to: '/menu/help', label: 'Help & Support', Icon: HelpCircle, description: 'Get help using SABI' },
  { to: '/menu/about', label: 'About SABI', Icon: Info, description: 'About the learning platform' },
  { to: '/profile', label: 'Profile & Settings', Icon: Settings, description: 'Preferences and account controls' },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col`}>
      {/* Top Navbar */}
      <header className={`px-4 sm:px-8 py-3.5 border-b sticky top-0 z-40 backdrop-blur-md ${
        isDark ? 'bg-[#080D1A]/90 border-slate-800' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Left Brand Lockup */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition"
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <Link to="/home" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-amber-500 p-0.5 shadow-md group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <span className="font-black text-amber-400 text-lg tracking-wider">S</span>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-none text-blue-600 dark:text-white">
                  SABI
                </span>
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-none mt-0.5">
                  JAMB CBT
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Main Navigation">
            {MAIN_NAV.map(({ to, label, Icon }) => {
              const isActive = location.pathname === to;
              return (
                <NavLink
                  key={to}
                  to={to}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gamified HUD Badges */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-500">
                <Flame size={15} className="animate-bounce" />
                <span>7d</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-black text-blue-500">
                <Coins size={15} />
                <span>1,450</span>
              </div>
            </div>

            {/* Mascot Gallery Shortcut */}
            <Link
              to="/mascots"
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition"
              title="Inspect 15 Custom Mascot SVGs"
            >
              <span>🎨 Mascots</span>
            </Link>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-200 text-slate-700'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Student Profile Pill */}
            <Link
              to="/profile"
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition ${
                isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                D
              </div>
              <span className="text-xs font-bold hidden sm:inline">David</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Outlet Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 flex-1">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-2 flex items-center justify-around backdrop-blur-md ${
        isDark ? 'bg-[#080D1A]/95 border-slate-800 text-slate-400' : 'bg-white/95 border-slate-200 text-slate-600'
      }`}>
        {MAIN_NAV.slice(0, 5).map(({ to, label, Icon }) => {
          const isActive = location.pathname === to;
          return (
            <NavLink
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 text-[10px] font-bold py-1 px-2.5 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-500 font-black scale-105'
                  : 'hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Drawer Menu for Mobile / Extras */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className={`w-72 max-w-[80vw] h-full p-6 shadow-2xl flex flex-col justify-between ${
              isDark ? 'bg-slate-900 border-r border-slate-800 text-white' : 'bg-white border-r border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center font-black text-slate-950 text-sm">
                    S
                  </div>
                  <span className="font-black text-lg">SABI CBT</span>
                </div>
                <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-3 mb-2">
                  Main Modules
                </span>
                {MAIN_NAV.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800/40 transition"
                  >
                    <Icon size={18} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-800 space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-3 mb-2">
                  Study Toolkit
                </span>
                {MENU_ITEMS.map(({ to, label, Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-800/40 transition"
                  >
                    <Icon size={17} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800">
              <Link
                to="/welcome"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-400 hover:bg-red-500/10 transition"
              >
                <LogOut size={17} />
                <span>Sign Out</span>
              </Link>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

// ==========================================
// MAIN STUDENT DASHBOARD (HOMEPAGE)
// ==========================================
export function HomePage() {
  const [completedQuest, setCompletedQuest] = useState(false);
  const { isDark } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      {/* Top Gamified HUD Bar */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-3xl border-2 flex items-center gap-3.5 transition shadow-sm ${
          isDark ? 'bg-slate-900/80 border-amber-500/30' : 'bg-white border-amber-200'
        }`}>
          <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Flame size={22} className="animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Streak Flame
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              7 Days Active
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl border-2 flex items-center gap-3.5 transition shadow-sm ${
          isDark ? 'bg-slate-900/80 border-blue-500/30' : 'bg-white border-blue-200'
        }`}>
          <div className="p-3 rounded-2xl bg-blue-600 text-white font-black shadow-md shadow-blue-600/20">
            <Coins size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Sabi Gems
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              1,450 💎
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl border-2 flex items-center gap-3.5 transition shadow-sm ${
          isDark ? 'bg-slate-900/80 border-emerald-500/30' : 'bg-white border-emerald-200'
        }`}>
          <div className="p-3 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              UTME Stamina
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              25 / 25 Max
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl border-2 flex items-center gap-3.5 transition shadow-sm ${
          isDark ? 'bg-slate-900/80 border-indigo-500/30' : 'bg-white border-indigo-200'
        }`}>
          <div className="p-3 rounded-2xl bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/20">
            <Target size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
              Target Score
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              320+ (UNILAG)
            </span>
          </div>
        </div>
      </section>

      {/* Sabi Scholar Motivation Banner with Mascot */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-950 border-2 border-blue-600/40 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex-1 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] tracking-wider uppercase">
            <Award size={13} /> Sabi Scholar Citadel
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            Welcome to your Dashboard, David!
          </h1>
          
          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Your target is <strong>320+ in JAMB UTME</strong> for <strong>Medicine & Surgery at UNILAG</strong>. High-speed 60-second Blitz and 4-subject Smart Practice will turn your weak topics into solid points today.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs font-bold pt-2">
            <span className="text-amber-400">⚡ UTME Readiness: 84%</span>
            <span className="text-slate-600">·</span>
            <span className="text-blue-300">🎯 Priority: Physics Waves & Organic Chemistry</span>
          </div>
        </div>

        <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 shrink-0 flex items-center justify-center">
          <img
            src="/assets/mascots/onboarding/scholar_welcome_salute.svg"
            alt="Sabi Scholar"
            className="w-full h-full object-contain filter drop-shadow-2xl hover:scale-105 transition-transform"
          />
        </div>
      </section>

      {/* THE TWO CORE ADDICTIVE PILLARS: BLITZ & SMART PRACTICE */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Core Practice Modes
            </h2>
          </div>
          <span className="text-xs font-bold text-slate-400">
            Endless simulator engines
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: SABI BLITZ (Eagle Mascot) */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-blue-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-amber-400 transition-all duration-300">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider inline-block">
                  ⚡ 60s Rapid Simulator
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3">
                  SABI BLITZ
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-md">
                  Endless past & recent questions on a sharp continuous Z-path level map. 60-second timer per question, instant step-by-step corrections, and eagle streak multipliers.
                </p>
              </div>
              <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                <img
                  src="/assets/mascots/blitz/eagle_idle.svg"
                  alt="Sabi Eagle Mascot"
                  className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-amber-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>Level 3 Active · 15 Questions</span>
              </div>
              <Link
                to="/blitz"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-110 transition flex items-center justify-center gap-2.5 shadow-lg shadow-amber-500/25"
              >
                <span>Enter Blitz Arena ⚡</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Card 2: SMART PRACTICE (Student Study Room Mascot) */}
          <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-blue-900/60 via-slate-900 to-blue-950/40 border-2 border-blue-500/50 text-white shadow-xl flex flex-col justify-between relative overflow-hidden group hover:border-blue-400 transition-all duration-300">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <span className="px-3 py-1 rounded-full bg-blue-500 text-white font-black text-[11px] uppercase tracking-wider inline-block">
                  🎯 4-Subject Adaptive Road
                </span>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-3">
                  SMART PRACTICE
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed max-w-md">
                  Branching road with straight, left, and right campus paths. Study room simulator with student mascot, interactive desk calculator, and objective/theory inbox.
                </p>
              </div>
              <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
                <img
                  src="/assets/mascots/smart/student_desk_studying.svg"
                  alt="Student Study Room"
                  className="w-full h-full object-contain filter drop-shadow-lg group-hover:scale-110 transition-transform duration-300"
                />
              </div>
            </div>

            <div className="pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs font-mono text-blue-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>West Quad Branch · Level 2</span>
              </div>
              <Link
                to="/smart"
                className="w-full sm:w-auto px-7 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white hover:brightness-110 transition flex items-center justify-center gap-2.5 shadow-lg shadow-blue-500/25"
              >
                <span>Enter Smart Campus 🎓</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4-SUBJECT MASTERY CARDS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Your 4 Registered Subjects
          </h3>
          <span className="text-xs font-bold text-amber-500">Official JAMB Combination</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'English Language', accuracy: '84%', questions: '210 Solved', locked: true, badge: 'Compulsory Crest' },
            { name: 'Mathematics', accuracy: '78%', questions: '185 Solved', locked: false, badge: 'Calculus & Algebra' },
            { name: 'Physics', accuracy: '65%', questions: '142 Solved', locked: false, badge: 'Waves & Optics' },
            { name: 'Chemistry', accuracy: '72%', questions: '160 Solved', locked: false, badge: 'Organic & Redox' },
          ].map(sub => (
            <div
              key={sub.name}
              className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                isDark ? 'bg-slate-900/90 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
              } shadow-sm`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                    sub.locked
                      ? 'bg-amber-400/20 text-amber-500 border border-amber-500/30'
                      : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                  }`}>
                    {sub.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {sub.questions}
                  </span>
                </div>

                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {sub.name}
                </h4>

                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">
                      Mastery Rate
                    </span>
                    <span className="text-2xl font-black text-slate-900 dark:text-white">
                      {sub.accuracy}
                    </span>
                  </div>
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
                    <div className="h-full bg-gradient-to-r from-blue-600 to-amber-500 rounded-full" style={{ width: sub.accuracy }} />
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                <Link
                  to="/blitz"
                  className="flex-1 py-2 text-center text-[11px] font-bold rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 transition"
                >
                  Blitz
                </Link>
                <Link
                  to="/smart"
                  className="flex-1 py-2 text-center text-[11px] font-bold rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/30 transition"
                >
                  Smart
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* DAILY MISSIONS & EXAM TOOLS */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Quests (7 cols) */}
        <div className={`lg:col-span-7 p-6 sm:p-7 rounded-3xl border-2 space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award size={20} className="text-amber-500" />
              <span>Daily UTME Missions</span>
            </h3>
            <span className="text-xs font-black text-amber-500 uppercase tracking-wider">
              +100 Gems Today
            </span>
          </div>

          <div className="space-y-3">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-emerald-500" />
                <div>
                  <span className="text-xs sm:text-sm font-bold block text-slate-900 dark:text-white">
                    Solve 15 Blitz Speed Questions
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    15 / 15 Completed today
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCompletedQuest(true)}
                disabled={completedQuest}
                className={`px-4 py-2 rounded-xl text-xs font-black transition ${
                  completedQuest
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    : 'bg-amber-400 text-slate-950 hover:bg-amber-300 shadow-md shadow-amber-400/20'
                }`}
              >
                {completedQuest ? 'Claimed ✓' : 'Claim 50 💎'}
              </button>
            </div>

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-2 border-slate-400 inline-block" />
                <div>
                  <span className="text-xs sm:text-sm font-bold block text-slate-900 dark:text-white">
                    Clear 1 Campus Level in Smart Practice
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Progress: 0 / 1 Level
                  </span>
                </div>
              </div>
              <Link
                to="/smart"
                className="text-xs font-black text-blue-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Go to Campus</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Official CBT Exam Simulator Card (5 cols) */}
        <div className="lg:col-span-5 p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 text-amber-400 font-black text-[10px] uppercase tracking-wider mb-3">
              <FileQuestion size={12} /> Official JAMB UTME Simulator
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
              180-Question Timed Mock Exam
            </h3>
            <p className="text-xs text-slate-900 font-semibold mt-2 leading-relaxed opacity-90">
              Simulate full UTME exam conditions with 120-minute countdown, 8-digit onscreen calculator, and instant official JAMB result slip.
            </p>
          </div>

          <div className="pt-6">
            <Link
              to="/cbt"
              className="w-full py-4 rounded-2xl font-black text-sm bg-slate-950 text-white hover:bg-slate-900 transition flex items-center justify-center gap-2 shadow-lg"
            >
              <span>Launch Official CBT Exam</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// PRACTICE HUB PAGE
// ==========================================
export function PracticePage() {
  const { isDark } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Practice Hub
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Choose How You Want to Drill
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Select between the high-speed 60s Blitz level map or the 4-subject branching Smart Practice campus road.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Blitz Card */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-blue-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/50 text-white shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
                ⚡ Endless 60s Mode
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white mt-3">
                SABI BLITZ
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Eagle mascot, continuous Z-path with 10Q and 15Q levels, formula rendering, and instant step-by-step corrections.
              </p>
            </div>
            <img src="/assets/mascots/blitz/eagle_idle.svg" alt="Eagle" className="w-20 h-20 object-contain shrink-0" />
          </div>
          <Link
            to="/blitz"
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-center hover:brightness-110 transition shadow-md shadow-amber-500/20"
          >
            Launch Blitz Level Path →
          </Link>
        </div>

        {/* Smart Practice Card */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-blue-900/60 via-slate-900 to-blue-950/40 border-2 border-blue-500/50 text-white shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-500 text-white font-black text-[11px] uppercase tracking-wider">
                🎯 4-Subject Road
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white mt-3">
                SMART PRACTICE
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Forward branches (Straight, Left, Right) past campus faculties. Study room with animated student and desk calculator.
              </p>
            </div>
            <img src="/assets/mascots/smart/student_desk_studying.svg" alt="Student" className="w-20 h-20 object-contain shrink-0" />
          </div>
          <Link
            to="/smart"
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-center hover:brightness-110 transition shadow-md shadow-blue-500/20"
          >
            Launch Smart Practice Road →
          </Link>
        </div>
      </div>

      {/* Additional Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/cbt"
          className={`p-6 rounded-3xl border-2 transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
          } flex items-center justify-between group`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-black">
              <FileQuestion size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                180-Q UTME CBT Mock
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Official 120-minute timer and onscreen calculator
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/diagnostic"
          className={`p-6 rounded-3xl border-2 transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
          } flex items-center justify-between group`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 font-black">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Weak Topic Diagnostic
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rapid evaluation of Organic Chem, Waves, and Concord
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// CBT SIMULATOR PAGE
// ==========================================
export function CbtPage() {
  const { isDark } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          JAMB CBT Simulator
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Prepare Under Strict Exam Conditions
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          The CBT simulator simulates the official JAMB environment. No hints or explanations are shown until after submission.
        </p>
      </div>

      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-slate-950 text-amber-400 font-black text-[10px] uppercase">
            Official UTME Mock
          </span>
          <h2 className="text-2xl font-black">180 Questions · 4 Subjects · 120 Minutes</h2>
          <p className="text-xs font-medium max-w-xl text-slate-900 opacity-90">
            English (60 questions) + 3 Chosen Subjects (40 questions each). Features accurate 8-digit onscreen calculator and instant JAMB score sheet.
          </p>
        </div>
        <Link
          to="/cbt/live"
          className="px-7 py-4 rounded-2xl font-black text-sm bg-slate-950 text-white hover:bg-slate-900 transition flex items-center gap-2 shrink-0 shadow-lg"
        >
          <span>Start Full Exam Now</span>
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`p-6 rounded-3xl border-2 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-black text-amber-500 uppercase">Quick Mock</span>
          <h3 className="text-xl font-black mt-1">40 Questions · 30 Mins</h3>
          <p className="text-xs text-slate-400 mt-1">Fast sprint test for focused revision.</p>
        </div>

        <div className={`p-6 rounded-3xl border-2 ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <span className="text-xs font-black text-blue-500 uppercase">Subject Drill</span>
          <h3 className="text-xl font-black mt-1">Single Subject · 40 Mins</h3>
          <p className="text-xs text-slate-400 mt-1">Deep drill in Mathematics, Physics, or Chemistry.</p>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// PROGRESS PAGE
// ==========================================
export function ProgressPage() {
  const { isDark } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Mastery Analytics
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Your UTME Progress & Readiness
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Evidence-based learning analytics tracked across your 4 registered subjects.
        </p>
      </div>

      <div className={`p-6 sm:p-8 rounded-3xl border-2 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      } flex flex-col md:flex-row items-center gap-6`}>
        <div className="w-20 h-20 rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
          <Activity size={36} />
        </div>
        <div className="space-y-2 flex-1">
          <span className="text-xs font-black uppercase text-amber-500">Live Readiness</span>
          <h2 className="text-xl font-black">Estimated UTME Benchmark: 324 / 400</h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Based on your Blitz speed accuracy, Smart Practice completion, and streak consistency. Keep drilling to maintain admission security at UNILAG.
          </p>
        </div>
        <Link
          to="/blitz"
          className="px-6 py-3.5 rounded-2xl font-black text-xs uppercase bg-amber-400 text-slate-950 hover:bg-amber-300 transition"
        >
          Boost Score in Blitz →
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// PROFILE PAGE
// ==========================================
export function ProfilePage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-3xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Account
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Student Profile & Settings
        </h1>
      </div>

      <div className={`p-6 sm:p-8 rounded-3xl border-2 space-y-6 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-amber-500 text-white font-black text-2xl flex items-center justify-center shadow-lg">
            D
          </div>
          <div>
            <h2 className="text-xl font-black">David Chukwu</h2>
            <p className="text-xs text-slate-400">Target: Medicine & Surgery · UNILAG · 320+</p>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mt-1">
              Active Candidate (2026/2027 UTME)
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold block">Theme Mode</span>
              <span className="text-xs text-slate-400">Toggle between Dark and Light mode</span>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-700 bg-slate-800 text-amber-400"
            >
              {isDark ? 'Dark Mode (Active)' : 'Light Mode (Active)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// NOTIFICATIONS PAGE
// ==========================================
export function NotificationsPage() {
  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-2xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Updates
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Notifications
        </h1>
      </div>

      <div className="p-8 rounded-3xl border-2 border-slate-800 text-center space-y-3">
        <Bell size={32} className="mx-auto text-amber-400 opacity-60" />
        <h3 className="text-lg font-black">You're All Caught Up</h3>
        <p className="text-xs text-slate-400">No pending notifications. Keep drilling your subjects!</p>
        <Link to="/home" className="inline-block px-5 py-2.5 rounded-xl bg-amber-400 text-slate-950 font-bold text-xs mt-2">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// GENERIC SUB-PAGE RENDERER
// ==========================================
export function MainPage({ page }: { page: string }) {
  const { section } = useParams();
  const sectionPage: Record<string, { title: string; description: string }> = {
    mistakes: { title: 'Mistake Notebook', description: 'Revisit missed questions from Blitz and Smart Practice until you achieve 100% mastery.' },
    resources: { title: 'Study Resources & Syllabus', description: 'Formula sheets, reading text guides, and official JAMB UTME syllabus.' },
    help: { title: 'Help & Support', description: 'Guides on how to navigate Blitz level paths and campus roads.' },
    about: { title: 'About SABI', description: 'SABI is Nigeria’s CBT exam preparation engine engineered for 300+ scores.' },
    settings: { title: 'Settings', description: 'Account settings and study preferences.' },
  };

  const title = section ? sectionPage[section]?.title || section : page;
  const description = section ? sectionPage[section]?.description || 'SABI study module' : 'SABI platform section';

  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-3xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          SABI CBT
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {title}
        </h1>
        <p className="text-sm text-slate-400 mt-1">{description}</p>
      </div>

      <div className="p-8 rounded-3xl border-2 border-slate-800 text-center space-y-4">
        <BookOpenCheck size={36} className="mx-auto text-blue-400" />
        <h3 className="text-lg font-black">{title} Connected</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          This study section is integrated into your SABI dashboard session.
        </p>
        <Link to="/home" className="inline-block px-6 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
