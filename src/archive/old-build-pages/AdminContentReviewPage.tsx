import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../utils/apiClient';

type Question = {
  id: string; subject: string; topic: string | null; subtopic: string | null; question: string;
  option_a: string; option_b: string; option_c: string; option_d: string; answer: string;
  explanation: string | null; explanation_short: string | null; source: string | null; source_id: string | null;
  status: string; confidence_score: number | null; flag_count: number | null; created_at: string;
};
type Source = { id: string; source_name: string; source_key: string; source_url: string | null; license_name: string | null; verification_status: string; permitted_use: string; notes: string | null };
type Quality = { totalQuestions: number; publishedQuestions: number; reviewQueueQuestions: number; bySubject: Array<{subject:string;statuses:Record<string,number>}>; publicationBlockers: Record<string,number>; duplicateContentFingerprints: number; truncated: boolean };

export default function AdminContentReviewPage() {
  const [questions,setQuestions]=useState<Question[]>([]);
  const [sources,setSources]=useState<Source[]>([]);
  const [quality,setQuality]=useState<Quality|null>(null);
  const [selected,setSelected]=useState(0);
  const [offset,setOffset]=useState(0);
  const [total,setTotal]=useState(0);
  const [status,setStatus]=useState('all');
  const [subject,setSubject]=useState('');
  const [notes,setNotes]=useState('');
  const [sourceNotes,setSourceNotes]=useState('');
  const [sourceDecision,setSourceDecision]=useState<Record<string,{verificationStatus:string;permittedUse:string}>>({});
  const [tab,setTab]=useState<'queue'|'sources'|'quality'>('queue');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  const loadQueue=useCallback(async(nextOffset:number)=>{
    setBusy(true);setError('');
    try {
      const params=new URLSearchParams({limit:'30',offset:String(nextOffset)});
      if(status!=='all')params.set('status',status);
      if(subject.trim())params.set('subject',subject.trim());
      const r=await apiFetch('/api/learning/content-review/queue?'+params.toString());
      const body=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(body.error||'Could not load the moderation queue.');
      setQuestions(body.questions||[]);setTotal(body.total||0);setOffset(nextOffset);setSelected(0);
    }catch(e){setError(e instanceof Error?e.message:'Queue unavailable.');}
    finally{setBusy(false);}
  },[status,subject]);

  const loadSources=useCallback(async()=>{
    const r=await apiFetch('/api/learning/content-review/sources');
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(body.error||'Could not load sources.');
    setSources(body.sources||[]);
  },[]);
  const loadQuality=useCallback(async()=>{
    const r=await apiFetch('/api/learning/content-review/quality-report');
    const body=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(body.error||'Could not load quality report.');
    setQuality(body);
  },[]);
  useEffect(()=>{void loadQueue(0);},[loadQueue]);
  useEffect(()=>{if(tab==='sources')void loadSources().catch(e=>setError(e.message));if(tab==='quality')void loadQuality().catch(e=>setError(e.message));},[tab,loadSources,loadQuality]);

  const review=async(action:'publish'|'needs-review'|'reject')=>{
    const q=questions[selected];if(!q)return;
    if(action==='publish'&&!window.confirm('Publish this question for student practice?'))return;
    if(action==='reject'&&!window.confirm('Reject this question?'))return;
    setBusy(true);setError('');setNotice('');
    try{
      const r=await apiFetch('/api/learning/content-review/'+encodeURIComponent(q.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,notes:notes.trim()||undefined})});
      const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Review decision could not be saved.');
      setNotice(action==='publish'?'Question published.':action==='reject'?'Question rejected.':'Question returned for review.');
      setNotes('');await loadQueue(offset);
    }catch(e){setError(e instanceof Error?e.message:'Review failed.');}
    finally{setBusy(false);}
  };
  const saveSource=async(source:Source)=>{
    const decision=sourceDecision[source.id]||{verificationStatus:source.verification_status,permittedUse:source.permitted_use};
    setBusy(true);setError('');setNotice('');
    try{
      const r=await apiFetch('/api/learning/content-review/sources/'+encodeURIComponent(source.id),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...decision,notes:sourceNotes.trim()||source.notes||undefined})});
      const b=await r.json().catch(()=>({}));if(!r.ok)throw new Error(b.error||'Source decision could not be saved.');
      setNotice('Source review saved.');setSourceNotes('');await loadSources();
    }catch(e){setError(e instanceof Error?e.message:'Source review failed.');}
    finally{setBusy(false);}
  };
  const q=questions[selected];
  const metric=(label:string,value:number|undefined)=><div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-black">{value??'—'}</p></div>;

  return <main className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-white">
    <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4"><div><Link to="/admin" className="mb-1 inline-flex items-center gap-1 text-xs text-blue-600"><ArrowLeft size={14}/> Admin operations</Link><h1 className="text-xl font-black">Content operations</h1></div><button onClick={()=>{if(tab==='queue')void loadQueue(0);else if(tab==='sources')void loadSources();else void loadQuality();}} disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-bold text-white"><RefreshCw size={15}/> Refresh</button></div></header>
    <div className="mx-auto max-w-7xl space-y-5 px-5 py-6">
      {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}
      {notice&&<div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{notice}</div>}
      <nav className="flex flex-wrap gap-2">{(['queue','sources','quality'] as const).map(t=><button key={t} onClick={()=>{setTab(t);setError('');setNotice('');}} className={`rounded-xl px-4 py-2 text-sm font-bold capitalize ${tab===t?'bg-blue-700 text-white':'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'}`}>{t==='queue'?'Question queue':t==='sources'?'Source clearance':'Quality report'}</button>)}</nav>
      {tab==='queue'&&<section className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <label className="text-xs font-bold">Status<select value={status} onChange={e=>setStatus(e.target.value)} className="mt-1 block rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-700"><option value="all">All pending</option><option value="ai-draft">AI drafts</option><option value="needs-review">Needs review</option></select></label>
          <label className="min-w-48 flex-1 text-xs font-bold">Subject<input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Filter by exact subject" className="mt-1 block w-full rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-700"/></label>
          <button onClick={()=>void loadQueue(0)} disabled={busy} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white dark:bg-slate-700">Apply filters</button>
          <span className="ml-auto text-xs text-slate-500">{total.toLocaleString()} pending · showing {questions.length}</span>
        </div>
        {!q?<div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">{busy?'Loading review queue…':'No questions match these filters.'}</div>:<div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,.8fr)]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex gap-2"><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{q.subject}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">{q.status}</span></div><span className="text-xs text-slate-500">{selected+1} of {questions.length}</span></div>
            <p className="mt-5 whitespace-pre-wrap text-base font-semibold leading-7">{q.question}</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">{(['a','b','c','d'] as const).map(k=><div key={k} className={`rounded-xl border p-3 text-sm ${String(q.answer).toLowerCase()===k?'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30':'border-slate-200 dark:border-slate-700'}`}><b className="mr-2 uppercase">{k}.</b>{(q as unknown as Record<string,string>)['option_'+k]}</div>)}</div>
            {q.explanation&&<div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><b>Explanation</b><p className="mt-1 whitespace-pre-wrap">{q.explanation}</p></div>}
            <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2"><span>Topic: {q.topic||'Not assigned'}{q.subtopic?' / '+q.subtopic:''}</span><span>Source: {q.source||'Not recorded'}</span><span>Source ID: {q.source_id||'Missing'}</span><span>Flags: {q.flag_count??0} · Confidence: {q.confidence_score??'—'}</span></div>
            <div className="mt-5 flex items-center justify-between"><button onClick={()=>setSelected(v=>Math.max(0,v-1))} disabled={selected===0} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700"><ChevronLeft size={16}/> Previous</button><button onClick={()=>setSelected(v=>Math.min(questions.length-1,v+1))} disabled={selected>=questions.length-1} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700">Next <ChevronRight size={16}/></button></div>
          </article>
          <aside className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-extrabold">Review decision</h2><p className="mt-1 text-xs leading-5 text-slate-500">Publishing is blocked by the API unless verified taxonomy, cleared provenance, four options and a valid answer key are present.</p><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Reviewer notes (optional)" rows={4} className="mt-3 w-full rounded-xl border border-slate-300 bg-transparent p-3 text-sm dark:border-slate-700"/>
              <button onClick={()=>void review('publish')} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Check size={16}/> Approve & publish</button>
              <button onClick={()=>void review('needs-review')} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400 px-4 py-3 text-sm font-bold text-amber-800 dark:text-amber-300"><ShieldAlert size={16}/> Return for revision</button>
              <button onClick={()=>void review('reject')} disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-300 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300"><X size={16}/> Reject question</button>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900"><b className="text-slate-800 dark:text-white">Review discipline</b><p className="mt-1">Check the question wording, options, answer key, explanation, source permission and syllabus alignment before publishing. A failed publication check must be resolved, not bypassed.</p></div>
          </aside>
        </div>}
        <div className="flex items-center justify-between"><span className="text-xs text-slate-500">Offset {offset} · {total} total</span><div className="flex gap-2"><button onClick={()=>void loadQueue(Math.max(0,offset-30))} disabled={offset===0||busy} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700">Previous page</button><button onClick={()=>void loadQueue(offset+30)} disabled={offset+questions.length>=total||busy} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40 dark:border-slate-700">Next page</button></div></div>
      </section>}
      {tab==='sources'&&<section className="space-y-3">{sources.length===0?<p className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500 dark:border-slate-700">No source records returned.</p>:sources.map(source=>{const d=sourceDecision[source.id]||{verificationStatus:source.verification_status,permittedUse:source.permitted_use};return <article key={source.id} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold">{source.source_name}</h3><p className="text-xs text-slate-500">{source.source_key} · {source.license_name||'License not recorded'}</p>{source.source_url&&<a href={source.source_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-blue-600 underline">Open source reference</a>}</div><span className="text-xs text-slate-500">{source.verification_status} / {source.permitted_use}</span></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><label className="text-xs font-bold">Verification<select value={d.verificationStatus} onChange={e=>setSourceDecision(p=>({...p,[source.id]:{...d,verificationStatus:e.target.value}}))} className="mt-1 block w-full rounded-lg border bg-transparent p-2 text-sm dark:border-slate-700"><option value="verified">Verified</option><option value="restricted">Restricted</option><option value="rejected">Rejected</option></select></label><label className="text-xs font-bold">Permitted use<select value={d.permittedUse} onChange={e=>setSourceDecision(p=>({...p,[source.id]:{...d,permittedUse:e.target.value}}))} className="mt-1 block w-full rounded-lg border bg-transparent p-2 text-sm dark:border-slate-700"><option value="unknown">Unknown</option><option value="internal_review">Internal review only</option><option value="practice_display">Practice display</option><option value="redistribution_allowed">Redistribution allowed</option><option value="restricted">Restricted</option></select></label></div><p className="mt-2 text-xs text-slate-500">Existing notes: {source.notes||'None recorded'}</p><button onClick={()=>void saveSource(source)} disabled={busy} className="mt-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Save source decision</button></article>})}</section>}
      {tab==='quality'&&quality&&<section className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metric('Total questions',quality.totalQuestions)}{metric('Published',quality.publishedQuestions)}{metric('In review',quality.reviewQueueQuestions)}{metric('Duplicate fingerprints',quality.duplicateContentFingerprints)}</div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-extrabold">Publication blockers</h2><div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{Object.entries(quality.publicationBlockers).map(([k,v])=><div key={k} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><p className="text-xs text-slate-500">{k.replaceAll(/([A-Z])/g,' $1').replaceAll('_',' ')}</p><p className="mt-1 text-xl font-black">{v}</p></div>)}</div></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><h2 className="font-extrabold">Question distribution by subject</h2>{quality.bySubject.map(row=><div key={row.subject} className="flex flex-wrap justify-between gap-2 border-b py-3 text-sm dark:border-slate-800"><b>{row.subject}</b><span className="text-slate-500">{Object.entries(row.statuses).map(([k,v])=>k+': '+v).join(' · ')}</span></div>)}</div>{quality.truncated&&<p className="text-xs text-amber-700">Report is capped at 10,000 question records; figures may be incomplete.</p>}</section>}
    </div>
  </main>;
}
