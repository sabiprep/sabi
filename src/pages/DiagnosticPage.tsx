import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Target } from 'lucide-react';
import { apiFetch } from '../utils/apiClient';

export function DiagnosticPage() {
  const [latest,setLatest]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;apiFetch('/api/learning/diagnostic/latest').then(async r=>{if(r.ok){const d=await r.json();if(active)setLatest(d);}}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
  return <main className="min-h-screen bg-slate-50 dark:bg-[#080D1A] text-slate-900 dark:text-slate-100 px-4 py-8">
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/home" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500">← Back to dashboard</Link>
      <section className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-10 space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center justify-center"><Target size={28}/></div>
        <span className="text-xs font-black uppercase tracking-widest text-blue-600">Personal learning assessment</span>
        <h1 className="text-3xl sm:text-4xl font-black">Discover your strengths and learning gaps.</h1>
        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400">Your diagnostic uses approved UTME questions. Each answer is checked securely by SABI, then saved to your learning history and topic mastery profile.</p>
        {latest?.diagnostic&&<div className="rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 p-4"><p className="font-black">Your latest diagnostic</p><p className="text-sm mt-1">{latest.diagnostic.correct_count}/{latest.diagnostic.answered_count} correct · {latest.diagnostic.accuracy}% accuracy</p></div>}
        <Link to="/learning?mode=diagnostic" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm"><BookOpenCheck size={18}/> {latest?.diagnostic?'Retake diagnostic':'Start diagnostic'} <ArrowRight size={17}/></Link>
        {!loading&&latest?.needsDiagnostic&&<p className="text-xs text-slate-500">No completed diagnostic is saved yet.</p>}
      </section>
    </div>
  </main>;
}