import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, KeyRound, RefreshCw, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient';

type Assignment = {
  id: string; user_id: string; role_key: string; scope_type: string; scope_id: string | null;
  status: string; reason: string; starts_at: string; expires_at: string | null; created_at: string;
};

export default function AdminAccessPage() {
  const [rows, setRows] = useState<Assignment[]>([]);
  const [userId, setUserId] = useState('');
  const [roleKey, setRoleKey] = useState('SUPPORT');
  const [scopeType, setScopeType] = useState('platform');
  const [scopeId, setScopeId] = useState('');
  const [reason, setReason] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiFetch('/api/admin/command/access/assignments');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Access assignments could not be loaded. This page requires platform super-admin access.');
      setRows(body.assignments || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load access assignments.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function createAssignment(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await apiFetch('/api/admin/command/access/assignments', {
        method: 'POST',
        body: JSON.stringify({ userId: userId.trim(), roleKey, scopeType, ...(scopeType === 'platform' ? {} : { scopeId: scopeId.trim() }), reason: reason.trim(), ...(expiresAt ? { expiresAt: new Date(expiresAt).toISOString() } : {}) }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Assignment could not be created.');
      setUserId(''); setReason(''); setScopeId(''); setExpiresAt('');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Assignment failed.'); }
    finally { setBusy(false); }
  }

  async function changeStatus(id: string, action: 'activate' | 'revoke') {
    setBusy(true); setError('');
    try {
      const response = await apiFetch(`/api/admin/command/access/assignments/${id}/${action}`, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Assignment could not be ${action}d.`);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Assignment update failed.'); }
    finally { setBusy(false); }
  }

  return <main className="min-h-screen bg-slate-50 px-5 py-7 text-slate-900 dark:bg-slate-950 dark:text-white">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div><Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300"><ArrowLeft size={15}/> SABI COMMAND</Link><h1 className="mt-2 text-2xl font-black">People & Access</h1><p className="mt-1 text-sm text-slate-500">Create scoped delegated assignments with a separate activation step. MASTER_ADMIN cannot be delegated.</p></div>
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900"><RefreshCw size={15} className={loading ? 'animate-spin' : ''}/> Refresh</button>
      </header>
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center gap-2"><UserPlus className="text-blue-600"/><h2 className="font-extrabold">Create delegated assignment</h2></div>
        <form onSubmit={createAssignment} className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-1 text-sm font-semibold">SABI user UUID<input required value={userId} onChange={e=>setUserId(e.target.value)} placeholder="Supabase user ID" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 font-normal dark:border-slate-700"/></label>
          <label className="grid gap-1 text-sm font-semibold">Role<select value={roleKey} onChange={e=>setRoleKey(e.target.value)} className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"><option value="SUPPORT">Support</option><option value="ANALYST">Analyst</option><option value="CONTENT_MANAGER">Content Manager</option><option value="ADMIN">Admin</option></select></label>
          <label className="grid gap-1 text-sm font-semibold">Scope<select value={scopeType} onChange={e=>setScopeType(e.target.value)} className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"><option value="platform">Platform</option><option value="institution">Institution</option><option value="resource">Resource</option></select></label>
          {scopeType !== 'platform' && <label className="grid gap-1 text-sm font-semibold">Scope ID<input required value={scopeId} onChange={e=>setScopeId(e.target.value)} placeholder="Exact institution/resource ID" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 font-normal dark:border-slate-700"/></label>}
          <label className="grid gap-1 text-sm font-semibold md:col-span-2">Reason<input required minLength={8} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Business reason for granting this access" className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 font-normal dark:border-slate-700"/></label>
          <label className="grid gap-1 text-sm font-semibold">Optional expiry<input type="datetime-local" value={expiresAt} onChange={e=>setExpiresAt(e.target.value)} className="rounded-xl border border-slate-300 bg-transparent px-3 py-2 font-normal dark:border-slate-700"/></label>
          <div className="flex items-end"><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><KeyRound size={15}/> Create pending assignment</button></div>
        </form>
        <p className="mt-3 text-xs text-slate-500">New assignments are pending by default. Activate only after reviewing the target, role, scope and reason. This screen does not grant MASTER_ADMIN.</p>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 p-5 dark:border-slate-800"><h2 className="font-extrabold">Delegated assignments</h2><span className="text-xs text-slate-500">{rows.length} records shown</span></div>
        {loading ? <p className="p-5 text-sm text-slate-500">Loading assignments…</p> : rows.length === 0 ? <p className="p-5 text-sm text-slate-500">No delegated assignments recorded.</p> : <div className="divide-y divide-slate-100 dark:divide-slate-800">{rows.map(row => <div key={row.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><strong>{row.role_key}</strong><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase dark:bg-slate-800">{row.status}</span><span className="text-xs text-slate-500">{row.scope_type}{row.scope_id ? ` · ${row.scope_id}` : ''}</span></div><p className="mt-1 break-all text-xs text-slate-500">{row.user_id}</p><p className="mt-1 text-sm">{row.reason}</p><p className="mt-1 text-xs text-slate-500">Created {new Date(row.created_at).toLocaleString()}{row.expires_at ? ` · Expires ${new Date(row.expires_at).toLocaleString()}` : ''}</p></div><div className="flex gap-2">{row.status === 'pending' && <button disabled={busy} onClick={()=>void changeStatus(row.id,'activate')} className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Activate</button>}{['pending','active','suspended'].includes(row.status) && <button disabled={busy} onClick={()=>void changeStatus(row.id,'revoke')} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50 dark:border-rose-900 dark:text-rose-300"><XCircle size={13}/> Revoke</button>}</div></div>)}</div>}
      </section>
      <p className="text-xs text-slate-500">All actions are server-authorised and recorded in the administrative audit log. If the audit write fails, verify the record before retrying.</p>
    </div>
  </main>;
}
