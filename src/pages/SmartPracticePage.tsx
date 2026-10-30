import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Flame,
  Star,
  Calculator,
  Compass,
  GraduationCap,
  Layers,
  BookOpen,
  Lock,
  Coins,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import { getRealUserProgress } from '../utils/userProgressStore';
import JAMBCalculatorModal from '../components/mobile/JAMBCalculatorModal';
import LevelSimulatorWorkspace from '../components/LevelSimulatorWorkspace';

const SMART_SUBJECTS: SubjectName[] = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
];

interface SmartBranchLevel {
  id: number;
  setNumber: 1 | 2;
  branch: 'straight' | 'left' | 'right';
  title: string;
  subjectTag: SubjectName;
  topic: string;
  questionCount: 10 | 15;
  isGeneralTest?: boolean;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  buildingType: 'library' | 'lab' | 'archway' | 'signpost';
  xPercent: number; // Position on the visual branching road canvas
  yPx: number;
}

const BASE_ROAD_LEVELS: Omit<SmartBranchLevel, 'unlocked' | 'completed' | 'stars'>[] = [
  {
    id: 1,
    setNumber: 1,
    branch: 'straight',
    title: 'Citadel Main Highway Gate',
    subjectTag: 'English Language',
    topic: 'Lexis, Structure & Concord',
    questionCount: 10,
    buildingType: 'signpost',
    xPercent: 50,
    yPx: 65,
  },
  {
    id: 2,
    setNumber: 1,
    branch: 'left',
    title: 'West Quad Forward Branch',
    subjectTag: 'Mathematics',
    topic: 'Calculus, Surds & Quadratics',
    questionCount: 10,
    buildingType: 'lab',
    xPercent: 22,
    yPx: 205,
  },
  {
    id: 3,
    setNumber: 1,
    branch: 'right',
    title: 'East Faculty Forward Branch',
    subjectTag: 'Physics',
    topic: 'Mechanics, Waves & Optics',
    questionCount: 15,
    buildingType: 'lab',
    xPercent: 78,
    yPx: 335,
  },
  {
    id: 4,
    setNumber: 1,
    branch: 'straight',
    title: 'Central Campus Roundabout',
    subjectTag: 'Chemistry',
    topic: 'Stoichiometry & Organic',
    questionCount: 10,
    buildingType: 'library',
    xPercent: 50,
    yPx: 465,
  },
  {
    id: 5,
    setNumber: 1,
    branch: 'left',
    title: 'Senate Library Spur Road',
    subjectTag: 'English Language',
    topic: 'Comprehension & Registers',
    questionCount: 15,
    buildingType: 'library',
    xPercent: 24,
    yPx: 595,
  },
  {
    id: 6,
    setNumber: 1,
    branch: 'straight',
    title: 'Set 1 Road General Test',
    subjectTag: 'Mathematics',
    topic: 'Comprehensive Road Checkpoint',
    questionCount: 15,
    isGeneralTest: true,
    buildingType: 'archway',
    xPercent: 50,
    yPx: 735,
  },
];

