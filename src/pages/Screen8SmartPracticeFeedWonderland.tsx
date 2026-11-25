import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bookmark,
  Check,
  ChevronUp,
  Flag,
  Flame,
  Share2,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import confetti from 'canvas-confetti';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  buildSmartPracticeDeck,
  buildSmartPracticeResult,
  getComboState,
  loadSavedQuestionIds,
  saveSmartPracticeResult,
  toggleSavedQuestionId,
  type PracticeAnswerRecord,
  type SmartPracticePace,
} from '../utils/smartPracticeSession';
import { loadPracticeAiConfig } from '../utils/sabiAiPracticeConfig';
import { recordMistakeInVault } from '../utils/cbtAndCustomEngine';
import { recordStudyActivity } from '../utils/userProgressStore';
import { sound } from '../utils/soundEffects';

const OPTIONS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];
const CHECKPOINT_INTERVAL = 10;

/**
 * SCREEN 8 (`/practice/session`): SMART PRACTICE FEED (BLITZ & GUIDED) + CHECKPOINT
 * Implements Uploaded Screens:
 *  - `03 · Smart Practice — Blitz feed (tap an answer, then swipe)`
 *  - `04 · Blitz — Correct answer (x3 combo + "You have..." toast)`
 *  - `05 · Blitz — Checkpoint (keep going or finish)`
 * Full-bleed edge-to-edge on mobile/Android APK, spacious responsive arena on desktop WebApp.
 * Strictly NO countdown timer and NO speed reward (per SABI Master Spec).
 */
