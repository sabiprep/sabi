import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  ChartNoAxesCombined,
  Coins,
  Compass,
  Flame,
  Lightbulb,
  Lock,
  Play,
  Sparkles,
  Star,
  Target,
  Trophy,
} from 'lucide-react';
import { useTheme } from '../app/ThemeProvider';
import LevelSimulatorWorkspace from '../components/LevelSimulatorWorkspace';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import {
  getRealUserProgress,
  spendUserDiamonds,
  UserRealProgress,
} from '../utils/userProgressStore';

export interface SmartRoadLevelConfig {
  id: number;
  setNumber: 1 | 2;
  title: string;
  campusZone: string;
  functionDescription: string;
  difficultyMode: 'simple' | 'medium' | 'hard' | 'mixed';
  questionCount: number;
  nodeType: 'desk' | 'library' | 'lab' | 'chest' | 'general_test';
  landmarkSvg?: string;
}

export const SMART_ROAD_LEVELS: SmartRoadLevelConfig[] = [
  // SET 1: CAMPUS FOUNDATION ROAD (LEVELS 1 - 11)
  {
    id: 1,
    setNumber: 1,
    title: 'Diagnostic Weak-Topic Repair',
    campusZone: 'Study Desk Station I',
    functionDescription:
      'Untimed conceptual mastery drill focusing on foundational syllabus topics with full step-by-step KaTeX explanations.',
    difficultyMode: 'simple',
    questionCount: 10,
    nodeType: 'desk',
    landmarkSvg: '/assets/mascots/smart/student_desk_studying.svg',
  },
  {
    id: 2,
    setNumber: 1,
    title: 'Humanities & Lexis Library',
    campusZone: 'Campus Library Landmark',
    functionDescription:
      'Deep comprehension, concord rules, and foundational syllabus principles.',
    difficultyMode: 'simple',
    questionCount: 10,
    nodeType: 'library',
    landmarkSvg: '/assets/environment/campus_library_building.svg',
  },
  {
    id: 3,
    setNumber: 1,
    title: 'Twin Concept Bridge I',
    campusZone: 'Road Signpost Branch',
    functionDescription:
      'Pairs canonical JAMB questions with their Simple & Medium twins for deep conceptual retention.',
    difficultyMode: 'mixed',
    questionCount: 10,
    nodeType: 'desk',
    landmarkSvg: '/assets/environment/road_signpost_branch.svg',
  },
  {
    id: 4,
    setNumber: 1,
    title: 'Campus Treasure Milestone I',
    campusZone: 'Academic Reward Vault',
    functionDescription:
      'Reviews your first three Campus Road stations and reinforces missed concepts.',
    difficultyMode: 'simple',
    questionCount: 10,
    nodeType: 'chest',
    landmarkSvg: '/assets/environment/treasure_chest_closed.svg',
  },
  {
    id: 5,
    setNumber: 1,
    title: 'Science & Quantitative Lab',
    campusZone: 'Campus Lab Building',
    functionDescription:
      'Applied problem-solving with the moveable JAMB CBT Calculator and formula derivations.',
    difficultyMode: 'medium',
    questionCount: 12,
    nodeType: 'lab',
    landmarkSvg: '/assets/environment/campus_lab_building.svg',
  },
  {
    id: 6,
    setNumber: 1,
    title: 'Syllabus Objective Deep-Dive',
    campusZone: 'Study Desk Station II',
    functionDescription:
      'Targets medium-weight JAMB syllabus objectives across your registered subjects.',
    difficultyMode: 'medium',
    questionCount: 12,
    nodeType: 'desk',
    landmarkSvg: '/assets/mascots/smart/desk_calculator_prop.svg',
  },
  {
    id: 7,
    setNumber: 1,
    title: 'Mistake Recovery Clinic',
    campusZone: 'Guided Revision Hub',
    functionDescription:
      'Focuses on high-error syllabus subtopics with Twin 2 medium variations.',
    difficultyMode: 'medium',
    questionCount: 12,
    nodeType: 'library',
  },
  {
    id: 8,
    setNumber: 1,
    title: 'Campus Treasure Milestone II',
    campusZone: 'Mid-Semester Vault',
    functionDescription:
      '15-question untimed mastery checkpoint across all 4 registered UTME subjects.',
    difficultyMode: 'medium',
    questionCount: 15,
    nodeType: 'chest',
    landmarkSvg: '/assets/environment/treasure_chest_closed.svg',
  },
  {
    id: 9,
    setNumber: 1,
    title: 'Advanced Twin Synthesis',
    campusZone: 'Senior Research Wing',
    functionDescription:
      'Hard Twin 3 variations testing multi-step reasoning and calculation accuracy.',
    difficultyMode: 'hard',
    questionCount: 15,
    nodeType: 'lab',
    landmarkSvg: '/assets/mascots/smart/student_desk_celebrating.svg',
  },
  {
    id: 10,
    setNumber: 1,
    title: 'Pre-Senate Readiness Drill',
    campusZone: 'Honours Study Hall',
    functionDescription:
      'Full 15-question synthesis preparing you for the Set 1 Campus General Archway.',
    difficultyMode: 'hard',
    questionCount: 15,
    nodeType: 'desk',
  },
  {
    id: 11,
    setNumber: 1,
    title: 'Set 1 Campus General Test',
    campusZone: 'General Test Archway',
    functionDescription:
      'Official Set 1 Smart Road Boss Assessment! Score ≥70% to unlock Set 2, or 100% Flawless for a +10% Subject Rating boost!',
    difficultyMode: 'mixed',
    questionCount: 15,
    nodeType: 'general_test',
    landmarkSvg: '/assets/environment/general_test_archway.svg',
  },
  // SET 2: DISTINCTION CAMPUS ROAD (LEVELS 12 - 22)
  ...Array.from({ length: 11 }, (_, idx) => {
    const id = idx + 12;
    const isBoss = id === 22;
    const isChest = id === 15 || id === 19;
    return {
      id,
      setNumber: 2 as const,
      title: isBoss
        ? 'Grand Campus Senate Archway'
        : isChest
        ? `Citadel Scholar Vault ${id === 15 ? 'III' : 'IV'}`
        : `Distinction Campus Station ${id - 11}`,
      campusZone: isBoss ? '320+ Chancellor Archway' : 'Set 2 Honours Roadway',
      functionDescription: isBoss
        ? 'Final 15-question Smart Practice certification across your 4 UTME subjects.'
        : 'Advanced Twin 2 & Twin 3 conceptual mastery station with full AI Tutor verification.',
      difficultyMode: (id >= 17 ? 'hard' : 'medium') as 'medium' | 'hard',
      questionCount: 15,
      nodeType: (isBoss ? 'general_test' : isChest ? 'chest' : 'lab') as
        | 'general_test'
        | 'chest'
        | 'lab',
      landmarkSvg: isBoss
        ? '/assets/environment/general_test_archway.svg'
        : isChest
        ? '/assets/environment/treasure_chest_closed.svg'
        : '/assets/environment/campus_lab_building.svg',
    };
  }),
];

