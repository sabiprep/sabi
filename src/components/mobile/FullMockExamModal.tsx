import React, { useState, useEffect } from 'react';
import {
  TimerReset, Clock, CheckCircle2, AlertTriangle, ArrowRight,
  ChevronLeft, ChevronRight, X, Layers, Flag, Award, Calculator
} from 'lucide-react';
import { SubjectName, Question } from '../../types';
import { SEED_QUESTIONS } from '../../data/questions';
import MathText from '../MathText';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/soundEffects';
import { saveMistakeRecord } from '../../utils/mistakeStore';
import JAMBCalculatorModal from './JAMBCalculatorModal';

interface FullMockExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddXP: (amount: number) => void;
  onOpenResultSlip?: (result: {
    totalScore: number;
    subjects: { name: string; score: number; maxScore: number }[];
  }) => void;
}

const EXAM_SUBJECTS: SubjectName[] = ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

export default function FullMockExamModal({
  isOpen,
  onClose,
  onAddXP,
  onOpenResultSlip,
}: FullMockExamModalProps) {
  const [activeSubject, setActiveSubject] = useState<SubjectName>('English Language');
  const [examStarted, setExamStarted] = useState(false);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(7200); // 2 hours = 7200s
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Group questions by subject
  const [examQuestions, setExamQuestions] = useState<Record<SubjectName, Question[]>>({
    'English Language': [],
    'Mathematics': [],
    'Physics': [],
    'Chemistry': [],
    'Biology': [],
    'Agricultural Science': [],
    'Geography': [],
    'Economics': [],
    'Government': [],
    'History': [],
    'Commerce': [],
    'Financial Accounting': [],
    'Christian Religious Studies': [],
    'Islamic Religious Studies': [],
    'Literature-in-English': [],
    'Music': [],
    'Fine Art': [],
    'French': [],
    'Arabic': [],
    'Yoruba': [],
    'Igbo': [],
    'Hausa': [],
    'Home Economics': [],
  });

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const questionsObj: Record<string, Question[]> = {};
    EXAM_SUBJECTS.forEach(sub => {
      const pool = SEED_QUESTIONS.filter(q => q.subject === sub);
      questionsObj[sub] = pool.slice(0, 10);
    });
    setExamQuestions(questionsObj as any);
    setAnswers({});
    setMarked({});
    setTimeRemaining(7200);
    setExamStarted(false);
    setExamSubmitted(false);
    setCurrentQuestionIndex(0);
    setActiveSubject('English Language');
  }, [isOpen]);

  // Timer loop
  useEffect(() => {
    if (!examStarted || examSubmitted) return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, examSubmitted]);

  // Keyboard shortcut listener for authentic CBT test hotkeys
  useEffect(() => {
    if (!examStarted || examSubmitted) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      const key = e.key.toUpperCase();
      const currentList = examQuestions[activeSubject] || [];
      const curr = currentList[currentQuestionIndex];
      if (!curr) return;

      if (['A', 'B', 'C', 'D'].includes(key)) {
        sound.playTap();
        setAnswers(prev => ({ ...prev, [curr.id]: key }));
      } else if (key === 'N') {
        if (currentQuestionIndex < currentList.length - 1) {
          sound.playTap();
          setCurrentQuestionIndex(i => i + 1);
        }
      } else if (key === 'P') {
        if (currentQuestionIndex > 0) {
          sound.playTap();
          setCurrentQuestionIndex(i => i - 1);
        }
      } else if (key === 'R') {
        sound.playTap();
        setMarked(prev => ({ ...prev, [curr.id]: !prev[curr.id] }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [examStarted, examSubmitted, activeSubject, currentQuestionIndex, examQuestions]);

  if (!isOpen) return null;

  const currentSubjectQuestions = examQuestions[activeSubject] || [];
  const currentQ = currentSubjectQuestions[currentQuestionIndex];

  const handleSubmitExam = () => {
    setExamSubmitted(true);
    sound.playCelebration();
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 } });
    onAddXP(100);

    // Save all incorrect questions to Mistake Notebook
    EXAM_SUBJECTS.forEach(sub => {
      const list = examQuestions[sub] || [];
      list.forEach(q => {
        const studentAns = answers[q.id];
        if (studentAns !== q.answer) {
          saveMistakeRecord(q, studentAns || 'None');
        }
      });
    });
  };

  const hours = Math.floor(timeRemaining / 3600);
  const minutes = Math.floor((timeRemaining % 3600) / 60);
  const seconds = timeRemaining % 60;
  const timeFormatted = `${hours > 0 ? hours + ':' : ''}${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

  const totalQuestions = EXAM_SUBJECTS.reduce((acc, sub) => acc + (examQuestions[sub]?.length || 0), 0);
  const totalCorrect = EXAM_SUBJECTS.reduce((acc, sub) => {
    const list = examQuestions[sub] || [];
    return acc + list.filter(q => answers[q.id] === q.answer).length;
  }, 0);
  const scaledScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 400) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#0E1526] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              CBT
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                JAMB CBT Mock Examination
              </h3>
              <p className="text-[10px] text-slate-400">4 Subjects · Standard 2-Hour Simulation</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* 1. Pre-Exam Screen */}
        {!examStarted && !examSubmitted && (
          <div className="p-6 space-y-4 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
              <TimerReset size={36} />
            </div>

            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white">
              Official JAMB Simulation
            </h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              This simulation replicates the official JAMB computer-based test environment with the 8-digit basic calculator, standard hotkeys (A, B, C, D, P, N, S, R), and automated mistake analysis.
            </p>

            <div className="grid grid-cols-2 gap-2 text-left p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Subjects</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">Eng, Math, Phy, Chem</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] font-bold uppercase">Duration</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">2 Hours (120 Mins)</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-left text-xs text-emerald-900 dark:text-emerald-300">
              <span className="font-black block text-[10px] uppercase">CBT Hotkeys Enabled:</span>
              <p className="mt-0.5 text-[11px] leading-snug">
                Press <strong>A, B, C, D</strong> to select options · <strong>N</strong> for Next · <strong>P</strong> for Prev · <strong>R</strong> for Review · <strong>S</strong> for Submit.
              </p>
            </div>

            <button
              onClick={() => {
                sound.playTap();
                setExamStarted(true);
              }}
              className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-display font-black text-xs shadow-md active:scale-95 transition"
            >
              Start Official Mock Exam
            </button>
          </div>
        )}

        {/* 2. Active Exam Screen */}
        {examStarted && !examSubmitted && currentQ && (
          <div className="flex-1 flex flex-col overflow-y-auto p-4 space-y-3">
            {/* Subject Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {EXAM_SUBJECTS.map(subj => {
                const subAnswered = (examQuestions[subj] || []).filter(q => answers[q.id]).length;
                const isSelected = activeSubject === subj;
                return (
                  <button
                    key={subj}
                    onClick={() => {
                      sound.playTap();
                      setActiveSubject(subj);
                      setCurrentQuestionIndex(0);
                    }}
                    className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <span>{subj.replace(' Language', '')}</span>
                    <span className="text-[10px] opacity-80">({subAnswered}/10)</span>
                  </button>
                );
              })}
            </div>

            {/* Timer, Calculator & Question Position */}
            <div className="flex items-center justify-between text-xs font-bold border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="text-slate-500">
                {activeSubject} · Q {currentQuestionIndex + 1} of {currentSubjectQuestions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    sound.playTap();
                    setIsCalculatorOpen(true);
                  }}
                  className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1 text-[11px]"
                >
                  <Calculator size={12} className="text-emerald-500" />
                  <span>Calc</span>
                </button>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono">
                  <Clock size={13} />
                  <span>{timeFormatted}</span>
                </div>
              </div>
            </div>

            {/* Question Stem */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
              <MathText text={currentQ.question} />
            </div>

            {/* 4 Options */}
            <div className="space-y-2">
              {(Object.entries(currentQ.options) as [string, string][]).map(([letter, text]) => {
                const isSelected = answers[currentQ.id] === letter;
                return (
                  <button
                    key={letter}
                    onClick={() => {
                      sound.playTap();
                      setAnswers(prev => ({ ...prev, [currentQ.id]: letter }));
                    }}
                    className={`w-full p-3 rounded-xl border text-xs text-left flex items-start gap-2.5 transition active:scale-98 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black shrink-0">
                      {letter}
                    </span>
                    <span className="flex-1 pt-0.5">
                      <MathText text={text} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Navigation and Submit */}
            <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
              <button
                disabled={currentQuestionIndex === 0}
                onClick={() => {
                  sound.playTap();
                  setCurrentQuestionIndex(i => i - 1);
                }}
                className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold disabled:opacity-40"
              >
                Prev (P)
              </button>

              <button
                onClick={() => {
                  sound.playTap();
                  setMarked(prev => ({ ...prev, [currentQ.id]: !prev[currentQ.id] }));
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border ${
                  marked[currentQ.id]
                    ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-500'
                }`}
              >
                Review (R)
              </button>

              {currentQuestionIndex < currentSubjectQuestions.length - 1 ? (
                <button
                  onClick={() => {
                    sound.playTap();
                    setCurrentQuestionIndex(i => i + 1);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white text-xs font-bold active:scale-98 transition"
                >
                  Next (N)
                </button>
              ) : (
                <button
                  onClick={handleSubmitExam}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-sm active:scale-98 transition"
                >
                  Submit Exam (S)
                </button>
              )}
            </div>
          </div>
        )}

        {/* 3. Results Screen */}
        {examSubmitted && (
          <div className="p-6 space-y-4 text-center overflow-y-auto">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
              <Award size={36} />
            </div>

            <h2 className="font-display text-xl font-black text-slate-900 dark:text-white">
              Mock Exam Result
            </h2>
            <p className="text-xs text-slate-500">
              Scaled to official JAMB 400-point benchmark.
            </p>

            <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Projected JAMB Score
              </p>
              <p className="font-display text-4xl font-black text-emerald-600 mt-1">
                {scaledScore} / 400
              </p>
              <p className="text-xs text-emerald-600 font-bold mt-1">
                {totalCorrect} of {totalQuestions} questions correct ({Math.round((totalCorrect / totalQuestions) * 100)}%)
              </p>
            </div>

            {/* Subject breakdown */}
            <div className="grid grid-cols-2 gap-2 text-left">
              {EXAM_SUBJECTS.map(sub => {
                const list = examQuestions[sub] || [];
                const correct = list.filter(q => answers[q.id] === q.answer).length;
                return (
                  <div key={sub} className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 block truncate">{sub}</span>
                    <span className="font-display text-sm font-black text-slate-900 dark:text-white">
                      {correct} / {list.length} ({list.length > 0 ? Math.round((correct / list.length) * 100) : 0}%)
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 text-left">
              <span className="font-black text-[10px] uppercase block">Saved to Mistake Notebook:</span>
              <p className="text-[11px] mt-0.5">
                All missed questions have been transferred to your Mistake Notebook for targeted re-drilling.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {onOpenResultSlip && (
                <button
                  onClick={() => {
                    sound.playTap();
                    const subjectsBreakdown = EXAM_SUBJECTS.map(sub => {
                      const list = examQuestions[sub] || [];
                      const correct = list.filter(q => answers[q.id] === q.answer).length;
                      const score = list.length > 0 ? Math.round((correct / list.length) * 100) : 70;
                      return { name: sub, score, maxScore: 100 };
                    });
                    onOpenResultSlip({
                      totalScore: scaledScore,
                      subjects: subjectsBreakdown,
                    });
                  }}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 transition"
                >
                  <Award size={15} />
                  <span>View Official JAMB Result Slip 📄</span>
                </button>
              )}

              <button
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-900 dark:bg-slate-800 text-white font-display font-black text-xs hover:bg-slate-800 transition"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        <JAMBCalculatorModal
          isOpen={isCalculatorOpen}
          onClose={() => setIsCalculatorOpen(false)}
        />
      </div>
    </div>
  );
}
