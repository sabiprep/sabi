import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Play, Target } from 'lucide-react';
import LevelSimulatorWorkspace from '../components/LevelSimulatorWorkspace';
import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';

export function DiagnosticPage() {
  const [activeQuestions, setActiveQuestions] = useState<Question[] | null>(null);

  const startDiagnostic = () => {
    const picked = [...SEED_QUESTIONS].slice(0, 12);
    setActiveQuestions(picked);
  };

  if (activeQuestions) {
    return (
      <LevelSimulatorWorkspace
        mode="smart"
        levelId={1}
        levelTitle="4-Subject UTME Baseline Diagnostic"
        subjectLabel="English Language"
        questions={activeQuestions}
        secondsPerQuestion={60}
        isGeneralTest={false}
        onClose={() => setActiveQuestions(null)}
        onProgressUpdated={() => {}}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-[#080D1A] dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600"
        >
          ← Back to dashboard
        </Link>
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 sm:p-10 shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Target size={28} />
          </div>
          <span className="text-xs font-black uppercase tracking-widest text-blue-600">
            PERSONAL UTME BASELINE ASSESSMENT
          </span>
          <h1 className="text-3xl font-black sm:text-4xl">
            Discover your strengths and learning gaps.
          </h1>
          <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
            Take a rapid 12-question baseline diagnostic across Use of English, Mathematics, Physics, and Chemistry to calibrate your Subject Mastery Rates.
          </p>
          <button
            type="button"
            onClick={startDiagnostic}
            className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-500 px-6 py-4 text-sm font-black text-white uppercase tracking-wider cursor-pointer shadow-lg"
          >
            <Play size={16} className="fill-current" />
            <span>Start Baseline Diagnostic (12Q)</span>
            <ArrowRight size={17} />
          </button>
        </section>
      </div>
    </main>
  );
}
export default DiagnosticPage;
