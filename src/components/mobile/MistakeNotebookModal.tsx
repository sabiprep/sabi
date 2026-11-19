import React, { useState, useEffect } from 'react';
import {
  X, BookMarked, Sparkles, CheckCircle2, RotateCcw,
  Trash2, ChevronDown, ChevronUp, AlertCircle, ArrowRight
} from 'lucide-react';
import { SubjectName, Question } from '../../types';
import MathText from '../MathText';
import { getMistakeRecords, markMistakeMastered, removeMistakeRecord, MistakeRecord } from '../../utils/mistakeStore';
import { sound } from '../../utils/soundEffects';

interface MistakeNotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartRetest: (questions: Question[]) => void;
  onOpenAITutor: (subject: SubjectName, topic: string) => void;
}

export default function MistakeNotebookModal({
  isOpen,
  onClose,
  onStartRetest,
  onOpenAITutor,
}: MistakeNotebookModalProps) {
  const [records, setRecords] = useState<MistakeRecord[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPidgin, setShowPidgin] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      setRecords(getMistakeRecords());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filtered = records.filter(r => {
    if (selectedSubject === 'All') return true;
    return r.question.subject === selectedSubject;
  });

  const unmasteredCount = records.filter(r => !r.mastered).length;

  const handleMaster = (qId: string) => {
    sound.playCorrect();
    markMistakeMastered(qId);
    setRecords(getMistakeRecords());
  };

  const handleDelete = (qId: string) => {
    sound.playTap();
    removeMistakeRecord(qId);
    setRecords(getMistakeRecords());
  };

  const handleStartDrill = () => {
    sound.playTap();
    const questionsToRetest = filtered.map(r => r.question);
    if (questionsToRetest.length > 0) {
      onStartRetest(questionsToRetest);
      onClose();
    }
  };

  const togglePidgin = (qId: string) => {
    setShowPidgin(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg h-[90vh] sm:h-[82vh] rounded-t-3xl sm:rounded-3xl bg-white dark:bg-[#0A1128] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400 flex items-center justify-center">
              <BookMarked size={18} />
            </div>
            <div>
              <h2 className="font-display text-sm font-black text-slate-900 dark:text-white">
                Mistake Notebook
              </h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                {unmasteredCount} question{unmasteredCount === 1 ? '' : 's'} to conquer
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
          >
            <X size={15} />
          </button>
        </div>

        {/* Subject Filter Tabs */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {['All', 'English Language', 'Mathematics', 'Physics', 'Chemistry'].map(sub => (
            <button
              key={sub}
              onClick={() => {
                sound.playTap();
                setSelectedSubject(sub);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedSubject === sub
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>

        {/* Action Bar if items exist */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/60 flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
              {filtered.length} mistake{filtered.length === 1 ? '' : 's'} in {selectedSubject}
            </span>
            <button
              onClick={handleStartDrill}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-xs active:scale-95 transition"
            >
              <span>Re-Test These ({filtered.length})</span>
              <ArrowRight size={13} />
            </button>
          </div>
        )}

        {/* Mistakes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-display text-base font-black text-slate-900 dark:text-white">
                No Mistakes Here!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                Any question you miss during CBT practice or Mock exams will automatically appear here for review.
              </p>
            </div>
          ) : (
            filtered.map(record => {
              const q = record.question;
              const isExpanded = expandedId === q.id;
              const inPidgin = showPidgin[q.id] || false;

              return (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    record.mastered
                      ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
                      : 'bg-white dark:bg-[#111A2E] border-red-200/80 dark:border-red-900/50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                        {q.subject}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">
                        {q.topic}
                      </span>
                      {record.timesWrong > 1 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Missed {record.timesWrong}x
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-500 transition"
                        title="Delete from notebook"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                    <MathText text={q.question} />
                  </div>

                  {/* Answers Comparison */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-300">
                      <span className="text-[9px] font-black uppercase text-red-500 block">
                        You Picked ({record.selectedAnswer}):
                      </span>
                      <span className="font-semibold truncate block">
                        {q.options[record.selectedAnswer as keyof typeof q.options] || 'No answer'}
                      </span>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-900 dark:text-emerald-300">
                      <span className="text-[9px] font-black uppercase text-emerald-600 block">
                        Correct ({q.answer}):
                      </span>
                      <span className="font-semibold truncate block">
                        {q.options[q.answer as keyof typeof q.options]}
                      </span>
                    </div>
                  </div>

                  {/* Expand Explanation Toggle */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    >
                      <span>{isExpanded ? 'Hide explanation' : 'View explanation & syllabus'}</span>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {!record.mastered ? (
                      <button
                        onClick={() => handleMaster(q.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <CheckCircle2 size={13} />
                        <span>I understand now</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Mastered
                      </span>
                    )}
                  </div>

                  {/* Expanded Explanation */}
                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-slate-400">
                          Syllabus Concept Breakdown
                        </span>
                        <button
                          onClick={() => togglePidgin(q.id)}
                          className="text-[10px] font-black underline text-emerald-600 dark:text-emerald-400"
                        >
                          {inPidgin ? 'Standard English' : 'Pidgin Mode 🇳🇬'}
                        </button>
                      </div>

                      <div className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                        <MathText text={inPidgin ? q.explanation_pidgin : q.explanation} />
                      </div>

                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => {
                            onClose();
                            onOpenAITutor(q.subject, q.topic);
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <Sparkles size={12} />
                          <span>Ask Sabi AI about this question</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
