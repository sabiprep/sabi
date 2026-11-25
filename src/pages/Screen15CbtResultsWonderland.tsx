import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Flag,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  loadLastCbtMockResult,
  type CbtMockResult,
} from '../utils/cbtAndCustomEngine';

type ReviewFilter = 'all' | 'missed' | 'correct' | 'flagged';

/**
 * SCREEN 15 (`/cbt/results`): CBT EXAM RESULTS & FULL SCRIPT REVIEW
 * Displays scaled /400 mock estimate (explicitly not an official JAMB result),
 * 4-subject breakdown, and interactive script review with explanations & Naija Pidgin.
 */
export function Screen15CbtResultsWonderland() {
  const navigate = useNavigate();
  const location = useLocation();
  const student = useMemo(() => getWonderlandDashboardState(), []);

  const stateResult = (location.state as { result?: CbtMockResult } | null)?.result;
  const result = useMemo(
    () => stateResult || loadLastCbtMockResult(),
    [stateResult]
  );

  const [filter, setFilter] = useState<ReviewFilter>('missed');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pidginMode, setPidginMode] = useState(false);

  if (!result) {
    return (
      <SabiAppChrome
        activeTab="cbt"
        backdropVariant="home"
        streakDays={student.streakDays}
        xpBalance={student.xpBalance}
      >
        <main className="w-full max-w-[780px] mx-auto px-4 py-10 text-center">
          <div
            className="bg-white rounded-[26px] p-6 sm:p-8"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <h1
              className="text-[26px] font-bold text-[#260559]"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              No CBT result found yet
            </h1>
            <p className="mt-2 text-[14.5px] font-semibold text-[#5A467A]">
              Complete a Quick 40-Q or Full 180-Q CBT Mock to unlock your breakdown and script
              review.
            </p>
            <button
              type="button"
              onClick={() => navigate('/cbt')}
              className="mt-5 px-6 py-3.5 rounded-[18px] bg-[#6C19E5] text-white font-bold uppercase tracking-wide cursor-pointer"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 4px 0 #46099E',
              }}
            >
              Go to CBT Simulator
            </button>
          </div>
        </main>
      </SabiAppChrome>
    );
  }

  const minsUsed = Math.max(1, Math.round(result.durationUsedSeconds / 60));

  const filteredReview = result.reviewItems.filter(item => {
    if (filter === 'missed') return !item.isCorrect;
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'flagged') return item.isFlagged;
    return true;
  });

  return (
    <SabiAppChrome
      activeTab="cbt"
      backdropVariant="progress"
      streakDays={student.streakDays}
      xpBalance={student.xpBalance}
    >
      <main className="w-full max-w-[1320px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 pb-6">
        {/* TOP BAR */}
        <header className="flex items-center justify-between gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate('/cbt')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-[14px] bg-white text-[#260559] font-extrabold text-[13.5px] cursor-pointer"
            style={{ boxShadow: '0 3px 0 #E2C700' }}
          >
            <ChevronLeft size={18} strokeWidth={2.7} />
            <span>CBT Hub</span>
          </button>
          <SabiMenuTriggerButton />
        </header>

        {/* HERO SCORE BANNER */}
        <section
          className="rounded-[26px] bg-[#2A085E] p-5 sm:p-7 text-white mb-5"
          style={{ boxShadow: '0 6px 0 #170338' }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-white/14 text-[#FFE51E] text-[11px] font-extrabold uppercase tracking-wider">
                {result.title}
              </span>
              <h1
                className="mt-2 text-[34px] sm:text-[44px] font-bold text-[#FFE51E] leading-none tabular-nums"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                {result.scaledUtme400} <span className="text-[20px] text-white/80">/ 400</span>
              </h1>
              <p className="mt-1.5 text-[13px] sm:text-[14px] font-semibold text-[#D9C7FA]">
                Mock performance estimate (not an official JAMB score) · {result.correctCount}/
                {result.totalQuestions} correct ({result.accuracyPercent}%) · {minsUsed} min used
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/practice/setup?pace=smart&scope=single&focus=${encodeURIComponent(
                      result.weakestSubjectCanonical
                    )}`
                  )
                }
                className="px-5 py-3 rounded-[16px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[14px] uppercase tracking-wide inline-flex items-center gap-2 cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #C7AD00',
                }}
              >
                <span>Fix {result.weakestSubjectLabel}</span>
                <ArrowRight size={17} />
              </button>

              <button
                type="button"
                onClick={() => {
                  const params = new URLSearchParams({
                    preset: result.preset,
                    source: result.sourceMode === 'year' ? 'year' : 'shuffle',
                  });
                  if (result.sourceMode === 'year' && result.selectedYear) {
                    params.set('year', String(result.selectedYear));
                  }
                  navigate(`/cbt/exam?${params.toString()}`);
                }}
                className="px-4 py-3 rounded-[16px] bg-white/14 hover:bg-white/22 text-white font-extrabold text-[14px] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>Retake Mock</span>
              </button>
            </div>
          </div>

          {/* 4-Subject Score Strip */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {result.subjectScores.map(subj => (
              <div
                key={subj.subjectCanonical}
                className="rounded-[16px] bg-white/10 border border-white/10 px-3.5 py-3"
              >
                <div className="text-[12px] font-bold text-[#DCD0F5] truncate">
                  {subj.subjectLabel}
                </div>
                <div
                  className="mt-1 text-[22px] font-bold text-white tabular-nums leading-none"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {subj.scaledScore100}
                  <span className="text-[12px] text-[#FFE51E] font-extrabold">/100</span>
                </div>
                <div className="mt-1 text-[11.5px] font-semibold text-[#C8B5EA] tabular-nums">
                  {subj.correct}/{subj.total} correct
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FULL SCRIPT REVIEW SECTION */}
        <section
          className="bg-white rounded-[24px] p-4 sm:p-6"
          style={{ boxShadow: '0 4px 0 #E2C700' }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-[19px] sm:text-[21px] font-extrabold text-[#260559]">
                Script Review & Worked Solutions
              </h2>
              <p className="text-[13px] font-semibold text-[#5A467A]">
                Tap any question to inspect why the correct option works.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setPidginMode(prev => !prev)}
              className={`self-start sm:self-auto px-3.5 py-1.5 rounded-full text-[12px] font-extrabold cursor-pointer ${
                pidginMode
                  ? 'bg-[#6C19E5] text-white'
                  : 'bg-[#F3EEFD] text-[#6C19E5]'
              }`}
            >
              {pidginMode ? 'Naija Pidgin: ON' : 'Switch to Naija Pidgin'}
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(
              [
                { id: 'missed', label: `Missed (${result.reviewItems.filter(r => !r.isCorrect).length})` },
                { id: 'all', label: `All (${result.reviewItems.length})` },
                { id: 'correct', label: `Correct (${result.reviewItems.filter(r => r.isCorrect).length})` },
                { id: 'flagged', label: `Flagged (${result.reviewItems.filter(r => r.isFlagged).length})` },
              ] as { id: ReviewFilter; label: string }[]
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`px-3.5 py-2 rounded-full text-[13px] font-extrabold cursor-pointer transition-colors ${
                  filter === tab.id
                    ? 'bg-[#2A085E] text-[#FFE51E]'
                    : 'bg-[#F5F0FF] text-[#4A356E] hover:bg-[#EAE0FC]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Review Cards */}
          {filteredReview.length === 0 ? (
            <div className="rounded-[18px] bg-[#FAF7FF] p-6 text-center text-[14px] font-bold text-[#5A467A]">
              No questions match this filter.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReview.slice(0, 60).map(item => {
                const isOpen = expandedId === item.question.id;
                return (
                  <div
                    key={item.question.id}
                    className={`rounded-[18px] border-[1.5px] p-4 transition-colors ${
                      item.isCorrect
                        ? 'border-[#A7F3D0] bg-[#F7FEF9]'
                        : 'border-[#FECACA] bg-[#FFF8F8]'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isOpen ? null : item.question.id)
                      }
                      className="w-full text-left flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          {item.isCorrect ? (
                            <CheckCircle2 size={16} className="text-[#059669] shrink-0" />
                          ) : (
                            <XCircle size={16} className="text-[#DC2626] shrink-0" />
                          )}
                          <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-[#6C19E5]">
                            {item.question.subjectLabel} · Q{item.question.examIndex + 1}
                          </span>
                          {item.isFlagged && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#EA580C]">
                              <Flag size={11} /> Flagged
                            </span>
                          )}
                        </div>
                        <p className="text-[14.5px] sm:text-[15.5px] font-extrabold text-[#260559] leading-snug">
                          {item.question.question}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-3 text-[12.5px] font-bold">
                          <span className={item.isCorrect ? 'text-[#059669]' : 'text-[#DC2626]'}>
                            Your answer: {item.selectedOption || 'Skipped'}
                          </span>
                          <span className="text-[#059669]">
                            Correct: {item.question.answer} ({item.question.options[item.question.answer]})
                          </span>
                        </div>
                      </div>
                      <span className="text-[#5A467A] shrink-0 mt-1">
                        {isOpen ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="mt-3 pt-3 border-t border-black/10 text-[13.5px] font-semibold text-[#2E1359] leading-relaxed">
                        {pidginMode
                          ? item.question.explanationPidgin
                          : item.question.explanationFull}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </SabiAppChrome>
  );
}
