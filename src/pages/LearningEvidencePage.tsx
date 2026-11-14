import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowLeft, BookOpenCheck, LoaderCircle, RefreshCw, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient';

type MasteryRow = {
  subject_slug: string;
  topic_id: string;
  subtopic_id: string;
  topic?: { name?: string } | null;
  subtopic?: { name?: string } | null;
  attempt_count: number;
  correct_count: number;
  accuracy: number;
  mastery_score: number;
  evidence_confidence: number;
  mastery_state: 'not_started' | 'needs_support' | 'developing' | 'proficient' | 'mastered';
  last_attempted_at: string | null;
};

async function loadMastery(): Promise<MasteryRow[]> {
  const response = await apiFetch('/api/learning/mastery');
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || 'Learning progress could not be loaded.');
  return body.topics || [];
}

const stateLabel: Record<MasteryRow['mastery_state'], string> = {
  not_started: 'Not started',
  needs_support: 'Needs support',
  developing: 'Developing',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

export function LearningEvidencePage() {
  const [rows, setRows] = useState<MasteryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try { setRows(await loadMastery()); }
    catch (err) { setError(err instanceof Error ? err.message : 'Learning progress could not be loaded.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void refresh(); }, []);

  const summary = useMemo(() => ({
    attempts: rows.reduce((total, row) => total + row.attempt_count, 0),
    mastered: rows.filter(row => row.mastery_state === 'mastered').length,
    topics: rows.length,
    accuracy: rows.reduce((total, row) => total + row.correct_count, 0) /
      Math.max(1, rows.reduce((total, row) => total + row.attempt_count, 0)),
  }), [rows]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link to="/progress" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold dark:border-slate-700"><ArrowLeft size={16}/> Progress</Link>
          <button onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold disabled:opacity-50 dark:border-slate-700"><RefreshCw size={15}/> Refresh</button>
        </header>
        <div className="mb-6">
          <p className="text-xs font-black uppercase tracking-[.18em] text-blue-600">SABI · Learning evidence</p>
          <h1 className="mt-1 text-2xl font-black sm:text-3xl">Your topic mastery</h1>
          <p className="mt-2 text-sm text-slate-500">A running picture of your performance from submitted, verified-question attempts. Mastery estimates become more reliable as you practise.</p>
        </div>

        {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">{error}</div>}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Attempts', summary.attempts, Activity],
            ['Topics practised', summary.topics, BookOpenCheck],
            ['Mastered topics', summary.mastered, Target],
            ['Overall accuracy', `${Math.round(summary.accuracy * 100)}%`, Target],
          ].map(([label, value, Icon]: any) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><Icon size={18} className="text-blue-600"/><p className="mt-3 text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black tabular-nums">{value}</p></div>)}
        </div>

        {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900"><LoaderCircle className="mx-auto animate-spin"/><p className="mt-3 text-sm text-slate-500">Loading your learning evidence…</p></div>
          : rows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-900"><BookOpenCheck className="mx-auto text-blue-600" size={30}/><h2 className="mt-3 font-black">Your mastery record starts with practice</h2><p className="mt-2 text-sm text-slate-500">Complete questions in Verified Practice. Your submitted attempts will appear here automatically.</p><Link to="/verified-practice" className="mt-5 inline-flex rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white">Start verified practice</Link></div>
          : <div className="space-y-3">{rows.map(row => <article key={row.topic_id + row.subtopic_id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-bold uppercase tracking-wide text-blue-600">{row.subject_slug}</p><h2 className="mt-1 font-black">{row.subtopic?.name || 'Subtopic'} <span className="font-medium text-slate-400">· {row.topic?.name || 'Topic'}</span></h2><p className="mt-1 text-xs text-slate-500">{row.correct_count} correct from {row.attempt_count} attempts · {Math.round(row.accuracy * 100)}% accuracy</p></div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{stateLabel[row.mastery_state]}</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(0, Math.min(100, row.mastery_score * 100))}%` }}/></div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>Mastery estimate {Math.round(row.mastery_score * 100)}%</span><span>Evidence confidence {Math.round(row.evidence_confidence * 100)}%</span></div>
          </article>)}</div>}
        <p className="mt-6 text-center text-[11px] text-slate-500">Mastery is an evidence estimate, not a predicted JAMB score or a guarantee of exam readiness.</p>
      </div>
    </main>
  );
}
