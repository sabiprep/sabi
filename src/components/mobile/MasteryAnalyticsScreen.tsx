import React, { useState } from 'react';
import {
  BarChart3, Target, Gauge, TrendingUp, AlertTriangle, CheckCircle,
  Play, Sparkles, ChevronRight, School, ArrowUpRight
} from 'lucide-react';
import { SubjectName } from '../../types';

interface MasteryAnalyticsScreenProps {
  onStartTopicPractice: (subject: SubjectName, topic: string) => void;
}

export default function MasteryAnalyticsScreen({ onStartTopicPractice }: MasteryAnalyticsScreenProps) {
  const [selectedSubjectTab, setSelectedSubjectTab] = useState<SubjectName>('English Language');

  const topicsBySubject: Record<SubjectName, { name: string; score: number; status: 'mastered' | 'developing' | 'risk' }[]> = {
    'English Language': [
      { name: 'Lexis and Structure', score: 84, status: 'mastered' },
      { name: 'Comprehension', score: 76, status: 'mastered' },
      { name: 'Synonyms & Antonyms', score: 72, status: 'developing' },
      { name: 'Proximity Concord', score: 42, status: 'risk' },
      { name: 'Subjunctive Mood', score: 48, status: 'risk' },
    ],
    'Mathematics': [
      { name: 'Indices and Logarithms', score: 80, status: 'mastered' },
      { name: 'Quadratic Equations', score: 68, status: 'developing' },
      { name: 'Matrices & Determinants', score: 62, status: 'developing' },
      { name: 'Calculus Differentiation', score: 45, status: 'risk' },
    ],
    'Physics': [
      { name: "Newton's Laws & Mechanics", score: 78, status: 'mastered' },
      { name: 'Current Electricity', score: 64, status: 'developing' },
      { name: 'Waves & Sound', score: 58, status: 'developing' },
      { name: 'Refraction & Critical Angle', score: 38, status: 'risk' },
    ],
    'Chemistry': [
      { name: 'Atomic Structure & Periodic Table', score: 82, status: 'mastered' },
      { name: 'Acids, Bases and Salts', score: 74, status: 'mastered' },
      { name: 'Gas Laws & Stoichiometry', score: 60, status: 'developing' },
      { name: 'Organic Chemistry Reactions', score: 44, status: 'risk' },
    ],
    'Biology': [],
    'Agricultural Science': [],
    'Geography': [],
    'Economics': [],
    'Government': [],
    'History': [],
    'Commerce': [],
    'Financial Accounting': [],
    'Christian Religious Studies': [],
    'Islamic Religious Studies': [],
    'Literature-in-English': [],
    'Music': [],
    'Fine Art': [],
    'French': [],
    'Arabic': [],
    'Yoruba': [],
    'Igbo': [],
    'Hausa': [],
    'Home Economics': [],
  };

  const currentTopics = topicsBySubject[selectedSubjectTab] || [];

  return (
    <div className="p-4 space-y-4 pb-20">
      <div>
        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
          Analytics & Predictions
        </span>
        <h1 className="font-display text-xl font-black text-slate-900 dark:text-white">
          Mastery & Predicted Score
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Based on 535 answered questions and response accuracy.
        </p>
      </div>

      {/* 1. PROJECTED JAMB SCORE CARD */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A1128] via-[#101F42] to-[#0D253A] p-5 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-400/30">
            Current Prediction
          </span>
          <span className="text-xs font-semibold text-slate-300">
            Confidence: 86%
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-4xl font-black text-white">
                294
              </span>
              <span className="text-slate-400 font-bold text-base">
                / 400
              </span>
            </div>
            <p className="text-xs text-emerald-400 font-bold mt-1">
              +14 points higher than last week
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400">Target Benchmark</span>
            <p className="text-sm font-black text-white">320+ JAMB 2027</p>
            <p className="text-[10px] text-slate-400">UNILAG Med Cut-off: 290</p>
          </div>
        </div>

        {/* Target Cutoff Gauge Comparison */}
        <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5">
          <div className="flex justify-between text-[11px] text-slate-300">
            <span>UNILAG Cut-off: 290</span>
            <span className="font-black text-emerald-400">Safe Zone (+4 pts)</span>
          </div>
          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-emerald-400 to-teal-300 rounded-full"
              style={{ width: `${(294 / 400) * 100}%` }}
            />
          </div>
        </div>
      </section>

      {/* 2. SUBJECT ACCURACY TABS */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Syllabus Topic Heatmap
          </h2>
          <span className="text-[10px] font-bold text-slate-400">Select Subject</span>
        </div>

        {/* Tab Pills */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {(['English Language', 'Mathematics', 'Physics', 'Chemistry'] as SubjectName[]).map(subj => (
            <button
              key={subj}
              onClick={() => setSelectedSubjectTab(subj)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedSubjectTab === subj
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#111A2E] text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800'
              }`}
            >
              {subj.replace(' Language', '')}
            </button>
          ))}
        </div>

        {/* Topics Breakdown List */}
        <div className="space-y-2">
          {currentTopics.map(t => {
            const isRisk = t.status === 'risk';
            const isMastered = t.status === 'mastered';

            return (
              <div
                key={t.name}
                className="p-3.5 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        isRisk ? 'bg-red-500' : isMastered ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t.name}
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isRisk ? 'bg-red-500' : isMastered ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${t.score}%` }}
                    />
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {t.score}%
                  </span>
                  <div className="mt-1">
                    <button
                      onClick={() => onStartTopicPractice(selectedSubjectTab, t.name)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition flex items-center gap-0.5 ${
                        isRisk
                          ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      <span>Boost</span>
                      <ChevronRight size={11} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. WEEKLY ACTIVITY GRAPH */}
      <section className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
          Weekly Study Intensity
        </h3>

        <div className="flex items-end justify-between h-28 gap-2 pt-2 px-1">
          {[
            { day: 'M', val: 45, count: '18q' },
            { day: 'T', val: 65, count: '26q' },
            { day: 'W', val: 50, count: '20q' },
            { day: 'T', val: 80, count: '32q' },
            { day: 'F', val: 70, count: '28q' },
            { day: 'S', val: 95, count: '40q' },
            { day: 'S', val: 60, count: '24q' },
          ].map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center h-full justify-end group">
              <span className="text-[9px] font-bold text-slate-400 mb-1 opacity-0 group-hover:opacity-100 transition">
                {bar.count}
              </span>
              <div
                className="w-full max-w-[24px] rounded-t-lg bg-emerald-500/80 hover:bg-emerald-500 transition-all"
                style={{ height: `${bar.val}%` }}
              />
              <span className="text-[10px] font-bold text-slate-500 mt-1.5">
                {bar.day}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
