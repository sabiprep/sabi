import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Flame,
  Star,
  Zap,
  Calculator,
  Settings,
  X,
  Volume2,
  VolumeX,
  Lock,
  ShieldCheck,
  Coins,
  Award,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useTheme } from '../app/ThemeProvider';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import {
  getRealUserProgress,
  recordLevelCompletion,
} from '../utils/userProgressStore';
import JAMBCalculatorModal from '../components/mobile/JAMBCalculatorModal';
import LevelSimulatorWorkspace from '../components/LevelSimulatorWorkspace';

const BLITZ_SUBJECTS: SubjectName[] = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
];

interface BlitzLevel {
  id: number;
  setNumber: 1 | 2;
  title: string;
  questionCount: 10 | 15;
  type: 'standard' | 'speed' | 'chest' | 'general_test';
  unlocked: boolean;
  completed: boolean;
  stars: number;
}

const SET_1_BASE_LEVELS: Omit<BlitzLevel, 'unlocked' | 'completed' | 'stars'>[] = [
  { id: 1, setNumber: 1, title: 'Foundation Blitz I', questionCount: 10, type: 'standard' },
  { id: 2, setNumber: 1, title: 'Speed Surge Drill', questionCount: 10, type: 'speed' },
  { id: 3, setNumber: 1, title: 'Formula & Text Core', questionCount: 15, type: 'standard' },
  { id: 4, setNumber: 1, title: 'Milestone Vault', questionCount: 10, type: 'chest' },
  { id: 5, setNumber: 1, title: 'Citadel Combat I', questionCount: 15, type: 'standard' },
  { id: 6, setNumber: 1, title: 'Set 1 General Test', questionCount: 15, type: 'general_test' },
];

const SET_2_BASE_LEVELS: Omit<BlitzLevel, 'unlocked' | 'completed' | 'stars'>[] = [
  { id: 7, setNumber: 2, title: 'Advanced Mastery I', questionCount: 15, type: 'standard' },
  { id: 8, setNumber: 2, title: 'Supersonic KaTeX Drill', questionCount: 10, type: 'speed' },
  { id: 9, setNumber: 2, title: 'Citadel Treasure Vault', questionCount: 10, type: 'chest' },
  { id: 10, setNumber: 2, title: 'Distinction Sprint', questionCount: 15, type: 'standard' },
  { id: 11, setNumber: 2, title: 'Set 2 General Test', questionCount: 15, type: 'general_test' },
];

