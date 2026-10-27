import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Flame, 
  Star, 
  Target, 
  Calculator, 
  Settings, 
  X, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  Volume2, 
  VolumeX, 
  Compass, 
  BookOpen, 
  HelpCircle,
  Building,
  GraduationCap
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { useTheme } from '../app/ThemeProvider';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import JAMBCalculatorModal from '../components/mobile/JAMBCalculatorModal';

// Road Branches Structure
interface SmartBranchLevel {
  id: number;
  branch: 'straight' | 'left' | 'right';
  title: string;
  subjectTag: SubjectName;
  topic: string;
  unlocked: boolean;
  completed: boolean;
  stars: number;
  buildingType?: 'library' | 'lab';
}

const ROAD_LEVELS: SmartBranchLevel[] = [
  { id: 1, branch: 'straight', title: 'Citadel Gate Milestone', subjectTag: 'English Language', topic: 'Lexis & Concord', unlocked: true, completed: true, stars: 3, buildingType: 'library' },
  { id: 2, branch: 'left', title: 'West Quad: Quantitative Branch', subjectTag: 'Mathematics', topic: 'Calculus & Quadratics', unlocked: true, completed: true, stars: 2, buildingType: 'lab' },
  { id: 3, branch: 'straight', title: 'Central Hall: Mechanics Nexus', subjectTag: 'Physics', topic: 'Waves & Projectiles', unlocked: true, completed: false, stars: 0, buildingType: 'lab' },
  { id: 4, branch: 'right', title: 'East Quad: Chemical Foundations', subjectTag: 'Chemistry', topic: 'Organic Reactions', unlocked: false, completed: false, stars: 0, buildingType: 'library' },
  { id: 5, branch: 'straight', title: 'Main Campus: Comprehension Passage', subjectTag: 'English Language', topic: 'Structure & Registers', unlocked: false, completed: false, stars: 0, buildingType: 'library' },
  { id: 6, branch: 'left', title: 'Engineering Wing: Trigonometry', subjectTag: 'Mathematics', topic: 'Geometry & Bearing', unlocked: false, completed: false, stars: 0, buildingType: 'lab' },
  { id: 7, branch: 'right', title: 'Science Laboratory: Optics & Heat', subjectTag: 'Physics', topic: 'Thermal Dynamics', unlocked: false, completed: false, stars: 0, buildingType: 'lab' },
  { id: 8, branch: 'straight', title: 'Grand Senate Checkpoint', subjectTag: 'Chemistry', topic: 'Equilibrium & Acids', unlocked: false, completed: false, stars: 0, buildingType: 'library' },
];

