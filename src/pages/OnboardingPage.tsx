import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Moon, ShieldCheck, Sparkles, Sun } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';
import { useTheme } from '../app/ThemeProvider';
import { supabase } from '../lib/supabase';
import { apiPostJson } from '../utils/apiClient';
import { sound } from '../utils/soundEffects';

type Answers = Record<string, string | string[] | Record<string, number>>;
const DRAFT_KEY = 'sabi_onboarding_v3_draft';
const SUBMISSION_KEY = 'sabi_onboarding_submission_key';
const CLASS_OPTIONS = [
  'Secondary school student',
  'Currently out of school',
  'Post-secondary / resitter',
];
const ATTEMPTS = [
  'First JAMB attempt',
  'One previous attempt',
  'Two or more previous attempts',
];

function readDraft(): Answers {
  try {
    const raw =
      localStorage.getItem(DRAFT_KEY) ||
      localStorage.getItem('sabi_onboarding_v3_answers') ||
      localStorage.getItem('sabi_onboarding_v2_answers');
    return raw ? (JSON.parse(raw) as Answers) : {};
  } catch {
    return {};
  }
}

export function OnboardingPage() {
  const { step } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const stepNumber = Number(step);
  const validStep =
    Number.isInteger(stepNumber) &&
    stepNumber >= 1 &&
    stepNumber <= ONBOARDING_QUESTIONS.length;
  const question =
    ONBOARDING_QUESTIONS[
      Math.min(Math.max(stepNumber || 1, 1), ONBOARDING_QUESTIONS.length) - 1
    ];

  const [answers, setAnswers] = useState<Answers>(readDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [gateCelebrating, setGateCelebrating] = useState(false);

  const selectedSubjects = (answers.chosenSubjects as string[] | undefined) ?? [
    'English Language',
  ];
  const confidence =
    (answers.subjectConfidence as Record<string, number> | undefined) ?? {};
  const dark = isDark;
  const panel = dark
    ? 'bg-[#0C1428] border-slate-800 text-white'
    : 'bg-white border-slate-200 text-slate-900';
  const field = dark
    ? 'bg-slate-950 border-slate-700 text-white'
    : 'bg-white border-slate-300 text-slate-900';

  useEffect(() => {
    if (!validStep) navigate('/onboarding/1', { replace: true });
  }, [validStep, navigate]);

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(answers));
    } catch {
      // optional draft only
    }
  }, [answers]);

  const setAnswer = (key: string, value: Answers[string]) => {
    sound.playTap();
    setAnswers(old => ({ ...old, [key]: value }));
  };

  const toggleSubject = (subject: SubjectName) => {
    if (subject === 'English Language') return;
    sound.playTap();
    setAnswers(old => {
      const current = (old.chosenSubjects as string[] | undefined) ?? [
        'English Language',
      ];
      const next = current.includes(subject)
        ? current.filter(x => x !== subject)
        : current.length < 4
        ? [...current, subject]
        : current;
      return {
        ...old,
        chosenSubjects: [
          'English Language',
          ...next.filter(x => x !== 'English Language'),
        ],
      };
    });
  };

  const canContinue = useMemo(() => {
    switch (question.key) {
      case 'fullName':
        return String(answers.fullName ?? '').trim().length >= 2;
      case 'chosenSubjects':
        return selectedSubjects.length === 4;
      case 'academicStatus':
        return Boolean(
          answers.currentClass &&
            answers.attempts &&
            (answers.currentClass !== 'Currently out of school' ||
              String(answers.yearsOutOfSchool ?? '').trim())
        );
      case 'targetCourse':
        return Boolean(
          String(answers.targetCourse ?? '').trim() &&
            String(answers.targetUniversity ?? '').trim()
        );
      case 'subjectConfidence':
        return selectedSubjects.every(s => (confidence[s] ?? 0) >= 1);
      case 'prioritySubject':
        return selectedSubjects.includes(String(answers.prioritySubject ?? ''));
      case 'troubleTopic':
        return String(answers.troubleTopic ?? '').trim().length > 0;
      case 'motivation':
        return true;
      default:
        return Boolean(answers[question.fieldName]);
    }
  }, [answers, confidence, question, selectedSubjects]);

  const finish = async () => {
    setError('');
    setSubmitting(true);
    setGateCelebrating(true);
    try {
      sound.playSuccess();
      confetti({ particleCount: 75, spread: 70, origin: { y: 0.6 } });
    } catch {
      // ignore
    }

    try {
      const fullName = String(answers.fullName ?? '').trim();
      if (fullName) {
        localStorage.setItem('sabi_user_name', fullName);
      }
      localStorage.setItem('sabi_onboarding_v3_answers', JSON.stringify(answers));
      localStorage.setItem('sabi_onboarding_v2_answers', JSON.stringify(answers));
      localStorage.removeItem(DRAFT_KEY);

      const { data } = await supabase.auth.getUser().catch(() => ({ data: null }));
      if (data?.user) {
        const submissionKey =
          localStorage.getItem(SUBMISSION_KEY) || crypto.randomUUID();
        localStorage.setItem(SUBMISSION_KEY, submissionKey);
        await apiPostJson('/api/profile/onboarding', {
          questionSetVersion: 'v3',
          submissionKey,
          onboardingAnswers: answers,
          registeredSubjects: selectedSubjects,
        }).catch(() => {});
        localStorage.removeItem(SUBMISSION_KEY);
      }
      navigate('/home');
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not save your onboarding answers.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (!canContinue || submitting) return;
    if (question.id === ONBOARDING_QUESTIONS.length) {
      void finish();
      return;
    }
    sound.playSuccess();
    setGateCelebrating(true);
    setTimeout(() => {
      setGateCelebrating(false);
      navigate('/onboarding/' + (question.id + 1));
    }, 260);
  };

  const back = () =>
    question.id > 1
      ? navigate('/onboarding/' + (question.id - 1))
      : navigate('/auth/choice');

  if (!validStep) return null;

  const progressPct = Math.round((question.id / ONBOARDING_QUESTIONS.length) * 100);
  const mascotSvg = gateCelebrating
    ? '/assets/mascots/onboarding/scholar_gate_celebrate.svg'
    : question.id === 1
    ? '/assets/mascots/onboarding/scholar_welcome_salute.svg'
    : '/assets/mascots/onboarding/scholar_pushing_gate.svg';

  const optionClass = (active: boolean) =>
    'w-full rounded-2xl border-2 p-4 text-left font-bold transition cursor-pointer flex items-center justify-between ' +
    (active
      ? 'border-blue-600 bg-blue-600 text-white shadow-md'
      : panel + ' hover:border-blue-400');

  return (
    <main
      className={`min-h-[100dvh] flex flex-col ${
        dark ? 'bg-[#070C18] text-white' : 'bg-[#F4F8FF] text-slate-900'
      }`}
    >
      {/* Top Gateway Header */}
      <header
        className={`flex items-center justify-between border-b px-4 py-3 sm:px-8 ${
          dark ? 'bg-[#090F1E] border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <Link to="/welcome" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black flex items-center justify-center">
            S
          </div>
          <div>
            <span className="font-black tracking-tight text-base block leading-none">
              SABI JAMB CBT
            </span>
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
              GAMIFIED GATEWAY
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2.5">
          <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/40 text-amber-400 text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} />
            <span>
              GATEWAY {question.id} OF {ONBOARDING_QUESTIONS.length}
            </span>
          </span>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-xl border border-slate-700 p-2 cursor-pointer"
          >
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-7">
        {/* GAMIFIED CITADEL GATE PROGRESS CARD (Restored from Original Design) */}
        <section
          className={`rounded-3xl border-2 p-4 sm:p-5 flex items-center justify-between gap-4 ${
            dark
              ? 'bg-[#0B1326] border-slate-800 text-white'
              : 'bg-[#0B1326] border-[#1A294B] text-white shadow-lg'
          }`}
        >
          <div className="flex items-center gap-4 flex-1">
            <img
              src={mascotSvg}
              alt="Sabi Scholar at Citadel Gate"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain shrink-0 drop-shadow-md"
            />
            <div className="space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 block">
                    {question.category}
                  </span>
                  <h2 className="text-sm sm:text-base font-black text-white">
                    {canContinue
                      ? 'Gateway Unlocked! Push Open to Advance →'
                      : 'Complete this step to unlock the Citadel Gate'}
                  </h2>
                </div>
                <span className="text-sm font-black text-amber-400 tabular-nums">
                  {progressPct}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* MAIN QUESTION CARD */}
        <section
          className={`flex flex-1 flex-col overflow-hidden rounded-3xl border-2 shadow-lg ${panel}`}
        >
          <div className="bg-gradient-to-r from-[#0A1F66] via-[#0052CC] to-[#0066FF] px-5 py-6 text-white sm:px-8">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-3 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider">
                QUESTION {question.id} / {ONBOARDING_QUESTIONS.length}
              </span>
              <span className="px-3 py-0.5 rounded-full bg-white/15 text-white text-[10px] font-bold uppercase tracking-wider">
                {question.category}
              </span>
            </div>
            <h1 className="text-xl sm:text-3xl font-black leading-tight">
              {question.question}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-blue-100">
              {question.subtext}
            </p>
          </div>

          <div className="flex flex-col gap-3.5 p-5 sm:p-7">
            {question.type === 'text' && question.key === 'fullName' && (
              <input
                autoComplete="name"
                value={String(answers.fullName ?? '')}
                onChange={e => setAnswer('fullName', e.target.value)}
                placeholder="Enter your full name (e.g. Kendrick Adebayo)"
                className={`w-full rounded-2xl border-2 p-4 font-bold outline-none focus:border-blue-600 ${field}`}
              />
            )}

            {question.type === 'subjects' && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-blue-600/10 border border-blue-500/30">
                  <span className="text-xs sm:text-sm font-black text-blue-500 flex items-center gap-2">
                    <ShieldCheck size={17} />
                    <span>English Language (Use of English) is Compulsory</span>
                  </span>
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black">
                    {selectedSubjects.length} / 4 Selected
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {SUBJECTS_POOL.map(({ name, category }) => {
                    const active = selectedSubjects.includes(name);
                    const compulsory = name === 'English Language';
                    return (
                      <button
                        key={name}
                        onClick={() => toggleSubject(name)}
                        type="button"
                        className={`rounded-2xl border-2 p-3.5 text-left transition cursor-pointer flex flex-col justify-between ${
                          active
                            ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                            : panel + ' hover:border-blue-400'
                        }`}
                      >
                        <div>
                          <span className="block text-[10px] font-black uppercase opacity-75">
                            {compulsory ? 'COMPULSORY' : category}
                          </span>
                          <span className="text-xs sm:text-sm font-black mt-0.5 block">
                            {name}
                          </span>
                        </div>
                        {active && (
                          <div className="mt-2 flex justify-end">
                            <Check size={15} className="text-amber-300" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {question.type === 'status' && (
              <>
                <label className="text-sm font-black">
                  Current Academic Status
                  <select
                    value={String(answers.currentClass ?? '')}
                    onChange={e => setAnswer('currentClass', e.target.value)}
                    className={`mt-2 w-full rounded-2xl border-2 p-4 font-bold ${field}`}
                  >
                    <option value="">Select status</option>
                    {CLASS_OPTIONS.map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-black">
                  Previous JAMB Attempts
                  <select
                    value={String(answers.attempts ?? '')}
                    onChange={e => setAnswer('attempts', e.target.value)}
                    className={`mt-2 w-full rounded-2xl border-2 p-4 font-bold ${field}`}
                  >
                    <option value="">Select attempts</option>
                    {ATTEMPTS.map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </label>
                {answers.currentClass === 'Currently out of school' && (
                  <label className="text-sm font-black">
                    How many years have you been out of school?
                    <input
                      value={String(answers.yearsOutOfSchool ?? '')}
                      onChange={e =>
                        setAnswer('yearsOutOfSchool', e.target.value)
                      }
                      placeholder="e.g. 2 years"
                      className={`mt-2 w-full rounded-2xl border-2 p-4 font-bold ${field}`}
                    />
                  </label>
                )}
              </>
            )}

            {question.type === 'course_uni' && (
              <>
                <label className="text-sm font-black">
                  Target Course of Study
                  <input
                    value={String(answers.targetCourse ?? '')}
                    onChange={e => setAnswer('targetCourse', e.target.value)}
                    placeholder="e.g. Medicine & Surgery, Computer Science, Law..."
                    className={`mt-2 w-full rounded-2xl border-2 p-4 font-bold ${field}`}
                  />
                </label>
                <label className="text-sm font-black">
                  Target First-Choice Institution
                  <input
                    value={String(answers.targetUniversity ?? '')}
                    onChange={e => setAnswer('targetUniversity', e.target.value)}
                    placeholder="e.g. UNILAG, UI, OAU, UNIUYO, UNN..."
                    className={`mt-2 w-full rounded-2xl border-2 p-4 font-bold ${field}`}
                  />
                </label>
              </>
            )}

            {question.type === 'radio' &&
              question.options?.map(opt => {
                const active = answers[question.fieldName] === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => setAnswer(question.fieldName, opt)}
                    className={optionClass(active)}
                  >
                    <span>{opt}</span>
                    {active && <Check size={18} className="text-amber-300" />}
                  </button>
                );
              })}

            {question.type === 'confidence' &&
              selectedSubjects.map(subject => (
                <div
                  key={subject}
                  className={`rounded-2xl border-2 p-4 ${panel}`}
                >
                  <p className="mb-3 font-black">
                    {subject}{' '}
                    <span className="text-xs font-bold opacity-70">
                      · Rate 1 (Needs Rescue) to 5 (Strong)
                    </span>
                  </p>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() =>
                          setAnswer('subjectConfidence', {
                            ...confidence,
                            [subject]: n,
                          })
                        }
                        className={`rounded-xl border-2 p-3 font-black cursor-pointer transition ${
                          confidence[subject] === n
                            ? 'bg-blue-600 text-white border-blue-500 scale-105'
                            : field
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            {question.type === 'priority' &&
              selectedSubjects.map(subject => {
                const active = answers.prioritySubject === subject;
                return (
                  <button
                    type="button"
                    key={subject}
                    onClick={() => setAnswer('prioritySubject', subject)}
                    className={optionClass(active)}
                  >
                    <span>{subject}</span>
                    {active && <Check size={18} className="text-amber-300" />}
                  </button>
                );
              })}

            {question.type === 'text' && question.key === 'troubleTopic' && (
              <textarea
                rows={4}
                value={String(answers.troubleTopic ?? '')}
                onChange={e => setAnswer('troubleTopic', e.target.value)}
                placeholder="For example: Quadratic equations, Organic chemistry, Projectiles & Waves, Concord..."
                className={`w-full rounded-2xl border-2 p-4 font-bold ${field}`}
              />
            )}

            {question.type === 'long_text' && (
              <textarea
                rows={5}
                maxLength={2000}
                value={String(answers.motivation ?? '')}
                onChange={e => setAnswer('motivation', e.target.value)}
                placeholder="Share your dream UTME score and why securing admission this year matters to you..."
                className={`w-full rounded-2xl border-2 p-4 font-bold ${field}`}
              />
            )}
          </div>
        </section>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm font-semibold text-rose-700"
          >
            {error}
          </p>
        )}

        <footer className="flex gap-3">
          <button
            type="button"
            onClick={back}
            className={`rounded-2xl border-2 px-5 py-4 font-black flex items-center gap-2 cursor-pointer ${panel}`}
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <button
            type="button"
            disabled={!canContinue || submitting}
            onClick={next}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-4 font-black text-slate-950 uppercase tracking-wider shadow-lg disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer transition"
          >
            <span>
              {question.id === ONBOARDING_QUESTIONS.length
                ? submitting
                  ? 'Unlocking SABI Citadel…'
                  : 'Complete Setup & Enter Dashboard'
                : 'Push Open Gateway'}
            </span>
            <ArrowRight size={18} />
          </button>
        </footer>
      </div>
    </main>
  );
}
export default OnboardingPage;
