import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calculator,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Grid2X2,
  Send,
  X,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  buildCbtMockDeck,
  gradeCbtExam,
  type CbtMockPreset,
  type CbtSourceMode,
} from '../utils/cbtAndCustomEngine';
import { sound } from '../utils/soundEffects';

const OPTION_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const hrs = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = clamped % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Simple Official-Style JAMB On-Screen Basic Calculator (No scientific/AI assist)
 */
function JambBasicCalculator({ onClose }: { onClose: () => void }) {
  const [display, setDisplay] = useState('0');
  const [storedValue, setStoredValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [resetNext, setResetNext] = useState(false);

  const inputDigit = (digit: string) => {
    if (resetNext || display === '0') {
      setDisplay(digit === '.' ? '0.' : digit);
      setResetNext(false);
    } else {
      if (digit === '.' && display.includes('.')) return;
      setDisplay(display.length < 12 ? display + digit : display);
    }
  };

  const applyPending = (nextOp: string | null) => {
    const current = parseFloat(display);
    if (Number.isNaN(current)) return;

    if (storedValue === null) {
      setStoredValue(current);
    } else if (operator && !resetNext) {
      let computed = storedValue;
      if (operator === '+') computed = storedValue + current;
      else if (operator === '-') computed = storedValue - current;
      else if (operator === '×') computed = storedValue * current;
      else if (operator === '÷') computed = current === 0 ? 0 : storedValue / current;
      const formatted = Number(computed.toFixed(6)).toString();
      setDisplay(formatted);
      setStoredValue(computed);
    }
    setOperator(nextOp);
    setResetNext(true);
  };

  const handleSqrt = () => {
    const val = parseFloat(display);
    if (!Number.isNaN(val) && val >= 0) {
      setDisplay(Number(Math.sqrt(val).toFixed(6)).toString());
      setResetNext(true);
    }
  };

  const handlePercent = () => {
    const val = parseFloat(display);
    if (!Number.isNaN(val)) {
      setDisplay(Number((val / 100).toFixed(6)).toString());
      setResetNext(true);
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setStoredValue(null);
    setOperator(null);
    setResetNext(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="JAMB Calculator"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[320px] rounded-[24px] bg-[#2A085E] p-4 text-white"
        style={{ boxShadow: '0 8px 0 #170338' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-[14px] font-extrabold text-[#FFE51E]">
            <Calculator size={16} />
            <span>JAMB Calculator</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close calculator"
            className="w-8 h-8 rounded-[10px] bg-white/12 hover:bg-white/20 flex items-center justify-center cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="rounded-[14px] bg-[#19043B] px-3.5 py-3 text-right font-mono text-[26px] font-extrabold text-[#FFE51E] truncate mb-3">
          {display}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {['C', '√', '%', '÷', '7', '8', '9', '×', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='].map(
            key => {
              const isOp = ['÷', '×', '-', '+', '='].includes(key);
              const isUtil = ['C', '√', '%'].includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    if (key === 'C') handleClear();
                    else if (key === '√') handleSqrt();
                    else if (key === '%') handlePercent();
                    else if (key === '=') applyPending(null);
                    else if (isOp) applyPending(key);
                    else inputDigit(key);
                  }}
                  className={`h-12 rounded-[12px] font-extrabold text-[17px] transition-transform active:translate-y-[1px] cursor-pointer ${
                    key === '0' ? 'col-span-2' : ''
                  } ${
                    key === '='
                      ? 'bg-[#FFE51E] text-[#260559]'
                      : isOp
                      ? 'bg-[#6C19E5] text-white'
                      : isUtil
                      ? 'bg-white/16 text-[#FFE51E]'
                      : 'bg-white text-[#260559]'
                  }`}
                >
                  {key}
                </button>
              );
            }
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SCREEN 14 (`/cbt/exam`): STRICT CBT EXAM SIMULATOR
 * Well-fitted, simple, clean JAMB UTME exam runner using SABI Wonderland standard UI.
 * Enforces strict exam discipline: countdown timer, 4 subject tabs, question navigator,
 * flag for review, basic calculator, two-step submit, ZERO AI Coach or hints.
 */
export function Screen14CbtExamWonderland() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const student = useMemo(() => getWonderlandDashboardState(), []);

  const preset: CbtMockPreset =
    searchParams.get('preset') === 'full_180' ? 'full_180' : 'quick_40';
  const sourceMode: CbtSourceMode =
    searchParams.get('source') === 'year' ? 'year' : 'shuffle';
  const parsedYear = Number(searchParams.get('year'));
  const selectedYear =
    sourceMode === 'year' && Number.isFinite(parsedYear) && parsedYear >= 2000
      ? parsedYear
      : null;
  const timeLimitSeconds = preset === 'full_180' ? 120 * 60 : 30 * 60;

  const deck = useMemo(
    () =>
      buildCbtMockDeck(
        student.subjects.map(s => s.canonicalName),
        preset,
        { source: sourceMode, year: selectedYear }
      ),
    [student.subjects, preset, sourceMode, selectedYear]
  );

  // Build ordered subject slices for the 4 top tabs
  const subjectTabs = useMemo(() => {
    const groups: {
      subjectCanonical: string;
      subjectLabel: string;
      startIdx: number;
      endIdx: number;
    }[] = [];
    deck.forEach((q, idx) => {
      const last = groups[groups.length - 1];
      if (!last || last.subjectCanonical !== q.subjectCanonical) {
        groups.push({
          subjectCanonical: q.subjectCanonical,
          subjectLabel: q.subjectLabel,
          startIdx: idx,
          endIdx: idx,
        });
      } else {
        last.endIdx = idx;
      }
    });
    return groups;
  }, [deck]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [secondsLeft, setSecondsLeft] = useState(timeLimitSeconds);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showMobileGrid, setShowMobileGrid] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentQuestion = deck[currentIdx] || deck[0];

  // Sync native status bar to deep purple header
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#2A085E' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    }
  }, []);

  const finalizeSubmit = useCallback(() => {
    if (submitted) return;
    setSubmitted(true);
    const usedSeconds = Math.max(1, timeLimitSeconds - secondsLeft);
    const result = gradeCbtExam({
      preset,
      sourceMode,
      selectedYear,
      deck,
      answers,
      flagged,
      durationUsedSeconds: usedSeconds,
      timeLimitSeconds,
    });
    navigate('/cbt/results', { replace: true, state: { result } });
  }, [
    answers,
    deck,
    flagged,
    navigate,
    preset,
    secondsLeft,
    selectedYear,
    sourceMode,
    submitted,
    timeLimitSeconds,
  ]);

  // Countdown tick + auto-submit at 00:00
  useEffect(() => {
    if (submitted) return;
    if (secondsLeft <= 0) {
      finalizeSubmit();
      return;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [finalizeSubmit, secondsLeft, submitted]);

  const handleSelectOption = useCallback(
    (opt: 'A' | 'B' | 'C' | 'D') => {
      try {
        sound.playTap();
      } catch {
        // ignore
      }
      setAnswers(prev => ({ ...prev, [currentIdx]: opt }));
    },
    [currentIdx]
  );

  const handleToggleFlag = () => {
    setFlagged(prev => ({ ...prev, [currentIdx]: !prev[currentIdx] }));
  };

  // Standard JAMB CBT keyboard controls: A/B/C/D answer, N next, P previous
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showCalculator || showSubmitModal) return;
      const key = e.key.toLowerCase();
      if (key === 'a') handleSelectOption('A');
      else if (key === 'b') handleSelectOption('B');
      else if (key === 'c') handleSelectOption('C');
      else if (key === 'd') handleSelectOption('D');
      else if (key === 'n' || key === 'arrowright') {
        setCurrentIdx(prev => Math.min(deck.length - 1, prev + 1));
      } else if (key === 'p' || key === 'arrowleft') {
        setCurrentIdx(prev => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [deck.length, handleSelectOption, showCalculator, showSubmitModal]);

  const activeSubjectTab =
    subjectTabs.find(t => currentIdx >= t.startIdx && currentIdx <= t.endIdx) || subjectTabs[0];

  const answeredCount = Object.keys(answers).length;
  const unansweredCount = deck.length - answeredCount;
  const flaggedCount = Object.values(flagged).filter(Boolean).length;
  const isLowTime = secondsLeft <= 300;

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col bg-[#FFE824] text-[#260559] select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
      }}
    >
      {/* 1. FIXED DEEP PURPLE EXAM TOP BAR */}
      <header className="sticky top-0 z-30 w-full bg-[#2A085E] text-white border-b-4 border-[#170338] pt-[env(safe-area-inset-top,0px)]">
        <div className="w-full max-w-[1380px] mx-auto px-3 sm:px-5 lg:px-8 py-2.5 flex items-center justify-between gap-2">
          {/* Left: Title + Progress */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className="px-2.5 py-1 rounded-[10px] bg-[#FFE824] text-[#260559] text-[12px] font-extrabold uppercase tracking-wider shrink-0"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              CBT
            </span>
            <div className="min-w-0">
              <div className="text-[13.5px] sm:text-[15px] font-extrabold truncate">
                {sourceMode === 'year' && selectedYear
                  ? `${selectedYear} Paper · ${preset === 'full_180' ? '180-Q' : '40-Q'}`
                  : preset === 'full_180'
                  ? 'Shuffle · 180-Q Mock'
                  : 'Shuffle · 40-Q Mock'}
              </div>
              <div className="text-[11px] font-bold text-[#D5C3F7] tabular-nums">
                {answeredCount}/{deck.length} answered
              </div>
            </div>
          </div>

          {/* Center: Live Countdown Clock */}
          <div
            className={`px-3 sm:px-4 py-1.5 rounded-full flex items-center gap-1.5 font-mono text-[14px] sm:text-[16px] font-extrabold tabular-nums shrink-0 ${
              isLowTime
                ? 'bg-[#E5484D] text-white animate-pulse'
                : 'bg-[#3D1482] text-[#FFE51E]'
            }`}
          >
            <Clock size={15} />
            <span>{formatCountdown(secondsLeft)}</span>
          </div>

          {/* Right: Calculator + Submit */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              aria-label="Open JAMB calculator"
              className="w-10 h-10 rounded-[12px] bg-white/14 hover:bg-white/22 text-white flex items-center justify-center cursor-pointer"
            >
              <Calculator size={18} />
            </button>
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="px-3.5 sm:px-4 py-2 rounded-[12px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[12.5px] sm:text-[13.5px] uppercase tracking-wide flex items-center gap-1.5 cursor-pointer"
              style={{ boxShadow: '0 3px 0 #C7AD00' }}
            >
              <span>Submit</span>
              <Send size={14} />
            </button>
          </div>
        </div>

        {/* 2. 4-SUBJECT SWITCHER BAR */}
        <div className="w-full bg-[#20054A] border-t border-white/10">
          <div className="w-full max-w-[1380px] mx-auto px-3 sm:px-5 lg:px-8 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {subjectTabs.map(tab => {
              const isActive = tab.subjectCanonical === activeSubjectTab.subjectCanonical;
              let doneInSubj = 0;
              for (let i = tab.startIdx; i <= tab.endIdx; i += 1) {
                if (answers[i]) doneInSubj += 1;
              }
              const totalInSubj = tab.endIdx - tab.startIdx + 1;
              return (
                <button
                  key={tab.subjectCanonical}
                  type="button"
                  onClick={() => setCurrentIdx(tab.startIdx)}
                  className={`px-3.5 py-1.5 rounded-full text-[12.5px] sm:text-[13.5px] font-extrabold whitespace-nowrap flex items-center gap-2 transition-colors cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#FFE824] text-[#260559]'
                      : 'bg-white/10 text-[#E5D8FA] hover:bg-white/18'
                  }`}
                >
                  <span>{tab.subjectLabel}</span>
                  <span
                    className={`text-[11px] tabular-nums px-1.5 py-0.5 rounded-full ${
                      isActive ? 'bg-[#260559]/12 text-[#260559]' : 'bg-white/12 text-[#FFE51E]'
                    }`}
                  >
                    {doneInSubj}/{totalInSubj}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* 3. MAIN WORKSPACE: Full-width Question Card + Desktop Right Navigator */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-3 sm:px-5 lg:px-8 py-4 sm:py-5 flex flex-col lg:grid lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* LEFT / MAIN QUESTION AREA (8 cols on lg+) */}
        <section className="w-full lg:col-span-8 flex-1 flex flex-col">
          <div
            className="bg-white rounded-[24px] p-4 sm:p-6 flex-1 flex flex-col"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            {/* Question Meta Row */}
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-3 py-1 rounded-full bg-[#EFE6FF] text-[#6C19E5] text-[12px] font-extrabold whitespace-nowrap">
                  {currentQuestion.subjectLabel}
                </span>
                <span className="text-[13px] font-extrabold text-[#5A467A] tabular-nums">
                  Question {currentQuestion.subjectOrderIndex + 1} of{' '}
                  {activeSubjectTab.endIdx - activeSubjectTab.startIdx + 1}
                </span>
              </div>

              <button
                type="button"
                onClick={handleToggleFlag}
                className={`px-3 py-1.5 rounded-full text-[12px] font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  flagged[currentIdx]
                    ? 'bg-[#FF7A00] text-white'
                    : 'bg-[#F5F0FF] text-[#5A467A] hover:bg-[#EAE0FC]'
                }`}
              >
                <Flag size={13} className={flagged[currentIdx] ? 'fill-white' : ''} />
                <span>{flagged[currentIdx] ? 'Flagged' : 'Flag'}</span>
              </button>
            </div>

            {/* Question Stem */}
            <h1 className="text-[17.5px] sm:text-[20px] font-extrabold text-[#260559] leading-[1.45] mb-5 whitespace-pre-line">
              {currentQuestion.question}
            </h1>

            {/* 4 Clean A/B/C/D Option Cards */}
            <div className="space-y-2.5 sm:space-y-3 mt-auto">
              {OPTION_KEYS.map(letter => {
                const isSelected = answers[currentIdx] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleSelectOption(letter)}
                    className={`w-full rounded-[18px] px-3.5 sm:px-4 py-3.5 min-h-[56px] flex items-center gap-3 text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#6C19E5] text-white'
                        : 'bg-[#F9F6FF] hover:bg-[#F0E7FF] text-[#260559] border border-[#E6D9FA]'
                    }`}
                    style={isSelected ? { boxShadow: '0 4px 0 #46099E' } : undefined}
                  >
                    <span
                      className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-extrabold text-[14px] shrink-0 ${
                        isSelected
                          ? 'bg-[#FFE824] text-[#260559]'
                          : 'bg-white text-[#6C19E5] border border-[#DFCFFA]'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-[15px] sm:text-[16px] font-bold leading-snug">
                      {currentQuestion.options[letter]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Prev / Navigator (Mobile) / Next Controls */}
          <div className="mt-3.5 grid grid-cols-3 gap-2.5 pb-[env(safe-area-inset-bottom,0px)]">
            <button
              type="button"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(prev => Math.max(0, prev - 1))}
              className="py-3.5 px-3 rounded-[16px] bg-white disabled:opacity-45 text-[#260559] font-extrabold text-[14.5px] flex items-center justify-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
              style={{ boxShadow: '0 3.5px 0 #E2C700' }}
            >
              <ChevronLeft size={18} strokeWidth={2.7} />
              <span>Previous</span>
            </button>

            <button
              type="button"
              onClick={() => setShowMobileGrid(true)}
              className="lg:hidden py-3.5 px-3 rounded-[16px] bg-[#2A085E] text-[#FFE51E] font-extrabold text-[14px] flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ boxShadow: '0 3.5px 0 #170338' }}
            >
              <Grid2X2 size={17} />
              <span>
                Q{currentIdx + 1}/{deck.length}
              </span>
            </button>

            <div className="hidden lg:flex items-center justify-center text-[12.5px] font-bold text-[#3B2264]">
              Shortcuts: A–D · P / N
            </div>

            {currentIdx < deck.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrentIdx(prev => Math.min(deck.length - 1, prev + 1))}
                className="py-3.5 px-3 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[14.5px] flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ boxShadow: '0 3.5px 0 #46099E' }}
              >
                <span>Next</span>
                <ChevronRight size={18} strokeWidth={2.7} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                className="py-3.5 px-3 rounded-[16px] bg-[#059669] hover:brightness-105 text-white font-extrabold text-[14.5px] flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ boxShadow: '0 3.5px 0 #046C4E' }}
              >
                <span>Finish</span>
                <Send size={15} />
              </button>
            )}
          </div>
        </section>

        {/* RIGHT NAVIGATOR PANEL (Desktop `lg:`) */}
        <aside
          className="hidden lg:block lg:col-span-4 w-full bg-white rounded-[24px] p-5 sticky top-[120px]"
          style={{ boxShadow: '0 4px 0 #E2C700' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-extrabold text-[#260559]">
              {activeSubjectTab.subjectLabel} Grid
            </h2>
            <span className="text-[12px] font-bold text-[#6E5C91] tabular-nums">
              {answeredCount}/{deck.length} total
            </span>
          </div>

          <div className="grid grid-cols-6 gap-1.5 max-h-[340px] overflow-y-auto pr-1">
            {Array.from(
              { length: activeSubjectTab.endIdx - activeSubjectTab.startIdx + 1 },
              (_, offset) => {
                const idx = activeSubjectTab.startIdx + offset;
                const isCurrent = idx === currentIdx;
                const isAnswered = Boolean(answers[idx]);
                const isFlag = Boolean(flagged[idx]);

                let cls = 'bg-[#F4EFFC] text-[#4A356E] hover:bg-[#E7DCFA]';
                if (isCurrent) cls = 'bg-[#6C19E5] text-white ring-2 ring-[#260559]';
                else if (isFlag) cls = 'bg-[#FF7A00] text-white';
                else if (isAnswered) cls = 'bg-[#059669] text-white';

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentIdx(idx)}
                    className={`h-9 rounded-[10px] text-[12.5px] font-extrabold tabular-nums transition-transform active:scale-95 cursor-pointer ${cls}`}
                  >
                    {offset + 1}
                  </button>
                );
              }
            )}
          </div>

          {/* Compact Legend */}
          <div className="mt-4 pt-3 border-t border-[#F0E9FA] grid grid-cols-2 gap-2 text-[11.5px] font-bold text-[#5A467A]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#059669]" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#FF7A00]" />
              <span>Flagged ({flaggedCount})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#6C19E5]" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-xs bg-[#F4EFFC] border border-[#D8C5FA]" />
              <span>Unanswered ({unansweredCount})</span>
            </div>
          </div>
        </aside>
      </main>

      {/* MOBILE QUESTION NAVIGATOR DRAWER */}
      {showMobileGrid && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Question navigator"
          className="fixed inset-0 z-50 lg:hidden flex items-end bg-black/55 backdrop-blur-xs"
          onClick={() => setShowMobileGrid(false)}
        >
          <div
            className="w-full max-h-[78dvh] rounded-t-[26px] bg-white p-5 overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[17px] font-extrabold text-[#260559]">
                {activeSubjectTab.subjectLabel} Questions
              </h3>
              <button
                type="button"
                onClick={() => setShowMobileGrid(false)}
                className="w-9 h-9 rounded-[11px] bg-[#F4EFFC] text-[#260559] flex items-center justify-center cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {Array.from(
                { length: activeSubjectTab.endIdx - activeSubjectTab.startIdx + 1 },
                (_, offset) => {
                  const idx = activeSubjectTab.startIdx + offset;
                  const isCurrent = idx === currentIdx;
                  const isAnswered = Boolean(answers[idx]);
                  const isFlag = Boolean(flagged[idx]);

                  let cls = 'bg-[#F4EFFC] text-[#4A356E]';
                  if (isCurrent) cls = 'bg-[#6C19E5] text-white ring-2 ring-[#260559]';
                  else if (isFlag) cls = 'bg-[#FF7A00] text-white';
                  else if (isAnswered) cls = 'bg-[#059669] text-white';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setCurrentIdx(idx);
                        setShowMobileGrid(false);
                      }}
                      className={`h-10 rounded-[10px] text-[13px] font-extrabold tabular-nums cursor-pointer ${cls}`}
                    >
                      {offset + 1}
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {/* CALCULATOR MODAL */}
      {showCalculator && <JambBasicCalculator onClose={() => setShowCalculator(false)} />}

      {/* TWO-STEP SUBMIT CONFIRMATION MODAL */}
      {showSubmitModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit CBT Exam"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs px-4"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="w-full max-w-[410px] rounded-[26px] bg-white p-5 sm:p-6 text-[#260559]"
            style={{ boxShadow: '0 6px 0 #E2C700' }}
            onClick={e => e.stopPropagation()}
          >
            <h3
              className="text-[22px] font-bold text-[#260559] mb-1.5"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Submit your CBT exam?
            </h3>
            <p className="text-[13.5px] font-semibold text-[#4F3B73] mb-4">
              Once you submit, your answers are graded immediately and your full script review
              unlocks.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-5 text-center">
              <div className="rounded-[14px] bg-[#ECFDF5] p-3">
                <div className="text-[20px] font-extrabold text-[#059669] tabular-nums">
                  {answeredCount}
                </div>
                <div className="text-[11px] font-bold text-[#065F46]">Answered</div>
              </div>
              <div className="rounded-[14px] bg-[#FEF2F2] p-3">
                <div className="text-[20px] font-extrabold text-[#DC2626] tabular-nums">
                  {unansweredCount}
                </div>
                <div className="text-[11px] font-bold text-[#991B1B]">Unanswered</div>
              </div>
              <div className="rounded-[14px] bg-[#FFF7ED] p-3">
                <div className="text-[20px] font-extrabold text-[#EA580C] tabular-nums">
                  {flaggedCount}
                </div>
                <div className="text-[11px] font-bold text-[#9A3412]">Flagged</div>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={finalizeSubmit}
                className="w-full py-3.5 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[15.5px] uppercase tracking-wide cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #46099E',
                }}
              >
                Confirm & Submit Exam
              </button>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="w-full py-3 rounded-[16px] bg-[#F3EEFD] hover:bg-[#EAE0FC] text-[#260559] font-extrabold text-[14.5px] cursor-pointer"
              >
                Return to exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
