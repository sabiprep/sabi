import React, { useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { SabiBrandEmblem } from '../components/common/SabiBrandEmblem';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  loadLastSmartPracticeResult,
  type SmartPracticeSessionResult,
} from '../utils/smartPracticeSession';
import { sound } from '../utils/soundEffects';

/**
 * SCREEN 9 (`/practice/results`): SMART PRACTICE RESULTS
 * Built 1:1 from Uploaded Image `06___Smart_Practice_results_092c4802.png`.
 * Full-bleed responsive mobile/Android APK layout expanding cleanly into a wide
 * 2-column desktop workspace on `md:` upwards with zero frame-in-frame margins.
 */
export function Screen9SmartPracticeResultsWonderland() {
  const navigate = useNavigate();
  const location = useLocation();
  const student = useMemo(() => getWonderlandDashboardState(), []);

  const result: SmartPracticeSessionResult = useMemo(() => {
    const navState = location.state as { result?: SmartPracticeSessionResult } | null;
    if (navState?.result) return navState.result;
    return loadLastSmartPracticeResult(student.firstName);
  }, [location.state, student.firstName]);

  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFE824' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }
  }, []);

  const handleStartGuidedNext = () => {
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }
    navigate(
      `/practice/session?pace=smart&focus=${encodeURIComponent(
        result.nextBestStep.subjectCanonical
      )}`
    );
  };

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#F5F2FF] text-[#260559] flex flex-col select-none pt-[env(safe-area-inset-top,0px)] pb-[max(env(safe-area-inset-bottom,0px),20px)]"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Top Curved SABI Yellow Hero Backdrop (Matches Screen 06 two-tone split) */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[320px] sm:h-[340px] rounded-b-[38px] z-0"
        style={{
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE51E 100%)',
        }}
        aria-hidden="true"
      />

      <main className="relative z-10 w-full max-w-[1140px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-3.5 sm:pt-6 flex-1 flex flex-col">
        {/* 1. TOP BAR: Close X + Mode Dark Purple Pill */}
        <header className="flex items-center gap-3 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Back to Home"
            className="w-[46px] h-[46px] rounded-[15px] bg-white text-[#260559] flex items-center justify-center transition-transform active:translate-y-[1.5px] cursor-pointer shrink-0"
            style={{ boxShadow: '0 3.5px 0 #E2C700' }}
          >
            <X size={21} strokeWidth={2.7} />
          </button>

          <div className="px-4 py-2 rounded-full bg-[#2A085E] text-[#FFE51E] font-extrabold text-[14px] sm:text-[15px] whitespace-nowrap">
            Practice Hub · {result.pace === 'blitz' ? 'Blitz' : 'Smart Practice'}
          </div>
        </header>

        {/* 2. HERO HEADING & SESSION SUMMARY META */}
        <section className="mb-5">
          <h1
            className="text-[31px] sm:text-[38px] font-bold text-[#260559] leading-[1.12] tracking-[-0.01em]"
            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
          >
            {result.totalQuestions > 0
              ? `You did well, ${result.firstName}!`
              : `Ready to start, ${result.firstName}?`}
          </h1>
          <p className="mt-1.5 text-[14.5px] sm:text-[16px] font-semibold text-[#3B2264]">
            {result.durationMinutes} minute{result.durationMinutes === 1 ? '' : 's'} ·{' '}
            {result.totalQuestions} question{result.totalQuestions === 1 ? '' : 's'} ·{' '}
            {result.subjectsCount} subject{result.subjectsCount === 1 ? '' : 's'}
          </p>
        </section>

        {/* 3. 3-COLUMN SUMMARY METRIC CARD */}
        <section
          className="bg-white rounded-[24px] py-5 sm:py-6 px-3 grid grid-cols-3 divide-x divide-[#EFEAF9] mb-4 sm:mb-5"
          style={{ boxShadow: '0 5px 0 #DDD2FA' }}
        >
          <div className="text-center px-2">
            <div
              className="text-[28px] sm:text-[34px] font-bold text-[#059669] leading-none tabular-nums"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {result.accuracyPercent}%
            </div>
            <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-[#5A467A]">
              Accuracy
            </div>
          </div>

          <div className="text-center px-2">
            <div
              className="text-[28px] sm:text-[34px] font-bold text-[#6C19E5] leading-none tabular-nums"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              +{result.totalXp}
            </div>
            <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-[#5A467A]">XP</div>
          </div>

          <div className="text-center px-2">
            <div
              className="text-[28px] sm:text-[34px] font-bold text-[#C2410C] leading-none tabular-nums"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {result.bestStreak}
            </div>
            <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-[#5A467A]">
              Best streak
            </div>
          </div>
        </section>

        {/* 4. RESPONSIVE LOWER SECTION: 1-Col Mobile, 2-Col Tablet/Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT (6/12 on Desktop): TOPICS YOU TOUCHED */}
          <section
            className="md:col-span-6 bg-white rounded-[24px] p-5 sm:p-6"
            style={{ boxShadow: '0 4px 18px rgba(38, 5, 89, 0.06)' }}
          >
            <h2 className="text-[18px] sm:text-[19px] font-extrabold text-[#260559] mb-4">
              Topics you touched
            </h2>

            <div className="space-y-3.5">
              {result.topics.length === 0 && (
                <p className="text-[14px] font-semibold text-[#5A467A] leading-relaxed">
                  Finish your first Blitz or Smart Practice run to see your topic-by-topic accuracy
                  breakdown here.
                </p>
              )}
              {result.topics.map(row => {
                const isStrong = row.accuracy >= 60;
                return (
                  <div
                    key={`${row.subjectCanonical}-${row.topicLabel}`}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          isStrong ? 'bg-[#10B968]' : 'bg-[#FF7A00]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="text-[15px] sm:text-[16px] font-extrabold text-[#260559] truncate">
                        {row.subjectLabel} · {row.topicLabel}
                      </span>
                    </div>

                    <span
                      className={`text-[15px] font-extrabold tabular-nums whitespace-nowrap shrink-0 ${
                        isStrong ? 'text-[#059669]' : 'text-[#C2410C]'
                      }`}
                    >
                      {row.correct} of {row.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* RIGHT (6/12 on Desktop): YOUR COACH SAYS + NEXT BEST STEP */}
          <div className="md:col-span-6 space-y-4">
            {/* YOUR COACH SAYS */}
            <section
              className="rounded-[24px] bg-[#3B0D91] p-5 sm:p-6 text-white flex items-start gap-4"
              style={{ boxShadow: '0 5px 0 #23055B' }}
            >
              <div className="w-[46px] h-[46px] rounded-[14px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0 mt-0.5">
                <SabiBrandEmblem size={24} />
              </div>
              <div className="min-w-0">
                <div className="text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-[#FFE51E]">
                  YOUR COACH SAYS
                </div>
                <p className="mt-1.5 text-[14.5px] sm:text-[15.5px] font-semibold text-white leading-[1.45]">
                  {result.coachMessage}
                </p>
              </div>
            </section>

            {/* NEXT BEST STEP */}
            <section className="rounded-[24px] bg-white border-[2.5px] border-[#711AE3] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#6C19E5]">
                  NEXT BEST STEP
                </span>
                <span className="text-[13px] font-bold text-[#5A467A] tabular-nums">
                  ~{result.nextBestStep.estimatedMinutes} min
                </span>
              </div>

              <h2 className="text-[19px] sm:text-[21px] font-extrabold text-[#260559] leading-snug mb-4">
                {result.nextBestStep.subjectLabel} · {result.nextBestStep.topicLabel}
              </h2>

              <button
                type="button"
                onClick={handleStartGuidedNext}
                className="w-full py-4 px-6 rounded-[18px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[17px] sm:text-[18px] tracking-[0.04em] uppercase transition-transform duration-100 active:translate-y-[2px] cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 5px 0 #46099E',
                }}
              >
                START SMART PRACTICE
              </button>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
