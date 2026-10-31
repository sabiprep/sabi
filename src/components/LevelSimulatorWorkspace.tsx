import React, { useState, useEffect } from 'react';
import {
  X,
  Clock,
  Flame,
  Calculator,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  BookOpenCheck,
  Award,
  Send,
  ShieldCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import MathText from './MathText';
import JAMBCalculatorModal from './mobile/JAMBCalculatorModal';
import type { Question, SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import {
  recordQuestionAttempt,
  recordLevelCompletion,
  UserRealProgress,
} from '../utils/userProgressStore';
import { saveMistake } from '../utils/mistakeStore';

interface LevelSimulatorWorkspaceProps {
  mode: 'blitz' | 'smart';
  levelId: number;
  levelTitle: string;
  subjectLabel: SubjectName | string;
  questions: Question[];
  secondsPerQuestion?: number; // Default 60s in Blitz, optional in Smart
  isGeneralTest?: boolean;
  onClose: () => void;
  onProgressUpdated: (next: UserRealProgress) => void;
}

export default function LevelSimulatorWorkspace({
  mode,
  levelId,
  levelTitle,
  subjectLabel,
  questions,
  secondsPerQuestion = 60,
  isGeneralTest = false,
  onClose,
  onProgressUpdated,
}: LevelSimulatorWorkspaceProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [submittedQuestions, setSubmittedQuestions] = useState<Record<number, boolean>>({});
  const [recordedQuestions, setRecordedQuestions] = useState<Record<number, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState(secondsPerQuestion);
  const [streakCount, setStreakCount] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Per-question popup solution + AI modal (available right after clicking Submit on a question, or from Final Solution Dashboard)
  const [activeAiQuestion, setActiveAiQuestion] = useState<Question | null>(null);
  const [aiLanguage, setAiLanguage] = useState<'english' | 'pidgin'>('english');
  const [aiPreference, setAiPreference] = useState<'detailed' | 'short'>('detailed');
  const [customAiQuery, setCustomAiQuery] = useState('');
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Final Level Solution Dashboard state (after clicking Final Submit at question 10 or 15)
  const [isFinalSubmitted, setIsFinalSubmitted] = useState(false);
  const [finalScoreSummary, setFinalScoreSummary] = useState<{
    correct: number;
    total: number;
    flawless: boolean;
    stars: number;
  } | null>(null);

  const currentQuestion = questions[currentIndex];
  const currentSelected = selectedAnswers[currentIndex] || null;
  const isCurrentSubmitted = Boolean(submittedQuestions[currentIndex]);
  const isLastQuestion = currentIndex === questions.length - 1;

  // Countdown timer per question
  useEffect(() => {
    if (isFinalSubmitted || isCurrentSubmitted) return;
    if (secondsRemaining <= 0) {
      // Auto-lock question when timer hits 0
      handleSubmitSingleQuestion();
      return;
    }
    const timer = setInterval(() => {
      setSecondsRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIndex, isFinalSubmitted, isCurrentSubmitted, secondsRemaining]);

  const handleSelectOption = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (isCurrentSubmitted || isFinalSubmitted) return;
    sound.playTap();
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: opt }));
  };

  const commitQuestionAttemptIfNeeded = (idx: number, choice?: 'A' | 'B' | 'C' | 'D') => {
    if (recordedQuestions[idx]) return;
    const q = questions[idx];
    if (!q) return;
    const chosen = choice ?? selectedAnswers[idx];
    const isCorrect = chosen === q.answer;
    const nextProg = recordQuestionAttempt(q.subject || subjectLabel, isCorrect, mode);
    onProgressUpdated(nextProg);

    if (!isCorrect && chosen) {
      saveMistake(q, chosen);
    }
    setRecordedQuestions(prev => ({ ...prev, [idx]: true }));
  };

  // User clicks "Submit Question" on the current question (without revealing immediately on option tap)
  const handleSubmitSingleQuestion = () => {
    if (!currentQuestion || isCurrentSubmitted) return;
    const chosen = selectedAnswers[currentIndex];
    setSubmittedQuestions(prev => ({ ...prev, [currentIndex]: true }));
    commitQuestionAttemptIfNeeded(currentIndex, chosen);

    const isCorrect = chosen === currentQuestion.answer;
    if (isCorrect) {
      sound.playCorrect();
      setStreakCount(prev => prev + 1);
    } else {
      sound.playIncorrect();
      setStreakCount(0);
    }
  };

  // User clicks "Next Question" (can move forward after selecting an option or after submitting)
  const handleNextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      sound.playTap();
      // If user selected an option and clicked Next directly, lock it in silently
      if (selectedAnswers[currentIndex] && !submittedQuestions[currentIndex]) {
        setSubmittedQuestions(prev => ({ ...prev, [currentIndex]: true }));
        commitQuestionAttemptIfNeeded(currentIndex, selectedAnswers[currentIndex]);
      }
      setCurrentIndex(prev => prev + 1);
      setSecondsRemaining(secondsPerQuestion);
    }
  };

  const handlePrevQuestion = () => {
    if (currentIndex > 0) {
      sound.playTap();
      setCurrentIndex(prev => prev - 1);
      setSecondsRemaining(secondsPerQuestion);
    }
  };

  // User clicks "Final Submit Level" at the end of the 10 or 15 questions
  const handleFinalSubmitLevel = () => {
    sound.playLevelUp();

    let correctTotal = 0;
    questions.forEach((q, idx) => {
      const chosen = selectedAnswers[idx];
      const isCorrect = chosen === q.answer;
      if (isCorrect) correctTotal += 1;
      if (!recordedQuestions[idx] && chosen) {
        const nextProg = recordQuestionAttempt(q.subject || subjectLabel, isCorrect, mode);
        onProgressUpdated(nextProg);
        if (!isCorrect) {
          saveMistake(q, chosen);
        }
      }
    });

    const total = questions.length;
    const flawless = total > 0 && correctTotal === total;
    const ratio = total > 0 ? correctTotal / total : 0;
    const starsEarned = flawless ? 3 : ratio >= 0.7 ? 2 : 1;

    const updatedProgress = recordLevelCompletion(mode, levelId, starsEarned, {
      subject: subjectLabel,
      correctCount: correctTotal,
      totalQuestions: total,
      isGeneralTest,
    });
    onProgressUpdated(updatedProgress);

    setFinalScoreSummary({
      correct: correctTotal,
      total,
      flawless,
      stars: starsEarned,
    });
    setIsFinalSubmitted(true);

    if (flawless) {
      confetti({ particleCount: 140, spread: 85, origin: { y: 0.5 } });
    } else if (ratio >= 0.6) {
      confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
    }
  };

  const openAiPopupForQuestion = (q: Question) => {
    sound.playTap();
    setActiveAiQuestion(q);
    setAiResponseText(null);
    setCustomAiQuery('');
  };

  const fetchAiVerification = async (q: Question, customPrompt?: string) => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: q.id,
          preference: aiPreference,
          language: aiLanguage,
          userCustomPrompt: customPrompt || undefined,
          subject: q.subject,
          topic: q.topic,
        }),
      });
      const data = await res.json();
      setAiResponseText(data.explanation || q.explanation);
    } catch {
      setAiResponseText(
        aiLanguage === 'pidgin' && q.explanation_pidgin ? q.explanation_pidgin : q.explanation
      );
    } finally {
      setAiLoading(false);
    }
  };

  // ============================================================================
  // VIEW 2: FINAL SUBMIT COMPREHENSIVE SOLUTION DASHBOARD (FOR ALL 10 / 15 Qs)
  // ============================================================================
  if (isFinalSubmitted && finalScoreSummary) {
    const accuracyPct =
      finalScoreSummary.total > 0
        ? Math.round((finalScoreSummary.correct / finalScoreSummary.total) * 100)
        : 0;

    return (
      <div className="fixed inset-0 z-50 bg-[#060B16] text-slate-100 flex flex-col overflow-y-auto">
        {/* Top Solution Dashboard Header */}
        <header className="sabi-top-safe-bar sticky top-0 z-30 bg-[#080E1E]/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md">
              <BookOpenCheck size={20} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                {mode === 'blitz' ? 'SABI BLITZ' : 'SMART PRACTICE'} · LEVEL {levelId} SOLUTION DASHBOARD
              </span>
              <h1 className="text-base sm:text-xl font-black text-white">
                {levelTitle} — Complete Worked Solutions ({questions.length} Questions)
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCalculatorOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-black flex items-center gap-1.5 cursor-pointer"
            >
              <Calculator size={15} />
              <span className="hidden sm:inline">Calculator</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer shadow-sm"
            >
              Finish & Return →
            </button>
          </div>
        </header>

        {/* Main Solution Dashboard Content */}
        <main className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6 flex-1">
          {/* Summary Banner with Strict Flawless Subject Rating Notice */}
          <section
            className={`rounded-3xl p-6 sm:p-8 border-2 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 ${
              finalScoreSummary.flawless
                ? 'bg-gradient-to-r from-emerald-950 via-blue-950 to-slate-900 border-emerald-400'
                : 'bg-gradient-to-r from-blue-950 via-slate-900 to-blue-900/60 border-blue-500/60'
            }`}
          >
            <div className="flex items-center gap-5">
              <img
                src={
                  finalScoreSummary.flawless
                    ? '/assets/mascots/blitz/eagle_cheering_stars.svg'
                    : '/assets/mascots/smart/student_desk_studying.svg'
                }
                alt="Level Summary Mascot"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain shrink-0 drop-shadow-xl"
              />
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-100 text-blue-950 font-black text-[11px] uppercase tracking-wider">
                  <Award size={13} />
                  <span>
                    {finalScoreSummary.flawless
                      ? '100% FLAWLESS CLEAR — SUBJECT RATING +10% BOOST!'
                      : `SCORE: ${finalScoreSummary.correct} / ${finalScoreSummary.total} (${accuracyPct}%)`}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white">
                  {finalScoreSummary.flawless
                    ? 'Perfect Mastery! Zero Questions Failed!'
                    : 'Review Your Worked Solutions & AI Verifications Below'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  {finalScoreSummary.flawless
                    ? `Because you answered all ${finalScoreSummary.total} questions 100% correctly without a single mistake, your official ${subjectLabel} Subject Rating has increased!`
                    : `Note: Your daily practice activity has been recorded, but official Subject Ratings only increase when you clear a level 100% right without failing any question. Inspect every solution below and retry to earn your flawless rating boost!`}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 rounded-2xl bg-slate-950/90 border border-slate-800 text-center shrink-0 w-full md:w-auto">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                FINAL LEVEL SCORE
              </span>
              <span className="text-3xl sm:text-4xl font-black text-white">
                {finalScoreSummary.correct} / {finalScoreSummary.total}
              </span>
              <span
                className={`text-[11px] font-black block mt-1 ${
                  finalScoreSummary.flawless ? 'text-emerald-400' : 'text-yellow-200'
                }`}
              >
                {finalScoreSummary.flawless ? '★ Flawless Rating Unlocked' : '100% Required for Rating +Boost'}
              </span>
            </div>
          </section>

          {/* All 10 or 15 Questions Detailed Solution List with AI Button at Each Question */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-black text-white">
                Question-by-Question Solutions & AI Verification ({questions.length})
              </h3>
              <span className="text-xs font-bold text-blue-300">
                Click "AI Verify & Explain" on any question for deeper breakdown
              </span>
            </div>

            {questions.map((q, idx) => {
              const userChoice = selectedAnswers[idx];
              const isCorrect = userChoice === q.answer;

              return (
                <div
                  key={`${q.id}-${idx}`}
                  className={`p-5 sm:p-6 rounded-3xl border-2 space-y-4 transition ${
                    isCorrect
                      ? 'bg-slate-900/90 border-emerald-500/40'
                      : 'bg-slate-900/95 border-rose-500/50'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                          isCorrect
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-rose-500 text-white'
                        }`}
                      >
                        Q{idx + 1}
                      </span>
                      <span className="px-3 py-1 rounded-full bg-blue-950 border border-blue-700/40 text-blue-300 text-xs font-black">
                        {q.subject} · {q.topic}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        JAMB {q.year || 2024}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openAiPopupForQuestion(q)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md cursor-pointer"
                    >
                      <Sparkles size={14} />
                      <span>AI Verify & More Explanation</span>
                    </button>
                  </div>

                  {/* Question Stem rendered with pure KaTeX */}
                  <div className="text-base sm:text-lg font-bold text-white leading-relaxed">
                    <MathText text={q.question} />
                  </div>

                  {/* User Choice vs Correct Answer */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                    <div
                      className={`p-3.5 rounded-2xl border font-bold flex items-center gap-2.5 ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      <div>
                        <span className="text-[10px] uppercase tracking-wider block opacity-75">
                          Your Selected Option
                        </span>
                        <span>
                          {userChoice
                            ? `Option ${userChoice}: `
                            : 'No Option Selected'}
                          {userChoice && q.options[userChoice] && (
                            <MathText text={q.options[userChoice]} />
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 font-bold flex items-center gap-2.5">
                      <ShieldCheck size={18} className="text-emerald-400 shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase tracking-wider block text-emerald-400">
                          Verified Correct Answer
                        </span>
                        <span>
                          Option {q.answer}: <MathText text={q.options[q.answer]} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Step-by-Step KaTeX Worked Explanation */}
                  <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-400 block">
                      Step-by-Step Worked Solution:
                    </span>
                    <div>
                      <MathText text={q.explanation} />
                    </div>
                    {q.explanation_pidgin && (
                      <div className="pt-2 border-t border-slate-800/80 text-xs text-yellow-200">
                        <strong>Pidgin Breakdown:</strong> <MathText text={q.explanation_pidgin} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        </main>

        {/* Interactive AI Verification Popup Modal */}
        {activeAiQuestion && (
          <AiVerificationModal
            question={activeAiQuestion}
            aiLanguage={aiLanguage}
            setAiLanguage={setAiLanguage}
            aiPreference={aiPreference}
            setAiPreference={setAiPreference}
            customAiQuery={customAiQuery}
            setCustomAiQuery={setCustomAiQuery}
            aiResponseText={aiResponseText}
            aiLoading={aiLoading}
            onFetchAi={fetchAiVerification}
            onClose={() => setActiveAiQuestion(null)}
          />
        )}

        <JAMBCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
      </div>
    );
  }

  // ============================================================================
  // VIEW 1: ACTIVE FULL-SCREEN LEVEL QUESTION SIMULATOR (10 OR 15 QUESTIONS)
  // ============================================================================
  if (!currentQuestion) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#070C18] text-white flex flex-col justify-between overflow-hidden select-none">
      {/* Top Simulator HUD Bar */}
      <header className="sabi-top-safe-bar w-full bg-[#0A1122] border-b border-slate-800 px-3 sm:px-8 py-3 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white transition cursor-pointer"
            title="Exit Level"
          >
            <X size={18} />
          </button>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block leading-none">
              {mode === 'blitz' ? 'SABI BLITZ' : 'SMART ROAD'} · LEVEL {levelId}
            </span>
            <span className="text-xs sm:text-sm font-black text-white truncate max-w-[160px] sm:max-w-xs block mt-0.5">
              {levelTitle}
            </span>
          </div>
        </div>

        {/* Segmented Question Progress Pills (1 to 10/15) */}
        <div className="hidden md:flex items-center gap-1 flex-1 max-w-md mx-4">
          {questions.map((_, idx) => {
            const hasAns = Boolean(selectedAnswers[idx]);
            const isSub = Boolean(submittedQuestions[idx]);
            const isActive = idx === currentIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  sound.playTap();
                  setCurrentIndex(idx);
                }}
                className={`h-2.5 flex-1 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-400 scale-y-125'
                    : isSub
                    ? 'bg-emerald-500'
                    : hasAns
                    ? 'bg-blue-600'
                    : 'bg-slate-800'
                }`}
                title={`Question ${idx + 1}`}
              />
            );
          })}
        </div>

        {/* Right HUD: Timer, Streak, Calculator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
            <Clock
              size={14}
              className={secondsRemaining <= 10 ? 'text-rose-500 animate-spin' : 'text-blue-400'}
            />
            <span
              className={`text-xs font-mono font-black ${
                secondsRemaining <= 10 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {secondsRemaining}s
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-400/30 text-yellow-200 text-xs font-black">
            <Flame size={14} />
            <span>{streakCount}x</span>
          </div>

          <button
            type="button"
            onClick={() => setIsCalculatorOpen(prev => !prev)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
            title="Toggle Moveable Scientific Calculator"
          >
            <Calculator size={14} />
            <span className="hidden sm:inline">Calc</span>
          </button>
        </div>
      </header>

      {/* FULL-SCREEN QUESTION & OPTIONS WORKSPACE */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-8 py-4 sm:py-6 flex flex-col justify-between overflow-y-auto gap-4">
        {/* Question Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-blue-600 text-white font-black text-xs">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <span className="px-3 py-1 rounded-xl bg-blue-950 border border-blue-500/30 text-blue-200 font-black text-xs">
              {currentQuestion.subject} · {currentQuestion.topic}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
            <span>JAMB {currentQuestion.year || 2024}</span>
            <span>•</span>
            <span className="text-emerald-400">100% Score = Subject Rating +Boost</span>
          </div>
        </div>

        {/* Question Stem Container — Enlarged Pure KaTeX & Reading Typography */}
        <div className="flex-1 min-h-[140px] rounded-3xl bg-gradient-to-b from-[#0E172D] to-[#0A1122] border-2 border-blue-500/30 p-5 sm:p-8 flex flex-col justify-center shadow-xl">
          <div className="text-lg sm:text-2xl lg:text-[26px] font-bold text-white leading-relaxed tracking-tight">
            <MathText text={currentQuestion.question} />
          </div>
        </div>

        {/* 4 Option Tiles (A, B, C, D) — Selecting does NOT immediately dump answer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {(['A', 'B', 'C', 'D'] as const).map(optKey => {
            const optText = currentQuestion.options?.[optKey] || '';
            const isSelected = currentSelected === optKey;
            const showCorrect = isCurrentSubmitted && optKey === currentQuestion.answer;
            const showWrong =
              isCurrentSubmitted && isSelected && optKey !== currentQuestion.answer;

            return (
              <button
                key={optKey}
                type="button"
                onClick={() => handleSelectOption(optKey)}
                disabled={isCurrentSubmitted}
                className={`p-4 sm:p-5 rounded-2xl border-2 text-left font-bold text-sm sm:text-base flex items-center gap-3.5 transition-all cursor-pointer ${
                  showCorrect
                    ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 shadow-lg'
                    : showWrong
                    ? 'bg-rose-950/70 border-rose-500 text-rose-200'
                    : isSelected
                    ? 'bg-blue-600 text-white border-blue-400 shadow-[0_6px_20px_rgba(37,99,235,0.3)] scale-[1.01]'
                    : 'bg-slate-900/90 border-slate-800 text-slate-100 hover:border-blue-500 hover:bg-slate-800/80'
                }`}
              >
                <span
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl shrink-0 flex items-center justify-center font-black text-sm border ${
                    showCorrect
                      ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                      : showWrong
                      ? 'bg-rose-500 text-white border-rose-400'
                      : isSelected
                      ? 'bg-white text-blue-700 border-white'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {optKey}
                </span>
                <div className="flex-1 leading-snug">
                  <MathText text={optText} />
                </div>
              </button>
            );
          })}
        </div>
      </main>

      {/* BOTTOM ACTION DOCK: Submit Question -> Optional Popup Solution/AI -> Next Question -> Final Submit at #10/#15 */}
      <footer className="sabi-bottom-safe w-full bg-[#0A1122] border-t border-slate-800 px-4 sm:px-8 py-3.5 sm:py-4 shrink-0">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Left: Previous Question & Question Status */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrevQuestion}
              disabled={currentIndex === 0}
              className="px-3.5 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 hover:text-white disabled:opacity-40 text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ArrowLeft size={14} />
              <span>Prev</span>
            </button>

            {isCurrentSubmitted && (
              <button
                type="button"
                onClick={() => openAiPopupForQuestion(currentQuestion)}
                className="px-4 py-2.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-400/50 text-blue-200 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer animate-fade-in"
              >
                <Sparkles size={14} />
                <span>See Solution & AI Popup</span>
              </button>
            )}
          </div>

          {/* Right: Submit Current Question / Next Question / Final Submit Level */}
          <div className="flex items-center gap-2.5 ml-auto">
            {!isCurrentSubmitted && (
              <button
                type="button"
                onClick={handleSubmitSingleQuestion}
                disabled={!currentSelected}
                className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer ${
                  currentSelected
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                }`}
              >
                Submit Question
              </button>
            )}

            {!isLastQuestion ? (
              <button
                type="button"
                onClick={handleNextQuestion}
                disabled={!currentSelected && !isCurrentSubmitted}
                className={`px-6 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                  currentSelected || isCurrentSubmitted
                    ? 'bg-white hover:bg-blue-50 text-blue-900 shadow-lg'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <span>Next Question</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinalSubmitLevel}
                className="px-7 py-3.5 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-xl flex items-center gap-2 cursor-pointer"
              >
                <BookOpenCheck size={16} />
                <span>Final Submit Level ({questions.length}Q) →</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Per-Question Solution & AI Verification Popup Modal */}
      {activeAiQuestion && (
        <AiVerificationModal
          question={activeAiQuestion}
          aiLanguage={aiLanguage}
          setAiLanguage={setAiLanguage}
          aiPreference={aiPreference}
          setAiPreference={setAiPreference}
          customAiQuery={customAiQuery}
          setCustomAiQuery={setCustomAiQuery}
          aiResponseText={aiResponseText}
          aiLoading={aiLoading}
          onFetchAi={fetchAiVerification}
          onClose={() => setActiveAiQuestion(null)}
        />
      )}

      {/* Moveable Floating Calculator */}
      <JAMBCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </div>
  );
}

interface AiVerificationModalProps {
  question: Question;
  aiLanguage: 'english' | 'pidgin';
  setAiLanguage: (lang: 'english' | 'pidgin') => void;
  aiPreference: 'detailed' | 'short';
  setAiPreference: (pref: 'detailed' | 'short') => void;
  customAiQuery: string;
  setCustomAiQuery: (q: string) => void;
  aiResponseText: string | null;
  aiLoading: boolean;
  onFetchAi: (q: Question, customPrompt?: string) => void;
  onClose: () => void;
}

function AiVerificationModal({
  question,
  aiLanguage,
  setAiLanguage,
  aiPreference,
  setAiPreference,
  customAiQuery,
  setCustomAiQuery,
  aiResponseText,
  aiLoading,
  onFetchAi,
  onClose,
}: AiVerificationModalProps) {
  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-[#0B1326] border-2 border-blue-500 text-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-950 via-slate-900 to-blue-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">
              <Sparkles size={18} />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block">
                SABI AI TUTOR & SOLUTION VERIFIER
              </span>
              <h3 className="text-sm sm:text-base font-black text-white">
                {question.subject} · {question.topic}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Question & Verified Answer Box */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
            <div className="text-sm sm:text-base font-bold text-white">
              <MathText text={question.question} />
            </div>
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-black text-emerald-400">
              <span>
                Verified Answer: Option {question.answer} (
                <MathText text={question.options[question.answer]} />)
              </span>
              <span>JAMB {question.year || 2024}</span>
            </div>
          </div>

          {/* Standard Worked Solution */}
          <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-300 block">
              Official Worked Solution (KaTeX):
            </span>
            <div className="text-xs sm:text-sm text-slate-100 leading-relaxed">
              <MathText
                text={
                  aiLanguage === 'pidgin' && question.explanation_pidgin
                    ? question.explanation_pidgin
                    : question.explanation
                }
              />
            </div>
          </div>

          {/* AI Verification Controls */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-300">
                Live AI Deep Explanation & Verification:
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiLanguage(aiLanguage === 'english' ? 'pidgin' : 'english')}
                  className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-black text-yellow-200 cursor-pointer"
                >
                  Mode: {aiLanguage === 'english' ? 'Standard English' : 'Pidgin Breakdown'}
                </button>
                <button
                  type="button"
                  onClick={() => setAiPreference(aiPreference === 'detailed' ? 'short' : 'detailed')}
                  className="px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-[11px] font-black text-blue-300 cursor-pointer"
                >
                  {aiPreference === 'detailed' ? 'Step-by-Step' : 'Short Summary'}
                </button>
              </div>
            </div>

            {/* Custom Question Input for AI Verification */}
            <div className="flex gap-2">
              <input
                type="text"
                value={customAiQuery}
                onChange={e => setCustomAiQuery(e.target.value)}
                placeholder="Ask AI to verify a step or explain why another option is wrong..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white focus:outline-hidden focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => onFetchAi(question, customAiQuery)}
                disabled={aiLoading}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <Send size={13} />
                <span>{aiLoading ? 'Verifying…' : 'Verify with AI'}</span>
              </button>
            </div>

            {aiResponseText && (
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 text-xs sm:text-sm text-emerald-100 leading-relaxed space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 block">
                  ✓ SABI AI Tutor Verification Response:
                </span>
                <div>
                  <MathText text={aiResponseText} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
          >
            Done Reviewing
          </button>
        </div>
      </div>
    </div>
  );
}
