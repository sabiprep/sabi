import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Shield, Flame, Star, Trophy, Volume2, VolumeX, BookOpen, Award } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';
import { sound } from '../utils/soundEffects';

const STORAGE_KEY = 'sabi_onboarding_preview_v1';
const CLASS_OPTIONS = ['SS2', 'SS3', 'Out-of-school candidate / resitter'];
const ATTEMPT_OPTIONS = ['0 (First attempt)', '1 previous attempt', '2 or more previous attempts'];

type Answers = Record<string, string | string[] | Record<string, number>>;

function readAnswers(): Answers {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Answers) : {};
  } catch {
    return {};
  }
}

// Sabi Scholar Voice Dialogue for each level gateway
const SCHOLAR_DIALOGUES: Record<number, string> = {
  1: "Oya candidate! What champion name should we engrave on your JAMB 300+ result slip?",
  2: "English Language is locked with the golden crest. Choose your 3 champion subjects to unlock Gate 2!",
  3: "Know your battle level! Are you in SS2, SS3, or a determined warrior fighting for a comeback?",
  4: "Lock in your citadel! Which university and course are you claiming admission for?",
  5: "Time is ammunition! How many months do we have to drill before your official UTME?",
  6: "Self-awareness is power! Rate your confidence across your 4 subjects from 1 to 5.",
  7: "Which subject is your priority fortress that needs the biggest breakthrough?",
  8: "What usually trips you up? Is it timing, careless slips, or tricky concepts?",
  9: "Name any specific topic you find difficult right now (e.g. Organic Chemistry, Concord).",
  10: "Discipline beats motivation! How do you like your study schedule structured?",
  11: "How many hours a day can you dedicate to intense SABI CBT drilling?",
  12: "Where do you do your best thinking? Quiet sanctuary or high-energy zone?",
  13: "When Sabi explains questions, do you prefer step-by-step breakdowns or rapid summaries?",
  14: "Pick your vibe! Formal English, pure Nigerian Pidgin, or a sweet blend?",
  15: "Final Gateway! Write your biggest motivation. What is driving you to succeed?"
};

