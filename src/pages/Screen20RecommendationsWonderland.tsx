import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  ChevronLeft,
  SlidersHorizontal,
  Target,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { getTopicsForSubject } from '../utils/sabiAiPracticeConfig';
import { loadMistakesVault } from '../utils/cbtAndCustomEngine';

/**
 * SCREEN 20 (`/recommendations`): WEAK AREAS & DAILY STUDY RECOMMENDATIONS
 * Evidence-backed priority queue showing where the student can lift mastery fastest.
 */
export function Screen20RecommendationsWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const mistakes = useMemo(() => loadMistakesVault(), []);

  const rankedSubjects = useMemo(
    () => [...data.subjects].sort((a, b) => a.percent - b.percent),
    [data.subjects]
  );

  const studyPlanBlocks = useMemo(() => {
    const weakest = rankedSubjects[0];
    const second = rankedSubjects[1] || rankedSubjects[0];
    const strongest = rankedSubjects[rankedSubjects.length - 1] || rankedSubjects[0];

    return [
      {
        id: 'block-1',
        tag: 'PRIORITY #1 · SMART PRACTICE',
        title: `${weakest.displayLabel}: ${getTopicsForSubject(weakest.canonicalName)[0]}`,
        evidence: `Current mastery estimate ${weakest.percent}% — biggest score gain opportunity`,
        minutes: 10,
        path: `/practice/session?pace=smart&focus=${encodeURIComponent(weakest.canonicalName)}`,
        cta: 'Start Smart Practice',
      },
      {
        id: 'block-2',
        tag: 'PRIORITY #2 · BLITZ RETENTION',
        title: `${second.displayLabel}: ${getTopicsForSubject(second.canonicalName)[1] || getTopicsForSubject(second.canonicalName)[0]}`,
        evidence: `Mastery ${second.percent}% — rapid-fire recall locks in speed and accuracy`,
        minutes: 8,
        path: `/practice/session?pace=blitz&focus=${encodeURIComponent(second.canonicalName)}`,
        cta: 'Start Blitz',
      },
      {
        id: 'block-3',
        tag: 'KEEP SHARP · MAINTENANCE',
        title: `${strongest.displayLabel}: Mixed Syllabus Warmup`,
        evidence: `Strongest subject (${strongest.percent}%) — 5 quick questions keep it fresh`,
        minutes: 5,
        path: `/practice/session?pace=blitz&focus=${encodeURIComponent(strongest.canonicalName)}`,
        cta: 'Quick Warmup',
      },
    ];
  }, [rankedSubjects]);

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 pb-6">
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.7} />
            </button>
            <div className="min-w-0">
              <h1
                className="text-[26px] sm:text-[32px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                Weak Areas & Study Plan
              </h1>
              <p className="text-[13.5px] font-semibold text-[#3C2263]">
                Evidence-based priorities that recalculate as you practise.
              </p>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT (7/12): Today's Recalculating Study Plan */}
          <div className="md:col-span-7 space-y-3.5">
            <section
              className="rounded-[24px] bg-[#2A085E] p-4 sm:p-5 text-white flex items-center justify-between gap-3"
              style={{ boxShadow: '0 5px 0 #170338' }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-[15px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
                  <Target size={24} strokeWidth={2.5} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFE51E]">
                    TODAY’S STUDY QUEUE (~23 MIN)
                  </div>
                  <div className="text-[16.5px] sm:text-[18px] font-extrabold text-white truncate">
                    Focus on {rankedSubjects[0].displayLabel} & {rankedSubjects[1]?.displayLabel}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/settings/practice')}
                className="px-3.5 py-2 rounded-[13px] bg-white/14 hover:bg-white/22 text-[#FFE51E] text-[12px] font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <SlidersHorizontal size={14} />
                <span>Tune AI</span>
              </button>
            </section>

            {studyPlanBlocks.map(block => (
              <section
                key={block.id}
                className="bg-white rounded-[22px] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#EFE6FF] text-[#6C19E5] text-[10.5px] font-extrabold uppercase tracking-wider">
                      {block.tag}
                    </span>
                    <span className="text-[12px] font-bold text-[#6E5C91]">
                      ~{block.minutes} min
                    </span>
                  </div>
                  <h2 className="text-[17px] sm:text-[18px] font-extrabold text-[#260559]">
                    {block.title}
                  </h2>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#5A467A]">
                    {block.evidence}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(block.path)}
                  className="px-5 py-3 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[14px] uppercase tracking-wide inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #46099E',
                  }}
                >
                  <span>{block.cta}</span>
                  <ArrowRight size={16} />
                </button>
              </section>
            ))}
          </div>

          {/* RIGHT (5/12): Subject Weakness Ladder + Mistakes Link */}
          <div className="md:col-span-5 space-y-4">
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between mb-3.5">
                <h2 className="text-[17px] font-extrabold text-[#260559]">
                  Weakness Priority Order
                </h2>
                <span className="text-[11.5px] font-bold text-[#6E5C91]">
                  Lowest first
                </span>
              </div>

              <div className="space-y-3">
                {rankedSubjects.map((subj, idx) => (
                  <div key={subj.canonicalName} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[14px] font-extrabold text-[#260559]">
                      <span className="flex items-center gap-2">
                        {idx === 0 && (
                          <AlertTriangle size={15} className="text-[#EA580C] shrink-0" />
                        )}
                        {subj.displayLabel}
                      </span>
                      <span className="tabular-nums" style={{ color: subj.textColor }}>
                        {subj.percent}%
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#F1ECFA] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${subj.percent}%`, backgroundColor: subj.ringColor }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="bg-white rounded-[22px] p-4 sm:p-5 flex items-center justify-between gap-3"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div>
                <div className="flex items-center gap-1.5 text-[12px] font-extrabold text-[#6C19E5] uppercase">
                  <Bookmark size={14} />
                  <span>Mistakes Vault</span>
                </div>
                <div className="mt-0.5 text-[16px] font-extrabold text-[#260559]">
                  {mistakes.length} missed question{mistakes.length === 1 ? '' : 's'} logged
                </div>
                <p className="text-[12.5px] font-semibold text-[#5A467A]">
                  Review and re-drill questions you missed earlier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/mistakes')}
                className="px-4 py-2.5 rounded-[14px] bg-[#FFE824] text-[#260559] font-extrabold text-[13px] inline-flex items-center gap-1 shrink-0 cursor-pointer"
                style={{ boxShadow: '0 3px 0 #D6B500' }}
              >
                <Zap size={14} className="text-[#6C19E5] fill-[#6C19E5]" />
                <span>Open</span>
              </button>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