const steps = [
  {
    icon: ChartNoAxesCombined,
    title: 'Understand your progress',
    body: 'Sabi tracks your answered questions, flawless levels, and topic mastery to highlight what needs attention.',
  },
  {
    icon: Target,
    title: 'Campus Roadway & Twin Mastery',
    body: 'Progress through 22 structured Campus Stations with Original + Twin questions and zero countdown pressure.',
  },
  {
    icon: Lightbulb,
    title: '100% Flawless Subject Rating Boost',
    body: 'Clear any Smart Road station 100% right without failing a question to boost your official Subject Rating by +10%.',
  },
];

function getCandidateSubjects(): SubjectName[] {
  if (typeof window === 'undefined') {
    return ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
  }
  try {
    const rawV3 = localStorage.getItem('sabi_onboarding_v3_answers');
    const rawV2 = localStorage.getItem('sabi_onboarding_v2_answers');
    const parsed = rawV3 ? JSON.parse(rawV3) : rawV2 ? JSON.parse(rawV2) : null;
    if (Array.isArray(parsed?.chosenSubjects) && parsed.chosenSubjects.length === 4) {
      return parsed.chosenSubjects as SubjectName[];
    }
  } catch {
    // ignore
  }
  return ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
}

export function SmartPracticePage() {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState<UserRealProgress>(() => getRealUserProgress());
  const registeredSubjects = useMemo(() => getCandidateSubjects(), []);

  const [dashboardView, setDashboardView] = useState<'overview' | 'campus_road'>('overview');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL_4');
  const [activeSet, setActiveSet] = useState<1 | 2>(1);
  const [selectedLevelModal, setSelectedLevelModal] = useState<SmartRoadLevelConfig | null>(null);
  const [activePlayingLevel, setActivePlayingLevel] = useState<{
    level: SmartRoadLevelConfig;
    questions: Question[];
  } | null>(null);
  const [unlockNotice, setUnlockNotice] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setProgress(getRealUserProgress());
    window.addEventListener('sabi-progress-updated', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('sabi-progress-updated', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const totalSmartStars = useMemo(() => {
    return Object.values(progress.smartStarsByLevel || {}).reduce((acc, s) => acc + (s || 0), 0);
  }, [progress.smartStarsByLevel]);

  const setLevels = useMemo(
    () => SMART_ROAD_LEVELS.filter(l => l.setNumber === activeSet),
    [activeSet]
  );

  const isSet2Unlocked =
    Boolean(progress.smartSet1GeneralTestPassed) ||
    progress.smartUnlockedLevel >= 12 ||
    progress.subscriptionPlan !== 'free';

  const buildQuestionsForSmartLevel = (level: SmartRoadLevelConfig): Question[] => {
    const pool =
      selectedSubject === 'ALL_4'
        ? SEED_QUESTIONS.filter(q => registeredSubjects.includes(q.subject))
        : SEED_QUESTIONS.filter(q => q.subject === selectedSubject);
    const basePool = pool.length > 0 ? pool : SEED_QUESTIONS;
    const rotated = basePool.map((item, idx) => ({
      item,
      key: ((idx * 11 + level.id * 17) % 101) + Math.random() * 0.2,
    }));
    rotated.sort((a, b) => a.key - b.key);
    const picked = rotated.slice(0, level.questionCount).map(x => x.item);
    while (picked.length < level.questionCount && basePool.length > 0) {
      const src = basePool[picked.length % basePool.length];
      picked.push({ ...src, id: `${src.id}-SMART-${picked.length + 1}` });
    }
    return picked;
  };

  if (activePlayingLevel) {
    const subjectLabel =
      selectedSubject === 'ALL_4' ? registeredSubjects[0] || 'English Language' : selectedSubject;
    return (
      <LevelSimulatorWorkspace
        mode="smart"
        levelId={activePlayingLevel.level.id}
        levelTitle={`Station ${activePlayingLevel.level.id}: ${activePlayingLevel.level.title}`}
        subjectLabel={subjectLabel}
        questions={activePlayingLevel.questions}
        secondsPerQuestion={90}
        isGeneralTest={activePlayingLevel.level.nodeType === 'general_test'}
        onClose={() => setActivePlayingLevel(null)}
        onProgressUpdated={next => setProgress(next)}
      />
    );
  }

  // STAGE 1: OVERVIEW DASHBOARD
  if (dashboardView === 'overview') {
    return (
      <main className="min-h-[100dvh] bg-[var(--sabi-page)] px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/practice"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sabi-muted)] hover:text-[var(--sabi-blue)]"
            >
              ← Back to practice
            </Link>
            <button
              type="button"
              onClick={() => setDashboardView('campus_road')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer"
            >
              Open Campus Road Map →
            </button>
          </div>

          <section className="rounded-[2rem] border border-[var(--sabi-border)] bg-[var(--sabi-surface)] p-6 shadow-sm sm:p-10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--sabi-blue)]">
                <BrainCircuit size={16} /> Adaptive Campus Roadway
              </div>
              <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black">
                Station {progress.smartUnlockedLevel} / 22 Unlocked · ★ {totalSmartStars} Stars
              </span>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-center">
              <div>
                <h1 className="max-w-xl text-3xl font-bold leading-tight text-[var(--sabi-navy)] sm:text-5xl">
                  Your next step, thoughtfully chosen.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--sabi-muted)] sm:text-base">
                  Smart Practice guides you across 22 Campus Study Stations—from the Humanities Library and Science Lab to Twin Concept Bridges and General Archways.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSubject('ALL_4')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                      selectedSubject === 'ALL_4'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    All 4 UTME Subjects
                  </button>
                  {registeredSubjects.map(subj => (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setSelectedSubject(subj)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer ${
                        selectedSubject === subj
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                      }`}
                    >
                      {subj}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setDashboardView('campus_road')}
                  className="sabi-primary-button sabi-focus mt-7 cursor-pointer"
                >
                  <span>Start Smart Practice</span>
                  <ArrowRight size={18} />
                </button>
              </div>

              <div className="rounded-3xl bg-blue-50 p-6 sm:p-7 space-y-4">
                <div className="flex items-center gap-4">
                  <img
                    src="/assets/mascots/smart/student_desk_studying.svg"
                    alt="Smart Student at Desk"
                    className="w-20 h-20 object-contain shrink-0"
                  />
                  <div>
                    <h2 className="text-lg font-bold text-[var(--sabi-navy)]">
                      Smart Desk & Campus Landmarks
                    </h2>
                    <p className="text-xs leading-5 text-slate-600">
                      Deep conceptual practice with KaTeX worked solutions & live AI verification.
                    </p>
                  </div>
                </div>
                <div className="space-y-2.5 pt-2 border-t border-blue-100">
                  {[
                    'Select your Campus Station (1–22)',
                    'Solve 10–15 Original & Twin Questions',
                    'Use the Moveable CBT Calculator & AI Tutor',
                    'Clear 100% Flawless for +10% Subject Rating',
                  ].map((item, i) => (
                    <div className="flex items-center gap-3" key={item}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--sabi-blue)]">
                        {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, body }) => (
              <article className="sabi-card p-5 sm:p-6" key={title}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--sabi-blue)]">
                  <Icon size={21} />
                </span>
                <h2 className="mt-4 font-bold text-[var(--sabi-ink)]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sabi-muted)]">{body}</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    );
  }

  // STAGE 2: SECOND ANIME CAMPUS ROADWAY DASHBOARD
  return (
    <div
      className={`min-h-[100dvh] flex flex-col ${
        isDark ? 'bg-[#070D19] text-slate-100' : 'bg-[#F4F8FF] text-slate-900'
      }`}
    >
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3 ${
          isDark ? 'bg-[#0A1224]/95 border-slate-800' : 'bg-white/95 border-blue-100'
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDashboardView('overview')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Smart Overview</span>
            </button>
            <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black flex items-center gap-1.5">
              <Compass size={14} />
              <span>SMART CAMPUS ROAD</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-700/40 text-amber-800 dark:text-yellow-200 text-xs font-black flex items-center gap-1">
              <Flame size={14} className="text-amber-500" />
              <span>{progress.streakDays}d</span>
            </div>
            <Link
              to="/subscription"
              className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center gap-1"
            >
              <Coins size={14} />
              <span>{progress.diamonds} 💎</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <section className="rounded-3xl bg-gradient-to-r from-[#0A1F66] via-[#0052CC] to-[#0066FF] text-white p-5 sm:p-7 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-blue-950 text-[10px] font-black uppercase tracking-widest">
              CAMPUS ROADWAY · SET {activeSet}
            </span>
            <h1 className="text-xl sm:text-2xl font-black">
              {activeSet === 1
                ? 'Stations 1–11: Campus Library & Science Lab Mastery'
                : 'Stations 12–22: Honours Senate Distinction Road'}
            </h1>
            <p className="text-xs text-blue-100">
              Select any Campus Station below to inspect its function and start your guided session.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSet(1)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer ${
                activeSet === 1 ? 'bg-white text-[#0A1F66]' : 'bg-white/15 text-white'
              }`}
            >
              Set 1 (1–11)
            </button>
            <button
              type="button"
              onClick={() => setActiveSet(2)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer ${
                activeSet === 2 ? 'bg-white text-[#0A1F66]' : 'bg-white/15 text-white'
              }`}
            >
              {!isSet2Unlocked && <Lock size={12} />}
              <span>Set 2 (12–22)</span>
            </button>
          </div>
        </section>

        {/* Campus Stations Grid / Roadway */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {setLevels.map(lvl => {
            const stars = progress.smartStarsByLevel[lvl.id] || 0;
            const isUnlocked =
              lvl.id <= progress.smartUnlockedLevel ||
              (lvl.setNumber === 2 && isSet2Unlocked && lvl.id === 12);

            return (
              <div
                key={lvl.id}
                onClick={() => {
                  sound.playTap();
                  setUnlockNotice(null);
                  setSelectedLevelModal(lvl);
                }}
                className={`p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between gap-4 ${
                  lvl.id === progress.smartUnlockedLevel
                    ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 shadow-md'
                    : isUnlocked
                    ? isDark
                      ? 'bg-slate-900 border-slate-800 hover:border-blue-500'
                      : 'bg-white border-blue-100 hover:border-blue-400 shadow-xs'
                    : isDark
                    ? 'bg-slate-900/50 border-slate-800/70 opacity-75'
                    : 'bg-slate-100/80 border-slate-200 opacity-80'
                }`}
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">
                      Station {lvl.id}
                    </span>
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      {lvl.campusZone}
                    </span>
                  </div>
                  <h3 className="text-base font-black">{lvl.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {lvl.functionDescription}
                  </p>
                  <div className="pt-1 flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3].map(s => (
                        <Star
                          key={s}
                          size={13}
                          className={
                            stars >= s
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300 dark:text-slate-700'
                          }
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-black text-blue-600 dark:text-blue-400">
                      {lvl.questionCount} Questions · {lvl.difficultyMode.toUpperCase()}
                    </span>
                  </div>
                </div>

                {lvl.landmarkSvg ? (
                  <img
                    src={lvl.landmarkSvg}
                    alt={lvl.title}
                    className="w-16 h-16 object-contain shrink-0 drop-shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                    {isUnlocked ? <Sparkles size={22} /> : <Lock size={20} />}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      </main>

      {selectedLevelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-3xl border-2 overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-[#0B1326] border-blue-500 text-white'
                : 'bg-white border-blue-600 text-slate-900'
            }`}
          >
            <div className="px-6 py-5 bg-gradient-to-r from-[#0A1F66] to-[#0066FF] text-white flex items-center justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-blue-950 text-[10px] font-black uppercase">
                  STATION {selectedLevelModal.id} · {selectedLevelModal.campusZone}
                </span>
                <h2 className="text-xl font-black mt-1">{selectedLevelModal.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLevelModal(null)}
                className="px-3 py-1.5 rounded-xl bg-white/15 text-white text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <p className="text-xs sm:text-sm leading-relaxed">
                {selectedLevelModal.functionDescription}
              </p>

              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/40 text-xs font-bold text-amber-900 dark:text-yellow-200">
                <Trophy size={18} className="text-amber-500 shrink-0" />
                <span>
                  Clear all {selectedLevelModal.questionCount} questions 100% right to boost your
                  Subject Rating by +10%!
                </span>
              </div>

              {unlockNotice && (
                <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold">
                  {unlockNotice}
                </div>
              )}

              {selectedLevelModal.id <= progress.smartUnlockedLevel ||
              (selectedLevelModal.setNumber === 2 &&
                isSet2Unlocked &&
                selectedLevelModal.id === 12) ? (
                <button
                  type="button"
                  onClick={() => {
                    const qs = buildQuestionsForSmartLevel(selectedLevelModal);
                    setSelectedLevelModal(null);
                    setActivePlayingLevel({ level: selectedLevelModal, questions: qs });
                  }}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play size={16} className="fill-current" />
                  <span>
                    Start Station {selectedLevelModal.id} ({selectedLevelModal.questionCount}Q) →
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const res = spendUserDiamonds(50);
                    if (!res.success) {
                      setUnlockNotice(
                        'You need 50 💎 Diamonds to fast-unlock this station, or clear the previous station for free.'
                      );
                      return;
                    }
                    const qs = buildQuestionsForSmartLevel(selectedLevelModal);
                    setSelectedLevelModal(null);
                    setActivePlayingLevel({ level: selectedLevelModal, questions: qs });
                  }}
                  className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                >
                  Unlock Station {selectedLevelModal.id} with 50 💎
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SmartPracticePage;
