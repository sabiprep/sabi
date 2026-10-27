import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, 
  Flame, 
  Star, 
  Zap, 
  Clock, 
  Calculator, 
  Settings, 
  ChevronRight, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Volume2, 
  VolumeX, 
  Trophy, 
  HelpCircle,
  Play,
  Award
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useTheme } from '../app/ThemeProvider';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import JAMBCalculatorModal from '../components/mobile/JAMBCalculatorModal';

// User's Approved Default 4 Subjects
const BLITZ_SUBJECTS: SubjectName[] = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
];

// Definition of Blitz Levels along the Zigzag path
interface BlitzLevel {
  id: number;
  title: string;
  questionCount: number; // Some 15, some 10 as specified by user
  type: 'standard' | 'speed' | 'chest' | 'checkpoint';
  unlocked: boolean;
  completed: boolean;
  stars: number; // 0-3
  highScore?: number;
}

const INITIAL_LEVELS: BlitzLevel[] = [
  { id: 1, title: 'Starter Drill', questionCount: 10, type: 'standard', unlocked: true, completed: true, stars: 3, highScore: 100 },
  { id: 2, title: 'Speed Surge', questionCount: 10, type: 'speed', unlocked: true, completed: true, stars: 2, highScore: 80 },
  { id: 3, title: 'Citadel Challenge', questionCount: 15, type: 'standard', unlocked: true, completed: false, stars: 0 },
  { id: 4, title: 'Golden Treasure', questionCount: 15, type: 'chest', unlocked: false, completed: false, stars: 0 },
  { id: 5, title: 'Mastery Drill I', questionCount: 10, type: 'standard', unlocked: false, completed: false, stars: 0 },
  { id: 6, title: 'Supersonic Sprint', questionCount: 10, type: 'speed', unlocked: false, completed: false, stars: 0 },
  { id: 7, title: 'UTME Combat', questionCount: 15, type: 'standard', unlocked: false, completed: false, stars: 0 },
  { id: 8, title: 'Ancient Vault', questionCount: 15, type: 'chest', unlocked: false, completed: false, stars: 0 },
  { id: 9, title: 'Focus Sprint', questionCount: 10, type: 'standard', unlocked: false, completed: false, stars: 0 },
  { id: 10, title: 'Gateway Checkpoint', questionCount: 15, type: 'checkpoint', unlocked: false, completed: false, stars: 0 },
];