export function SmartPracticePage() {
  const { isDark } = useTheme();
  const [userProgress, setUserProgress] = useState(() => getRealUserProgress());

  // TOP MODE CONTROLS: Merge all 4 subjects OR Unmerge (handle 1 subject at a time)
  const [subjectMode, setSubjectMode] = useState<'merged' | 'unmerged'>('merged');
  const [activeSingleSubject, setActiveSingleSubject] = useState<SubjectName>('Mathematics');

  const [activeLevel, setActiveLevel] = useState<SmartBranchLevel | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  const roadLevels: SmartBranchLevel[] = useMemo(() => {
    return BASE_ROAD_LEVELS.map(lvl => {
      const stars = userProgress.smartStarsByLevel[lvl.id] || 0;
      const unlocked = lvl.id <= userProgress.smartUnlockedLevel;
      const completed = lvl.id < userProgress.smartUnlockedLevel || stars > 0;
      // When unmerged, adapt the level's subjectTag to the single subject chosen by the student
      const effectiveSubject =
        subjectMode === 'unmerged' ? activeSingleSubject : lvl.subjectTag;
      return {
        ...lvl,
        subjectTag: effectiveSubject,
        unlocked,
        completed,
        stars,
      };
    });
  }, [userProgress, subjectMode, activeSingleSubject]);

  // Build questions for the selected level based on Merged (all 4 subjects) vs Unmerged (single subject)
  const levelQuestions: Question[] = useMemo(() => {
    if (!activeLevel) return [];
    const count = activeLevel.questionCount;

    if (subjectMode === 'unmerged') {
      const singlePool = SEED_QUESTIONS.filter(q => q.subject === activeSingleSubject);
      const pool = singlePool.length > 0 ? singlePool : SEED_QUESTIONS;
      const list: Question[] = [];
      for (let i = 0; i < count; i++) {
        list.push(pool[(i + (activeLevel.id - 1) * 2) % pool.length]);
      }
      return list;
    }

    // Merged Mode: Balanced rotation across all 4 registered UTME subjects
    const mergedPool = SEED_QUESTIONS.filter(q =>
      SMART_SUBJECTS.includes(q.subject as SubjectName)
    );
    const pool = mergedPool.length > 0 ? mergedPool : SEED_QUESTIONS;
    const list: Question[] = [];
    for (let i = 0; i < count; i++) {
      list.push(pool[(i + (activeLevel.id - 1) * 3) % pool.length]);
    }
    return list;
  }, [activeLevel, subjectMode, activeSingleSubject]);

  const handleOpenLevel = (lvl: SmartBranchLevel) => {
    if (!lvl.unlocked) return;
    sound.playTap();
    setActiveLevel(lvl);
    setIsSimulatorOpen(true);
  };

  return (
    <div
      className={`min-h-screen ${
        isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      } transition-colors duration-200 flex flex-col`}
    >
      {/* ======================================================== */}
      {/* TOPBAR: SMART PRACTICE ROAD */}
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
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse inline-block" />
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-blue-900 dark:text-white">
                SMART PRACTICE ROAD
              </h1>
            </div>
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 block">
              {subjectMode === 'merged'
                ? 'All 4 UTME Subjects Merged on Forward Branching Road'
                : `Unmerged Single-Subject Track: ${activeSingleSubject}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/subscription"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-500 dark:text-amber-300 text-xs font-black"
          >
            <Coins size={14} />
            <span>{userProgress.diamonds} 💎</span>
          </Link>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black">
            <Flame size={14} />
            <span>Level {userProgress.smartUnlockedLevel}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCalculatorOpen(true)}
            className="p-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 transition cursor-pointer"
            title="Open Moveable Scientific Calculator"
          >
            <Calculator size={17} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* TOP SUBJECT MERGE / UNMERGE CONTROLS (AS REQUESTED) */}
      {/* ======================================================== */}
      <section
        className={`px-4 py-4 border-b ${
          isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400 block">
                Subject Road Structure
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose whether to merge all 4 UTME subjects together or unmerge to master one subject at a time along the branching road.
              </p>
            </div>

            {/* Merge vs Unmerge Top Buttons */}
            <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSubjectMode('merged');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  subjectMode === 'merged'
                    ? 'bg-blue-700 text-white shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Layers size={14} />
                <span>Merge 4 Subjects</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  sound.playTap();
                  setSubjectMode('unmerged');
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                  subjectMode === 'unmerged'
                    ? 'bg-amber-400 text-slate-950 shadow-md'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <BookOpen size={14} />
                <span>Unmerge (1 Subject at a Time)</span>
              </button>
            </div>
          </div>

          {/* When Unmerged is active, show the 4 Subject Selector Buttons */}
          {subjectMode === 'unmerged' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
              {SMART_SUBJECTS.map(sub => {
                const isSelected = activeSingleSubject === sub;
                const rating = userProgress.subjectStats[sub]?.rating || 0;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => {
                      sound.playTap();
                      setActiveSingleSubject(sub);
                    }}
                    className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-between border-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-blue-700 text-white border-amber-400 shadow-md'
                        : isDark
                        ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300'
                    }`}
                  >
                    <span className="truncate">{sub}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      }`}
                    >
                      {rating}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* TRUE VISUAL HIGHWAY ROAD WITH FORWARD LEFT & RIGHT BRANCHES */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col items-center space-y-10">
        {/* Yellow + Blue Standard Intro Card */}
        <div className="w-full rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-amber-400 via-amber-400 to-amber-500 border-2 border-amber-500 text-slate-950 flex items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950 text-amber-400 text-[11px] font-black uppercase tracking-wider">
              <Compass size={13} />
              <span>
                {subjectMode === 'merged'
                  ? 'Merged 4-Subject Campus Highway'
                  : `Single-Subject Road: ${activeSingleSubject}`}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Follow the Forward-Branching Campus Road
            </h2>
            <p className="text-xs sm:text-sm font-semibold text-slate-900 max-w-xl">
              The highway splits forward into West Quad and East Faculty branches before rejoining at the Central Roundabout and Set 1 General Test Archway.
            </p>
          </div>
          <img
            src="/assets/mascots/smart/student_desk_studying.svg"
            alt="Smart Practice Mascot"
            className="w-24 h-24 sm:w-28 sm:h-28 object-contain shrink-0 drop-shadow-xl"
          />
        </div>

        {/* VISUAL ASPHALT ROAD CANVAS WITH FORWARD SVG BRANCHES */}
        <div className="relative w-full max-w-[680px] h-[840px] mx-auto select-none">
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-0"
            viewBox="0 0 680 840"
            fill="none"
            preserveAspectRatio="none"
          >
            {/* Outer Road Curb / Shoulder */}
            {/* Main Central Spine */}
            <path
              d="M 340 30 L 340 760"
              stroke="#334155"
              strokeWidth="62"
              strokeLinecap="round"
            />
            {/* Forward Left Branch (Splits from y=70 to West Quad at x=150, y=205, then rejoins at y=465) */}
            <path
              d="M 340 70 C 260 110, 150 135, 150 205 C 150 310, 260 390, 340 465"
              stroke="#334155"
              strokeWidth="54"
              strokeLinecap="round"
            />
            {/* Forward Right Branch (Splits from y=160 to East Faculty at x=530, y=335, then rejoins at y=465) */}
            <path
              d="M 340 160 C 430 210, 530 250, 530 335 C 530 400, 430 435, 340 465"
              stroke="#334155"
              strokeWidth="54"
              strokeLinecap="round"
            />
            {/* Second Forward Left Spur (Splits from y=465 to x=165, y=595, then rejoins General Test at y=735) */}
            <path
              d="M 340 465 C 250 505, 165 535, 165 595 C 165 655, 250 695, 340 735"
              stroke="#334155"
              strokeWidth="54"
              strokeLinecap="round"
            />

            {/* Inner Dark Asphalt Surface */}
            <path
              d="M 340 30 L 340 760"
              stroke="#0F172A"
              strokeWidth="48"
              strokeLinecap="round"
            />
            <path
              d="M 340 70 C 260 110, 150 135, 150 205 C 150 310, 260 390, 340 465"
              stroke="#0F172A"
              strokeWidth="42"
              strokeLinecap="round"
            />
            <path
              d="M 340 160 C 430 210, 530 250, 530 335 C 530 400, 430 435, 340 465"
              stroke="#0F172A"
              strokeWidth="42"
              strokeLinecap="round"
            />
            <path
              d="M 340 465 C 250 505, 165 535, 165 595 C 165 655, 250 695, 340 735"
              stroke="#0F172A"
              strokeWidth="42"
              strokeLinecap="round"
            />

            {/* Golden Yellow Dashed Highway Lane Markings */}
            <path
              d="M 340 30 L 340 760"
              stroke="#F59E0B"
              strokeWidth="4"
              strokeDasharray="14 12"
            />
            <path
              d="M 340 70 C 260 110, 150 135, 150 205 C 150 310, 260 390, 340 465"
              stroke="#FACC15"
              strokeWidth="3.5"
              strokeDasharray="12 10"
            />
            <path
              d="M 340 160 C 430 210, 530 250, 530 335 C 530 400, 430 435, 340 465"
              stroke="#38BDF8"
              strokeWidth="3.5"
              strokeDasharray="12 10"
            />
            <path
              d="M 340 465 C 250 505, 165 535, 165 595 C 165 655, 250 695, 340 735"
              stroke="#FACC15"
              strokeWidth="3.5"
              strokeDasharray="12 10"
            />
          </svg>

          {/* Render Road Checkpoints & Campus Faculty SVG Props Along the Branches */}
          {roadLevels.map(lvl => {
            const isCurrent = lvl.unlocked && !lvl.completed;
            const buildingSvg =
              lvl.buildingType === 'archway'
                ? '/assets/environment/general_test_archway.svg'
                : lvl.buildingType === 'signpost'
                ? '/assets/environment/road_signpost_branch.svg'
                : lvl.buildingType === 'lab'
                ? '/assets/environment/campus_lab_building.svg'
                : '/assets/environment/campus_library_building.svg';

            return (
              <div
                key={lvl.id}
                style={{ left: `${lvl.xPercent}%`, top: `${lvl.yPx}px` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex items-center gap-3"
              >
                {/* Left-side Campus Building / Prop */}
                {lvl.branch !== 'right' && (
                  <img
                    src={buildingSvg}
                    alt={lvl.title}
                    className="hidden sm:block w-16 h-16 object-contain drop-shadow-lg"
                  />
                )}

                <div className="flex flex-col items-center">
                  {isCurrent && (
                    <div className="mb-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-md animate-bounce">
                      <GraduationCap size={11} />
                      <span>ACTIVE STOP</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleOpenLevel(lvl)}
                    disabled={!lvl.unlocked}
                    className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center border-4 transition-all duration-300 transform cursor-pointer ${
                      !lvl.unlocked
                        ? 'bg-slate-900 border-slate-700 text-slate-500 cursor-not-allowed'
                        : lvl.completed
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 border-white shadow-[0_6px_0_#B45309] hover:-translate-y-1'
                        : isCurrent
                        ? 'bg-gradient-to-tr from-blue-600 to-blue-500 text-white border-amber-400 shadow-[0_8px_0_#1E3A8A] scale-110 ring-4 ring-amber-400/40 hover:-translate-y-1'
                        : 'bg-blue-700 text-white border-blue-300 shadow-[0_6px_0_#1E3A8A]'
                    }`}
                  >
                    {lvl.isGeneralTest ? (
                      <img
                        src="/assets/environment/general_test_archway.svg"
                        alt="General Test"
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <>
                        <span className="font-display font-black text-2xl leading-none">
                          {lvl.id}
                        </span>
                        <span className="text-[8px] font-black uppercase tracking-widest mt-0.5">
                          {lvl.questionCount}Q
                        </span>
                      </>
                    )}
                  </button>

                  {/* Road Checkpoint Signplate */}
                  <div className="mt-1.5 px-3 py-1 rounded-xl bg-slate-950/95 border border-slate-800 text-center shadow-lg max-w-[190px]">
                    {lvl.completed && (
                      <div className="flex items-center justify-center gap-0.5 mb-0.5">
                        {[1, 2, 3].map(s => (
                          <Star
                            key={s}
                            size={10}
                            className={
                              s <= lvl.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                            }
                          />
                        ))}
                      </div>
                    )}
                    <span className="text-[10px] font-black text-white block truncate">
                      {lvl.title}
                    </span>
                    <span className="text-[9px] font-bold text-amber-400 block truncate">
                      {subjectMode === 'merged' ? '4 Subjects Merged' : lvl.subjectTag}
                    </span>
                  </div>
                </div>

                {/* Right-side Campus Building / Prop */}
                {lvl.branch === 'right' && (
                  <img
                    src={buildingSvg}
                    alt={lvl.title}
                    className="hidden sm:block w-16 h-16 object-contain drop-shadow-lg"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Locked Set 2 Campus Road Notice */}
        <div className="w-full max-w-xl rounded-3xl p-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-950 border-2 border-amber-500/70 text-white shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <img
              src="/assets/environment/locked_gatekeeper.svg"
              alt="Locked Road Set 2"
              className="w-20 h-20 object-contain shrink-0"
            />
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase">
                <Lock size={11} />
                <span>SET 2 CAMPUS HIGHWAY LOCKED</span>
              </div>
              <h3 className="text-base sm:text-lg font-black">
                Pass Set 1 General Test or Unlock 5,000 💎 Vault
              </h3>
              <p className="text-xs text-slate-300">
                Complete all 6 stops on Set 1 Highway and activate your ₦10,000 One-Time Pass to open Set 2 Senate Laboratories.
              </p>
            </div>
          </div>

          <Link
            to="/subscription"
            className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider shrink-0 shadow-md"
          >
            5,000 💎 Vault →
          </Link>
        </div>
      </main>

      {/* ======================================================== */}
      {/* SHARED FULL-SCREEN LEVEL SIMULATOR + SOLUTION DASHBOARD + AI */}
      {/* ======================================================== */}
      {isSimulatorOpen && activeLevel && (
        <LevelSimulatorWorkspace
          mode="smart"
          levelId={activeLevel.id}
          levelTitle={activeLevel.title}
          subjectLabel={
            subjectMode === 'unmerged' ? activeSingleSubject : activeLevel.subjectTag
          }
          questions={levelQuestions}
          secondsPerQuestion={75}
          isGeneralTest={Boolean(activeLevel.isGeneralTest)}
          onClose={() => setIsSimulatorOpen(false)}
          onProgressUpdated={next => setUserProgress(next)}
        />
      )}

      <JAMBCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}

export default SmartPracticePage;
