import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Flame, 
  Star, 
  Zap, 
  Clock, 
  Calculator, 
  Settings, 
  X, 
  CheckCircle2, 
  Upload, 
  Volume2, 
  VolumeX
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
      if (selectedOption) {
        handleCheckAnswer();
      } else {
        setSelectedOption('TIMEOUT');
        setIsAnswerSubmitted(true);
        sound.playIncorrect();
        setStreakCount(0);
      }
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [isSimulatorOpen, isAnswerSubmitted, secondsRemaining, isLevelCleared, selectedOption]);

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
    setUploadedImageName(null);
    setIsAnswerSubmitted(false);
    setStreakCount(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setIsLevelCleared(false);
    setIsSimulatorOpen(true);
  };

  const handleSelectOption = (choice: string) => {
    if (isAnswerSubmitted) return;
    sound.playTap();
    setSelectedOption(choice);
  };

  const handleCheckAnswer = () => {
    if (isAnswerSubmitted || !currentQuestion || !selectedOption) return;

    setIsAnswerSubmitted(true);
    const isCorrect = selectedOption === currentQuestion.answer;
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

  // Keyboard navigation for Duolingo: A, B, C, D to pick, Enter to Check, Space/Enter to Continue
  useEffect(() => {
    if (!isSimulatorOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      if (!isAnswerSubmitted) {
        if (['A', 'B', 'C', 'D'].includes(key) && currentQuestion?.options?.[key as 'A' | 'B' | 'C' | 'D']) {
          handleSelectOption(key);
        } else if (e.key === 'Enter' && selectedOption) {
          handleCheckAnswer();
        }
      } else {
        if (e.key === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          handleNextQuestion();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSimulatorOpen, isAnswerSubmitted, currentQuestion, selectedOption]);

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
      {/* IMMERSIVE FULL-PAGE DUOLINGO-STYLE BLITZ DRILL */}
      {/* ======================================================== */}
      {isSimulatorOpen && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-[#080D1A] flex flex-col justify-between overflow-hidden select-none text-white">
          {/* Top Duolingo Navigation & Progress Bar */}
          <div className="w-full bg-[#080D1A] border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-3">
            {/* Exit 'X' Button */}
            <button
              onClick={() => setIsSimulatorOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
              title="Exit Blitz Drill"
            >
              <X size={20} />
            </button>

            {/* Continuous Animated Progress Bar */}
            <div className="flex-1 mx-2 sm:mx-6 h-3.5 bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-amber-500 rounded-full transition-all duration-300 shadow-sm"
                style={{ 
                  width: `${Math.max(5, ((currentQuestionIndex + (isAnswerSubmitted ? 1 : 0)) / activeQuestionList.length) * 100)}%` 
                }}
              />
            </div>

            {/* Countdown Timer */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <Clock size={15} className={secondsRemaining <= 10 ? 'text-red-500 animate-spin' : 'text-amber-400'} />
              <span className={`text-xs sm:text-sm font-mono font-black ${secondsRemaining <= 10 ? 'text-red-400' : 'text-slate-200'}`}>
                {secondsRemaining}s
              </span>
            </div>

            {/* Streak Counter */}
            <div className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
              <Flame size={14} className={streakCount > 0 ? "animate-bounce text-amber-400" : "text-amber-400/60"} />
              <span>{streakCount}x</span>
            </div>

            {/* Calculator Button */}
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Open JAMB Calculator"
            >
              <Calculator size={16} />
            </button>
          </div>

          {/* Eagle Streak Flyover Notification */}
          {showStreakFlyover && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
              <img
                src="/assets/mascots/blitz/eagle_flying_speed.svg"
                alt="Eagle Flying"
                className="w-10 h-10 object-contain"
              />
              <span className="text-base sm:text-lg">🔥 {streakCount}X STREAK! EAGLE SPEED MULTIPLIER!</span>
            </div>
          )}

          {/* Main Full-Screen Question Canvas */}
          <div className="flex-1 w-full max-w-3xl mx-auto px-4 py-4 sm:py-8 flex flex-col justify-center overflow-y-auto">
            {/* Mascot reaction & Question Meta */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shrink-0">
                  <img
                    src={
                      isAnswerSubmitted
                        ? (selectedOption === currentQuestion.answer
                            ? '/assets/mascots/blitz/eagle_cheering_stars.svg'
                            : '/assets/mascots/blitz/eagle_idle.svg')
                        : streakCount >= 3
                        ? '/assets/mascots/blitz/eagle_flying_speed.svg'
                        : '/assets/mascots/blitz/eagle_idle.svg'
                    }
                    alt="Blitz Eagle"
                    className="w-full h-full object-contain filter drop-shadow-md"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-600/30 text-blue-300 text-[11px] font-bold border border-blue-500/30 uppercase tracking-wider">
                      {currentQuestion.topic || activeSubject}
                    </span>
                    <span className="text-xs text-amber-400 font-bold">
                      JAMB {currentQuestion.year || '2026'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    Question {currentQuestionIndex + 1} of {activeQuestionList.length}
                  </span>
                </div>
              </div>

              {/* Direct workings image upload toggle */}
              <label className="cursor-pointer text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5 p-2 rounded-xl hover:bg-slate-900/60 transition">
                <Upload size={14} />
                <span className="hidden sm:inline">Upload Workings</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSimulatedImageUpload}
                  className="hidden"
                />
              </label>
            </div>

            {uploadedImageName && (
              <div className="mb-3 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Worked solution attached: {uploadedImageName}
              </div>
            )}

            {/* Question Stem (Large, Prominent Typography) */}
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white leading-relaxed mb-6 sm:mb-8 whitespace-pre-line tracking-tight">
              {currentQuestion.question}
            </h2>

            {/* Duolingo Option Tiles (A, B, C, D) */}
            {currentQuestion.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>).map(optKey => {
                  const optText = currentQuestion.options?.[optKey];
                  const isSelected = selectedOption === optKey;
                  const isCorrect = isAnswerSubmitted && optKey === currentQuestion.answer;
                  const isWrong = isAnswerSubmitted && isSelected && optKey !== currentQuestion.answer;
                  const isOther = isAnswerSubmitted && !isSelected && !isCorrect;

                  return (
                    <button
                      key={optKey}
                      onClick={() => handleSelectOption(optKey)}
                      disabled={isAnswerSubmitted}
                      className={`p-4 sm:p-5 rounded-2xl border-2 border-b-4 text-left font-bold text-sm sm:text-base flex items-start gap-3.5 transition-all cursor-pointer ${
                        isCorrect
                          ? 'bg-emerald-950/60 border-emerald-500 border-b-emerald-600 text-emerald-200'
                          : isWrong
                          ? 'bg-red-950/60 border-red-500 border-b-red-600 text-red-200'
                          : isSelected
                          ? 'bg-blue-600/20 border-blue-500 border-b-blue-600 text-white ring-2 ring-blue-500/30'
                          : isOther
                          ? 'opacity-35 bg-slate-900/50 border-slate-800 border-b-slate-800 text-slate-400'
                          : 'bg-slate-900/80 border-slate-800 border-b-slate-900 text-slate-200 hover:border-amber-400 hover:bg-amber-400/10 hover:text-amber-200 hover:border-b-amber-500'
                      }`}
                    >
                      <span className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl shrink-0 flex items-center justify-center font-black text-sm border transition-colors ${
                        isCorrect
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : isWrong
                          ? 'bg-red-500 text-white border-red-400'
                          : isSelected
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {optKey}
                      </span>
                      <span className="flex-1 mt-1 leading-snug">{optText}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* DUOLINGO FIXED BOTTOM ACTION DOCK */}
          <div className={`w-full border-t transition-all duration-300 px-4 sm:px-8 py-4 sm:py-5 ${
            !isAnswerSubmitted
              ? 'bg-[#0B1222] border-slate-800 text-white'
              : selectedOption === currentQuestion.answer
              ? 'bg-[#052E16] border-t-2 border-emerald-500 text-white'
              : 'bg-[#2D0A11] border-t-2 border-red-500 text-white'
          }`}>
            <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {!isAnswerSubmitted ? (
                <>
                  <button
                    onClick={() => {
                      sound.playTap();
                      handleNextQuestion();
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Skip Question
                  </button>

                  <button
                    onClick={handleCheckAnswer}
                    disabled={!selectedOption}
                    className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all ${
                      selectedOption
                        ? 'bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white shadow-xl shadow-blue-600/30 hover:shadow-amber-400/30 cursor-pointer transform hover:scale-[1.02] active:scale-95'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/60 shadow-none cursor-not-allowed opacity-60'
                    }`}
                  >
                    Check Answer
                  </button>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    {selectedOption === currentQuestion.answer ? (
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black text-xl shrink-0">
                          ✓
                        </div>
                        <div>
                          <h4 className="text-base font-black text-emerald-300">Excellent! +20 XP</h4>
                          <p className="text-xs text-emerald-100 font-medium">
                            Streak: {streakCount}x · {currentQuestion.explanation}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-red-500 text-white flex items-center justify-center font-black text-xl shrink-0">
                          ✕
                        </div>
                        <div>
                          <h4 className="text-base font-black text-red-300">
                            Correct Answer: Option {currentQuestion.answer}
                          </h4>
                          <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5">
                            {currentQuestion.explanation}
                          </p>
                          {currentQuestion.explanation_pidgin && (
                            <p className="text-[11px] text-amber-300 font-semibold mt-1">
                              <strong>Pidgin tip:</strong> {currentQuestion.explanation_pidgin}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    autoFocus
                    className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-wider cursor-pointer transform hover:scale-[1.02] active:scale-95 shadow-xl transition-all ${
                      selectedOption === currentQuestion.answer
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/30'
                        : 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/30'
                    }`}
                  >
                    Continue →
                  </button>
                </>
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
