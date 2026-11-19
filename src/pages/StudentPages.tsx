import { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  ArrowRight,
  Award,
  Bell,
  BookMarked,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Coins,
  Compass,
  Copy,
  Download,
  FileQuestion,
  Flame,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Menu,
  Moon,
  Play,
  Settings,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Target,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/apiClient';
import {
  getRealUserProgress,
  saveRealUserProgress,
  UserRealProgress,
} from '../utils/userProgressStore';
import { getMistakeRecords, removeMistakeRecord } from '../utils/mistakeStore';
import MathText from '../components/MathText';
import FullMockExamModal from '../components/mobile/FullMockExamModal';
import FormulaCheatSheetModal from '../components/mobile/FormulaCheatSheetModal';
import JAMBBrochureCheckerModal from '../components/mobile/JAMBBrochureCheckerModal';
import SyllabusFrequencyHeatmapModal from '../components/mobile/SyllabusFrequencyHeatmapModal';

const MAIN_NAV = [
  { to: '/home', label: 'Dashboard', Icon: Home },
  { to: '/blitz', label: 'Blitz', Icon: Zap },
  { to: '/smart', label: 'Smart Practice', Icon: Compass },
  { to: '/practice/custom', label: 'Custom Practice', Icon: Sliders },
  { to: '/practice', label: 'Practice Hub', Icon: BookOpen },
  { to: '/cbt', label: 'CBT Simulator', Icon: FileQuestion },
  { to: '/progress', label: 'Progress', Icon: Activity },
];

const MENU_ITEMS = [
  {
    to: '/subscription',
    label: 'Subscription & 5,000 💎 Vault',
    Icon: Coins,
    description: '₦10,000 One-Time Pass · 5,000 Diamonds + Streak Bonus',
  },
  {
    to: '/subject-rates',
    label: 'Subject Rates (100% Rule)',
    Icon: Activity,
    description: 'Full-screen mastery ratings earned from 100% flawless levels',
  },
  {
    to: '/missions',
    label: 'Daily UTME Missions',
    Icon: Award,
    description: 'Daily quests & Streak Bonus Diamonds',
  },
  {
    to: '/menu/mistakes',
    label: 'Mistake Notebook',
    Icon: ClipboardList,
    description: 'Review missed questions with step-by-step solutions',
  },
  {
    to: '/menu/resources',
    label: 'Study Resources',
    Icon: BookMarked,
    description: 'Formula sheet, brochure & syllabus heatmap',
  },
  {
    to: '/menu/help',
    label: 'Help & Support',
    Icon: HelpCircle,
    description: 'Get help using SABI & Unique ID recovery',
  },
  {
    to: '/menu/about',
    label: 'About SABI',
    Icon: Info,
    description: 'About the UTME CBT learning platform',
  },
  {
    to: '/profile',
    label: 'Profile & Settings',
    Icon: Settings,
    description: 'Preferences, Unique SABI ID & subscription',
  },
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
    const rawV3 = localStorage.getItem('sabi_onboarding_v3_answers');
    const rawV2 = localStorage.getItem('sabi_onboarding_v2_answers');
    const raw = rawV3 || rawV2;
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

  useEffect(() => {
    const isSigned = localStorage.getItem('sabi_user_signed_in') === 'true';
    if (!isSigned) {
      navigate('/auth/choice', { replace: true });
      return;
    }

    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (!data.session?.user) {
          localStorage.removeItem('sabi_user_signed_in');
          navigate('/auth/choice', { replace: true });
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-slate-50 text-slate-900'
      } transition-colors duration-200 flex flex-col`}
    >
      {/* Top Navbar */}
      <header
        className={`sabi-top-safe-bar px-4 sm:px-8 py-3.5 border-b sticky top-0 z-40 backdrop-blur-md ${
          isDark ? 'bg-[#080D1A]/95 border-slate-800' : 'bg-white/95 border-slate-200'
        }`}
      >
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
            {/* Real Streak & Verified Diamond Balance (Always visible on mobile & desktop) */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                to="/missions"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 hover:bg-yellow-100/80 border border-yellow-200 dark:border-yellow-800/40 text-xs font-black text-amber-700 dark:text-yellow-300 transition"
                title="View Daily UTME Missions & Real Streaks"
              >
                <Flame
                  size={14}
                  className={
                    progress.streakDays > 0 ? 'animate-bounce text-amber-500' : 'text-amber-500'
                  }
                />
                <span>{progress.streakDays}d</span>
              </Link>
              <Link
                to="/subscription"
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100/80 border border-blue-200 dark:border-blue-800 text-xs font-black text-blue-700 dark:text-blue-300 transition"
                title={`Streak Bonus: ${progress.streakBonusDiamonds} 💎 (Used First) | Main Vault: ${progress.mainDiamonds} 💎`}
              >
                <Coins size={14} />
                <span>{progress.diamonds} 💎</span>
              </Link>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-blue-300'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Student Profile Pill */}
            <Link
              to="/profile"
              className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition ${
                isDark
                  ? 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
                  : 'bg-white border-slate-200 hover:bg-slate-50 shadow-2xs'
              }`}
            >
              <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-bold hidden sm:inline">
                {userName.split(' ')[0].toUpperCase()}
              </span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Outlet Body */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-8 py-6 sm:py-8 flex-1">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar: Dashboard | Blitz | Smart | Custom | Practice */}
      <nav
        className={`sabi-bottom-safe lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t px-4 py-2 flex items-center justify-around backdrop-blur-md ${
          isDark
            ? 'bg-[#080D1A]/95 border-slate-800 text-slate-400'
            : 'bg-white/95 border-slate-200 text-slate-600'
        }`}
      >
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

      {/* 3-Dash Drawer Menu */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex"
          role="presentation"
          onClick={() => setMenuOpen(false)}
        >
          <aside
            className={`sabi-drawer-safe sabi-bottom-safe w-80 sm:w-96 max-w-[88vw] h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto ${
              isDark
                ? 'bg-[#090F1E] border-r border-slate-800 text-white'
                : 'bg-white border-r border-slate-200 text-slate-900'
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

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400">
                      Dimness Number-Line (0–10):
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
    badge: 'COMPULSORY CREST',
    strongTopics: ['Comprehension Passages', 'Registers & Idioms'],
    focusTopics: ['Concord & Agreement', 'Oral English & Stress'],
  },
  Mathematics: {
    badge: 'CALCULUS & ALGEBRA',
    strongTopics: ['Quadratic Equations', 'Indices & Logarithms'],
    focusTopics: ['Differentiation & Integration', 'Circle Theorems'],
  },
  Physics: {
    badge: 'WAVES & OPTICS',
    strongTopics: ['Kinematics & Projectiles', 'Work, Energy & Power'],
    focusTopics: ['Waves & Sound Optics', 'Alternating Current (AC)'],
  },
  Chemistry: {
    badge: 'ORGANIC & REDOX',
    strongTopics: ['Stoichiometry & Gas Laws', 'Periodic Table'],
    focusTopics: ['IUPAC Organic Nomenclature', 'Electrolysis & Redox'],
  },
  Biology: {
    badge: 'GENETICS & ECOLOGY',
    strongTopics: ['Cell Structure & Organization', 'Ecological Management'],
    focusTopics: ['Mendelian Genetics', 'Plant & Animal Physiology'],
  },
  Economics: {
    badge: 'MACRO & MICRO THEORY',
    strongTopics: ['Demand & Supply Elasticity', 'Market Structures'],
    focusTopics: ['National Income Accounting', 'Fiscal & Monetary Policy'],
  },
  Government: {
    badge: 'CONSTITUTIONAL HISTORY',
    strongTopics: ['Organs of Government', 'Nigerian Federalism'],
    focusTopics: ['Pre-Independence Constitutions', 'International Organizations'],
  },
  'Literature in English': {
    badge: 'DRAMA, PROSE & POETRY',
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
      const strictRating = stat.rating || 0;
      const rawAccuracy = stat.solved > 0 ? Math.round((stat.correct / stat.solved) * 100) : 0;
      const projected = strictRating > 0 ? Math.min(98, Math.max(45, strictRating)) : 0;
      const details = SUBJECT_TOPIC_META[name] || {
        badge: 'REGISTERED SUBJECT',
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
              Clear any level 100% flawless in Blitz or Smart Campus Road to earn a +10% Subject Rating boost and increase your projected UTME aggregate.
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
                      Projected UTME Score:{' '}
                      <strong className="text-blue-600 dark:text-blue-400">
                        {sub.projectedScore}
                      </strong>
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

                <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(sub.rateNum, 2)}%` }}
                  />
                </div>

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
// MAIN STUDENT DASHBOARD (HOMEPAGE) — RESTORED ORIGINAL LAYOUT
// ==========================================
export function HomePage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();
  const meta = getCandidateOnboardingMeta();
  const [showFullSubjectRates, setShowFullSubjectRates] = useState(false);
  const [claimedMissions, setClaimedMissions] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(`sabi_claimed_missions_${today}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const handleClaimMission = (missionId: string, rewardGems: number) => {
    if (claimedMissions[missionId]) return;
    const today = new Date().toISOString().slice(0, 10);
    const nextClaimed = { ...claimedMissions, [missionId]: true };
    setClaimedMissions(nextClaimed);
    try {
      localStorage.setItem(`sabi_claimed_missions_${today}`, JSON.stringify(nextClaimed));
    } catch {
      // ignore
    }
    const current = getRealUserProgress();
    saveRealUserProgress({
      ...current,
      streakBonusDiamonds: current.streakBonusDiamonds + rewardGems,
    });
  };

  const subjectCards = useMemo(() => {
    return meta.chosenSubjects.map((name: string) => {
      const stat = progress.subjectStats[name] || {
        solved: 0,
        correct: 0,
        levelsAttempted: 0,
        flawlessLevels: 0,
        rating: 0,
      };
      const details = SUBJECT_TOPIC_META[name] || {
        badge: 'REGISTERED SUBJECT',
        strongTopics: [],
        focusTopics: [],
      };
      const rateNum =
        stat.rating && stat.rating > 0
          ? stat.rating
          : stat.solved > 0
          ? Math.round((stat.correct / stat.solved) * 100)
          : 0;
      return {
        name,
        badge: details.badge,
        isCompulsory: name === 'English Language',
        solvedCount: stat.solved || 0,
        rateNum,
      };
    });
  }, [meta.chosenSubjects, progress.subjectStats]);

  const dailyMissions = [
    {
      id: 'blitz_15',
      title: 'Solve 15 Blitz Speed Questions',
      current: Math.min(15, progress.dailyBlitzSolved || 0),
      target: 15,
      reward: 50,
      linkTo: '/blitz',
      linkLabel: 'Go to Blitz',
    },
    {
      id: 'smart_1',
      title: 'Clear 1 Campus Level in Smart Practice',
      current: Math.min(1, progress.dailySmartLevelsCleared || 0),
      target: 1,
      reward: 50,
      linkTo: '/smart',
      linkLabel: 'Go to Campus',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-20 lg:pb-6">
      {/* TOP 3 INTERACTIVE MODE CARDS: BLITZ SPEED TRAIL | SMART CAMPUS ROAD | CUSTOM SIMULATOR */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Blitz Speed Trail */}
        <div
          className={`rounded-3xl border-2 p-6 flex flex-col justify-between gap-6 transition-all ${
            isDark
              ? 'bg-[#0C1428] border-slate-800 hover:border-blue-500 text-white'
              : 'bg-[#0B1326] border-[#1A294B] text-white shadow-xl'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Zap size={24} />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                BLITZ SPEED TRAIL
              </span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                22 Anime Z-Trail Levels
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Set 1 & Set 2 · 45s/Q & 60s/Q timer controls, Eagle companions, and Boss Archways.
              </p>
            </div>
          </div>

          <Link
            to="/blitz"
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition"
          >
            <span>OPEN BLITZ ⚡</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Card 2: Smart Campus Road */}
        <div
          className={`rounded-3xl border-2 p-6 flex flex-col justify-between gap-6 transition-all ${
            isDark
              ? 'bg-[#0C1428] border-slate-800 hover:border-blue-500 text-white'
              : 'bg-[#0B1326] border-[#1A294B] text-white shadow-xl'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
                <Compass size={24} />
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-blue-300 text-[10px] font-black uppercase tracking-widest">
                SMART CAMPUS ROAD
              </span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Desk, Library & Lab
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Untimed deep mastery with step-by-step KaTeX explanations & AI Tutor verification.
              </p>
            </div>
          </div>

          <Link
            to="/smart"
            className="w-full py-3.5 px-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition"
          >
            <span>OPEN SMART 🎓</span>
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Card 3: Custom Simulator */}
        <div
          className={`rounded-3xl border-2 p-6 flex flex-col justify-between gap-6 transition-all ${
            isDark
              ? 'bg-[#0C1428] border-slate-800 hover:border-blue-500 text-white'
              : 'bg-[#0B1326] border-[#1A294B] text-white shadow-xl'
          }`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
                <Sliders size={24} />
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                CUSTOM SIMULATOR
              </span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Target Any Topic
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed">
                Pick specific subjects, topics, question counts, and timer limits on demand.
              </p>
            </div>
          </div>

          <Link
            to="/practice/custom"
            className="w-full py-3.5 px-5 rounded-2xl bg-[#162038] hover:bg-[#1E2B4A] border border-slate-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition"
          >
            <span>OPEN SIMULATOR 🛠️</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* YOUR 4 REGISTERED SUBJECTS + DAILY UTME MISSIONS */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-6">
        {/* Left Column: Your 4 Registered Subjects */}
        <div
          className={`rounded-3xl border-2 p-5 sm:p-7 space-y-5 ${
            isDark ? 'bg-[#0B1224] border-slate-800' : 'bg-[#0B1326] border-[#1A294B] text-white shadow-xl'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Your 4 Registered Subjects
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official JAMB Combination · Click any subject to inspect full mastery rates
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowFullSubjectRates(true)}
              className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
            >
              <span>View All 4 Subjects</span>
              <ChevronRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjectCards.map(sub => (
              <div
                key={sub.name}
                onClick={() => setShowFullSubjectRates(true)}
                className="p-4 sm:p-5 rounded-2xl bg-[#111C35] hover:bg-[#162342] border border-slate-800 hover:border-blue-500/60 transition cursor-pointer space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      sub.isCompulsory
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-400/40'
                    }`}
                  >
                    {sub.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {sub.solvedCount} Solved
                  </span>
                </div>

                <h3 className="text-lg font-black text-white">{sub.name}</h3>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    MASTERY RATE
                  </span>
                  <span className="text-base font-black text-amber-400">{sub.rateNum}%</span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-amber-400 transition-all duration-500"
                    style={{ width: `${Math.max(sub.rateNum, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Daily UTME Missions */}
        <div
          className={`rounded-3xl border-2 p-5 sm:p-7 space-y-5 ${
            isDark ? 'bg-[#0B1224] border-slate-800' : 'bg-[#0B1326] border-[#1A294B] text-white shadow-xl'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-black text-white">Daily UTME Missions</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Complete quests to earn Streak Bonus Diamonds
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase tracking-wider">
              +100 GEMS TODAY
            </span>
          </div>

          <div className="space-y-4">
            {dailyMissions.map(mission => {
              const isDone = mission.current >= mission.target;
              const isClaimed = Boolean(claimedMissions[mission.id]);
              const pct = Math.min(100, Math.round((mission.current / mission.target) * 100));

              return (
                <div
                  key={mission.id}
                  className="p-4 rounded-2xl bg-[#111C35] border border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-black text-white leading-snug">
                      {mission.title}
                    </h3>
                    <button
                      type="button"
                      disabled={!isDone || isClaimed}
                      onClick={() => handleClaimMission(mission.id, mission.reward)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-black shrink-0 transition ${
                        isClaimed
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isDone
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer shadow-sm'
                          : 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isClaimed ? 'Claimed ✓' : `Claim ${mission.reward} 💎`}
                    </button>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-amber-400 transition-all"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-slate-400">
                      {mission.current} / {mission.target}
                    </span>
                    <Link
                      to={mission.linkTo}
                      className="font-black text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <span>{mission.linkLabel}</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 text-xs">
            <Link to="/cbt" className="font-black text-blue-400 hover:text-blue-300">
              Open 180Q CBT Mock →
            </Link>
            <Link to="/menu/resources" className="font-black text-amber-400 hover:text-amber-300">
              Formula & Syllabus Vault →
            </Link>
          </div>
        </div>
      </section>

      {showFullSubjectRates && (
        <SubjectRatesFullScreenView onClose={() => setShowFullSubjectRates(false)} />
      )}
    </div>
  );
}

// ==========================================
// DAILY MISSIONS PAGE (/missions)
// ==========================================
export function DailyMissionsPage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();

  const missions = [
    {
      id: 'blitz_15',
      title: 'Solve 15 Blitz Speed Questions',
      description: 'Complete 15 timed questions on the Anime Duolingo Z-Trail.',
      current: Math.min(15, progress.dailyBlitzSolved || 0),
      target: 15,
      reward: 50,
      to: '/blitz',
      actionLabel: 'Open Blitz Z-Trail',
    },
    {
      id: 'smart_1',
      title: 'Clear 1 Campus Station in Smart Practice',
      description: 'Finish any Campus Roadway station with step-by-step worked solutions.',
      current: Math.min(1, progress.dailySmartLevelsCleared || 0),
      target: 1,
      reward: 50,
      to: '/smart',
      actionLabel: 'Open Campus Road',
    },
    {
      id: 'flawless_100',
      title: 'Achieve 100% Flawless on Any Level',
      description: 'Score 100% without missing a single question to boost Subject Rating by +10%.',
      current: Object.values(progress.subjectStats || {}).reduce(
        (acc, s) => acc + (s.flawlessLevels || 0),
        0
      )
        ? 1
        : 0,
      target: 1,
      reward: 25,
      to: '/blitz',
      actionLabel: 'Go for 100% Flawless',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20 lg:pb-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">
            DAILY UTME QUESTS & STREAK VAULT
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
            Daily UTME Missions
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Maintain your daily streak and earn free Streak Bonus Diamonds that are always spent first before your main 5,000 💎 vault.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 rounded-2xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-700/40 text-amber-800 dark:text-yellow-300 text-xs font-black flex items-center gap-1.5">
            <Flame size={16} className="text-amber-500" />
            <span>{progress.streakDays} Day Streak</span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center gap-1.5">
            <Coins size={16} />
            <span>{progress.streakBonusDiamonds} Bonus 💎</span>
          </div>
        </div>
      </header>

      <section className="grid gap-4">
        {missions.map(m => {
          const pct = Math.min(100, Math.round((m.current / m.target) * 100));
          return (
            <div
              key={m.id}
              className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
              }`}
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-amber-900 text-[10px] font-black uppercase">
                    +{m.reward} 💎 BONUS
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {m.current} / {m.target} Completed
                  </span>
                </div>
                <h2 className="text-lg font-black">{m.title}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{m.description}</p>
                <div className="w-full max-w-md h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-400"
                    style={{ width: `${Math.max(pct, 5)}%` }}
                  />
                </div>
              </div>
              <Link
                to={m.to}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 text-center"
              >
                {m.actionLabel} →
              </Link>
            </div>
          );
        })}
      </section>
    </div>
  );
}

// ==========================================
// PRACTICE HUB PAGE (/practice)
// ==========================================
export function PracticePage() {
  const experiences = [
    {
      title: 'Blitz Speed Z-Trail',
      description:
        '22 Anime Duolingo-style Z-Trail levels with Sabi Eagle companions, 45s/Q & 60s/Q timer controls, and Boss Archways.',
      detail: 'High-Speed Timed Mastery',
      href: '/blitz',
      action: 'Open Blitz Z-Trail ⚡',
    },
    {
      title: 'Smart Campus Roadway',
      description:
        '22 Winding Campus Road stations with the Interactive Student Study Desk, pop-out JAMB Calculator, Library & Science Lab.',
      detail: 'Untimed Conceptual Mastery',
      href: '/smart',
      action: 'Open Smart Campus Road 🎓',
    },
    {
      title: 'Custom JAMB Simulator',
      description:
        'Choose your own subject, topic, Original vs Twin difficulty mode, question count, and timer pacing on demand.',
      detail: 'Personalized Topic Drill',
      href: '/practice/custom',
      action: 'Open Custom Simulator 🛠️',
    },
    {
      title: 'Full 180Q CBT Mock Exam',
      description:
        'Simulate the official 4-subject, 120-minute JAMB UTME examination with keyboard shortcuts (A/B/C/D) and instant result slip.',
      detail: 'Official UTME Simulation',
      href: '/cbt',
      action: 'Open CBT Simulator 🖥️',
    },
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 lg:pb-6">
      <header className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">
          SABI PRACTICE ENGINE
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Choose Your UTME Practice Arena
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Every practice mode uses the ordered Original + Twin (Simple, Medium, Hard) JAMB question bank and updates your live Subject Mastery Rates.
        </p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        {experiences.map(item => (
          <article
            key={item.title}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col p-6 shadow-xs"
          >
            <p className="text-xs font-black uppercase tracking-wider text-blue-600">
              {item.detail}
            </p>
            <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white">
              {item.title}
            </h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {item.description}
            </p>
            <Link
              to={item.href}
              className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider w-fit"
            >
              <span>{item.action}</span>
              <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}

// ==========================================
// CBT SIMULATOR PAGE (/cbt)
// ==========================================
export function CbtPage() {
  const [isMockModalOpen, setIsMockModalOpen] = useState(false);
  const [lastResult, setLastResult] = useState<{
    totalScore: number;
    subjects: { name: string; score: number; maxScore: number }[];
  } | null>(null);

  return (
    <div className="space-y-7 pb-20 lg:pb-6">
      <header className="max-w-3xl">
        <span className="text-xs font-black uppercase tracking-[.18em] text-blue-600">
          OFFICIAL JAMB CBT SIMULATION
        </span>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white sm:text-4xl">
          Prepare Under Real UTME Exam Conditions
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
          Practise time management, 4-subject tab switching, keyboard navigation (A, B, C, D & Enter), and the moveable scientific calculator.
        </p>
      </header>

      {lastResult && (
        <section className="rounded-3xl border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                OFFICIAL SABI CBT RESULT SLIP
              </span>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                Aggregate Score: {lastResult.totalScore} / 400
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsMockModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase cursor-pointer"
            >
              Retake Full Mock →
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {lastResult.subjects.map(s => (
              <div
                key={s.name}
                className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800"
              >
                <span className="text-xs font-bold text-slate-500 block">{s.name}</span>
                <span className="text-xl font-black text-blue-600">
                  {s.score} / {s.maxScore}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl bg-gradient-to-r from-[#0A1F66] via-[#0052CC] to-[#0066FF] p-6 text-white sm:p-9 shadow-xl">
        <span className="px-3 py-1 rounded-full bg-yellow-300 text-blue-950 text-[10px] font-black uppercase tracking-widest">
          FULL 4-SUBJECT UTME SIMULATION
        </span>
        <h2 className="mt-4 max-w-xl text-2xl sm:text-4xl font-black leading-tight">
          180 Questions · 120 Minutes · Instant Aggregate Result Slip
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100">
          Includes Use of English plus your three registered subjects, flagged question palette, and step-by-step post-exam review.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsMockModalOpen(true)}
            className="px-6 py-4 rounded-2xl bg-yellow-300 hover:bg-yellow-200 text-blue-950 font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Play size={16} className="fill-current" />
            <span>Launch Full CBT Mock Exam</span>
          </button>
          <Link
            to="/practice/custom"
            className="px-5 py-4 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2"
          >
            <span>Configure Custom Timed Drill</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <FullMockExamModal
        isOpen={isMockModalOpen}
        onClose={() => setIsMockModalOpen(false)}
        onAddXP={() => {}}
        onOpenResultSlip={res => {
          setLastResult(res);
          setIsMockModalOpen(false);
        }}
      />
    </div>
  );
}

// ==========================================
// PROGRESS PAGE (/progress) — ZERO ERROR BANNERS
// ==========================================
export function ProgressPage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();
  const meta = getCandidateOnboardingMeta();

  const subjectRows = useMemo(() => {
    return meta.chosenSubjects.map((subj: string) => {
      const st = progress.subjectStats[subj] || {
        solved: 0,
        correct: 0,
        levelsAttempted: 0,
        flawlessLevels: 0,
        rating: 0,
      };
      const accuracy = st.solved > 0 ? Math.round((st.correct / st.solved) * 100) : 0;
      return {
        subject: subj,
        solved: st.solved,
        correct: st.correct,
        accuracy,
        flawlessLevels: st.flawlessLevels || 0,
        rating: st.rating || 0,
      };
    });
  }, [meta.chosenSubjects, progress.subjectStats]);

  const totalSolved = subjectRows.reduce((acc, r) => acc + r.solved, 0);
  const totalCorrect = subjectRows.reduce((acc, r) => acc + r.correct, 0);
  const overallAccuracy = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;
  const totalFlawless = subjectRows.reduce((acc, r) => acc + r.flawlessLevels, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 lg:pb-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-600">
            LIVE PERFORMANCE ANALYTICS
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Your UTME Progress & Mastery Evidence
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time statistics across Blitz Speed Z-Trail, Smart Campus Roadway, and CBT Mock sessions.
          </p>
        </div>
        <Link
          to="/subject-rates"
          className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider"
        >
          Full-Screen Subject Rates →
        </Link>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <p className="text-xs font-bold text-slate-500">Questions Answered</p>
          <p className="mt-2 text-3xl font-black text-blue-600">{totalSolved}</p>
        </div>
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <p className="text-xs font-bold text-slate-500">Correct Answers</p>
          <p className="mt-2 text-3xl font-black text-emerald-600">{totalCorrect}</p>
        </div>
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <p className="text-xs font-bold text-slate-500">Observed Accuracy</p>
          <p className="mt-2 text-3xl font-black text-amber-500">{overallAccuracy}%</p>
        </div>
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <p className="text-xs font-bold text-slate-500">100% Flawless Levels</p>
          <p className="mt-2 text-3xl font-black text-blue-600">{totalFlawless}</p>
        </div>
      </section>

      <section
        className={`p-6 rounded-3xl border space-y-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h2 className="text-lg font-black">4 Registered UTME Subjects Breakdown</h2>
        <div className="space-y-4">
          {subjectRows.map(row => (
            <div key={row.subject} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-black">{row.subject}</span>
                <span className="text-xs font-bold text-slate-500">
                  {row.solved} Solved · Raw Accuracy {row.accuracy}% · Official Mastery Rating{' '}
                  <strong className="text-blue-600">{row.rating}%</strong>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 to-amber-400"
                  style={{ width: `${Math.max(row.rating || row.accuracy, 3)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ==========================================
// SUBSCRIPTION PAGE (/subscription)
// ==========================================
export function SubscriptionPage() {
  const { isDark } = useTheme();
  const progress = useLiveUserProgress();
  const [notice, setNotice] = useState('');

  return (
    <div className="mx-auto max-w-5xl space-y-7 pb-20 lg:pb-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">
            SABI DIAMOND VAULT & PASS
          </p>
          <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">
            Subscription & 5,000 💎 Vault
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Your Streak Bonus Diamonds ({progress.streakBonusDiamonds} 💎) are always consumed first before your Main 5,000 💎 Subscription Vault ({progress.mainDiamonds} 💎).
          </p>
        </div>
      </header>

      {/* Hero Banner with Subscription SVG */}
      <section className="rounded-3xl bg-gradient-to-r from-[#0A1F66] via-[#0052CC] to-[#0066FF] text-white p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 max-w-xl">
          <span className="px-3 py-1 rounded-full bg-yellow-300 text-blue-950 text-[10px] font-black uppercase tracking-widest">
            ₦10,000 ONE-TIME SCHOLAR PASS
          </span>
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            Unlock All 22 Blitz & Smart Campus Levels + 5,000 💎 Diamonds
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed">
            Includes 1,500 💎 for Blitz Level Unlocks, 1,500 💎 for Smart Campus Roadway, 1,000 💎 for Full 180Q CBT Mocks, and 1,000 💎 for AI Step-by-Step Tutor Verifications.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                setNotice(
                  'Paystack / Flutterwave live checkout is ready to be linked in your Vercel payment environment variables.'
                )
              }
              className="px-6 py-3.5 rounded-2xl bg-yellow-300 hover:bg-yellow-200 text-blue-950 font-black text-xs uppercase tracking-wider cursor-pointer shadow-lg"
            >
              Activate ₦10,000 Scholar Pass (5,000 💎) →
            </button>
          </div>
        </div>
        <img
          src="/assets/banners/subscription_banner.svg"
          alt="5,000 Diamonds Subscription Vault"
          className="w-full max-w-[260px] rounded-2xl shadow-lg object-contain"
        />
      </section>

      {notice && (
        <div className="p-4 rounded-2xl border border-blue-200 bg-blue-50 text-blue-900 text-xs sm:text-sm font-bold">
          {notice}
        </div>
      )}

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-500">Total Active Diamonds</span>
          <p className="mt-2 text-3xl font-black text-blue-600">{progress.diamonds} 💎</p>
          <p className="mt-1 text-xs text-slate-400">Combined Streak Bonus + Main Vault</p>
        </div>
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-amber-600">Streak Bonus Vault (Used First)</span>
          <p className="mt-2 text-3xl font-black text-amber-500">
            {progress.streakBonusDiamonds} 💎
          </p>
          <p className="mt-1 text-xs text-slate-400">Earned from daily streaks & missions</p>
        </div>
        <div
          className={`p-5 rounded-3xl border ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-xs font-bold text-slate-500">Main 5,000 💎 Pass Vault</span>
          <p className="mt-2 text-3xl font-black text-slate-900 dark:text-white">
            {progress.mainDiamonds} 💎
          </p>
          <p className="mt-1 text-xs text-slate-400">From ₦10,000 One-Time Scholar Pass</p>
        </div>
      </section>
    </div>
  );
}

// ==========================================
// PROFILE PAGE (/profile)
// ==========================================
export function ProfilePage() {
  const { isDark, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .maybeSingle();
        if (active) {
          setAuthUser(userData.user);
          setProfile(profileData);
        }
      } catch {
        // fallback to localStorage metadata
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const meta = getCandidateOnboardingMeta();
  const metadata = authUser?.user_metadata || {};
  const name =
    profile?.full_name ||
    profile?.name ||
    metadata.full_name ||
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) ||
    'SABI Scholar';
  const email =
    authUser?.email ||
    profile?.email ||
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_email')) ||
    'candidate@sabi.edu.ng';
  const uniqueId =
    profile?.sabi_unique_id ||
    (typeof window !== 'undefined' && localStorage.getItem('sabi_unique_id')) ||
    '4829K';
  const subjects =
    Array.isArray(profile?.registered_subjects) && profile.registered_subjects.length === 4
      ? profile.registered_subjects
      : meta.chosenSubjects;

  const handleCopyId = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(uniqueId).catch(() => {});
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-6">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600">
          CANDIDATE IDENTITY & SETTINGS
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Your Profile</h1>
      </header>

      <section
        className={`rounded-3xl border p-6 sm:p-8 space-y-6 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
              {String(name).charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-black">{name}</h2>
              <p className="text-sm text-slate-500">{email}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
                UNIQUE SABI ID
              </span>
              <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                {uniqueId}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyId}
              className="p-2 rounded-xl bg-blue-600 text-white text-xs font-black cursor-pointer"
              title="Copy Unique SABI ID"
            >
              {copiedId ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
            <p className="text-xs text-slate-500">Target Course & Institution</p>
            <p className="mt-1 font-black">
              {meta.targetCourse} ({meta.targetUniversity})
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-4">
            <p className="text-xs text-slate-500">Target UTME Score</p>
            <p className="mt-1 font-black text-blue-600">{meta.targetScore} / 400</p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
            4 Registered UTME Subjects
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {subjects.map((subject: string) => (
              <span
                key={subject}
                className="rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-800 px-3.5 py-2 text-xs font-black text-blue-800 dark:text-blue-200"
              >
                {subject}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        className={`flex items-center justify-between gap-4 rounded-2xl border p-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <h2 className="font-black">Appearance Mode</h2>
          <p className="text-xs text-slate-500">Toggle between Normal (Light) and Night (Dark) mode.</p>
        </div>
        <button
          onClick={toggleTheme}
          className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-black text-white cursor-pointer"
        >
          {isDark ? 'Night Mode · On' : 'Normal Mode · On'}
        </button>
      </section>
    </div>
  );
}

// ==========================================
// NOTIFICATIONS PAGE (/notifications)
// ==========================================
export function NotificationsPage() {
  const { isDark } = useTheme();
  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-20 lg:pb-6">
      <header>
        <p className="text-xs font-black uppercase tracking-widest text-blue-600">
          ACCOUNT UPDATES
        </p>
        <h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Notifications</h1>
      </header>
      <div className={`rounded-3xl border p-8 text-center space-y-3 ${card}`}>
        <Bell size={32} className="mx-auto text-blue-600" />
        <h2 className="text-lg font-black">All caught up!</h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Your daily streak alerts, level unlocks, and mock exam reports will appear here as you practice.
        </p>
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

  const [localMistakes, setLocalMistakes] = useState(() => getMistakeRecords());
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState<string>('All');

  // Study Resources Modals State
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);

  useEffect(() => {
    if (section === 'mistakes') {
      setLocalMistakes(getMistakeRecords());
    }
  }, [section]);

  // 1. MISTAKE NOTEBOOK (/menu/mistakes)
  if (section === 'mistakes') {
    const filteredMistakes =
      mistakeSubjectFilter === 'All'
        ? localMistakes
        : localMistakes.filter(item => item.question.subject === mistakeSubjectFilter);

    return (
      <div className="space-y-6 pb-20 lg:pb-6 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
              Error Correction Engine
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              Mistake Notebook ({localMistakes.length})
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Missed questions from your Blitz, Smart Campus Road, and CBT Mock sessions with worked explanations.
            </p>
          </div>
          <Link
            to="/blitz"
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 self-start"
          >
            Practise in Blitz →
          </Link>
        </div>

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
          <div
            className={`p-8 rounded-3xl border text-center space-y-3 ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
            <h3 className="text-lg font-black">
              {localMistakes.length === 0
                ? 'No missed answers recorded yet'
                : `No mistakes in ${mistakeSubjectFilter}`}
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              When you miss a question in Blitz, Smart Campus Road, or CBT Simulator, it is saved here automatically for review.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map(item => (
              <article
                key={item.question.id}
                className={`p-6 rounded-3xl border space-y-4 ${
                  isDark
                    ? 'bg-slate-900/90 border-slate-800'
                    : 'bg-white border-slate-200 shadow-xs'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black">
                    {item.question.subject} · {item.question.topic}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      removeMistakeRecord(item.question.id);
                      setLocalMistakes(getMistakeRecords());
                    }}
                    className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                  >
                    Mark Mastered ✓
                  </button>
                </div>
                <div className="text-sm sm:text-base font-bold leading-relaxed">
                  <MathText text={item.question.question} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold">
                    Your Answer: <MathText text={item.selectedAnswer} />
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">
                    Correct Answer: Option {item.question.answer} —{' '}
                    <MathText
                      text={
                        item.question.options?.[item.question.answer] ||
                        item.question.answer
                      }
                    />
                  </div>
                </div>
                <div
                  className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                    isDark
                      ? 'bg-slate-950 border-slate-800 text-slate-300'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <strong className="font-black text-blue-600 dark:text-blue-400 block mb-1">
                    Worked Explanation
                  </strong>
                  <MathText text={item.question.explanation} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 2. REAL STUDY RESOURCES (/menu/resources)
  if (section === 'resources') {
    return (
      <div className="space-y-6 pb-20 lg:pb-6 max-w-4xl">
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
          <div
            className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black uppercase">
                LaTeX Equations
              </span>
              <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">
                Formula Cheat Sheet
              </h3>
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

          <div
            className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[10px] font-black uppercase">
                Subject Combinations
              </span>
              <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">
                JAMB Brochure Checker
              </h3>
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

          <div
            className={`p-6 rounded-3xl border shadow-sm flex flex-col justify-between gap-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div>
              <span className="px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-950/40 text-amber-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-800/50 text-[10px] font-black uppercase">
                Topic Weighting
              </span>
              <h3 className="text-xl font-black mt-3 text-slate-900 dark:text-white">
                Syllabus Frequency Map
              </h3>
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

        <FormulaCheatSheetModal
          isOpen={showFormulaModal}
          onClose={() => setShowFormulaModal(false)}
        />
        <JAMBBrochureCheckerModal
          isOpen={showBrochureModal}
          onClose={() => setShowBrochureModal(false)}
          profile={{
            name:
              (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) ||
              'Candidate',
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
        <SyllabusFrequencyHeatmapModal
          isOpen={showHeatmapModal}
          onClose={() => setShowHeatmapModal(false)}
        />
      </div>
    );
  }

  // 3. HELP & ABOUT PAGES (/menu/help, /menu/about)
  return (
    <div className="space-y-6 pb-20 lg:pb-6 max-w-3xl">
      <div>
        <span className="text-xs font-black uppercase tracking-wider text-amber-500 block mb-1">
          SABI JAMB CBT Platform
        </span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          {section === 'help'
            ? 'Help, Keyboard Shortcuts & Account Recovery'
            : section === 'about'
            ? 'About SABI UTME Engine'
            : page}
        </h1>
      </div>

      <div
        className={`p-6 sm:p-8 rounded-3xl border-2 space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h3 className="text-lg font-black text-amber-500">
          1. Your 5-Character Unique SABI ID (4 Numbers + 1 Letter)
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Every registered candidate is issued a permanent 5-character Unique SABI ID (for example,{' '}
          <code className="font-mono font-bold text-amber-500">4829K</code>). Whether you sign in with Email/Password or Google Auth using the same email address, your account remains unified.
        </p>

        <h3 className="text-lg font-black text-amber-500 pt-2">
          2. CBT Keyboard Shortcuts (Desktop & Laptop)
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
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