export function BlitzPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Navigation & State
  const [activeSubject, setActiveSubject] = useState<SubjectName>('English Language');
  const [activeLevel, setActiveLevel] = useState<BlitzLevel | null>(null);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChestModal, setShowChestModal] = useState(false);
  const [claimedChestLevel, setClaimedChestLevel] = useState<number | null>(null);

  // Speed Settings
  const [timerSecondsPerQuestion, setTimerSecondsPerQuestion] = useState<number>(60); // 60s per question default
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Current Simulator State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState(60);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [theoryAnswer, setTheoryAnswer] = useState('');
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [streakCount, setStreakCount] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [showStreakFlyover, setShowStreakFlyover] = useState(false);
  const [isLevelCleared, setIsLevelCleared] = useState(false);

  // Filter pool questions for active subject
  const subjectQuestions = useMemo(() => {
    const list = SEED_QUESTIONS.filter(q => q.subject === activeSubject);
    return list.length > 0 ? list : SEED_QUESTIONS;
  }, [activeSubject]);

  const activeQuestionList = useMemo(() => {
    if (!activeLevel) return [];
    // slice based on activeLevel.questionCount
    const count = activeLevel.questionCount;
    const pool = [...subjectQuestions];
    // Return cycling questions if pool is smaller
    const result: Question[] = [];
    for (let i = 0; i < count; i++) {
      result.push(pool[i % pool.length]);
    }
    return result;
  }, [activeLevel, subjectQuestions]);

  const currentQuestion: Question | undefined = activeQuestionList[currentQuestionIndex];

  // Per-question countdown timer in Blitz
  useEffect(() => {
    if (!isSimulatorOpen || isAnswerSubmitted || isLevelCleared) return;

    if (secondsRemaining <= 0) {
      // Auto-submit time-out
      handleOptionSubmit(null);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulatorOpen, isAnswerSubmitted, secondsRemaining, isLevelCleared]);

  const handleStartLevel = (level: BlitzLevel) => {
    if (!level.unlocked) return;
    if (level.type === 'chest') {
      setClaimedChestLevel(level.id);
      setShowChestModal(true);
      sound.playSuccess();
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.6 } });
      return;
    }
    sound.playTap();
    setActiveLevel(level);
    setCurrentQuestionIndex(0);
    setSecondsRemaining(timerSecondsPerQuestion);
    setSelectedOption(null);
    setTheoryAnswer('');
    setUploadedImageName(null);
    setIsAnswerSubmitted(false);
    setStreakCount(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setIsLevelCleared(false);
    setIsSimulatorOpen(true);
  };

  const handleOptionSubmit = (choice: string | null) => {
    if (isAnswerSubmitted || !currentQuestion) return;

    setSelectedOption(choice);
    setIsAnswerSubmitted(true);

    const isCorrect = choice === currentQuestion.answer;
    if (isCorrect) {
      sound.playCorrect();
      setCorrectCount(prev => prev + 1);
      const newStreak = streakCount + 1;
      setStreakCount(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      // Trigger Eagle flight on 3x or 5x streak!
      if (newStreak === 3 || newStreak === 5 || newStreak === 10) {
        setShowStreakFlyover(true);
        sound.playStreak();
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.5 } });
        setTimeout(() => setShowStreakFlyover(false), 2200);
      }
    } else {
      sound.playIncorrect();
      setStreakCount(0);
    }
  };

  const handleNextQuestion = () => {
    sound.playTap();
    if (currentQuestionIndex + 1 < activeQuestionList.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSecondsRemaining(timerSecondsPerQuestion);
      setSelectedOption(null);
      setTheoryAnswer('');
      setUploadedImageName(null);
      setIsAnswerSubmitted(false);
    } else {
      // Level Complete!
      setIsLevelCleared(true);
      sound.playLevelUp();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
    }
  };

  const handleSimulatedImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImageName(e.target.files[0].name);
      sound.playTap();
    }
  };

  // Keyboard navigation for A, B, C, D
  useEffect(() => {
    if (!isSimulatorOpen || isAnswerSubmitted) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion?.options?.[key as 'A' | 'B' | 'C' | 'D']) {
        handleOptionSubmit(key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulatorOpen, isAnswerSubmitted, currentQuestion]);

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} transition-colors duration-200 flex flex-col`}>
      {/* ======================================================== */}
      {/* TOP HEADER: SABI BLITZ HUB */}
      {/* ======================================================== */}
      <header className={`sticky top-0 z-30 px-4 sm:px-8 py-3.5 border-b backdrop-blur-md ${
        isDark ? 'bg-[#080D1A]/90 border-slate-800' : 'bg-white/95 border-slate-200'
      } flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <Link
            to="/home"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-300"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-blue-900 dark:text-amber-400">
              SABI BLITZ
            </h1>
          </div>
        </div>

        {/* Gamified Header Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black">
            <Flame size={14} className="animate-bounce" />
            <span>{streakCount > 0 ? `${streakCount} STREAK` : '7 DAYS'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-bold">
            <Zap size={14} className="text-amber-400" />
            <span>{timerSecondsPerQuestion}s/Question</span>
          </div>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-slate-600 dark:text-slate-400"
            title="Blitz Speed Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {/* ======================================================== */}
      {/* 4-SUBJECT SWITCHER BAR (Motion Glow as requested) */}
      {/* ======================================================== */}
      <section className={`px-4 py-3 border-b ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/70 border-slate-200'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar py-1">
          {BLITZ_SUBJECTS.map((subject) => {
            const isSelected = activeSubject === subject;
            return (
              <button
                key={subject}
                onClick={() => {
                  sound.playTap();
                  setActiveSubject(subject);
                }}
                className={`flex-1 min-w-[130px] sm:min-w-0 py-3 px-3 rounded-2xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center justify-center gap-2 border-2 ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-700 to-blue-600 text-white border-amber-400 shadow-[0_4px_16px_rgba(245,158,11,0.25)] scale-[1.03]'
                    : isDark
                    ? 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-200 shadow-sm'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-slate-400'}`} />
                <span className="truncate">{subject}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* MAIN BLITZ ARENA: DUOLINGO-STYLE ZIGZAG LEVEL PATH */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 flex flex-col items-center">
        {/* Banner with Eagle Mascot */}
        <div className={`w-full rounded-3xl p-5 mb-8 border-2 flex items-center justify-between gap-4 shadow-xl ${
          isDark
            ? 'bg-gradient-to-r from-blue-950 via-slate-900 to-amber-950/40 border-blue-900/60 text-white'
            : 'bg-gradient-to-r from-blue-50 via-white to-amber-50/70 border-blue-200 text-slate-900'
        }`}>
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-500 tracking-wider mb-1">
              <Zap size={14} />
              <span>{activeSubject} Blitz Track</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Endless CBT Level Path
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select your speed (60s default). Conquer each level to push your UTME speed past 300+!
            </p>
          </div>

          {/* Sabi Eagle Mascot Floating Alongside */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 relative">
            <img
              src="/assets/mascots/blitz/eagle_idle.svg"
              alt="Sabi Eagle"
              className="w-full h-full object-contain filter drop-shadow-[0_8px_16px_rgba(245,158,11,0.3)] animate-pulse-slow"
            />
          </div>
        </div>

        {/* ==================================================== */}
        {/* THE SHARP ZIGZAG / CONTINUOUS Z-PATH */}
        {/* ==================================================== */}
        <div className="relative w-full max-w-md flex flex-col items-center py-6 space-y-12">
          {/* Decorative connector SVG line (Sharp Z line) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20 dark:opacity-30" viewBox="0 0 380 900" fill="none">
            <path
              d="M 190 40 L 90 130 L 290 230 L 190 330 L 90 430 L 290 530 L 190 630 L 90 730 L 290 830"
              stroke="#F59E0B"
              strokeWidth="10"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="14 10"
            />
          </svg>

          {INITIAL_LEVELS.map((level, idx) => {
            // Horizontal alternating zigzag offset (Continuous sharp Z)
            const offsets = ['translate-x-0', '-translate-x-20 sm:-translate-x-28', 'translate-x-20 sm:translate-x-28', 'translate-x-0'];
            const offsetClass = offsets[idx % offsets.length];

            const isCurrent = level.unlocked && !level.completed;

            return (
              <div key={level.id} className={`relative flex flex-col items-center ${offsetClass} transition-transform`}>
                {/* Perched Eagle next to the active level */}
                {isCurrent && (
                  <div className="absolute -top-12 -right-12 z-20 w-16 h-16 pointer-events-none animate-bounce">
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

                {/* Level Node Button */}
                <button
                  onClick={() => handleStartLevel(level)}
                  disabled={!level.unlocked}
                  className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center transition-all duration-300 transform ${
                    !level.unlocked
                      ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed opacity-75 shadow-none'
                      : level.completed
                      ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-[0_6px_0_#B45309] hover:-translate-y-1 active:translate-y-1 active:shadow-[0_0px_0_#B45309]'
                      : isCurrent
                      ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 text-slate-950 shadow-[0_8px_0_#B45309] scale-110 ring-4 ring-amber-400/50 animate-pulse hover:-translate-y-1'
                      : 'bg-blue-600 text-white shadow-[0_6px_0_#1E3A8A] hover:-translate-y-1'
                  }`}
                >
                  {level.type === 'chest' ? (
                    <img
                      src="/assets/environment/treasure_chest_closed.svg"
                      alt="Chest"
                      className="w-10 h-10 object-contain drop-shadow"
                    />
                  ) : level.type === 'speed' ? (
                    <Zap size={28} className={level.completed ? 'text-slate-950' : 'text-amber-300'} />
                  ) : (
                    <span className="font-display font-black text-2xl">{level.id}</span>
                  )}
                </button>

                {/* Stars / Label Below Node */}
                <div className="mt-2 flex flex-col items-center">
                  {level.completed && (
                    <div className="flex items-center gap-0.5 mb-0.5">
                      {[1, 2, 3].map(starNum => (
                        <Star
                          key={starNum}
                          size={12}
                          className={starNum <= level.stars ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}
                        />
                      ))}
                    </div>
                  )}
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {level.title} ({level.questionCount}Q)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ======================================================== */}
      {/* FULL BLITZ CBT SIMULATOR ("ANOTHER WORLD") */}
      {/* ======================================================== */}
      {isSimulatorOpen && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-y-auto">
          {/* Top Simulator Control Bar */}
          <div className="w-full bg-[#0D1527] border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSimulatorOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="End or Pause Level"
              >
                <X size={18} />
              </button>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  {activeSubject} · Level {activeLevel?.id}
                </span>
                <span className="text-sm font-extrabold text-white">
                  Question {currentQuestionIndex + 1} of {activeQuestionList.length}
                </span>
              </div>
            </div>

            {/* Middle: 60s Question Countdown Timer */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-slate-900 border border-amber-400/30">
              <Clock size={16} className={secondsRemaining <= 10 ? 'text-red-500 animate-spin' : 'text-amber-400'} />
              <span className={`text-base font-mono font-black ${secondsRemaining <= 10 ? 'text-red-400' : 'text-white'}`}>
                {secondsRemaining}s
              </span>
            </div>

            {/* Right: Calculator Popout & Streak Counter */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
                <Flame size={14} className="animate-bounce" />
                <span>Streak: {streakCount}x</span>
              </div>

              <button
                onClick={() => setIsCalculatorOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
              >
                <Calculator size={14} />
                <span className="hidden sm:inline">Calculator</span>
              </button>
            </div>
          </div>

          {/* Eagle Streak Flyover Notification */}
          {showStreakFlyover && (
            <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
              <img
                src="/assets/mascots/blitz/eagle_flying_speed.svg"
                alt="Eagle Flying"
                className="w-10 h-10 object-contain"
              />
              <span className="text-base sm:text-lg">🔥 {streakCount}X STREAK! EAGLE SPEED MULTIPLIER!</span>
            </div>
          )}

          {/* Question Arena Box */}
          <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
            <div className="bg-[#10192E] border-2 border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative">
              {/* Question Meta */}
              <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-4 pb-3 border-b border-slate-800">
                <span className="px-2.5 py-1 rounded-md bg-blue-900/60 text-blue-300">
                  {currentQuestion.topic || 'General Topic'}
                </span>
                <span className="text-amber-400">JAMB UTME {currentQuestion.year || 'Standard'}</span>
              </div>

              {/* Question Text (Large and Readable) */}
              <h3 className="text-lg sm:text-2xl font-bold leading-relaxed mb-6 whitespace-pre-line text-slate-100">
                {currentQuestion.question}
              </h3>

              {/* Option Buttons (A, B, C, D) */}
              {currentQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map(optKey => {
                    const optText = currentQuestion.options?.[optKey];
                    const isSelected = selectedOption === optKey;
                    const isCorrect = isAnswerSubmitted && optKey === currentQuestion.answer;
                    const isWrong = isAnswerSubmitted && isSelected && optKey !== currentQuestion.answer;

                    return (
                      <button
                        key={optKey}
                        onClick={() => handleOptionSubmit(optKey)}
                        disabled={isAnswerSubmitted}
                        className={`p-4 rounded-2xl border-2 text-left font-bold text-sm sm:text-base flex items-start gap-3 transition-all ${
                          isCorrect
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : isWrong
                            ? 'bg-red-600/20 border-red-500 text-red-300'
                            : isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-slate-900/80 border-slate-800 hover:border-amber-400/60 text-slate-200'
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-black text-sm ${
                          isCorrect
                            ? 'bg-emerald-500 text-slate-950'
                            : isWrong
                            ? 'bg-red-500 text-white'
                            : isSelected
                            ? 'bg-slate-950 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {optKey}
                        </span>
                        <span className="flex-1 mt-1 leading-snug">{optText}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Theory / Direct Answer Inbox & Image Upload */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-400">
                    Direct Answer / Workings Inbox:
                  </span>
                  <label className="cursor-pointer text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5">
                    <Upload size={13} />
                    <span>Upload Worked Answer</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSimulatedImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={theoryAnswer}
                    placeholder="Type worked value or key formula..."
                    onChange={e => setTheoryAnswer(e.target.value)}
                    disabled={isAnswerSubmitted}
                    className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white focus:outline-hidden focus:border-amber-400"
                  />
                  {!isAnswerSubmitted && (
                    <button
                      onClick={() => handleOptionSubmit('A')}
                      className="px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider"
                    >
                      Submit
                    </button>
                  )}
                </div>

                {uploadedImageName && (
                  <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 size={13} /> Worked solution attached: {uploadedImageName}
                  </div>
                )}
              </div>

              {/* Immediate Review & Full Explanation Section */}
              {isAnswerSubmitted && (
                <div className={`mt-6 p-5 rounded-2xl border-2 animate-fade-in ${
                  selectedOption === currentQuestion.answer
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100'
                    : 'bg-amber-950/40 border-amber-500/60 text-amber-100'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
                      {selectedOption === currentQuestion.answer ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-400" />
                          <span className="text-emerald-400">Correct! +20 Points</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={18} className="text-red-400" />
                          <span className="text-red-400">Incorrect · Correct is {currentQuestion.answer}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-slate-200 mt-2">
                    {currentQuestion.explanation}
                  </p>

                  {currentQuestion.explanation_pidgin && (
                    <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-amber-300">
                      <strong>Sabi Pidgin Breakdown:</strong> {currentQuestion.explanation_pidgin}
                    </div>
                  )}

                  {/* Immediate Next Question Button for Addictive Flow */}
                  <div className="mt-5 flex justify-end">
                    <button
                      onClick={handleNextQuestion}
                      className="px-8 py-3.5 rounded-xl font-black text-sm bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 shadow-lg shadow-amber-500/30 hover:brightness-105 transition flex items-center gap-2"
                    >
                      <span>Next Question →</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* LEVEL CLEARED VICTORY MODAL WITH EAGLE CHEERING */}
      {/* ======================================================== */}
      {isLevelCleared && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0E172A] border-2 border-amber-400/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl text-white">
            <div className="w-32 h-32 mx-auto mb-4">
              <img
                src="/assets/mascots/blitz/eagle_cheering_stars.svg"
                alt="Eagle Victory"
                className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(245,158,11,0.5)] animate-bounce"
              />
            </div>

            <div className="flex items-center justify-center gap-1 mb-2">
              {[1, 2, 3].map(s => (
                <Star key={s} size={24} className="text-amber-400 fill-amber-400" />
              ))}
            </div>

            <h3 className="text-2xl font-black tracking-tight text-white mb-1">
              LEVEL {activeLevel?.id} CLEARED!
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              You scored {correctCount} out of {activeQuestionList.length} with a max streak of {maxStreak}x!
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold block">XP Gained</span>
                <span className="text-xl font-black text-amber-400">+{correctCount * 15} XP</span>
              </div>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-bold block">Gems Earned</span>
                <span className="text-xl font-black text-blue-400">+50 💎</span>
              </div>
            </div>

            <button
              onClick={() => {
                setIsSimulatorOpen(false);
                setIsLevelCleared(false);
              }}
              className="w-full py-4 rounded-2xl font-black text-base bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 hover:brightness-105 transition"
            >
              Continue on Blitz Path →
            </button>
          </div>
        </div>
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
            <h3 className="text-xl font-black text-amber-400 mb-1">Vault Unlocked!</h3>
            <p className="text-xs text-slate-300 mb-6">
              You unlocked Level {claimedChestLevel} Secret UTME Cache! +100 Gems & Speed Multiplier booster awarded.
            </p>
            <button
              onClick={() => setShowChestModal(false)}
              className="w-full py-3.5 rounded-xl font-black text-sm bg-amber-400 text-slate-950 hover:bg-amber-300 transition"
            >
              Claim Rewards
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
              <h3 className="text-base font-black">Blitz Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
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
                      onClick={() => setTimerSecondsPerQuestion(sec)}
                      className={`py-2 rounded-xl text-xs font-bold border-2 transition ${
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
                <span className="text-xs font-bold">Sound Effects & Speech:</span>
                <button
                  onClick={() => {
                    const next = !audioEnabled;
                    setAudioEnabled(next);
                    sound.setEnabled(next);
                  }}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-800"
                >
                  {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="mt-6 w-full py-3 rounded-xl font-bold text-sm bg-blue-600 text-white hover:bg-blue-500 transition"
            >
              Save & Return
            </button>
          </div>
        </div>
      )}

      {/* POP-OUT CALCULATOR MODAL */}
      <JAMBCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}

export default BlitzPage;
