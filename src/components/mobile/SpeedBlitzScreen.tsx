import React, { useState, useEffect } from 'react';
import { Zap, Flame, Trophy, RotateCcw, Clock, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';
import { SEED_QUESTIONS } from '../../data/questions';
import { Question } from '../../types';
import MathText from '../MathText';
import confetti from 'canvas-confetti';
import { sound } from '../../utils/soundEffects';

interface SpeedBlitzScreenProps {
  onAddXP: (amount: number) => void;
}

export default function SpeedBlitzScreen({ onAddXP }: SpeedBlitzScreenProps) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [comboStreak, setComboStreak] = useState(0);
  const [highCombo, setHighCombo] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // High score in local storage or memory
  const [highScore, setHighScore] = useState(140);

  // Timer loop
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          finishGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  const startGame = () => {
    // Pick fast easy/medium questions across subjects
    const pool = SEED_QUESTIONS.filter(q => q.difficulty === 'easy' || q.difficulty === 'medium');
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    setQuestions(shuffled);
    setCurrentIdx(0);
    setScore(0);
    setComboStreak(0);
    setHighCombo(0);
    setTimeLeft(60);
    setFeedback(null);
    setGameState('playing');
    sound.playTap();
  };

  const finishGame = () => {
    setGameState('gameover');
    sound.playCelebration();
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.5 } });
    onAddXP(score + 25);
    if (score > highScore) {
      setHighScore(score);
    }
  };

  const handleAnswer = (optionKey: string) => {
    if (gameState !== 'playing') return;
    const currentQ = questions[currentIdx];
    if (!currentQ) return;

    if (optionKey === currentQ.answer) {
      sound.playCorrect();
      const multiplier = comboStreak >= 5 ? 3 : comboStreak >= 2 ? 2 : 1;
      const pts = 10 * multiplier;
      setScore(s => s + pts);
      const newStreak = comboStreak + 1;
      setComboStreak(newStreak);
      if (newStreak > highCombo) setHighCombo(newStreak);
      setFeedback('correct');
    } else {
      sound.playWrong();
      setComboStreak(0);
      setFeedback('wrong');
    }

    // Brief feedback flash before next question
    setTimeout(() => {
      setFeedback(null);
      setCurrentIdx(i => i + 1);
      if (currentIdx + 1 >= questions.length) {
        finishGame();
      }
    }, 250);
  };

  const currentQ = questions[currentIdx];

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* 1. IDLE SCREEN */}
      {gameState === 'idle' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 p-6 text-white shadow-lg shadow-orange-950/20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 mx-auto flex items-center justify-center text-white mb-3 shadow-inner">
              <Zap size={36} className="fill-white" />
            </div>

            <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-white/25">
              60 Seconds Lightning Round
            </span>
            <h1 className="mt-2 font-display text-2xl font-black">
              Speed Blitz
            </h1>
            <p className="mt-1 text-xs text-amber-100 max-w-xs mx-auto leading-relaxed">
              Test your JAMB reflexes! Answer as many questions as you can in 60 seconds. Maintain combos for 3x points.
            </p>

            <button
              onClick={startGame}
              className="mt-6 w-full py-3.5 rounded-2xl bg-white text-orange-700 font-display font-black text-sm shadow-md active:scale-95 transition"
            >
              Start 60s Blitz!
            </button>
          </div>

          {/* Blitz Stats Card */}
          <div className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3">
              Your Blitz Records
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-900/50">
                <span className="text-[10px] font-bold text-slate-500">All-Time Best</span>
                <p className="font-display text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">
                  {highScore} pts
                </p>
              </div>
              <div className="p-3 rounded-2xl bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-900/50">
                <span className="text-[10px] font-bold text-slate-500">Max Combo</span>
                <p className="font-display text-xl font-black text-orange-600 dark:text-orange-400 mt-0.5">
                  8 Streak 🔥
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. PLAYING SCREEN */}
      {gameState === 'playing' && currentQ && (
        <div className="space-y-3 animate-in fade-in">
          {/* Top Bar with Timer and Multiplier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-black text-sm">
              <Clock size={15} />
              <span>{timeLeft}s</span>
            </div>

            {/* Combo Meter */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500 text-white font-black text-xs shadow-sm">
              <Flame size={14} className="fill-white" />
              <span>{comboStreak}x Streak {comboStreak >= 5 ? '(3X)' : comboStreak >= 2 ? '(2X)' : ''}</span>
            </div>

            <div className="text-right">
              <span className="font-display text-base font-black text-slate-900 dark:text-white">
                {score} pts
              </span>
            </div>
          </div>

          {/* Time Progress Bar */}
          <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${
                timeLeft < 15 ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${(timeLeft / 60) * 100}%` }}
            />
          </div>

          {/* Question Stem */}
          <div
            className={`p-4 rounded-3xl bg-white dark:bg-[#111A2E] border shadow-xs transition-colors duration-150 ${
              feedback === 'correct'
                ? 'border-emerald-500 bg-emerald-50/50'
                : feedback === 'wrong'
                ? 'border-red-500 bg-red-50/50'
                : 'border-slate-200/80 dark:border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-amber-600 dark:text-amber-400 mb-1">
              <span>{currentQ.subject}</span>
              <span>Q #{currentIdx + 1}</span>
            </div>
            <div className="text-xs font-bold text-slate-900 dark:text-white leading-relaxed">
              <MathText text={currentQ.question} />
            </div>
          </div>

          {/* Rapid 4-Option Grid */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {(Object.entries(currentQ.options) as [string, string][]).map(([key, value]) => (
              <button
                key={key}
                onClick={() => handleAnswer(key)}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 hover:border-amber-500 text-left text-xs font-bold text-slate-800 dark:text-slate-200 shadow-xs active:scale-95 transition flex items-center gap-2"
              >
                <span className="w-6 h-6 rounded-lg bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800/80 text-amber-700 dark:text-amber-300 flex items-center justify-center text-[10px] font-black shrink-0">
                  {key}
                </span>
                <span className="truncate">{value}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. GAME OVER SCREEN */}
      {gameState === 'gameover' && (
        <div className="space-y-4 animate-in zoom-in-95 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950 mx-auto flex items-center justify-center text-amber-600 dark:text-amber-400 mb-1">
            <Trophy size={32} />
          </div>

          <h2 className="font-display text-2xl font-black text-slate-900 dark:text-white">
            Time's Up!
          </h2>
          <p className="text-xs text-slate-500">
            Solid speed workout. Reflexes are sharpening.
          </p>

          <div className="p-5 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Blitz Score
            </p>
            <p className="font-display text-4xl font-black text-amber-500 mt-1">
              {score}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:divide-slate-800 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">Max Combo</span>
                <p className="font-bold text-slate-900 dark:text-white">{highCombo} in a row 🔥</p>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold">XP Rewarded</span>
                <p className="font-bold text-emerald-600">+{score + 25} XP</p>
              </div>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-display font-black text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition"
          >
            <RotateCcw size={15} />
            <span>Play Again</span>
          </button>
        </div>
      )}
    </div>
  );
}