export function BlitzPage() {
  const { isDark } = useTheme();
  const [userProgress, setUserProgress] = useState(() => getRealUserProgress());

  const [activeSubject, setActiveSubject] = useState<SubjectName>('Mathematics');
  const [activeLevel, setActiveLevel] = useState<BlitzLevel | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [claimedChestLevel, setClaimedChestLevel] = useState<number | null>(null);
  const [timerSecondsPerQuestion, setTimerSecondsPerQuestion] = useState<number>(60);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Set 1 Levels (Active Set)
  const set1Levels: BlitzLevel[] = useMemo(() => {
    return SET_1_BASE_LEVELS.map(lvl => {
      const stars = userProgress.blitzStarsByLevel[lvl.id] || 0;
      const unlocked = lvl.id <= userProgress.blitzUnlockedLevel;
      const completed = lvl.id < userProgress.blitzUnlockedLevel || stars > 0;
      return { ...lvl, unlocked, completed, stars };
    });
  }, [userProgress]);

  // Set 2 Levels (Unlocked only after passing Set 1 General Test AND having active subscription/diamonds)
  const isSet2Unlocked = Boolean(
    userProgress.blitzSet1GeneralTestPassed &&
      (userProgress.subscriptionPlan !== 'free' || userProgress.mainDiamonds > 0)
  );

  const set2Levels: BlitzLevel[] = useMemo(() => {
    return SET_2_BASE_LEVELS.map(lvl => {
      const stars = userProgress.blitzStarsByLevel[lvl.id] || 0;
      const unlocked = isSet2Unlocked && lvl.id <= userProgress.blitzUnlockedLevel;
      const completed = isSet2Unlocked && (lvl.id < userProgress.blitzUnlockedLevel || stars > 0);
      return { ...lvl, unlocked, completed, stars };
    });
  }, [userProgress, isSet2Unlocked]);

  // Build question list for the active level & subject
  const activeQuestionList = useMemo(() => {
    if (!activeLevel) return [];
    const subjectPool = SEED_QUESTIONS.filter(q => q.subject === activeSubject);
    const pool = subjectPool.length > 0 ? subjectPool : SEED_QUESTIONS;
    const count = activeLevel.questionCount;
    const result: Question[] = [];
    for (let i = 0; i < count; i++) {
      result.push(pool[(i + (activeLevel.id - 1) * 3) % pool.length]);
    }
    return result;
  }, [activeLevel, activeSubject]);

  const handleStartLevel = (level: BlitzLevel) => {
    if (!level.unlocked) return;
    if (level.type === 'chest') {
      setClaimedChestLevel(level.id);
      setShowChestModal(true);
      sound.playSuccess();
      confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
      return;
    }
    sound.playTap();
    setActiveLevel(level);
    setIsSimulatorOpen(true);
  };

  // Fixed Zigzag coordinates for Set 1 (6 nodes) so the sharp Z-line connects center-to-center
  const set1Coords = [
    { x: 190, y: 55 },
    { x: 75, y: 165 },
    { x: 305, y: 275 },
    { x: 75, y: 385 },
    { x: 305, y: 495 },
    { x: 190, y: 615 },
  ];

  const set2Coords = [
    { x: 190, y: 55 },
    { x: 80, y: 165 },
    { x: 300, y: 275 },
    { x: 80, y: 385 },
    { x: 190, y: 500 },
  ];

  const subjectRating = userProgress.subjectStats[activeSubject]?.rating || 0;

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      } transition-colors duration-200 flex flex-col`}
    >
      {/* ======================================================== */}
      {/* TOP HEADER: SABI BLITZ HUB */}
      {/* ======================================================== */}
      <header
        className={`sabi-top-safe-bar sticky top-0 z-30 px-4 sm:px-8 py-3.5 border-b backdrop-blur-md ${
          isDark ? 'bg-[#080D1A]/95 border-slate-800' : 'bg-white/95 border-slate-200'
        } flex items-center justify-between gap-3`}
      >
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-blue-900 dark:text-amber-400">
                SABI BLITZ Z-PATH
              </h1>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
              {activeSubject} Rating: {subjectRating}% (100% Flawless Clear Required)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black">
            <Flame size={14} />
            <span>{userProgress.streakDays}d Streak</span>
          </div>

          <Link
            to="/subscription"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 border border-blue-500/30 text-blue-500 dark:text-amber-300 text-xs font-black"
          >
            <Coins size={14} />
            <span>{userProgress.diamonds} 💎</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCalculatorOpen(true)}
            className="p-2 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300 transition cursor-pointer"
            title="Open Moveable Scientific Calculator"
          >
            <Calculator size={17} />
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400 cursor-pointer"
            title="Blitz Speed Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 4-SUBJECT SWITCHER BAR */}
      {/* ======================================================== */}
      <section
        className={`px-4 py-3 border-b ${
          isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          {BLITZ_SUBJECTS.map(subject => {
            const isSelected = activeSubject === subject;
            const rate = userProgress.subjectStats[subject]?.rating || 0;
            return (
              <button
                key={subject}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setActiveSubject(subject);
                }}
                className={`flex-1 min-w-[140px] sm:min-w-0 py-3 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-between gap-2 border-2 cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white border-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.25)] scale-[1.02]'
                    : isDark
                    ? 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 shadow-sm'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isSelected ? 'bg-amber-400' : 'bg-slate-400'
                    }`}
                  />
                  <span className="truncate">{subject}</span>
                </div>
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {rate}%
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* MAIN BLITZ ARENA: VISIBLE Z-LINE + ACTIVE SET 1 + LOCKED SET 2 */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col items-center space-y-10">
        {/* Top Hero Banner with Eagle Mascot */}
        <div className="w-full rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 flex items-center justify-between gap-4 shadow-xl">
          <div className="flex-1 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Zap size={13} />
              <span>Set 1 Active · {activeSubject}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950">
              Conquer Set 1 & Pass the General Test
            </h2>
            <p className="text-xs sm:text-sm text-slate-900 font-semibold leading-relaxed">
              Follow the sharp <strong>Z-Line Track</strong> below. Answer 10 or 15 KaTeX questions per level, review full worked solutions + AI verifications at the end of every level, and pass the <strong>Set 1 General Test</strong> to unlock Set 2!
            </p>
          </div>

          <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 relative">
            <img
              src="/assets/mascots/blitz/eagle_flying_speed.svg"
              alt="Sabi Eagle"
              className="w-full h-full object-contain filter drop-shadow-xl"
            />
          </div>
        </div>

        {/* ==================================================== */}
        {/* SET 1: ACTIVE Z-LINE PATH (LEVELS 1 TO 6 + GENERAL TEST) */}
        {/* ==================================================== */}
        <section className="w-full flex flex-col items-center">
          <div className="w-full max-w-md mb-4 flex items-center justify-between px-4 py-2.5 rounded-2xl bg-blue-950 border-2 border-amber-400 text-white shadow-lg">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                SET 1 · ACTIVE CITADEL TRACK
              </span>
              <h3 className="text-sm sm:text-base font-black">
                Levels 1–5 + Set 1 General Test Checkpoint
              </h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-black">
              UNLOCKED
            </span>
          </div>

          <div className="relative w-full max-w-[380px] h-[700px] mx-auto select-none">
            {/* PROMINENT SHARP Z-LINE CONNECTOR SVG */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              viewBox="0 0 380 700"
              fill="none"
            >
              {/* Outer Royal Blue Glow Track */}
              <path
                d="M 190 55 L 75 165 L 305 275 L 75 385 L 305 495 L 190 615"
                stroke="#1E3A8A"
                strokeWidth="22"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Inner Bright Yellow/Amber Sharp Z-Line */}
              <path
                d="M 190 55 L 75 165 L 305 275 L 75 385 L 305 495 L 190 615"
                stroke="#F59E0B"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Animated Dashed Center Highlight */}
              <path
                d="M 190 55 L 75 165 L 305 275 L 75 385 L 305 495 L 190 615"
                stroke="#FEF08A"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="12 10"
              />
            </svg>

            {set1Levels.map((level, idx) => {
              const coord = set1Coords[idx];
              const isCurrent = level.unlocked && !level.completed;
              const isGeneralTest = level.type === 'general_test';

              return (
                <div
                  key={level.id}
                  style={{ left: `${coord.x}px`, top: `${coord.y}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
                >
                  {/* Perched Eagle Mascot on Current Active Level */}
                  {isCurrent && (
                    <div className="absolute -top-14 -right-12 z-20 w-16 h-16 pointer-events-none animate-bounce">
                      <img
                        src="/assets/mascots/blitz/eagle_idle.svg"
                        alt="Active Eagle"
                        className="w-full h-full object-contain filter drop-shadow-md"
                      />
                      <div className="absolute -bottom-1 -left-2 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[9px] font-black uppercase whitespace-nowrap shadow-sm">
                        START!
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleStartLevel(level)}
                    disabled={!level.unlocked}
                    className={`relative ${
                      isGeneralTest ? 'w-24 h-24 rounded-3xl' : 'w-20 h-20 rounded-full'
                    } flex flex-col items-center justify-center transition-all duration-300 transform cursor-pointer ${
                      !level.unlocked
                        ? 'bg-slate-800 border-4 border-slate-700 text-slate-500 cursor-not-allowed'
                        : level.completed
                        ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 border-4 border-yellow-200 shadow-[0_6px_0_#B45309] hover:-translate-y-1'
                        : isCurrent
                        ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-slate-950 border-4 border-white shadow-[0_8px_0_#B45309] scale-110 ring-4 ring-amber-400/50 hover:-translate-y-1'
                        : 'bg-blue-600 text-white border-4 border-blue-300 shadow-[0_6px_0_#1E3A8A] hover:-translate-y-1'
                    }`}
                  >
                    {level.type === 'chest' ? (
                      <img
                        src={
                          level.completed
                            ? '/assets/environment/treasure_chest_open.svg'
                            : '/assets/environment/treasure_chest_closed.svg'
                        }
                        alt="Milestone Chest"
                        className="w-11 h-11 object-contain drop-shadow"
                      />
                    ) : isGeneralTest ? (
                      <img
                        src="/assets/environment/general_test_archway.svg"
                        alt="Set 1 General Test"
                        className="w-16 h-16 object-contain drop-shadow"
                      />
                    ) : level.type === 'speed' ? (
                      <Zap size={28} className={level.completed ? 'text-slate-950' : 'text-amber-300'} />
                    ) : (
                      <span className="font-display font-black text-2xl">{level.id}</span>
                    )}
                  </button>

                  {/* Node Label & Stars Badge */}
                  <div className="mt-2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-center shadow-md">
                    {level.completed && (
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        {[1, 2, 3].map(s => (
                          <Star
                            key={s}
                            size={11}
                            className={
                              s <= level.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                            }
                          />
                        ))}
                      </div>
                    )}
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider block whitespace-nowrap ${
                        isGeneralTest ? 'text-amber-400' : 'text-slate-200'
                      }`}
                    >
                      {level.title} ({level.questionCount}Q)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ==================================================== */}
        {/* SET 2: LOCKED NEXT SET WITH LOCKED SVG & GENERAL TEST NOTICE */}
        {/* ==================================================== */}
        <section className="w-full flex flex-col items-center pt-4">
          {/* Locked Gatekeeper Banner */}
          <div className="w-full max-w-xl rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 border-2 border-amber-500/70 text-white shadow-2xl space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <div className="flex items-center gap-3 shrink-0">
                <img
                  src="/assets/environment/locked_gatekeeper.svg"
                  alt="Locked Set 2 Gate"
                  className="w-20 h-20 object-contain drop-shadow-xl"
                />
                <img
                  src="/assets/mascots/blitz/eagle_sleeping_locked.svg"
                  alt="Sleeping Eagle Locked"
                  className="w-20 h-20 object-contain drop-shadow-xl"
                />
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider">
                  <Lock size={12} />
                  <span>SET 2 · ADVANCED UTME MASTERY CITADEL</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-white">
                  {isSet2Unlocked
                    ? 'Set 2 Unlocked! Continue Your Z-Path Below'
                    : 'Finish Set 1 & Pass the General Test or Unlock 5,000 💎 Pass'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  To unlock Set 2 (Levels 7–11 + Set 2 General Test), complete Set 1 above, pass the <strong>Set 1 General Test</strong> at the end of the set, and activate your <strong>₦10,000 One-Time Pass (5,000 💎 Vault)</strong>.
                </p>
              </div>
            </div>

            {!isSet2Unlocked && (
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <ShieldCheck size={15} />
                  <span>
                    Set 1 General Test:{' '}
                    {userProgress.blitzSet1GeneralTestPassed ? 'Passed ✓' : 'Pending'}
                  </span>
                </span>
                <Link
                  to="/subscription"
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider transition shadow-md"
                >
                  Unlock ₦10,000 Pass (5,000 💎) →
                </Link>
              </div>
            )}
          </div>

          {/* Set 2 Z-Line Preview (With Locked SVG Overlay on Nodes) */}
          <div className="relative w-full max-w-[380px] h-[580px] mx-auto mt-6 select-none opacity-85">
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-0"
              viewBox="0 0 380 580"
              fill="none"
            >
              <path
                d="M 190 55 L 80 165 L 300 275 L 80 385 L 190 500"
                stroke="#1E293B"
                strokeWidth="20"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M 190 55 L 80 165 L 300 275 L 80 385 L 190 500"
                stroke={isSet2Unlocked ? '#F59E0B' : '#475569'}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="12 10"
              />
            </svg>

            {set2Levels.map((level, idx) => {
              const coord = set2Coords[idx];
              const isGeneralTest = level.type === 'general_test';

              return (
                <div
                  key={level.id}
                  style={{ left: `${coord.x}px`, top: `${coord.y}px` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center"
                >
                  <button
                    type="button"
                    onClick={() => handleStartLevel(level)}
                    disabled={!level.unlocked}
                    className={`relative ${
                      isGeneralTest ? 'w-24 h-24 rounded-3xl' : 'w-20 h-20 rounded-full'
                    } flex flex-col items-center justify-center border-4 transition ${
                      level.unlocked
                        ? 'bg-amber-400 text-slate-950 border-white shadow-lg cursor-pointer'
                        : 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed shadow-md'
                    }`}
                  >
                    {!level.unlocked ? (
                      <img
                        src="/assets/environment/locked_gatekeeper.svg"
                        alt="Locked Level"
                        className="w-11 h-11 object-contain opacity-90"
                      />
                    ) : isGeneralTest ? (
                      <img
                        src="/assets/environment/general_test_archway.svg"
                        alt="Set 2 General Test"
                        className="w-16 h-16 object-contain"
                      />
                    ) : (
                      <span className="font-display font-black text-2xl">{level.id}</span>
                    )}
                  </button>

                  <div className="mt-2 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block whitespace-nowrap">
                      {level.title} ({level.questionCount}Q)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* SHARED FULL-SCREEN LEVEL SIMULATOR + SOLUTION DASHBOARD + AI */}
      {/* ======================================================== */}
      {isSimulatorOpen && activeLevel && (
        <LevelSimulatorWorkspace
          mode="blitz"
          levelId={activeLevel.id}
          levelTitle={`${activeSubject} · ${activeLevel.title}`}
          subjectLabel={activeSubject}
          questions={activeQuestionList}
          secondsPerQuestion={timerSecondsPerQuestion}
          isGeneralTest={activeLevel.type === 'general_test'}
          onClose={() => setIsSimulatorOpen(false)}
          onProgressUpdated={next => setUserProgress(next)}
        />
      )}

      {/* ======================================================== */}
      {/* TREASURE CHEST UNLOCKED MODAL */}
      {/* ======================================================== */}
      {showChestModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E172A] border-2 border-amber-400 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center text-white shadow-2xl">
            <div className="w-28 h-28 mx-auto mb-4">
              <img
                src="/assets/environment/treasure_chest_open.svg"
                alt="Treasure Chest Open"
                className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.5)]"
              />
            </div>
            <h3 className="text-xl font-black text-amber-400 mb-1">
              Milestone Vault Cleared!
            </h3>
            <p className="text-xs text-slate-300 mb-6">
              You unlocked Milestone Vault Level {claimedChestLevel}! Continue down the Z-path toward the Set 1 General Test.
            </p>
            <button
              type="button"
              onClick={() => {
                if (claimedChestLevel) {
                  const nextProg = recordLevelCompletion('blitz', claimedChestLevel, 3);
                  setUserProgress(nextProg);
                }
                setShowChestModal(false);
              }}
              className="w-full py-3.5 rounded-xl font-black text-sm bg-amber-400 text-slate-950 hover:bg-amber-300 transition cursor-pointer"
            >
              Unlock Next Level →
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SETTINGS / SPEED MODAL */}
      {/* ======================================================== */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0E172A] border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-sm w-full text-slate-900 dark:text-white shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black">Blitz Speed Settings</h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">
                  Seconds Per Question (Blitz Speed):
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[45, 60, 90].map(sec => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => setTimerSecondsPerQuestion(sec)}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition cursor-pointer ${
                        timerSecondsPerQuestion === sec
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {sec} seconds
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold">Sound Effects:</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !audioEnabled;
                    setAudioEnabled(next);
                    sound.setEnabled(next);
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettingsModal(false)}
              className="mt-6 w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition cursor-pointer"
            >
              Save & Return
            </button>
          </div>
        </div>
      )}

      <JAMBCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}

export default BlitzPage;
