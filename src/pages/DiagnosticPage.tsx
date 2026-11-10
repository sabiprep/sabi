import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Target } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

export function DiagnosticPage() {
  const [diagnostic,setDiagnostic]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  const load=async()=>{
    setLoading(true);setError('');
    try{
      const response=await apiFetch('/api/learning/progress');
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(body.error||'Your diagnostic history could not be loaded.');
      const latest=(body.recentSessions||[]).find((session:any)=>session.mode==='diagnostic'&&session.status==='completed');
      setDiagnostic(latest||null);
    }catch(e){setError(e instanceof Error?e.message:'Diagnostic history is temporarily unavailable.');}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[]);

  return <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
    <div className="mx-auto max-w-3xl space-y-6">
      <Link to="/home" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">← Back to dashboard</Link>
      <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-10">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Target size={28}/></div>
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">Personal learning assessment</span>
        <h1 className="text-3xl font-black sm:text-4xl">Discover your strengths and learning gaps.</h1>
        <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">Your diagnostic uses approved UTME questions. Each answer is checked securely by SABI, then saved to your learning history and topic mastery profile.</p>
        {error&&<div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}<button onClick={()=>void load()} className="ml-2 font-bold underline">Retry</button></div>}
        {loading?<p className="text-sm text-slate-500">Checking your saved diagnostic history…</p>:diagnostic&&<div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/40"><p className="font-black">Latest completed diagnostic</p><p className="mt-1 text-sm">{diagnostic.correct_count}/{diagnostic.answered_count} correct · {diagnostic.answered_count?Math.round(diagnostic.correct_count/diagnostic.answered_count*100):0}% observed accuracy</p><p className="mt-1 text-xs text-slate-500">Completed {diagnostic.completed_at?new Date(diagnostic.completed_at).toLocaleString():'date unavailable'}</p></div>}
        {!loading&&<Link to="/learning?mode=diagnostic" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-black text-white"><BookOpenCheck size={18}/>{diagnostic?'Retake diagnostic':'Start diagnostic'}<ArrowRight size={17}/></Link>}
        {!loading&&!diagnostic&&!error&&<p className="text-xs text-slate-500">No completed diagnostic is recorded yet. Start one to establish your baseline.</p>}
      </section>
    </div>
  </main>;
}
