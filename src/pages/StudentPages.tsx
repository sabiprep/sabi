import { useState, useEffect, useMemo } from 'react';
import {
  Activity, ArrowRight, Bell, BookMarked, BookOpen, BookOpenCheck,
  CheckCircle, ChevronRight, ClipboardList, Coins, Copy, Check, Download,
  Compass, FileQuestion, Flame, HelpCircle, Home, Info, LogOut,
  Menu, Moon, Settings, ShieldCheck, Sliders, Sun, Target,
  X, Zap, Award, Trash2, CheckCircle2
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';
import { supabase } from '../lib/supabase';
import { getRealUserProgress, UserRealProgress } from '../utils/userProgressStore';
import {
  getMistakeRecords,
  markMistakeMastered,
  removeMistakeRecord,
  MistakeRecord,
} from '../utils/mistakeStore';
import MathText from '../components/MathText';
import FullMockExamModal from '../components/mobile/FullMockExamModal';
import FormulaCheatSheetModal from '../components/mobile/FormulaCheatSheetModal';
import JAMBBrochureCheckerModal from '../components/mobile/JAMBBrochureCheckerModal';
import SyllabusFrequencyHeatmapModal from '../components/mobile/SyllabusFrequencyHeatmapModal';

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
  { to: '/subscription', label: 'Subscription & 5,000 💎 Vault', Icon: Coins, description: '₦10,000 One-Time Pass · 5,000 Diamonds + Streak Bonus' },
  { to: '/subject-rates', label: 'Subject Rates (100% Rule)', Icon: Activity, description: 'Full-screen mastery ratings earned from 100% flawless levels' },
  { to: '/missions', label: 'Daily UTME Missions', Icon: Award, description: 'Daily quests & Streak Bonus Diamonds' },
  { to: '/menu/mistakes', label: 'Mistake Notebook', Icon: ClipboardList, description: 'Review missed questions with step-by-step solutions' },
  { to: '/menu/resources', label: 'Study Resources', Icon: BookMarked, description: 'Formula sheet, brochure & syllabus heatmap' },
  { to: '/menu/help', label: 'Help & Support', Icon: HelpCircle, description: 'Get help using SABI & Unique ID recovery' },
  { to: '/menu/about', label: 'About SABI', Icon: Info, description: 'About the UTME CBT learning platform' },
  { to: '/profile', label: 'Profile & Settings', Icon: Settings, description: 'Preferences, Unique SABI ID & subscription' },
];

