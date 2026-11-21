import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, ArrowUpRight, BookOpen, BrainCircuit, Building2, CheckCircle2,
  ClipboardCheck, Coins, CreditCard, Database, FileBarChart2, FileQuestion, Gauge,
  GraduationCap, LockKeyhole, Mail, RefreshCw, Settings2, ShieldCheck, Users, Workflow,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient';

type CommandStatus = {
  generatedAt: string;
  counts: Record<string, number | null>;
  availability: Record<string, boolean>;
  modules: Record<string, 'live' | 'foundation' | 'planned' | 'unavailable'>;
  safety: { aiActivation: string; productionChanges: string; missingConfigurationIsNotDefaulted: boolean };
};
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
type ModuleInfo = { key: string; name: string; description: string; icon: typeof Gauge; href?: string };
const modules: ModuleInfo[] = [
  { key: 'overview', name: 'Command Overview', description: 'Platform snapshot, live metrics, activity and operational status.', icon: Gauge },
  { key: 'ai', name: 'AI Control Centre', description: 'Provider readiness, routing, model pricing, budgets, quality and prompt governance.', icon: BrainCircuit },
  { key: 'agent', name: 'AI Operations Agent', description: 'Audits, diagnostics, prepared patches, sandbox tests and approval-gated execution.', icon: Workflow },
  { key: 'students', name: 'Student Intelligence', description: 'Learner profiles, progress, mastery, support context and engagement.', icon: Users },
  { key: 'learning', name: 'Learning Engine', description: 'Adaptive learning, mastery rules, revision schedules and score prediction.', icon: GraduationCap },
  { key: 'content', name: 'Question Bank HQ', description: 'Question authoring, source provenance, moderation and publication.', icon: FileQuestion, href: '/admin/content' },
  { key: 'academics', name: 'Syllabus & Exams', description: 'Syllabus versions, objectives, subject mappings and exam configuration.', icon: BookOpen },
  { key: 'access', name: 'People & Access', description: 'Hybrid roles, scoped assignments, permission reviews and admin activity.', icon: LockKeyhole, href: '/admin/access' },
  { key: 'institutions', name: 'Schools & Parents', description: 'Institution verification, classes, enrolment and parent consent.', icon: Building2 },
  { key: 'revenue', name: 'Revenue & Payments', description: 'Plans, transactions, provider reconciliation, refunds and subscriptions.', icon: CreditCard },
  { key: 'credits', name: 'Credits & Entitlements', description: 'Credit ledgers, allowances, grants, expiry and subscription access.', icon: Coins },
  { key: 'communications', name: 'Communication Centre', description: 'Templates, audiences, notifications, campaigns and delivery.', icon: Mail },
  { key: 'configuration', name: 'Product Configuration', description: 'Typed settings, feature flags, experiments and configuration history.', icon: Settings2 },
  { key: 'platform', name: 'Platform Health', description: 'API, database, worker, integration health and incident response.', icon: Activity },
  { key: 'security', name: 'Security & Governance', description: 'Access boundaries, audit, consent, retention and approval controls.', icon: ShieldCheck },
  { key: 'reports', name: 'Reports & Intelligence', description: 'Academic, engagement, financial, AI and operational reporting.', icon: FileBarChart2 },
  { key: 'integrations', name: 'Integrations & Developer Ops', description: 'Supabase, Vercel, GitHub, webhooks, releases and integration health.', icon: Database },
];
const fmt = (v: number | null | undefined) => v == null ? '—' : v.toLocaleString();
const when = (v: string) => new Date(v).toLocaleString();
const statusLabel = (v?: string) => v === 'live' ? 'Live' : v === 'foundation' ? 'Foundation exists' : v === 'unavailable' ? 'Unavailable' : 'Not implemented';
const statusClass = (v?: string) => v === 'live' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : v === 'foundation' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' : v === 'unavailable' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

