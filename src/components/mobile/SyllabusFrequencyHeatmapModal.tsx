import React, { useState } from 'react';
import {
  X, BarChart3, Flame, AlertCircle, CheckCircle2, BookOpen,
  ArrowRight, Sparkles, Filter, Info, ShieldCheck, Play
} from 'lucide-react';
import { SubjectName } from '../../types';
import { SYLLABUS_FREQUENCY_DATA, TopicFrequency, SubjectSyllabusAnalysis } from '../../data/syllabusFrequencyData';
import MathText from '../MathText';
import { sound } from '../../utils/soundEffects';

interface SyllabusFrequencyHeatmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartTopicPractice?: (subject: SubjectName, topic: string) => void;
}

export default function SyllabusFrequencyHeatmapModal({
  isOpen,
  onClose,
  onStartTopicPractice,
}: SyllabusFrequencyHeatmapModalProps) {
  const [selectedSubject, setSelectedSubject] = useState<SubjectName>('English Language');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const subjectData: SubjectSyllabusAnalysis | undefined = SYLLABUS_FREQUENCY_DATA[selectedSubject];

  const availableSubjects: SubjectName[] = [
    'English Language',
    'Mathematics',
    'Physics',
    'Chemistry'
  ];

  if (!isOpen) return null;

  const filteredTopics = subjectData?.topics.filter(t => {
    if (filterTier === 'all') return true;
    if (filterTier === 'high') return t.frequencyTier.includes('High-Yield');
    if (filterTier === 'medium') return t.frequencyTier.includes('Medium-Yield');
    if (filterTier === 'low') return t.frequencyTier.includes('Low-Yield');
    return true;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-xl bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-[730px]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-amber-950/10 via-slate-900/5 to-emerald-950/10 dark:from-amber-950/40 dark:to-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <BarChart3 size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                  JAMB Syllabus Frequency Heatmap
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  10-Year Trend
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Official Exam Weightings, High-Yield Priority Topics & Pitfalls
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Subject Selector Tabs */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex gap-1.5 overflow-x-auto no-scrollbar">
          {availableSubjects.map(sub => (
            <button
              key={sub}
              onClick={() => {
                sound.playTap();
                setSelectedSubject(sub);
                setSelectedTopic(null);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
                selectedSubject === sub
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Tier Filter Pills */}
        <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs bg-white dark:bg-[#0E1526]">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400">Filter Tier:</span>
            <button
              onClick={() => {
                sound.playTap();
                setFilterTier('all');
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                filterTier === 'all'
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500'
              }`}
            >
              All Topics
            </button>
            <button
              onClick={() => {
                sound.playTap();
                setFilterTier('high');
              }}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                filterTier === 'high'
                  ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 font-black'
                  : 'text-slate-500'
              }`}
            >
              🔥 High-Yield Only
            </button>
          </div>

          {subjectData && (
            <span className="text-[10px] text-slate-400">
              {subjectData.officialTotalQuestions} Qs · {subjectData.timeAllocatedMinutes} Mins
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 no-scrollbar">
          
          {/* Subject Overview Card */}
          {subjectData && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-[#101F42] text-white text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">
                  UTME Structure Blueprint
                </span>
                <span className="text-[10px] font-bold text-emerald-400">
                  {subjectData.highYieldTopicsCount} High-Yield Core Areas
                </span>
              </div>
              <p className="mt-1 text-slate-200 text-[11px] leading-relaxed">
                {subjectData.examPatternSummary}
              </p>
            </div>
          )}

          {/* Topics List with Heatmap Progress Bars */}
          <div className="space-y-2.5">
            {filteredTopics.map((item) => {
              const isSelected = selectedTopic === item.topic;
              const isHighYield = item.frequencyTier.includes('High-Yield');
              const isMediumYield = item.frequencyTier.includes('Medium-Yield');

              return (
                <div
                  key={item.topic}
                  className={`rounded-2xl border transition overflow-hidden ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xs'
                      : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#111A2E] hover:border-slate-300'
                  }`}
                >
                  <button
                    onClick={() => {
                      sound.playTap();
                      setSelectedTopic(isSelected ? null : item.topic);
                    }}
                    className="w-full p-3.5 text-left flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                          isHighYield
                            ? 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : isMediumYield
                            ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {item.frequencyTier}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          Appeared in {item.examCountIn10Years}/10 JAMB Exams
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 dark:text-white mt-1 truncate">
                        {item.topic}
                      </h4>

                      {/* Visual Frequency Bar */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isHighYield
                                ? 'bg-gradient-to-r from-red-500 to-amber-500'
                                : isMediumYield
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${item.percentageOfExam * 2.2}%` }}
                          />
                        </div>
                        <span className="font-black text-xs text-slate-900 dark:text-white shrink-0">
                          {item.percentageOfExam}% of Exam
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Topic Details */}
                  {isSelected && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs space-y-2.5 animate-in fade-in">
                      {/* Subtopics */}
                      <div>
                        <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
                          Frequently Tested Subtopics:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.subtopics.map((st, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                            >
                              {st}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Key Concepts to Memorize */}
                      <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1 mb-1">
                          <Sparkles size={12} />
                          <span>Must-Know Formulas & Rules:</span>
                        </span>
                        <div className="space-y-1 text-[11px] text-slate-700 dark:text-slate-300">
                          {item.keyConceptsToMemorize.map((formula, i) => (
                            <div key={i} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">•</span>
                              <MathText text={formula} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Common Pitfalls & Traps */}
                      <div className="p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-[11px]">
                        <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1 mb-0.5">
                          <AlertCircle size={12} />
                          <span>Common JAMB Trap:</span>
                        </span>
                        <p className="text-slate-700 dark:text-slate-300">
                          {item.commonPitfalls}
                        </p>
                      </div>

                      {/* Practice Topic CTA */}
                      {onStartTopicPractice && (
                        <button
                          onClick={() => {
                            sound.playTap();
                            onStartTopicPractice(selectedSubject, item.topic);
                            onClose();
                          }}
                          className="w-full mt-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition"
                        >
                          <Play size={13} className="fill-current" />
                          <span>Practice {item.topic} Questions Now</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <Info size={14} className="text-amber-500" />
            <span>Mastering High-Yield topics guarantees over 70% of total subject score.</span>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-emerald-600 text-white font-bold text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
