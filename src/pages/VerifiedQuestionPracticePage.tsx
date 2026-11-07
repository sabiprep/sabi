import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpenCheck, CircleAlert, Flag, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

type EligibleQuestion = {
  id: string; subject: string; topic: string; subtopic: string; year?: number | null;
  question: string; option_a: string; option_b: string; option_c: string; option_d: string;
  difficulty?: string;
};
type Evaluation = { is_correct: boolean; correct_answer: string; explanation: string };
const subjects = [
  { label: 'All subjects', value: '' },
  { label: 'English Language', value: 'use-of-english' },
  { label: 'Mathematics', value: 'mathematics' },
  { label: 'Physics', value: 'physics' },
  { label: 'Chemistry', value: 'chemistry' },
  { label: 'Biology', value: 'biology' },
  { label: 'Economics', value: 'economics' },
  { label: 'Government', value: 'government' },
  { label: 'Literature in English', value: 'literature-in-english' },
];
const options = ['A', 'B', 'C', 'D'] as const;
const optionKey = { A: 'option_a', B: 'option_b', C: 'option_c', D: 'option_d' } as const;

async function requestJson(path: string, init?: RequestInit) {
  const response = await apiFetch(path, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body;
}

export function VerifiedQuestionPracticePage() {
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState<EligibleQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [flagOpen, setFlagOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('wrong_answer');
  const [flagDetails, setFlagDetails] = useState('');

  const loadQuestions = useCallback(async () => {
    setLoading(true); setError(''); setNotice(''); setEvaluation(null); setAnswer(''); setIndex(0);
    try {
      const params = new URLSearchParams({ limit: '30' });
      if (subject) params.set('subject', subject);
      const data = await requestJson(`/api/question-bank/eligible?${params}`);
      setQuestions(data.questions || []);
    } catch (err) { setQuestions([]); setError(err instanceof Error ? err.message : 'Verified questions could not be loaded.'); }
    finally { setLoading(false); }
  }, [subject]);

  useEffect(() => { void loadQuestions(); }, [loadQuestions]);

  const current = questions[index];

  async function submitAnswer() {
    if (!current || !answer) return;
    setLoading(true); setError('');
    try {
      const data = await requestJson(`/api/question-bank/eligible/${current.id}/answer`, {
        method: 'POST', body: JSON.stringify({ answer }),
      });
      setEvaluation(data.result);
    } catch (err) { setError(err instanceof Error ? err.message : 'Your answer could not be evaluated.'); }
    finally { setLoading(false); }
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setNotice('You have reached the end of this verified question set.');
      return;
    }
    setIndex(value => value + 1); setAnswer(''); setEvaluation(null); setFlagOpen(false); setFlagDetails(''); setNotice('');
  }

  async function submitFlag() {
    if (!current) return;
    setLoading(true); setError('');
    try {
      await requestJson(`/api/question-bank/${current.id}/flag`, {
        method: 'POST', body: JSON.stringify({ reason: flagReason, details: flagDetails || undefined }),
      });
      setNotice('Report sent to the content review team. Thank you.');
      setFlagOpen(false);
    } catch (err) { setError(err instanceof Error ? err.message : 'Your report could not be submitted.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link to="/practice" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-700"><ArrowLeft size={16}/> Practice Hub</Link>
          <button onClick={()=>void loadQuestions()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-700"><RefreshCw size={15}/> Refresh</button>
        </header>
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">SABI · Verified question bank</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Practice with reviewed questions</h1>
          <p className="mt-2 text-sm text-slate-500">Questions enter this pool only after content review, source verification and syllabus verification. Answer keys are withheld until you submit an answer.</p>
        </div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="text-xs font-bold">Subject<select value={subject} onChange={e=>setSubject(e.target.value)} className="mt-1 block min-w-52 rounded-xl border border-slate-200 bg-transparent px-3 py-2.5 text-sm dark:border-slate-700">{subjects.map(s=><option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
          <div className="text-right"><p className="text-xs text-slate-500">Question</p><p className="text-lg font-black tabular-nums">{current ? index+1 : 0}<span className="text-sm font-medium text-slate-400"> / {questions.length}</span></p></div>
        </div>

        {error && <div role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"><CircleAlert size={17}/>{error}</div>}
        {notice && <div role="status" className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">{notice}</div>}
        {loading && !current && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"><LoaderCircle className="mx-auto animate-spin"/><p className="mt-3 text-sm text-slate-500">Loading verified questions…</p></div>}
        {!loading && !current && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><ShieldCheck className="mx-auto text-blue-600" size={30}/><h2 className="mt-3 font-black">No verified questions available yet</h2><p className="mt-2 text-sm text-slate-500">The question pool is intentionally strict. Content managers must verify the source and syllabus before a question appears here.</p></div>}
        {current && <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{current.subject}</span><span className="text-xs text-slate-500">{current.topic} · {current.subtopic}{current.year ? ` · ${current.year}` : ''}</span></div>
          <h2 className="mt-6 text-lg font-bold leading-relaxed sm:text-xl">{current.question}</h2>
          <div className="mt-5 space-y-3">{options.map(letter=><button key={letter} disabled={Boolean(evaluation)||loading} onClick={()=>setAnswer(letter)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition ${evaluation?.correct_answer===letter?'border-emerald-400 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30':answer===letter?'border-blue-500 bg-blue-50 dark:bg-blue-950/40':'border-slate-200 hover:border-blue-300 dark:border-slate-700'} `}><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-black">{letter}</span><span className="pt-1">{current[optionKey[letter]]}</span></button>)}</div>
          {!evaluation ? <button onClick={()=>void submitAnswer()} disabled={!answer||loading} className="mt-6 w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-black text-white disabled:opacity-40">{loading?'Checking…':'Submit answer'}</button> : <div className={`mt-6 rounded-2xl border p-4 ${evaluation.is_correct?'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30':'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'}`}><div className="flex items-center gap-2 font-black">{evaluation.is_correct?<BookOpenCheck size={18}/>:<CircleAlert size={18}/>} {evaluation.is_correct?'Correct answer':'Not quite'}</div><p className="mt-2 text-sm">Correct option: <b>{evaluation.correct_answer}</b></p><p className="mt-2 text-sm leading-relaxed">{evaluation.explanation}</p><button onClick={nextQuestion} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white">Next question <ArrowRight size={16}/></button></div>}
          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
            {!flagOpen ? <button onClick={()=>setFlagOpen(true)} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600"><Flag size={14}/> Report a problem with this question</button> : <div className="space-y-3"><label className="block text-xs font-bold">Problem type<select value={flagReason} onChange={e=>setFlagReason(e.target.value)} className="mt-1 block w-full rounded-xl border border-slate-200 bg-transparent p-2.5 text-sm dark:border-slate-700">{[['wrong_answer','Wrong answer'],['ambiguous','Ambiguous question'],['typo','Typographical error'],['bad_explanation','Incorrect explanation'],['wrong_topic','Wrong topic'],['duplicate','Duplicate question'],['source_issue','Source issue'],['other','Other']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><textarea rows={2} value={flagDetails} onChange={e=>setFlagDetails(e.target.value)} placeholder="Optional details" className="w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700"/><div className="flex gap-2"><button onClick={()=>void submitFlag()} disabled={loading} className="rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white">Send report</button><button onClick={()=>setFlagOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold dark:border-slate-700">Cancel</button></div></div>}
          </div>
        </section>}
        <p className="mt-5 text-center text-[11px] text-slate-500">Phase 2 verified-question delivery. Attempt history, mastery updates and adaptive recommendations are handled in the next learning-evidence phase.</p>
      </div>
    </main>
  );
}
