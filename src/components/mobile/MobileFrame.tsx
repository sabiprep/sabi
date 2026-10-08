import React from 'react';
import { Smartphone, Monitor, Sun, Moon, Sparkles, Wifi, Battery, Radio } from 'lucide-react';

interface MobileFrameProps {
  children: React.ReactNode;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  fullWidthMode: boolean;
  setFullWidthMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAIModal?: () => void;
}

export default function MobileFrame({
  children,
  darkMode,
  setDarkMode,
  fullWidthMode,
  setFullWidthMode,
  onOpenAIModal,
}: MobileFrameProps) {
  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-[#070B14]' : 'bg-[#F1F5F9]'}`}>
      {/* Desktop Top Control Bar */}
      <header className="hidden sm:flex items-center justify-between px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#059669] to-[#10B981] flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-emerald-500/20">
              S
            </div>
            <div>
              <span className="font-display font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                SABI
              </span>
              <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                JAMB 2027 Mobile App
              </span>
            </div>
          </div>
        </div>

        {/* Viewport & Theme Switcher Controls */}
        <div className="flex items-center gap-2">
          {onOpenAIModal && (
            <button
              onClick={onOpenAIModal}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition"
              title="Open Sabi AI Tutor"
            >
              <Sparkles size={14} className="text-emerald-600 dark:text-emerald-400" />
              <span>Ask Sabi AI</span>
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

          {/* Toggle Mobile Phone Mockup vs Full-width Mobile */}
          <button
            onClick={() => setFullWidthMode(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            title="Toggle between phone frame and full-screen view"
          >
            {fullWidthMode ? <Smartphone size={14} /> : <Monitor size={14} />}
            <span>{fullWidthMode ? 'Phone Frame' : 'Full Mobile View'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setDarkMode(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-slate-600" />}
            <span>{darkMode ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className={`mx-auto flex justify-center items-start sm:py-6 sm:px-4 ${fullWidthMode ? 'max-w-2xl py-0 px-0' : 'max-w-md py-0 px-0'}`}>
        {/* iPhone Mobile Frame */}
        <div
          className={`w-full transition-all duration-300 overflow-hidden flex flex-col ${
            fullWidthMode
              ? 'max-w-xl min-h-screen sm:min-h-[880px] sm:rounded-3xl sm:border sm:border-slate-300 dark:sm:border-slate-800 sm:shadow-2xl bg-white dark:bg-[#0B0F19]'
              : 'max-w-[420px] min-h-screen sm:min-h-[860px] sm:max-h-[900px] sm:rounded-[44px] sm:border-[8px] sm:border-[#1E293B] dark:sm:border-[#0F172A] sm:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] bg-white dark:bg-[#0B0F19] relative'
          }`}
        >
          {/* iOS Status Bar (Visible in Phone Frame & Mobile View) */}
          <div className="shrink-0 h-11 px-6 flex items-center justify-between text-xs font-semibold text-slate-800 dark:text-slate-200 select-none bg-inherit z-30">
            <span className="text-[13px] font-bold tracking-tight">9:41</span>
            
            {/* Dynamic Island Pill Notch */}
            <div className="h-5 w-24 bg-black rounded-full mx-auto flex items-center justify-center px-2 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2 border border-slate-800" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-pulse" />
            </div>

            <div className="flex items-center gap-1.5">
              <Radio size={12} className="rotate-45" />
              <Wifi size={13} />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-bold">100%</span>
                <Battery size={15} className="fill-current text-slate-700 dark:text-slate-200" />
              </div>
            </div>
          </div>

          {/* Inner App Content Screen Area */}
          <div className="flex-1 flex flex-col overflow-y-auto no-scrollbar relative bg-[#F8FAFC] dark:bg-[#0B0F19] text-[#0A1128] dark:text-[#F8FAFC]">
            {children}
          </div>

          {/* iOS Bottom Home Bar */}
          <div className="shrink-0 h-5 flex items-center justify-center pb-1 bg-white dark:bg-[#0B0F19] z-30">
            <div className="w-32 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
