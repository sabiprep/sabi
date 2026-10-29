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
        origin: { y: 0.7 },
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
          localStorage.setItem('sabi_user_signed_in', 'true');
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
    <main className={`min-h-screen w-full flex flex-col font-sans select-none transition-colors duration-200 ${
      isDark ? 'bg-[#070D1A] text-slate-100' : 'bg-slate-50 text-slate-900'
    }`}>
      {/* Top Header Bar with Integrated Progress */}
      <header className={`px-4 py-3 sm:px-6 border-b shrink-0 z-30 flex items-center justify-between transition-colors ${
        isDark ? 'bg-[#080D1A] border-slate-800' : 'bg-white border-slate-200 shadow-xs'
      }`}>
        <Link to="/welcome" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-700 to-amber-500 p-0.5 shadow-md group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <span className="font-black text-amber-400 text-sm tracking-wider">S</span>
            </div>
          </div>
          <span className={`font-black text-base sm:text-lg tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            SABI<span className="text-amber-500">.</span>
          </span>
        </Link>

        {/* Level Progression Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-black">
            <Flame size={14} className="text-amber-500 animate-bounce" />
            <span>GATEWAY {question.id} OF 15</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs font-bold">
            <Star size={13} className="text-amber-500 fill-amber-500" />
            <span>+{(question.id - 1) * 20} XP</span>
          </div>

          <button
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isDark 
                ? 'border-slate-800 bg-slate-900/80 text-amber-400 hover:bg-slate-800' 
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
                ? 'border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white' 
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {audioEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </div>
      </header>

      {/* Edge-to-Edge Continuous Progress Bar */}
      <div className={`w-full h-1.5 shrink-0 overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-200'}`}>
        <div
          className="h-full bg-gradient-to-r from-blue-600 via-amber-400 to-amber-500 transition-all duration-500 shadow-sm shadow-amber-400/30"
          style={{ width: `${(question.id / 15) * 100}%` }}
        />
      </div>

      {/* UNIFIED FULL-VIEWPORT CONTAINER: Questions UP, Interactive Fields MIDDLE, Gate & Next Button DOWN */}
      <div className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
        
        {/* UPPER SECTION: The Main Question (Displayed ONCE in thick bold text, no repetition) */}
        <section className={`rounded-3xl p-5 sm:p-7 border shadow-lg transition-colors ${
          isDark ? 'bg-[#0D182E] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-500">
              LEVEL {question.id}: {question.id <= 5 ? 'FOUNDATION CITADEL' : question.id <= 10 ? 'STUDY STRATEGY' : 'MASTER COMBAT SETUP'}
            </span>
          </div>

          <h1 className={`text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-snug mb-2 ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}>
            {question.question}
          </h1>

          <p className={`text-xs sm:text-sm font-semibold mb-6 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            {question.subtext}
          </p>

          {/* DYNAMIC INTERACTIVE FIELDS: High-contrast, thick, legible text in Light & Dark */}
          <div className="space-y-4">
            {question.id === 1 && (
              <div className="space-y-2">
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
                  className={`w-full px-5 py-3.5 text-base sm:text-lg font-black rounded-2xl border-2 outline-none transition ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                  }`}
                />
                <span className="text-xs text-slate-400 font-medium block">
                  This name will appear on your UTME Mock Result Slips and leaderboards.
                </span>
              </div>
            )}

            {question.id === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                    Select 3 more subjects ({selectedSubjects.length} of 4 chosen):
                  </span>
                  <span className="text-amber-500 font-black">
                    {4 - selectedSubjects.length === 0 ? 'Combination Complete ✓' : `${4 - selectedSubjects.length} remaining`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {SUBJECTS_POOL.map(({ name, category }) => {
                    const isEnglish = name === 'English Language';
                    const checked = selectedSubjects.includes(name);

                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleSubject(name)}
                        className={`p-3 rounded-2xl border-2 text-left transition-all duration-150 cursor-pointer active:scale-95 flex flex-col justify-between ${
                          isEnglish
                            ? 'bg-amber-500/15 border-amber-500/50 text-amber-500 cursor-default'
                            : checked
                            ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30'
                            : isDark
                            ? 'bg-slate-950/60 border-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-slate-200'
                            : 'bg-slate-50 border-slate-300 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[9px] uppercase font-black tracking-wider opacity-80">
                            {isEnglish ? 'COMPULSORY' : category}
                          </span>
                          {(checked || isEnglish) && (
                            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black line-clamp-1">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {question.id === 3 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Current Class</label>
                  <div className="space-y-2">
                    {CLASS_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer('currentClass', opt)}
                        className={`w-full p-3.5 rounded-2xl border-2 text-left font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                          answers.currentClass === opt
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : isDark 
                            ? 'border-slate-800 bg-slate-950/60 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                            : 'border-slate-300 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Prior JAMB Attempts</label>
                  <div className="space-y-2">
                    {ATTEMPT_OPTIONS.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setAnswer('attempts', opt)}
                        className={`w-full p-3.5 rounded-2xl border-2 text-left font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                          answers.attempts === opt
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                            : isDark 
                            ? 'border-slate-800 bg-slate-950/60 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                            : 'border-slate-300 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Target Course of Study</label>
                  <input
                    type="text"
                    value={String(answers.targetCourse ?? '')}
                    placeholder="e.g. Medicine & Surgery, Law, Computer Science"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && canContinue) handlePushGate();
                    }}
                    onChange={e => setAnswer('targetCourse', e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-black outline-none ${
                      isDark ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-slate-400 mb-2">Goal University / Institution</label>
                  <input
                    type="text"
                    value={String(answers.targetUniversity ?? '')}
                    placeholder="e.g. University of Lagos (UNILAG), UI, OAU"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && canContinue) handlePushGate();
                    }}
                    onChange={e => setAnswer('targetUniversity', e.target.value)}
                    className={`w-full px-4 py-3.5 rounded-2xl border-2 text-sm font-black outline-none ${
                      isDark ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                    }`}
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
                    className={`p-4 rounded-2xl border-2 text-left font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                      answers.monthsUntilExam === opt
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : isDark 
                        ? 'border-slate-800 bg-slate-950/60 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                        : 'border-slate-300 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                    }`}
                  >
                    ⏳ {opt}
                  </button>
                ))}
              </div>
            )}

            {/* QUESTION 6: Rate confidence level — High-contrast, bold, thick legible text */}
            {question.id === 6 && (
              <div className="space-y-3">
                <span className="text-xs text-slate-400 font-bold block">
                  Rate readiness (1 = Beginner, 5 = JAMB Master):
                </span>
                {selectedSubjects.map(subj => {
                  const val = confidence[subj] ?? 0;
                  return (
                    <div 
                      key={subj} 
                      className={`p-3 sm:p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <span className={`font-black text-sm sm:text-base ${
                        isDark ? 'text-white' : 'text-slate-950'
                      }`}>
                        {subj}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-1.5">
                        {[1, 2, 3, 4, 5].map(starNum => (
                          <button
                            key={starNum}
                            type="button"
                            onClick={() => setAnswer('subjectConfidence', { ...confidence, [subj]: starNum })}
                            className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black text-xs flex items-center justify-center transition-all cursor-pointer active:scale-95 ${
                              val >= starNum
                                ? 'bg-blue-600 text-white shadow-md'
                                : isDark 
                                ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-400' 
                                : 'bg-slate-200 hover:bg-amber-400 hover:text-slate-950 text-slate-700'
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
                    className={`p-4 rounded-2xl border-2 text-left font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                      answers.prioritySubject === subj
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : isDark 
                        ? 'border-slate-800 bg-slate-950/60 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                        : 'border-slate-300 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                    }`}
                  >
                    🎯 {subj}
                  </button>
                ))}
              </div>
            )}

            {question.id === 8 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || []).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswer('struggleType', opt)}
                    className={`p-4 rounded-2xl border-2 text-left font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                      answers.struggleType === opt
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : isDark 
                        ? 'border-slate-800 bg-slate-950/60 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                        : 'border-slate-300 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {question.id === 9 && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={String(answers.weakTopics ?? '')}
                  placeholder="e.g. Organic Chemistry, Waves, Concord, Calculus"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handlePushGate();
                  }}
                  onChange={e => setAnswer('weakTopics', e.target.value)}
                  className={`w-full px-5 py-3.5 rounded-2xl border-2 text-base font-black outline-none ${
                    isDark ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                  }`}
                />
                <div className="flex flex-wrap gap-2">
                  {['Organic Chemistry', 'Calculus', 'Waves & Optics', 'Concord', 'Redox Reactions'].map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => {
                        const cur = String(answers.weakTopics ?? '');
                        setAnswer('weakTopics', cur ? `${cur}, ${topic}` : topic);
                      }}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-black transition cursor-pointer ${
                        isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-400' : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-blue-600'
                      }`}
                    >
                      + {topic}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {question.id >= 10 && question.id <= 14 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(question.options || []).map(opt => {
                  const isSelected = answers[question.fieldName] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(question.fieldName, opt)}
                      className={`p-4 rounded-2xl border-2 text-left font-black text-xs sm:text-sm transition-all duration-150 cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                          : isDark 
                          ? 'border-slate-800 bg-slate-950/60 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-200' 
                          : 'border-slate-300 bg-slate-50 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-slate-900'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {question.id === 15 && (
              <div className="space-y-3">
                <textarea
                  rows={3}
                  value={String(answers.motivation ?? '')}
                  placeholder="e.g. To make my family proud and gain direct admission to UNILAG Medicine on my first attempt!"
                  onChange={e => setAnswer('motivation', e.target.value)}
                  className={`w-full px-5 py-3.5 text-base font-black rounded-2xl border-2 outline-none ${
                    isDark 
                      ? 'bg-slate-950/80 border-slate-700 text-white focus:border-amber-400' 
                      : 'bg-slate-50 border-slate-300 text-slate-950 focus:border-blue-600 focus:bg-white'
                  }`}
                />
                <p className="text-xs text-amber-500 font-bold">
                  SABI uses your goal to encourage you during challenging practice sessions!
                </p>
              </div>
            )}
          </div>
        </section>

        {/* LOWER SECTION: Gate DOWN & Next Button BESIDE Gate (Compact, Professional, Zero Clutter) */}
        <section className={`mt-4 rounded-3xl p-4 sm:p-5 border shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
          isDark ? 'bg-[#0D182E] border-slate-800' : 'bg-white border-slate-200'
        }`}>
          {/* Sabi Scholar Pushing Iron Gate Animation (Down in the layout) */}
          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            <div className="relative w-24 h-20 sm:w-32 sm:h-24 flex items-center justify-center">
              <img
                src={gateUnlocked 
                  ? (question.id === 15 ? '/assets/mascots/onboarding/scholar_welcome_salute.svg' : '/assets/mascots/onboarding/scholar_gate_celebrate.svg') 
                  : '/assets/mascots/onboarding/scholar_pushing_gate.svg'}
                alt="Sabi Scholar Pushing Iron Gateway"
                className={`w-full h-full object-contain filter drop-shadow-md transition-all duration-300 transform ${
                  isPushingGate ? 'translate-x-3 scale-105' : ''
                }`}
              />
            </div>
            <div className="text-left hidden xs:block">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500 block">
                Iron Gateway {question.id} of 15
              </span>
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {canContinue ? 'Gate unlocked! Push to advance.' : 'Answer question above to unlock.'}
              </span>
            </div>
          </div>

          {/* Action Buttons: Back + PUSH GATE BESIDE the Gate */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto justify-end">
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
              className={`px-4 py-3 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                isDark 
                  ? 'border-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 bg-slate-900/60 text-slate-300' 
                  : 'border-slate-300 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 bg-slate-100 text-slate-800'
              }`}
            >
              <ArrowLeft size={16} /> Back
            </button>

            {/* PUSH GATE BUTTON BESIDE GATE */}
            <button
              type="button"
              disabled={!canContinue || isPushingGate}
              onClick={handlePushGate}
              className={`flex-1 sm:flex-initial px-6 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer border-2 ${
                canContinue
                  ? 'bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white border-blue-500 hover:border-amber-400 shadow-lg shadow-blue-600/30 hover:shadow-amber-400/40 transform hover:scale-[1.02] active:scale-95'
                  : 'bg-slate-800/40 text-slate-500 border-slate-700/40 cursor-not-allowed opacity-60'
              }`}
            >
              <span>
                {isPushingGate ? 'PUSHING GATE…' : question.id === 15 ? 'ENTER CITADEL 🚀' : 'PUSH GATE 🔓'}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
