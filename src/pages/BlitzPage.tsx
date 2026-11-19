import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Brain,
  CheckCircle2,
  Clock,
  Coins,
  Crown,
  Flame,
  Lightbulb,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
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

export interface BlitzLevelConfig {
  id: number;
  setNumber: 1 | 2;
  title: string;
  subtitle: string;
  functionDescription: string;
  difficultyMode: 'simple' | 'medium' | 'hard' | 'mixed';
  questionCount: number;
  secondsPerQuestion: number;
  nodeType: 'lesson' | 'sprint' | 'twin' | 'chest' | 'general_test';
  zigZagOffset: string; // Tailwind horizontal offset for Duolingo Z-trail
  mascotCompanion?: {
    src: string;
    name: string;
    caption: string;
    side: 'left' | 'right';
  };
}

export const BLITZ_LEVELS: BlitzLevelConfig[] = [
  // ================= SET 1: LEVELS 1 - 11 (FOUNDATION & SPEED CITADEL) =================
  {
    id: 1,
    setNumber: 1,
    title: 'Foundation Warmup',
    subtitle: 'Original + Simple Twin Concepts',
    functionDescription:
      'Builds baseline recall across core JAMB syllabus definitions with 60s per question and immediate step-by-step solutions.',
    difficultyMode: 'simple',
    questionCount: 10,
    secondsPerQuestion: 60,
    nodeType: 'lesson',
    zigZagOffset: 'translate-x-0',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_idle.svg',
      name: 'Sabi Eagle Guardian',
      caption: 'Clear 10/10 Flawless for +10% Subject Rating!',
      side: 'right',
    },
  },
  {
    id: 2,
    setNumber: 1,
    title: 'Core Syllabus Drill',
    subtitle: 'High-Frequency Principles',
    functionDescription:
      'Targets fundamental laws, grammar concord, and essential formulas tested every year in UTME.',
    difficultyMode: 'simple',
    questionCount: 10,
    secondsPerQuestion: 60,
    nodeType: 'lesson',
    zigZagOffset: '-translate-x-12 sm:-translate-x-20',
  },
  {
    id: 3,
    setNumber: 1,
    title: 'Twin Concept Practice',
    subtitle: 'Original & Twin 1 Variations',
    functionDescription:
      'Pairs canonical JAMB questions with their Simple & Medium twins so you master the underlying concept, not just memorize answers.',
    difficultyMode: 'mixed',
    questionCount: 10,
    secondsPerQuestion: 60,
    nodeType: 'twin',
    zigZagOffset: '-translate-x-20 sm:-translate-x-32',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_flying_speed.svg',
      name: 'Eagle Speed Dive',
      caption: 'Spot the twin concept pattern!',
      side: 'right',
    },
  },
  {
    id: 4,
    setNumber: 1,
    title: 'Treasure Chest Milestone I',
    subtitle: 'Unit 1 Mastery Vault',
    functionDescription:
      'Milestone checkpoint! Synthesizes Levels 1–3 and awards bonus streak progress when cleared.',
    difficultyMode: 'simple',
    questionCount: 10,
    secondsPerQuestion: 60,
    nodeType: 'chest',
    zigZagOffset: '-translate-x-8 sm:-translate-x-14',
  },
  {
    id: 5,
    setNumber: 1,
    title: 'Reflex & Accuracy Sprint',
    subtitle: '45-Second Pacing Drill',
    functionDescription:
      'Trains exam clock discipline with 45 seconds per question across medium-difficulty syllabus topics.',
    difficultyMode: 'medium',
    questionCount: 12,
    secondsPerQuestion: 45,
    nodeType: 'sprint',
    zigZagOffset: 'translate-x-10 sm:translate-x-16',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_cheering_stars.svg',
      name: '3-Star Eagle Crown',
      caption: 'Keep your streak burning!',
      side: 'left',
    },
  },
  {
    id: 6,
    setNumber: 1,
    title: 'Canonical Past Classics',
    subtitle: 'Authentic UTME Archives',
    functionDescription:
      'Curated original JAMB past questions from high-weight syllabus sections.',
    difficultyMode: 'medium',
    questionCount: 12,
    secondsPerQuestion: 60,
    nodeType: 'lesson',
    zigZagOffset: 'translate-x-20 sm:translate-x-32',
  },
  {
    id: 7,
    setNumber: 1,
    title: 'Exam Trap Eliminator',
    subtitle: 'Twin 2 Medium Variations',
    functionDescription:
      'Exposes the most common JAMB distractor traps and teaches you how to eliminate wrong options fast.',
    difficultyMode: 'medium',
    questionCount: 12,
    secondsPerQuestion: 60,
    nodeType: 'twin',
    zigZagOffset: 'translate-x-8 sm:translate-x-12',
  },
  {
    id: 8,
    setNumber: 1,
    title: 'Treasure Chest Milestone II',
    subtitle: '15-Question Endurance Vault',
    functionDescription:
      'Second Treasure Chest milestone! Full 15-question drill testing retention across multiple topics.',
    difficultyMode: 'medium',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'chest',
    zigZagOffset: '-translate-x-10 sm:-translate-x-16',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_sleeping_locked.svg',
      name: 'Gatekeeper Eagle',
      caption: 'Unlock the final 300+ climb!',
      side: 'right',
    },
  },
  {
    id: 9,
    setNumber: 1,
    title: '300+ Distinction Challenge',
    subtitle: 'Twin 3 Hard Variations',
    functionDescription:
      'Multi-step calculations, deep comprehension inference, and hard twin variations for 300+ scorers.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'twin',
    zigZagOffset: '-translate-x-20 sm:-translate-x-28',
  },
  {
    id: 10,
    setNumber: 1,
    title: 'Pre-Archway Boss Review',
    subtitle: 'Full Syllabus Synthesis',
    functionDescription:
      'High-intensity 15-question synthesis preparing you for the Set 1 General Mastery Archway.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 50,
    nodeType: 'sprint',
    zigZagOffset: '-translate-x-8 sm:-translate-x-12',
  },
  {
    id: 11,
    setNumber: 1,
    title: 'Set 1 General Mastery Test',
    subtitle: 'Boss Archway · ≥70% Unlocks Set 2',
    functionDescription:
      'Official Set 1 Boss Examination! Score at least 70% to pass the Set 1 Archway, or score 100% Flawless for a +10% Subject Rating boost & +10 Streak Bonus Diamonds.',
    difficultyMode: 'mixed',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'general_test',
    zigZagOffset: 'translate-x-0',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_cheering_stars.svg',
      name: 'Archway Champion Eagle',
      caption: 'Pass ≥70% to conquer Set 1!',
      side: 'right',
    },
  },

  // ================= SET 2: LEVELS 12 - 22 (ADVANCED CITADEL MASTERY) =================
  {
    id: 12,
    setNumber: 2,
    title: 'Citadel Phase II Kickoff',
    subtitle: 'Advanced Syllabus Twins',
    functionDescription:
      'Enters Set 2 advanced territory with 15 rigorous questions blending medium and hard twin variations.',
    difficultyMode: 'medium',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'lesson',
    zigZagOffset: 'translate-x-0',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_idle.svg',
      name: 'Citadel Eagle',
      caption: 'Welcome to Set 2 Mastery!',
      side: 'left',
    },
  },
  {
    id: 13,
    setNumber: 2,
    title: 'Quantitative & Logic Mastery',
    subtitle: 'Multi-Step Problem Solving',
    functionDescription:
      'Focuses on multi-step analytical and structural problems across your registered UTME combination.',
    difficultyMode: 'medium',
    questionCount: 15,
    secondsPerQuestion: 55,
    nodeType: 'twin',
    zigZagOffset: 'translate-x-12 sm:translate-x-20',
  },
  {
    id: 14,
    setNumber: 2,
    title: 'High-Speed Precision Drill',
    subtitle: '45s Rapid Twin Reinforcement',
    functionDescription:
      'Sharpens instant recognition of twin question variations under strict 45-second intervals.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 45,
    nodeType: 'sprint',
    zigZagOffset: 'translate-x-20 sm:translate-x-32',
  },
  {
    id: 15,
    setNumber: 2,
    title: 'Treasure Chest Milestone III',
    subtitle: 'Citadel Mid-Set Vault',
    functionDescription:
      'Set 2 Treasure Chest checkpoint! Reviews tough concepts from Levels 12–14.',
    difficultyMode: 'medium',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'chest',
    zigZagOffset: 'translate-x-8 sm:translate-x-12',
  },
  {
    id: 16,
    setNumber: 2,
    title: 'Distinction Twin Gauntlet',
    subtitle: 'Hard Twin 3 Deep Dive',
    functionDescription:
      'Every question is selected from challenging syllabus objectives that separate 250 from 330+ scores.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'twin',
    zigZagOffset: '-translate-x-10 sm:-translate-x-18',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_flying_speed.svg',
      name: 'Supersonic Eagle',
      caption: '320+ UTME pace activated!',
      side: 'right',
    },
  },
  {
    id: 17,
    setNumber: 2,
    title: 'Cross-Topic Synthesis',
    subtitle: 'Integrated Syllabus Links',
    functionDescription:
      'Connects related topics across years so you never get caught off-guard by hybrid JAMB questions.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 50,
    nodeType: 'lesson',
    zigZagOffset: '-translate-x-20 sm:-translate-x-30',
  },
  {
    id: 18,
    setNumber: 2,
    title: 'Zero-Error Precision Run',
    subtitle: '100% Flawless Rating Target',
    functionDescription:
      'Designed specifically to test 100% accuracy under calm, deliberate verification.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'twin',
    zigZagOffset: '-translate-x-8 sm:-translate-x-12',
  },
  {
    id: 19,
    setNumber: 2,
    title: 'Treasure Chest Milestone IV',
    subtitle: 'Elite Scholar Vault',
    functionDescription:
      'Final Treasure Chest before the Grand Boss Archway! Locks in high-difficulty retention.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'chest',
    zigZagOffset: 'translate-x-10 sm:translate-x-16',
  },
  {
    id: 20,
    setNumber: 2,
    title: '40-Second Lightning Finale',
    subtitle: 'Maximum Reflex Calibration',
    functionDescription:
      'Fastest paced level on the Blitz trail—40 seconds per question across 15 tough questions.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 40,
    nodeType: 'sprint',
    zigZagOffset: 'translate-x-18 sm:translate-x-26',
  },
  {
    id: 21,
    setNumber: 2,
    title: 'Pre-Citadel Grand Review',
    subtitle: 'Complete 4-Subject Dress Rehearsal',
    functionDescription:
      'Final 15-question dress rehearsal before the Level 22 Grand Citadel Boss Archway.',
    difficultyMode: 'mixed',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'lesson',
    zigZagOffset: 'translate-x-8 sm:translate-x-10',
  },
  {
    id: 22,
    setNumber: 2,
    title: 'Grand Citadel Boss Archway',
    subtitle: 'Ultimate Blitz Mastery Certification',
    functionDescription:
      'The pinnacle of SABI Blitz! 15 elite UTME questions. Clear 100% Flawless to crown your Subject Rating and complete the Blitz Z-Trail.',
    difficultyMode: 'hard',
    questionCount: 15,
    secondsPerQuestion: 60,
    nodeType: 'general_test',
    zigZagOffset: 'translate-x-0',
    mascotCompanion: {
      src: '/assets/mascots/blitz/eagle_cheering_stars.svg',
      name: 'Grand Citadel Eagle',
      caption: 'Conquer Level 22 for Ultimate Mastery!',
      side: 'left',
    },
  },
];