export function Screen8SmartPracticeFeedWonderland() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const student = useMemo(() => getWonderlandDashboardState(), []);

  const rawPace = searchParams.get('pace');
  const pace: SmartPracticePace =
    rawPace === 'guided' || rawPace === 'smart' ? 'guided' : 'blitz';
  const focusSubject =
    searchParams.get('focus') ||
    student.subjects[student.subjects.length - 1]?.canonicalName ||
    'Chemistry';

  const deck = useMemo(
    () =>
      buildSmartPracticeDeck(
        focusSubject,
        student.subjects.map(s => s.canonicalName)
      ),
    [focusSubject, student.subjects]
  );

  const [sessionStartMs] = useState<number>(() => Date.now());
  const [questionStartMs, setQuestionStartMs] = useState<number>(() => Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [records, setRecords] = useState<PracticeAnswerRecord[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [comboUpBanner, setComboUpBanner] = useState<number | null>(null);
  const [showCheckpoint, setShowCheckpoint] = useState(false);
  const aiConfig = useMemo(
    () => loadPracticeAiConfig(student.subjects.map(s => s.canonicalName)),
    [student.subjects]
  );

  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [usePidgin, setUsePidgin] = useState(
    () => aiConfig.explanationStyle === 'pidgin_friendly'
  );

  // Side rail states (Save / Report / Share)
  const [savedIds, setSavedIds] = useState<string[]>(() => loadSavedQuestionIds());
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Touch swipe-up tracking after answering
  const touchStartYRef = useRef<number | null>(null);

  const currentQuestion = deck[currentIndex % deck.length];
  const isAnswered = selectedOption !== null;
  const isCorrect = isAnswered && selectedOption === currentQuestion.answer;
  const combo = getComboState(currentStreak);

  // Sync native Android StatusBar color: Midnight Purple on feed, SABI Yellow on Checkpoint
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      if (showCheckpoint) {
        StatusBar.setBackgroundColor({ color: '#FFE824' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Light }).catch(() => {});
      } else {
        StatusBar.setBackgroundColor({ color: '#1E0342' }).catch(() => {});
        StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      }
    }
  }, [showCheckpoint]);

  const showQuickNotice = (message: string) => {
    setActionToast(message);
    window.setTimeout(() => {
      setActionToast(prev => (prev === message ? null : prev));
    }, 2200);
  };

  const finishAndOpenResults = useCallback(
    (finalRecords: PracticeAnswerRecord[]) => {
      const result = buildSmartPracticeResult({
        pace,
        firstName: student.firstName,
        records: finalRecords,
        startedAtMs: sessionStartMs,
      });
      saveSmartPracticeResult(result);
      navigate('/practice/results', { state: { result } });
    },
    [navigate, pace, sessionStartMs, student.firstName]
  );

  const handleSelectOption = useCallback(
    (opt: 'A' | 'B' | 'C' | 'D') => {
      if (isAnswered || showCheckpoint) return;

      const elapsedSeconds = Math.max(
        2,
        Math.round((Date.now() - questionStartMs) / 1000)
      );
      const answeredCorrectly = opt === currentQuestion.answer;
      const prevCombo = getComboState(currentStreak);
      const nextStreak = answeredCorrectly ? currentStreak + 1 : 0;
      const nextCombo = getComboState(nextStreak);
      const earnedXp = answeredCorrectly ? nextCombo.xpPerCorrect : 0;

      try {
        if (answeredCorrectly) {
          sound.playSuccess();
        } else {
          sound.playTap();
        }
      } catch {
        // ignore audio errors
      }

      setSelectedOption(opt);
      setCurrentStreak(nextStreak);
      setBestStreak(prev => Math.max(prev, nextStreak));
      setSessionXp(prev => prev + earnedXp);

      if (answeredCorrectly && nextCombo.multiplier > prevCombo.multiplier) {
        setComboUpBanner(nextCombo.multiplier);
      } else if (answeredCorrectly && nextCombo.multiplier >= 2) {
        setComboUpBanner(nextCombo.multiplier);
      } else {
        setComboUpBanner(null);
      }

      const record: PracticeAnswerRecord = {
        questionId: currentQuestion.id,
        subjectCanonical: currentQuestion.subjectCanonical,
        subjectLabel: currentQuestion.subjectLabel,
        topicLabel: currentQuestion.topicLabel,
        selectedOption: opt,
        isCorrect: answeredCorrectly,
        xpEarned: earnedXp,
        elapsedSeconds,
      };
      recordStudyActivity({
        subject: currentQuestion.subjectCanonical,
        topic: currentQuestion.topicLabel,
        isCorrect: answeredCorrectly,
        mode: pace === 'blitz' ? 'blitz' : 'smart',
        elapsedSeconds,
        xpOverride: earnedXp,
      });
      if (!answeredCorrectly) {
        recordMistakeInVault(currentQuestion, opt);
      }
      setRecords(prev => [...prev, record]);
    },
    [currentQuestion, currentStreak, isAnswered, pace, questionStartMs, showCheckpoint]
  );

  const handleAdvance = useCallback(() => {
    if (!isAnswered || showCheckpoint) return;

    try {
      sound.playTap();
    } catch {
      // ignore
    }

    const totalAnswered = records.length;

    // Guided session completes cleanly after 6–10 questions (10 by default, or results anytime via X)
    if (pace === 'guided' && totalAnswered >= CHECKPOINT_INTERVAL) {
      finishAndOpenResults(records);
      return;
    }

    // Blitz triggers the celebratory Checkpoint every 10 questions (Screen 05)
    if (pace === 'blitz' && totalAnswered > 0 && totalAnswered % CHECKPOINT_INTERVAL === 0) {
      setShowCheckpoint(true);
      try {
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.45 } });
      } catch {
        // ignore
      }
      return;
    }

    setSelectedOption(null);
    setComboUpBanner(null);
    setCurrentIndex(prev => prev + 1);
    setQuestionStartMs(Date.now());
  }, [finishAndOpenResults, isAnswered, pace, records, showCheckpoint]);

  const handleContinueFromCheckpoint = () => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setShowCheckpoint(false);
    setSelectedOption(null);
    setComboUpBanner(null);
    setCurrentIndex(prev => prev + 1);
    setQuestionStartMs(Date.now());
  };

  // Keyboard shortcuts on Desktop WebApp: A/B/C/D or 1-4 to answer, Enter/Space/ArrowDown/ArrowRight for next
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showCheckpoint || showExitConfirm) return;
      const key = e.key.toLowerCase();
      if (!isAnswered) {
        if (key === 'a' || key === '1') handleSelectOption('A');
        else if (key === 'b' || key === '2') handleSelectOption('B');
        else if (key === 'c' || key === '3') handleSelectOption('C');
        else if (key === 'd' || key === '4') handleSelectOption('D');
      } else if (key === 'enter' || key === ' ' || key === 'arrowdown' || key === 'arrowright') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAdvance, handleSelectOption, isAnswered, showCheckpoint, showExitConfirm]);

  // Touch swipe-up handler on answered card
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0]?.clientY ?? null;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isAnswered || touchStartYRef.current === null) return;
    const endY = e.changedTouches[0]?.clientY ?? touchStartYRef.current;
    const deltaY = touchStartYRef.current - endY;
    touchStartYRef.current = null;
    if (deltaY > 42) {
      handleAdvance();
    }
  };

  const handleToggleSave = () => {
    const next = toggleSavedQuestionId(currentQuestion.id);
    setSavedIds(next);
    const savedNow = next.includes(currentQuestion.id);
    showQuickNotice(savedNow ? 'Saved to your revision deck' : 'Removed from saved questions');
  };

  const handleReportQuestion = () => {
    showQuickNotice('Question flagged for SABI review. Thank you!');
  };

  const handleShareQuestion = async () => {
    const text = `SABI JAMB ${currentQuestion.subjectLabel}: ${currentQuestion.question}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'SABI JAMB Practice', text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showQuickNotice('Question copied — share with your study group!');
      }
    } catch {
      showQuickNotice('Ready to share with your study group');
    }
  };

  // Current 10-question batch progress bar slots (Matches Screen 03)
  const batchStart = Math.floor(currentIndex / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
  const batchSlots = Array.from({ length: CHECKPOINT_INTERVAL }, (_, idx) => {
    const absoluteIdx = batchStart + idx;
    const rec = records[absoluteIdx];
    if (rec) {
      return rec.isCorrect ? 'correct' : 'wrong';
    }
    if (absoluteIdx === currentIndex) {
      return 'current';
    }
    return 'upcoming';
  });

  // Top Performance Toast (Matches Screen 04 when answered correctly with momentum)
  const recentWindow = records.slice(-7);
  const recentCorrect = recentWindow.filter(r => r.isCorrect).length;
  const avgSeconds =
    recentWindow.length > 0
      ? Math.max(
          4,
          Math.round(
            recentWindow.reduce((s, r) => s + r.elapsedSeconds, 0) / recentWindow.length
          )
        )
      : 9;
  const showPerformanceToast = isAnswered && isCorrect && recentWindow.length >= 2;
  const lastRecord = records[records.length - 1];
  const isSaved = savedIds.includes(currentQuestion.id);

  // =========================================================================
  // SCREEN 05: BLITZ CHECKPOINT (EVERY 10 QUESTIONS)
  // Matches `05___Blitz___Checkpoint_keep_going_or_finish_a34d5e8d.png` 1:1
  // =========================================================================
  if (showCheckpoint) {
    const batchRecords = records.slice(-CHECKPOINT_INTERVAL);
    const batchCorrect = batchRecords.filter(r => r.isCorrect).length;
    const totalCorrect = records.filter(r => r.isCorrect).length;
    const totalAnswered = records.length;

    return (
      <div
        className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#FFE824] text-[#260559] flex flex-col select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
        }}
      >
        {/* Decorative Wonderland Corner Orbs */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div
            className="absolute -top-[58px] -left-[58px] w-[190px] h-[190px] sm:w-[230px] sm:h-[230px] rounded-full"
            style={{ background: 'linear-gradient(145deg, #7C22F2 0%, #6D18E3 100%)' }}
          />
          <div
            className="absolute top-[74px] right-[38px] sm:right-[72px] w-7 h-7 rounded-full"
            style={{ background: 'linear-gradient(145deg, #FFA526 0%, #F57C00 100%)' }}
          />
          <div
            className="absolute -right-[48px] -bottom-[68px] w-[220px] h-[220px] sm:w-[270px] sm:h-[270px] rounded-full"
            style={{ background: 'linear-gradient(145deg, #FFA71A 0%, #FB8C00 100%)' }}
          />
        </div>

        <main className="relative z-10 flex-1 w-full max-w-[680px] mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-5 sm:pb-8 flex flex-col justify-between">
          {/* Center Hero + Stats */}
          <div className="flex flex-col items-center text-center my-auto py-4">
            {/* Tilted 3D Purple Lightning Badge + Geometric Accent Ring */}
            <div className="relative mb-6 sm:mb-7">
              <div
                className="w-[116px] h-[116px] sm:w-[130px] sm:h-[130px] rounded-[28px] bg-[#711AE3] flex items-center justify-center -rotate-6"
                style={{ boxShadow: '0 8px 0 #46099E, 0 18px 32px rgba(70, 9, 158, 0.25)' }}
              >
                <Zap
                  size={56}
                  className="text-[#FFE51E] fill-[#FFE51E] rotate-6"
                  strokeWidth={1.8}
                />
              </div>
              <span
                className="w-6 h-6 rounded-full border-[4px] border-[#711AE3] absolute -right-7 bottom-3"
                aria-hidden="true"
              />
            </div>

            <h1
              className="text-[34px] sm:text-[42px] font-bold text-[#260559] leading-[1.1] tracking-[-0.01em]"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {totalAnswered} questions down!
            </h1>

            <p className="mt-2.5 text-[15.5px] sm:text-[17px] font-semibold text-[#2E1359] max-w-[380px] leading-snug">
              Na so! Your daily goal is done and your streak is safe.
            </p>

            {/* 3 White Tactile Metric Cards */}
            <div className="w-full grid grid-cols-3 gap-3 sm:gap-4 mt-7">
              <div
                className="bg-white rounded-[22px] py-4 px-2.5 sm:py-5 text-center"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div
                  className="text-[26px] sm:text-[32px] font-bold text-[#059669] leading-none tabular-nums"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {totalAnswered === CHECKPOINT_INTERVAL ? batchCorrect : totalCorrect}/
                  {totalAnswered}
                </div>
                <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-[#5A467A]">
                  Correct
                </div>
              </div>

              <div
                className="bg-white rounded-[22px] py-4 px-2.5 sm:py-5 text-center"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div
                  className="text-[26px] sm:text-[32px] font-bold text-[#6C19E5] leading-none tabular-nums"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  +{sessionXp}
                </div>
                <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-[#5A467A]">
                  XP earned
                </div>
              </div>

              <div
                className="bg-white rounded-[22px] py-4 px-2.5 sm:py-5 text-center"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div
                  className="text-[26px] sm:text-[32px] font-bold text-[#C2410C] leading-none tabular-nums"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {bestStreak}
                </div>
                <div className="mt-1.5 text-[13px] sm:text-[14px] font-bold text-[#5A467A]">
                  Best streak
                </div>
              </div>
            </div>

            {/* Wellbeing Break Tip Banner */}
            <div
              className="w-full mt-4 bg-white rounded-[20px] px-4 py-3.5 sm:px-5 sm:py-4 flex items-center gap-3.5 text-left"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="w-11 h-11 rounded-full bg-[#D8F8E8] text-[#059669] flex items-center justify-center shrink-0">
                <Activity size={21} strokeWidth={2.5} />
              </div>
              <p className="text-[14px] sm:text-[15px] font-semibold text-[#2E1359] leading-snug">
                You’ve been going for a while. A short break helps what you learned stick.
              </p>
            </div>
          </div>

          {/* Bottom Full-Width Tactile Action Buttons */}
          <footer className="w-full space-y-3 pt-4">
            <button
              type="button"
              onClick={handleContinueFromCheckpoint}
              className="w-full py-4 px-6 rounded-[20px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[18px] sm:text-[19px] tracking-[0.05em] uppercase transition-transform duration-100 active:translate-y-[2px] cursor-pointer"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 5px 0 #46099E',
              }}
            >
              KEEP GOING
            </button>

            <button
              type="button"
              onClick={() => finishAndOpenResults(records)}
              className="w-full py-4 px-6 rounded-[20px] bg-white hover:bg-[#FFFDF4] text-[#260559] font-extrabold text-[16.5px] sm:text-[17.5px] transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              Finish and see results
            </button>
          </footer>
        </main>
      </div>
    );
  }

  // =========================================================================
  // SCREENS 03 & 04: DARK-PURPLE IMMERSIVE BLITZ / GUIDED FEED
  // Matches `03___Smart_Practice___Blitz_feed` & `04___Blitz___Correct_answer`
  // =========================================================================
  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#1E0342] text-white flex flex-col select-none pt-[env(safe-area-inset-top,0px)]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #21044A 0%, #1C033E 55%, #160233 100%)',
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Subtle Dark-Purple Ambient Shapes */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        <div
          className="absolute top-[190px] -right-[70px] w-[260px] h-[260px] sm:w-[340px] sm:h-[340px] rounded-full"
          style={{ background: 'rgba(92, 26, 184, 0.24)' }}
        />
        <div
          className="absolute -left-[68px] bottom-[170px] w-[190px] h-[190px] sm:w-[230px] sm:h-[230px] rounded-full"
          style={{ border: '22px solid rgba(92, 26, 184, 0.22)' }}
        />
      </div>

      {/* Main Content Area — Full-width on Mobile, Centered Generous Arena on Desktop */}
      <div className="relative z-10 flex-1 w-full max-w-[900px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-3.5 sm:pt-5 flex flex-col">
        {/* 1. TOP BAR: Close X | Mode Pill | Yellow XP Pill */}
        <header className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4">
          <button
            type="button"
            onClick={() => {
              if (records.length > 0) {
                setShowExitConfirm(true);
              } else {
                navigate('/practice');
              }
            }}
            aria-label="Exit practice session"
            className="w-[44px] h-[44px] rounded-[15px] bg-[#320D68] hover:bg-[#3F1380] text-white flex items-center justify-center transition-transform active:scale-95 cursor-pointer shrink-0"
          >
            <X size={21} strokeWidth={2.6} />
          </button>

          {/* Center Mode Pill */}
          <div className="px-4 py-2 rounded-full bg-[#2C0A5C] border border-white/10 flex items-center gap-1.5 text-[13.5px] sm:text-[14.5px] font-extrabold whitespace-nowrap">
            <span className="text-[#DCD0F5]">Practice Hub</span>
            <span className="text-[#9E84CC]" aria-hidden="true">
              •
            </span>
            {pace === 'blitz' ? (
              <span className="inline-flex items-center gap-1 text-[#FFE51E]">
                <Zap size={14} className="fill-[#FFE51E] text-[#FFE51E]" />
                <span>Blitz</span>
              </span>
            ) : (
              <span className="text-[#FFE51E]">Smart Practice</span>
            )}
          </div>

          {/* Right Session XP Yellow Pill */}
          <button
            type="button"
            onClick={() => {
              if (records.length > 0) setShowExitConfirm(true);
            }}
            aria-label={`${sessionXp} XP earned this session`}
            className="px-3.5 py-2 rounded-full bg-[#FFE51E] text-[#260559] font-extrabold text-[14.5px] sm:text-[15px] tabular-nums inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
            style={{ boxShadow: '0 3px 0 #C7AD00' }}
          >
            <Zap size={15} className="fill-[#711AE3] text-[#711AE3] shrink-0" />
            <span>{sessionXp}</span>
          </button>
        </header>

        {/* 2. COMBO STRIP OR LIVE PERFORMANCE TOAST CARD (Screens 03 vs 04) */}
        <section className="mb-4 sm:mb-5">
          {showPerformanceToast ? (
            <div
              className="w-full rounded-[22px] bg-white px-4 py-3.5 sm:px-5 sm:py-4 text-[#260559] flex items-center gap-3.5 animate-[fadeIn_160ms_ease-out]"
              style={{ boxShadow: '0 4px 0 #7E2DF5' }}
            >
              <div className="w-[46px] h-[46px] rounded-[14px] bg-[#7C22F2] text-white flex items-center justify-center shrink-0">
                <Zap size={24} className="fill-white text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[17px] sm:text-[18px] font-extrabold text-[#260559] leading-tight">
                  {recentCorrect === recentWindow.length ? 'Sharp and fast!' : 'Good momentum!'}
                </div>
                <p className="mt-0.5 text-[13.5px] sm:text-[14px] font-semibold text-[#4A356E] leading-snug">
                  You have answered {recentCorrect} of your last {recentWindow.length} correctly,
                  about {avgSeconds}s each. You dey fly!
                </p>
              </div>
            </div>
          ) : (
            <div className="w-full rounded-[20px] bg-[#290957] border-[1.5px] border-[#E08A1E]/85 px-3.5 py-3 sm:px-4 sm:py-3.5 space-y-2.5">
              {/* Row 1: Multiplier Badge + 3-Segment Combo Bar */}
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#FF9500] text-[#260559] font-extrabold text-[13px] tabular-nums leading-none shrink-0">
                  x{combo.multiplier}
                </span>
                <div className="flex-1 grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(seg => (
                    <div
                      key={seg}
                      className={`h-[7px] rounded-full transition-colors duration-200 ${
                        seg <= combo.filledSegments ? 'bg-[#FF9F1C]' : 'bg-[#421B7E]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Row 2: 10-Question Checkpoint Slots */}
              <div className="grid grid-cols-10 gap-1.5">
                {batchSlots.map((slot, idx) => {
                  if (slot === 'correct') {
                    return (
                      <div
                        key={idx}
                        className="h-[24px] sm:h-[26px] rounded-[7px] bg-[#12B76A] text-white flex items-center justify-center"
                        aria-label={`Question ${batchStart + idx + 1} correct`}
                      >
                        <Check size={13} strokeWidth={3.2} />
                      </div>
                    );
                  }
                  if (slot === 'wrong') {
                    return (
                      <div
                        key={idx}
                        className="h-[24px] sm:h-[26px] rounded-[7px] bg-[#E5484D] text-white flex items-center justify-center"
                        aria-label={`Question ${batchStart + idx + 1} incorrect`}
                      >
                        <X size={13} strokeWidth={3.2} />
                      </div>
                    );
                  }
                  if (slot === 'current') {
                    return (
                      <div
                        key={idx}
                        className="h-[24px] sm:h-[26px] rounded-[7px] border-[1.5px] border-dashed border-[#FF9F1C] bg-[#36116E]/60"
                        aria-label={`Current question ${batchStart + idx + 1}`}
                      />
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="h-[24px] sm:h-[26px] rounded-[7px] bg-[#3C1775]"
                      aria-label={`Upcoming question ${batchStart + idx + 1}`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Quick Side-Action Toast (Save / Report / Share) */}
        {actionToast && (
          <div className="mb-3 px-4 py-2 rounded-full bg-[#3A1478] border border-white/15 text-xs font-bold text-[#FFE51E] self-start">
            {actionToast}
          </div>
        )}

        {/* 3. SUBJECT PILL + TOPIC · Q# */}
        <div className="flex items-center flex-wrap gap-2.5 mb-2.5 sm:mb-3">
          <span className="px-3.5 py-1 rounded-full bg-[#FFE51E] text-[#260559] font-extrabold text-[12.5px] sm:text-[13px] tracking-tight whitespace-nowrap">
            {currentQuestion.subjectLabel}
          </span>
          <span className="text-[13.5px] sm:text-[14.5px] font-bold text-[#C8B5EA]">
            {currentQuestion.topicLabel} · Q{currentIndex + 1}
          </span>
        </div>

        {/* 4. QUESTION STEM + OPTIONS + RIGHT VERTICAL ACTION RAIL */}
        <section className="flex-1 flex flex-col">
          <div className="flex items-start gap-3 sm:gap-5">
            {/* Left/Main Column: Question Stem + 4 Options */}
            <div className="flex-1 min-w-0">
              <h1
                className="text-[22px] sm:text-[26px] lg:text-[28px] font-bold text-white leading-[1.26] mb-4 sm:mb-5 whitespace-pre-line"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                {currentQuestion.question}
              </h1>

              {/* 4 Tactile Answer Option Cards */}
              <div className="space-y-3">
                {OPTIONS.map(letter => {
                  const text = currentQuestion.options[letter];
                  const isThisCorrect = letter === currentQuestion.answer;
                  const isThisSelected = selectedOption === letter;

                  let cardBg = 'bg-white text-[#260559] hover:bg-[#FCF9FF]';
                  let cardShadow = '0 4px 0 #B69CE8';
                  let badgeClass = 'bg-[#F1E8FF] text-[#6C19E5]';

                  if (isAnswered) {
                    if (isThisCorrect) {
                      cardBg = 'bg-[#10B968] text-white';
                      cardShadow = '0 4px 0 #088247';
                      badgeClass = 'bg-white text-[#088247]';
                    } else if (isThisSelected && !isThisCorrect) {
                      cardBg = 'bg-[#E5484D] text-white';
                      cardShadow = '0 4px 0 #A82328';
                      badgeClass = 'bg-white text-[#A82328]';
                    } else {
                      cardBg = 'bg-white/45 text-[#260559]/75';
                      cardShadow = '0 3px 0 rgba(182, 156, 232, 0.35)';
                      badgeClass = 'bg-[#260559]/12 text-[#260559]/70';
                    }
                  }

                  return (
                    <button
                      key={letter}
                      type="button"
                      disabled={isAnswered}
                      onClick={() => handleSelectOption(letter)}
                      className={`w-full rounded-[19px] px-3.5 sm:px-4 py-3.5 sm:py-4 min-h-[58px] flex items-center justify-between gap-3 text-left transition-all duration-150 ${
                        !isAnswered ? 'active:translate-y-[1.5px] cursor-pointer' : 'cursor-default'
                      } ${cardBg}`}
                      style={{ boxShadow: cardShadow }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-extrabold text-[14px] shrink-0 ${badgeClass}`}
                        >
                          {letter}
                        </span>
                        <span className="text-[16px] sm:text-[17px] font-extrabold leading-snug">
                          {text}
                        </span>
                      </div>

                      {isAnswered && isThisCorrect && (
                        <Check size={22} strokeWidth={3} className="text-white shrink-0" />
                      )}
                      {isAnswered && isThisSelected && !isThisCorrect && (
                        <X size={22} strokeWidth={3} className="text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Vertical Action Rail (Save / Report / Share — Matches Screens 03 & 04) */}
            <aside
              className="flex flex-col items-center gap-4 pt-12 sm:pt-14 shrink-0"
              aria-label="Question actions"
            >
              <button
                type="button"
                onClick={handleToggleSave}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                aria-label={isSaved ? 'Remove saved question' : 'Save question'}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                    isSaved
                      ? 'bg-[#FFE51E] text-[#260559]'
                      : 'bg-[#310E67] text-white group-hover:bg-[#411784]'
                  }`}
                >
                  <Bookmark size={19} className={isSaved ? 'fill-[#260559]' : ''} />
                </div>
                <span className="text-[11.5px] font-bold text-[#E5D9FA]">
                  {isSaved ? 'Saved' : 'Save'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleReportQuestion}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                aria-label="Report question"
              >
                <div className="w-11 h-11 rounded-full bg-[#310E67] group-hover:bg-[#411784] text-white flex items-center justify-center transition-colors">
                  <Flag size={18} />
                </div>
                <span className="text-[11.5px] font-bold text-[#E5D9FA]">Report</span>
              </button>

              <button
                type="button"
                onClick={() => void handleShareQuestion()}
                className="flex flex-col items-center gap-1 group cursor-pointer"
                aria-label="Share question"
              >
                <div className="w-11 h-11 rounded-full bg-[#310E67] group-hover:bg-[#411784] text-white flex items-center justify-center transition-colors">
                  <Share2 size={18} />
                </div>
                <span className="text-[11.5px] font-bold text-[#E5D9FA]">Share</span>
              </button>
            </aside>
          </div>

          {/* 5. BOTTOM PROMPT (Before Answering — Screen 03) */}
          {!isAnswered && (
            <div className="mt-auto pt-6 pb-[max(env(safe-area-inset-bottom,0px),18px)] text-center">
              <p className="text-[13.5px] font-bold text-[#B39AD9] tracking-wide">
                Tap an answer. Then SWIPE
              </p>
            </div>
          )}
        </section>
      </div>

      {/* =================================================================== */}
      {/* 6. BOTTOM FEEDBACK SHEET (Docked Full-Width Mint/Rose — Screen 04)  */}
      {/* =================================================================== */}
      {isAnswered && (
        <div
          className={`relative z-20 w-full mt-4 rounded-t-[28px] px-4 sm:px-6 pt-5 pb-[max(env(safe-area-inset-bottom,0px),16px)] text-[#1D0547] shadow-[0_-10px_30px_rgba(12,2,28,0.45)] ${
            isCorrect ? 'bg-[#B7F7D4]' : 'bg-[#FFD9DC]'
          }`}
        >
          <div className="w-full max-w-[840px] mx-auto">
            {/* Headline + XP Pill */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2
                className="text-[22px] sm:text-[25px] font-bold text-[#1D0547] leading-tight"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                {isCorrect ? 'Correct! You sabi am!' : 'Not quite — check why'}
              </h2>

              <span className="px-3.5 py-1.5 rounded-full bg-[#260559] text-[#FFE51E] font-extrabold text-[14px] tabular-nums whitespace-nowrap shrink-0">
                {isCorrect ? `+${lastRecord?.xpEarned ?? combo.xpPerCorrect} XP` : 'Learn & go'}
              </span>
            </div>

            {/* Dark-Purple Combo Up Banner (Matches Screen 04) */}
            {isCorrect && comboUpBanner && comboUpBanner >= 2 && (
              <div className="mb-3 rounded-[16px] bg-[#2A085E] px-4 py-3 flex items-center justify-between gap-3 text-[#FFE51E]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Flame size={18} className="text-[#FF7A00] fill-[#FF7A00] shrink-0" />
                  <span className="text-[13.5px] sm:text-[14.5px] font-extrabold leading-snug">
                    Combo up! Every correct answer now pays x
                  </span>
                </div>
                <span className="text-[18px] font-extrabold tabular-nums shrink-0">
                  {comboUpBanner}×
                </span>
              </div>
            )}

            {/* Combo Sub-Line */}
            {isCorrect && (
              <div className="text-[13px] sm:text-[13.5px] font-extrabold text-[#1D0547] mb-1.5">
                x{combo.multiplier} combo · {combo.xpPerCorrect} XP per correct answer
              </div>
            )}

            {/* Concise or Full Explanation (with Pidgin toggle in Guided mode) */}
            <div className="text-[14px] sm:text-[15px] font-semibold text-[#240B52] leading-[1.45]">
              {usePidgin
                ? currentQuestion.explanationPidgin
                : pace === 'guided'
                ? currentQuestion.explanationFull
                : currentQuestion.explanationShort}
            </div>

            {(pace === 'guided' || aiConfig.explanationStyle === 'pidgin_friendly') && (
              <button
                type="button"
                onClick={() => setUsePidgin(prev => !prev)}
                className="mt-2 text-xs font-extrabold text-[#5B14C9] underline underline-offset-4 cursor-pointer"
              >
                {usePidgin ? 'Show Standard English explanation' : 'Explain am in Naija Pidgin'}
              </button>
            )}

            {/* SWIPE UP FOR NEXT Interactive Trigger */}
            <button
              type="button"
              onClick={handleAdvance}
              className="mt-4 w-full py-2.5 rounded-[16px] hover:bg-black/5 active:scale-[0.99] transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            >
              <ChevronUp size={20} strokeWidth={3} className="text-[#260559]" />
              <span className="text-[12.5px] font-extrabold uppercase tracking-[0.08em] text-[#260559]">
                {pace === 'guided' && records.length >= CHECKPOINT_INTERVAL
                  ? 'SEE SESSION RESULTS'
                  : 'SWIPE UP FOR NEXT'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* EXIT / FINISH EARLY SHEET (Allows seeing Screen 06 Results anytime) */}
      {/* =================================================================== */}
      {showExitConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Finish practice session"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs px-4"
          onClick={() => setShowExitConfirm(false)}
        >
          <div
            className="w-full max-w-[400px] rounded-[26px] bg-white p-5 sm:p-6 text-[#260559]"
            style={{ boxShadow: '0 6px 0 #E2C700' }}
            onClick={e => e.stopPropagation()}
          >
            <h3
              className="text-[22px] font-bold text-[#260559] mb-1.5"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Wrap up this session?
            </h3>
            <p className="text-[14px] font-semibold text-[#4F3B73] leading-relaxed mb-5">
              You’ve answered {records.length} question{records.length === 1 ? '' : 's'} and
              earned +{sessionXp} XP. You can finish now and see your Coach breakdown, or keep
              going.
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => finishAndOpenResults(records)}
                className="w-full py-3.5 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[15.5px] uppercase tracking-wide cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #46099E',
                }}
              >
                Finish and see results
              </button>

              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="w-full py-3 rounded-[16px] bg-[#F3EEFD] hover:bg-[#EAE0FC] text-[#260559] font-extrabold text-[14.5px] cursor-pointer"
              >
                Keep practising
              </button>

              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full py-2 text-[13px] font-bold text-[#6E5C91] hover:text-[#260559] cursor-pointer"
              >
                Exit to Home without saving
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
