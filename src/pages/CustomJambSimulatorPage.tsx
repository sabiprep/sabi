import React from 'react';
import { 
  Sliders, 
  ArrowLeft, 
  Sparkles, 
  Clock, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  Cpu, 
  Compass, 
  Zap, 
  PlusCircle,
  HelpCircle,
  FolderKanban
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';

export function CustomJambSimulatorPage() {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  return (
    <div className="space-y-8 pb-16 lg:pb-8">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/home')}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-amber-500 transition mb-2"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block shadow-sm shadow-amber-500/50" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Custom JAMB Simulator
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Custom Exam Builder directory. Configure personalized timing, specific topic filters, and tailored question sets for precision UTME practice.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-black text-amber-500 flex items-center gap-2">
            <Sparkles size={14} />
            <span>Simulator Directory Active</span>
          </div>
        </div>
      </div>

      {/* Primary Empty Dashboard Canvas */}
      <section className={`p-8 sm:p-12 rounded-3xl border-2 border-dashed ${
        isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-white border-slate-200'
      } flex flex-col items-center justify-center text-center space-y-6 shadow-sm min-h-[440px] relative overflow-hidden`}>
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-blue-500/20 border-2 border-amber-500/40 flex items-center justify-center text-amber-500 shadow-xl shadow-amber-500/10">
          <Sliders size={40} className="animate-pulse" />
        </div>

        <div className="relative z-10 max-w-lg space-y-2">
          <span className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-500 border border-blue-500/20 text-[11px] font-black uppercase tracking-wider inline-block">
            Workspace Reserved
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Custom JAMB Simulator Dashboard
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">
            This dashboard layout is ready and waiting for your custom parameters. You will soon be able to build custom timed mocks, multi-subject mixes, and targeted chapter drills.
          </p>
        </div>

        {/* Directory Spec Preview Placeholders */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl pt-4">
          <div className={`p-4 rounded-2xl border text-left ${
            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Clock size={18} className="text-amber-500 mb-2" />
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Custom Timing</h4>
            <p className="text-[11px] text-slate-400 mt-1">15m, 30m, 60m, or unlimited drills</p>
          </div>

          <div className={`p-4 rounded-2xl border text-left ${
            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Layers size={18} className="text-blue-500 mb-2" />
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Topic Filter</h4>
            <p className="text-[11px] text-slate-400 mt-1">Select specific syllabus subtopics</p>
          </div>

          <div className={`p-4 rounded-2xl border text-left ${
            isDark ? 'bg-slate-950/60 border-slate-800/80' : 'bg-slate-50 border-slate-200'
          }`}>
            <Cpu size={18} className="text-emerald-500 mb-2" />
            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Engine Calibration</h4>
            <p className="text-[11px] text-slate-400 mt-1">Hard questions only or mixed UTME</p>
          </div>
        </div>

        {/* Quick Navigation Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/home"
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-amber-400 hover:text-slate-950 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-blue-600/20"
          >
            Return to Dashboard
          </Link>
          <Link
            to="/blitz"
            className="px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
          >
            Launch Blitz 60s
          </Link>
          <Link
            to="/smart"
            className="px-6 py-3 rounded-xl border border-slate-700 hover:border-slate-500 text-slate-300 font-bold text-xs uppercase tracking-wider transition"
          >
            Smart Practice
          </Link>
        </div>
      </section>
    </div>
  );
}