const principles = [
  {
    icon: Brain,
    title: 'Original + Twin Question Architecture',
    body: 'Every level blends canonical JAMB past questions with Simple, Medium, and Hard concept twins so you build true mastery.',
  },
  {
    icon: Lightbulb,
    title: 'Learn from Every Answer + AI Verify',
    body: 'Submit each question to inspect step-by-step KaTeX solutions, Pidgin breakdowns, and live SABI AI Tutor verification.',
  },
  {
    icon: Target,
    title: '100% Flawless Subject Rating Boost',
    body: 'Clear any level 100% right without failing a single question to boost your official Subject Rating by +10% and earn Streak Bonus Diamonds.',
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
    // ignore parse errors
  }
  return ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
}

function buildQuestionsForBlitzLevel(
  level: BlitzLevelConfig,
  selectedSubject: string,
  registeredSubjects: SubjectName[]
): Question[] {
  // 1. Filter by chosen subject or candidate's 4 registered UTME subjects
  const subjectPool =
    selectedSubject === 'ALL_4'
      ? SEED_QUESTIONS.filter(q => registeredSubjects.includes(q.subject))
      : SEED_QUESTIONS.filter(q => q.subject === selectedSubject);

  const basePool = subjectPool.length > 0 ? subjectPool : SEED_QUESTIONS;

  // 2. Prioritize matching difficulty mode ('simple' -> 'easy', 'medium' -> 'medium', 'hard' -> 'hard')
  const targetDifficulty =
    level.difficultyMode === 'simple'
      ? 'easy'
      : level.difficultyMode === 'medium'
      ? 'medium'
      : level.difficultyMode === 'hard'
      ? 'hard'
      : null;

  const primaryMatches = targetDifficulty
    ? basePool.filter(q => q.difficulty === targetDifficulty)
    : basePool;
  const secondaryMatches = targetDifficulty
    ? basePool.filter(q => q.difficulty !== targetDifficulty)
    : [];

  // Deterministic-yet-varied shuffle seeded by level.id
  const combined = [...primaryMatches, ...secondaryMatches];
  const rotated = combined.map((item, idx) => ({
    item,
    sortKey: ((idx * 7 + level.id * 13) % 97) + Math.random() * 0.25,
  }));
  rotated.sort((a, b) => a.sortKey - b.sortKey);

  const picked = rotated.slice(0, level.questionCount).map(entry => entry.item);

  // If pool has fewer than questionCount (e.g. single subject with 15 questions), cycle cleanly
  while (picked.length < level.questionCount && basePool.length > 0) {
    const source = basePool[picked.length % basePool.length];
    picked.push({
      ...source,
      id: `${source.id}-TWIN-${picked.length + 1}`,
    });
  }

  return picked;
}

