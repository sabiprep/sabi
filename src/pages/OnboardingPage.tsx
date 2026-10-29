import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Flame, Star, Volume2, VolumeX, Sun, Moon, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import { useTheme } from '../app/ThemeProvider';

const STORAGE_KEY = 'sabi_onboarding_preview_v1';
const CLASS_OPTIONS = ['SS2', 'SS3', 'Out-of-school candidate / resitter'];
const ATTEMPT_OPTIONS = ['0 (First attempt)', '1 previous attempt', '2 or more previous attempts'];
const POPULAR_COURSES = ['Medicine & Surgery', 'Computer Science', 'Law', 'Nursing Science', 'Mechanical Engineering', 'Accounting', 'Pharmacy', 'Economics'];
const POPULAR_UNIVERSITIES = ['UNILAG', 'UI (Ibadan)', 'OAU Ife', 'UNILORIN', 'UNN', 'ABU Zaria', 'FUTA', 'UNIBEN', 'LASU', 'Covenant Univ'];

type Answers = Record<string, string | string[] | Record<string, number>>;

function readAnswers(): Answers {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Answers) : {};
  } catch {
    return {};
  }
}

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

    setTimeout(() => {
      setGateUnlocked(true);
      sound.playGateUnlock();

      confetti({
        particleCount: 55,
        spread: 65,
        origin: { y: 0.72 },
        colors: ['#F59E0B', '#2563EB', '#FCD34D', '#3B82F6', '#FFFFFF'],
      });

      if (question.id === 15) {
        sound.speakWelcomeVoice(String(answers.name || 'Scholar'));
      }

      setTimeout(() => {
        setIsPushingGate(false);
        setGateUnlocked(false);
        if (question.id === 15) {
          localStorage.setItem('sabi_user_signed_in', 'true');
          navigate('/home');
        } else {
          navigate(`/onboarding/${question.id + 1}`);
        }
      }, 650);
    }, 420);
  };

  const toggleSound = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    sound.setEnabled(next);
  };

  if (!validStep) return null;

  return (
    <main
      className={`h-[100dvh] max-h-[100dvh] w-full max-w-full overflow-hidden flex flex-col font-sans select-none transition-colors duration-200 ${
        isDark ? 'bg-[#060C18] text-slate-100' : 'bg-[#EEF2F8] text-slate-900'
      }`}
    >
      {/* ===================================================================== */}
      {/* TOP BAR: BRAND & GATEWAY PROGRESSION                                 */}
      {/* ===================================================================== */}
      <header
        className={`px-4 py-2.5 sm:px-6 border-b shrink-0 z-30 flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#080E1E] border-slate-800/90' : 'bg-white border-slate-200/90'
        }`}
      >
        <Link to="/welcome" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-amber-500 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-black text-amber-400 text-sm tracking-wider">S</span>
            </div>
          </div>
          <span className={`font-black text-base sm:text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
            SABI<span className="text-amber-500">.</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-500 text-xs font-black">
            <Flame size={13} className="text-amber-500 animate-bounce" />
            <span>GATE {question.id} / 15</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/25 text-blue-500 text-xs font-black">
            <Star size={12} className="text-amber-500 fill-amber-500" />
            <span>+{question.id * 25} XP</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </header>

      {/* Edge-to-Edge Progress Bar */}
      <div className={`w-full h-1.5 shrink-0 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-amber-500 transition-all duration-500"
          style={{ width: `${(question.id / 15) * 100}%` }}
        />
      </div>

      {/* ===================================================================== */}
      {/* FULL-SCREEN UNIFIED ONBOARDING WORKSPACE (NO EMPTY GAPS)             */}
      {/* ===================================================================== */}
      <div className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-12 lg:gap-5 lg:p-5">
        
        {/* LEFT / TOP + MIDDLE COLUMN: SPECIAL ENLARGED QUESTION + SCROLLABLE OPTIONS */}
        <section
          className={`flex-1 min-h-0 lg:col-span-7 flex flex-col overflow-hidden lg:rounded-3xl lg:border-2 ${
            isDark
              ? 'bg-[#0B1426] lg:border-slate-800'
              : 'bg-white lg:border-slate-200 lg:shadow-xl'
          }`}
        >
          {/* 1. SPECIAL ENLARGED QUESTION HEADER BANNER (Fixed at Top of Container) */}
          <div
            className={`shrink-0 px-4 pt-4 pb-3.5 sm:px-6 sm:pt-6 sm:pb-5 border-b-2 relative overflow-hidden ${
              isDark
                ? 'bg-gradient-to-br from-blue-950/90 via-[#0F1D3A] to-[#0B1426] border-blue-500/30'
                : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 border-blue-800 text-white'
            }`}
          >
            {/* Subtle Architectural Grid Accent */}
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#F59E0B_1.5px,transparent_1.5px)] [background-size:18px_18px] pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-[11px] font-black uppercase tracking-wider shadow-sm">
                <Sparkles size={12} />
                <span>
                  LEVEL {question.id} · {question.id <= 5 ? 'FOUNDATION CITADEL' : question.id <= 10 ? 'STUDY STRATEGY' : 'COMBAT SETUP'}
                </span>
              </div>
              <span className="text-[11px] font-mono font-bold text-amber-300">
                {Math.round((question.id / 15) * 100)}% Complete
              </span>
            </div>

            <h1 className="relative z-10 text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-snug text-white drop-shadow-xs">
              {question.question}
            </h1>

            <p className="relative z-10 text-xs sm:text-sm font-semibold text-blue-100/95 mt-1.5 leading-relaxed">
              {question.subtext}
            </p>
          </div>

          {/* 2. DEDICATED SCROLLABLE OPTIONS / INPUTS CONTAINER (Right Before the Gate) */}
          <div
            className={`flex-1 min-h-0 overflow-y-auto px-4 py-3.5 sm:px-6 sm:py-5 flex flex-col ${
              isDark ? 'bg-[#0B1426]' : 'bg-slate-50/70'
            }`}
          >
            {/* LEVEL 1: FULL NAME */}
            {question.id === 1 && (
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div
                  className={`flex-1 rounded-2xl p-4 sm:p-6 border-2 flex flex-col justify-center gap-3 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <label className="text-xs font-black uppercase tracking-wider text-amber-500 block">
                    Candidate Full Name or Nickname
                  </label>
                  <input
                    type="text"
                    autoFocus
                    autoComplete="name"
                    value={String(answers.name ?? '')}
                    placeholder="e.g. Daniel Etim"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && canContinue) handlePushGate();
                    }}
                    onChange={e => setAnswer('name', e.target.value)}
                    className={`w-full px-5 py-4 text-lg sm:text-2xl font-black rounded-2xl border-2 outline-none transition ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                        : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                    }`}
                  />
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-blue-500 dark:text-blue-400 pt-1">
                    <ShieldCheck size={16} className="shrink-0 text-amber-500" />
                    <span>Appears on your Official 180-Question JAMB CBT Mock Result Slips.</span>
                  </div>
                </div>

                {/* Live Candidate Badge Preview to fill container richly */}
                <div
                  className={`rounded-2xl p-4 border-2 flex items-center justify-between ${
                    isDark ? 'bg-slate-900/70 border-slate-800' : 'bg-white border-slate-200'
                  }`}
                >
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                      LIVE CANDIDATE PASS PREVIEW
                    </span>
                    <span className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {String(answers.name ?? '').trim() || 'Awaiting Scholar Name...'}
                    </span>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-500 font-black text-xs">
                    UTME 2026/2027
                  </span>
                </div>
              </div>
            )}

            {/* LEVEL 2: 4 JAMB SUBJECTS (Scrolls cleanly inside this container right before the gate) */}
            {question.id === 2 && (
              <div className="flex-1 flex flex-col gap-3">
                <div
                  className={`sticky top-0 z-10 py-2 px-3.5 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-black backdrop-blur-md ${
                    isDark ? 'bg-slate-900/95 border-slate-800 text-white' : 'bg-white/95 border-slate-200 text-slate-900 shadow-xs'
                  }`}
                >
                  <span>Selected: {selectedSubjects.length} of 4 Subjects</span>
                  <span className={selectedSubjects.length === 4 ? 'text-emerald-500' : 'text-amber-500'}>
                    {selectedSubjects.length === 4 ? '✓ All 4 Subjects Locked' : `Pick ${4 - selectedSubjects.length} more`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-1">
                  {SUBJECTS_POOL.map(({ name, category }) => {
                    const isEnglish = name === 'English Language';
                    const checked = selectedSubjects.includes(name);

                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleSubject(name)}
                        className={`p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer active:scale-95 flex flex-col justify-between min-h-[76px] ${
                          isEnglish
                            ? 'bg-amber-500/15 border-amber-500 text-amber-500 cursor-default'
                            : checked
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                            : isDark
                            ? 'bg-slate-900 border-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-slate-100'
                            : 'bg-white border-slate-300 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] uppercase font-black tracking-wider opacity-80">
                            {isEnglish ? 'COMPULSORY' : category}
                          </span>
                          {(checked || isEnglish) && (
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-sm sm:text-base font-black leading-tight">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LEVEL 3: CLASS & PRIOR ATTEMPTS */}
            {question.id === 3 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-500">
                    1. Current Academic Level
                  </label>
                  <div className="flex-1 flex flex-col gap-2">
                    {CLASS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer('currentClass', opt)}
                        className={`flex-1 p-4 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                          answers.currentClass === opt
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : isDark
                            ? 'border-slate-800 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100'
                            : 'border-slate-300 bg-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                        }`}
                      >
                        <span>{opt}</span>
                        {answers.currentClass === opt && <CheckCircle2 size={18} className="shrink-0 text-amber-300" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-amber-500">
                    2. Previous UTME Attempts
                  </label>
                  <div className="flex-1 flex flex-col gap-2">
                    {ATTEMPT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer('attempts', opt)}
                        className={`flex-1 p-4 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between transition-all cursor-pointer active:scale-95 ${
                          answers.attempts === opt
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : isDark
                            ? 'border-slate-800 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100'
                            : 'border-slate-300 bg-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                        }`}
                      >
                        <span>{opt}</span>
                        {answers.attempts === opt && <CheckCircle2 size={18} className="shrink-0 text-amber-300" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL 4: TARGET COURSE & GOAL UNIVERSITY (Full Container with Quick Chips - Zero Empty Space) */}
            {question.id === 4 && (
              <div className="flex-1 flex flex-col justify-between gap-3.5">
                <div
                  className={`flex-1 p-4 rounded-2xl border-2 flex flex-col justify-between gap-2.5 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-500 mb-1.5">
                      Target Course of Study
                    </label>
                    <input
                      type="text"
                      value={String(answers.targetCourse ?? '')}
                      placeholder="e.g. Medicine & Surgery, Law, Computer Science"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && canContinue) handlePushGate();
                      }}
                      onChange={e => setAnswer('targetCourse', e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl border-2 text-base sm:text-lg font-black outline-none ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                          : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                      }`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_COURSES.map(course => (
                      <button
                        key={course}
                        type="button"
                        onClick={() => setAnswer('targetCourse', course)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                          answers.targetCourse === course
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-400'
                            : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-blue-600'
                        }`}
                      >
                        {course}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`flex-1 p-4 rounded-2xl border-2 flex flex-col justify-between gap-2.5 ${
                    isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-500 mb-1.5">
                      Goal University / Institution
                    </label>
                    <input
                      type="text"
                      value={String(answers.targetUniversity ?? '')}
                      placeholder="e.g. UNILAG, UI, OAU, UNILORIN"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && canContinue) handlePushGate();
                      }}
                      onChange={e => setAnswer('targetUniversity', e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl border-2 text-base sm:text-lg font-black outline-none ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                          : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                      }`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_UNIVERSITIES.map(uni => (
                      <button
                        key={uni}
                        type="button"
                        onClick={() => setAnswer('targetUniversity', uni)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-black border transition cursor-pointer ${
                          answers.targetUniversity === uni
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:border-amber-400'
                            : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-blue-600'
                        }`}
                      >
                        {uni}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEVEL 5: MONTHS UNTIL EXAM */}
            {question.id === 5 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || ['1 month', '2 - 3 months', '4 - 6 months', 'More than 6 months']).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer('monthsUntilExam', opt)}
                    className={`p-5 rounded-2xl border-2 text-left font-black text-base sm:text-lg flex items-center justify-between transition-all duration-150 cursor-pointer active:scale-95 ${
                      answers.monthsUntilExam === opt
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100'
                        : 'border-slate-300 bg-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                    }`}
                  >
                    <span>⏳ {opt}</span>
                    {answers.monthsUntilExam === opt && <CheckCircle2 size={22} className="text-amber-300 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* LEVEL 6: SUBJECT CONFIDENCE RATINGS */}
            {question.id === 6 && (
              <div className="flex-1 flex flex-col justify-between gap-2.5">
                {selectedSubjects.map(subj => {
                  const val = confidence[subj] ?? 0;
                  return (
                    <div
                      key={subj}
                      className={`flex-1 p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-300 shadow-xs'
                      }`}
                    >
                      <div>
                        <span className={`font-black text-base sm:text-lg block ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {subj}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400">
                          {val === 0 ? 'Tap a star rating (1–5)' : `Confidence Level: ${val} / 5`}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() => setAnswer('subjectConfidence', { ...confidence, [subj]: starNum })}
                            className={`flex-1 sm:flex-initial h-10 sm:w-11 sm:h-11 px-3 sm:px-0 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                              val >= starNum
                                ? 'bg-blue-600 text-white shadow-md'
                                : isDark
                                ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300'
                                : 'bg-slate-100 hover:bg-amber-400 hover:text-slate-950 text-slate-800 border border-slate-300'
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

            {/* LEVEL 7: PRIORITY SUBJECT */}
            {question.id === 7 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedSubjects.map(subj => (
                  <button
                    key={subj}
                    type="button"
                    onClick={() => setAnswer('prioritySubject', subj)}
                    className={`p-5 rounded-2xl border-2 text-left font-black text-base sm:text-lg flex items-center justify-between transition-all duration-150 cursor-pointer active:scale-95 ${
                      answers.prioritySubject === subj
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100'
                        : 'border-slate-300 bg-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                    }`}
                  >
                    <span>🎯 {subj}</span>
                    {answers.prioritySubject === subj && <CheckCircle2 size={22} className="text-amber-300 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* LEVEL 8: STRUGGLE TYPE */}
            {question.id === 8 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || []).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer('struggleType', opt)}
                    className={`p-5 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer active:scale-95 ${
                      answers.struggleType === opt
                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                        : isDark
                        ? 'border-slate-800 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100'
                        : 'border-slate-300 bg-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                    }`}
                  >
                    <span>{opt}</span>
                    {answers.struggleType === opt && <CheckCircle2 size={20} className="text-amber-300 shrink-0" />}
                  </button>
                ))}
              </div>
            )}

            {/* LEVEL 9: WEAK TOPICS */}
            {question.id === 9 && (
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div
                  className={`flex-1 p-5 rounded-2xl border-2 flex flex-col justify-center gap-3 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <label className="text-xs font-black uppercase tracking-wider text-amber-500">
                    Specific Challenging Topics (Optional — Tap chips or type below)
                  </label>
                  <input
                    type="text"
                    value={String(answers.weakTopics ?? '')}
                    placeholder="e.g. Organic Chemistry, Waves, Concord, Calculus"
                    onKeyDown={e => {
                      if (e.key === 'Enter') handlePushGate();
                    }}
                    onChange={e => setAnswer('weakTopics', e.target.value)}
                    className={`w-full px-5 py-4 rounded-2xl border-2 text-base sm:text-lg font-black outline-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                        : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                    }`}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      'Organic Chemistry',
                      'Calculus & Integration',
                      'Waves & Optics',
                      'Lexis & Concord',
                      'Redox Reactions',
                      'Current Electricity',
                      'Trigonometry',
                      'Oral English',
                    ].map(topic => (
                      <button
                        key={topic}
                        type="button"
                        onClick={() => {
                          const cur = String(answers.weakTopics ?? '');
                          setAnswer('weakTopics', cur ? `${cur}, ${topic}` : topic);
                        }}
                        className={`px-3.5 py-2 rounded-xl border-2 text-xs sm:text-sm font-black transition cursor-pointer ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-200 hover:border-amber-400 hover:text-amber-400'
                            : 'bg-slate-100 border-slate-300 text-slate-900 hover:border-blue-600'
                        }`}
                      >
                        + {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* LEVELS 10 TO 14: STRATEGY & COMBAT OPTIONS */}
            {question.id >= 10 && question.id <= 14 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || []).map(opt => {
                  const isSelected = answers[question.fieldName] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(question.fieldName, opt)}
                      className={`p-5 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between gap-3 transition-all duration-150 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/30'
                          : isDark
                          ? 'border-slate-800 bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-100'
                          : 'border-slate-300 bg-white hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && <CheckCircle2 size={20} className="text-amber-300 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* LEVEL 15: FINAL MOTIVATION STATEMENT */}
            {question.id === 15 && (
              <div className="flex-1 flex flex-col justify-between gap-3">
                <div
                  className={`flex-1 p-5 rounded-2xl border-2 flex flex-col justify-center gap-3 ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
                  }`}
                >
                  <label className="text-xs font-black uppercase tracking-wider text-amber-500">
                    Your Personal UTME Victory Pledge
                  </label>
                  <textarea
                    rows={4}
                    value={String(answers.motivation ?? '')}
                    placeholder="e.g. To make my family proud and gain admission to study Medicine at UNILAG on my first attempt!"
                    onChange={e => setAnswer('motivation', e.target.value)}
                    className={`w-full px-5 py-4 text-base sm:text-lg font-black rounded-2xl border-2 outline-none resize-none ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                        : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                    }`}
                  />
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Score 320+ and make my family proud!',
                      'Gain merit admission into my dream course!',
                      'Crush every past question in 60 seconds!',
                    ].map(pledge => (
                      <button
                        key={pledge}
                        type="button"
                        onClick={() => setAnswer('motivation', pledge)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                          isDark
                            ? 'bg-slate-950 border-slate-800 text-amber-400 hover:border-amber-400'
                            : 'bg-amber-50 border-amber-300 text-slate-900 hover:border-amber-500'
                        }`}
                      >
                        ⚡ "{pledge}"
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* 3. ENLARGED NORMAL CITADEL GATE & ACTION DOCK (Bottom on Mobile, Right on Desktop) */}
        {/* ===================================================================== */}
        <section
          className={`shrink-0 lg:col-span-5 flex flex-col justify-between border-t-2 lg:border-2 lg:rounded-3xl p-3.5 sm:p-5 transition-colors ${
            isDark
              ? 'bg-gradient-to-b from-[#0E1930] to-[#080F1E] border-slate-800'
              : 'bg-white border-slate-200 lg:shadow-xl'
          }`}
        >
          {/* Enlarged Architectural Citadel Gate Stage */}
          <div
            className={`relative w-full h-32 sm:h-40 lg:flex-1 lg:min-h-[260px] rounded-2xl border-2 overflow-hidden flex items-center justify-between px-4 sm:px-6 mb-3 ${
              isDark
                ? 'bg-gradient-to-r from-[#091224] via-[#102040] to-[#091224] border-blue-900/50'
                : 'bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-blue-900 text-white'
            }`}
          >
            {/* Radial Gate Glow */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#F59E0B_1px,transparent_1px)] [background-size:14px_14px] pointer-events-none" />

            {/* Left Gate Status Info */}
            <div className="relative z-10 flex flex-col justify-center max-w-[46%] sm:max-w-[50%]">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider w-fit mb-1.5">
                Citadel Gate {question.id}
              </span>
              <h2 className="text-sm sm:text-base lg:text-xl font-black text-white leading-tight">
                {gateUnlocked
                  ? 'Gate Unlocked!'
                  : canContinue
                  ? 'Ready to Push Gate!'
                  : 'Complete Above to Unlock'}
              </h2>
              <p className="text-[11px] sm:text-xs text-blue-200/90 font-semibold mt-1 line-clamp-2">
                {canContinue
                  ? 'Tap PUSH GATE below to drive the Sabi Scholar through the iron gate.'
                  : 'Fill or select your response above to power up the Sabi Scholar.'}
              </p>
            </div>

            {/* Enlarged Normal Sabi Scholar & Iron Gate Illustration */}
            <div className="relative z-10 w-36 h-28 sm:w-48 sm:h-36 lg:w-56 lg:h-48 shrink-0 flex items-center justify-center">
              <img
                src={
                  gateUnlocked
                    ? question.id === 15
                      ? '/assets/mascots/onboarding/scholar_welcome_salute.svg'
                      : '/assets/mascots/onboarding/scholar_gate_celebrate.svg'
                    : '/assets/mascots/onboarding/scholar_pushing_gate.svg'
                }
                alt="Sabi Scholar Pushing Citadel Gate"
                className={`w-full h-full object-contain filter drop-shadow-2xl transition-all duration-300 transform ${
                  isPushingGate ? 'translate-x-4 scale-110' : 'scale-105'
                }`}
              />
            </div>
          </div>

          {/* Action Controls Row: Back + Large PUSH GATE Button */}
          <div className="flex items-center gap-3 w-full">
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
              className={`px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0 ${
                isDark
                  ? 'border-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 bg-slate-900 text-slate-200'
                  : 'border-slate-300 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 bg-slate-100 text-slate-900'
              }`}
            >
              <ArrowLeft size={17} />
              <span>Back</span>
            </button>

            <button
              type="button"
              disabled={!canContinue || isPushingGate}
              onClick={handlePushGate}
              className={`flex-1 py-3.5 sm:py-4 px-5 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer border-2 ${
                canContinue
                  ? 'bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white border-blue-500 hover:border-amber-400 shadow-lg shadow-blue-600/30 hover:shadow-amber-400/40 transform hover:scale-[1.01] active:scale-95'
                  : isDark
                  ? 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
              }`}
            >
              <span>
                {isPushingGate ? 'PUSHING GATE…' : question.id === 15 ? 'ENTER CITADEL 🚀' : 'PUSH GATE 🔓'}
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
