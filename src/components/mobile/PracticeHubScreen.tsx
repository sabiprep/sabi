import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, BookOpen, SlidersHorizontal, AlertCircle, TimerReset,
  ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, XCircle,
  Clock, Flag, HelpCircle, RotateCcw, Award, Check, Layers, Play,
  Calculator, BookMarked, FileText, ChevronDown, ChevronUp, Filter
} from 'lucide-react';
import { SubjectName, Question } from '../../types';
import { SEED_QUESTIONS } from '../../data/questions';
import MathText from '../MathText';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/soundEffects';
import { saveMistakeRecord, getMistakeRecords } from '../../utils/mistakeStore';
import JAMBCalculatorModal from './JAMBCalculatorModal';
import MistakeNotebookModal from './MistakeNotebookModal';
import FormulaCheatSheetModal from './FormulaCheatSheetModal';

interface PracticeHubScreenProps {
  initialSubject?: SubjectName;
  onOpenAITutor: (subject: SubjectName, topic: string) => void;
  onAddXP: (amount: number) => void;
}

type Mode = 'hub' | 'active_session' | 'results';
type QuestionFilter = 'all' | 'answered' | 'unanswered' | 'marked';

export default function PracticeHubScreen({
  initialSubject = 'English Language',
  onOpenAITutor,
  onAddXP,
}: PracticeHubScreenProps) {
  const [mode, setMode] = useState<Mode>('hub');
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>(initialSubject);
  const [selectedTopic, setSelectedTopic] = useState<string>('All topics');
  const [selectedYear, setSelectedYear] = useState<string>('All Years');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isTimed, setIsTimed] = useState<boolean>(true);

  // Active Session State
  const [currentQuestions, setCurrentQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<number, boolean>>({});
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [showPidgin, setShowPidgin] = useState<boolean>(false);
  const [showGridDrawer, setShowGridDrawer] = useState<boolean>(false);
  const [drawerFilter, setDrawerFilter] = useState<QuestionFilter>('all');
  const [timeLeftSeconds, setTimeLeftSeconds] = useState<number>(600);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);

  // Modals & Tools
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);

  // Results review accordion
  const [expandedResultIdx, setExpandedResultIdx] = useState<number | null>(null);
  const [resultPidginIdx, setResultPidginIdx] = useState<Record<number, boolean>>({});

  // Get distinct topics for selected subject
  const availableTopics = useMemo(() => {
    const set = new Set<string>();
    SEED_QUESTIONS.filter(q => q.subject === selectedSubject).forEach(q => {
      if (q.topic) set.add(q.topic);
    });
    return ['All topics', ...Array.from(set)];
  }, [selectedSubject]);

  // Mistakes count
  const mistakeCount = useMemo(() => {
    const list = getMistakeRecords();
    return list.filter(r => !r.mastered).length;
  }, [mode, isMistakeNotebookOpen]);

  // Timer loop
  useEffect(() => {
    if (mode !== 'active_session' || !isTimed || !isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeLeftSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishSession();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, isTimed, isTimerRunning]);

  // Start Session Helper
  const startSession = (subj: SubjectName, filterTopic?: string, count: number = 10, yearFilter?: string) => {
    sound.playTap();
    let pool = SEED_QUESTIONS.filter(q => q.subject === subj);

    if (filterTopic && filterTopic !== 'All topics') {
      pool = pool.filter(q =>
        q.topic.toLowerCase().includes(filterTopic.toLowerCase()) ||
        q.subtopic.toLowerCase().includes(filterTopic.toLowerCase())
      );
    }

    if (yearFilter && yearFilter !== 'All Years' && yearFilter !== 'Mixed') {
      const yrNum = parseInt(yearFilter, 10);
      if (!isNaN(yrNum)) {
        const byYr = pool.filter(q => q.year === yrNum);
        if (byYr.length > 0) pool = byYr;
      }
    }

    if (pool.length === 0) {
      pool = SEED_QUESTIONS.filter(q => q.subject === subj);
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, Math.min(count, pool.length));
    setCurrentQuestions(shuffled);
    setCurrentIndex(0);
    setUserAnswers({});
    setMarkedForReview({});
    setShowExplanation(false);
    setShowPidgin(false);
    setTimeLeftSeconds(shuffled.length * 60);
    setIsTimerRunning(true);
    setMode('active_session');
  };

  // Launch custom drill with specific question array (from Mistake Notebook)
  const handleStartCustomList = (questions: Question[]) => {
    if (questions.length === 0) return;
    setCurrentQuestions(questions);
    setCurrentIndex(0);
    setUserAnswers({});
    setMarkedForReview({});
    setShowExplanation(false);
    setShowPidgin(false);
    setTimeLeftSeconds(questions.length * 60);
    setIsTimerRunning(true);
    setMode('active_session');
  };

  const handleSelectOption = (optionKey: string) => {
    setUserAnswers(prev => ({ ...prev, [currentIndex]: optionKey }));
    setShowExplanation(true);
    const q = currentQuestions[currentIndex];
    if (q) {
      if (optionKey === q.answer) {
        sound.playCorrect();
      } else {
        sound.playWrong();
        // Log mistake into Mistake Notebook
        saveMistakeRecord(q, optionKey);
      }
    }
  };

  const handleToggleMark = () => {
    sound.playTap();
    setMarkedForReview(prev => ({ ...prev, [currentIndex]: !prev[currentIndex] }));
  };

  const handleFinishSession = () => {
    setMode('results');
    const correctCount = currentQuestions.reduce((acc, q, idx) => {
      return userAnswers[idx] === q.answer ? acc + 1 : acc;
    }, 0);
    const scorePct = Math.round((correctCount / currentQuestions.length) * 100);
    if (scorePct >= 70) {
      sound.playCelebration();
      confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
    } else {
      sound.playTap();
    }
    onAddXP(correctCount * 10 + 20);
  };

  const currentQ = currentQuestions[currentIndex];

  // Filtered indices for Question Navigator Drawer
  const filteredIndices = useMemo(() => {
    return currentQuestions.map((_, idx) => idx).filter(idx => {
      const isAns = userAnswers[idx] !== undefined;
      const isMkd = markedForReview[idx] || false;
      if (drawerFilter === 'answered') return isAns;
      if (drawerFilter === 'unanswered') return !isAns;
      if (drawerFilter === 'marked') return isMkd;
      return true;
    });
  }, [currentQuestions, userAnswers, markedForReview, drawerFilter]);

  // ================= 1. HUB VIEW =================
  if (mode === 'hub') {
    return (
      <div className="p-4 space-y-4 pb-20">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            Phase 3 · CBT Engine
          </span>
          <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">
            Practice & Test Hub
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Real CBT simulation with authentic on-screen calculator & syllabus mastery.
          </p>
        </div>

        {/* Quick Tools Row (Calculator, Mistake Notebook, Cheat Sheet) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => {
              sound.playTap();
              setIsCalculatorOpen(true);
            }}
            className="p-3 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-1">
              <Calculator size={16} />
            </div>
            <span className="text-[11px] font-black text-slate-900 dark:text-white">
              CBT Calc
            </span>
            <span className="text-[9px] text-slate-400 font-bold">8-digit basic</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setIsMistakeNotebookOpen(true);
            }}
            className="relative p-3 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition"
          >
            {mistakeCount > 0 && (
              <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-full bg-red-500 text-[9px] font-black text-white">
                {mistakeCount}
              </span>
            )}
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center mb-1">
              <BookMarked size={16} />
            </div>
            <span className="text-[11px] font-black text-slate-900 dark:text-white">
              Mistakes
            </span>
            <span className="text-[9px] text-slate-400 font-bold">Review queue</span>
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setIsCheatSheetOpen(true);
            }}
            className="p-3 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-1">
              <FileText size={16} />
            </div>
            <span className="text-[11px] font-black text-slate-900 dark:text-white">
              Cheat Sheet
            </span>
            <span className="text-[9px] text-slate-400 font-bold">Formulas</span>
          </button>
        </div>

        {/* 1. Smart Adaptive Practice Card (Primary CTA) */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-800 p-5 text-white shadow-md shadow-emerald-900/20">
          <div className="flex items-start justify-between">
            <span className="px-2.5 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-wider">
              AI Adaptive Mode
            </span>
            <Sparkles size={20} className="text-emerald-200" />
          </div>

          <h2 className="mt-3 font-display text-lg font-black leading-tight">
            Smart Adaptive Drill
          </h2>
          <p className="mt-1 text-xs text-emerald-100 leading-snug">
            SABI automatically selects high-yield questions matching your personal syllabus gaps in <strong>{selectedSubject}</strong>.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={() => startSession(selectedSubject, undefined, 10)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-emerald-900 font-black text-xs shadow-sm active:scale-95 transition"
            >
              <Play size={13} className="fill-emerald-900" />
              <span>Start 10 Qs Drill</span>
            </button>
            <button
              onClick={() => startSession(selectedSubject, undefined, 20)}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white/15 text-white font-bold text-xs hover:bg-white/25 active:scale-95 transition"
            >
              <span>20 Qs Marathon</span>
            </button>
          </div>
        </div>

        {/* 2. Custom Topic Practice Configuration Card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <SlidersHorizontal size={16} />
              </div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                Topic & Year Drill
              </h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400">Customized</span>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Target Subject
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              {(['English Language', 'Mathematics', 'Physics', 'Chemistry'] as SubjectName[]).map(sub => (
                <button
                  key={sub}
                  onClick={() => {
                    sound.playTap();
                    setSelectedSubject(sub);
                    setSelectedTopic('All topics');
                  }}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold text-left transition border ${
                    selectedSubject === sub
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                      : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>

          {/* Specific Syllabus Topic Selector */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Syllabus Topic
            </label>
            <select
              value={selectedTopic}
              onChange={e => {
                sound.playTap();
                setSelectedTopic(e.target.value);
              }}
              className="mt-1 w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
            >
              {availableTopics.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Question Count & Time */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Question Count
              </label>
              <select
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                className="mt-1 w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value={5}>5 Questions (Express)</option>
                <option value={10}>10 Questions (Standard)</option>
                <option value={15}>15 Questions (Thorough)</option>
                <option value={20}>20 Questions (Deep)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Past Question Year
              </label>
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="mt-1 w-full p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="All Years">All Years (Mixed)</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
                <option value="2022">2022</option>
                <option value="2021">2021</option>
                <option value="2020">2020</option>
                <option value="2019">2019</option>
                <option value="2018">2018</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => startSession(selectedSubject, selectedTopic, questionCount, selectedYear)}
            className="w-full mt-2 py-3 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
          >
            <span>Launch {selectedSubject} Drill</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* 3. Past Question Archives Quick Shelf */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              JAMB Past Questions Archive
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              Verified Keys
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {['2024', '2023', '2022', '2021'].map(year => (
              <button
                key={year}
                onClick={() => {
                  setSelectedYear(year);
                  startSession(selectedSubject, undefined, 10, year);
                }}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-center active:scale-95 transition"
              >
                <p className="font-display text-xs font-black text-slate-900 dark:text-white">
                  {year}
                </p>
                <p className="text-[9px] text-slate-400 font-bold">JAMB</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sub-modals */}
        <JAMBCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
        <MistakeNotebookModal
          isOpen={isMistakeNotebookOpen}
          onClose={() => setIsMistakeNotebookOpen(false)}
          onStartRetest={handleStartCustomList}
          onOpenAITutor={onOpenAITutor}
        />
        <FormulaCheatSheetModal
          isOpen={isCheatSheetOpen}
          onClose={() => setIsCheatSheetOpen(false)}
        />
      </div>
    );
  }

  // ================= 2. ACTIVE SESSION VIEW =================
  if (mode === 'active_session' && currentQ) {
    const isAnswered = userAnswers[currentIndex] !== undefined;
    const isMarked = markedForReview[currentIndex] || false;
    const minutes = Math.floor(timeLeftSeconds / 60);
    const seconds = timeLeftSeconds % 60;
    const timeFormatted = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    return (
      <div className="flex-1 flex flex-col p-4 space-y-3 pb-20">
        {/* Top Session Status Bar */}
        <div className="flex items-center justify-between gap-1 border-b border-slate-200 dark:border-slate-800 pb-2.5">
          <button
            onClick={() => {
              sound.playTap();
              setMode('hub');
            }}
            className="flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900"
          >
            <ChevronLeft size={16} />
            <span>Exit</span>
          </button>

          {/* Timer Display */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black ${
              timeLeftSeconds < 120
                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 animate-pulse'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Clock size={12} />
            <span>{timeFormatted}</span>
          </div>

          {/* Top Quick Tools: Calc, Mark, Drawer */}
          <div className="flex items-center gap-1.5">
            {/* JAMB Calculator Button */}
            <button
              onClick={() => {
                sound.playTap();
                setIsCalculatorOpen(true);
              }}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-[11px] font-bold"
              title="Open JAMB Calculator"
            >
              <Calculator size={13} className="text-emerald-500" />
              <span>Calc</span>
            </button>

            {/* Mark for Review */}
            <button
              onClick={handleToggleMark}
              className={`p-1.5 rounded-lg border transition ${
                isMarked
                  ? 'bg-amber-50 border-amber-400 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400'
              }`}
              title="Mark for review"
            >
              <Flag size={14} className={isMarked ? 'fill-current' : ''} />
            </button>

            {/* Question Palette Drawer Toggle */}
            <button
              onClick={() => {
                sound.playTap();
                setShowGridDrawer(!showGridDrawer);
              }}
              className="px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1"
            >
              <Layers size={13} />
              <span>{currentIndex + 1}/{currentQuestions.length}</span>
            </button>
          </div>
        </div>

        {/* Slide-Down Question Palette Drawer */}
        {showGridDrawer && (
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-top-2 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Question Navigator
              </span>
              <button
                onClick={() => setShowGridDrawer(false)}
                className="text-[10px] font-black text-emerald-600"
              >
                Close
              </button>
            </div>

            {/* Filter Chips inside Drawer */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar text-[10px] font-bold">
              {[
                { id: 'all', label: `All (${currentQuestions.length})` },
                { id: 'answered', label: `Answered (${Object.keys(userAnswers).length})` },
                { id: 'unanswered', label: `Unanswered (${currentQuestions.length - Object.keys(userAnswers).length})` },
                { id: 'marked', label: `Marked (${Object.values(markedForReview).filter(Boolean).length})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setDrawerFilter(tab.id as QuestionFilter)}
                  className={`px-2 py-0.5 rounded-md transition ${
                    drawerFilter === tab.id
                      ? 'bg-slate-900 dark:bg-emerald-600 text-white'
                      : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {filteredIndices.map(idx => {
                const q = currentQuestions[idx];
                const ans = userAnswers[idx];
                const marked = markedForReview[idx];
                let bg = 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';

                if (ans !== undefined) {
                  bg = 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300 font-bold border-emerald-400';
                } else if (marked) {
                  bg = 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 font-bold border-amber-400';
                }

                if (idx === currentIndex) {
                  bg += ' ring-2 ring-emerald-500 font-black shadow-xs';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      sound.playTap();
                      setCurrentIndex(idx);
                      setShowExplanation(userAnswers[idx] !== undefined);
                      setShowGridDrawer(false);
                    }}
                    className={`h-8 rounded-lg border text-xs flex items-center justify-center transition ${bg}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / currentQuestions.length) * 100}%` }}
          />
        </div>

        {/* Question Details Card */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              {currentQ.subject} · {currentQ.topic}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-slate-400">
                {currentQ.source || 'JAMB Past Question'}
              </span>
              <button
                onClick={() => {
                  sound.playTap();
                  setIsCheatSheetOpen(true);
                }}
                className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-0.5"
              >
                <FileText size={10} />
                <span>Formulas</span>
              </button>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
            <MathText text={currentQ.question} />
          </div>
        </div>

        {/* Options Selection */}
        <div className="space-y-2">
          {(Object.entries(currentQ.options) as [string, string][]).map(([letter, text]) => {
            const isSelected = userAnswers[currentIndex] === letter;
            const isCorrect = letter === currentQ.answer;

            let borderStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111A2E] text-slate-800 dark:text-slate-200';
            if (isAnswered) {
              if (isCorrect) {
                borderStyle = 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-200 font-bold';
              } else if (isSelected) {
                borderStyle = 'border-red-500 bg-red-50/80 dark:bg-red-950/80 text-red-900 dark:text-red-200';
              }
            } else if (isSelected) {
              borderStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold';
            }

            return (
              <button
                key={letter}
                onClick={() => handleSelectOption(letter)}
                className={`w-full p-3 rounded-2xl border text-xs text-left flex items-start gap-3 transition active:scale-98 ${borderStyle}`}
              >
                <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs font-black shrink-0">
                  {letter}
                </span>
                <span className="flex-1 pt-0.5">
                  <MathText text={text} />
                </span>
                {isAnswered && isCorrect && (
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                )}
                {isAnswered && isSelected && !isCorrect && (
                  <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Solution & Explanation Drawer */}
        {showExplanation && (
          <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-900 dark:text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-emerald-600" />
                {userAnswers[currentIndex] === currentQ.answer ? 'Correct Answer!' : 'Explanation & Syllabus Reference'}
              </span>
              <button
                onClick={() => {
                  sound.playTap();
                  setShowPidgin(!showPidgin);
                }}
                className="text-[10px] font-black underline text-emerald-700 dark:text-emerald-400"
              >
                {showPidgin ? 'Standard English' : 'Pidgin Mode 🇳🇬'}
              </button>
            </div>

            <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
              <MathText text={showPidgin ? currentQ.explanation_pidgin : currentQ.explanation} />
            </div>

            <div className="pt-1 flex items-center justify-between">
              {userAnswers[currentIndex] !== currentQ.answer && (
                <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                  <BookMarked size={11} /> Saved to Mistakes
                </span>
              )}
              <button
                onClick={() => onOpenAITutor(currentQ.subject, currentQ.topic)}
                className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline ml-auto"
              >
                <Sparkles size={12} />
                <span>Ask Sabi AI to break this down</span>
              </button>
            </div>
          </div>
        )}

        {/* Bottom Floating Navigation */}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <button
            disabled={currentIndex === 0}
            onClick={() => {
              sound.playTap();
              setCurrentIndex(prev => prev - 1);
              setShowExplanation(userAnswers[currentIndex - 1] !== undefined);
            }}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 disabled:opacity-40"
          >
            Previous
          </button>

          {currentIndex < currentQuestions.length - 1 ? (
            <button
              onClick={() => {
                sound.playTap();
                setCurrentIndex(prev => prev + 1);
                setShowExplanation(userAnswers[currentIndex + 1] !== undefined);
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1 active:scale-98 transition"
            >
              <span>Next Question</span>
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={handleFinishSession}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center justify-center gap-1 active:scale-98 transition"
            >
              <Check size={15} />
              <span>Submit Practice</span>
            </button>
          )}
        </div>

        {/* Sub-modals for active session */}
        <JAMBCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
        <FormulaCheatSheetModal
          isOpen={isCheatSheetOpen}
          onClose={() => setIsCheatSheetOpen(false)}
        />
      </div>
    );
  }

  // ================= 3. RESULTS VIEW =================
  if (mode === 'results') {
    const total = currentQuestions.length;
    const correct = currentQuestions.reduce((acc, q, idx) => (userAnswers[idx] === q.answer ? acc + 1 : acc), 0);
    const scorePct = Math.round((correct / total) * 100);

    return (
      <div className="p-4 space-y-4 pb-20 animate-in fade-in">
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mb-2 shadow-inner">
            <Award size={32} />
          </div>
          <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">
            {scorePct >= 70 ? 'Excellent Session!' : 'Session Complete!'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every practice question brings you closer to your 320+ JAMB target.
          </p>
        </div>

        {/* Scorecard */}
        <div className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-800">
            <div>
              <p className="font-display text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {scorePct}%
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Accuracy</p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-slate-900 dark:text-white">
                {correct} / {total}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Correct</p>
            </div>
            <div>
              <p className="font-display text-2xl font-black text-amber-500">
                +{correct * 10 + 20}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase">XP Earned</p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-500">Subject Mastery Delta</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">+4% in {selectedSubject}</span>
          </div>
        </div>

        {/* Interactive Question Review List with Expandable KaTeX Explanations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Interactive Question Review
            </h3>
            <span className="text-[10px] text-slate-400 font-bold">Tap to review steps</span>
          </div>

          {currentQuestions.map((q, idx) => {
            const isCorrect = userAnswers[idx] === q.answer;
            const isExpanded = expandedResultIdx === idx;
            const inPidgin = resultPidginIdx[idx] || false;

            return (
              <div
                key={q.id}
                className="rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs transition"
              >
                <button
                  onClick={() => {
                    sound.playTap();
                    setExpandedResultIdx(isExpanded ? null : idx);
                  }}
                  className="w-full p-3 flex items-center justify-between text-xs text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="font-bold text-slate-900 dark:text-white truncate">
                        {q.topic}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Picked {userAnswers[idx] || 'None'} · Answer {q.answer}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={16} className="text-red-500 shrink-0" />
                    )}
                    {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                  </div>
                </button>

                {/* Expanded Question Review */}
                {isExpanded && (
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-2.5 animate-in fade-in">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                      <MathText text={q.question} />
                    </div>

                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 space-y-1">
                      <div className="flex items-center justify-between font-bold text-[11px]">
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Syllabus Solution:
                        </span>
                        <button
                          onClick={() => {
                            sound.playTap();
                            setResultPidginIdx(prev => ({ ...prev, [idx]: !prev[idx] }));
                          }}
                          className="text-[10px] underline text-slate-500 hover:text-emerald-600"
                        >
                          {inPidgin ? 'English' : 'Pidgin Mode 🇳🇬'}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                        <MathText text={inPidgin ? q.explanation_pidgin : q.explanation} />
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={() => onOpenAITutor(q.subject, q.topic)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                      >
                        <Sparkles size={12} />
                        <span>Ask Sabi AI about this</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-2">
          <button
            onClick={() => startSession(selectedSubject, selectedTopic, questionCount)}
            className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <RotateCcw size={14} />
            <span>Practice Again</span>
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setMode('hub');
            }}
            className="px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}
