import React, { useState } from 'react';
import {
  Play, Zap, BookOpen, TimerReset, Sparkles, Trophy, ChevronRight,
  Flame, CheckCircle2, ArrowRight, BookMarked, HelpCircle, AlertCircle, FileText, Calculator,
  Award, Volume2, Compass, BarChart3
} from 'lucide-react';
import { SubjectName, StudentProfile, Question } from '../../types';
import MathText from '../MathText';
import { sound } from '../../utils/soundEffects';
import { saveMistakeRecord } from '../../utils/mistakeStore';
import PWAInstallBanner from './PWAInstallBanner';

interface HomeDashboardProps {
  profile: StudentProfile | null;
  onNavigateToTab: (tab: 'home' | 'practice' | 'blitz' | 'mastery' | 'profile') => void;
  onStartSubjectPractice: (subject: SubjectName) => void;
  onStartMockExam: () => void;
  onOpenAITutor: (subject?: SubjectName, topic?: string) => void;
  onAddXP: (amount: number) => void;
  onOpenPastQuestions: () => void;
  onOpenCheatSheet?: () => void;
  onOpenMistakeNotebook?: () => void;
  onOpenCalculator?: () => void;
  onOpenNovelGuide?: () => void;
  onOpenResultSlip?: () => void;
  onOpenOralEnglish?: () => void;
  onOpenBrochureChecker?: () => void;
  onOpenSyllabusHeatmap?: () => void;
  onOpenDailyChallengeArena?: () => void;
  onOpenLeaderboard?: () => void;
}