export function SmartPracticePage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // Selected level & study room state
  const [activeLevel, setActiveLevel] = useState<SmartBranchLevel | null>(null);
  const [isStudyRoomOpen, setIsStudyRoomOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<'all' | 'straight' | 'left' | 'right'>('all');

  // Study Room Question & Mascot State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [theoryAnswer, setTheoryAnswer] = useState('');
  const [uploadedImageName, setUploadedImageName] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [mascotMood, setMascotMood] = useState<'studying' | 'celebrating' | 'scratching'>('studying');
  const [score, setScore] = useState(0);
  const [isLevelCleared, setIsLevelCleared] = useState(false);

  // Road levels filtered by branch if user chooses
  const visibleLevels = useMemo(() => {
    if (selectedBranchFilter === 'all') return ROAD_LEVELS;
    return ROAD_LEVELS.filter(lvl => lvl.branch === selectedBranchFilter);
  }, [selectedBranchFilter]);

  // Mixed 4-subject question pool for the selected level
  const roomQuestions: Question[] = useMemo(() => {
    if (!activeLevel) return [];
    // Prioritize active level's subject + blend in other default subjects
    const primary = SEED_QUESTIONS.filter(q => q.subject === activeLevel.subjectTag);
    const others = SEED_QUESTIONS.filter(q => q.subject !== activeLevel.subjectTag);
    const combined = [...primary.slice(0, 7), ...others.slice(0, 3)];
    return combined.length > 0 ? combined : SEED_QUESTIONS.slice(0, 10);
  }, [activeLevel]);

  const currentQuestion: Question | undefined = roomQuestions[currentQuestionIndex];

  const handleOpenLevel = (level: SmartBranchLevel) => {
    if (!level.unlocked) return;
    sound.playTap();
    setActiveLevel(level);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setTheoryAnswer('');
    setUploadedImageName(null);
    setIsAnswerSubmitted(false);
    setMascotMood('studying');
    setScore(0);
    setIsLevelCleared(false);
    setIsStudyRoomOpen(true);
  };

  const handleOptionSubmit = (choice: string | null) => {
    if (isAnswerSubmitted || !currentQuestion) return;

    setSelectedOption(choice);
    setIsAnswerSubmitted(true);

    const isCorrect = choice === currentQuestion.answer;
    if (isCorrect) {
      sound.playCorrect();
      setScore(prev => prev + 1);
      setMascotMood('celebrating');
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } else {
      sound.playIncorrect();
      setMascotMood('scratching');
    }
  };

  const handleNextQuestion = () => {
    sound.playTap();
    if (currentQuestionIndex + 1 < roomQuestions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedOption(null);
      setTheoryAnswer('');
      setUploadedImageName(null);
      setIsAnswerSubmitted(false);
      setMascotMood('studying');
    } else {
      setIsLevelCleared(true);
      sound.playLevelUp();
      confetti({ particleCount: 100, spread: 80, origin: { y: 0.5 } });
    }
  };

  const handleSimulatedImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImageName(e.target.files[0].name);
      sound.playTap();
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'} transition-colors duration-200 flex flex-col`}>
      {/* ======================================================== */}
      {/* TOPBAR: SMART ROAD DASHBOARD */}
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
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse inline-block" />
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-blue-900 dark:text-white">
              SMART PRACTICE ROAD
            </h1>
          </div>
        </div>

        {/* Gamified Header Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-500 text-xs font-bold">
            <Compass size={14} className="text-blue-500" />
            <span>4 Subjects Merged</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black">
            <Flame size={14} className="text-amber-500" />
            <span>LEVEL 3 ACTIVE</span>
          </div>
        </div>
      </header>

      {/* ======================================================== */}
      {/* ROAD INTRO & FORWARD BRANCH CONTROLS */}
      {/* ======================================================== */}
      <div className={`px-4 py-4 border-b ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200'}`}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400">
              Interactive Branching Roadmap
            </span>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Follow the road as it branches straight, left, and right past campus faculties. Click any level to enter the Study Room.
            </p>
          </div>

          {/* Branch Navigation Pills */}
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {(['all', 'straight', 'left', 'right'] as const).map(b => (
              <button
                key={b}
                onClick={() => setSelectedBranchFilter(b)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                  selectedBranchFilter === b
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {b === 'all' ? 'All Roads' : `${b} Branch`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* THE CAMPUS ROAD WITH BRANCHES & ANIMATED BUILDINGS */}
      {/* ======================================================== */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 relative">
        <div className="relative flex flex-col items-center space-y-16 py-6">
          
          {/* Animated Road Pavement Surface SVG */}
          <div className="absolute inset-y-0 w-32 sm:w-44 bg-slate-200 dark:bg-slate-800/60 rounded-3xl -z-10 border-x-4 border-dashed border-amber-400/30 overflow-hidden">
            <div className="w-full h-full opacity-10 bg-[radial-gradient(#F59E0B_2px,transparent_2px)] [background-size:20px_20px]" />
          </div>

          {visibleLevels.map((lvl, index) => {
            const isLeft = lvl.branch === 'left';
            const isRight = lvl.branch === 'right';
            const isStraight = lvl.branch === 'straight';

            // Branch offset placement
            const placementClass = isLeft
              ? '-translate-x-24 sm:-translate-x-36'
              : isRight
              ? 'translate-x-24 sm:translate-x-36'
              : 'translate-x-0';

            const isCurrent = lvl.unlocked && !lvl.completed;

            return (
              <div
                key={lvl.id}
                className={`relative w-full max-w-lg flex items-center justify-between ${placementClass} transition-transform duration-300`}
              >
                {/* Left Side Building: Library or Science Lab */}
                {isLeft && (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 mr-4 animate-pulse-slow">
                    <img
                      src={lvl.buildingType === 'lab' ? '/assets/environment/campus_lab_building.svg' : '/assets/environment/campus_library_building.svg'}
                      alt="Campus Faculty"
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>
                )}

                {/* Road Level Checkpoint Card */}
                <div className="flex-1 flex flex-col items-center">
                  {/* Current Active Indicator with Student Icon */}
                  {isCurrent && (
                    <div className="mb-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-wider uppercase animate-bounce flex items-center gap-1 shadow-md">
                      <GraduationCap size={12} /> CURRENT CHECKPOINT
                    </div>
                  )}

                  <button
                    onClick={() => handleOpenLevel(lvl)}
                    disabled={!lvl.unlocked}
                    className={`w-20 h-20 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 transform ${
                      !lvl.unlocked
                        ? 'bg-slate-300 dark:bg-slate-800 text-slate-400 cursor-not-allowed opacity-75'
                        : lvl.completed
                        ? 'bg-gradient-to-tr from-amber-400 to-amber-500 text-slate-950 shadow-[0_6px_0_#B45309] hover:-translate-y-1'
                        : isCurrent
                        ? 'bg-gradient-to-tr from-blue-600 to-blue-700 text-white shadow-[0_8px_0_#1E3A8A] scale-110 ring-4 ring-amber-400 animate-pulse hover:-translate-y-1'
                        : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-2 border-blue-400 shadow-[0_6px_0_#CBD5E1]'
                    }`}
                  >
                    <span className="font-display font-black text-2xl">{lvl.id}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">{lvl.branch}</span>
                  </button>

                  {/* Level Details Tag */}
                  <div className="mt-2 text-center">
                    <span className="text-xs font-black block text-slate-800 dark:text-slate-200">
                      {lvl.title}
                    </span>
                    <span className="text-[10px] font-bold text-blue-600 dark:text-amber-400">
                      {lvl.subjectTag} · {lvl.topic}
                    </span>
                  </div>
                </div>

                {/* Right Side Building: Library or Science Lab */}
                {(isRight || isStraight) && (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 ml-4 animate-pulse-slow">
                    <img
                      src={lvl.buildingType === 'lab' ? '/assets/environment/campus_lab_building.svg' : '/assets/environment/campus_library_building.svg'}
                      alt="Campus Faculty"
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ======================================================== */}
      {/* THE SMART STUDY ROOM: ROOM-LIKE PAGE WITH STUDENT MASCOT */}
      {/* ======================================================== */}
      {isStudyRoomOpen && currentQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-between overflow-y-auto">
          {/* Study Room Top Navigation */}
          <div className="w-full bg-[#0E1526] border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsStudyRoomOpen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Exit Study Room"
              >
                <X size={18} />
              </button>
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Study Room · Level {activeLevel?.id} ({activeLevel?.branch} Branch)
                </span>
                <span className="text-sm font-extrabold text-white">
                  Question {currentQuestionIndex + 1} of {roomQuestions.length}
                </span>
              </div>
            </div>

            {/* Popout Calculator Button */}
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black flex items-center gap-2 transition shadow-md"
            >
              <Calculator size={15} />
              <span>Desk Calculator</span>
            </button>
          </div>

          {/* Study Room Canvas */}
          <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* Left Column: Animated Student Mascot at Study Desk */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center">
              <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-blue-900/60 to-slate-900 border-2 border-blue-500/30 p-6 flex flex-col items-center justify-center shadow-2xl">
                {/* Desk Mascot SVG based on answer state */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                  <img
                    src={
                      mascotMood === 'celebrating'
                        ? '/assets/mascots/smart/student_desk_celebrating.svg'
                        : mascotMood === 'scratching'
                        ? '/assets/mascots/smart/student_desk_scratching_head.svg'
                        : '/assets/mascots/smart/student_desk_studying.svg'
                    }
                    alt="Student Mascot Studying"
                    className="w-full h-full object-contain filter drop-shadow-xl animate-pulse-slow"
                  />

                  {/* Interactive Calculator sitting on the desk! */}
                  <button
                    onClick={() => setIsCalculatorOpen(true)}
                    className="absolute -bottom-2 right-4 w-12 h-12 rounded-xl bg-slate-900 border-2 border-amber-400 p-1 shadow-lg hover:scale-110 transition-transform"
                    title="Click Table Calculator"
                  >
                    <img
                      src="/assets/mascots/smart/desk_calculator_prop.svg"
                      alt="Calculator Prop"
                      className="w-full h-full object-contain"
                    />
                  </button>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Sabi Study Room Simulator
                  </span>
                  <p className="text-xs text-slate-300 mt-1">
                    {mascotMood === 'celebrating'
                      ? '🎉 "Brilliant! You mastered this question!"'
                      : mascotMood === 'scratching'
                      ? '🤔 "Tricky one! Let us break down the formula together."'
                      : '📖 "Take your time. Inspect the workings carefully."'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Enlarged Question & Interactive Response */}
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="bg-[#10192E] border-2 border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-4 pb-3 border-b border-slate-800">
                  <span className="px-2.5 py-1 rounded-md bg-blue-900/60 text-blue-300">
                    {currentQuestion.subject} · {currentQuestion.topic}
                  </span>
                  <span className="text-amber-400 font-mono">UTME Mastery Drill</span>
                </div>

                {/* Enlarged Question Text */}
                <h3 className="text-xl sm:text-2xl font-black leading-relaxed mb-6 text-slate-100 whitespace-pre-line">
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
                          className={`p-4 rounded-2xl border-2 text-left font-bold text-sm sm:text-base flex items-start gap-3 transition-all cursor-pointer ${
                            isCorrect
                              ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                              : isWrong
                              ? 'bg-red-600/20 border-red-500 text-red-300'
                              : isSelected
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                              : 'bg-slate-900/80 border-slate-800 hover:border-amber-400 hover:bg-amber-400/10 hover:text-amber-300 text-slate-200'
                          }`}
                        >
                          <span className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-black text-sm ${
                            isCorrect
                              ? 'bg-emerald-500 text-slate-950'
                              : isWrong
                              ? 'bg-red-500 text-white'
                              : isSelected
                              ? 'bg-white text-blue-900'
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

                {/* Theory Answer Inbox & Upload Box */}
                <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400">
                      Workings & Formula Inbox:
                    </span>
                    <label className="cursor-pointer text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1.5">
                      <Upload size={13} />
                      <span>Upload Paper Workings</span>
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
                      placeholder="Type step-by-step formula or solution..."
                      onChange={e => setTheoryAnswer(e.target.value)}
                      disabled={isAnswerSubmitted}
                      className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm font-bold text-white focus:outline-hidden focus:border-amber-400"
                    />
                    {!isAnswerSubmitted && (
                      <button
                        onClick={() => handleOptionSubmit('A')}
                        className="px-5 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider"
                      >
                        Submit
                      </button>
                    )}
                  </div>

                  {uploadedImageName && (
                    <div className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
                      <CheckCircle2 size={13} /> Paper workings attached: {uploadedImageName}
                    </div>
                  )}
                </div>

                {/* Pedagogical Step-by-Step Breakdown */}
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
                            <span className="text-emerald-400">Correct Answer!</span>
                          </>
                        ) : (
                          <>
                            <XCircle size={18} className="text-red-400" />
                            <span className="text-red-400">Answer Correction: Option {currentQuestion.answer}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm leading-relaxed text-slate-200 mt-2">
                      {currentQuestion.explanation}
                    </p>

                    {currentQuestion.explanation_pidgin && (
                      <div className="mt-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/60 text-xs text-amber-300">
                        <strong>Student Pidgin Breakdown:</strong> {currentQuestion.explanation_pidgin}
                      </div>
                    )}

                    <div className="mt-5 flex justify-end">
                      <button
                        onClick={handleNextQuestion}
                        className="px-8 py-3.5 rounded-xl font-black text-sm bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white shadow-lg shadow-blue-600/30 hover:shadow-amber-400/30 transition flex items-center gap-2 cursor-pointer transform hover:scale-[1.02] active:scale-95"
                      >
                        <span>Continue Practice →</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pop-Out Calculator Modal */}
      <JAMBCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}

export default SmartPracticePage;
