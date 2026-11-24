import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Flame, TrendingUp, X, Zap } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SabiAppChrome } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { sound } from '../utils/soundEffects';

type PracticePace = 'guided' | 'blitz';

/**
 * Concentric Target Icon inside the yellow focus tile
 */
function FocusTargetIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="10.5" stroke="#260559" strokeWidth="2.6" />
      <circle cx="14" cy="14" r="6" stroke="#260559" strokeWidth="2.4" />
      <circle cx="14" cy="14" r="2.3" fill="#260559" />
    </svg>
  );
}

/**
 * SCREEN 6 (`/practice`): SMART PRACTICE HUB (GUIDED SESSION & BLITZ DIRECTORY)
 * Built 1:1 from Uploaded Image `02___Smart_Practice_hub__Blitz_now_inside__bd8fd500.png`
 * with full desktop responsiveness and zero dead interactions.
 */
export function Screen6SmartPracticeHubWonderland() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const data = useMemo(() => getWonderlandDashboardState(), []);

  const initialPace: PracticePace =
    searchParams.get('pace') === 'guided' ? 'guided' : 'blitz';
  const [selectedPace, setSelectedPace] = useState<PracticePace>(initialPace);

  const initialFocus = searchParams.get('focus') || data.recommendedSubject;
  const matchedInitialSubject =
    data.subjects.find(
      s =>
        s.canonicalName.toLowerCase() === initialFocus.toLowerCase() ||
        s.displayLabel.toLowerCase() === initialFocus.toLowerCase()
    ) || data.subjects[data.subjects.length - 1];

  const [focusCanonical, setFocusCanonical] = useState<string>(
    matchedInitialSubject.canonicalName
  );
  const [launchNoticeOpen, setLaunchNoticeOpen] = useState(false);

  useEffect(() => {
    const paceParam = searchParams.get('pace');
    if (paceParam === 'guided' || paceParam === 'blitz') {
      setSelectedPace(paceParam);
    }
  }, [searchParams]);

  const activeFocusSubject =
    data.subjects.find(s => s.canonicalName === focusCanonical) ||
    data.subjects[data.subjects.length - 1];

  const focusTopicLabel =
    activeFocusSubject.displayLabel === data.recommendedSubject
      ? data.recommendedTopic
      : 'Core syllabus priority set';

  const handleSelectPace = (pace: PracticePace) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setSelectedPace(pace);
  };

  const handleSelectSubject = (canonicalName: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setFocusCanonical(canonicalName);
  };

  const handleStartPractice = () => {
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }
    setLaunchNoticeOpen(true);
  };

  return (
    <SabiAppChrome
      activeTab="practice"
      backdropVariant="practice"
      hideMobileBottomNav
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[440px] lg:max-w-[920px] mx-auto px-5 sm:px-6 lg:px-9 pt-4 sm:pt-6 lg:pt-8 flex-1 flex flex-col">
        {/* 1. TOP BAR: Back Square Button + Streak Chip */}
        <header className="flex items-center justify-between mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => navigate('/home')}
            aria-label="Back to Home"
            className="w-[46px] h-[46px] rounded-[15px] bg-white text-[#29065E] flex items-center justify-center transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer"
            style={{ boxShadow: '0 3.5px 0 #E2C700' }}
          >
            <ChevronLeft size={23} strokeWidth={2.8} />
          </button>

          <button
            type="button"
            onClick={() => navigate('/progress')}
            aria-label={`${data.streakDays} day streak`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#260559] font-extrabold text-[15px] tabular-nums transition-transform active:translate-y-[1px] cursor-pointer"
            style={{ boxShadow: '0 3.5px 0 #E2C700' }}
          >
            <Flame size={17} className="text-[#FF7A00] fill-[#FF7A00] shrink-0" />
            <span>{data.streakDays}</span>
          </button>
        </header>

        {/* 2. HERO TITLE & SUBTITLE */}
        <section className="mb-5">
          <h1
            className="text-[31px] sm:text-[34px] font-bold text-[#260559] leading-[1.12] tracking-[-0.01em]"
            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
          >
            Smart Practice
          </h1>
          <p className="mt-1.5 text-[15px] sm:text-[16px] font-semibold text-[#2E1359] leading-[1.4] max-w-[540px]">
            SABI don pick your next questions. You just pick the pace.
          </p>
        </section>

        {/* 3. FOCUS RIGHT NOW BANNER CARD */}
        <section
          className="rounded-[24px] bg-[#3B0D91] px-4 py-4 sm:px-5 sm:py-5 text-white flex items-center gap-4 mb-5"
          style={{ boxShadow: '0 5px 0 #23055B' }}
        >
          <div className="w-[50px] h-[50px] rounded-[16px] bg-[#FFE824] flex items-center justify-center shrink-0">
            <FocusTargetIcon />
          </div>
          <div className="min-w-0">
            <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#FFE51E]">
              FOCUS RIGHT NOW
            </div>
            <h2 className="mt-0.5 text-[17px] sm:text-[18.5px] font-extrabold text-white leading-snug">
              {activeFocusSubject.displayLabel} · {focusTopicLabel}
            </h2>
            <p className="mt-0.5 text-[13px] sm:text-[13.5px] font-medium text-[#D9C7FA] leading-snug">
              Mixed with your other 3 subjects to keep things fresh
            </p>
          </div>
        </section>

        {/* 4. CHOOSE YOUR PACE */}
        <section className="mb-5">
          <div className="text-[13px] font-extrabold uppercase tracking-[0.06em] text-[#351766] mb-3">
            CHOOSE YOUR PACE
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* OPTION A: GUIDED SESSION */}
            <button
              type="button"
              onClick={() => handleSelectPace('guided')}
              aria-pressed={selectedPace === 'guided'}
              className={`relative w-full text-left rounded-[22px] bg-white px-4 py-4 sm:px-5 sm:py-5 flex items-start gap-3.5 transition-all duration-150 active:translate-y-[1px] cursor-pointer ${
                selectedPace === 'guided'
                  ? 'border-[2.5px] border-[#6C19E5]'
                  : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
              }`}
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="w-[50px] h-[50px] rounded-[16px] bg-[#EFE7FF] text-[#6C19E5] flex items-center justify-center shrink-0 mt-0.5">
                <TrendingUp size={24} strokeWidth={2.5} />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[18px] sm:text-[19px] font-extrabold text-[#260559] leading-tight">
                  Guided session
                </div>
                <p className="mt-1.5 text-[13.5px] sm:text-[14px] font-medium text-[#4F3B73] leading-[1.45]">
                  A focused set that adapts as you answer, with full step-by-step explanations.
                  Ends when you’ve made progress.
                </p>
              </div>

              {/* Radio / Check Indicator */}
              <div
                className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors ${
                  selectedPace === 'guided'
                    ? 'bg-[#6C19E5] text-white'
                    : 'border-[2.5px] border-[#6C19E5] bg-transparent'
                }`}
              >
                {selectedPace === 'guided' && <Check size={17} strokeWidth={3} />}
              </div>
            </button>

            {/* OPTION B: BLITZ (With floating MOST LOVED pill badge) */}
            <button
              type="button"
              onClick={() => handleSelectPace('blitz')}
              aria-pressed={selectedPace === 'blitz'}
              className={`relative w-full text-left rounded-[22px] bg-white px-4 py-4 sm:px-5 sm:py-5 flex items-start gap-3.5 transition-all duration-150 active:translate-y-[1px] cursor-pointer ${
                selectedPace === 'blitz'
                  ? 'border-[2.5px] border-[#6C19E5]'
                  : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
              }`}
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              {/* Floating MOST LOVED Badge Perched on Top-Right Edge */}
              <span className="absolute -top-3 right-4 px-3 py-1 rounded-full bg-[#FF7A00] text-white text-[10.5px] font-extrabold uppercase tracking-[0.05em] shadow-xs whitespace-nowrap">
                MOST LOVED
              </span>

              <div className="w-[50px] h-[50px] rounded-[16px] bg-[#FFE824] text-[#6C19E5] flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={25} className="text-[#6C19E5] fill-[#6C19E5]" />
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="text-[18px] sm:text-[19px] font-extrabold text-[#260559] leading-tight">
                  Blitz
                </div>
                <p className="mt-1.5 text-[13.5px] sm:text-[14px] font-medium text-[#4F3B73] leading-[1.45]">
                  Rapid-fire feed. No setup, no timer. Swipe up for the next one, stop whenever
                  you like.
                </p>
              </div>

              {/* Radio / Check Indicator */}
              <div
                className={`w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 mt-1 transition-colors ${
                  selectedPace === 'blitz'
                    ? 'bg-[#6C19E5] text-white'
                    : 'border-[2.5px] border-[#6C19E5] bg-transparent'
                }`}
              >
                {selectedPace === 'blitz' && <Check size={17} strokeWidth={3} />}
              </div>
            </button>
          </div>
        </section>

        {/* 5. SUBJECT MIX CHIPS ROW */}
        <section className="flex flex-wrap items-center gap-2.5 mb-7">
          {data.subjects.map(subj => {
            const isFocus = subj.canonicalName === activeFocusSubject.canonicalName;
            return (
              <button
                key={subj.canonicalName}
                type="button"
                onClick={() => handleSelectSubject(subj.canonicalName)}
                className={`px-4 py-2 rounded-full text-[13.5px] font-extrabold transition-transform duration-100 active:translate-y-[1px] cursor-pointer whitespace-nowrap ${
                  isFocus
                    ? 'bg-[#2A085E] text-[#FFE51E]'
                    : 'bg-white text-[#260559] hover:bg-[#FFFDF5]'
                }`}
                style={{
                  boxShadow: isFocus ? '0 3px 0 #170338' : '0 3px 0 #E2C700',
                }}
              >
                {isFocus ? `${subj.displayLabel} · focus` : subj.displayLabel}
              </button>
            );
          })}
        </section>

        {/* 6. BOTTOM PRIMARY CTA + REASSURANCE CAPTION */}
        <footer className="mt-auto pt-2 pb-1">
          <button
            type="button"
            onClick={handleStartPractice}
            className="w-full py-4 sm:py-4.5 px-6 rounded-[22px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[18px] sm:text-[19px] tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 transition-transform duration-100 active:translate-y-[2px] cursor-pointer"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 5px 0 #46099E',
            }}
          >
            {selectedPace === 'blitz' && (
              <Zap size={20} className="text-[#FFE51E] fill-[#FFE51E] shrink-0" />
            )}
            <span>{selectedPace === 'blitz' ? 'START BLITZ' : 'START GUIDED SESSION'}</span>
          </button>

          <p className="mt-3 text-center text-[13px] sm:text-[13.5px] font-semibold text-[#3B2264] leading-snug max-w-[360px] mx-auto">
            Both paces feed the same mastery estimate and keep your streak going.
          </p>
        </footer>
      </main>

      {/* ================================================================= */}
      {/* IN-APP SESSION PREVIEW MODAL (Until Next Screen Batch Arrives)    */}
      {/* ================================================================= */}
      {launchNoticeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Practice session launch preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A043D]/60 backdrop-blur-xs px-5"
          onClick={() => setLaunchNoticeOpen(false)}
        >
          <div
            className="w-full max-w-[390px] rounded-[26px] bg-white p-5 sm:p-6 text-[#260559]"
            style={{ boxShadow: '0 8px 0 #E2C700, 0 20px 40px rgba(26, 4, 61, 0.35)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-[14px] bg-[#FFE824] flex items-center justify-center">
                  <Zap size={20} className="text-[#6C19E5] fill-[#6C19E5]" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6C19E5]">
                    {selectedPace === 'blitz' ? 'BLITZ READY' : 'GUIDED SESSION READY'}
                  </div>
                  <h3 className="text-[18px] font-extrabold text-[#260559] leading-tight">
                    {activeFocusSubject.displayLabel}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLaunchNoticeOpen(false)}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full bg-[#F3EEFD] text-[#260559] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[14px] font-medium text-[#4F3B73] leading-relaxed mb-5">
              Your <strong>{selectedPace === 'blitz' ? 'Blitz rapid-fire feed' : 'Guided adaptive set'}</strong>{' '}
              for <strong>{activeFocusSubject.displayLabel}</strong> is configured. Upload the
              Question / Blitz screens in the next batch and we will wire this button straight into
              the live feed.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setLaunchNoticeOpen(false)}
                className="flex-1 py-3 rounded-[16px] bg-[#6C19E5] text-white font-extrabold text-[14px] uppercase tracking-wide cursor-pointer"
                style={{ boxShadow: '0 4px 0 #46099E' }}
              >
                Got it
              </button>
              <button
                type="button"
                onClick={() => {
                  setLaunchNoticeOpen(false);
                  navigate('/home');
                }}
                className="px-4 py-3 rounded-[16px] bg-[#F3EEFD] text-[#260559] font-extrabold text-[14px] cursor-pointer"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      )}
    </SabiAppChrome>
  );
}