const DEFAULT_SUBJECTS: { name: SubjectName; code: string; color: string; iconBg: string; mastery: number; topicsDone: number; totalTopics: number }[] = [
  { name: 'English Language', code: 'ENG', color: 'from-blue-600 to-indigo-600', iconBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', mastery: 78, topicsDone: 24, totalTopics: 32 },
  { name: 'Mathematics', code: 'MTH', color: 'from-emerald-600 to-teal-600', iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', mastery: 64, topicsDone: 19, totalTopics: 30 },
  { name: 'Physics', code: 'PHY', color: 'from-violet-600 to-purple-600', iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', mastery: 52, topicsDone: 14, totalTopics: 28 },
  { name: 'Chemistry', code: 'CHE', color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', mastery: 58, topicsDone: 16, totalTopics: 28 },
];

// Sample Daily Challenge Question
const DAILY_CHALLENGE: Question = {
  id: 'DAILY-CHALLENGE-1',
  exam_type: 'JAMB',
  subject: 'Physics',
  topic: 'Waves & Optics',
  subtopic: 'Refraction',
  year: 2023,
  question: 'A ray of light traveling from water into air has a critical angle $\\theta_c$. If the refractive index of water is $1.33$, what is $\\sin(\\theta_c)$?',
  options: {
    A: '0.75',
    B: '1.33',
    C: '0.50',
    D: '0.87'
  },
  answer: 'A',
  explanation: 'For total internal reflection from an optically denser medium (water, $n_1 = 1.33$) to a rarer medium (air, $n_2 = 1.0$), the critical angle satisfies $\\sin(\\theta_c) = \\frac{1}{n_1} = \\frac{1}{1.33} \\approx 0.75$.',
  explanation_short: 'Critical angle $\\sin(\\theta_c) = 1/n = 1/1.33 \\approx 0.75$.',
  explanation_pidgin: 'When light dey try commot from water go air, formula for critical angle na simple: $\\sin(\\theta_c) = 1/n$. Since water refractive index na $1.33$, $1 / 1.33$ dey give $0.75$. Option A correct.',
  difficulty: 'medium',
  concepts: ['Optics', 'Refractive Index', 'Critical Angle'],
  source: 'JAMB 2023',
  status: 'verified',
  confidence_score: 1.0,
  created_at: '2026-06-19T10:00:00Z'
};

export default function HomeDashboard({
  profile,
  onNavigateToTab,
  onStartSubjectPractice,
  onStartMockExam,
  onOpenAITutor,
  onAddXP,
  onOpenPastQuestions,
  onOpenCheatSheet,
  onOpenMistakeNotebook,
  onOpenCalculator,
  onOpenNovelGuide,
  onOpenResultSlip,
  onOpenOralEnglish,
  onOpenBrochureChecker,
  onOpenSyllabusHeatmap,
  onOpenDailyChallengeArena,
  onOpenLeaderboard,
}: HomeDashboardProps) {
  // Daily Goal state
  const dailyTarget = 25;
  const [questionsDoneToday, setQuestionsDoneToday] = useState(18);
  const goalPercent = Math.min(100, Math.round((questionsDoneToday / dailyTarget) * 100));

  // Daily Challenge Interactive State
  const [selectedChallengeOption, setSelectedChallengeOption] = useState<string | null>(null);
  const [challengeAnswered, setChallengeAnswered] = useState(false);
  const [showPidginExp, setShowPidginExp] = useState(false);

  const handleAnswerChallenge = (optionKey: string) => {
    if (challengeAnswered) return;
    setSelectedChallengeOption(optionKey);
    setChallengeAnswered(true);
    if (optionKey === DAILY_CHALLENGE.answer) {
      sound.playCorrect();
      onAddXP(15);
      setQuestionsDoneToday(prev => prev + 1);
    } else {
      sound.playWrong();
      saveMistakeRecord(DAILY_CHALLENGE, optionKey);
    }
  };

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* 0. PWA Install & Offline Banner */}
      <PWAInstallBanner />

      {/* 1. HERO CARD: Daily Practice Goal */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A1128] via-[#101F42] to-[#0D253A] p-5 text-white shadow-lg shadow-blue-950/20">
        {/* Subtle background glow effect */}
        <div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-emerald-500/20 blur-2xl" />
        <div className="absolute -left-8 -bottom-8 h-36 w-36 rounded-full bg-blue-500/15 blur-2xl" />

        <div className="relative z-10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/30">
              Daily Practice Goal
            </span>
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
              <Flame size={14} className="text-amber-400 fill-amber-400" />
              14 Day Streak
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-black text-white">
                  {questionsDoneToday}
                </span>
                <span className="text-slate-400 font-semibold text-sm">
                  / {dailyTarget} Questions
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-300 leading-snug">
                {dailyTarget - questionsDoneToday > 0
                  ? `Just ${dailyTarget - questionsDoneToday} more questions to hit today's target!`
                  : 'Goal crushed! You are building championship momentum.'}
              </p>
            </div>

            {/* Circular Progress Indicator */}
            <div className="relative shrink-0 w-16 h-16 flex items-center justify-center">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-white/10"
                  fill="transparent"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="26"
                  stroke="currentColor"
                  strokeWidth="5"
                  className="text-emerald-400 transition-all duration-700 ease-out"
                  strokeDasharray={2 * Math.PI * 26}
                  strokeDashoffset={2 * Math.PI * 26 * (1 - goalPercent / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              <span className="absolute font-display text-xs font-black text-white">
                {goalPercent}%
              </span>
            </div>
          </div>

          {/* Quick Resume CTA Button */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] uppercase font-bold text-slate-400">Next Up</p>
              <p className="text-xs font-bold text-slate-200 truncate">Physics: Waves & Optics</p>
            </div>
            <button
              onClick={() => onStartSubjectPractice('Physics')}
              className="shrink-0 flex items-center gap-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black px-3.5 py-2 rounded-xl shadow-md shadow-emerald-500/25 active:scale-95 transition"
            >
              <Play size={13} className="fill-white" />
              <span>Continue</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. QUICK ACTIONS: 4-Tile Grid */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Quick Actions
          </h2>
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            JAMB 2027 Mode
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Tile 1: Speed Blitz */}
          <button
            onClick={() => onNavigateToTab('blitz')}
            className="flex flex-col p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-left hover:border-amber-400 dark:hover:border-amber-500/50 shadow-xs active:scale-98 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Zap size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                60s
              </span>
            </div>
            <span className="mt-3 font-display font-black text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
              Speed Blitz
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 leading-tight mt-0.5">
              Rapid-fire challenge
            </span>
          </button>

          {/* Tile 2: CBT Past Questions */}
          <button
            onClick={onOpenPastQuestions}
            className="flex flex-col p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-left hover:border-blue-400 dark:hover:border-blue-500/50 shadow-xs active:scale-98 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                2000-24
              </span>
            </div>
            <span className="mt-3 font-display font-black text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
              Past Questions
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 leading-tight mt-0.5">
              Year & topic archives
            </span>
          </button>

          {/* Tile 3: Full Mock Exam */}
          <button
            onClick={onStartMockExam}
            className="flex flex-col p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-400 dark:hover:border-emerald-500/50 shadow-xs active:scale-98 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TimerReset size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                4 SUBJ
              </span>
            </div>
            <span className="mt-3 font-display font-black text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
              CBT Mock Exam
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 leading-tight mt-0.5">
              Real timed simulation
            </span>
          </button>

          {/* Tile 4: Sabi AI Doubt Solver */}
          <button
            onClick={() => onOpenAITutor()}
            className="flex flex-col p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-left hover:border-violet-400 dark:hover:border-violet-500/50 shadow-xs active:scale-98 transition group"
          >
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 dark:bg-violet-400/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                AI
              </span>
            </div>
            <span className="mt-3 font-display font-black text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition">
              AI Doubt Solver
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-400 leading-tight mt-0.5">
              Step-by-step breakdown
            </span>
          </button>
        </div>

        {/* Phase 3 CBT Power Tools: Mistake Notebook & JAMB Calculator */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button
            onClick={onOpenMistakeNotebook}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-red-50/70 dark:bg-red-950/30 border border-red-200/80 dark:border-red-900/50 text-left hover:border-red-400 active:scale-98 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <BookMarked size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-display font-black text-xs text-red-950 dark:text-red-200 truncate">
                Mistake Notebook
              </p>
              <p className="text-[10px] text-red-700/80 dark:text-red-400 font-semibold truncate">
                Review & re-test missed
              </p>
            </div>
          </button>

          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500 active:scale-98 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Calculator size={16} />
            </div>
            <div className="min-w-0">
              <p className="font-display font-black text-xs text-slate-900 dark:text-white truncate">
                JAMB Calculator
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                Official 8-digit engine
              </p>
            </div>
          </button>
        </div>

        {/* Phase 4 Special High-Yield Features */}
        <div className="mt-2.5 space-y-2">
          {/* Compulsory Novel Feature Banner */}
          <button
            onClick={onOpenNovelGuide}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-950 to-slate-900 border border-emerald-500/30 text-left text-white shadow-xs hover:border-emerald-400 active:scale-98 transition group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <BookOpen size={20} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display font-black text-xs text-white group-hover:text-emerald-300 transition">
                    The Life Changer
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black text-[9px]">
                    10 COMPULSORY Qs
                  </span>
                </div>
                <p className="text-[11px] text-emerald-200/80 truncate mt-0.5">
                  Chapter summaries, character dossier & CBT drill
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-emerald-400 shrink-0 ml-2" />
          </button>

          {/* 2-Column: Oral English & Result Slip */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenOralEnglish}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 text-left hover:border-blue-400 active:scale-98 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Volume2 size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-black text-xs text-blue-950 dark:text-blue-200 truncate">
                  Oral English
                </p>
                <p className="text-[10px] text-blue-700/80 dark:text-blue-400 font-semibold truncate">
                  Phonetics & Stress drill
                </p>
              </div>
            </button>

            <button
              onClick={onOpenResultSlip}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 text-left hover:border-amber-400 active:scale-98 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Award size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-black text-xs text-amber-950 dark:text-amber-200 truncate">
                  JAMB Result Slip
                </p>
                <p className="text-[10px] text-amber-700/80 dark:text-amber-400 font-semibold truncate">
                  e-Facility CAPS print
                </p>
              </div>
            </button>
          </div>

          {/* 2-Column: CAPS Brochure Advisor & Syllabus Frequency Heatmap (Phase 5) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onOpenBrochureChecker}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 text-left hover:border-emerald-400 active:scale-98 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                <Compass size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-black text-xs text-emerald-950 dark:text-emerald-200 truncate">
                  CAPS Brochure
                </p>
                <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 font-semibold truncate">
                  Combinations & Cutoffs
                </p>
              </div>
            </button>

            <button
              onClick={onOpenSyllabusHeatmap}
              className="flex items-center gap-2.5 p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 text-left hover:border-purple-400 active:scale-98 transition"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                <BarChart3 size={16} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-black text-xs text-purple-950 dark:text-purple-200 truncate">
                  Syllabus Heatmap
                </p>
                <p className="text-[10px] text-purple-700/80 dark:text-purple-400 font-semibold truncate">
                  10-Yr High-Yield trends
                </p>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* 3. MY 4 JAMB SUBJECTS PROGRESS */}
      <section>
        <div className="flex items-center justify-between mb-2.5 px-0.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            My JAMB Subjects
          </h2>
          <button
            onClick={() => onNavigateToTab('mastery')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 hover:underline"
          >
            <span>Mastery Map</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div className="space-y-2.5">
          {DEFAULT_SUBJECTS.map(subj => (
            <div
              key={subj.name}
              className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs transition"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${subj.iconBg}`}>
                    {subj.code}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {subj.name}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-400">
                      {subj.topicsDone} of {subj.totalTopics} syllabus topics covered
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {subj.mastery}%
                    </span>
                    <p className="text-[9px] font-semibold text-slate-400">Mastery</p>
                  </div>
                  <button
                    onClick={() => onStartSubjectPractice(subj.name)}
                    className="p-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950 text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 transition"
                    title={`Practice ${subj.name}`}
                  >
                    <Play size={13} className="fill-current" />
                  </button>
                </div>
              </div>

              {/* Mini progress bar */}
              <div className="mt-2.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${subj.color} transition-all duration-500`}
                  style={{ width: `${subj.mastery}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. QUESTION OF THE DAY (Interactive Mini-Quiz) */}
      <section className="rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Daily JAMB Challenge
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
            +15 XP Reward
          </span>
        </div>

        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Physics · Waves & Optics ({DAILY_CHALLENGE.source})
        </p>

        <div className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
          <MathText text={DAILY_CHALLENGE.question} />
        </div>

        {/* Options */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          {(Object.entries(DAILY_CHALLENGE.options) as [string, string][]).map(([key, value]) => {
            const isSelected = selectedChallengeOption === key;
            const isCorrect = key === DAILY_CHALLENGE.answer;

            let btnStyle = 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200';
            if (challengeAnswered) {
              if (isCorrect) {
                btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-200 font-bold';
              } else if (isSelected) {
                btnStyle = 'border-red-500 bg-red-50 dark:bg-red-950/70 text-red-800 dark:text-red-200';
              }
            } else if (isSelected) {
              btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300';
            }

            return (
              <button
                key={key}
                disabled={challengeAnswered}
                onClick={() => handleAnswerChallenge(key)}
                className={`p-2.5 rounded-xl border text-xs text-left flex items-center gap-2 transition active:scale-95 ${btnStyle}`}
              >
                <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-black shrink-0">
                  {key}
                </span>
                <span className="truncate">{value}</span>
              </button>
            );
          })}
        </div>

        {/* Explanation Drawer when answered */}
        {challengeAnswered && (
          <div className="mt-3 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs">
            <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                {selectedChallengeOption === DAILY_CHALLENGE.answer ? 'Spot on! +15 XP' : 'Good try! Here is the concept:'}
              </span>
              <button
                onClick={() => setShowPidginExp(!showPidginExp)}
                className="text-[10px] font-black underline text-emerald-700 dark:text-emerald-400"
              >
                {showPidginExp ? 'Standard English' : 'Pidgin breakdown 🇳🇬'}
              </button>
            </div>
            <div className="mt-1.5 text-slate-700 dark:text-slate-300 text-[11px] leading-relaxed">
              <MathText text={showPidginExp ? DAILY_CHALLENGE.explanation_pidgin : DAILY_CHALLENGE.explanation} />
            </div>
          </div>
        )}

        {/* 5-Min Multi-Subject Challenge Arena CTA */}
        {onOpenDailyChallengeArena && (
          <button
            onClick={() => {
              sound.playTap();
              onOpenDailyChallengeArena();
            }}
            className="w-full mt-3 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-between shadow-xs transition active:scale-98"
          >
            <div className="flex items-center gap-2">
              <Zap size={15} className="fill-current text-yellow-200" />
              <span>Enter 5-Min UTME Arena Sprint</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black">
              +100 XP LEAGUE
            </span>
          </button>
        )}
      </section>

      {/* 5. FORMULA & SYLLABUS CHEAT SHEET QUICK BANNER */}
      {onOpenCheatSheet && (
        <button
          onClick={onOpenCheatSheet}
          className="w-full p-3.5 rounded-3xl bg-amber-500/10 dark:bg-amber-950/30 border border-amber-300/60 dark:border-amber-900/60 flex items-center justify-between text-left active:scale-98 transition group"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <FileText size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                Formula & Rule Cheat Sheets
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Quick formulas for Physics, Math, Chemistry & Concord
              </p>
            </div>
          </div>
          <ChevronRight size={15} className="text-amber-600 dark:text-amber-400" />
        </button>
      )}

      {/* 6. LEADERBOARD & ASPIRANT PULSE */}
      <section
        onClick={() => {
          if (onOpenLeaderboard) {
            sound.playTap();
            onOpenLeaderboard();
          } else {
            onNavigateToTab('mastery');
          }
        }}
        className="p-4 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border border-emerald-200/50 dark:border-emerald-800/30 cursor-pointer hover:border-emerald-400 active:scale-98 transition"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Trophy size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">
                Rank #14 in Lagos State
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                You outperformed 84% of JAMB aspirants · Tap to view Leaderboard
              </p>
            </div>
          </div>
          <div className="p-1.5 rounded-full hover:bg-white dark:hover:bg-slate-800 text-slate-500 dark:text-slate-300 transition">
            <ChevronRight size={16} />
          </div>
        </div>
      </section>
    </div>
  );
}