function useLiveUserProgress(): UserRealProgress {
  const [progress, setProgress] = useState<UserRealProgress>(() => getRealUserProgress());

  useEffect(() => {
    const sync = () => setProgress(getRealUserProgress());
    window.addEventListener('sabi-progress-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('sabi-progress-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  return progress;
}

function getCandidateOnboardingMeta() {
  if (typeof window === 'undefined') {
    return {
      chosenSubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
      targetCourse: 'Medicine & Surgery',
      targetUniversity: 'UNILAG',
      targetScore: 320,
    };
  }
  try {
    const raw = localStorage.getItem('sabi_onboarding_v2_answers');
    if (!raw) {
      return {
        chosenSubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
        targetCourse: 'Medicine & Surgery',
        targetUniversity: 'UNILAG',
        targetScore: 320,
      };
    }
    const parsed = JSON.parse(raw);
    return {
      chosenSubjects:
        Array.isArray(parsed.chosenSubjects) && parsed.chosenSubjects.length === 4
          ? parsed.chosenSubjects
          : ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
      targetCourse: parsed.targetCourse || 'Medicine & Surgery',
      targetUniversity: parsed.targetUniversity || 'UNILAG',
      targetScore: Number(parsed.targetScore) || 320,
    };
  } catch {
    return {
      chosenSubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
      targetCourse: 'Medicine & Surgery',
      targetUniversity: 'UNILAG',
      targetScore: 320,
    };
  }
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, setMode, toggleTheme, dimnessLevel, setDimnessLevel } = useTheme();
  const progress = useLiveUserProgress();
  const userName =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'Candidate';

  // Ensure any active session actually exists in Supabase public.profiles (clears localStorage-only accounts)
  useEffect(() => {
    const savedEmail = (localStorage.getItem('sabi_user_email') || '').trim().toLowerCase();
    const isSigned = localStorage.getItem('sabi_user_signed_in') === 'true';
    if (!isSigned || !savedEmail) {
      localStorage.removeItem('sabi_user_signed_in');
      navigate('/auth/choice', { replace: true });
      return;
    }

    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, email, full_name, sabi_unique_id')
      .eq('email', savedEmail)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        if (!data || !data.email) {
          // Account was only in localStorage and does not exist in Supabase -> force real registration
          localStorage.removeItem('sabi_user_signed_in');
          navigate('/auth/choice', { replace: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'} transition-colors duration-200 flex flex-col`}>
      {/* Top Navbar */}
      <header className={`sabi-top-safe-bar px-4 sm:px-8 py-3.5 border-b sticky top-0 z-40 backdrop-blur-md ${
        isDark ? 'bg-[#080D1A]/95 border-slate-800' : 'bg-white/95 border-slate-200'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left Brand Lockup + 3-Dash Menu Button (Always Visible) */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className={`p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-blue-400 hover:bg-slate-800'
                  : 'border-slate-200 bg-slate-50 text-blue-700 hover:bg-blue-50'
              }`}
              aria-label="Open 3-dash menu"
              title="Open 3-Dash Menu (Subscription, Theme & Dimness)"
            >
              <Menu size={22} />
            </button>

            <Link to="/home" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
                <span className="font-black text-white text-lg tracking-wider">S</span>
              </div>
              <div className="flex flex-col">
                <span className="font-black text-lg tracking-tight leading-none text-blue-700 dark:text-white">
                  SABI
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-blue-400 uppercase tracking-widest leading-none mt-0.5">
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
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                      : isDark
                      ? 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                      : 'text-slate-600 hover:text-blue-700 hover:bg-blue-50/60'
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
            {/* Real Streak & Verified Diamond Balance (0 until subscribed/earned) */}
            <div className="hidden sm:flex items-center gap-2">
              <Link
                to="/missions"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100/80 border border-yellow-200 dark:border-yellow-800/40 text-xs font-black text-amber-700 dark:text-yellow-300 transition"
                title="View Daily UTME Missions & Real Streaks"
              >
                <Flame size={15} className={progress.streakDays > 0 ? 'animate-bounce text-amber-500' : 'text-amber-500'} />
                <span>{progress.streakDays}d</span>
              </Link>
              <Link
                to="/subscription"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/80 border border-blue-200 dark:border-blue-800 text-xs font-black text-blue-700 dark:text-blue-300 transition"
                title={`Streak Bonus: ${progress.streakBonusDiamonds} 💎 (Used First) | Main Vault: ${progress.mainDiamonds} 💎`}
              >
                <Coins size={15} />
                <span>{progress.diamonds} 💎</span>
              </Link>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors ${
                isDark ? 'bg-slate-800 border-slate-700 text-blue-300' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Student Profile Pill */}
            <Link
              to="/profile"
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition ${
                isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800' : 'bg-white border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold hidden sm:inline">
                {userName.split(' ')[0]}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Outlet Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 flex-1">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className={`sabi-bottom-safe lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-2 flex items-center justify-around backdrop-blur-md ${
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
                  ? 'text-blue-600 dark:text-blue-400 font-black scale-105'
                  : 'hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Icon size={18} />
              <span>{label.split(' ')[0]}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* 3-Dash Drawer Menu (Subscription, Theme Normal/Night + Number-Line Dimness, Toolkit) */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className={`sabi-drawer-safe sabi-bottom-safe w-80 sm:w-96 max-w-[88vw] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto ${
              isDark ? 'bg-[#090F1E] border-r border-slate-800 text-white' : 'bg-white border-r border-slate-200 text-slate-900'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white text-sm">
                    S
                  </div>
                  <div>
                    <span className="font-black text-base block leading-none">SABI JAMB CBT</span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                      Command Drawer
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Dedicated Subscription & 5,000 Diamonds Button Inside 3-Dash Menu */}
              <Link
                to="/subscription"
                onClick={() => setMenuOpen(false)}
                className="block p-4 rounded-2xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border border-blue-600 text-white shadow-lg hover:brightness-105 transition"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-yellow-50 text-blue-950 font-black text-[10px] uppercase tracking-wider">
                    ₦10,000 One-Time Pass
                  </span>
                  <span className="font-mono font-black text-xs text-blue-100">
                    {progress.diamonds} 💎 Active
                  </span>
                </div>
                <h4 className="font-black text-sm text-white">
                  Subscription & 5,000 💎 Vault →
                </h4>
                <p className="text-[11px] font-medium text-blue-100/90 mt-0.5">
                  Streak Bonus ({progress.streakBonusDiamonds} 💎) used first before Main 5K 💎!
                </p>
              </Link>

              {/* THEME & EYE-COMFORT DIMNESS NUMBER-LINE CONTROLLER */}
              <div
                className={`p-4 rounded-2xl border space-y-3.5 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Theme & Eye Dimness
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {isDark ? 'Night Mode' : 'Normal Mode'} · Dim {dimnessLevel}/10
                  </span>
                </div>

                {/* Normal vs Night Mode Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      !isDark
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <Sun size={14} />
                    <span>Normal (Light)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      isDark
                        ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:text-slate-950'
                    }`}
                  >
                    <Moon size={14} />
                    <span>Night (Dark)</span>
                  </button>
                </div>

                {/* Number-Line Dimness Control (0 to 10) Overpowering Header & Background */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400">
                      Dimness Number-Line (Overpowers Header & Screen):
                    </span>
                    {dimnessLevel > 0 && (
                      <button
                        type="button"
                        onClick={() => setDimnessLevel(0)}
                        className="text-blue-600 dark:text-blue-400 hover:underline font-black cursor-pointer"
                      >
                        Reset (0)
                      </button>
                    )}
                  </div>

                  {/* Interactive 0–10 Number Line */}
                  <div className="grid grid-cols-11 gap-1 pt-1">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => {
                      const active = dimnessLevel === num;
                      return (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setDimnessLevel(num)}
                          className={`py-1.5 rounded-lg text-[10px] font-mono font-black border transition cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-500 scale-105 shadow-xs'
                              : isDark
                              ? 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-400'
                          }`}
                          title={`Set screen dimness to ${num} / 10`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                  Study Toolkit & Vault
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
                    supabase.auth.signOut().catch(() => {});
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
// DYNAMIC SUBJECT METADATA & REAL RATES
// ==========================================
const SUBJECT_TOPIC_META: Record<
  string,
  { badge: string; strongTopics: string[]; focusTopics: string[] }
> = {
  'English Language': {
    badge: 'Compulsory Use of English',
    strongTopics: ['Comprehension Passages', 'Registers & Idioms'],
    focusTopics: ['Concord & Agreement', 'Oral English & Stress'],
  },
  Mathematics: {
    badge: 'Calculus & Algebra',
    strongTopics: ['Quadratic Equations', 'Indices & Logarithms'],
    focusTopics: ['Differentiation & Integration', 'Circle Theorems'],
  },
  Physics: {
    badge: 'Waves & Mechanics',
    strongTopics: ['Kinematics & Projectiles', 'Work, Energy & Power'],
    focusTopics: ['Waves & Sound Optics', 'Alternating Current (AC)'],
  },
  Chemistry: {
    badge: 'Organic & Stoichiometry',
    strongTopics: ['Stoichiometry & Gas Laws', 'Periodic Table'],
    focusTopics: ['IUPAC Organic Nomenclature', 'Electrolysis & Redox'],
  },
  Biology: {
    badge: 'Genetics & Ecology',
    strongTopics: ['Cell Structure & Organization', 'Ecological Management'],
    focusTopics: ['Mendelian Genetics', 'Plant & Animal Physiology'],
  },
  Economics: {
    badge: 'Macro & Micro Theory',
    strongTopics: ['Demand & Supply Elasticity', 'Market Structures'],
    focusTopics: ['National Income Accounting', 'Fiscal & Monetary Policy'],
  },
  Government: {
    badge: 'Constitutional History',
    strongTopics: ['Organs of Government', 'Nigerian Federalism'],
    focusTopics: ['Pre-Independence Constitutions', 'International Organizations'],
  },
  'Literature in English': {
    badge: 'Drama, Prose & Poetry',
    strongTopics: ['Figures of Speech', 'Unseen Prose & Poetry'],
    focusTopics: ['African & Non-African Drama', 'Prescribed JAMB Texts'],
  },
};

function SubjectRatesFullScreenView({ onClose }: { onClose?: () => void }) {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();
  const meta = getCandidateOnboardingMeta();

  const subjectCards = useMemo(() => {
    return meta.chosenSubjects.map((name: string) => {
      const stat = progress.subjectStats[name] || {
        solved: 0,
        correct: 0,
        levelsAttempted: 0,
        flawlessLevels: 0,
        rating: 0,
      };
      // Strict Subject Rating Rule: Only increases when completing a level 100% right without failing any question
      const strictRating = stat.rating || 0;
      const rawAccuracy = stat.solved > 0 ? Math.round((stat.correct / stat.solved) * 100) : 0;
      const projected = strictRating > 0 ? Math.min(98, Math.max(45, strictRating)) : 0;
      const details = SUBJECT_TOPIC_META[name] || {
        badge: 'Registered UTME Subject',
        strongTopics: ['Core Definitions', 'Past Questions'],
        focusTopics: ['Speed Accuracy', 'Syllabus Application'],
      };
      return {
        name,
        locked: name === 'English Language',
        solvedCount: stat.solved,
        correctCount: stat.correct,
        levelsAttempted: stat.levelsAttempted || 0,
        flawlessLevels: stat.flawlessLevels || 0,
        rateNum: strictRating,
        rawAccuracy,
        accuracy: `${strictRating}%`,
        questions: `${stat.solved} Practiced · ${stat.flawlessLevels || 0} Flawless Levels`,
        projectedScore:
          strictRating > 0
            ? `${projected} / 100 (Raw Acc: ${rawAccuracy}%)`
            : `0% Rating (${stat.solved} practiced, clear a level 100% flawless to boost)`,
        badge: details.badge,
        strongTopics: details.strongTopics,
        focusTopics: details.focusTopics,
      };
    });
  }, [meta.chosenSubjects, progress.subjectStats]);

  const avgMastery = useMemo(() => {
    if (subjectCards.length === 0) return 0;
    const sum = subjectCards.reduce((acc, s) => acc + s.rateNum, 0);
    return Math.round(sum / subjectCards.length);
  }, [subjectCards]);

  const projectedAggregate = useMemo(() => {
    if (avgMastery === 0) return 0;
    return Math.round((avgMastery / 100) * 400);
  }, [avgMastery]);

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
              className={`px-3.5 py-2 rounded-xl border font-black text-xs sm:text-sm flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-500 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <X size={16} />
              <span>Close</span>
            </button>
          ) : (
            <Link
              to="/home"
              className={`px-3.5 py-2 rounded-xl border font-black text-xs sm:text-sm flex items-center gap-1.5 transition ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-500 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <X size={16} />
              <span>Dashboard</span>
            </Link>
          )}
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
              Official JAMB Combination
            </span>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">
              Subject Rates Dashboard
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black">
            Avg Mastery: {avgMastery}%
          </div>
        </div>
      </header>

      {/* Main Full-Screen Subject Rates Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-800 via-blue-900 to-blue-950 border border-blue-600/40 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-blue-950 font-black text-[11px] uppercase tracking-wider">
              4 Registered UTME Subjects
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Your Live Subject Mastery & Score Projection
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl">
              Every percentage below is calculated from your real answered questions in Blitz, Smart Practice, and CBT Mocks. Solve questions in each subject to build your live UTME score projection.
            </p>
          </div>
          <div className="px-5 py-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm text-center shrink-0 w-full sm:w-auto">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-200 block">
              PROJECTED UTME AGGREGATE
            </span>
            <span className="text-3xl sm:text-4xl font-black text-white">
              {projectedAggregate > 0 ? `${projectedAggregate} / 400` : '0 / 400'}
            </span>
            <span className="text-[11px] font-bold text-emerald-300 block mt-0.5">
              Target: {meta.targetScore}+ ({meta.targetUniversity})
            </span>
          </div>
        </section>

        {/* 4 Subject Rate Cards Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {subjectCards.map(sub => (
            <div
              key={sub.name}
              className={`p-6 rounded-3xl border transition-all flex flex-col justify-between gap-5 ${
                isDark
                  ? 'bg-slate-900/95 border-slate-800 hover:border-blue-500/50'
                  : 'bg-white border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                      sub.locked
                        ? 'bg-yellow-50 dark:bg-yellow-950/40 text-amber-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50'
                        : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
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
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      Projected UTME Score: <strong className="text-blue-600 dark:text-blue-400">{sub.projectedScore}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                      Mastery Rate
                    </span>
                    <span className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400">
                      {sub.accuracy}
                    </span>
                  </div>
                </div>

                {/* Full-Width Progress Bar */}
                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(sub.rateNum, 2)}%` }}
                  />
                </div>

                {/* Strong & Focus Topics */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div
                    className={`p-3 rounded-2xl border ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block mb-1">
                      ✓ Core Syllabus Topics
                    </span>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {sub.strongTopics.join(' · ')}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-2xl border ${
                      isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-blue-50/40 border-blue-100'
                    }`}
                  >
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
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
                  className="flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white text-center transition shadow-sm"
                >
                  Blitz {sub.name.split(' ')[0]} ⚡
                </Link>
                <Link
                  to="/smart"
                  onClick={onClose}
                  className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider border text-center transition ${
                    isDark
                      ? 'border-slate-700 bg-slate-800 text-white hover:border-blue-500 hover:bg-slate-700'
                      : 'border-slate-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50'
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
  const progress = useLiveUserProgress();
  const meta = getCandidateOnboardingMeta();
  const userName =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'Candidate';

  const totalSolved = useMemo(() => {
    return Object.values(progress.subjectStats).reduce((sum, s) => sum + (s?.solved || 0), 0);
  }, [progress.subjectStats]);

  const overallAccuracy = useMemo(() => {
    const totalCorrect = Object.values(progress.subjectStats).reduce(
      (sum, s) => sum + (s?.correct || 0),
      0
    );
    return totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
  }, [progress.subjectStats, totalSolved]);

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      {showSubjectRates && (
        <SubjectRatesFullScreenView onClose={() => setShowSubjectRates(false)} />
      )}

      {/* Top Gamified HUD Bar (Real Values Only — Zero Fake Diamonds) */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition shadow-xs ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 rounded-2xl bg-yellow-50 dark:bg-yellow-950/40 text-amber-600 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800/50 font-black">
            <Flame size={22} className={progress.streakDays > 0 ? 'animate-bounce' : ''} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Streak Flame
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {progress.streakDays} {progress.streakDays === 1 ? 'Day' : 'Days'} Active
            </span>
          </div>
        </div>

        <Link
          to="/subscription"
          className={`p-4 rounded-3xl border flex items-center gap-3.5 transition shadow-xs ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400'
          }`}
        >
          <div className="p-3 rounded-2xl bg-blue-600 text-white font-black shadow-sm shadow-blue-600/20">
            <Coins size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Sabi Diamonds
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {progress.diamonds} 💎
            </span>
            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 block">
              Bonus: {progress.streakBonusDiamonds} 💎 (Used 1st)
            </span>
          </div>
        </Link>

        <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition shadow-xs ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black">
            <Zap size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Questions Solved
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white">
              {totalSolved} Solved
            </span>
          </div>
        </div>

        <div className={`p-4 rounded-3xl border flex items-center gap-3.5 transition shadow-xs ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black">
            <Target size={22} />
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Target Score
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white truncate">
              {meta.targetScore}+ ({meta.targetUniversity})
            </span>
          </div>
        </div>
      </section>

      {/* Sabi Scholar Welcome Banner (Royal Blue Primary Container + Crisp White Button) */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border border-blue-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="relative z-10 flex-1 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50/95 text-blue-950 font-black text-[11px] tracking-wider uppercase shadow-2xs">
            <Award size={13} className="text-blue-700" /> Sabi Scholar Citadel
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight text-white">
            Welcome to your Dashboard, {userName}!
          </h1>
          
          <p className="text-sm sm:text-base text-blue-100 font-medium max-w-xl leading-relaxed">
            Your target is <strong className="text-white">{meta.targetScore}+ in JAMB UTME</strong> for <strong className="text-white">{meta.targetCourse} at {meta.targetUniversity}</strong>. High-speed 60-second Blitz and 4-subject Smart Practice will turn your weak topics into solid points today.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowSubjectRates(true)}
              className="px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-800 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Activity size={15} />
              <span>See Subject Rates (4 Subjects) →</span>
            </button>
            <span className="text-xs font-black text-blue-100">
              Live Accuracy: {overallAccuracy}% ({totalSolved} Solved)
            </span>
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

      {/* THE 4 CORE DASHBOARD FEATURE CONTAINERS (Clean White Cards + Royal Blue Accents & Buttons) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 inline-block" />
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Core Practice & Subject Rates
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setShowSubjectRates(true)}
            className="text-xs font-black text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1"
          >
            <span>Subject Rates</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: SABI BLITZ (White Surface + Royal Blue CTA) */}
          <div className={`rounded-3xl p-6 border shadow-sm hover:shadow-lg flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500/60' : 'bg-white border-slate-200 hover:border-blue-300'
          }`}>
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black text-[11px] uppercase tracking-wider inline-block">
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
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                SABI BLITZ
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                Endless past & recent questions on a continuous Z-path level map with eagle streak multipliers.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-700 dark:text-blue-300">
                Level {progress.blitzUnlockedLevel} Active
              </div>
              <Link
                to="/blitz"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>Enter Blitz</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 2: SMART PRACTICE (White Surface + Royal Blue CTA) */}
          <div className={`rounded-3xl p-6 border shadow-sm hover:shadow-lg flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500/60' : 'bg-white border-slate-200 hover:border-blue-300'
          }`}>
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black text-[11px] uppercase tracking-wider inline-block">
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
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                SMART PRACTICE
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                Branching road past campus faculties. Study room simulator with student mascot, desk calculator, and theory inbox.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-700 dark:text-blue-300">
                Campus Level {progress.smartUnlockedLevel}
              </div>
              <Link
                to="/smart"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>Enter Smart</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 3: CUSTOM JAMB SIMULATOR (White Surface + Royal Blue CTA) */}
          <div className={`rounded-3xl p-6 border shadow-sm hover:shadow-lg flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500/60' : 'bg-white border-slate-200 hover:border-blue-300'
          }`}>
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black text-[11px] uppercase tracking-wider inline-block">
                  Custom Simulator
                </span>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 flex items-center justify-center shrink-0">
                  <Sliders size={22} />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                CUSTOM SIMULATOR
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                Dedicated workspace directory for custom exam configs, question counts, custom timing, and personalized practice drills.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-700 dark:text-blue-300">
                Workspace Ready
              </div>
              <Link
                to="/custom-simulator"
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>Open Simulator</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Card 4: SUBJECT RATES (White Surface + Royal Blue CTA) */}
          <div className={`rounded-3xl p-6 border shadow-sm hover:shadow-lg flex flex-col justify-between relative overflow-hidden group transition-all duration-300 ${
            isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500/60' : 'bg-white border-slate-200 hover:border-blue-300'
          }`}>
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <span className="px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/40 text-amber-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50 font-black text-[11px] uppercase tracking-wider inline-block">
                  4 Registered Subjects
                </span>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800 flex items-center justify-center shrink-0">
                  <Activity size={22} />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                SUBJECT RATES
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                Inspect your live mastery rates across {meta.chosenSubjects.join(', ')} in a full-screen analytical dashboard.
              </p>
            </div>

            <div className="pt-5 mt-5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs font-mono font-black text-blue-700 dark:text-blue-300">
                4 Subjects · {overallAccuracy}% Avg Rate
              </div>
              <button
                type="button"
                onClick={() => setShowSubjectRates(true)}
                className="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 cursor-pointer transform hover:scale-[1.02] active:scale-95"
              >
                <span>See Subject Rates</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* NIGERIAN ₦10,000 ONE-TIME PASS & 5,000 DIAMONDS + STREAK BONUS BANNER WITH CUSTOM SVG */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-900 via-blue-950 to-slate-950 border border-blue-700/60 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-blue-950 font-black text-[11px] uppercase tracking-wider">
            <Coins size={13} className="text-blue-700" />
            <span>₦10,000 One-Time UTME Pass = 5,000 💎 Vault</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            5,000 Diamonds Split Across All Study Sections + Free Streak Bonus Shield
          </h2>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-2xl">
            Just like Duolingo, serious candidates with a strong daily streak earn free <strong>Streak Bonus Diamonds ({progress.streakBonusDiamonds} 💎 earned)</strong> that are <strong>always used up first before your main 5,000 💎 vault is ever touched</strong>!
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Link
              to="/subscription"
              className="px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-blue-900 font-black text-xs uppercase tracking-wider transition flex items-center gap-2 shadow-lg"
            >
              <span>Open ₦10,000 Subscription & 5,000 💎 Vault</span>
              <ArrowRight size={15} />
            </Link>
            <span className="text-xs font-semibold text-blue-200">
              Also accessible anytime inside the top-left 3-dash menu
            </span>
          </div>
        </div>

        <div className="w-full max-w-[320px] shrink-0">
          <img
            src="/assets/environment/subscription_banner.svg"
            alt="SABI ₦10,000 = 5,000 Diamonds Subscription Vault"
            className="w-full h-auto object-contain drop-shadow-2xl"
          />
        </div>
      </section>
    </div>
  );
}

// ==========================================
// DAILY UTME MISSIONS PAGE (/missions) — REAL PROGRESS, NO FAKE DIAMONDS
// ==========================================
export function DailyMissionsPage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();

  const blitzGoal = 15;
  const blitzDone = Math.min(blitzGoal, progress.dailyBlitzSolved);
  const smartDone = Math.min(1, progress.dailySmartLevelsCleared);
  const diagDone = Math.min(1, progress.dailyDiagnosticsCompleted);

  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-5xl mx-auto">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          Daily Missions & Study Consistency
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Daily UTME Missions
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Track your real daily study targets across Blitz, Smart Practice, and Weak Topic Diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className={`p-5 rounded-3xl border-2 flex items-center gap-4 ${
          isDark ? 'bg-slate-900/80 border-amber-500/30' : 'bg-white border-amber-200'
        }`}>
          <div className="p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Flame size={26} className={progress.streakDays > 0 ? 'animate-bounce' : ''} />
          </div>
          <div>
            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Streak Flame
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {progress.streakDays} {progress.streakDays === 1 ? 'Day' : 'Days'} Active 🔥
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
              Verified Diamonds
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {progress.diamonds} 💎
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
              Today's Blitz Count
            </span>
            <span className="text-xl font-black text-slate-900 dark:text-white">
              {progress.dailyBlitzSolved} Solved Today
            </span>
          </div>
        </div>
      </div>

      {/* Real Daily Quests Container */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`lg:col-span-7 p-6 sm:p-8 rounded-3xl border-2 space-y-5 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        } shadow-sm`}>
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Award size={22} className="text-amber-500" />
              <span>Today's Live Missions</span>
            </h3>
            <span className="text-xs font-black text-amber-500 uppercase tracking-wider">
              Real-Time Tracking
            </span>
          </div>

          <div className="space-y-3">
            {/* Mission 1 */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                {blitzDone >= blitzGoal ? (
                  <CheckCircle size={22} className="text-emerald-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-amber-400 inline-block" />
                )}
                <div>
                  <span className="text-xs sm:text-sm font-bold block text-slate-900 dark:text-white">
                    Solve 15 Blitz Speed Questions Today
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {blitzDone} / {blitzGoal} Completed today
                  </span>
                </div>
              </div>
              <Link
                to="/blitz"
                className="px-4 py-2 rounded-xl text-xs font-black bg-blue-700 hover:bg-blue-800 text-white transition"
              >
                {blitzDone >= blitzGoal ? 'Completed ✓' : 'Drill Blitz →'}
              </Link>
            </div>

            {/* Mission 2 */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                {smartDone >= 1 ? (
                  <CheckCircle size={22} className="text-emerald-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-400 inline-block" />
                )}
                <div>
                  <span className="text-xs sm:text-sm font-bold block text-slate-900 dark:text-white">
                    Clear 1 Campus Level in Smart Practice
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Progress: {smartDone} / 1 Level today
                  </span>
                </div>
              </div>
              <Link
                to="/smart"
                className="text-xs font-black text-blue-600 dark:text-amber-400 hover:underline flex items-center gap-1"
              >
                <span>{smartDone >= 1 ? 'Completed ✓' : 'Go to Campus'}</span>
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Mission 3 */}
            <div className={`p-4 rounded-2xl border flex items-center justify-between ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                {diagDone >= 1 ? (
                  <CheckCircle size={22} className="text-emerald-500" />
                ) : (
                  <span className="w-5 h-5 rounded-full border-2 border-slate-400 inline-block" />
                )}
                <div>
                  <span className="text-xs sm:text-sm font-bold block text-slate-900 dark:text-white">
                    Complete 1 Diagnostic on Weak Topics
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Progress: {diagDone} / 1 Completed today
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
        <div className="lg:col-span-5 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 text-white shadow-xl flex flex-col justify-between border border-blue-600">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-blue-950 font-black text-[10px] uppercase tracking-wider mb-3">
              <FileQuestion size={12} className="text-blue-700" /> Official JAMB UTME Simulator
            </div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight text-white">
              180-Question Timed Mock Exam
            </h3>
            <p className="text-xs text-blue-100 font-medium mt-2 leading-relaxed">
              Simulate full UTME exam conditions with 120-minute countdown, 8-digit onscreen calculator, and instant official JAMB result slip.
            </p>
          </div>

          <div className="pt-6">
            <Link
              to="/cbt"
              className="w-full py-4 rounded-2xl font-black text-sm bg-white hover:bg-blue-50 text-blue-800 transition flex items-center justify-center gap-2 shadow-lg"
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
        <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
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
        {/* Blitz Card (Clean White Surface + Royal Blue CTA) */}
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-md flex flex-col justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black text-[11px] uppercase tracking-wider">
                Endless 60s Mode
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-3">
                SABI BLITZ
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                Eagle mascot, continuous Z-path with 10Q and 15Q levels, formula rendering, and instant step-by-step corrections.
              </p>
            </div>
            <img src="/assets/mascots/blitz/eagle_idle.svg" alt="Eagle" className="w-20 h-20 object-contain shrink-0" />
          </div>
          <Link
            to="/blitz"
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white text-center transition shadow-md shadow-blue-600/20"
          >
            Launch Blitz Level Path →
          </Link>
        </div>

        {/* Smart Practice Card (Clean White Surface + Royal Blue CTA) */}
        <div className={`rounded-3xl p-6 sm:p-8 border shadow-md flex flex-col justify-between ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black text-[11px] uppercase tracking-wider">
                4-Subject Road
              </span>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-3">
                SMART PRACTICE
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium mt-2 leading-relaxed">
                Forward branches (Straight, Left, Right) past campus faculties. Study room with animated student and desk calculator.
              </p>
            </div>
            <img src="/assets/mascots/smart/student_desk_studying.svg" alt="Student" className="w-20 h-20 object-contain shrink-0" />
          </div>
          <Link
            to="/smart"
            className="w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white text-center transition shadow-md shadow-blue-600/20"
          >
            Launch Smart Practice Road →
          </Link>
        </div>
      </div>

      {/* Additional Modes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to="/cbt"
          className={`p-6 rounded-3xl border transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          } flex items-center justify-between group`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black">
              <FileQuestion size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                180-Q UTME CBT Mock
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Official 120-minute timer and onscreen calculator
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/diagnostic"
          className={`p-6 rounded-3xl border transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          } flex items-center justify-between group`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black">
              <Activity size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Weak Topic Diagnostic
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Rapid evaluation of Organic Chem, Waves, and Concord
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/custom-simulator"
          className={`p-6 rounded-3xl border transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          } flex items-center justify-between group sm:col-span-2`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-black">
              <Sliders size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Custom JAMB Simulator Dashboard
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dedicated simulator workspace directory
              </p>
            </div>
          </div>
          <ArrowRight size={20} className="text-blue-600 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// CBT SIMULATOR PAGE (REAL INTERACTIVE EXAM LAUNCHER)
// ==========================================
export function CbtPage() {
  const { isDark } = useTheme();
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
          JAMB CBT Simulator
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Prepare Under Strict Exam Conditions
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Simulate the official JAMB UTME environment with 4-subject switching, question navigation grid, and onscreen calculator.
        </p>
      </div>

      <div className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border border-blue-600 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full bg-yellow-50 text-blue-950 font-black text-[10px] uppercase">
            Official UTME Mock
          </span>
          <h2 className="text-2xl font-black text-white">Full 4-Subject UTME Mock · 120 Minutes</h2>
          <p className="text-xs font-medium max-w-xl text-blue-100">
            English Language + 3 Chosen Subjects. Features accurate 8-digit onscreen calculator, question flagging, and instant JAMB score breakdown out of 400.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsExamModalOpen(true)}
          className="px-7 py-4 rounded-2xl font-black text-sm bg-white hover:bg-blue-50 text-blue-800 transition flex items-center gap-2 shrink-0 shadow-lg cursor-pointer"
        >
          <span>Start Full Exam Now</span>
          <ArrowRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setIsExamModalOpen(true)}
          className={`p-6 rounded-3xl border text-left transition cursor-pointer ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
          }`}
        >
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">Quick Mock</span>
          <h3 className="text-xl font-black mt-1">Rapid 4-Subject CBT Sprint</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Launch the interactive CBT simulator for a focused timed session.</p>
        </button>

        <Link
          to="/blitz"
          className={`p-6 rounded-3xl border text-left transition ${
            isDark ? 'bg-slate-900/80 border-slate-800 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-400 shadow-xs'
          }`}
        >
          <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase">Subject Speed Drill</span>
          <h3 className="text-xl font-black mt-1">Single Subject · 60s Blitz</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Deep drill in English, Mathematics, Physics, or Chemistry.</p>
        </Link>
      </div>

      <FullMockExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onAddXP={() => {}}
      />
    </div>
  );
}

// ==========================================
// PROGRESS PAGE (DAILY ACTIVITY TRACKER & STRICT 100%-FLAWLESS SUBJECT RATINGS)
// ==========================================
export function ProgressPage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();
  const meta = getCandidateOnboardingMeta();

  const totalSolved = Object.values(progress.subjectStats).reduce((acc, s) => acc + (s?.solved || 0), 0);
  const totalCorrect = Object.values(progress.subjectStats).reduce((acc, s) => acc + (s?.correct || 0), 0);
  const accuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  const avgStrictRating = useMemo(() => {
    const subs = meta.chosenSubjects;
    if (subs.length === 0) return 0;
    const sum = subs.reduce((acc: number, name: string) => acc + (progress.subjectStats[name]?.rating || 0), 0);
    return Math.round(sum / subs.length);
  }, [meta.chosenSubjects, progress.subjectStats]);

  const dailyEntries = useMemo(() => {
    return Object.values(progress.dailyActivityLog || {}).sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [progress.dailyActivityLog]);

  return (
    <div className="space-y-8 pb-16 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            Daily Activity & Strict Subject Ratings
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Your UTME Daily Activity & Flawless Subject Ratings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Every practice attempt is logged below. Official <strong>Subject Ratings (%)</strong> only increase when you clear a level <strong>100% right without failing a single question</strong>.
          </p>
        </div>

        <Link
          to="/subject-rates"
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 self-start shadow-sm"
        >
          Full-Screen Subject Rates →
        </Link>
      </div>

      {/* 4 Registered Subjects Strict Rating Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {meta.chosenSubjects.map((subName: string) => {
          const stat = progress.subjectStats[subName] || {
            solved: 0,
            correct: 0,
            levelsAttempted: 0,
            flawlessLevels: 0,
            rating: 0,
          };
          const rating = stat.rating || 0;
          const rawAcc = stat.solved > 0 ? Math.round((stat.correct / stat.solved) * 100) : 0;

          return (
            <div
              key={subName}
              className={`p-5 rounded-3xl border space-y-3 ${
                isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase truncate">
                  {subName}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-black">
                  {stat.flawlessLevels || 0} Flawless
                </span>
              </div>

              <div>
                <span className="text-3xl font-black text-blue-600 dark:text-blue-400">
                  {rating}%
                </span>
                <span className="text-[10px] font-bold text-slate-400 block">
                  Official Subject Rating (100% Level Rule)
                </span>
              </div>

              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-700 to-blue-500 rounded-full transition-all"
                  style={{ width: `${Math.max(3, rating)}%` }}
                />
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400">
                <span>{stat.solved} Practiced</span>
                <span>Raw Acc: {rawAcc}%</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Daily Activity Log Section */}
      <section
        className={`p-6 sm:p-8 rounded-3xl border space-y-5 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              Tracked Daily Study Activities
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Total Practiced: {totalSolved} questions ({accuracy}% raw accuracy) · Average Strict Rating: {avgStrictRating}%
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/50 text-amber-800 dark:text-yellow-300 text-xs font-black">
            {progress.streakDays} Day Active Streak 🔥
          </span>
        </div>

        {dailyEntries.length === 0 ? (
          <div className={`p-6 rounded-2xl border border-dashed text-center space-y-2 ${
            isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-600'
          }`}>
            <p className="text-sm font-bold">
              No daily study sessions logged yet today.
            </p>
            <p className="text-xs text-slate-400">
              Complete your first level in Blitz or Smart Practice to start tracking your daily activity and flawless subject ratings!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dailyEntries.map(entry => {
              const dayAcc =
                entry.questionsPracticed > 0
                  ? Math.round((entry.correctCount / entry.questionsPracticed) * 100)
                  : 0;
              return (
                <div
                  key={entry.date}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                        {entry.date}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-black">
                        {entry.questionsPracticed} Questions Practiced ({dayAcc}% Correct)
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                      Subjects Drilled: {(entry.subjectsPracticed || []).join(', ') || 'General UTME'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${
                      isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                    }`}>
                      Levels Attempted: <strong>{entry.levelsAttempted || 0}</strong>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-black text-emerald-600 dark:text-emerald-400">
                      100% Flawless Clears: {entry.flawlessLevelsCleared || 0}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ==========================================
// SUBSCRIPTION & 5,000 DIAMONDS VAULT PAGE (/subscription)
// ==========================================
export function SubscriptionPage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();

  const DIAMOND_SECTIONS = [
    {
      title: 'Blitz Speed Z-Path Sets & General Tests',
      allocation: '1,500 💎',
      desc: 'Unlocks all advanced Blitz sets, Set 2+ Z-Path levels, and comprehensive end-of-set General Tests.',
    },
    {
      title: 'Smart Practice Branching Campus Road',
      allocation: '1,500 💎',
      desc: 'Unlocks all merged & unmerged 4-subject campus road sets, faculty laboratories, and road checkpoints.',
    },
    {
      title: 'Official 180-Q CBT Mocks & Custom Simulator',
      allocation: '1,000 💎',
      desc: 'Unlimited full-length 120-minute UTME CBT mock exams and custom simulator configurations.',
    },
    {
      title: 'Sabi AI Solution Verifications & Explanations',
      allocation: '1,000 💎',
      desc: 'On-demand step-by-step KaTeX & Pidgin AI verifications on every question in Blitz and Smart levels.',
    },
  ];

  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            Official Nigerian UTME Pass · ₦10,000 One-Time Payment
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            SABI Subscription & 5,000 💎 Diamond Vault
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            One-time payment of <strong>₦10,000</strong> credits <strong>5,000 Diamonds (5,000 💎)</strong> split across all study sections, protected by your Duolingo-style <strong>Streak Bonus Shield</strong>.
          </p>
        </div>

        <Link
          to="/home"
          className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-black uppercase tracking-wider self-start shadow-2xs"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Hero Banner with Custom SVG (/assets/environment/subscription_banner.svg) */}
      <section className="rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-blue-800 via-blue-900 to-slate-950 border border-blue-600/50 text-white shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-yellow-50 text-blue-950 font-black text-xs uppercase tracking-wider">
            <Coins size={14} className="text-blue-700" />
            <span>One-Time UTME Access · ₦10,000 = 5,000 💎</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Unlock All Study Sets & Protect Your Vault with Daily Streaks
          </h2>

          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            No recurring monthly charges. A single <strong>₦10,000</strong> payment allocates <strong>5,000 💎</strong> across Blitz, Smart Practice, CBT Mocks, and AI Verifications. Even better: serious candidates with an active daily streak earn free <strong>Streak Bonus Diamonds</strong> that are <strong>always spent first before your main 5,000 💎 balance is ever touched</strong>!
          </p>

          {/* Live User Diamond Balances */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-200 block">
                Streak Bonus Shield (Used 1st)
              </span>
              <span className="text-2xl font-mono font-black text-white">
                {progress.streakBonusDiamonds} 💎
              </span>
              <span className="text-[10px] text-emerald-300 font-bold block mt-0.5">
                Earned free via {progress.streakDays}d streak
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/10 border border-white/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">
                Main Purchased Vault
              </span>
              <span className="text-2xl font-mono font-black text-white">
                {progress.mainDiamonds} 💎
              </span>
              <span className="text-[10px] text-blue-200/80 font-bold block mt-0.5">
                {progress.subscriptionPlan === 'free' ? '0 / 5,000 💎 (Unpaid)' : 'Active Pass'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white text-blue-950 shadow-md">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                Total Available Diamonds
              </span>
              <span className="text-2xl font-mono font-black text-blue-950">
                {progress.diamonds} 💎
              </span>
              <span className="text-[10px] font-black text-blue-600 block mt-0.5">
                Zero Fake Diamonds Policy
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex justify-center">
          <img
            src="/assets/environment/subscription_banner.svg"
            alt="₦10,000 = 5,000 Diamonds Subscription Vault Banner"
            className="w-full max-w-[360px] h-auto object-contain drop-shadow-2xl"
          />
        </div>
      </section>

      {/* How the 5,000 Diamonds Are Split Across Sections */}
      <section className="space-y-4">
        <h3 className="text-xl font-black text-slate-900 dark:text-white">
          How Your 5,000 💎 Vault Is Split Across SABI Sections
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {DIAMOND_SECTIONS.map(sec => (
            <div
              key={sec.title}
              className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-3 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-black text-xs uppercase">
                  Section Allocation
                </span>
                <span className="text-xl font-mono font-black text-blue-700 dark:text-blue-400">
                  {sec.allocation}
                </span>
              </div>
              <h4 className="text-lg font-black text-slate-900 dark:text-white">{sec.title}</h4>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                {sec.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Duolingo-Style Streak Bonus Explanation & Payment Gateway Readiness */}
      <section
        className={`p-6 sm:p-8 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-800/50 text-xs font-black uppercase tracking-wider text-amber-800 dark:text-yellow-300">
            <Flame size={15} className="text-amber-500" />
            <span>Duolingo-Style Serious Streak Protection</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            Keep Your Daily Streak Alive & Spend Free Bonus Diamonds First
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Every consecutive day you practice (+15 💎) and every level you clear 100% flawlessly (+10 💎) adds free <strong>Streak Bonus Diamonds</strong> to your account. Whenever diamonds are required, SABI automatically deducts from your Streak Bonus bucket first—preserving your main 5,000 💎 vault!
          </p>
        </div>

        <div className="w-full md:w-auto shrink-0 text-center space-y-2">
          <button
            type="button"
            disabled
            className="w-full md:w-auto px-7 py-4 rounded-2xl bg-blue-600 text-white font-black text-xs sm:text-sm uppercase tracking-wider opacity-90 cursor-not-allowed shadow-md"
          >
            ₦10,000 Payment Gateway (Integrating Soon)
          </button>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 block">
            Standard Subscription Vault Ready for Live Naira Checkout
          </span>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// PROFILE PAGE (With Unique SABI ID, Recovery Doc Download & Real 0-Diamond Balance)
// ==========================================
export function ProfilePage() {
  const { isDark, toggleTheme } = useTheme();
  const [copiedId, setCopiedId] = useState(false);
  const progress = useLiveUserProgress();

  const userName = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'Candidate';
  const userEmail = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_email')) || 'scholar@sabi.ng';
  const userPhone = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_phone')) || '+234';
  const userState = (typeof window !== 'undefined' && localStorage.getItem('sabi_user_state')) || 'Lagos';
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
        <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
          Account & Verification Vault
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Student Profile & Unique ID
        </h1>
      </div>

      {/* Unique SABI ID Vault Card (Royal Blue Primary + White Secondary) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-blue-700 via-blue-800 to-blue-950 border border-blue-600 text-white shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-50 text-blue-950 font-black text-[11px] uppercase tracking-wider mb-2">
              <ShieldCheck size={13} className="text-blue-700" /> Mandatory Account Recovery Grant
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Your Unique SABI Verification ID
            </h2>
            <p className="text-xs sm:text-sm font-medium text-blue-100 mt-1 max-w-md">
              This 5-character code (4 digits + 1 letter) is permanently linked to your email and Google account. It is required whenever you reset your password.
            </p>
          </div>

          <div className="px-6 py-4 rounded-2xl bg-white text-blue-950 border border-blue-200 text-center shrink-0 shadow-md">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 block">
              UNIQUE ID
            </span>
            <span className="text-3xl font-mono font-black tracking-widest text-blue-950">
              {uniqueId}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-white/15">
          <button
            type="button"
            onClick={handleCopyId}
            className="px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-800 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            {copiedId ? <Check size={15} /> : <Copy size={15} />}
            <span>{copiedId ? 'Copied to Clipboard' : 'Copy Unique ID'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadRecoveryDoc}
            className="px-5 py-3 rounded-xl bg-blue-950/60 hover:bg-blue-950 text-white border border-white/20 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Download size={15} />
            <span>Download Recovery ID Doc (.txt)</span>
          </button>
        </div>
      </div>

      {/* Candidate Details, Verified Diamond Balance & Preferences */}
      <div className={`p-6 sm:p-8 rounded-3xl border space-y-6 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-2xl flex items-center justify-center shadow-md">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black">{userName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{userEmail} · {userPhone} · {userState}</p>
              <span className="inline-block text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">
                Active Candidate (2026/2027 UTME) · ID: {uniqueId}
              </span>
            </div>
          </div>

          <div className={`px-4 py-3 rounded-2xl border text-right ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Verified Diamond Balance
            </span>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400">
              {progress.diamonds} 💎
            </span>
            <span className="text-[10px] font-bold text-slate-400 block">
              Plan: {progress.subscriptionPlan === 'free' ? 'Free Tier' : progress.subscriptionPlan}
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
              className="px-4 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
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
  const { isDark } = useTheme();
  return (
    <div className="space-y-8 pb-16 lg:pb-0 max-w-2xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
          Updates
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          Notifications
        </h1>
      </div>

      <div className={`p-8 rounded-3xl border text-center space-y-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <Bell size={32} className="mx-auto text-blue-600 dark:text-blue-400 opacity-70" />
        <h3 className="text-lg font-black">You're All Caught Up</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">No pending notifications. Keep drilling your subjects!</p>
        <Link to="/home" className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs mt-2">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}

// ==========================================
// REAL INTERACTIVE TOOLKIT SUB-PAGES (/menu/:section)
// ==========================================
export function MainPage({ page }: { page: string }) {
  const { section } = useParams();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Mistake Notebook State
  const [mistakes, setMistakes] = useState<MistakeRecord[]>(() => getMistakeRecords());
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState<string>('All');

  // Study Resources Modals State
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);

  useEffect(() => {
    setMistakes(getMistakeRecords());
  }, [section]);

  // 1. REAL MISTAKE NOTEBOOK (/menu/mistakes)
  if (section === 'mistakes') {
    const filteredMistakes =
      mistakeSubjectFilter === 'All'
        ? mistakes
        : mistakes.filter(m => m.question.subject === mistakeSubjectFilter);

    return (
      <div className="space-y-6 pb-16 lg:pb-0 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              Error Correction Engine
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Mistake Notebook ({mistakes.length})
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Every question you miss in Blitz, Smart Practice, or CBT is automatically logged here with its worked solution.
            </p>
          </div>
          <Link
            to="/blitz"
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 self-start"
          >
            Practice in Blitz →
          </Link>
        </div>

        {/* Subject Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {['All', 'English Language', 'Mathematics', 'Physics', 'Chemistry'].map(sub => (
            <button
              key={sub}
              onClick={() => setMistakeSubjectFilter(sub)}
              className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
                mistakeSubjectFilter === sub
                  ? 'bg-blue-600 text-white border-blue-600'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {filteredMistakes.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center space-y-3 ${
            isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <h3 className="text-lg font-black">No Unresolved Mistakes in {mistakeSubjectFilter}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              As soon as you miss a question in Blitz, Smart Practice, or CBT Mock, it will appear here with step-by-step corrections.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map(item => (
              <div
                key={item.question.id}
                className={`p-6 rounded-3xl border space-y-4 ${
                  isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black">
                    {item.question.subject} · {item.question.topic}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        markMistakeMastered(item.question.id);
                        setMistakes(getMistakeRecords());
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-500/25 cursor-pointer"
                    >
                      {item.mastered ? 'Mastered ✓' : 'Mark Mastered'}
                    </button>
                    <button
                      onClick={() => {
                        removeMistakeRecord(item.question.id);
                        setMistakes(getMistakeRecords());
                      }}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 cursor-pointer"
                      title="Remove from Notebook"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="text-sm sm:text-base font-bold leading-relaxed">
                  <MathText text={item.question.question} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold">
                    Your Answer: Option {item.selectedAnswer}
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                    Correct Answer: Option {item.question.answer} (
                    <MathText text={item.question.options[item.question.answer]} />)
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <strong className="font-black text-blue-600 dark:text-blue-400 block mb-1">Worked Step-by-Step Solution:</strong>
                  <MathText text={item.question.explanation} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. REAL STUDY RESOURCES (/menu/resources)
  if (section === 'resources') {
    return (
      <div className="space-y-6 pb-16 lg:pb-0 max-w-4xl">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
            Official Reference Vault
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Study Resources, Formula Sheet & Syllabus
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Open the interactive JAMB Formula Cheat Sheet, University Course Brochure Checker, or High-Yield Syllabus Frequency Heatmap.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black uppercase">
                LaTeX Equations
              </span>
              <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">Formula Cheat Sheet</h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                High-frequency Physics, Chemistry, and Mathematics equations & mnemonics tested in UTME.
              </p>
            </div>
            <button
              onClick={() => setShowFormulaModal(true)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase cursor-pointer"
            >
              Open Formula Sheet →
            </button>
          </div>

          <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black uppercase">
                Subject Combinations
              </span>
              <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">JAMB Brochure Checker</h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                Verify official UTME 4-subject combinations and cut-off requirements for Nigerian universities.
              </p>
            </div>
            <button
              onClick={() => setShowBrochureModal(true)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase cursor-pointer"
            >
              Open Brochure Checker →
            </button>
          </div>

          <div className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div>
              <span className="px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/40 text-amber-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50 text-[10px] font-black uppercase">
                Topic Weighting
              </span>
              <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">Syllabus Frequency Map</h3>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-1">
                See which topics carry the highest question frequency in past JAMB papers.
              </p>
            </div>
            <button
              onClick={() => setShowHeatmapModal(true)}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase cursor-pointer"
            >
              Open Syllabus Map →
            </button>
          </div>
        </div>

        <FormulaCheatSheetModal isOpen={showFormulaModal} onClose={() => setShowFormulaModal(false)} />
        <JAMBBrochureCheckerModal
          isOpen={showBrochureModal}
          onClose={() => setShowBrochureModal(false)}
          profile={{
            name: (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'Candidate',
            classLevel: 'SSS3',
            attempts: 1,
            chosenSubjects: getCandidateOnboardingMeta().chosenSubjects as any,
            targetCourse: getCandidateOnboardingMeta().targetCourse,
            targetUniversity: getCandidateOnboardingMeta().targetUniversity,
            monthsUntilExam: 3,
            priorScoreBaseline: getCandidateOnboardingMeta().targetScore,
            subjectConfidence: {} as any,
            struggleTypes: {} as any,
            studyHabits: 'scheduled',
            dailyStudyHours: '2h',
            studyEnvironment: 'quiet',
            explanationPreference: 'step-by-step',
            languagePreference: 'english',
            motivation: 'Admission',
            blindSpots: [],
            streakCount: 0,
            xpPoints: 0,
            unlockedSubjectsCount: 4,
            isPremium: false,
            aiCredits: 0,
            topicMemories: {},
            conversationHistory: [],
          }}
        />
        <SyllabusFrequencyHeatmapModal isOpen={showHeatmapModal} onClose={() => setShowHeatmapModal(false)} />
      </div>
    );
  }

  // 3. HELP & ABOUT PAGES (/menu/help, /menu/about)
  return (
    <div className="space-y-6 pb-16 lg:pb-0 max-w-3xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          SABI JAMB CBT Platform
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {section === 'help' ? 'Help, Keyboard Shortcuts & Account Recovery' : section === 'about' ? 'About SABI UTME Engine' : page}
        </h1>
      </div>

      <div className={`p-6 sm:p-8 rounded-3xl border-2 space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <h3 className="text-lg font-black text-amber-500">
          1. Your 5-Character Unique SABI ID (4 Numbers + 1 Letter)
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Every registered candidate is issued a permanent 5-character Unique SABI ID (for example, <code className="font-mono font-bold text-amber-400">4829K</code>). Whether you sign in with Email/Password or Google Auth using the same email address, your account remains unified. Keep your downloaded Recovery ID Doc safe—it is required to reset your password.
        </p>

        <h3 className="text-lg font-black text-amber-500 pt-2">
          2. CBT Keyboard Shortcuts (Desktop & Laptop)
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          During Blitz and CBT sessions, press <strong>A, B, C, or D</strong> on your keyboard to select an option, and press <strong>Enter</strong> or <strong>Space</strong> to submit and advance to the next question—matching official JAMB CBT centers.
        </p>

        <div className="pt-4">
          <button
            onClick={() => navigate('/home')}
            className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-black text-xs uppercase cursor-pointer"
          >
            Back to Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}
