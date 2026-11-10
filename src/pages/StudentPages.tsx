import { useState, useEffect, useMemo } from 'react';
import {
  Activity, ArrowRight, Bell, BookMarked, BookOpen, BookOpenCheck, BrainCircuit,
  CheckCircle, ChevronRight, ClipboardList, Coins, Copy, Check, Download,
  Compass, FileQuestion, Flame, HelpCircle, Home, Info, LogOut,
  Menu, Moon, Settings, ShieldCheck, Sliders, SlidersHorizontal, Sun, Target,
  X, Zap, Award, CheckCircle2
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';
import { supabase } from '../lib/supabase';
import { apiFetch } from '../utils/apiClient';
import { getRealUserProgress, UserRealProgress } from '../utils/userProgressStore';
import MathText from '../components/MathText';
import FullMockExamModal from '../components/mobile/FullMockExamModal';
import FormulaCheatSheetModal from '../components/mobile/FormulaCheatSheetModal';
import JAMBBrochureCheckerModal from '../components/mobile/JAMBBrochureCheckerModal';
import SyllabusFrequencyHeatmapModal from '../components/mobile/SyllabusFrequencyHeatmapModal';

const MAIN_NAV = [
  { to: '/home', label: 'Dashboard', Icon: Home },
  { to: '/learning', label: 'Learning', Icon: BookOpenCheck },
  { to: '/blitz', label: 'Blitz', Icon: Zap },
  { to: '/smart', label: 'Smart Practice', Icon: Compass },
  { to: '/practice/custom', label: 'Custom Practice', Icon: Sliders },
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


function LearningSnapshot() {
  const [data,setData]=useState<any>(null);
  const [recommendations,setRecommendations]=useState<any>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;Promise.all([apiFetch('/api/learning/progress'),apiFetch('/api/learning/recommendations')]).then(async ([p,r])=>{
    if(!p.ok)throw new Error('Learning progress is not available right now.');
    const d=await p.json();const rec=r.ok?await r.json():null;
    if(active){setData(d);setRecommendations(rec);}
  }).catch(e=>{if(active)setError(e.message||'Unable to load learning progress.');});return()=>{active=false;};},[]);
  const sessions=data?.recentSessions||[];
  const mastery=data?.mastery||[];
  const due=recommendations?.reviewPlan||[];
  return <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
    <div className="flex items-center justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Backend synced</span><h2 className="text-lg font-black text-slate-900 dark:text-white">Learning activity</h2></div><Link to="/learning" className="text-xs font-black text-blue-600">Open learning hub →</Link></div>
    {error?<p className="text-xs text-slate-500">{error}</p>:!data?<p className="text-xs text-slate-500">Loading saved learning activity…</p>:<div className="grid sm:grid-cols-3 gap-3">
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950"><b className="text-2xl">{sessions.length}</b><p className="text-xs text-slate-500">Recent sessions</p></div>
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950"><b className="text-2xl">{mastery.length}</b><p className="text-xs text-slate-500">Tracked topics</p></div>
      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950"><b className="text-2xl">{(data.dueReviews||[]).length}</b><p className="text-xs text-slate-500">Reviews due</p></div>
    </div>}
    {due.length>0&&<div className="space-y-2"><p className="text-xs font-black uppercase tracking-wider text-amber-600">Recommended reviews</p>{due.slice(0,4).map((item:any)=><div key={item.subject+'-'+item.topic} className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-3 text-xs"><span className="font-bold">{item.subject} · {item.topic}</span><span className="text-slate-500">{Math.round(item.masteryScore)}% mastery</span></div>)}</div>}
    {sessions.length>0&&<div className="space-y-2">{sessions.slice(0,4).map((item:any)=><div key={item.id} className="flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800 pt-2 text-xs"><span className="font-bold">{item.mode.replace('_',' ')} · {item.answered_count}/{item.total_questions} answered</span><span className="text-slate-500">{item.status}</span></div>)}</div>}
  </section>;
}

function ScorePredictionCard() {
  const [data,setData]=useState<any>(null);
  const [error,setError]=useState('');
  useEffect(()=>{let active=true;apiFetch('/api/learning/score-prediction').then(async r=>{
    const payload=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(payload.error||'Score prediction is unavailable.');
    if(active)setData(payload);
  }).catch(e=>{if(active)setError(e.message||'Unable to calculate score prediction.');});return()=>{active=false;};},[]);
  return <section className="rounded-3xl border border-blue-100 dark:border-blue-900 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Phase 2 · performance model</span><h2 className="text-xl font-black text-slate-900 dark:text-white">UTME score projection</h2><p className="text-xs text-slate-500 mt-1">A rolling estimate from your saved, answered UTME questions.</p></div>
      {data?.predictedScore!==null&&data?.predictedScore!==undefined?<div className="text-right"><b className="text-3xl text-blue-600">{data.predictedScore}<span className="text-sm text-slate-400">/400</span></b><p className="text-[10px] text-slate-500">{data.scoreRange?.lower}–{data.scoreRange?.upper} likely range</p></div>:<span className="text-xs font-black text-amber-600">Building evidence</span>}
    </div>
    {error?<p className="text-xs text-slate-500">{error}</p>:!data?<p className="text-xs text-slate-500">Calculating from your saved performance…</p>:<>
      <div className="grid sm:grid-cols-2 gap-2">{(data.subjects||[]).map((item:any)=><div key={item.subject} className="rounded-xl bg-slate-50 dark:bg-slate-950 p-3"><div className="flex justify-between gap-2 text-xs"><b>{item.subject}</b><span className="text-slate-500">{item.attempted} attempts</span></div><p className="mt-1 text-sm font-black">{item.projectedScore===null?'Not enough data':item.projectedScore+'/100'}</p><div className="h-1.5 mt-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"><div className="h-full bg-blue-600" style={{width:`${item.projectedScore||0}%`}}/></div></div>)}</div>
      <p className="text-xs text-slate-500">{data.message}</p>
      {data.predictedScore!==null&&<p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Confidence: {data.confidence} · {data.totalAttempts} total answers analysed</p>}
    </>}
  </section>;
}
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, setMode, toggleTheme, dimnessLevel, setDimnessLevel } = useTheme();
  const progress = useLiveUserProgress();
  const userName =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'Candidate';

  // Guard: a real Supabase session is required to use the app shell.
  // Phase 0: identity is proven by the session token, not by a localStorage email.
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
  const [analytics, setAnalytics] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setBusy(true); setError('');
    try {
      const [a, p, r] = await Promise.all([
        apiFetch('/api/learning/analytics'),
        apiFetch('/api/learning/progress'),
        apiFetch('/api/learning/recommendations'),
      ]);
      if (!a.ok || !p.ok || !r.ok) throw new Error('Your learning overview is temporarily unavailable. Please try again.');
      const [ad, pd, rd] = await Promise.all([a.json(), p.json(), r.json()]);
      setAnalytics(ad); setProgress(pd); setRecommendations(rd);
    } catch (e: any) { setError(e?.message || 'Could not load your learning overview.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, []);

  const next = recommendations?.nextAction;
  const actionUrl = next?.type === 'diagnostic' ? '/diagnostic'
    : next?.type === 'review' || next?.type === 'practice'
      ? '/learning?mode=smart_practice' : '/smart';
  const actionTitle = next?.type === 'diagnostic' ? 'Establish your baseline'
    : next?.type === 'review' ? 'Review a topic due now'
      : next?.type === 'practice' ? 'Strengthen a priority topic' : 'Continue learning';

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 lg:pb-0">
      <section className="rounded-3xl bg-gradient-to-br from-[#0A1F66] to-[#0066FF] p-6 sm:p-8 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-100">Your learning workspace</p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold">Welcome back to Sabi.</h1>
        <p className="mt-2 max-w-2xl text-sm text-blue-50">A clear view of what you have practised, what needs attention, and the next useful step.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/smart" className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#0A1F66]">Smart Practice <ArrowRight size={16} className="ml-2 inline" /></Link>
          <Link to="/blitz" className="rounded-xl border border-white/50 px-5 py-3 text-sm font-semibold text-white">Blitz</Link>
        </div>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => void refresh()} className="ml-3 font-semibold underline">Retry</button></div>}
      {busy && <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading your learning evidence…</div>}
      {!busy && !error && <>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sabi-card p-5"><p className="text-xs text-slate-500">Answered questions</p><p className="mt-2 text-3xl font-bold text-[#0A1F66]">{analytics?.total_attempts ?? 0}</p><p className="mt-1 text-xs text-slate-500">Server-recorded attempts</p></div>
          <div className="sabi-card p-5"><p className="text-xs text-slate-500">Accuracy</p><p className="mt-2 text-3xl font-bold text-[#0A1F66]">{analytics?.accuracy == null ? '—' : analytics.accuracy + '%'}</p><p className="mt-1 text-xs text-slate-500">Based on answered attempts</p></div>
          <div className="sabi-card p-5"><p className="text-xs text-slate-500">Topics with mastery evidence</p><p className="mt-2 text-3xl font-bold text-[#0A1F66]">{progress?.mastery?.length ?? 0}</p><p className="mt-1 text-xs text-slate-500">Backend mastery records</p></div>
        </section>

        <section className="sabi-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-wider text-[#0066FF]">Recommended next action</p><h2 className="mt-2 text-xl font-bold text-slate-900">{actionTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">{next?.topic ? next.subject + ' · ' + next.topic : next?.message || 'Your next step will update as you build learning evidence.'}</p></div>
            <Link to={actionUrl} className="rounded-xl bg-[#0066FF] px-4 py-3 text-sm font-semibold text-white">Start now <ArrowRight size={15} className="ml-1 inline" /></Link>
          </div>
          {recommendations?.dueReviewCount > 0 && <p className="mt-4 rounded-xl bg-blue-50 p-3 text-sm text-[#0A1F66]">{recommendations.dueReviewCount} topic reviews are due.</p>}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="sabi-card p-5"><h2 className="font-bold text-slate-900">Priority topics</h2>
            {recommendations?.focusTopics?.length ? <ul className="mt-3 space-y-3">{recommendations.focusTopics.slice(0,4).map((item:any)=><li key={item.subject+'-'+item.topic} className="flex justify-between gap-3 border-b border-slate-100 pb-2 text-sm"><span><strong>{item.topic}</strong><span className="block text-xs text-slate-500">{item.subject}</span></span><span className="font-semibold text-[#0066FF]">{Number(item.mastery_score)} mastery</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No priority topics are available yet. Complete practice to build evidence.</p>}
          </div>
          <div className="sabi-card p-5"><h2 className="font-bold text-slate-900">Recent sessions</h2>
            {progress?.recentSessions?.length ? <ul className="mt-3 space-y-3">{progress.recentSessions.slice(0,5).map((s:any)=><li key={s.id} className="flex justify-between gap-3 border-b border-slate-100 pb-2 text-sm"><span className="font-medium capitalize">{String(s.mode).replace('_',' ')}</span><span className="text-slate-500">{s.answered_count}/{s.total_questions} answered</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Your completed learning sessions will appear here.</p>}
          </div>
        </section>
        <div className="flex flex-wrap gap-3"><Link to="/progress" className="text-sm font-semibold text-[#0066FF]">View detailed progress →</Link><Link to="/cbt" className="text-sm font-semibold text-[#0066FF]">Open CBT Simulator →</Link></div>
      </>}
    </div>
  );
}

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
  const modes = [
    { title: 'Smart Practice', tag: 'Adaptive guidance', description: 'Let Sabi choose useful practice based on your learning evidence. Recommendations refresh as you answer.', href: '/smart', icon: BrainCircuit, tone: 'blue', action: 'Start Smart Practice' },
    { title: 'Blitz', tag: 'Focused reinforcement', description: 'Strengthen what you know with one question at a time, immediate feedback and no speed pressure.', href: '/blitz', icon: Zap, tone: 'yellow', action: 'Start Blitz' },
    { title: 'Custom Practice', tag: 'Your choices', description: 'Choose the subjects and topics you want to work on when you have a specific goal in mind.', href: '/practice/custom', icon: SlidersHorizontal, tone: 'slate', action: 'Build a practice set' },
    { title: 'CBT Simulator', tag: 'Exam conditions', description: 'Practise in a structured JAMB-style mock with a server-controlled timer and exam review flow.', href: '/learning?mode=cbt', icon: FileQuestion, tone: 'navy', action: 'Enter CBT Simulator' },
  ];
  return (
    <div className="space-y-7 pb-16 lg:pb-0">
      <header className="max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-[.18em] text-[var(--sabi-blue)]">Your learning space</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--sabi-navy)] sm:text-4xl">Choose how you want to learn.</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--sabi-muted)] sm:text-base">Every mode has a different purpose. Pick the one that matches what you need right now.</p>
      </header>
      <section className="grid gap-4 sm:grid-cols-2">
        {modes.map(({title,tag,description,href,icon:Icon,tone,action}) => (
          <article key={title} className="sabi-card flex min-h-[250px] flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone==='yellow'?'bg-yellow-50 text-amber-600':tone==='navy'?'bg-indigo-50 text-indigo-800':tone==='slate'?'bg-slate-100 text-slate-700':'bg-blue-50 text-blue-700'}`}><Icon size={23}/></span>
              <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{tag}</span>
            </div>
            <h2 className="mt-5 text-xl font-bold text-[var(--sabi-ink)]">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-[var(--sabi-muted)]">{description}</p>
            <Link to={href} className="sabi-primary-button sabi-focus mt-5 w-full">{action}<ArrowRight size={17}/></Link>
          </article>
        ))}
      </section>
      <p className="text-xs leading-5 text-[var(--sabi-muted)]">Your learning history and authoritative results are saved through Sabi’s learning service. Availability may depend on your account and current content access.</p>
    </div>
  );
}

export function CbtPage() {
  return (
    <div className="space-y-7 pb-16 lg:pb-0">
      <header className="max-w-3xl">
        <span className="text-xs font-bold uppercase tracking-[.18em] text-[var(--sabi-blue)]">JAMB examination practice</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--sabi-navy)] sm:text-4xl">Prepare under exam conditions.</h1>
        <p className="mt-3 text-sm leading-7 text-[var(--sabi-muted)] sm:text-base">Use a structured mock to practise time management, question navigation and exam discipline. Your session is managed by the Sabi learning service.</p>
      </header>
      <section className="rounded-[2rem] bg-[var(--sabi-navy)] p-6 text-white sm:p-9">
        <span className="text-xs font-bold uppercase tracking-[.18em] text-blue-200">Full UTME simulation</span>
        <h2 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-4xl">180 questions. 120 minutes. One focused attempt.</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-blue-100">English Language plus your three registered subjects. The exam timer and answer submission are controlled by the server. Explanations are held until the exam is over.</p>
        <Link to="/learning?mode=cbt" className="sabi-primary-button sabi-focus mt-7 !border-yellow-400 !bg-yellow-400 !text-[var(--sabi-navy)] hover:!bg-yellow-300">Configure CBT session <ArrowRight size={18}/></Link>
      </section>
      <div className="grid gap-4 sm:grid-cols-2">
        <article className="sabi-card p-5 sm:p-6"><h3 className="font-bold text-[var(--sabi-ink)]">Quick Mock</h3><p className="mt-2 text-sm leading-6 text-[var(--sabi-muted)]">40 questions in 30 minutes for a shorter exam-style practice session.</p><Link to="/learning?mode=cbt&configuration=quick-mock" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--sabi-blue)]">Start Quick Mock <ArrowRight size={16}/></Link></article>
        <article className="sabi-card p-5 sm:p-6"><h3 className="font-bold text-[var(--sabi-ink)]">Full Mock</h3><p className="mt-2 text-sm leading-6 text-[var(--sabi-muted)]">The complete 180-question, 120-minute examination simulation.</p><Link to="/learning?mode=cbt&configuration=full-mock" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[var(--sabi-blue)]">Start Full Mock <ArrowRight size={16}/></Link></article>
      </div>
    </div>
  );
}

