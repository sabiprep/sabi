import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  Compass,
  Layers,
  MessageSquare,
  Target,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  getSubjectRatingsSnapshot,
  type SubjectRatingInsight,
} from '../utils/progressInsightsEngine';
import { sound } from '../utils/soundEffects';

function readinessChipStyle(tone: SubjectRatingInsight['readinessTone']): string {
  switch (tone) {
    case 'purple':
      return 'bg-[#EFE6FF] text-[#6C19E5]';
    case 'emerald':
      return 'bg-[#ECFDF5] text-[#047857]';
    case 'amber':
      return 'bg-[#FFFBEB] text-[#B45309]';
    case 'danger':
      return 'bg-[#FEF2F2] text-[#DC2626]';
    default:
      return 'bg-[#F3EEFD] text-[#5A467A]';
  }
}

/**
 * SCREEN 7C (`/progress/subjects`): SUBJECT PERFORMANCE RATINGS & AI TOPIC INSIGHTS
 * Displays real subject mastery ratings for all 4 chosen JAMB subjects.
 * Tapping any subject opens detailed topic-by-topic accuracy, Mistakes Vault flags,
 * and SABI AI diagnosis showing exactly where the candidate is struggling.
 */
export function Screen7cSubjectRatingsWonderland() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dashboard = useMemo(() => getWonderlandDashboardState(), []);
  const snapshot = useMemo(() => getSubjectRatingsSnapshot(), []);

  const querySubject = searchParams.get('subject');
  const initialCanonical =
    snapshot.subjects.find(
      s => s.subject.canonicalName.toLowerCase() === (querySubject || '').toLowerCase()
    )?.subject.canonicalName ||
    snapshot.weakestSubject?.subject.canonicalName ||
    snapshot.subjects[0]?.subject.canonicalName ||
    'English Language';

  const [selectedCanonical, setSelectedCanonical] = useState<string>(initialCanonical);

  const activeInsight =
    snapshot.subjects.find(s => s.subject.canonicalName === selectedCanonical) ||
    snapshot.subjects[0];

  const handleSelectSubject = (canonical: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setSelectedCanonical(canonical);
  };

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={dashboard.streakDays}
      xpBalance={dashboard.xpBalance}
    >
      <main className="w-full max-w-[1340px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7 pb-5">
        {/* TOP BAR */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/progress')}
              aria-label="Back to Progress Hub"
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#29065E] flex items-center justify-center transition-transform active:translate-y-[1px] cursor-pointer shrink-0"
              style={{ boxShadow: '0 3.5px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.8} />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#5B21B6]">
                PROGRESS · REAL MASTERY RATINGS
              </div>
              <h1
                className="text-[25px] sm:text-[31px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                Subject Performance
              </h1>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* OVERVIEW SUMMARY STRIP */}
        <section
          className="rounded-[24px] bg-[#2A085E] px-5 py-4 sm:px-6 sm:py-5 text-white mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          style={{ boxShadow: '0 5px 0 #170338' }}
        >
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#FFE51E]">
              LIVE SYSTEM TRACKING · NOT AN OFFICIAL JAMB SCORE
            </div>
            <h2
              className="mt-0.5 text-[22px] sm:text-[26px] font-bold text-white leading-tight"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {snapshot.averageMastery}% overall accuracy · {snapshot.totalSolved} questions solved
            </h2>
            <p className="text-[13px] font-semibold text-[#D9C7FA]">
              Tap any subject card to inspect topic accuracy and weak areas detected by SABI.
            </p>
          </div>

          {snapshot.totalSolved === 0 && (
            <button
              type="button"
              onClick={() => navigate('/diagnostic')}
              className="px-4 py-2.5 rounded-[14px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[13px] inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center cursor-pointer"
              style={{ boxShadow: '0 3px 0 #C7AD00' }}
            >
              <Compass size={16} />
              <span>Take 12-Q Baseline</span>
            </button>
          )}
        </section>

        {/* SPLIT WORKSPACE: 4 SUBJECT RATING CARDS (LEFT) + DEEP TOPIC INSIGHT PANEL (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT (5/12): 4 INTERACTIVE SUBJECT RATING CARDS */}
          <section className="lg:col-span-5 space-y-3">
            <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#351766]">
              TAP A SUBJECT FOR TOPIC INSIGHTS
            </div>

            {snapshot.subjects.map(item => {
              const isSelected = item.subject.canonicalName === activeInsight?.subject.canonicalName;
              return (
                <button
                  key={item.subject.canonicalName}
                  type="button"
                  onClick={() => handleSelectSubject(item.subject.canonicalName)}
                  aria-pressed={isSelected}
                  className={`w-full text-left rounded-[22px] bg-white p-4 sm:p-5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[2.5px] border-[#6C19E5] ring-2 ring-[#6C19E5]/20'
                      : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
                  }`}
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider text-white"
                          style={{ backgroundColor: item.subject.ringColor }}
                        >
                          {item.subject.shortCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${readinessChipStyle(
                            item.readinessTone
                          )}`}
                        >
                          {item.readinessLabel}
                        </span>
                      </div>
                      <h3 className="mt-1.5 text-[18px] font-extrabold text-[#260559] truncate">
                        {item.subject.displayLabel}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className="text-[26px] font-bold tabular-nums leading-none"
                        style={{
                          fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                          color: item.subject.textColor,
                        }}
                      >
                        {item.subject.percent}%
                      </div>
                      <div className="mt-1 text-[11.5px] font-bold text-[#6E5C91] tabular-nums">
                        {item.subject.correct}/{item.subject.attempts} right
                      </div>
                    </div>
                  </div>

                  {/* Bar */}
                  <div className="mt-3 w-full h-2.5 rounded-full bg-[#EFE9FA] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.max(item.subject.hasRealData ? 6 : 0, item.subject.percent)}%`,
                        backgroundColor: item.subject.ringColor,
                      }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[12px] font-bold text-[#5A467A]">
                    <span>
                      {item.topics.length > 0
                        ? `${item.topics.length} topic${item.topics.length === 1 ? '' : 's'} tracked`
                        : 'Awaiting first session'}
                    </span>
                    {item.weakTopics.length > 0 ? (
                      <span className="text-[#C2410C] font-extrabold">
                        {item.weakTopics.length} weak topic{item.weakTopics.length === 1 ? '' : 's'}
                      </span>
                    ) : item.subject.hasRealData ? (
                      <span className="text-[#059669] font-extrabold">On track</span>
                    ) : (
                      <span className="text-[#6C19E5] font-extrabold">Tap to inspect</span>
                    )}
                  </div>
                </button>
              );
            })}
          </section>

          {/* RIGHT (7/12): DEEP SABI AI SUBJECT & TOPIC WEAKNESS DIAGNOSTICS */}
          {activeInsight && (
            <section
              className="lg:col-span-7 bg-white rounded-[24px] p-4 sm:p-6 space-y-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              {/* Subject Detail Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F1ECFA]">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase text-white"
                      style={{ backgroundColor: activeInsight.subject.ringColor }}
                    >
                      {activeInsight.subject.shortCode}
                    </span>
                    <span className="text-[12px] font-extrabold uppercase tracking-wider text-[#6E5C91]">
                      SABI AI SUBJECT INSIGHT
                    </span>
                  </div>
                  <h2
                    className="mt-1 text-[24px] sm:text-[28px] font-bold text-[#260559] leading-tight"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    {activeInsight.subject.canonicalName}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        `/practice/setup?pace=smart&scope=single&focus=${encodeURIComponent(
                          activeInsight.subject.canonicalName
                        )}`
                      )
                    }
                    className="px-4 py-2.5 rounded-[14px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[13px] inline-flex items-center gap-1.5 cursor-pointer"
                    style={{ boxShadow: '0 3.5px 0 #46099E' }}
                  >
                    <Zap size={15} className="fill-[#FFE824] text-[#FFE824]" />
                    <span>Drill {activeInsight.subject.displayLabel}</span>
                  </button>
                </div>
              </div>

              {/* SABI AI Diagnostic Summary Box */}
              <div className="rounded-[18px] bg-[#F6F0FF] border-[1.5px] border-[#DFCFFA] p-4">
                <div className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-wider text-[#6C19E5] mb-1.5">
                  <Target size={15} />
                  <span>SABI AUTOMATED ANALYSIS</span>
                </div>
                <p className="text-[14px] sm:text-[14.5px] font-semibold text-[#2E1359] leading-relaxed">
                  {activeInsight.aiSummary}
                </p>
              </div>

              {/* TOPIC-BY-TOPIC ACCURACY BREAKDOWN */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-[16.5px] font-extrabold text-[#260559] flex items-center gap-2">
                    <Layers size={18} className="text-[#6C19E5]" />
                    <span>Topic Performance Breakdown</span>
                  </h3>
                  <span className="text-[12px] font-bold text-[#6E5C91]">
                    Weakest topics listed first
                  </span>
                </div>

                {activeInsight.topics.length === 0 ? (
                  <div className="rounded-[18px] bg-[#FAF7FF] border border-dashed border-[#D8C5FA] p-5 text-center">
                    <BookOpen size={26} className="mx-auto text-[#6C19E5] mb-2" />
                    <p className="text-[14.5px] font-extrabold text-[#260559]">
                      No {activeInsight.subject.displayLabel} topics logged yet
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-[#5A467A] max-w-[400px] mx-auto">
                      Solve a quick single-subject set in {activeInsight.subject.displayLabel} and
                      SABI will break down your exact accuracy per JAMB syllabus topic here.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/practice/setup?pace=smart&scope=single&focus=${encodeURIComponent(
                            activeInsight.subject.canonicalName
                          )}`
                        )
                      }
                      className="mt-3.5 px-5 py-2.5 rounded-[14px] bg-[#6C19E5] text-white font-extrabold text-[13px] inline-flex items-center gap-1.5 cursor-pointer"
                      style={{ boxShadow: '0 3px 0 #46099E' }}
                    >
                      <span>Start {activeInsight.subject.displayLabel} Set</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeInsight.topics.map(topic => {
                      const isWeak = topic.status !== 'strong';
                      const barColor =
                        topic.status === 'critical'
                          ? '#DC2626'
                          : topic.status === 'needs-work'
                          ? '#EA580C'
                          : '#059669';

                      return (
                        <div
                          key={topic.topicLabel}
                          className={`rounded-[16px] p-3.5 border ${
                            topic.status === 'critical'
                              ? 'bg-[#FFF5F5] border-[#FECACA]'
                              : topic.status === 'needs-work'
                              ? 'bg-[#FFF9F2] border-[#FED7AA]'
                              : 'bg-[#F5FDF8] border-[#A7F3D0]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {isWeak ? (
                                <AlertTriangle
                                  size={15}
                                  className="shrink-0"
                                  style={{ color: barColor }}
                                />
                              ) : (
                                <CheckCircle2 size={15} className="text-[#059669] shrink-0" />
                              )}
                              <span className="text-[14.5px] font-extrabold text-[#260559] truncate">
                                {topic.topicLabel}
                              </span>
                            </div>
                            <span
                              className="text-[14.5px] font-extrabold tabular-nums shrink-0"
                              style={{ color: barColor }}
                            >
                              {topic.accuracy}%
                            </span>
                          </div>

                          <div className="w-full h-2 rounded-full bg-black/8 overflow-hidden mb-2">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(5, topic.accuracy)}%`,
                                backgroundColor: barColor,
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[12px] font-bold text-[#5A467A]">
                            <span>
                              {topic.correct}/{topic.solved} correct
                              {topic.missed > 0 ? ` · ${topic.missed} missed` : ''}
                            </span>
                            <span className="font-extrabold" style={{ color: barColor }}>
                              {topic.status === 'critical'
                                ? 'Needs immediate fix'
                                : topic.status === 'needs-work'
                                ? 'Review soon'
                                : 'Mastered'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* RECENT LOGGED MISTAKES IN THIS SUBJECT */}
              {activeInsight.mistakes.length > 0 && (
                <div className="pt-2 border-t border-[#F1ECFA]">
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <h3 className="text-[15.5px] font-extrabold text-[#260559]">
                      Recent Mistakes in {activeInsight.subject.displayLabel} (
                      {activeInsight.mistakes.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate('/mistakes')}
                      className="text-[12.5px] font-extrabold text-[#6C19E5] hover:underline cursor-pointer"
                    >
                      Open Mistakes Vault
                    </button>
                  </div>

                  <div className="space-y-2">
                    {activeInsight.mistakes.slice(0, 3).map(m => (
                      <div
                        key={m.questionId}
                        className="rounded-[14px] bg-[#FFF8F8] border border-[#FECACA] px-3.5 py-2.5"
                      >
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#DC2626]">
                          {m.topicLabel} · Missed {m.missedCount}×
                        </div>
                        <p className="mt-0.5 text-[13.5px] font-bold text-[#260559] line-clamp-2">
                          {m.question}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BOTTOM QUICK ACTION ROW */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/practice/session?pace=smart&mode=daily-failure&focus=${encodeURIComponent(
                        activeInsight.subject.canonicalName
                      )}`
                    )
                  }
                  className="py-3.5 px-4 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[13px] uppercase tracking-wide inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #46099E',
                  }}
                >
                  <span>Fix Weak Topics</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams({
                      subject: activeInsight.subject.canonicalName,
                    });
                    if (activeInsight.primaryWeakTopic) {
                      params.set('topic', activeInsight.primaryWeakTopic);
                    }
                    navigate(`/assistant?${params.toString()}`);
                  }}
                  className="py-3.5 px-4 rounded-[16px] bg-[#2A085E] hover:brightness-110 text-[#FFE824] font-extrabold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  style={{ boxShadow: '0 4px 0 #170338' }}
                >
                  <MessageSquare size={15} />
                  <span>Ask SABI Assistant</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/settings/practice')}
                  className="py-3.5 px-4 rounded-[16px] bg-[#F3EEFD] hover:bg-[#E7DCFA] text-[#260559] font-extrabold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Tune AI Focus</span>
                </button>
              </div>
            </section>
          )}
        </div>
      </main>
    </SabiAppChrome>
  );
}