function Metric({ label, value, detail, icon: Icon, warning = false }: {
  label: string; value: number | null | undefined; detail: string; icon: typeof Users; warning?: boolean;
}) {
  return <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-500">{label}</span>
      <span className={`rounded-xl p-2 ${warning ? 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'}`}><Icon size={18}/></span></div>
    <div className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{fmt(value)}</div>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </article>;
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [command, setCommand] = useState<CommandStatus | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'overview' | 'modules' | 'governance'>('overview');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [overviewResponse, commandResponse] = await Promise.all([
        apiFetch('/api/admin/overview'), apiFetch('/api/admin/command/status'),
      ]);
      const overviewBody = await overviewResponse.json().catch(() => ({}));
      const commandBody = await commandResponse.json().catch(() => ({}));
      if (!overviewResponse.ok) throw new Error(overviewResponse.status === 403 ? 'Your account does not have administrator access.' : overviewBody.error || 'The operations overview could not be loaded.');
      if (!commandResponse.ok) throw new Error(commandBody.error || 'The COMMAND inventory could not be loaded.');
      setData(overviewBody); setCommand(commandBody);
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load admin operations.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const totals = useMemo(() => {
    const values = Object.values(command?.modules || {});
    return { live: values.filter(v => v === 'live').length, foundation: values.filter(v => v === 'foundation').length, planned: values.filter(v => v === 'planned').length, unavailable: values.filter(v => v === 'unavailable').length };
  }, [command]);

  return <main className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-600">SABI COMMAND</p><h1 className="text-xl font-black">Admin Control Centre</h1></div>
        <div className="flex items-center gap-2"><Link to="/home" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">Learner app</Link>
          <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button></div>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-7 px-5 py-7">
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
      <nav className="flex flex-wrap gap-2" aria-label="Admin workspace">
        {(['overview','modules','governance'] as const).map(tab => <button key={tab} onClick={() => setView(tab)} className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${view === tab ? 'bg-blue-700 text-white' : 'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>{tab}</button>)}
        <span className="ml-auto self-center text-xs text-slate-500">{command ? `Synced ${when(command.generatedAt)}` : loading ? 'Syncing…' : 'No live inventory'}</span>
      </nav>

      {view === 'overview' && <>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Registered learners" value={data?.metrics.learners} detail="Profiles in the platform" icon={Users}/>
          <Metric label="Question bank" value={data?.metrics.questions} detail="All question records" icon={BookOpen}/>
          <Metric label="Published questions" value={data?.metrics.publishedQuestions} detail="Eligible for student selection" icon={CheckCircle2}/>
          <Metric label="Needs review" value={data?.metrics.reviewQueue} detail="Flagged for content review" icon={ClipboardCheck} warning/>
          <Metric label="Draft questions" value={data?.metrics.draftQuestions} detail="Not available to learners" icon={FileQuestion}/>
          <Metric label="Rejected questions" value={data?.metrics.rejectedQuestions} detail="Excluded from practice" icon={AlertTriangle}/>
          <Metric label="Question sources" value={data?.metrics.questionSources} detail="Recorded provenance sources" icon={ShieldCheck}/>
          <Metric label="Sources not cleared" value={data?.metrics.unclearedSources} detail="Verification or permitted-use follow-up" icon={AlertTriangle} warning/>
        </section>
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[['Live modules',totals.live],['Existing foundations',totals.foundation],['Planned modules',totals.planned],['Unavailable data sources',totals.unavailable]].map(([label,value]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{value}</p></div>)}
        </section>
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="flex items-center gap-2 font-extrabold"><ShieldCheck size={18}/> Production safety controls</div>
          <p className="mt-2 text-sm">{command?.safety.aiActivation || 'AI remains subject to configured provider credentials, verified pricing and approved budgets.'}</p>
          <p className="mt-1 text-sm">All sensitive production changes require explicit approval. Missing configuration is never silently defaulted.</p>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-600"/><h2 className="font-extrabold">Recent admin activity</h2></div>
          {!data?.availability.audit ? <p className="text-sm text-slate-500">Audit activity is currently unavailable.</p> : !data.recentOperations.length ? <p className="text-sm text-slate-500">No recorded admin operations yet.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{data.recentOperations.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"><div><strong>{item.action}</strong><span className="ml-2 text-slate-500">{item.resource_type} {item.resource_id || ''}</span></div><span className="text-xs text-slate-500">{item.actor_role} · {when(item.created_at)}</span></div>)}</div>}
        </section>
      </>}

      {view === 'modules' && <section><div className="mb-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">17 work areas</p><h2 className="mt-1 text-lg font-extrabold">Operations workspace</h2></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{modules.map(item => {
          const Icon = item.icon; const status = command?.modules[item.key];
          const card = <article className="h-full rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between"><Icon className="text-blue-600"/><span className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${statusClass(status)}`}>{statusLabel(status)}</span></div>
            <h3 className="mt-4 font-extrabold">{item.name}</h3><p className="mt-1 min-h-10 text-sm text-slate-500">{item.description}</p>
            {item.href && <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-blue-700 dark:text-blue-300">Open workspace <ArrowUpRight size={13}/></span>}
          </article>;
          return item.href ? <Link key={item.key} to={item.href} className="block">{card}</Link> : <div key={item.key}>{card}</div>;
        })}</div>
      </section>}

      {view === 'governance' && <section className="space-y-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><LockKeyhole className="text-blue-600"/><h2 className="font-extrabold">Hybrid administration</h2></div><p className="mt-2 text-sm text-slate-500">Platform-wide super-admin authority with delegated operational roles. Existing profile roles are preserved; scoped assignments are introduced through the reviewed RBAC migration.</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><ShieldCheck className="text-blue-600"/><h2 className="font-extrabold">Approval-controlled AI operations</h2></div><p className="mt-2 text-sm text-slate-500">AI can observe, recommend and prepare. Production execution, budget changes, provider activation, refunds, access changes and releases require explicit human approval.</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Database className="text-blue-600"/><h2 className="font-extrabold">Data readiness</h2></div><div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(command?.availability || {}).map(([key,ready]) => <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800"><span>{key.replace(/[A-Z]/g,m=>' '+m.toLowerCase())}</span><span className={ready ? 'font-bold text-emerald-700 dark:text-emerald-300' : 'font-bold text-amber-700 dark:text-amber-300'}>{ready ? 'Available' : 'Unavailable'}</span></div>)}</div></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-2"><Activity className="text-blue-600"/><h2 className="font-extrabold">Next release gates</h2></div><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-slate-500"><li>Apply and verify the reviewed delegated-RBAC migration in a non-production environment.</li><li>Complete module-specific admin workflows and permission-negative tests.</li><li>Supply actual provider credentials, pricing and spending limits before enabling AI.</li><li>Complete PR #34 review and institution security checks before releasing parent/school portals.</li><li>Run end-to-end, RLS, security and rollback tests before production deployment.</li></ul></article>
      </section>}
    </div>
  </main>;
}
