import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Flame,
  Layers,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  loadSavedPracticeScope,
  savePracticeScopePref,
  type PracticeScope,
} from '../utils/smartPracticeSession';
import { sound } from '../utils/soundEffects';

/**
 * SCREEN 6B (`/practice/setup`): PRE-SESSION SUBJECT SCOPE SETUP
 * Dedicated settings screen for both Smart Practice and Blitz where candidates choose:
 *  - Merge all 4 subjects together (interleaved multi-subject session), OR
 *  - One subject at a time (select which single subject to drill exclusively before starting).
 */
export function Screen6bPracticeScopeSetupWonderland() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const data = useMemo(() => getWonderlandDashboardState(), []);

  const rawPace = searchParams.get('pace');
  const [pace, setPace] = useState<'smart' | 'blitz'>(
    rawPace === 'blitz' ? 'blitz' : 'smart'
  );

  const rawScope = searchParams.get('scope');
  const [scope, setScope] = useState<PracticeScope>(() =>
    rawScope === 'single' || rawScope === 'merged'
      ? rawScope
      : loadSavedPracticeScope()
  );

  const initialFocus = searchParams.get('focus') || data.recommendedSubjectCanonical;
  const matchedInitial =
    data.subjects.find(
      s =>
        s.canonicalName.toLowerCase() === initialFocus.toLowerCase() ||
        s.displayLabel.toLowerCase() === initialFocus.toLowerCase()
    ) || data.subjects[0];

  const [selectedSubject, setSelectedSubject] = useState<string>(
    matchedInitial.canonicalName
  );

  const activeSubjectObj =
    data.subjects.find(s => s.canonicalName === selectedSubject) || data.subjects[0];

  const handleSelectScope = (next: PracticeScope) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setScope(next);
    savePracticeScopePref(next);
  };

  const handleSelectSubject = (canonical: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setSelectedSubject(canonical);
    if (scope !== 'single') {
      setScope('single');
      savePracticeScopePref('single');
    }
  };

  const handleLaunchSession = () => {
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }
    savePracticeScopePref(scope);
    const params = new URLSearchParams({
      pace,
      scope,
      focus: activeSubjectObj.canonicalName,
    });
    navigate(`/practice/session?${params.toString()}`);
  };

  return (
    <SabiAppChrome
      activeTab="practice"
      backdropVariant="practice"
      hideMobileBottomNav
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1120px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-3 sm:pt-5 lg:pt-7 pb-3 flex-1 flex flex-col">
        {/* 1. TOP BAR: Back + Streak + 3-Dash Menu */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={() => navigate(`/practice?pace=${pace}`)}
            aria-label="Back to Practice Hub"
            className="w-[46px] h-[46px] rounded-[15px] bg-white text-[#29065E] flex items-center justify-center transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer shrink-0"
            style={{ boxShadow: '0 3.5px 0 #E2C700' }}
          >
            <ChevronLeft size={23} strokeWidth={2.8} />
          </button>

          {/* Compact Pace Switcher Pill */}
          <div className="p-1 rounded-full bg-[#2A085E] flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPace('smart')}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] sm:text-[13px] font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                pace === 'smart'
                  ? 'bg-[#FFE824] text-[#260559]'
                  : 'text-[#DCD0F5] hover:text-white'
              }`}
            >
              <TrendingUp size={14} strokeWidth={2.6} />
              <span>Smart Practice</span>
            </button>
            <button
              type="button"
              onClick={() => setPace('blitz')}
              className={`px-3.5 py-1.5 rounded-full text-[12.5px] sm:text-[13px] font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                pace === 'blitz'
                  ? 'bg-[#FFE824] text-[#260559]'
                  : 'text-[#DCD0F5] hover:text-white'
              }`}
            >
              <Zap size={14} className={pace === 'blitz' ? 'fill-[#6C19E5] text-[#6C19E5]' : ''} />
              <span>Blitz</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/progress')}
              aria-label={`${data.streakDays} day streak`}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white text-[#260559] font-extrabold text-[14.5px] tabular-nums cursor-pointer"
              style={{ boxShadow: '0 3.5px 0 #E2C700' }}
            >
              <Flame size={16} className="text-[#FF7A00] fill-[#FF7A00]" />
              <span>{data.streakDays}</span>
            </button>
            <SabiMenuTriggerButton />
          </div>
        </header>

        {/* 2. HERO TITLE */}
        <section className="mb-4 sm:mb-5">
          <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#4E1B9E] mb-1">
            PRACTICE HUB · SESSION SETUP
          </div>
          <h1
            className="text-[28px] sm:text-[34px] font-bold text-[#260559] leading-[1.12] tracking-[-0.01em]"
            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
          >
            How do you want to practise?
          </h1>
          <p className="mt-1.5 text-[14.5px] sm:text-[16px] font-semibold text-[#2E1359] leading-snug">
            Merge all 4 JAMB subjects together or focus deeply on one subject at a time.
          </p>
        </section>

        {/* 3. MERGE ALL vs ONE SUBJECT AT A TIME SELECTOR */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Option 1: Merge All 4 Subjects */}
          <button
            type="button"
            onClick={() => handleSelectScope('merged')}
            aria-pressed={scope === 'merged'}
            className={`relative w-full text-left rounded-[22px] bg-white p-4 sm:p-5 flex items-start gap-3.5 transition-all cursor-pointer ${
              scope === 'merged'
                ? 'border-[2.5px] border-[#6C19E5]'
                : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
            }`}
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="w-[50px] h-[50px] rounded-[16px] bg-[#EFE7FF] text-[#6C19E5] flex items-center justify-center shrink-0 mt-0.5">
              <Layers size={24} strokeWidth={2.4} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[18px] sm:text-[19.5px] font-extrabold text-[#260559] leading-tight">
                Merge all 4 subjects
              </div>
              <p className="mt-1 text-[13.5px] font-semibold text-[#4F3B73] leading-snug">
                Rotates across {data.subjects.map(s => s.displayLabel).join(', ')} in one seamless
                run to build real UTME switching stamina.
              </p>
            </div>

            <div
              className={`w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 mt-1 ${
                scope === 'merged'
                  ? 'bg-[#6C19E5] text-white'
                  : 'border-[2.5px] border-[#6C19E5]'
              }`}
            >
              {scope === 'merged' && <Check size={16} strokeWidth={3} />}
            </div>
          </button>

          {/* Option 2: One Subject at a Time */}
          <button
            type="button"
            onClick={() => handleSelectScope('single')}
            aria-pressed={scope === 'single'}
            className={`relative w-full text-left rounded-[22px] bg-white p-4 sm:p-5 flex items-start gap-3.5 transition-all cursor-pointer ${
              scope === 'single'
                ? 'border-[2.5px] border-[#6C19E5]'
                : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
            }`}
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="w-[50px] h-[50px] rounded-[16px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen size={24} strokeWidth={2.4} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-[18px] sm:text-[19.5px] font-extrabold text-[#260559] leading-tight">
                One subject at a time
              </div>
              <p className="mt-1 text-[13.5px] font-semibold text-[#4F3B73] leading-snug">
                100% pure focus on one subject you pick below — zero subject switching until you
                finish.
              </p>
            </div>

            <div
              className={`w-[28px] h-[28px] rounded-full flex items-center justify-center shrink-0 mt-1 ${
                scope === 'single'
                  ? 'bg-[#6C19E5] text-white'
                  : 'border-[2.5px] border-[#6C19E5]'
              }`}
            >
              {scope === 'single' && <Check size={16} strokeWidth={3} />}
            </div>
          </button>
        </section>

        {/* 4. SUBJECT PICKER PANEL (Highlighted for Single Subject, Priority Anchor for Merged) */}
        <section
          className="bg-white rounded-[24px] p-4 sm:p-5 mb-5"
          style={{ boxShadow: '0 4px 0 #E2C700' }}
        >
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <div>
              <h2 className="text-[16.5px] sm:text-[18px] font-extrabold text-[#260559]">
                {scope === 'single'
                  ? 'Pick your subject for this session'
                  : 'Lead subject in your 4-subject mix'}
              </h2>
              <p className="text-[12.5px] font-semibold text-[#5A467A]">
                {scope === 'single'
                  ? 'Every question in this run will come exclusively from your chosen subject.'
                  : 'SABI opens with this subject and weaves in your other 3 JAMB subjects.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {data.subjects.map(subj => {
              const isPicked = subj.canonicalName === activeSubjectObj.canonicalName;
              return (
                <button
                  key={subj.canonicalName}
                  type="button"
                  onClick={() => {
                    try {
                      sound.playTap();
                    } catch {
                      // ignore
                    }
                    if (scope === 'single') {
                      handleSelectSubject(subj.canonicalName);
                    } else {
                      setSelectedSubject(subj.canonicalName);
                    }
                  }}
                  aria-pressed={isPicked}
                  className={`rounded-[18px] p-3.5 text-left transition-all cursor-pointer flex flex-col justify-between min-h-[96px] ${
                    isPicked
                      ? 'bg-[#2A085E] text-white ring-2 ring-[#6C19E5]'
                      : 'bg-[#F8F5FF] hover:bg-[#EFE6FF] text-[#260559] border border-[#E7DCFA]'
                  }`}
                  style={isPicked ? { boxShadow: '0 4px 0 #170338' } : undefined}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider ${
                        isPicked
                          ? 'bg-[#FFE824] text-[#260559]'
                          : 'bg-white text-[#6C19E5]'
                      }`}
                    >
                      {subj.shortCode}
                    </span>
                    <span
                      className={`text-[13px] font-extrabold tabular-nums ${
                        isPicked ? 'text-[#FFE824]' : ''
                      }`}
                      style={!isPicked ? { color: subj.textColor } : undefined}
                    >
                      {subj.percent}%
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-[14.5px] font-extrabold leading-tight truncate">
                      {subj.displayLabel}
                    </div>
                    <div
                      className={`mt-0.5 text-[11.5px] font-semibold ${
                        isPicked ? 'text-[#D8C6FA]' : 'text-[#6E5C91]'
                      }`}
                    >
                      {subj.attempts > 0
                        ? `${subj.attempts} solved`
                        : 'Not attempted yet'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* 5. BOTTOM LAUNCH CTA */}
        <footer className="mt-auto pt-2 pb-1">
          <button
            type="button"
            onClick={handleLaunchSession}
            className="w-full md:max-w-[540px] md:mx-auto py-4 px-6 rounded-[22px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[18px] sm:text-[19px] tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 transition-transform duration-100 active:translate-y-[2px] cursor-pointer"
            style={{
              fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 5px 0 #46099E',
            }}
          >
            {pace === 'blitz' && (
              <Zap size={20} className="text-[#FFE51E] fill-[#FFE51E] shrink-0" />
            )}
            <span>
              {pace === 'blitz' ? 'START BLITZ' : 'START SMART PRACTICE'} ·{' '}
              {scope === 'single' ? activeSubjectObj.displayLabel : 'ALL 4 SUBJECTS'}
            </span>
            <ArrowRight size={20} strokeWidth={2.7} />
          </button>

          <p className="mt-2.5 text-center text-[12.5px] sm:text-[13px] font-semibold text-[#3B2264]">
            {scope === 'single'
              ? `Focused exclusively on ${activeSubjectObj.displayLabel}. Switch anytime from Practice Hub.`
              : `Mixing all 4 JAMB subjects with ${activeSubjectObj.displayLabel} leading first.`}
          </p>
        </footer>
      </main>
    </SabiAppChrome>
  );
}
