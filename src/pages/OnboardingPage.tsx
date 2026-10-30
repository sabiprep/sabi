import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Sun, Moon, Volume2, VolumeX } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';
import { sound } from '../utils/soundEffects';
import { useTheme } from '../app/ThemeProvider';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'sabi_onboarding_v2_10q';
const CLASS_OPTIONS = ['SS2 Candidate', 'SS3 Candidate', 'Post-Secondary / Resitter'];
const ATTEMPT_OPTIONS = ['First UTME Sitting (0 prior)', '1 Previous UTME Sitting', '2+ Previous UTME Sittings'];
const POPULAR_COURSES = [
  'Medicine & Surgery',
  'Computer Science',
  'Law',
  'Nursing Science',
  'Mechanical Engineering',
  'Accounting',
  'Pharmacy',
  'Economics',
];
const POPULAR_UNIVERSITIES = [
  'UNILAG',
  'UI (Ibadan)',
  'OAU Ife',
  'UNILORIN',
  'UNN',
  'ABU Zaria',
  'FUTA',
  'UNIBEN',
  'LASU',
  'Covenant University',
];

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

  const totalSteps = ONBOARDING_QUESTIONS.length; // 10 mature questions
  const stepNumber = Number(step);
  const validStep = Number.isInteger(stepNumber) && stepNumber >= 1 && stepNumber <= totalSteps;
  const question = ONBOARDING_QUESTIONS[Math.min(Math.max(stepNumber, 1), totalSteps) - 1];

  const [answers, setAnswers] = useState<Answers>(readAnswers);
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
        return selectedSubjects.length === 4;
      case 2:
        return Boolean(String(answers.targetCourse ?? '').trim() && String(answers.targetUniversity ?? '').trim());
      case 3:
        return Boolean(answers.targetScore);
      case 4:
        return Boolean(answers.currentClass && answers.attempts);
      case 5:
        return Boolean(answers.monthsUntilExam);
      case 6:
        return selectedSubjects.every(subject => (confidence[subject] ?? 0) >= 1);
      case 7:
        return selectedSubjects.includes(String(answers.prioritySubject));
      case 8:
        return Boolean(answers.struggleType);
      case 9:
        return Boolean(answers.dailyStudyHours);
      case 10:
        return Boolean(answers.explanationPreference);
      default:
        return false;
    }
  }, [answers, confidence, question.id, selectedSubjects]);

  // Guard: Ensure candidate actually created a Supabase account before accessing Onboarding
  useEffect(() => {
    const email = (localStorage.getItem('sabi_user_email') || '').trim().toLowerCase();
    if (!email) {
      navigate('/auth/sign-up', { replace: true });
      return;
    }
    let cancelled = false;
    supabase
      .from('profiles')
      .select('id, email')
      .eq('email', email)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled || error) return;
        if (!data || !data.email) {
          localStorage.removeItem('sabi_user_signed_in');
          navigate('/auth/sign-up', { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleNext = async () => {
    if (!canContinue) return;
    sound.playCorrect();
    if (question.id === totalSteps) {
      const email = (localStorage.getItem('sabi_user_email') || '').trim().toLowerCase();
      if (!email) {
        navigate('/auth/sign-up', { replace: true });
        return;
      }

      localStorage.setItem('sabi_onboarding_v2_answers', JSON.stringify(answers));
      localStorage.setItem('sabi_user_signed_in', 'true');

      try {
        await supabase
          .from('profiles')
          .update({
            onboarding_completed: true,
            onboarding_answers: answers,
            registered_subjects: selectedSubjects,
            target_score: Number(answers.targetScore) || 320,
            updated_at: new Date().toISOString(),
          })
          .eq('email', email);
      } catch {
        // Backend sync fallback below
      }

      fetch('/api/profile/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          onboardingAnswers: answers,
          registeredSubjects: selectedSubjects,
          targetScore: answers.targetScore || 320,
        }),
      }).catch(() => {});

      navigate('/home');
    } else {
      navigate(`/onboarding/${question.id + 1}`);
    }
  };

  const handleBack = () => {
    sound.playTap();
    if (question.id > 1) {
      navigate(`/onboarding/${question.id - 1}`);
    } else {
      navigate('/auth/choice');
    }
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
        isDark ? 'bg-[#080D1A] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'
      }`}
    >
      {/* ===================================================================== */}
      {/* SIMPLE MATURE TOP HEADER (Standard Blue & Yellow Pairing)             */}
      {/* ===================================================================== */}
      <header
        className={`sabi-top-safe-bar px-4 sm:px-8 py-3.5 border-b shrink-0 flex items-center justify-between transition-colors ${
          isDark ? 'bg-[#0B1224] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <Link to="/welcome" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center font-black text-amber-400 text-base shadow-xs">
            S
          </div>
          <span className={`font-black text-lg tracking-tight ${isDark ? 'text-white' : 'text-blue-950'}`}>
            SABI
          </span>
        </Link>

        {/* Clean Step Counter */}
        <div className="flex items-center gap-3">
          <span className="text-xs sm:text-sm font-black tracking-wide text-blue-600 dark:text-amber-400 tabular-nums">
            Step {question.id} of {totalSteps}
          </span>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-amber-400 hover:bg-slate-800'
                : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <button
            type="button"
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                : 'border-slate-200 bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        </div>
      </header>

      {/* Clean Standard Blue & Yellow Progress Bar */}
      <div className={`w-full h-2 shrink-0 ${isDark ? 'bg-blue-950/60' : 'bg-blue-100'}`}>
        <div
          className="h-full bg-amber-400 transition-all duration-300"
          style={{ width: `${(question.id / totalSteps) * 100}%` }}
        />
      </div>

      {/* ===================================================================== */}
      {/* MAIN 10-QUESTION MATURE WORKSPACE                                     */}
      {/* ===================================================================== */}
      <div className="flex-1 min-h-0 w-full max-w-3xl mx-auto px-4 py-4 sm:px-6 sm:py-6 flex flex-col justify-between gap-4">
        
        {/* Unified Question + Scrollable Options Card */}
        <section
          className={`flex-1 min-h-0 rounded-3xl border-2 flex flex-col overflow-hidden shadow-lg transition-colors ${
            isDark ? 'bg-[#0E172B] border-blue-900/60' : 'bg-white border-blue-200'
          }`}
        >
          {/* Yellow & Royal Blue Standard Question Header */}
          <div className="shrink-0 bg-amber-400 text-slate-950 px-5 py-4 sm:px-7 sm:py-5 border-b-2 border-amber-500">
            <div className="flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wider text-blue-900 mb-1">
              <span>{question.category}</span>
              <span className="tabular-nums">{question.id} / {totalSteps}</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-snug text-slate-950">
              {question.question}
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-slate-900/80 mt-1">
              {question.subtext}
            </p>
          </div>

          {/* Scrollable Interactive Options Container */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 flex flex-col">
            
            {/* Q1: 4 JAMB SUBJECTS */}
            {question.id === 1 && (
              <div className="flex-1 flex flex-col gap-3">
                <div
                  className={`sticky top-0 z-10 py-2.5 px-4 rounded-xl border-2 flex items-center justify-between text-xs sm:text-sm font-black ${
                    isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-blue-50 border-blue-200 text-blue-950'
                  }`}
                >
                  <span>Selected: {selectedSubjects.length} of 4 Subjects</span>
                  <span className={selectedSubjects.length === 4 ? 'text-blue-600 dark:text-amber-400' : 'text-amber-600 dark:text-amber-400'}>
                    {selectedSubjects.length === 4 ? '✓ Combination Complete' : `Select ${4 - selectedSubjects.length} more`}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {SUBJECTS_POOL.map(({ name, category }) => {
                    const isEnglish = name === 'English Language';
                    const checked = selectedSubjects.includes(name);

                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleSubject(name)}
                        className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[72px] ${
                          isEnglish
                            ? 'bg-amber-400 border-amber-500 text-slate-950 cursor-default font-black'
                            : checked
                            ? 'bg-blue-700 border-blue-600 text-white shadow-md'
                            : isDark
                            ? 'bg-slate-900/90 border-slate-800 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-slate-100'
                            : 'bg-slate-50 border-slate-200 hover:border-amber-400 hover:bg-amber-400 hover:text-slate-950 text-slate-900'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                            {isEnglish ? 'COMPULSORY' : category}
                          </span>
                          {(checked || isEnglish) && (
                            <span className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-xs font-black">
                              <Check size={12} strokeWidth={3} />
                            </span>
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-black leading-tight">{name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Q2: TARGET COURSE & UNIVERSITY */}
            {question.id === 2 && (
              <div className="flex-1 flex flex-col justify-between gap-4">
                <div
                  className={`flex-1 p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400 mb-1.5">
                      Target Course of Study
                    </label>
                    <input
                      type="text"
                      value={String(answers.targetCourse ?? '')}
                      placeholder="e.g. Medicine & Surgery, Computer Science, Law"
                      onChange={e => setAnswer('targetCourse', e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-black outline-none ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                          : 'bg-white border-slate-300 text-slate-950 focus:border-blue-700'
                      }`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_COURSES.map(course => (
                      <button
                        key={course}
                        type="button"
                        onClick={() => setAnswer('targetCourse', course)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition cursor-pointer ${
                          answers.targetCourse === course
                            ? 'bg-blue-700 border-blue-600 text-white'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                        }`}
                      >
                        {course}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  className={`flex-1 p-4 sm:p-5 rounded-2xl border-2 flex flex-col justify-between gap-3 ${
                    isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400 mb-1.5">
                      First-Choice University / Institution
                    </label>
                    <input
                      type="text"
                      value={String(answers.targetUniversity ?? '')}
                      placeholder="e.g. UNILAG, UI, OAU, UNILORIN"
                      onChange={e => setAnswer('targetUniversity', e.target.value)}
                      className={`w-full px-4 py-3.5 rounded-xl border-2 text-base font-black outline-none ${
                        isDark
                          ? 'bg-slate-950 border-slate-700 text-white focus:border-amber-400'
                          : 'bg-white border-slate-300 text-slate-950 focus:border-blue-700'
                      }`}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_UNIVERSITIES.map(uni => (
                      <button
                        key={uni}
                        type="button"
                        onClick={() => setAnswer('targetUniversity', uni)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition cursor-pointer ${
                          answers.targetUniversity === uni
                            ? 'bg-blue-700 border-blue-600 text-white'
                            : isDark
                            ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                            : 'bg-white border-slate-200 text-slate-800 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                        }`}
                      >
                        {uni}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Q4: ACADEMIC LEVEL & PRIOR ATTEMPTS */}
            {question.id === 4 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400">
                    Current Academic Status
                  </span>
                  <div className="flex-1 flex flex-col gap-2.5">
                    {CLASS_OPTIONS.map(opt => {
                      const active = answers.currentClass === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer('currentClass', opt)}
                          className={`flex-1 p-4 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between transition cursor-pointer ${
                            active
                              ? 'bg-blue-700 border-blue-600 text-white shadow-md'
                              : isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                          }`}
                        >
                          <span>{opt}</span>
                          {active && (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-amber-400">
                    Previous UTME Sittings
                  </span>
                  <div className="flex-1 flex flex-col gap-2.5">
                    {ATTEMPT_OPTIONS.map(opt => {
                      const active = answers.attempts === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswer('attempts', opt)}
                          className={`flex-1 p-4 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between transition cursor-pointer ${
                            active
                              ? 'bg-blue-700 border-blue-600 text-white shadow-md'
                              : isDark
                              ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                              : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                          }`}
                        >
                          <span>{opt}</span>
                          {active && (
                            <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center">
                              <Check size={14} strokeWidth={3} />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Q6: SUBJECT CONFIDENCE MATRIX */}
            {question.id === 6 && (
              <div className="flex-1 flex flex-col justify-between gap-3">
                {selectedSubjects.map(subj => {
                  const val = confidence[subj] ?? 0;
                  return (
                    <div
                      key={subj}
                      className={`flex-1 p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <span className={`font-black text-base sm:text-lg block ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {subj}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">
                          {val === 0 ? 'Select readiness level (1 to 5)' : `Readiness Rating: ${val} / 5`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(num => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setAnswer('subjectConfidence', { ...confidence, [subj]: num })}
                            className={`flex-1 sm:flex-initial w-11 h-11 rounded-xl font-black text-sm flex items-center justify-center border-2 transition cursor-pointer ${
                              val >= num
                                ? 'bg-blue-700 border-blue-600 text-amber-300 shadow-xs'
                                : isDark
                                ? 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Q7: PRIORITY SUBJECT */}
            {question.id === 7 && (
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {selectedSubjects.map(subj => {
                  const active = answers.prioritySubject === subj;
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => setAnswer('prioritySubject', subj)}
                      className={`p-5 rounded-2xl border-2 text-left font-black text-base sm:text-lg flex items-center justify-between transition cursor-pointer ${
                        active
                          ? 'bg-blue-700 border-blue-600 text-white shadow-md'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                      }`}
                    >
                      <span>{subj}</span>
                      {active && (
                        <span className="w-7 h-7 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                          <Check size={16} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Q3, Q5, Q8, Q9, Q10: STANDARD RADIO OPTIONS */}
            {(question.id === 3 || question.id === 5 || question.id === 8 || question.id === 9 || question.id === 10) && (
              <div className="flex-1 flex flex-col justify-between gap-3">
                {(question.options || []).map(opt => {
                  const active = answers[question.fieldName] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswer(question.fieldName, opt)}
                      className={`flex-1 p-4 sm:p-5 rounded-2xl border-2 text-left font-black text-sm sm:text-base flex items-center justify-between gap-4 transition cursor-pointer ${
                        active
                          ? 'bg-blue-700 border-blue-600 text-white shadow-md'
                          : isDark
                          ? 'bg-slate-900 border-slate-800 text-slate-100 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                          : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                      }`}
                    >
                      <span className="leading-snug">{opt}</span>
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 ${
                          active
                            ? 'bg-amber-400 border-amber-400 text-slate-950'
                            : isDark
                            ? 'border-slate-700'
                            : 'border-slate-300'
                        }`}
                      >
                        {active && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ===================================================================== */}
        {/* SIMPLE BOTTOM NAVIGATION BAR (Blue Primary Button, Yellow Hover)      */}
        {/* ===================================================================== */}
        <footer className="shrink-0 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            className={`px-5 py-4 rounded-2xl border-2 font-black text-sm flex items-center gap-2 transition cursor-pointer ${
              isDark
                ? 'border-slate-800 bg-slate-900 text-slate-200 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
                : 'border-slate-300 bg-white text-slate-800 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400'
            }`}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <button
            type="button"
            disabled={!canContinue}
            onClick={handleNext}
            className={`flex-1 py-4 px-6 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 border-2 transition cursor-pointer ${
              canContinue
                ? 'bg-blue-700 hover:bg-amber-400 hover:text-slate-950 text-white border-blue-600 hover:border-amber-400 shadow-lg shadow-blue-700/25'
                : isDark
                ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
            }`}
          >
            <span>{question.id === totalSteps ? 'Complete Setup & Enter Dashboard' : 'Continue'}</span>
            <ArrowRight size={18} />
          </button>
        </footer>
      </div>
    </main>
  );
}
export default OnboardingPage;