export function ProgressPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [coverage, setCoverage] = useState<any>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setBusy(true); setError('');
    try {
      const [a,p,r,c] = await Promise.all([
        apiFetch('/api/learning/analytics'), apiFetch('/api/learning/progress'),
        apiFetch('/api/learning/recommendations'), apiFetch('/api/learning/coverage'),
      ]);
      if (!a.ok || !p.ok || !r.ok) throw new Error('Progress information is temporarily unavailable.');
      const [ad,pd,rd] = await Promise.all([a.json(),p.json(),r.json()]);
      setAnalytics(ad); setProgress(pd); setRecommendations(rd);
      setCoverage(c.ok ? await c.json() : null);
    } catch (e:any) { setError(e?.message || 'Could not load progress.'); }
    finally { setBusy(false); }
  };
  useEffect(() => { void refresh(); }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 lg:pb-0">
      <header><p className="text-xs font-semibold uppercase tracking-wider text-[#0066FF]">Learning evidence</p><h1 className="mt-1 text-2xl sm:text-3xl font-bold text-slate-900">Your progress</h1><p className="mt-2 text-sm text-slate-600">Progress is shown from recorded answers and backend mastery data. Self-reported confidence is not a mastery score.</p></header>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}<button onClick={() => void refresh()} className="ml-3 font-semibold underline">Retry</button></div>}
      {busy && <div className="sabi-card p-6 text-sm text-slate-500">Loading your progress…</div>}
      {!busy && !error && <>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sabi-card p-5"><p className="text-xs text-slate-500">Answered attempts</p><p className="mt-2 text-3xl font-bold text-[#0A1F66]">{analytics?.total_attempts ?? 0}</p></div>
          <div className="sabi-card p-5"><p className="text-xs text-slate-500">Correct attempts</p><p className="mt-2 text-3xl font-bold text-[#0A1F66]">{analytics?.correct_attempts ?? 0}</p></div>
          <div className="sabi-card p-5"><p className="text-xs text-slate-500">Observed accuracy</p><p className="mt-2 text-3xl font-bold text-[#0A1F66]">{analytics?.accuracy == null ? '—' : analytics.accuracy + '%'}</p></div>
        </section>

        <section className="sabi-card p-5 sm:p-6"><h2 className="font-bold text-slate-900">Subject performance</h2>
          {analytics?.subjects?.length ? <div className="mt-4 space-y-4">{analytics.subjects.map((s:any)=><div key={s.subject}><div className="flex justify-between gap-3 text-sm"><strong>{s.subject}</strong><span className="text-slate-600">{s.accuracy}% · {s.attempted} attempts</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#0066FF]" style={{width:s.accuracy+'%'}} /></div></div>)}</div> : <p className="mt-3 text-sm text-slate-500">No answered attempts yet. Your subject performance will appear after practice.</p>}
        </section>

        <section className="sabi-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-slate-900">Topic mastery</h2><span className="text-xs text-slate-500">Backend mastery records</span></div>
          {progress?.mastery?.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2 pr-3">Subject</th><th className="py-2 pr-3">Topic</th><th className="py-2 pr-3">Mastery</th><th className="py-2 pr-3">Attempts</th><th className="py-2">Next review</th></tr></thead><tbody>{progress.mastery.map((m:any)=><tr key={m.subject+'-'+m.topic} className="border-b border-slate-100"><td className="py-3 pr-3">{m.subject}</td><td className="py-3 pr-3">{m.topic}</td><td className="py-3 pr-3 font-semibold">{m.mastery_score}</td><td className="py-3 pr-3">{m.attempted_count}</td><td className="py-3">{m.next_review_at ? new Date(m.next_review_at).toLocaleDateString() : 'Not scheduled'}</td></tr>)}</tbody></table></div> : <p className="mt-3 text-sm text-slate-500">Mastery evidence will appear as you answer mapped practice questions.</p>}
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="sabi-card p-5"><h2 className="font-bold text-slate-900">Topics to strengthen</h2>{analytics?.weakest_topics?.length ? <ul className="mt-3 space-y-2">{analytics.weakest_topics.slice(0,6).map((t:any)=><li key={t.subject+'-'+t.topic} className="flex justify-between gap-3 text-sm"><span>{t.topic}<span className="block text-xs text-slate-500">{t.subject}</span></span><strong>{t.accuracy}%</strong></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">Not enough answered topic data yet.</p>}</div>
          <div className="sabi-card p-5"><h2 className="font-bold text-slate-900">Reviews due</h2>{recommendations?.dueReviewCount ? <ul className="mt-3 space-y-2">{recommendations.reviewPlan.slice(0,6).map((t:any,i:number)=><li key={t.subject+'-'+t.topic+i} className="text-sm"><strong>{t.topic}</strong><span className="block text-xs text-slate-500">{t.subject} · {t.reason}</span></li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No due reviews are currently reported.</p>}</div>
        </section>

        <section className="sabi-card p-5 sm:p-6"><h2 className="font-bold text-slate-900">Verified syllabus coverage</h2>{coverage?.status === 'ready' ? <><p className="mt-2 text-2xl font-bold text-[#0A1F66]">{coverage.coverage_percent}%</p><p className="text-xs text-slate-500">{coverage.covered_objectives} of {coverage.total_objectives} verified objectives covered</p><div className="mt-4 space-y-3">{coverage.subjects?.map((s:any)=><div key={s.subject}><div className="flex justify-between text-sm"><span>{s.subject}</span><span>{s.coverage_percent}%</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-[#0066FF]" style={{width:s.coverage_percent+'%'}} /></div></div>)}</div></> : <p className="mt-2 text-sm text-slate-500">Verified syllabus coverage is not available yet. Sabi will show it when the syllabus objectives and answered questions are mapped.</p>}</section>
        <p className="text-xs text-slate-500">Analytics are based on server-recorded answered attempts (up to the API's 5,000-attempt reporting cap). They are not a guaranteed JAMB score prediction.</p>
      </>}
    </div>
  );
}

export function SubscriptionPage() {
  const { isDark } = useTheme();
  const [plans,setPlans]=useState<any[]>([]);
  const [account,setAccount]=useState<any>(null);
  const [transactions,setTransactions]=useState<any[]>([]);
  const [readiness,setReadiness]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [busyPlan,setBusyPlan]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const refresh=async()=>{
    setLoading(true);setError('');
    try{
      const [p,m,t,r]=await Promise.all([
        apiFetch('/api/billing/plans'),apiFetch('/api/billing/me'),
        apiFetch('/api/billing/transactions?limit=10'),apiFetch('/api/billing/readiness'),
      ]);
      const bodies=await Promise.all([p,m,t,r].map(x=>x.json().catch(()=>({}))));
      if(!p.ok||!m.ok||!t.ok||!r.ok)throw new Error(bodies.find((x,i)=>![p,m,t,r][i].ok)?.error||'Billing information could not be loaded.');
      setPlans(bodies[0].plans||[]);setAccount(bodies[1]);setTransactions(bodies[2].transactions||[]);setReadiness(bodies[3]);
    }catch(e){setError(e instanceof Error?e.message:'Billing information is temporarily unavailable.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void refresh();},[]);

  const checkout=async(planKey:string)=>{
    setBusyPlan(planKey);setError('');setNotice('');
    try{
      const idempotencyKey=typeof crypto!=='undefined'&&'randomUUID'in crypto?crypto.randomUUID():`sabi-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response=await apiFetch('/api/billing/checkout',{method:'POST',body:JSON.stringify({planKey,idempotencyKey})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Checkout could not be started.');
      if(body.checkoutUrl){window.location.assign(body.checkoutUrl);return;}
      setNotice(body.reference?`Payment reference created: ${body.reference}`:'Checkout request accepted. Check your payment history for the latest status.');
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Checkout is temporarily unavailable.');}
    finally{setBusyPlan('');}
  };
  const money=(amount:number,currency='NGN')=>new Intl.NumberFormat('en-NG',{style:'currency',currency,maximumFractionDigits:2}).format(amount);
  const card=isDark?'bg-slate-900 border-slate-800':'bg-white border-slate-200';

  return <div className="mx-auto max-w-5xl space-y-7 pb-16 lg:pb-0">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">Account billing</p><h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Plans & subscription</h1><p className="mt-2 max-w-2xl text-sm text-slate-500">Plans, active access, AI credits and payment history shown from your SABI billing account. No assumed balance or invented benefits.</p></div><button onClick={()=>void refresh()} disabled={loading} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700">{loading?'Refreshing…':'Refresh billing'}</button></header>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{notice}</div>}
    {loading&&!account?<div className={`rounded-2xl border p-6 ${card}`}>Loading your billing account…</div>:<>
      <section className={`rounded-2xl border p-5 sm:p-6 ${card}`}>
        <h2 className="font-black text-slate-900 dark:text-white">Your current access</h2>
        <p className="mt-1 text-xs text-slate-500">AI credits and entitlements returned by the billing service.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-blue-50 p-4 dark:bg-blue-950/40"><p className="text-xs text-blue-700 dark:text-blue-300">Available AI credits</p><p className="mt-1 text-2xl font-black text-blue-950 dark:text-white">{account?.aiCredits??'—'}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">Active / pending subscriptions</p><p className="mt-1 text-2xl font-black">{account?.subscriptions?.length??0}</p></div>
          <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">Payment provider</p><p className="mt-1 text-sm font-black">{readiness?.configured?readiness.provider||'Configured':'Not configured'}</p><p className="mt-1 text-xs text-slate-500">{readiness?.checkoutConfigured?'Checkout available':'Checkout unavailable'}</p></div>
        </div>
        <div className="mt-5 space-y-2">{account?.subscriptions?.length?account.subscriptions.map((sub:any)=><div key={sub.id} className="flex flex-wrap justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><div><b>{sub.subscription_plans?.display_name||sub.subscription_plans?.plan_key||'Subscription'}</b><p className="text-xs text-slate-500">{sub.subscription_plans?.billing_interval||'Billing period'} · {sub.status}</p></div><span className="text-xs text-slate-500">{sub.current_period_end?`Until ${new Date(sub.current_period_end).toLocaleDateString()}`:'No period end supplied'}</span></div>):<p className="text-sm text-slate-500">No active, pending or past-due subscription was returned for this account.</p>}</div>
        <div className="mt-4 flex flex-wrap gap-2">{(account?.entitlements||[]).map((item:any)=><span key={item.key} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{item.key}</span>)}</div>
      </section>
      <section className="space-y-4"><div><h2 className="text-xl font-black text-slate-900 dark:text-white">Available plans</h2><p className="text-sm text-slate-500">Prices and features come directly from the active plan catalogue.</p></div>
        {plans.length? <div className="grid gap-4 md:grid-cols-2">{plans.map((plan:any)=><article key={plan.plan_key} className={`flex flex-col rounded-2xl border p-5 ${card}`}><div className="flex-1"><h3 className="text-lg font-black">{plan.display_name}</h3><p className="mt-2 text-2xl font-black text-blue-700 dark:text-blue-300">{money(Number(plan.price_amount),plan.currency||'NGN')}</p><p className="mt-1 text-xs text-slate-500">{String(plan.billing_interval||'').replace('_',' ')}</p>{plan.description&&<p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>}<div className="mt-4 space-y-2 text-xs text-slate-500">{Object.entries(plan.features||{}).filter(([,v])=>v!==false&&v!==null).map(([key,value])=><p key={key}>• {key.replace(/[_-]/g,' ')}: {typeof value==='object'?JSON.stringify(value):String(value)}</p>)}</div></div><button onClick={()=>void checkout(plan.plan_key)} disabled={Boolean(busyPlan)||!readiness?.checkoutConfigured} className="mt-5 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{busyPlan===plan.plan_key?'Preparing secure checkout…':readiness?.checkoutConfigured?'Continue to secure checkout':'Checkout not configured'}</button></article>)}</div>:<div className={`rounded-2xl border border-dashed p-6 text-sm text-slate-500 ${card}`}>No active subscription plans are currently published.</div>}
      </section>
      <section className={`rounded-2xl border p-5 ${card}`}><h2 className="font-black">Recent payment activity</h2>{transactions.length?<div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{transactions.map((tx:any)=><div key={tx.reference} className="flex flex-wrap justify-between gap-3 py-3 text-sm"><div><b>{tx.reference}</b><p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p></div><div className="text-right"><b>{money(Number(tx.amount),tx.currency)}</b><p className="text-xs capitalize text-slate-500">{tx.status}</p>{tx.checkout_url&&tx.status==='pending'&&<a className="text-xs font-bold text-blue-600 underline" href={tx.checkout_url}>Resume payment</a>}</div></div>)}</div>:<p className="mt-3 text-sm text-slate-500">No payment transactions recorded yet.</p>}</section>
    </>}
    <Link to="/home" className="inline-flex text-sm font-bold text-blue-700 dark:text-blue-300">← Back to dashboard</Link>
  </div>;
}

// ==========================================
// PROFILE PAGE (With Unique SABI ID, Recovery Doc Download & Real 0-Diamond Balance)
// ==========================================
export function ProfilePage() {
  const { isDark, toggleTheme } = useTheme();
  const [profile,setProfile]=useState<any>(null);
  const [authUser,setAuthUser]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    let active=true;
    (async()=>{
      setLoading(true);setError('');
      try{
        const {data:userData,error:userError}=await supabase.auth.getUser();
        if(userError||!userData.user)throw new Error('Sign in to view your account profile.');
        const {data:profileData,error:profileError}=await supabase.from('profiles').select('*').eq('id',userData.user.id).maybeSingle();
        if(profileError)throw new Error('Your account profile could not be loaded.');
        if(active){setAuthUser(userData.user);setProfile(profileData);}
      }catch(e){if(active)setError(e instanceof Error?e.message:'Profile is temporarily unavailable.');}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;};
  },[]);

  const metadata=authUser?.user_metadata||{};
  const name=profile?.full_name||profile?.name||metadata.full_name||metadata.name||'Name not provided';
  const email=authUser?.email||profile?.email||'Email not available';
  const phone=profile?.phone||metadata.phone||'Not provided';
  const state=profile?.state_of_origin||metadata.state_of_origin||'Not provided';
  const uniqueId=profile?.sabi_unique_id||'Not assigned';
  const subjects=Array.isArray(profile?.registered_subjects)?profile.registered_subjects:[];
  const answers=profile?.onboarding_answers&&typeof profile.onboarding_answers==='object'?profile.onboarding_answers:{};

  return <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
    <header><p className="text-xs font-black uppercase tracking-widest text-blue-600">Account settings</p><h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Your profile</h1><p className="mt-2 text-sm text-slate-500">Account identity and academic details retrieved from your signed-in SABI account.</p></header>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
    {loading?<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">Loading your account…</div>:profile&&<section className={`rounded-3xl border p-6 sm:p-8 ${isDark?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-700 text-2xl font-black text-white">{String(name).charAt(0).toUpperCase()}</div><div className="min-w-0"><h2 className="text-xl font-black">{name}</h2><p className="break-all text-sm text-slate-500">{email}</p><p className="mt-1 text-xs text-slate-500">{profile.onboarding_completed?'Onboarding completed':'Onboarding not completed'}</p></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">Phone</p><p className="mt-1 font-bold">{phone}</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">State of origin</p><p className="mt-1 font-bold">{state}</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">SABI ID</p><p className="mt-1 font-mono font-bold">{uniqueId}</p></div>
        <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">Target score</p><p className="mt-1 font-bold">{profile.target_score??'Not set'}</p></div>
      </div>
      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800"><h3 className="font-black">UTME subject combination</h3>{subjects.length?<div className="mt-3 flex flex-wrap gap-2">{subjects.map((subject:string)=><span key={subject} className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-200">{subject}</span>)}</div>:<p className="mt-2 text-sm text-slate-500">No subject combination saved yet. Complete onboarding to set your four UTME subjects.</p>}</div>
      <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800"><h3 className="font-black">Study preferences</h3><dl className="mt-3 grid gap-3 sm:grid-cols-2 text-sm">{[['Study style',answers.studyStyle],['Daily study time',answers.dailyStudyHours],['Study environment',answers.studyEnvironment],['Explanation preference',answers.explanationPreference],['Language preference',answers.languagePreference],['Priority subject',answers.prioritySubject]].map(([label,value])=><div key={String(label)}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold">{value||'Not provided'}</dd></div>)}</dl></div>
    </section>}
    <section className={`flex items-center justify-between gap-4 rounded-2xl border p-5 ${isDark?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}><div><h2 className="font-bold">Appearance</h2><p className="text-xs text-slate-500">Choose light or dark mode for this device.</p></div><button onClick={toggleTheme} className="rounded-xl bg-blue-700 px-4 py-2.5 text-xs font-black text-white">{isDark?'Dark mode · On':'Light mode · On'}</button></section>
    <p className="text-xs text-slate-500">To change protected account details such as your email or SABI ID, contact SABI support. This screen does not alter account credentials or permissions.</p>
  </div>;
}

// ==========================================
// NOTIFICATIONS PAGE
// ==========================================
export function NotificationsPage() {
  const { isDark } = useTheme();
  const [notifications,setNotifications]=useState<any[]>([]);
  const [preferences,setPreferences]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState('');
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const refresh=async()=>{
    setLoading(true);setError('');
    try{
      const [n,p]=await Promise.all([apiFetch('/api/notifications?limit=50'),apiFetch('/api/notifications/preferences')]);
      const [nd,pd]=await Promise.all([n.json().catch(()=>({})),p.json().catch(()=>({}))]);
      if(!n.ok||!p.ok)throw new Error(nd.error||pd.error||'Notifications could not be loaded.');
      setNotifications(nd.notifications||[]);setPreferences(pd.preferences||[]);
    }catch(e){setError(e instanceof Error?e.message:'Notifications are temporarily unavailable.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void refresh();},[]);

  const markRead=async(id:string)=>{
    setBusy(id);setError('');setNotice('');
    try{
      const response=await apiFetch('/api/notifications/'+encodeURIComponent(id)+'/read',{method:'PATCH'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Notification could not be marked as read.');
      setNotifications(rows=>rows.map(row=>row.id===id?{...row,read_at:body.notification?.read_at||new Date().toISOString()}:row));
    }catch(e){setError(e instanceof Error?e.message:'Could not update notification.');}
    finally{setBusy('');}
  };
  const markAllRead=async()=>{
    setBusy('all');setError('');setNotice('');
    try{
      const response=await apiFetch('/api/notifications/read-all',{method:'PATCH'});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Notifications could not be marked as read.');
      setNotifications(rows=>rows.map(row=>({...row,read_at:row.read_at||new Date().toISOString()})));
      setNotice('All notifications marked as read.');
    }catch(e){setError(e instanceof Error?e.message:'Could not update notifications.');}
    finally{setBusy('');}
  };
  const togglePreference=async(pref:any)=>{
    const key=pref.channel+':'+pref.notification_key;
    setBusy(key);setError('');setNotice('');
    try{
      const response=await apiFetch('/api/notifications/preferences',{method:'PUT',body:JSON.stringify({
        channel:pref.channel,notificationKey:pref.notification_key,enabled:!pref.enabled,
        ...(pref.quiet_hours ? {quietHours:pref.quiet_hours} : {}),
      })});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Notification preference could not be saved.');
      setPreferences(rows=>rows.map(row=>row.channel===pref.channel&&row.notification_key===pref.notification_key?body.preference:row));
    }catch(e){setError(e instanceof Error?e.message:'Preference update failed.');}
    finally{setBusy('');}
  };
  const card=isDark?'bg-slate-900 border-slate-800':'bg-white border-slate-200';
  const unread=notifications.filter(n=>!n.read_at).length;

  return <div className="mx-auto max-w-3xl space-y-6 pb-16 lg:pb-0">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-blue-600">Your account updates</p><h1 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Notifications</h1><p className="mt-1 text-sm text-slate-500">{unread} unread · {notifications.length} shown</p></div><div className="flex gap-2"><button onClick={()=>void refresh()} disabled={loading} className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-700">{loading?'Refreshing…':'Refresh'}</button><button onClick={()=>void markAllRead()} disabled={!unread||Boolean(busy)} className="rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Mark all read</button></div></header>
    {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
    {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{notice}</div>}
    <section className="space-y-3">
      {loading&&notifications.length===0?<div className={`rounded-2xl border p-6 text-sm text-slate-500 ${card}`}>Loading notifications…</div>:notifications.length===0?<div className={`rounded-2xl border p-8 text-center ${card}`}><Bell size={32} className="mx-auto text-blue-600"/><h2 className="mt-3 font-black">No notifications yet</h2><p className="mt-1 text-sm text-slate-500">Important learning and account updates will appear here.</p></div>:notifications.map(item=><article key={item.id} className={`rounded-2xl border p-4 sm:p-5 ${card} ${item.read_at?'opacity-75':''}`}><div className="flex items-start gap-3"><span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.read_at?'bg-slate-300':'bg-blue-600'}`}/><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="font-bold">{item.title}</h2><time className="text-[11px] text-slate-500">{new Date(item.created_at).toLocaleString()}</time></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>{!item.read_at&&<button onClick={()=>void markRead(item.id)} disabled={Boolean(busy)} className="mt-3 text-xs font-bold text-blue-700 underline dark:text-blue-300">{busy===item.id?'Saving…':'Mark as read'}</button>}</div></div></article>)}
    </section>
    <section className={`rounded-2xl border p-5 ${card}`}><h2 className="font-black">Notification preferences</h2><p className="mt-1 text-xs text-slate-500">Manage channels and categories already configured for your account.</p>
      {preferences.length? <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">{preferences.map(pref=><div key={pref.channel+':'+pref.notification_key} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{String(pref.notification_key).replace(/[._-]/g,' ')}</p><p className="text-xs text-slate-500 capitalize">{pref.channel}</p></div><button role="switch" aria-checked={Boolean(pref.enabled)} onClick={()=>void togglePreference(pref)} disabled={Boolean(busy)} className={`rounded-full px-4 py-2 text-xs font-bold ${pref.enabled?'bg-blue-700 text-white':'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{busy===pref.channel+':'+pref.notification_key?'Saving…':pref.enabled?'Enabled':'Disabled'}</button></div>)}</div>:<p className="mt-3 text-sm text-slate-500">No notification preferences have been configured for this account yet.</p>}
    </section>
  </div>;
}

// ==========================================
// REAL INTERACTIVE TOOLKIT SUB-PAGES (/menu/:section)
// ==========================================
export function MainPage({ page }: { page: string }) {
  const { section } = useParams();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  // Mistake Notebook reads verified attempts from the authenticated learning API.
  type ServerMistake = {
    id: string; sessionId: string; questionId: string; subject: string; topic: string | null;
    subtopic: string | null; question: string; options: Record<'A'|'B'|'C'|'D',string>;
    selectedOption: 'A'|'B'|'C'|'D'; correctOption: 'A'|'B'|'C'|'D'; explanation: string; answeredAt: string;
  };
  const [mistakes, setMistakes] = useState<ServerMistake[]>([]);
  const [mistakeSubjectFilter, setMistakeSubjectFilter] = useState<string>('All');
  const [mistakesLoading, setMistakesLoading] = useState(false);
  const [mistakesError, setMistakesError] = useState('');

  // Study Resources Modals State
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [showHeatmapModal, setShowHeatmapModal] = useState(false);

  const loadMistakes = async () => {
    setMistakesLoading(true);
    setMistakesError('');
    try {
      const response = await apiFetch('/api/learning/mistakes?limit=200');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Your mistake notebook could not be loaded.');
      setMistakes(Array.isArray(body.mistakes) ? body.mistakes : []);
    } catch (error) {
      setMistakesError(error instanceof Error ? error.message : 'Your mistake notebook is temporarily unavailable.');
    } finally {
      setMistakesLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'mistakes') void loadMistakes();
  }, [section]);

  // 1. VERIFIED MISTAKE NOTEBOOK (/menu/mistakes)
  if (section === 'mistakes') {
    const filteredMistakes = mistakeSubjectFilter === 'All'
      ? mistakes
      : mistakes.filter(item => item.subject === mistakeSubjectFilter);

    return (
      <div className="space-y-6 pb-16 lg:pb-0 max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">Error Correction Engine</span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Mistake Notebook ({mistakes.length})</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Missed answers from your saved SABI learning sessions, with the approved correction and explanation.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => void loadMistakes()} disabled={mistakesLoading} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-50">{mistakesLoading ? 'Refreshing…' : 'Refresh'}</button>
            <Link to="/blitz" className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider shrink-0 self-start">Practise in Blitz →</Link>
          </div>
        </div>
        {mistakesError && <div role="alert" className="p-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 text-sm">{mistakesError}</div>}
        <div className="flex flex-wrap gap-2">
          {['All', 'English Language', 'Mathematics', 'Physics', 'Chemistry'].map(sub => (
            <button key={sub} onClick={() => setMistakeSubjectFilter(sub)} className={`px-4 py-2 rounded-xl text-xs font-black border transition cursor-pointer ${
              mistakeSubjectFilter === sub ? 'bg-blue-600 text-white border-blue-600' : isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 hover:border-blue-300'
            }`}>{sub}</button>
          ))}
        </div>
        {mistakesLoading && mistakes.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>Loading your saved mistakes…</div>
        ) : filteredMistakes.length === 0 ? (
          <div className={`p-8 rounded-3xl border text-center space-y-3 ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
            <CheckCircle2 size={36} className="mx-auto text-emerald-500"/>
            <h3 className="text-lg font-black">{mistakes.length === 0 ? 'No missed answers recorded yet' : `No mistakes in ${mistakeSubjectFilter}`}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">When you submit an incorrect answer in a SABI learning session, it will appear here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMistakes.map(item => (
              <article key={item.id} className={`p-6 rounded-3xl border space-y-4 ${isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black">{item.subject} · {item.topic || 'Topic not tagged'}</span>
                  <time className="text-xs text-slate-500">{new Date(item.answeredAt).toLocaleString()}</time>
                </div>
                <div className="text-sm sm:text-base font-bold leading-relaxed"><MathText text={item.question}/></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold">Your Answer: Option {item.selectedOption} — <MathText text={item.options[item.selectedOption] || ''}/></div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold">Correct Answer: Option {item.correctOption} — <MathText text={item.options[item.correctOption] || ''}/></div>
                </div>
                <div className={`p-4 rounded-2xl border text-xs leading-relaxed ${isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <strong className="font-black text-blue-600 dark:text-blue-400 block mb-1">Approved explanation</strong>
                  {item.explanation ? <MathText text={item.explanation}/> : 'No explanation is available for this question yet.'}
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
