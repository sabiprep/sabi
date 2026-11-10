import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Moon, Sun } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL } from '../data/onboardingQuestions';
import type { SubjectName } from '../types';
import { useTheme } from '../app/ThemeProvider';
import { supabase } from '../lib/supabase';
import { apiPostJson, describeApiFailure } from '../utils/apiClient';

type Answers = Record<string, string | string[] | Record<string, number>>;
const DRAFT_KEY = 'sabi_onboarding_v3_draft';
const SUBMISSION_KEY = 'sabi_onboarding_submission_key';
const CLASS_OPTIONS = ['Secondary school student', 'Currently out of school', 'Post-secondary / resitter'];
const ATTEMPTS = ['First JAMB attempt', 'One previous attempt', 'Two or more previous attempts'];

function readDraft(): Answers {
  try { const raw = localStorage.getItem(DRAFT_KEY); return raw ? JSON.parse(raw) as Answers : {}; }
  catch { return {}; }
}

export function OnboardingPage() {
  const { step } = useParams();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const stepNumber = Number(step);
  const validStep = Number.isInteger(stepNumber) && stepNumber >= 1 && stepNumber <= ONBOARDING_QUESTIONS.length;
  const question = ONBOARDING_QUESTIONS[Math.min(Math.max(stepNumber, 1), ONBOARDING_QUESTIONS.length) - 1];
  const [answers, setAnswers] = useState<Answers>(readDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const selectedSubjects = (answers.chosenSubjects as string[] | undefined) ?? ['English Language'];
  const confidence = (answers.subjectConfidence as Record<string, number> | undefined) ?? {};
  const dark = isDark;
  const panel = dark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const field = dark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900';

  useEffect(() => { if (!validStep) navigate('/onboarding/1', { replace: true }); }, [validStep, navigate]);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(answers)); } catch { /* optional draft only */ } }, [answers]);
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => { if (!cancelled && !data?.user) navigate('/auth/sign-up', { replace: true }); });
    return () => { cancelled = true; };
  }, [navigate]);

  const setAnswer = (key: string, value: Answers[string]) => setAnswers(old => ({ ...old, [key]: value }));
  const toggleSubject = (subject: SubjectName) => {
    if (subject === 'English Language') return;
    setAnswers(old => {
      const current = (old.chosenSubjects as string[] | undefined) ?? ['English Language'];
      const next = current.includes(subject) ? current.filter(x => x !== subject) : current.length < 4 ? [...current, subject] : current;
      return { ...old, chosenSubjects: ['English Language', ...next.filter(x => x !== 'English Language')] };
    });
  };

  const canContinue = useMemo(() => {
    switch (question.key) {
      case 'fullName': return String(answers.fullName ?? '').trim().length >= 2;
      case 'chosenSubjects': return selectedSubjects.length === 4;
      case 'academicStatus': return Boolean(answers.currentClass && answers.attempts && (answers.currentClass !== 'Currently out of school' || String(answers.yearsOutOfSchool ?? '').trim()));
      case 'targetCourse': return Boolean(String(answers.targetCourse ?? '').trim() && String(answers.targetUniversity ?? '').trim());
      case 'subjectConfidence': return selectedSubjects.every(s => (confidence[s] ?? 0) >= 1);
      case 'prioritySubject': return selectedSubjects.includes(String(answers.prioritySubject ?? ''));
      case 'troubleTopic': return String(answers.troubleTopic ?? '').trim().length > 0;
      case 'motivation': return true;
      default: return Boolean(answers[question.fieldName]);
    }
  }, [answers, confidence, question, selectedSubjects]);

  const finish = async () => {
    setError(''); setSubmitting(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (!data?.user) { navigate('/auth/sign-up', { replace: true }); return; }
      const submissionKey = localStorage.getItem(SUBMISSION_KEY) || crypto.randomUUID();
      localStorage.setItem(SUBMISSION_KEY, submissionKey);
      const result = await apiPostJson('/api/profile/onboarding', {
        questionSetVersion: 'v3',
        submissionKey,
        onboardingAnswers: answers,
        registeredSubjects: selectedSubjects,
        targetScore: 320,
      });
      if (!result.ok) { setError(describeApiFailure(result, 'Could not save your onboarding answers.')); return; }
      localStorage.removeItem(SUBMISSION_KEY);
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem('sabi_onboarding_v2_answers', JSON.stringify(answers));
      navigate('/home');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your onboarding answers.');
    } finally { setSubmitting(false); }
  };

  const next = () => {
    if (!canContinue || submitting) return;
    if (question.id === ONBOARDING_QUESTIONS.length) { void finish(); return; }
    navigate('/onboarding/' + (question.id + 1));
  };
  const back = () => question.id > 1 ? navigate('/onboarding/' + (question.id - 1)) : navigate('/auth/choice');
  if (!validStep) return null;

  const optionClass = (active: boolean) => 'w-full rounded-xl border-2 p-4 text-left font-semibold transition ' + (active ? 'border-blue-600 bg-blue-600 text-white' : panel + ' hover:border-blue-400');
  return <main className={`min-h-[100dvh] flex flex-col ${dark ? 'bg-[#080D1A] text-white' : 'bg-slate-50 text-slate-900'}`}>
    <header className={`flex items-center justify-between border-b px-4 py-3 sm:px-8 ${dark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
      <Link to="/welcome" className="font-black tracking-tight text-xl text-blue-700">SABI</Link>
      <div className="flex items-center gap-3"><span className="text-sm font-bold tabular-nums">Step {question.id} of 15</span><button onClick={toggleTheme} aria-label="Toggle theme" className="rounded-lg border p-2">{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></div>
    </header>
    <div className={`h-1.5 ${dark ? 'bg-slate-800' : 'bg-blue-100'}`}><div className="h-full bg-blue-600 transition-all" style={{width:`${question.id / 15 * 100}%`}}/></div>
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-5 sm:px-6 sm:py-8">
      <section className={`flex flex-1 flex-col overflow-hidden rounded-3xl border shadow-sm ${panel}`}>
        <div className="bg-blue-700 px-5 py-6 text-white sm:px-8"><p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-100">{question.category} · {question.id}/15</p><h1 className="text-2xl font-black leading-tight sm:text-3xl">{question.question}</h1><p className="mt-2 text-sm text-blue-100">{question.subtext}</p></div>
        <div className="flex flex-col gap-3 p-4 sm:p-7">
          {question.type === 'text' && question.key === 'fullName' && <input autoComplete="name" value={String(answers.fullName ?? '')} onChange={e=>setAnswer('fullName',e.target.value)} placeholder="Your full name" className={`w-full rounded-xl border p-4 outline-none focus:border-blue-600 ${field}`}/>}
          {question.type === 'subjects' && <><p className="text-sm font-bold">Selected {selectedSubjects.length} of 4 · English Language is compulsory</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{SUBJECTS_POOL.map(({name,category})=>{const active=selectedSubjects.includes(name);const compulsory=name==='English Language';return <button key={name} onClick={()=>toggleSubject(name)} type="button" className={`rounded-xl border-2 p-3 text-left ${active?'border-blue-600 bg-blue-600 text-white':panel}`}><span className="block text-[10px] font-bold uppercase opacity-70">{compulsory?'Compulsory':category}</span><span className="text-sm font-bold">{name}</span>{active&&<Check size={15} className="mt-1"/>}</button>})}</div></>}
          {question.type === 'status' && <><label className="text-sm font-bold">Current status<select value={String(answers.currentClass ?? '')} onChange={e=>setAnswer('currentClass',e.target.value)} className={`mt-2 w-full rounded-xl border p-4 ${field}`}><option value="">Select status</option>{CLASS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></label><label className="text-sm font-bold">Previous JAMB attempts<select value={String(answers.attempts ?? '')} onChange={e=>setAnswer('attempts',e.target.value)} className={`mt-2 w-full rounded-xl border p-4 ${field}`}><option value="">Select attempts</option>{ATTEMPTS.map(x=><option key={x}>{x}</option>)}</select></label>{answers.currentClass==='Currently out of school'&&<label className="text-sm font-bold">How many years have you been out of school?<input value={String(answers.yearsOutOfSchool ?? '')} onChange={e=>setAnswer('yearsOutOfSchool',e.target.value)} placeholder="e.g. 2 years" className={`mt-2 w-full rounded-xl border p-4 ${field}`}/></label>}</>}
          {question.type === 'course_uni' && <><label className="text-sm font-bold">Target course<input value={String(answers.targetCourse ?? '')} onChange={e=>setAnswer('targetCourse',e.target.value)} placeholder="e.g. Electrical and Electronics Engineering" className={`mt-2 w-full rounded-xl border p-4 ${field}`}/></label><label className="text-sm font-bold">Target university<input value={String(answers.targetUniversity ?? '')} onChange={e=>setAnswer('targetUniversity',e.target.value)} placeholder="e.g. University of Uyo" className={`mt-2 w-full rounded-xl border p-4 ${field}`}/></label></>}
          {question.type === 'radio' && question.options?.map(opt=><button type="button" key={opt} onClick={()=>setAnswer(question.fieldName,opt)} className={optionClass(answers[question.fieldName]===opt)}>{opt}</button>)}
          {question.type === 'confidence' && selectedSubjects.map(subject=><div key={subject} className={`rounded-xl border p-4 ${panel}`}><p className="mb-3 font-bold">{subject} <span className="text-xs font-normal opacity-70">· confidence</span></p><div className="grid grid-cols-5 gap-2">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setAnswer('subjectConfidence',{...confidence,[subject]:n})} className={`rounded-lg border p-3 font-bold ${confidence[subject]===n?'bg-blue-600 text-white border-blue-600':field}`}>{n}</button>)}</div></div>)}
          {question.type === 'priority' && selectedSubjects.map(subject=><button type="button" key={subject} onClick={()=>setAnswer('prioritySubject',subject)} className={optionClass(answers.prioritySubject===subject)}>{subject}</button>)}
          {question.type === 'text' && question.key === 'troubleTopic' && <textarea rows={5} value={String(answers.troubleTopic ?? '')} onChange={e=>setAnswer('troubleTopic',e.target.value)} placeholder="For example: quadratic equations, organic chemistry, vectors..." className={`w-full rounded-xl border p-4 ${field}`}/>}
          {question.type === 'long_text' && <textarea rows={6} maxLength={2000} value={String(answers.motivation ?? '')} onChange={e=>setAnswer('motivation',e.target.value)} placeholder="What are you hoping to achieve through your education?" className={`w-full rounded-xl border p-4 ${field}`}/>}
        </div>
      </section>
      {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
      <footer className="flex gap-3"><button type="button" onClick={back} className={`rounded-xl border px-5 py-4 font-bold ${panel}`}><ArrowLeft size={18}/></button><button type="button" disabled={!canContinue||submitting} onClick={next} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{question.id===15?(submitting?'Saving…':'Complete setup'): 'Continue'} <ArrowRight size={18}/></button></footer>
    </div>
  </main>;
}
export default OnboardingPage;
