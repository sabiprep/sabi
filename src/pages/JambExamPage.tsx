import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient';

type ExamConfig = { key: string; title: string; question_count: number; duration_seconds: number; compulsory_subject_slug: string };
type Subject = { slug: string; display_name: string; category: string };
type ExamQuestion = { id: string; subjectSlug: string; questionNumber: number; question: string; option_a: string; option_b: string; option_c: string; option_d: string; selectedAnswer: string | null; answered: boolean };
type ExamResult = { totalQuestions: number; attempted: number; unanswered: number; correct: number; incorrect: number; accuracy: number; subjects: Array<{subjectSlug:string;attempted:number;correct:number;incorrect:number;accuracy:number}>; readiness: {estimateAvailable:boolean;reason:string} };

async function requestJson(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}
const letters = ['A','B','C','D'] as const;
const optionField = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' } as const;
const formatTime = (seconds: number) => `${Math.floor(seconds / 3600).toString().padStart(2,'0')}:${Math.floor((seconds % 3600) / 60).toString().padStart(2,'0')}:${(seconds % 60).toString().padStart(2,'0')}`;

export function JambExamPage() {
  const [configs, setConfigs] = useState<ExamConfig[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allowed, setAllowed] = useState<Array<{configuration_key:string;subject_slug:string}>>([]);
  const [configurationKey, setConfigurationKey] = useState('quick-mock');
  const [subjectSlugs, setSubjectSlugs] = useState<string[]>(['use-of-english','mathematics','physics','chemistry']);
  const [runId, setRunId] = useState('');
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadSetup = useCallback(async () => {
    try {
      const data = await requestJson('/api/jamb-exams/configurations');
      setConfigs(data.configurations || []);
      setSubjects(data.subjects || []);
      setAllowed(data.allowedSubjects || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Exam setup could not be loaded.'); }
  }, []);
  useEffect(() => { void loadSetup(); }, [loadSetup]);

  const activeConfig = configs.find(c => c.key === configurationKey);
  const subjectOptions = useMemo(() => subjects.filter(s =>
    allowed.some(a => a.configuration_key === configurationKey && a.subject_slug === s.slug)
  ), [subjects, allowed, configurationKey]);

  useEffect(() => {
    if (!activeConfig) return;
    setSubjectSlugs(current => {
      const allowedSlugs = new Set(subjectOptions.map(s => s.slug));
      const retained = current.filter(s => allowedSlugs.has(s));
      const required = activeConfig.compulsory_subject_slug;
      if (!retained.includes(required)) retained.unshift(required);
      for (const subject of subjectOptions) {
        if (retained.length >= 4) break;
        if (!retained.includes(subject.slug)) retained.push(subject.slug);
      }
      return retained.slice(0,4);
    });
  }, [activeConfig, subjectOptions]);

  const loadRun = useCallback(async (id: string) => {
    const data = await requestJson(`/api/jamb-exams/runs/${id}`);
    setQuestions(data.questions || []);
    setRemaining(data.exam.remainingSeconds || 0);
  }, []);

  useEffect(() => {
    if (!runId || result) return;
    const timer = window.setInterval(() => setRemaining(value => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [runId, result]);

  useEffect(() => {
    if (runId && remaining === 0 && !result) void submitExam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, runId, result]);

  async function startExam() {
    setLoading(true); setError(''); setNotice('');
    try {
      const created = await requestJson('/api/jamb-exams/runs', {
        method: 'POST', body: JSON.stringify({ configurationKey, subjectSlugs }),
      });
      setRunId(created.examRunId);
      await loadRun(created.examRunId);
      setIndex(0);
    } catch (e) { setError(e instanceof Error ? e.message : 'The exam could not start.'); }
    finally { setLoading(false); }
  }

  async function chooseAnswer(question: ExamQuestion, answer: typeof letters[number]) {
    if (!runId || question.answered || loading) return;
    setLoading(true); setError(''); setNotice('');
    try {
      await requestJson(`/api/jamb-exams/runs/${runId}/questions/${question.id}/answer`, {
        method: 'POST', body: JSON.stringify({ answer }),
      });
      setQuestions(current => current.map(q => q.id === question.id ? { ...q, answered: true, selectedAnswer: answer } : q));
      setNotice('Answer saved. You can continue to the next question.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Answer could not be saved.'); }
    finally { setLoading(false); }
  }

  async function submitExam() {
    if (!runId || result || loading) return;
    setLoading(true); setError('');
    try {
      const data = await requestJson(`/api/jamb-exams/runs/${runId}/submit`, { method: 'POST' });
      setResult(data.result);
    } catch (e) { setError(e instanceof Error ? e.message : 'The exam could not be submitted.'); }
    finally { setLoading(false); }
  }

  const current = questions[index];
  const completedCount = questions.filter(q => q.answered).length;

  if (result) return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 sm:px-6">
      <section className="mx-auto max-w-4xl space-y-6">
        <Link to="/practice/custom" className="text-sm font-bold text-blue-600">← Exam hub</Link>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-black uppercase tracking-widest text-blue-600">SABI · Exam report</p>
          <h1 className="mt-2 text-3xl font-black">Your mock exam results</h1>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Correct',result.correct],['Attempted',result.attempted],['Unanswered',result.unanswered],['Accuracy',`${Math.round(result.accuracy*100)}%`]].map(([label,value])=><div key={label} className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></div>)}
          </div>
          <h2 className="mt-8 text-lg font-black">Subject performance</h2>
          <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {result.subjects.map(s=><div key={s.subjectSlug} className="flex items-center justify-between gap-3 py-3"><span className="font-semibold">{subjects.find(x=>x.slug===s.subjectSlug)?.display_name || s.subjectSlug}</span><span className="text-sm text-slate-500">{s.correct}/{s.attempted} correct · {Math.round(s.accuracy*100)}%</span></div>)}
          </div>
          <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{result.readiness.reason}</p>
          <button onClick={()=>{setRunId('');setQuestions([]);setResult(null);setRemaining(0);setIndex(0);}} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white">Start another mock</button>
        </div>
      </section>
    </main>
  );

  if (runId && current) return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 sm:px-6">
      <section className="mx-auto max-w-3xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">SABI · Timed UTME</p><p className="text-sm text-slate-500">Question {index+1} of {questions.length} · {completedCount} answered</p></div>
          <div className={`rounded-xl px-4 py-2 font-mono text-lg font-black ${remaining < 300 ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300' : 'bg-white dark:bg-slate-900'}`}>{formatTime(remaining)}</div>
        </header>
        <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{width:`${(completedCount/Math.max(1,questions.length))*100}%`}} /></div>
        <article className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-600">{subjects.find(s=>s.slug===current.subjectSlug)?.display_name || current.subjectSlug}</p>
          <h1 className="mt-4 whitespace-pre-wrap text-lg font-bold leading-relaxed sm:text-xl">{current.question}</h1>
          <div className="mt-6 space-y-3">
            {letters.map(letter=><button key={letter} disabled={current.answered || loading} onClick={()=>void chooseAnswer(current,letter)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition ${current.selectedAnswer===letter?'border-blue-500 bg-blue-50 dark:bg-blue-500/10':'border-slate-200 hover:border-blue-300 dark:border-slate-700'} disabled:cursor-not-allowed disabled:opacity-80`}><span className="font-black">{letter}.</span><span>{current[optionField[letter]]}</span>{current.selectedAnswer===letter&&<span className="ml-auto text-xs font-bold text-blue-600">Saved</span>}</button>)}
          </div>
          {current.answered&&<p className="mt-4 text-xs text-emerald-700 dark:text-emerald-300">Your answer is saved and locked for this exam.</p>}
        </article>
        {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        {notice&&<p className="mt-4 text-sm text-emerald-700 dark:text-emerald-300">{notice}</p>}
        <div className="mt-5 flex items-center justify-between gap-3"><button onClick={()=>setIndex(i=>Math.max(0,i-1))} disabled={index===0} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-40 dark:border-slate-700">Previous</button><button onClick={()=>setIndex(i=>Math.min(questions.length-1,i+1))} disabled={index===questions.length-1} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-40 dark:border-slate-700">Next question</button><button onClick={()=>void submitExam()} disabled={loading} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">Submit exam</button></div>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 sm:px-6">
      <section className="mx-auto max-w-3xl space-y-6">
        <Link to="/practice/custom" className="text-sm font-bold text-blue-600">← Back to simulator</Link>
        <div><p className="text-xs font-black uppercase tracking-widest text-blue-600">SABI · JAMB readiness</p><h1 className="mt-2 text-3xl font-black">Build your mock exam</h1><p className="mt-2 text-sm text-slate-500">Choose an exam length and four subjects. Your paper is assembled only from approved questions with verified sources and syllabus mapping.</p></div>
        <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <label className="block text-sm font-bold">Exam format<select value={configurationKey} onChange={e=>setConfigurationKey(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-transparent p-3 dark:border-slate-700">{configs.map(c=><option key={c.key} value={c.key}>{c.title} · {c.question_count} questions · {Math.round(c.duration_seconds/60)} min</option>)}</select></label>
          <p className="mt-6 text-sm font-bold">Select four subjects <span className="text-slate-500">(Use of English is compulsory)</span></p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {subjectOptions.map(subject=><label key={subject.slug} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><input type="checkbox" checked={subjectSlugs.includes(subject.slug)} disabled={subject.slug==='use-of-english'||(!subjectSlugs.includes(subject.slug)&&subjectSlugs.length>=4)} onChange={e=>setSubjectSlugs(current=>e.target.checked?[...current,subject.slug]:current.filter(s=>s!==subject.slug))}/><span>{subject.display_name}</span></label>)}
          </div>
          <p className="mt-4 text-xs text-slate-500">{subjectSlugs.length}/4 selected</p>
          {error&&<p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
          <button onClick={()=>void startExam()} disabled={loading||!activeConfig||subjectSlugs.length!==4} className="mt-6 w-full rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-black text-white disabled:opacity-50">{loading?'Preparing verified question set…':'Start timed mock exam'}</button>
        </div>
      </section>
    </main>
  );
}
