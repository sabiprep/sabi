import { useState } from 'react';
import {
  Activity, ArrowRight, Bell, BookMarked, BookOpen, BookOpenCheck,
  CheckCircle, ChevronRight, ClipboardList, Coins, Copy, Check, Download,
  Compass, FileQuestion, Flame, HelpCircle, Home, Info, LogOut,
  Menu, Moon, Settings, ShieldCheck, Sliders, Sun, Target,
  X, Zap, Award
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';

const MAIN_NAV = [
  { to: '/home', label: 'Dashboard', Icon: Home },
  { to: '/blitz', label: 'Blitz 60s', Icon: Zap },
  { to: '/smart', label: 'Smart Practice', Icon: Compass },
  { to: '/custom-simulator', label: 'Custom Simulator', Icon: Sliders },
  { to: '/practice', label: 'Practice Hub', Icon: BookOpen },
  { to: '/cbt', label: 'CBT Simulator', Icon: FileQuestion },
  { to: '/progress', label: 'Progress', Icon: Activity },
];

const MENU_ITEMS = [
  { to: '/subject-rates', label: 'Subject Rates', Icon: Activity, description: 'Full-screen mastery rates for your 4 JAMB subjects' },
  { to: '/missions', label: 'Daily UTME Missions', Icon: Award, description: 'Daily quests, streak flames & gem rewards' },
  { to: '/menu/mistakes', label: 'Mistake Notebook', Icon: ClipboardList, description: 'Review questions to revisit' },
  { to: '/menu/resources', label: 'Study Resources', Icon: BookMarked, description: 'Formula sheet and syllabus' },
  { to: '/menu/help', label: 'Help & Support', Icon: HelpCircle, description: 'Get help using SABI' },
  { to: '/menu/about', label: 'About SABI', Icon: Info, description: 'About the learning platform' },
  { to: '/profile', label: 'Profile & Settings', Icon: Settings, description: 'Preferences and account controls' },
];

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
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
              <Link
                to="/missions"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-black text-amber-500 transition"
                title="View Daily UTME Missions & Streaks"
              >
                <Flame size={15} className="animate-bounce" />
                <span>7d</span>
              </Link>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs font-black text-blue-500">
                <Coins size={15} />
                <span>1,450</span>
              </div>
            </div>


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
                onClick={() => {
                  try {
                    localStorage.removeItem('sabi_user_signed_in');
                  } catch {
                    // ignore storage errors
                  }
                  setMenuOpen(false);
                }}
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
const REGISTERED_SUBJECTS_DATA = [
  {
    name: 'English Language',
    accuracy: '84%',
    numericRate: 84,
    questions: '210 Solved',
    locked: true,
    badge: 'Compulsory Crest',
    strongTopics: ['Comprehension Passages', 'Registers & Idioms'],
    focusTopics: ['Concord & Agreement', 'Stress & Emphatic Stress'],
    projectedScore: '76 / 100',
  },
  {
    name: 'Mathematics',
    accuracy: '78%',
    numericRate: 78,
    questions: '185 Solved',
    locked: false,
    badge: 'Calculus & Algebra',
    strongTopics: ['Quadratic Equations', 'Indices & Logarithms'],
    focusTopics: ['Differentiation & Integration', 'Circle Theorems'],
    projectedScore: '78 / 100',
  },
  {
    name: 'Physics',
    accuracy: '65%',
    numericRate: 65,
    questions: '142 Solved',
    locked: false,
    badge: 'Waves & Optics',
    strongTopics: ['Kinematics & Projectiles', 'Work, Energy & Power'],
    focusTopics: ['Waves & Sound Optics', 'Alternating Current (AC)'],
    projectedScore: '68 / 100',
  },
  {
    name: 'Chemistry',
    accuracy: '72%',
    numericRate: 72,
    questions: '160 Solved',
    locked: false,
    badge: 'Organic & Redox',
    strongTopics: ['Stoichiometry & Gas Laws', 'Periodic Table'],
    focusTopics: ['IUPAC Organic Nomenclature', 'Electrolysis & Redox'],
    projectedScore: '74 / 100',
  },
];

function SubjectRatesFullScreenView({ onClose }: { onClose?: () => void }) {
  const { isDark } = useTheme();

  return (
    <div
      className={`fixed inset-0 z-50 w-full h-[100dvh] overflow-y-auto flex flex-col animate-fade-in ${
        isDark ? 'bg-[#060B18] text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Full-Screen Top Header */}
      <header
        className={`sticky top-0 z-20 px-4 sm:px-8 py-4 border-b backdrop-blur-md flex items-center justify-between ${
          isDark ? 'bg-[#080E1E]/95 border-slate-800' : 'bg-white/95 border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className={`px-3.5 py-2 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950'
                  : 'border-slate-200 bg-slate-100 text-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950'
              }`}
            >
              <X size={16} />
              <span>Close</span>
            </button>
          ) : (
            <Link
              to="/home"
              className={`px-3.5 py-2 rounded-xl border-2 font-black text-xs sm:text-sm flex items-center gap-1.5 transition ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950'
                  : 'border-slate-200 bg-slate-100 text-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950'
              }`}
            >
              <X size={16} />
              <span>Dashboard</span>
            </Link>
          )}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 block">
              Official JAMB Combination
            </span>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">
              Subject Rates Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black">
            Avg Mastery: 75%
          </div>
        </div>
      </header>

      {/* Main Full-Screen Subject Rates Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        {/* Overall Aggregate Projection Banner */}
        <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-950 border-2 border-blue-500/40 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider">
              4 Registered UTME Subjects
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Your Live Subject Mastery & Score Projection
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">
              Track your real-time mastery rate across each of your 4 registered JAMB subjects. Drill weak topics directly in Blitz or Smart Practice to push every subject above 85%.
            </p>
          </div>
          <div className="px-5 py-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">
              PROJECTED UTME AGGREGATE
            </span>
            <span className="text-3xl sm:text-4xl font-black text-white">296 / 400</span>
            <span className="text-[11px] font-bold text-emerald-300 block mt-0.5">
              Target: 320+ (+24 pts needed)
            </span>
          </div>
        </section>

        {/* 4 Subject Rate Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {REGISTERED_SUBJECTS_DATA.map(sub => (
            <div
              key={sub.name}
              className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between gap-5 ${
                isDark
                  ? 'bg-slate-900/95 border-slate-800 hover:border-blue-500/50'
                  : 'bg-white border-slate-200 hover:border-blue-400 shadow-md'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      sub.locked
                        ? 'bg-amber-400/20 text-amber-500 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                    }`}
                  >
                    {sub.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {sub.questions}
                  </span>
                </div>

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                      {sub.name}
                    </h3>
                    <span className="text-xs font-bold text-slate-400">
                      Projected UTME Score: <strong className="text-amber-500">{sub.projectedScore}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Mastery Rate
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-amber-400">
                      {sub.accuracy}
                    </span>
                  </div>
                </div>

                {/* Full-Width Progress Bar */}
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-amber-400 rounded-full transition-all duration-500"
                    style={{ width: sub.accuracy }}
                  />
                </div>

                {/* Strong & Focus Topics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div
                    className={`p-3 rounded-2xl border ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-500 block mb-1">
                      ✓ Strongest Topics
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sub.strongTopics.join(' · ')}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-2xl border ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block mb-1">
                      ⚡ Priority Focus
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sub.focusTopics.join(' · ')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <Link
                  to="/blitz"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white text-center transition shadow-md"
                >
                  Blitz {sub.name.split(' ')[0]} ⚡
                </Link>
                <Link
                  to="/smart"
                  onClick={onClose}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider border-2 text-center transition ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-white hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950'
                      : 'border-slate-300 bg-slate-100 text-slate-900 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950'
                  }`}
                >
                  Smart Road 🎓
                </Link>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export function SubjectRatesPage() {
  return <SubjectRatesFullScreenView />;
}

// ==========================================
// MAIN STUDENT DASHBOARD (HOMEPAGE)
// ==========================================
export function HomePage() {
  const { isDark } = useTheme();
  const [showSubjectRates, setShowSubjectRates] = useState(false);

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      {/* Full-Screen Popout for 4 Registered Subjects (Subject Rates Dashboard) */}
      {showSubjectRates && (
        <SubjectRatesFullScreenView onClose={() => setShowSubjectRates(false)} />
      )}

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

      {/* Sabi Scholar Welcome Banner (Yellow Container + Royal Blue Button) */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 flex-1 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] tracking-wider uppercase">
            <Award size={13} /> Sabi Scholar Citadel
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-slate-950">
            Welcome to your Dashboard, {typeof window !== 'undefined' && localStorage.getItem('sabi_user_name') ? localStorage.getItem('sabi_user_name') : 'David'}!
          </h1>
          
          <p className="text-sm sm:text-base text-slate-900 font-semibold max-w-xl leading-relaxed">
            Your target is <strong>320+ in JAMB UTME</strong> for <strong>Medicine & Surgery at UNILAG</strong>. High-speed 60-second Blitz and 4-subject Smart Practice will turn your weak topics into solid points today.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSubjectRates(true)}
              className="px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg shadow-blue-900/20 cursor-pointer"
            >
              <Activity size={15} />
              <span>See Subject Rates (4 Subjects) →</span>
            </button>
            <span className="text-xs font-black text-blue-950">UTME Readiness: 84%</span>
          </div>
        </div>

        <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 shrink-0 flex items-center justify-center">
          <img
            src="/assets/mascots/onboarding/scholar_welcome_salute.svg"
            alt="Sabi Scholar"
            className="w-full h-full object-contain filter drop-shadow-xl hover:scale-105 transition-transform"
          />
        </div>
      </section>

      {/* THE 4 CORE DASHBOARD FEATURE CONTAINERS (Yellow Background + Blue Buttons) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Core Practice & Subject Rates
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowSubjectRates(true)}
            className="text-xs font-black text-blue-600 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Subject Rates</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: SABI BLITZ (Yellow Container + Blue Button) */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider inline-block">
                  60s Rapid Simulator
                </span>
                <div className="w-16 h-16 shrink-0">
                  <img
                    src="/assets/mascots/blitz/eagle_idle.svg"
                    alt="Sabi Eagle Mascot"
                    className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                SABI BLITZ
              </h3>
              <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-2 leading-relaxed">
                Endless past & recent questions on a continuous Z-path level map with eagle streak multipliers.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-amber-600/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-950">
                Level 3 · 15Q Active
              </div>
              <Link
                to="/blitz"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>Enter Blitz</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 2: SMART PRACTICE (Yellow Container + Blue Button) */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider inline-block">
                  4-Subject Adaptive Road
                </span>
                <div className="w-16 h-16 shrink-0">
                  <img
                    src="/assets/mascots/smart/student_desk_studying.svg"
                    alt="Student Study Room"
                    className="w-full h-full object-contain filter drop-shadow-md group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                SMART PRACTICE
              </h3>
              <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-2 leading-relaxed">
                Branching road past campus faculties. Study room simulator with student mascot, desk calculator, and theory inbox.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-amber-600/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-950">
                West Quad · Level 2
              </div>
              <Link
                to="/smart"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>Enter Smart</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 3: CUSTOM JAMB SIMULATOR (Yellow Container + Blue Button) */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider inline-block">
                  Custom Simulator
                </span>
                <div className="w-12 h-12 rounded-2xl bg-blue-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
                  <Sliders size={22} />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                CUSTOM SIMULATOR
              </h3>
              <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-2 leading-relaxed">
                Dedicated workspace directory for custom exam configs, question counts, custom timing, and personalized practice drills.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-amber-600/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-950">
                Workspace Ready
              </div>
              <Link
                to="/custom-simulator"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>Open Simulator</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 4: SUBJECT RATES (Yellow Container + Blue Button) */}
          <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col justify-between relative overflow-hidden group transition-all duration-300">
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider inline-block">
                  4 Registered Subjects
                </span>
                <div className="w-12 h-12 rounded-2xl bg-blue-950 text-amber-400 flex items-center justify-center shrink-0 shadow-md">
                  <Activity size={22} />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
                SUBJECT RATES
              </h3>
              <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-2 leading-relaxed">
                Inspect your live mastery rates across English (84%), Maths (78%), Physics (65%), and Chemistry (72%) in a full-screen dashboard.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-amber-600/30 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-950">
                4 Subjects · 75% Avg Rate
              </div>
              <button
                type="button"
                onClick={() => setShowSubjectRates(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/25 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>See Subject Rates</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// DAILY UTME MISSIONS PAGE (/missions)
// ==========================================
export function DailyMissionsPage() {
  const [completedQuest, setCompletedQuest] = useState(false);
  const { isDark } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-5xl mx-auto">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Daily Missions & Streaks
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Daily UTME Missions & Rewards
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete your daily high-speed drills to maintain your streak flame and earn Sabi Gems for admission resources.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 ${
          isDark ? 'bg-slate-900/80 border-amber-500/30' : 'bg-white border-amber-200'
        }`}>
          <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Flame size={26} className="animate-bounce" />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Streak Flame
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              7 Days Active 🔥
            </span>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 ${
          isDark ? 'bg-slate-900/80 border-blue-500/30' : 'bg-white border-blue-200'
        }`}>
          <div className="p-3.5 rounded-2xl bg-blue-600 text-white font-black shadow-md shadow-blue-600/20">
            <Coins size={26} />
          </div>
          <div>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Sabi Gems
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              1,450 💎
            </span>
          </div>
        </div>

        <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 ${
          isDark ? 'bg-slate-900/80 border-emerald-500/30' : 'bg-white border-emerald-200'
        }`}>
          <div className="p-3.5 rounded-2xl bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20">
            <Zap size={26} />
          </div>
          <div>
            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Stamina Refill
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              Full (25/25)
            </span>
          </div>
        </div>
      </div>

      {/* Quests Container */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border-2 space-y-5 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award size={22} className="text-amber-500" />
              <span>Today's Available Missions</span>
            </h3>
            <span className="text-xs font-black text-amber-500 uppercase tracking-wider">
              +150 Gems Available
            </span>
          </div>

          <div className="space-y-3">
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle size={22} className="text-emerald-500" />
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

            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full border-2 border-slate-400 inline-block" />
                <div>
                  <span className="text-xs sm:text-sm font-bold block text-slate-900 dark:text-white">
                    Complete 1 Diagnostic on Weak Topics
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Reward: +100 Sabi Gems
                  </span>
                </div>
              </div>
              <Link
                to="/diagnostic"
                className="text-xs font-black text-blue-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>Start Diagnostic</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* 180-Q Mock Exam Quick Launch */}
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-xl shadow-amber-500/20 flex flex-col justify-between">
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
        {/* Blitz Card (Yellow Container + Blue Button) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider">
                Endless 60s Mode
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 mt-3">
                SABI BLITZ
              </h2>
              <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-2 leading-relaxed">
                Eagle mascot, continuous Z-path with 10Q and 15Q levels, formula rendering, and instant step-by-step corrections.
              </p>
            </div>
            <img src="/assets/mascots/blitz/eagle_idle.svg" alt="Eagle" className="w-20 h-20 object-contain shrink-0" />
          </div>
          <Link
            to="/blitz"
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-700 hover:bg-blue-800 text-white text-center transition shadow-lg shadow-blue-900/20"
          >
            Launch Blitz Level Path →
          </Link>
        </div>

        {/* Smart Practice Card (Yellow Container + Blue Button) */}
        <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl flex flex-col justify-between">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider">
                4-Subject Road
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-950 mt-3">
                SMART PRACTICE
              </h2>
              <p className="text-xs sm:text-sm text-slate-900 font-semibold mt-2 leading-relaxed">
                Forward branches (Straight, Left, Right) past campus faculties. Study room with animated student and desk calculator.
              </p>
            </div>
            <img src="/assets/mascots/smart/student_desk_studying.svg" alt="Student" className="w-20 h-20 object-contain shrink-0" />
          </div>
          <Link
            to="/smart"
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-700 hover:bg-blue-800 text-white text-center transition shadow-lg shadow-blue-900/20"
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

        <Link
          to="/custom-simulator"
          className={`p-6 rounded-3xl border-2 transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
          } flex items-center justify-between group sm:col-span-2`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-black">
              <Sliders size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Custom JAMB Simulator Dashboard
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Build custom question selections, configure custom time limits, and target weak syllabus topics
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
// PROFILE PAGE (With Unique SABI ID & Recovery Doc Download)
// ==========================================
export function ProfilePage() {
  const { isDark, toggleTheme } = useTheme();
  const [copiedId, setCopiedId] = useState(false);

  const userName = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'David Chukwu';
  const userEmail = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_email')) || 'david.chukwu@student.ng';
  const userPhone = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_phone')) || '+234 803 000 0000';
  const userState = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_state')) || 'Lagos State';
  const uniqueId = (typeof window !== 'undefined' && localStorage.getItem('sabi_unique_id')) || '4829K';

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(uniqueId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleDownloadRecoveryDoc = () => {
    const docText = [
      '====================================================',
      'SABI JAMB UTME PLATFORM — OFFICIAL ACCOUNT RECOVERY SLIP',
      '====================================================',
      `Candidate Name   : ${userName}`,
      `Email Address    : ${userEmail}`,
      `Phone Number     : ${userPhone}`,
      `State of Origin  : ${userState}`,
      `UNIQUE SABI ID   : ${uniqueId}`,
      '----------------------------------------------------',
      'IMPORTANT SECURITY NOTICE:',
      'Keep this 5-character Unique SABI ID (4 digits + 1 letter)',
      'in a safe place. It is your mandatory verification grant',
      'required to reset your password or recover your SABI account.',
      '====================================================',
    ].join('\n');

    const blob = new Blob([docText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SABI-Recovery-ID-${uniqueId}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-3xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Account & Verification Vault
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Student Profile & Unique ID
        </h1>
      </div>

      {/* Unique SABI ID Vault Card (Yellow Background + Blue Actions) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-amber-400 font-black text-[11px] uppercase tracking-wider mb-2">
              <ShieldCheck size={13} /> Mandatory Account Recovery Grant
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-950">
              Your Unique SABI Verification ID
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-900/85 mt-1 max-w-md">
              This 5-character code (4 digits + 1 letter) is permanently linked to your email and Google account. It is required whenever you reset your password.
            </p>
          </div>

          <div className="px-6 py-4 rounded-2xl bg-blue-950 text-amber-400 border-2 border-blue-900 text-center shrink-0 shadow-md">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
              UNIQUE ID
            </span>
            <span className="text-3xl font-mono font-black tracking-widest">
              {uniqueId}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-amber-600/30">
          <button
            type="button"
            onClick={handleCopyId}
            className="px-5 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            {copiedId ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedId ? 'Copied to Clipboard' : 'Copy Unique ID'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadRecoveryDoc}
            className="px-5 py-3 rounded-xl bg-blue-950 hover:bg-slate-900 text-amber-400 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            <Download size={15} />
            <span>Download Recovery ID Doc (.txt)</span>
          </button>
        </div>
      </div>

      {/* Candidate Details & Preferences */}
      <div className={`p-6 sm:p-8 rounded-3xl border-2 space-y-6 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-700 text-amber-400 font-black text-2xl flex items-center justify-center shadow-lg">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-black">{userName}</h2>
            <p className="text-xs text-slate-400">{userEmail} · {userPhone} · {userState}</p>
            <span className="inline-block text-xs font-bold text-blue-600 dark:text-amber-400 mt-1">
              Active Candidate (2026/2027 UTME) · ID: {uniqueId}
            </span>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-bold block">Theme Mode</span>
              <span className="text-xs text-slate-400">Toggle between Dark and Light mode</span>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-blue-700 hover:bg-blue-800 text-white cursor-pointer"
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