export function BlitzPage() {
  const { isDark } = useTheme();
  const [progress, setProgress] = useState<UserRealProgress>(() => getRealUserProgress());
  const registeredSubjects = useMemo(() => getCandidateSubjects(), []);

  // Stage 1 = First Blitz Overview Dashboard; Stage 2 = Second Anime / Duolingo Z-Trail Dashboard
  const [dashboardView, setDashboardView] = useState<'overview' | 'anime_trail'>('overview');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL_4');
  const [activeSet, setActiveSet] = useState<1 | 2>(1);
  const [selectedLevelModal, setSelectedLevelModal] = useState<BlitzLevelConfig | null>(null);
  const [activePlayingLevel, setActivePlayingLevel] = useState<{
    level: BlitzLevelConfig;
    questions: Question[];
  } | null>(null);
  const [soundOn, setSoundOn] = useState(true);
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

  const totalStarsEarned = useMemo(() => {
    return Object.values(progress.blitzStarsByLevel || {}).reduce((acc, s) => acc + (s || 0), 0);
  }, [progress.blitzStarsByLevel]);

  const setLevels = useMemo(
    () => BLITZ_LEVELS.filter(lvl => lvl.setNumber === activeSet),
    [activeSet]
  );

  const isSet2Unlocked =
    Boolean(progress.blitzSet1GeneralTestPassed) ||
    progress.blitzUnlockedLevel >= 12 ||
    progress.subscriptionPlan !== 'free';

  const handleOpenAnimeTrail = () => {
    if (soundOn) sound.playTap();
    setDashboardView('anime_trail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectLevelNode = (level: BlitzLevelConfig) => {
    if (soundOn) sound.playTap();
    setUnlockNotice(null);
    setSelectedLevelModal(level);
  };

  const handleStartLevelSession = (level: BlitzLevelConfig) => {
    const isUnlocked =
      level.id <= progress.blitzUnlockedLevel ||
      (level.setNumber === 2 && isSet2Unlocked && level.id === 12);

    if (!isUnlocked) {
      setUnlockNotice(
        `Complete Level ${level.id - 1} first (or unlock with Streak Bonus / Vault Diamonds) to play Level ${level.id}.`
      );
      return;
    }

    if (soundOn) sound.playTap();
    const levelQuestions = buildQuestionsForBlitzLevel(level, selectedSubject, registeredSubjects);
    setSelectedLevelModal(null);
    setActivePlayingLevel({
      level,
      questions: levelQuestions,
    });
  };

  const handleUnlockWithDiamonds = (level: BlitzLevelConfig) => {
    const cost = 50;
    const result = spendUserDiamonds(cost);
    if (!result.success) {
      setUnlockNotice(
        `You need ${cost} 💎 Diamonds to fast-unlock Level ${level.id}. Earn free Streak Bonus Diamonds by clearing levels 100% flawless, or visit the 5,000 💎 Vault.`
      );
      return;
    }
    if (soundOn) sound.playLevelUp();
    const levelQuestions = buildQuestionsForBlitzLevel(level, selectedSubject, registeredSubjects);
    setSelectedLevelModal(null);
    setActivePlayingLevel({
      level,
      questions: levelQuestions,
    });
  };

  // ============================================================================
  // ACTIVE FULL-SCREEN LEVEL SIMULATOR WORKSPACE (10 OR 15 QUESTIONS + SOLUTIONS)
  // ============================================================================
  if (activePlayingLevel) {
    const subjectLabel =
      selectedSubject === 'ALL_4' ? registeredSubjects[0] || 'English Language' : selectedSubject;
    return (
      <LevelSimulatorWorkspace
        mode="blitz"
        levelId={activePlayingLevel.level.id}
        levelTitle={`Level ${activePlayingLevel.level.id}: ${activePlayingLevel.level.title}`}
        subjectLabel={subjectLabel}
        questions={activePlayingLevel.questions}
        secondsPerQuestion={activePlayingLevel.level.secondsPerQuestion}
        isGeneralTest={activePlayingLevel.level.nodeType === 'general_test'}
        onClose={() => setActivePlayingLevel(null)}
        onProgressUpdated={next => setProgress(next)}
      />
    );
  }

  // ============================================================================
  // STAGE 1: FIRST BLITZ OVERVIEW DASHBOARD
  // ============================================================================
  if (dashboardView === 'overview') {
    return (
      <main className="min-h-[100dvh] bg-[var(--sabi-page)] px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Top Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/practice"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sabi-muted)] hover:text-[var(--sabi-blue)]"
            >
              ← Back to practice
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/40 text-xs font-black text-amber-800 dark:text-yellow-200">
                <Flame size={14} className="text-amber-500" />
                <span>{progress.streakDays}d Streak</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-black text-blue-700 dark:text-blue-300">
                <Coins size={14} />
                <span>{progress.diamonds} 💎</span>
              </div>
              <button
                type="button"
                onClick={handleOpenAnimeTrail}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Open Anime Z-Trail Map →
              </button>
            </div>
          </div>

          {/* Stage 1 Hero Banner */}
          <section className="overflow-hidden rounded-[2rem] bg-[var(--sabi-navy)] p-6 text-white sm:p-10 shadow-xl border border-blue-800/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-200">
                <Zap size={15} className="text-yellow-300" /> Sabi Blitz · 2-Stage Anime Mastery Trail
              </div>
              <span className="px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-bold text-yellow-200">
                Level {progress.blitzUnlockedLevel} / 22 Unlocked · ★ {totalStarsEarned} Stars
              </span>
            </div>

            <div className="mt-8 grid gap-8 md:grid-cols-[1.25fr_.75fr] md:items-center">
              <div>
                <p className="text-sm font-semibold text-yellow-200">
                  Small steps. Original + Twin questions. Stronger understanding.
                </p>
                <h1 className="mt-3 max-w-xl text-3xl font-bold leading-tight sm:text-5xl">
                  Blitz practice that helps you remember.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">
                  Enter the Duolingo-inspired SABI Eagle Z-Trail across 22 levels (Set 1 & Set 2). Each level has a dedicated function—from Simple Foundation drills and Twin variations to Treasure Chests and Boss General Tests.
                </p>

                {/* Subject Filter Pills before launching Stage 2 */}
                <div className="mt-6 space-y-2">
                  <span className="text-[11px] font-black uppercase tracking-widest text-blue-200 block">
                    Select Subject Focus for Your Blitz Trail:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedSubject('ALL_4')}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer ${
                        selectedSubject === 'ALL_4'
                          ? 'bg-white text-[var(--sabi-navy)] shadow-md'
                          : 'bg-white/10 text-blue-100 hover:bg-white/20 border border-white/15'
                      }`}
                    >
                      ⚡ All 4 Registered Subjects
                    </button>
                    {registeredSubjects.map(subj => (
                      <button
                        key={subj}
                        type="button"
                        onClick={() => setSelectedSubject(subj)}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                          selectedSubject === subj
                            ? 'bg-white text-[var(--sabi-navy)] shadow-md'
                            : 'bg-white/10 text-blue-100 hover:bg-white/20 border border-white/15'
                        }`}
                      >
                        {subj}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary CTA: Opens Stage 2 Anime Duolingo Dashboard */}
                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleOpenAnimeTrail}
                    className="sabi-primary-button sabi-focus !border-yellow-300 !bg-yellow-300 !text-[var(--sabi-navy)] hover:!bg-yellow-200 font-black px-7 py-4 text-sm sm:text-base cursor-pointer shadow-lg"
                  >
                    <span>Start Blitz</span>
                    <ArrowRight size={18} />
                  </button>
                  <span className="text-xs font-semibold text-blue-200">
                    Opens the 22-Level Sabi Eagle Z-Trail Map
                  </span>
                </div>
              </div>

              {/* Right Preview Card with Sabi Eagle Mascot & Learning Loop */}
              <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xs space-y-5">
                <div className="flex items-center gap-4">
                  <img
                    src="/assets/mascots/blitz/eagle_idle.svg"
                    alt="Sabi Eagle Guardian"
                    className="w-20 h-20 object-contain drop-shadow-lg shrink-0"
                  />
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-yellow-200">
                      Sabi Eagle Z-Trail Companion
                    </div>
                    <h2 className="text-lg font-black text-white mt-0.5">
                      2 Sets · 22 Functional Levels
                    </h2>
                    <p className="text-xs text-blue-100 mt-1">
                      10–15 questions per level with instant KaTeX solutions & AI verification.
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-white/15">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-200">
                    The Blitz Level Loop
                  </div>
                  {[
                    'Pick your active Z-Trail Level (1–22)',
                    'Solve 10–15 Original & Twin Questions',
                    'Submit Question → View Solution or AI Verify',
                    'Final Submit → Full Worked Solution Dashboard',
                    '100% Flawless Clear = +10% Subject Rating Boost!',
                  ].map((step, i) => (
                    <div key={step} className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                        {i + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold">{step}</span>
                      <CheckCircle2 className="ml-auto text-yellow-200 shrink-0" size={15} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 3 Principles Cards */}
          <section className="grid gap-4 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, body }) => (
              <article key={title} className="sabi-card p-5 sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--sabi-blue)]">
                  <Icon size={21} />
                </span>
                <h2 className="mt-4 text-base font-bold text-[var(--sabi-ink)]">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--sabi-muted)]">{body}</p>
              </article>
            ))}
          </section>
        </div>
      </main>
    );
  }

  // ============================================================================
  // STAGE 2: SECOND ANIME / DUOLINGO Z-TRAIL LEVEL MAP DASHBOARD
  // ============================================================================
  const currentActiveLevelConfig =
    BLITZ_LEVELS.find(l => l.id === progress.blitzUnlockedLevel) || BLITZ_LEVELS[0];

  return (
    <div
      className={`min-h-[100dvh] flex flex-col transition-colors ${
        isDark ? 'bg-[#070D19] text-slate-100' : 'bg-[#F4F8FF] text-slate-900'
      }`}
    >
      {/* Top Sticky Duolingo-Style HUD Bar */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md px-4 sm:px-8 py-3 ${
          isDark ? 'bg-[#0A1224]/95 border-slate-800' : 'bg-white/95 border-blue-100 shadow-xs'
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setDashboardView('overview')}
              className={`px-3 py-1.5 rounded-xl border text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-200 hover:border-blue-500'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <ArrowLeft size={14} />
              <span>Blitz Overview</span>
            </button>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-black">
              <Zap size={14} className="text-yellow-200" />
              <span>SABI BLITZ TRAIL</span>
            </div>
          </div>

          {/* Right HUD Counters: Streak, Diamonds, Stars, Sound */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-700/40 text-amber-800 dark:text-yellow-200 text-xs font-black"
              title="Daily Study Streak"
            >
              <Flame size={14} className="text-amber-500" />
              <span>{progress.streakDays}</span>
            </div>

            <Link
              to="/subscription"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 text-xs font-black"
              title="Streak Bonus + Vault Diamonds"
            >
              <Coins size={14} />
              <span>{progress.diamonds} 💎</span>
            </Link>

            <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black text-amber-600 dark:text-yellow-300">
              <Star size={14} className="fill-current" />
              <span>{totalStarsEarned} / 66</span>
            </div>

            <button
              type="button"
              onClick={() => setSoundOn(prev => !prev)}
              className={`p-2 rounded-xl border cursor-pointer ${
                isDark
                  ? 'border-slate-800 bg-slate-900 text-slate-300'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
              title={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Duolingo Z-Trail Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Duolingo-Style Unit Header Banner (Blue Primary + Crisp White + Soft Light Yellow Accent) */}
        <section className="rounded-3xl bg-gradient-to-r from-[#0A1F66] via-[#0052CC] to-[#0066FF] text-white p-5 sm:p-7 shadow-xl border-b-4 border-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-blue-950 text-[10px] font-black uppercase tracking-widest">
                SECTION {activeSet}, UNIT {activeSet === 1 ? '1 · FOUNDATION & SPEED' : '2 · 300+ CITADEL'}
              </span>
              <span className="text-xs font-bold text-blue-100">
                • {selectedSubject === 'ALL_4' ? 'All 4 UTME Subjects' : selectedSubject}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {activeSet === 1
                ? 'Levels 1–11: Original & Twin Concept Mastery'
                : 'Levels 12–22: Advanced 300+ Distinction Trail'}
            </h1>
            <p className="text-xs text-blue-100 max-w-xl">
              Tap any unlocked node below to view its function and start its 10–15 question drill. Clear a level 100% right to boost your Subject Rating by +10%!
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleSelectLevelNode(currentActiveLevelConfig)}
            className="px-4 py-3 rounded-2xl bg-white hover:bg-blue-50 text-[#0A1F66] font-black text-xs uppercase tracking-wider flex items-center gap-2 shrink-0 shadow-md cursor-pointer"
          >
            <Play size={15} className="fill-current text-blue-600" />
            <span>Play Level {currentActiveLevelConfig.id}</span>
          </button>
        </section>

        {/* Subject & Set Selector Bar */}
        <section
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-blue-100 shadow-xs'
          }`}
        >
          {/* Subject Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedSubject('ALL_4')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition cursor-pointer ${
                selectedSubject === 'ALL_4'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
              }`}
            >
              All 4 Subjects
            </button>
            {registeredSubjects.map(subj => (
              <button
                key={subj}
                type="button"
                onClick={() => setSelectedSubject(subj)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  selectedSubject === subj
                    ? 'bg-blue-600 text-white shadow-xs'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50'
                }`}
              >
                {subj.replace(' Language', '')}
              </button>
            ))}
          </div>

          {/* Set 1 (Levels 1-11) vs Set 2 (Levels 12-22) Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveSet(1)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                activeSet === 1
                  ? 'bg-[#0A1F66] text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              Set 1 (Lv 1–11)
            </button>
            <button
              type="button"
              onClick={() => setActiveSet(2)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                activeSet === 2
                  ? 'bg-[#0A1F66] text-white'
                  : isDark
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {!isSet2Unlocked && <Lock size={12} />}
              <span>Set 2 (Lv 12–22)</span>
            </button>
          </div>
        </section>

        {/* Set 2 Gatekeeper Banner if viewing Set 2 before passing Level 11 */}
        {activeSet === 2 && !isSet2Unlocked && (
          <section
            className={`rounded-3xl border-2 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5 ${
              isDark
                ? 'bg-slate-900/95 border-blue-800/60'
                : 'bg-blue-50/70 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-4">
              <img
                src="/assets/environment/locked_gatekeeper.svg"
                alt="Locked Gatekeeper"
                className="w-20 h-20 object-contain shrink-0"
              />
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-blue-950 text-[10px] font-black uppercase tracking-wider">
                  Set 2 Citadel Gatekeeper
                </span>
                <h2 className="text-base sm:text-lg font-black">
                  Pass Level 11 General Mastery Test (≥70%) to Unlock Set 2 Free
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                  Complete Set 1’s Boss Archway at Level 11 with at least 70% accuracy, or unlock individual levels anytime using your Streak Bonus Diamonds or 5,000 💎 Vault Pass.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveSet(1);
                handleSelectLevelNode(BLITZ_LEVELS[10]);
              }}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
            >
              Go to Level 11 Boss →
            </button>
          </section>
        )}

        {/* ==================================================================== */}
        {/* THE DUOLINGO-STYLE WINDING Z-TRAIL LEVEL NODES & ANIME MASCOTS       */}
        {/* ==================================================================== */}
        <section
          className={`relative rounded-[2.5rem] border py-10 px-4 sm:px-10 overflow-hidden ${
            isDark
              ? 'bg-gradient-to-b from-[#0A1328] via-[#080E1E] to-[#0A1328] border-slate-800'
              : 'bg-gradient-to-b from-white via-[#F8FAFF] to-white border-blue-100 shadow-sm'
          }`}
        >
          {/* Subtle Dot Grid Texture */}
          <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(#0066FF_1.5px,transparent_1.5px)] [background-size:24px_24px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center space-y-9">
            {setLevels.map((lvl, idx) => {
              const stars = progress.blitzStarsByLevel[lvl.id] || 0;
              const isCompleted = stars > 0 || lvl.id < progress.blitzUnlockedLevel;
              const isCurrent =
                lvl.id === progress.blitzUnlockedLevel ||
                (lvl.id === 12 && isSet2Unlocked && progress.blitzUnlockedLevel < 12);
              const isUnlocked = isCompleted || isCurrent;

              const isChest = lvl.nodeType === 'chest';
              const isGeneralTest = lvl.nodeType === 'general_test';

              return (
                <div
                  key={lvl.id}
                  className="relative w-full max-w-xl flex flex-col items-center"
                >
                  {/* Vertical Trail Connector Line from Previous Node */}
                  {idx > 0 && (
                    <div
                      className={`w-1.5 h-8 -mt-8 mb-1 rounded-full ${
                        isUnlocked
                          ? 'bg-blue-500'
                          : isDark
                          ? 'bg-slate-800'
                          : 'bg-slate-200'
                      }`}
                    />
                  )}

                  {/* Row Container with Z-Trail Horizontal Offset + Mascot Companion */}
                  <div className="relative flex items-center justify-center w-full">
                    {/* Left-side Anime Mascot Companion (if configured on left) */}
                    {lvl.mascotCompanion && lvl.mascotCompanion.side === 'left' && (
                      <div className="hidden sm:flex flex-col items-center mr-6 w-36 text-center animate-fade-in">
                        <div className="relative group">
                          <img
                            src={lvl.mascotCompanion.src}
                            alt={lvl.mascotCompanion.name}
                            className="w-24 h-24 object-contain drop-shadow-xl transition-transform group-hover:scale-105"
                          />
                        </div>
                        <div className="mt-1 flex items-center gap-0.5 text-yellow-400">
                          {[1, 2, 3].map(s => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                stars >= s
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-400 dark:text-slate-600'
                              }
                            />
                          ))}
                        </div>
                        <span
                          className={`mt-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border leading-tight ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-700 text-blue-200'
                              : 'bg-blue-50 border-blue-200 text-blue-900'
                          }`}
                        >
                          {lvl.mascotCompanion.caption}
                        </span>
                      </div>
                    )}

                    {/* The Tactile 3D Level Node Button */}
                    <div
                      className={`flex flex-col items-center transition-transform ${lvl.zigZagOffset}`}
                    >
                      {/* Floating "START" Pill above Current Active Level (Duolingo style) */}
                      {isCurrent && (
                        <div className="mb-2 px-3.5 py-1 rounded-full bg-yellow-100 border-2 border-yellow-300 text-blue-950 font-black text-[11px] uppercase tracking-wider shadow-md animate-bounce">
                          ★ START LV {lvl.id}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleSelectLevelNode(lvl)}
                        className={`group relative flex flex-col items-center justify-center transition-all cursor-pointer focus:outline-hidden ${
                          isGeneralTest
                            ? 'w-28 h-28 sm:w-32 sm:h-32 rounded-3xl'
                            : isChest
                            ? 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl'
                            : 'w-20 h-20 sm:w-24 sm:h-24 rounded-full'
                        } ${
                          isCurrent
                            ? 'bg-gradient-to-b from-blue-500 to-blue-700 text-white border-4 border-yellow-300 shadow-[0_8px_0_#1E3A8A,0_16px_28px_rgba(0,102,255,0.38)] hover:translate-y-0.5'
                            : isCompleted
                            ? 'bg-gradient-to-b from-blue-600 to-[#0A1F66] text-white border-4 border-blue-300 shadow-[0_6px_0_#0F172A] hover:translate-y-0.5'
                            : isDark
                            ? 'bg-slate-800/90 text-slate-400 border-4 border-slate-700 shadow-[0_6px_0_#020617] hover:border-slate-600'
                            : 'bg-slate-100 text-slate-400 border-4 border-slate-300 shadow-[0_6px_0_#CBD5E1] hover:border-blue-300'
                        }`}
                        aria-label={`Level ${lvl.id}: ${lvl.title}`}
                      >
                        {isChest ? (
                          <img
                            src={
                              isCompleted
                                ? '/assets/environment/treasure_chest_open.svg'
                                : '/assets/environment/treasure_chest_closed.svg'
                            }
                            alt={lvl.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                          />
                        ) : isGeneralTest ? (
                          <img
                            src="/assets/environment/general_test_archway.svg"
                            alt={lvl.title}
                            className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-md group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <>
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                              LV {lvl.id}
                            </span>
                            <span className="mt-0.5">
                              {!isUnlocked ? (
                                <Lock size={22} />
                              ) : lvl.nodeType === 'sprint' ? (
                                <Zap size={24} className="text-yellow-200 fill-current" />
                              ) : lvl.nodeType === 'twin' ? (
                                <Sparkles size={22} className="text-yellow-200" />
                              ) : (
                                <Star size={24} className="text-yellow-200 fill-current" />
                              )}
                            </span>
                          </>
                        )}
                      </button>

                      {/* 3-Star Rating Row & Level Label Underneath Node */}
                      <div className="mt-2.5 flex flex-col items-center text-center max-w-[200px]">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3].map(starIdx => (
                            <Star
                              key={starIdx}
                              size={14}
                              className={
                                stars >= starIdx
                                  ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                                  : isDark
                                  ? 'text-slate-700'
                                  : 'text-slate-300'
                              }
                            />
                          ))}
                        </div>
                        <span className="mt-1 text-xs sm:text-sm font-black leading-tight">
                          {lvl.id}. {lvl.title}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {lvl.questionCount}Q · {lvl.difficultyMode.toUpperCase()} · {lvl.secondsPerQuestion}s
                        </span>
                      </div>
                    </div>

                    {/* Right-side Anime Mascot Companion (if configured on right) */}
                    {lvl.mascotCompanion && lvl.mascotCompanion.side === 'right' && (
                      <div className="hidden sm:flex flex-col items-center ml-6 w-36 text-center animate-fade-in">
                        <img
                          src={lvl.mascotCompanion.src}
                          alt={lvl.mascotCompanion.name}
                          className="w-24 h-24 object-contain drop-shadow-xl transition-transform hover:scale-105"
                        />
                        <div className="mt-1 flex items-center gap-0.5 text-yellow-400">
                          {[1, 2, 3].map(s => (
                            <Star
                              key={s}
                              size={12}
                              className={
                                stars >= s
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-slate-400 dark:text-slate-600'
                              }
                            />
                          ))}
                        </div>
                        <span
                          className={`mt-1 px-2.5 py-1 rounded-xl text-[10px] font-bold border leading-tight ${
                            isDark
                              ? 'bg-slate-900/90 border-slate-700 text-blue-200'
                              : 'bg-blue-50 border-blue-200 text-blue-900'
                          }`}
                        >
                          {lvl.mascotCompanion.caption}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ==================================================================== */}
      {/* LEVEL FUNCTION & LAUNCH POPOVER MODAL (WHEN USER CLICKS ANY NODE)    */}
      {/* ==================================================================== */}
      {selectedLevelModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div
            className={`w-full max-w-lg rounded-3xl border-2 overflow-hidden shadow-2xl ${
              isDark
                ? 'bg-[#0B1326] border-blue-500 text-white'
                : 'bg-white border-blue-600 text-slate-900'
            }`}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-[#0A1F66] via-[#0052CC] to-[#0066FF] text-white flex items-center justify-between gap-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-yellow-100 text-blue-950 text-[10px] font-black uppercase tracking-widest">
                  SET {selectedLevelModal.setNumber} · LEVEL {selectedLevelModal.id} OF 22
                </span>
                <h2 className="text-xl font-black mt-1">{selectedLevelModal.title}</h2>
                <p className="text-xs text-blue-100">{selectedLevelModal.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLevelModal(null)}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Level Function, Specs & Launch Button */}
            <div className="p-6 space-y-5">
              <div
                className={`p-4 rounded-2xl border space-y-1.5 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-blue-50/60 border-blue-100'
                }`}
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
                  Level Function & Pedagogical Goal
                </span>
                <p className="text-xs sm:text-sm leading-relaxed font-medium">
                  {selectedLevelModal.functionDescription}
                </p>
              </div>

              {/* 3 Specs Pills */}
              <div className="grid grid-cols-3 gap-2.5 text-center">
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Questions
                  </span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {selectedLevelModal.questionCount} Qs
                  </span>
                </div>
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Difficulty ID
                  </span>
                  <span className="text-base font-black uppercase">
                    {selectedLevelModal.difficultyMode}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-2xl border ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Pacing Clock
                  </span>
                  <span className="text-base font-black">
                    {selectedLevelModal.secondsPerQuestion}s / Q
                  </span>
                </div>
              </div>

              {/* Strict 100% Flawless Subject Rating Rule Notice */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/40 text-xs font-bold text-amber-900 dark:text-yellow-200">
                <Trophy size={18} className="text-amber-500 shrink-0" />
                <span>
                  Score <strong>{selectedLevelModal.questionCount}/{selectedLevelModal.questionCount} (100% Flawless)</strong> to boost your{' '}
                  {selectedSubject === 'ALL_4' ? 'Registered Subject' : selectedSubject} Rating by{' '}
                  <strong>+10%</strong> and earn <strong>+10 Streak Bonus Diamonds</strong>!
                </span>
              </div>

              {unlockNotice && (
                <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-xs font-bold text-rose-800 dark:text-rose-200">
                  {unlockNotice}
                </div>
              )}

              {/* Action Buttons */}
              {selectedLevelModal.id <= progress.blitzUnlockedLevel ||
              (selectedLevelModal.setNumber === 2 &&
                isSet2Unlocked &&
                selectedLevelModal.id === 12) ? (
                <button
                  type="button"
                  onClick={() => handleStartLevelSession(selectedLevelModal)}
                  className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  <Play size={16} className="fill-current" />
                  <span>
                    Start Level {selectedLevelModal.id} ({selectedLevelModal.questionCount} Questions) →
                  </span>
                </button>
              ) : (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleUnlockWithDiamonds(selectedLevelModal)}
                    className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Coins size={15} />
                    <span>Instant Unlock Level {selectedLevelModal.id} (50 💎)</span>
                  </button>
                  <p className="text-[11px] text-center text-slate-500">
                    Or clear Level {selectedLevelModal.id - 1} to unlock this level for free!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default BlitzPage;
