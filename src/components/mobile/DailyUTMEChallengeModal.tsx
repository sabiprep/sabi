import React, { useState, useEffect } from 'react';
import {
  X, Zap, Trophy, Timer, CheckCircle2, XCircle, Flame,
  Award, Sparkles, ArrowRight, RotateCcw, Share2, Crown
} from 'lucide-react';
import { Question, StudentProfile, SubjectName } from '../../types';
import { SEED_QUESTIONS } from '../../data/questions';
import MathText from '../MathText';
import { sound } from '../../utils/soundEffects';

interface DailyUTMEChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: StudentProfile;
  onAddXP: (amount: number) => void;
  onOpenLeaderboard?: () => void;
}

export default function DailyUTMEChallengeModal({
  isOpen,
  onClose,
  profile,
  onAddXP,
  onOpenLeaderboard,
}: DailyUTMEChallengeModalProps) {
  // Select 5 varied questions from user's subjects
  const [challengeQuestions, setChallengeQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes total = 300 seconds
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);

  // Initialize questions when opened
  useEffect(() => {
    if (isOpen) {
      // Pick 5 questions matching user's registered subjects
      const userSubjects = profile.chosenSubjects || ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
      const filtered = SEED_QUESTIONS.filter(q => userSubjects.includes(q.subject));
      
      // Shuffle & pick 5
      const shuffled = [...filtered].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 5);
      
      // Fallback if not enough
      if (selected.length < 5) {
        setChallengeQuestions(SEED_QUESTIONS.slice(0, 5));
      } else {
        setChallengeQuestions(selected);
      }

      setCurrentIndex(0);
      setSelectedAnswers({});
      setIsAnswered(false);
      setTimeLeft(300);
      setIsCompleted(false);
      setScore(0);
      setEarnedXP(0);
    }
  }, [isOpen, profile.chosenSubjects]);

  // Timer countdown
  useEffect(() => {
    if (!isOpen || isCompleted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinish();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, isCompleted, timeLeft]);

  if (!isOpen) return null;

  const currentQ = challengeQuestions[currentIndex];

  const handleSelectOption = (key: string) => {
    if (isAnswered) return;
    sound.playTap();
    setSelectedAnswers(prev => ({ ...prev, [currentIndex]: key }));
    setIsAnswered(true);

    const isCorrect = key === currentQ.answer;
    if (isCorrect) {
      sound.playCorrect();
      setScore(s => s + 1);
    } else {
      sound.playWrong();
    }
  };

  const handleNext = () => {
    sound.playTap();
    if (currentIndex < challengeQuestions.length - 1) {
      setCurrentIndex(i => i + 1);
      setIsAnswered(false);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    sound.playCelebration();
    setIsCompleted(true);
    // Base 20 XP per correct + 50 completion bonus + time bonus
    const finalScore = score + (selectedAnswers[currentIndex] === currentQ?.answer ? 0 : 0); // score already updated
    const bonus = 50 + (finalScore * 20);
    setEarnedXP(bonus);
    onAddXP(bonus);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-lg bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-950/20 via-slate-900/10 to-emerald-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center shadow-xs">
              <Zap size={18} className="fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                  Daily 5-Min UTME Arena
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-slate-950">
                  +100 XP LEAGUE
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                5 Rapid Mixed Questions · Live Speed Rating
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isCompleted && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                <Timer size={13} className="text-amber-500" />
                <span>{minutes}:{seconds < 10 ? `0${seconds}` : seconds}</span>
              </div>
            )}
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
        </div>

        {/* Challenge Body */}
        {!isCompleted && currentQ ? (
          <div className="p-4 flex-1 overflow-y-auto space-y-3.5 no-scrollbar">
            {/* Progress indicators */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Question {currentIndex + 1} of {challengeQuestions.length}
              </span>
              <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">
                {currentQ.subject} · {currentQ.topic}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {challengeQuestions.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx < currentIndex
                      ? 'bg-emerald-500'
                      : idx === currentIndex
                      ? 'bg-amber-500 ring-2 ring-amber-400/30'
                      : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>

            {/* Question Text */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white font-medium text-xs leading-relaxed">
              <MathText text={currentQ.question} />
            </div>

            {/* Options */}
            <div className="space-y-2">
              {(Object.entries(currentQ.options) as [string, string][]).map(([key, val]) => {
                const isSelected = selectedAnswers[currentIndex] === key;
                const isCorrect = key === currentQ.answer;

                let btnStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300';
                if (isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 font-bold';
                  } else if (isSelected) {
                    btnStyle = 'border-red-500 bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-200';
                  }
                }

                return (
                  <button
                    key={key}
                    disabled={isAnswered}
                    onClick={() => handleSelectOption(key)}
                    className={`w-full p-3 rounded-2xl border text-xs text-left flex items-center gap-3 transition active:scale-98 ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs shrink-0">
                      {key}
                    </span>
                    <span className="flex-1">
                      <MathText text={val} />
                    </span>
                    {isAnswered && isCorrect && (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    )}
                    {isAnswered && isSelected && !isCorrect && (
                      <XCircle size={16} className="text-red-500 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Instant Worked Concept Solution */}
            {isAnswered && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs animate-in fade-in">
                <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5 mb-1">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Official Worked Solution:</span>
                </span>
                <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                  <MathText text={currentQ.explanation} />
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Completion Screen */
          <div className="p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 mx-auto flex items-center justify-center text-slate-900 shadow-lg">
              <Crown size={32} />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
                Daily Sprint Complete!
              </span>
              <h4 className="font-display text-2xl font-black text-slate-900 dark:text-white mt-1">
                You Scored {score} / {challengeQuestions.length}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Streak preserved! You earned <span className="font-bold text-emerald-500">+{earnedXP} XP</span> toward your Peer Leaderboard standing.
              </p>
            </div>

            {/* Rank Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Trophy size={16} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-900 dark:text-white">Lagos State Aspirant Standings</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    Climbed to #13 (+2 positions jump!)
                  </p>
                </div>
              </div>
              <Flame size={20} className="text-amber-500 fill-amber-500" />
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {onOpenLeaderboard && (
                <button
                  onClick={() => {
                    sound.playTap();
                    onClose();
                    onOpenLeaderboard();
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <Trophy size={15} />
                  <span>View Updated Peer Leaderboard</span>
                </button>
              )}
              <button
                onClick={() => {
                  sound.playTap();
                  onClose();
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}

        {/* Footer controls during question */}
        {!isCompleted && isAnswered && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-semibold">
              {currentIndex === challengeQuestions.length - 1 ? 'Last Question' : 'Next Question ready'}
            </span>
            <button
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
            >
              <span>{currentIndex === challengeQuestions.length - 1 ? 'Finish & Claim XP' : 'Next Question'}</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
