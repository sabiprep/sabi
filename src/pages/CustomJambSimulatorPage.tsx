import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Cpu, Layers, Sliders, Sparkles } from 'lucide-react';
import { useTheme } from '../app/ThemeProvider';

export function CustomJambSimulatorPage() {
  const { isDark } = useTheme();
  return <div className="space-y-8 pb-16 lg:pb-8">
    <div><Link to="/home" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 mb-3"><ArrowLeft size={16}/> Back to Dashboard</Link>
      <div className="flex items-center gap-3"><span className="w-3 h-3 rounded-full bg-blue-600"/><h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">Custom JAMB Simulator</h1></div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Build a personalised practice session from approved questions and save every answer to your learning record.</p>
    </div>
    <section className={`rounded-3xl border p-6 sm:p-10 space-y-6 ${isDark?'bg-slate-900 border-slate-800':'bg-white border-slate-200'}`}>
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 text-blue-600 flex items-center justify-center"><Sliders size={32}/></div>
      <div><span className="text-xs font-black uppercase tracking-widest text-blue-600">Custom practice</span><h2 className="text-2xl font-black mt-2">Set up your next practice session.</h2><p className="text-sm text-slate-500 mt-2">Choose a subject and question count. The learning API selects only reviewed and published UTME questions.</p></div>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950"><Clock className="text-blue-600 mb-2"/><b>Session controls</b><p className="text-xs text-slate-500 mt-1">Choose a practice length.</p></div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950"><Layers className="text-blue-600 mb-2"/><b>Subject focus</b><p className="text-xs text-slate-500 mt-1">Target a UTME subject.</p></div>
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950"><Cpu className="text-emerald-600 mb-2"/><b>Server-side scoring</b><p className="text-xs text-slate-500 mt-1">Answers are evaluated securely.</p></div>
      </div>
      <Link to="/learning?mode=custom" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-sm"><Sparkles size={17}/> Configure custom practice</Link>
    </section>
  </div>;
}