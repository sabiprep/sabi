import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Shield, Flame, Star, Volume2, VolumeX, Sun, Moon } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import { useTheme } from '../app/ThemeProvider';

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
  const { isDark, toggleTheme } = useTheme();
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
    } catch {
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
    <main className={`h-screen min-h-screen w-full flex flex-col overflow-hidden font-sans select-none ${
      isDark ? 'bg-[#070D1A] text-slate-100' : 'bg-[#070D1A] text-slate-100'
    }`}>
      {/* Top Header Bar with Integrated Progress */}
      <header className={`px-4 py-2.5 sm:px-6 border-b shrink-0 z-30 flex items-center justify-between ${
        isDark ? 'bg-[#080D1A] border-slate-800' : 'bg-[#0A1428] border-blue-900/60'
      }`}>
        <Link to="/welcome" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-amber-500 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-black text-amber-400 text-sm tracking-wider">S</span>
            </div>
          </div>
          <span className="font-black text-base sm:text-lg tracking-tight text-white">
            SABI<span className="text-amber-500">.</span>
          </span>
        </Link>

        {/* Level Progression Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-black">
            <Flame size={14} className="text-amber-400 animate-bounce" />
            <span>GATEWAY {question.id} OF 15</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Star size={13} className="text-amber-400 fill-amber-400" />
            <span>+{(question.id - 1) * 20} XP</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-amber-400 hover:bg-slate-800 transition-all cursor-pointer"
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className="p-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </header>

      {/* Edge-to-Edge Continuous Progress Bar */}
      <div className="w-full h-1.5 bg-slate-900 shrink-0 border-b border-slate-800/80 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-amber-500 transition-all duration-500 shadow-sm shadow-amber-400/30"
          style={{ width: `${(question.id / 15) * 100}%` }}
        />
      </div>

      {/* Main Full-Screen Gateway Arena (Zero wasted space, edge-to-edge) */}
      <div className="flex-1 w-full h-[calc(100dvh-58px)] overflow-hidden flex flex-col lg:grid lg:grid-cols-12">
        
        {/* GATEWAY STAGE: Left side on desktop, top stage on mobile */}
        <div className="lg:col-span-5 h-auto lg:h-full flex flex-col justify-between p-3.5 sm:p-6 lg:p-8 xl:p-10 border-b lg:border-b-0 lg:border-r border-blue-900/50 bg-gradient-to-b from-[#0F1E3D] via-[#0A1428] to-[#060B16] relative overflow-hidden shrink-0">
          {/* Subtle background star grid */}
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

          {/* Stage Top Bar: Citadel Gateway Crest & SIDE Action Button */}
          <div className="relative z-10 flex items-center justify-between gap-3 mb-2 sm:mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider shadow-sm">
              <Shield size={13} className="fill-slate-950" />
              <span>Citadel Gate {question.id}</span>
            </div>

            {/* THE SIDE PUSH BUTTON (Docked at the side so users enjoy the anime pushing the gate) */}
            <button
              type="button"
              disabled={!canContinue || isPushingGate}
              onClick={handlePushGate}
              className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all duration-200 cursor-pointer border-2 ${
                canContinue
                  ? 'bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white border-blue-500 hover:border-amber-400 shadow-lg shadow-blue-600/30 hover:shadow-amber-400/40 transform hover:scale-[1.03] active:scale-95 active:ring-2 active:ring-amber-400'
                  : 'bg-slate-800/60 text-slate-500 border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
              title={canContinue ? "Push Open Gateway" : "Complete question to unlock"}
            >
              <span>
                {isPushingGate ? 'PUSHING…' : question.id === 15 ? 'ENTER CITADEL' : 'PUSH GATE 🔓'}
              </span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* THE PROMINENT, LARGE SCHOLAR & GATEWAY ILLUSTRATION */}
          <div className="relative z-10 my-auto py-1 sm:py-3 flex items-center justify-center">
            <div className="relative w-full max-w-[260px] sm:max-w-[340px] lg:max-w-sm h-28 sm:h-44 lg:h-64 flex items-center justify-center">
              <img
                src={gateUnlocked 
                  ? (question.id === 15 ? '/assets/mascots/onboarding/scholar_welcome_salute.svg' : '/assets/mascots/onboarding/scholar_gate_celebrate.svg') 
                  : '/assets/mascots/onboarding/scholar_pushing_gate.svg'}
                alt="Sabi Scholar Pushing Iron Gateway"
                className={`w-full h-full object-contain filter drop-shadow-2xl transition-all duration-500 transform ${
                  isPushingGate ? 'translate-x-6 scale-105' : 'hover:scale-[1.02]'
                }`}
              />
              
              {/* Sliding Gate Doors Effect on Unlock */}
              <div
                className={`absolute inset-0 pointer-events-none border-l-4 border-amber-400/60 bg-gradient-to-l from-slate-950/80 to-transparent transition-transform duration-500 rounded-2xl ${
                  gateUnlocked ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-20'
                }`}
              />
            </div>
          </div>

          {/* Dialogue Guide Bubble below Mascot */}
          <div className="relative z-10 mt-1 sm:mt-3 p-2.5 sm:p-3.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-white/10 text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mb-0.5">
              Sabi Scholar Guide:
            </span>
            <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
              "{SCHOLAR_DIALOGUES[question.id] || question.subtext}"
            </p>
          </div>
        </div>

        {/* QUESTION ARENA (Right side on desktop, scrollable area on mobile) */}
        <div className="lg:col-span-7 h-full flex flex-col justify-between p-4 sm:p-8 lg:p-10 xl:p-12 overflow-y-auto overscroll-contain bg-[#070D1A] text-slate-100">
          <div>
            <div className="text-[11px] font-black tracking-wider uppercase text-amber-400 mb-1.5">
              LEVEL {question.id}: {question.id <= 5 ? 'FOUNDATION CITADEL' : question.id <= 10 ? 'STUDY STRATEGY' : 'MASTER COMBAT SETUP'}
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-black mb-2 tracking-tight leading-tight text-white">
              {question.question}
            </h2>
            <p className="text-xs sm:text-sm mb-6 text-slate-400">
              {question.subtext}
            </p>

            {/* Dynamic Interactive Fields per Question ID */}
            <div className="mb-6">
                  {question.id === 1 && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        autoFocus
                        autoComplete="name"
                        value={String(answers.name ?? '')}
                        placeholder={question.placeholder || 'e.g. David Chukwu'}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && canContinue) handlePushGate();
                        }}
                        onChange={e => setAnswer('name', e.target.value)}
                        className={`w-full px-4 py-3.5 text-base sm:text-lg font-bold rounded-2xl border-2 transition-all outline-none ${
                          isDark 
                            ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' 
                            : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                        }`}
                      />
                      <p className="text-xs text-slate-400">This name will appear on your UTME Mock Result Slips.</p>
                    </div>
                  )}

                  {question.id === 2 && (
                    <div>
                      <div className="flex items-center justify-between mb-2 text-xs font-bold">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>English Language is compulsory (Locked). Pick 3 more:</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-black ${
                          selectedSubjects.length === 4 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                        }`}>
                          {selectedSubjects.length} / 4
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 sm:max-h-72 overflow-y-auto pr-1">
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
                              className={`p-2.5 sm:p-3 rounded-xl border text-left flex flex-col justify-between transition-all duration-150 cursor-pointer ${
                                isEnglish
                                  ? isDark ? 'bg-amber-950/40 border-amber-500/60 text-amber-200' : 'bg-amber-50 border-amber-400 text-amber-900'
                                  : checked
                                  ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                                  : disabled
                                  ? 'opacity-40 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                  : isDark 
                                  ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                                  : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full mb-1">
                                <span className="text-[9px] uppercase font-black tracking-wider opacity-75">
                                  {isEnglish ? 'LOCKED' : category}
                                </span>
                                {(checked || isEnglish) && (
                                  <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-bold">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <span className="text-xs sm:text-sm font-bold line-clamp-1">{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {question.id === 3 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Current Class</label>
                        <div className="space-y-1.5">
                          {CLASS_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswer('currentClass', opt)}
                              className={`w-full p-3 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                                answers.currentClass === opt
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                                  : isDark 
                                  ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                                  : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prior JAMB Attempts</label>
                        <div className="space-y-1.5">
                          {ATTEMPT_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setAnswer('attempts', opt)}
                              className={`w-full p-3 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                                answers.attempts === opt
                                  ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                                  : isDark 
                                  ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                                  : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
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
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Target Course of Study</label>
                        <input
                          type="text"
                          value={String(answers.targetCourse ?? '')}
                          placeholder="e.g. Medicine & Surgery, Law, Computer Science"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && canContinue) handlePushGate();
                          }}
                          onChange={e => setAnswer('targetCourse', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                            isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Goal University / Institution</label>
                        <input
                          type="text"
                          value={String(answers.targetUniversity ?? '')}
                          placeholder="e.g. University of Lagos (UNILAG), UI, OAU"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && canContinue) handlePushGate();
                          }}
                          onChange={e => setAnswer('targetUniversity', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                            isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {question.id === 5 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(question.options || ['1 month', '2 - 3 months', '4 - 6 months', 'More than 6 months']).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer('monthsUntilExam', opt)}
                          className={`p-3.5 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                            answers.monthsUntilExam === opt
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                              : isDark 
                              ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                              : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
                          }`}
                        >
                          ⏳ {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {question.id === 6 && (
                    <div className="space-y-2.5">
                      <span className="text-xs text-slate-400">Rate readiness (1 = Beginner, 5 = JAMB Master):</span>
                      {selectedSubjects.map(subj => {
                        const val = confidence[subj] ?? 0;
                        return (
                          <div key={subj} className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between gap-2 ${
                            isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <span className="font-bold text-xs sm:text-sm">{subj}</span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(starNum => (
                                <button
                                  key={starNum}
                                  type="button"
                                  onClick={() => setAnswer('subjectConfidence', { ...confidence, [subj]: starNum })}
                                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-black text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                                    val >= starNum
                                      ? 'bg-blue-600 text-white shadow-sm'
                                      : isDark ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-400' : 'bg-slate-200 hover:bg-amber-400 hover:text-slate-950 text-slate-600'
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedSubjects.map(subj => (
                        <button
                          key={subj}
                          type="button"
                          onClick={() => setAnswer('prioritySubject', subj)}
                          className={`p-3.5 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                            answers.prioritySubject === subj
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                              : isDark 
                              ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                              : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
                          }`}
                        >
                          🎯 {subj}
                        </button>
                      ))}
                    </div>
                  )}

                  {question.id === 8 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
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
                          className={`p-3.5 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                            answers.struggleType === opt
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                              : isDark 
                              ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                              : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
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
                        placeholder="e.g. Organic Chemistry, Waves and Optics, Concord"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && canContinue) handlePushGate();
                        }}
                        onChange={e => setAnswer('selfIdentifiedWeakTopic', e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border text-sm font-bold outline-none ${
                          isDark ? 'bg-slate-950/80 border-slate-800 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                        }`}
                      />
                      <p className="text-xs text-slate-400">SABI will target questions on this topic during Blitz and Smart drills.</p>
                    </div>
                  )}

                  {question.id >= 10 && question.id <= 14 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(question.options || []).map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer(question.fieldName, opt)}
                          className={`p-3.5 rounded-xl border text-left font-bold text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                            answers[question.fieldName] === opt
                              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                              : isDark 
                              ? 'border-slate-800 bg-slate-950/40 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                              : 'border-slate-200 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-800'
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
                        rows={3}
                        value={String(answers.motivation ?? '')}
                        placeholder="e.g. To make my family proud and gain direct admission to UNILAG Medicine on my first attempt!"
                        onChange={e => setAnswer('motivation', e.target.value)}
                        className={`w-full px-4 py-3 text-sm font-bold rounded-xl border-2 outline-none ${
                          isDark 
                            ? 'bg-slate-950/80 border-amber-500/50 text-white focus:border-amber-400' 
                            : 'bg-amber-50/50 border-amber-300 text-slate-900 focus:border-blue-600'
                        }`}
                      />
                      <p className="text-xs text-amber-500 font-medium">
                        SABI uses your goal to encourage you during challenging practice sessions!
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* CLEAN FOOTER NAVIGATION */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                <button
                  type="button"
                  disabled={isPushingGate}
                  onClick={() => {
                    if (question.id > 1) {
                      navigate(`/onboarding/${question.id - 1}`);
                    } else {
                      navigate('/auth/choice');
                    }
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    isDark 
                      ? 'border-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 bg-slate-900/60 text-slate-300' 
                      : 'border-slate-200 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 bg-white text-slate-700'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  <ArrowLeft size={16} /> Back
                </button>

                <div className="text-xs font-mono text-slate-400">
                  Step {question.id} of 15
                </div>
              </div>
            </div>
          </div>
        </main>
  );
}

export default OnboardingPage;
