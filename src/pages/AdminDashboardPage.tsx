import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, BookOpen, CheckCircle2, ClipboardCheck, FileQuestion, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient';

type Overview = {
  generatedAt: string;
  metrics: {
    learners: number | null; questions: number | null; publishedQuestions: number | null;
    draftQuestions: number | null; reviewQueue: number | null; rejectedQuestions: number | null;
    questionSources: number | null; unclearedSources: number | null;
  };
  availability: { learners: boolean; questions: boolean; sources: boolean; audit: boolean };
  recentOperations: Array<{ id: string; actor_role: string; action: string; resource_type: string; resource_id: string; created_at: string }>;
};

const number = (value: number | null | undefined) => value === null || value === undefined ? '—' : value.toLocaleString();
const time = (value: string) => new Date(value).toLocaleString();

function Metric({ label, value, detail, icon: Icon, warning = false }: {
  label: string; value: number | null | undefined; detail: string; icon: typeof Users; warning?: boolean;
}) {
  return <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={`rounded-xl p-2 ${warning ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}><Icon size={18}/></span>
    </div>
    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{number(value)}</div>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </article>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiFetch('/api/admin/overview');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(response.status === 403 ? 'Your account does not have administrator access.' : body.error || 'The operations overview could not be loaded.');
      setData(body);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load admin overview.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">SABI CONTROL CENTRE</p><h1 className="text-xl font-black">Admin operations</h1></div>
        <div className="flex items-center gap-2"><Link to="/home" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Learner app</Link><button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-7 px-5 py-7">
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
      <section><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform snapshot</p><h2 className="mt-1 text-lg font-extrabold">Operational health</h2></div><span className="text-xs text-slate-500">{data ? `Updated ${time(data.generatedAt)}` : loading ? 'Loading…' : 'No data'}</span></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Registered learners" value={data?.metrics.learners} detail="Profiles in the platform" icon={Users}/>
          <Metric label="Question bank" value={data?.metrics.questions} detail="All question records" icon={BookOpen}/>
          <Metric label="Published questions" value={data?.metrics.publishedQuestions} detail="Eligible for student selection" icon={CheckCircle2}/>
          <Metric label="Needs review" value={data?.metrics.reviewQueue} detail="Flagged for content review" icon={ClipboardCheck} warning/>
          <Metric label="Draft questions" value={data?.metrics.draftQuestions} detail="Not available to learners" icon={FileQuestion}/>
          <Metric label="Rejected questions" value={data?.metrics.rejectedQuestions} detail="Excluded from practice" icon={AlertTriangle}/>
          <Metric label="Question sources" value={data?.metrics.questionSources} detail="Recorded provenance sources" icon={ShieldCheck}/>
          <Metric label="Sources not cleared" value={data?.metrics.unclearedSources} detail="Verification or permitted-use follow-up" icon={AlertTriangle} warning/>
        </div>
      </section>
      <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Work areas</p><h2 className="mt-1 text-lg font-extrabold">Operations workspace</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><ClipboardCheck className="text-blue-600"/><ArrowUpRight size={17} className="text-slate-400"/></div><h3 className="mt-4 font-extrabold">Question moderation</h3><p className="mt-1 text-sm text-slate-500">Review drafts, verify sources, map taxonomy and approve questions.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><Activity className="text-blue-600"/><ArrowUpRight size={17} className="text-slate-400 group-hover:text-blue-600"/></div><h3 className="mt-4 font-extrabold">Content quality</h3><p className="mt-1 text-sm text-slate-500">Inspect subject distribution, publication readiness and provenance gaps.</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><ShieldCheck className="text-blue-600"/><ArrowUpRight size={17} className="text-slate-400 group-hover:text-blue-600"/></div><h3 className="mt-4 font-extrabold">Plans & entitlements</h3><p className="mt-1 text-sm text-slate-500">Configure product access and subscription catalogues.</p></article>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-600"/><h2 className="font-extrabold">Recent admin activity</h2></div>
        {!data?.availability.audit ? <p className="text-sm text-slate-500">Audit activity is currently unavailable.</p> : !data.recentOperations.length ? <p className="text-sm text-slate-500">No recorded admin operations yet.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{data.recentOperations.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3"><div><p className="text-sm font-bold">{item.action.replaceAll('_',' ')}</p><p className="text-xs text-slate-500">{item.resource_type} · {item.actor_role}</p></div><time className="text-xs text-slate-500">{time(item.created_at)}</time></div>)}</div>}
      </section>
      <p className="text-xs text-slate-500">Administrator access is enforced by the API on every request. Dashboard metrics contain aggregate counts only.</p>
    </div>
  </main>;
}
