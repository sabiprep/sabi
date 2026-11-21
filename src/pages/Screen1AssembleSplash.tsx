import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SabiIronManAssemble } from '../components/common/SabiIronManAssemble';

/**
 * SCREEN 1 (`/`): FULL-SCREEN SABI ASSEMBLY SPLASH
 * Assembles the SABI emblem and transitions directly into Screen 2 (`/welcome`).
 */
export function Screen1AssembleSplash() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/welcome');
  };

  return (
    <main
      onClick={handleComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060B18] text-white px-4 overflow-hidden select-none cursor-pointer"
      title="Click or tap anywhere to continue"
    >
      <div className="absolute w-[600px] h-[600px] rounded-full bg-blue-600/15 blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 w-full flex flex-col items-center justify-center animate-fade-in">
        <SabiIronManAssemble onComplete={handleComplete} autoCompleteDelay={4000} />
      </div>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          handleComplete();
        }}
        className="absolute bottom-6 text-[11px] font-mono tracking-wider text-slate-400 hover:text-white transition-colors uppercase py-1.5 px-4 rounded-full cursor-pointer"
      >
        TAP TO CONTINUE →
      </button>
    </main>
  );
}