export function OnboardingPage() {
  const { step } = useParams();
  const navigate = useNavigate();
  const stepNumber = Number(step);
  const validStep = Number.isInteger(stepNumber) && stepNumber >= 1 && stepNumber <= ONBOARDING_QUESTIONS.length;
  const question = ONBOARDING_QUESTIONS[Math.min(Math.max(stepNumber, 1), ONBOARDING_QUESTIONS.length) - 1];

  const [answers, setAnswers] = useState<Answers>(readAnswers);
  const [isPushingGate, setIsPushingGate] = useState(false);
  const [gateUnlocked, setGateUnlocked] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const selectedSubjects = (answers.chosenSubjects as string[] | undefined) ?? ['English Language'];
  const confidence = (answers.subjectConfidence as Record<string, number> | undefined) ?? {};

  useEffect(() => {
    if (!validStep) navigate('/onboarding/1', { replace: true });
  }, [navigate, validStep]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    } catch (e) {
      // Ignore storage errors in restricted contexts
    }
  }, [answers]);

  const setAnswer = (key: string, value: Answers[string]) => {
    sound.playTap();
    setAnswers(previous => ({ ...previous, [key]: value }));
  };

  const toggleSubject = (subject: SubjectName) => {
    if (subject === 'English Language') return;
    sound.playTap();
    setAnswers(previous => {
      const previousSubjects = Array.isArray(previous.chosenSubjects)
        ? (previous.chosenSubjects as string[])
        : ['English Language'];
      const selected = previousSubjects.includes(subject);
      const updated = selected
        ? previousSubjects.filter(item => item !== subject)
        : previousSubjects.length < 4
        ? [...previousSubjects, subject]
        : previousSubjects;
      return {
        ...previous,
        chosenSubjects: ['English Language', ...updated.filter(item => item !== 'English Language')],
      };
    });
  };

  const canContinue = useMemo(() => {
    switch (question.id) {
      case 1:
        return Boolean(String(answers.name ?? '').trim());
      case 2:
        return selectedSubjects.length === 4;
      case 3:
        return Boolean(answers.currentClass && answers.attempts);
      case 4:
        return Boolean(answers.targetCourse && answers.targetUniversity);
      case 5:
        return Boolean(answers.monthsUntilExam);
      case 6:
        return selectedSubjects.every(subject => (confidence[subject] ?? 0) >= 1);
      case 7:
        return selectedSubjects.includes(String(answers.prioritySubject));
      case 8:
        return Boolean(answers.struggleType);
      case 9:
        return true;
      case 10:
      case 11:
      case 12:
      case 13:
      case 14:
        return Boolean(answers[question.fieldName]);
      case 15:
        return Boolean(String(answers.motivation ?? '').trim());
      default:
        return false;
    }
  }, [answers, confidence, question, selectedSubjects]);

  const handlePushGate = () => {
    if (!canContinue || isPushingGate) return;

    setIsPushingGate(true);
    sound.playGatePush();

    // Trigger gate opening transition after push effort
    setTimeout(() => {
      setGateUnlocked(true);
      sound.playGateUnlock();

      // Confetti burst for gate clearing
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#2563EB', '#FCD34D', '#3B82F6', '#FFFFFF'],
      });

      // Special welcome speech on final gate
      if (question.id === 15) {
        sound.speakWelcomeVoice(String(answers.name || 'Scholar'));
      }

      // Transition to next level
      setTimeout(() => {
        setIsPushingGate(false);
        setGateUnlocked(false);
        if (question.id === 15) {
          navigate('/home');
        } else {
          navigate(`/onboarding/${question.id + 1}`);
        }
      }, 700);
    }, 450);
  };

  const toggleSound = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sound.setEnabled(next);
  };

  if (!validStep) return null;

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-amber-400 selection:text-amber-950 font-sans transition-colors duration-300">
      {/* Top Header Bar */}
      <header className="px-4 py-3 sm:px-8 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0B1120]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between">
        <Link to="/welcome" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-amber-500 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-white dark:bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-display font-black text-blue-700 dark:text-amber-400 text-lg tracking-wider">S</span>
            </div>
          </div>
          <span className="font-display font-black text-xl tracking-tight text-blue-900 dark:text-white">
            SABI<span className="text-amber-500">.</span>
          </span>
        </Link>

        {/* Level Progression Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 text-xs font-black">
            <Flame size={14} className="text-amber-500 animate-bounce" />
            <span>GATEWAY {question.id} OF 15</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs font-bold">
            <Star size={13} className="text-amber-500 fill-amber-500" />
            <span>+{(question.id - 1) * 20} XP</span>
          </div>

          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* Main Gateway Arena */}
      <div className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {/* Progress Bar with Golden Spark */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-xs font-black tracking-wider uppercase text-blue-700 dark:text-amber-400 mb-2">
            <span>LEVEL {question.id}: {question.id <= 5 ? 'FOUNDATION CITADEL' : question.id <= 10 ? 'STUDY STRATEGY' : 'MASTER COMBAT SETUP'}</span>
            <span>{Math.round((question.id / 15) * 100)}% UNLOCKED</span>
          </div>
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-amber-500 rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${(question.id / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Mascot + Gateway Interactive Stage with SIDE push button */}
        <div className="relative mb-6 rounded-3xl bg-gradient-to-b from-blue-900 to-slate-900 border-2 border-blue-700/40 p-5 sm:p-6 text-white shadow-2xl overflow-hidden min-h-[220px] flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Subtle Stage Lighting Grid */}
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Left: Sabi Scholar Mascot (Pushes Gate or Celebrates) */}
          <div className="relative z-10 w-36 h-36 sm:w-44 sm:h-44 shrink-0 transition-transform duration-300">
            <img
              src={gateUnlocked ? (question.id === 15 ? '/assets/mascots/onboarding/scholar_welcome_salute.svg' : '/assets/mascots/onboarding/scholar_gate_celebrate.svg') : '/assets/mascots/onboarding/scholar_pushing_gate.svg'}
              alt="Sabi Scholar Mascot"
              className={`w-full h-full object-contain filter drop-shadow-[0_12px_16px_rgba(0,0,0,0.5)] ${
                isPushingGate ? 'translate-x-4 scale-105 transition-transform duration-300' : 'animate-pulse-slow'
              }`}
            />
          </div>

          {/* Middle: Sabi Scholar Dialogue Speech Bubble */}
          <div className="relative z-10 flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] tracking-widest uppercase mb-2">
              <Award size={11} /> Sabi Scholar Guide
            </div>
            <p className="text-base sm:text-lg font-bold text-amber-100 leading-snug">
              "{SCHOLAR_DIALOGUES[question.id] || question.subtext}"
            </p>
            <div className="mt-2 text-xs text-blue-200 flex items-center justify-center md:justify-start gap-2">
              <Shield size={13} className="text-amber-400" />
              <span>Watch your scholar push open the iron gate!</span>
            </div>
          </div>

          {/* Right SIDE: The Dedicated Push Gateway Action Button */}
          <div className="relative z-20 shrink-0 w-full md:w-auto flex flex-col items-center gap-2">
            <button
              type="button"
              disabled={!canContinue || isPushingGate}
              onClick={handlePushGate}
              className={`w-full md:w-auto px-7 py-4 rounded-2xl font-display font-black text-sm flex items-center justify-center gap-2.5 transition-all shadow-[0_6px_0_#B45309] active:translate-y-1.5 active:shadow-[0_0px_0_#B45309] ${
                canContinue
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 text-slate-950 hover:brightness-105 cursor-pointer ring-4 ring-amber-400/30'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/60 shadow-none cursor-not-allowed opacity-70'
              }`}
            >
              <span>{isPushingGate ? 'PUSHING GATEWAY...' : question.id === 15 ? 'CLAIM CITADEL & ENTER 🚀' : 'PUSH OPEN GATEWAY 🔓'}</span>
              <ArrowRight size={18} />
            </button>
            <span className={`text-[11px] font-bold ${canContinue ? 'text-amber-300' : 'text-slate-400'}`}>
              {canContinue ? '⚡ Ready! Click to push gate' : 'Complete question to push'}
            </span>
          </div>

          {/* Physical Gate Doors Visual (Split open on unlock) */}
          <div
            className={`absolute right-0 top-0 bottom-0 w-24 sm:w-36 pointer-events-none border-l-4 border-amber-500/50 bg-gradient-to-l from-slate-950 to-transparent transition-transform duration-500 ${
              gateUnlocked ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-80'
            }`}
          />
        </div>

        {/* Question Card Box */}
        <div className="bg-white dark:bg-[#0D1527] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-xl sm:text-2xl font-display font-black text-slate-900 dark:text-white mb-2 leading-tight">
            {question.question}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{question.subtext}</p>

          {/* Dynamic Interactive Fields per Question ID */}
          <div className="mb-8">
            {question.id === 1 && (
              <div className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  autoComplete="name"
                  value={String(answers.name ?? '')}
                  placeholder={question.placeholder || 'e.g. David Chukwu'}
                  onChange={e => setAnswer('name', e.target.value)}
                  className="w-full px-5 py-4 text-lg font-bold rounded-2xl border-2 border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-slate-900/80 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-hidden transition"
                />
                <span className="text-xs text-slate-400">This name will appear on your UTME Mock Result Slips and leaderboards.</span>
              </div>
            )}

            {question.id === 2 && (
              <div>
                <div className="flex items-center justify-between mb-3 text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>English Language is compulsory (Locked). Pick exactly 3 more:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black ${selectedSubjects.length === 4 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800'}`}>
                    {selectedSubjects.length} / 4 Selected
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                  {SUBJECTS_POOL.map(({ name, category }) => {
                    const checked = selectedSubjects.includes(name);
                    const isEnglish = name === 'English Language';
                    const disabled = !isEnglish && !checked && selectedSubjects.length >= 4;

                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={disabled || isEnglish}
                        onClick={() => toggleSubject(name)}
                        className={`p-3 rounded-2xl border-2 text-left flex flex-col justify-between transition-all ${
                          isEnglish
                            ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 cursor-not-allowed shadow-xs'
                            : checked
                            ? 'bg-blue-600 border-blue-600 text-white shadow-md scale-[1.02]'
                            : disabled
                            ? 'opacity-40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-slate-50/50 dark:bg-slate-900/50'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] uppercase font-black tracking-wider opacity-75">
                            {isEnglish ? 'COMPULSORY' : category}
                          </span>
                          {(checked || isEnglish) && (
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-bold">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-bold line-clamp-1">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {question.id === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Current Class</label>
                  <div className="space-y-2">
                    {CLASS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer('currentClass', opt)}
                        className={`w-full p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${
                          answers.currentClass === opt
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Prior JAMB Attempts</label>
                  <div className="space-y-2">
                    {ATTEMPT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer('attempts', opt)}
                        className={`w-full p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${
                          answers.attempts === opt
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                            : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {question.id === 4 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Target Course of Study</label>
                  <input
                    type="text"
                    value={String(answers.targetCourse ?? '')}
                    placeholder="e.g. Medicine & Surgery, Law, Computer Science, Accounting"
                    onChange={e => setAnswer('targetCourse', e.target.value)}
                    className="w-full px-5 py-4 text-base font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Goal University / Institution</label>
                  <input
                    type="text"
                    value={String(answers.targetUniversity ?? '')}
                    placeholder="e.g. University of Lagos (UNILAG), UI, OAU, ABU Zaria"
                    onChange={e => setAnswer('targetUniversity', e.target.value)}
                    className="w-full px-5 py-4 text-base font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:border-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {question.id === 5 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || ['1 month', '2 - 3 months', '4 - 6 months', 'More than 6 months']).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer('monthsUntilExam', opt)}
                    className={`p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${
                      answers.monthsUntilExam === opt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                    }`}
                  >
                    ⏳ {opt}
                  </button>
                ))}
              </div>
            )}

            {question.id === 6 && (
              <div className="space-y-4">
                <span className="text-xs text-slate-500">Rate your readiness (1 = Beginner, 5 = JAMB Master):</span>
                {selectedSubjects.map(subj => {
                  const val = confidence[subj] ?? 0;
                  return (
                    <div key={subj} className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="font-bold text-sm">{subj}</span>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() => setAnswer('subjectConfidence', { ...confidence, [subj]: starNum })}
                            className={`w-9 h-9 rounded-xl font-black text-sm flex items-center justify-center transition-all ${
                              val >= starNum
                                ? 'bg-amber-400 text-slate-950 scale-105 shadow-xs'
                                : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:bg-slate-300'
                            }`}
                          >
                            ★ {starNum}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {question.id === 7 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedSubjects.map(subj => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setAnswer('prioritySubject', subj)}
                    className={`p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${
                      answers.prioritySubject === subj
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                    }`}
                  >
                    🎯 {subj}
                  </button>
                ))}
              </div>
            )}

            {question.id === 8 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || [
                  'Time pressure (Running out of minutes)',
                  'Tricky concept traps & formulas',
                  'Careless calculation slips',
                  'None / Solid confidence'
                ]).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer('struggleType', opt)}
                    className={`p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${
                      answers.struggleType === opt
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-amber-300'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {question.id === 9 && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={String(answers.selfIdentifiedWeakTopic ?? '')}
                  placeholder="e.g. Organic Chemistry, Waves and Optics, Proximity Concord"
                  onChange={e => setAnswer('selfIdentifiedWeakTopic', e.target.value)}
                  className="w-full px-5 py-4 text-base font-bold rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
                <span className="text-xs text-slate-400">SABI will target questions on this topic during your initial Blitz and Smart drills.</span>
              </div>
            )}

            {question.id >= 10 && question.id <= 14 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || []).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer(question.fieldName, opt)}
                    className={`p-4 rounded-2xl border-2 text-left font-bold text-sm transition-all ${
                      answers[question.fieldName] === opt
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                    }`}
                  >
                    ✓ {opt}
                  </button>
                ))}
              </div>
            )}

            {question.id === 15 && (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={String(answers.motivation ?? '')}
                  placeholder="e.g. To make my parents proud and gain direct admission to UNILAG Medicine on my first attempt!"
                  onChange={e => setAnswer('motivation', e.target.value)}
                  className="w-full px-5 py-4 text-base font-bold rounded-2xl border-2 border-amber-300 dark:border-amber-800/80 bg-amber-50/50 dark:bg-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  SABI will use this exact motivation to cheer and push you during difficult study moments!
                </span>
              </div>
            )}
          </div>

          {/* Action Push Gate Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={question.id === 1 || isPushingGate}
              onClick={() => navigate(`/onboarding/${question.id - 1}`)}
              className="px-5 py-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>

            {/* Quick helper tip pointing to the side button */}
            <div className="text-right">
              <span className="text-xs text-slate-400">
                {canContinue ? 'Click "PUSH OPEN GATEWAY" above at the side of the gate ↗' : 'Answer above to unlock gate'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Benchmark Note */}
      <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600">
        SABI Intelligence Engine · Gateways adapt your personalized UTME study roadmap.
      </footer>
    </main>
  );
}
export default OnboardingPage;
