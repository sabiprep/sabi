import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  Share2,
  X,
  XCircle,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  buildCustomPracticeDeck,
  loadCustomPracticeConfig,
  recordCustomRunSummary,
  recordMistakeInVault,
  type CustomPracticeConfig,
} from '../utils/cbtAndCustomEngine';
import {
  getShortSubjectLabel,
  type PracticeFeedQuestion,
} from '../utils/smartPracticeSession';
import {
  hydrateSavedSnapshotsFromServer,
  loadSavedQuestionSnapshots,
  normalizeCanonicalQuestionId,
  toggleQuestionSnapshot,
  type QuestionSnapshotRecord,
} from '../utils/questionSnapshotStore';
import { QuestionShareSheet } from '../components/common/QuestionShareSheet';
import { loadPracticeAiConfig } from '../utils/sabiAiPracticeConfig';
import {
  recordSessionDurationBonus,
  recordStudyActivity,
} from '../utils/userProgressStore';
import { sound } from '../utils/soundEffects';

const OPTION_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

/**
 * SCREEN 17 (`/practice/custom/session`): CUSTOM PRACTICE LIVE RUNNER
 * Clean, simple, well-fitted Wonderland practice runner supporting instant
 * or end-of-set explanations, optional timer, bookmarking, and full results review.
 */
export function Screen17CustomPracticeSessionWonderland() {
  const navigate = useNavigate();
  const location = useLocation();
  const student = useMemo(() => getWonderlandDashboardState(), []);
  const mySubjects = useMemo(() => student.subjects.map(s => s.canonicalName), [student.subjects]);
  const aiConfig = useMemo(() => loadPracticeAiConfig(mySubjects), [mySubjects]);

  const config: CustomPracticeConfig = useMemo(() => {
    const fromState = (location.state as { config?: CustomPracticeConfig } | null)?.config;
    return fromState || loadCustomPracticeConfig(mySubjects);
  }, [location.state, mySubjects]);

  const deck = useMemo(() => buildCustomPracticeDeck(config), [config]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [savedSnapshots, setSavedSnapshots] = useState<QuestionSnapshotRecord[]>(() =>
    loadSavedQuestionSnapshots()
  );
  const [snapshotToast, setSnapshotToast] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{
    question: PracticeFeedQuestion & { year?: number };
    wasAnswered: boolean;
    selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  } | null>(null);
  const [usePidgin, setUsePidgin] = useState(
    () => aiConfig.explanationStyle === 'pidgin_friendly'
  );
  const [secondsLeft, setSecondsLeft] = useState<number | null>(
    config.timerMinutes ? config.timerMinutes * 60 : null
  );
  const [finished, setFinished] = useState(false);
  const sessionStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let active = true;
    void hydrateSavedSnapshotsFromServer().then((res) => {
      if (active) setSavedSnapshots(res.snapshots);
    });
    return () => {
      active = false;
    };
  }, []);

  const isQuestionSaved = (questionId: string) => {
    const canonical = normalizeCanonicalQuestionId(questionId);
    return savedSnapshots.some(
      (s) => s.canonicalQuestionId === canonical || s.questionId === questionId
    );
  };

  const handleToggleSnapshot = (
    question: PracticeFeedQuestion & { year?: number },
    wasAnswered: boolean,
    pickedOption: 'A' | 'B' | 'C' | 'D' | null
  ) => {
    const res = toggleQuestionSnapshot({
      question,
      mode: 'custom',
      wasAnswered,
      selectedOption: pickedOption,
      isCorrect: wasAnswered && pickedOption ? pickedOption === question.answer : null,
      explanationStyle: usePidgin ? 'pidgin' : 'english',
    });
    setSavedSnapshots(res.all);
    const msg =
      res.action === 'updated'
        ? 'Snapshot updated with your answer!'
        : res.action === 'saved'
        ? wasAnswered
          ? 'Answered snapshot saved to Vault!'
          : 'Unanswered snapshot saved to try later!'
        : 'Snapshot removed from Vault';
    setSnapshotToast(msg);
    window.setTimeout(() => {
      setSnapshotToast((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  const currentQuestion = deck[currentIdx] || deck[0];
  const selected = answers[currentIdx] ?? null;
  const showInstantFeedback = config.feedbackTiming === 'instant' && selected !== null;
  const isCorrectNow = selected !== null && selected === currentQuestion.answer;

  const completeSession = () => {
    if (finished) return;
    setFinished(true);
    const totalElapsedSec = Math.max(
      15,
      Math.round((Date.now() - sessionStartedAtRef.current) / 1000)
    );
    const answeredCount = Object.keys(answers).length;
    const perQuestionSec = Math.max(
      6,
      Math.round(totalElapsedSec / Math.max(1, answeredCount))
    );

    let correctCount = 0;
    deck.forEach((q, idx) => {
      const picked = answers[idx];
      if (!picked) return;
      const isRight = picked === q.answer;
      if (isRight) {
        correctCount += 1;
      } else {
        recordMistakeInVault(q, picked);
      }
      recordStudyActivity({
        subject: q.subjectCanonical,
        topic: q.topicLabel,
        isCorrect: isRight,
        mode: 'custom',
        elapsedSeconds: perQuestionSec,
      });
    });

    if (answeredCount > 0) {
      recordSessionDurationBonus({
        mode: 'custom',
        durationSeconds: totalElapsedSec,
        completionBonusXp: Math.max(8, correctCount * 2),
      });
    }

    const accuracy = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;
    recordCustomRunSummary({
      id: `cust-${Date.now()}`,
      completedAt: new Date().toISOString(),
      subjectsLabel: config.onlyMistakesOrSaved
        ? 'Mistakes & Saved Drill'
        : config.subjects.map(getShortSubjectLabel).join(' · '),
      correctCount,
      totalQuestions: deck.length,
      accuracyPercent: accuracy,
    });
    try {
      if (accuracy >= 60) {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } });
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (finished || secondsLeft === null) return;
    if (secondsLeft <= 0) {
      completeSession();
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft(prev => (prev === null ? null : Math.max(0, prev - 1)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [finished, secondsLeft]);

  const handlePick = (opt: 'A' | 'B' | 'C' | 'D') => {
    if (config.feedbackTiming === 'instant' && selected !== null) return;
    try {
      if (config.feedbackTiming === 'instant' && opt === currentQuestion.answer) {
        sound.playSuccess();
      } else {
        sound.playTap();
      }
    } catch {
      // ignore
    }
    setAnswers(prev => ({ ...prev, [currentIdx]: opt }));
    if (config.feedbackTiming === 'instant' && opt !== currentQuestion.answer) {
      recordMistakeInVault(currentQuestion, opt);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 >= deck.length) {
      completeSession();
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  // =========================================================================
  // SUMMARY VIEW WHEN COMPLETED
  // =========================================================================
  if (finished) {
    const correctCount = deck.filter((q, idx) => answers[idx] === q.answer).length;
    const accuracy = deck.length > 0 ? Math.round((correctCount / deck.length) * 100) : 0;

    return (
      <div
        className="min-h-[100dvh] w-full bg-[#FFE824] text-[#260559] pt-[env(safe-area-inset-top,0px)] pb-[max(env(safe-area-inset-bottom,0px),24px)]"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
        }}
      >
        <main className="w-full max-w-[920px] mx-auto px-3.5 sm:px-6 pt-5 space-y-4">
          <section
            className="rounded-[26px] bg-[#2A085E] p-5 sm:p-7 text-white text-center"
            style={{ boxShadow: '0 6px 0 #170338' }}
          >
            <span className="inline-block px-3 py-1 rounded-full bg-white/14 text-[#FFE51E] text-[11px] font-extrabold uppercase tracking-wider">
              CUSTOM PRACTICE COMPLETE
            </span>
            <h1
              className="mt-2 text-[34px] sm:text-[42px] font-bold text-[#FFE51E] tabular-nums leading-none"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {correctCount}/{deck.length} ({accuracy}%)
            </h1>
            <p className="mt-2 text-[14px] font-semibold text-[#D9C7FA]">
              {accuracy >= 75
                ? 'Solid mastery! Keep this momentum rolling into CBT Mock mode.'
                : 'Great practice run. Review the missed explanations below to lock in the concepts.'}
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => navigate('/practice/custom')}
                className="px-5 py-3 rounded-[16px] bg-[#FFE824] text-[#260559] font-extrabold text-[14px] uppercase tracking-wide inline-flex items-center gap-1.5 cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #C7AD00',
                }}
              >
                <RotateCcw size={16} />
                <span>New Custom Set</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="px-5 py-3 rounded-[16px] bg-white/14 hover:bg-white/22 text-white font-extrabold text-[14px] cursor-pointer"
              >
                Back to Home
              </button>
            </div>
          </section>

          {/* Answer Review List */}
          <section
            className="bg-white rounded-[24px] p-4 sm:p-6 space-y-3"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[18px] font-extrabold text-[#260559]">Full Set Review</h2>
              <button
                type="button"
                onClick={() => setUsePidgin(prev => !prev)}
                className="px-3 py-1.5 rounded-full bg-[#F3EEFD] text-[#6C19E5] text-[12px] font-extrabold cursor-pointer"
              >
                {usePidgin ? 'Naija Pidgin: ON' : 'Explain in Pidgin'}
              </button>
            </div>

            {deck.map((q, idx) => {
              const userAns = answers[idx] ?? null;
              const ok = userAns === q.answer;
              return (
                <div
                  key={`${q.id}-${idx}`}
                  className={`rounded-[16px] border p-3.5 ${
                    ok ? 'border-[#A7F3D0] bg-[#F7FEF9]' : 'border-[#FECACA] bg-[#FFF8F8]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 text-[11.5px] font-extrabold text-[#6C19E5]">
                      {ok ? (
                        <CheckCircle2 size={15} className="text-[#059669]" />
                      ) : (
                        <XCircle size={15} className="text-[#DC2626]" />
                      )}
                      <span>
                        Q{idx + 1} · {q.subjectLabel} · {q.topicLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        aria-label="Save question snapshot"
                        onClick={() => handleToggleSnapshot(q, Boolean(userAns), userAns)}
                        className={`w-8 h-8 rounded-[10px] flex items-center justify-center cursor-pointer ${
                          isQuestionSaved(q.id)
                            ? 'bg-[#2A085E] text-[#FFE51E]'
                            : 'bg-white text-[#260559] border border-[#E5D7FA]'
                        }`}
                      >
                        <Bookmark size={14} className={isQuestionSaved(q.id) ? 'fill-[#FFE51E]' : ''} />
                      </button>
                      <button
                        type="button"
                        aria-label="Share question snapshot"
                        onClick={() =>
                          setShareTarget({
                            question: q,
                            wasAnswered: Boolean(userAns),
                            selectedOption: userAns,
                          })
                        }
                        className="w-8 h-8 rounded-[10px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center cursor-pointer"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                  <p className="text-[14.5px] font-extrabold text-[#260559] mb-1.5">
                    {q.question}
                  </p>
                  <div className="text-[12.5px] font-bold flex flex-wrap gap-3 mb-2">
                    <span className={ok ? 'text-[#059669]' : 'text-[#DC2626]'}>
                      You picked: {userAns || 'Skipped'}
                    </span>
                    <span className="text-[#059669]">
                      Correct: {q.answer} ({q.options[q.answer]})
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold text-[#3B2264] leading-relaxed">
                    {usePidgin ? q.explanationPidgin : q.explanationFull}
                  </p>
                </div>
              );
            })}
          </section>
        </main>

        {shareTarget && (
          <QuestionShareSheet
            open={Boolean(shareTarget)}
            onClose={() => setShareTarget(null)}
            question={shareTarget.question}
            mode="custom"
            wasAnswered={shareTarget.wasAnswered}
            selectedOption={shareTarget.selectedOption}
            usePidgin={usePidgin}
          />
        )}
      </div>
    );
  }

  // =========================================================================
  // LIVE CUSTOM PRACTICE VIEW
  // =========================================================================
  const progressPct = Math.round(((currentIdx + 1) / deck.length) * 100);
  const isSaved = isQuestionSaved(currentQuestion.id);

  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col bg-[#FFE824] text-[#260559] pt-[env(safe-area-inset-top,0px)] pb-[max(env(safe-area-inset-bottom,0px),14px)]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
      }}
    >
      <main className="flex-1 w-full max-w-[880px] mx-auto px-3.5 sm:px-6 pt-3.5 sm:pt-5 flex flex-col">
        {/* Top Bar */}
        <header className="flex items-center justify-between gap-2.5 mb-3.5">
          <button
            type="button"
            onClick={() => navigate('/practice/custom')}
            aria-label="Exit custom practice"
            className="w-[42px] h-[42px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center cursor-pointer shrink-0"
            style={{ boxShadow: '0 3px 0 #E2C700' }}
          >
            <X size={20} strokeWidth={2.7} />
          </button>

          {/* Progress Track */}
          <div className="flex-1 flex items-center gap-2.5">
            <div className="flex-1 h-3 rounded-full bg-white/80 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-[#6C19E5] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[13px] font-extrabold text-[#260559] tabular-nums shrink-0">
              {currentIdx + 1}/{deck.length}
            </span>
          </div>

          {/* Optional Timer + Save */}
          <div className="flex items-center gap-1.5 shrink-0">
            {secondsLeft !== null && (
              <span className="px-3 py-1.5 rounded-full bg-[#2A085E] text-[#FFE51E] font-mono text-[13px] font-extrabold tabular-nums inline-flex items-center gap-1">
                <Clock size={13} />
                {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, '0')}
              </span>
            )}
            <button
              type="button"
              onClick={() =>
                handleToggleSnapshot(currentQuestion, showInstantFeedback, selected)
              }
              aria-label="Save question snapshot"
              className={`w-[42px] h-[42px] rounded-[14px] flex items-center justify-center cursor-pointer ${
                isSaved ? 'bg-[#2A085E] text-[#FFE51E]' : 'bg-white text-[#260559]'
              }`}
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <Bookmark size={18} className={isSaved ? 'fill-[#FFE51E]' : ''} />
            </button>
            <button
              type="button"
              onClick={() =>
                setShareTarget({
                  question: currentQuestion,
                  wasAnswered: showInstantFeedback,
                  selectedOption: selected,
                })
              }
              aria-label="Share question snapshot"
              className="w-[42px] h-[42px] rounded-[14px] bg-white text-[#6C19E5] flex items-center justify-center cursor-pointer"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <Share2 size={18} />
            </button>
          </div>
        </header>

        {snapshotToast && (
          <div className="mb-3 px-4 py-2 rounded-full bg-[#2A085E] text-[#FFE51E] text-[12px] font-bold self-start inline-flex items-center gap-2.5">
            <span>{snapshotToast}</span>
            <button
              type="button"
              onClick={() => navigate('/mistakes?tab=saved')}
              className="px-2.5 py-0.5 rounded-full bg-[#FFE51E] text-[#260559] font-extrabold text-[11px] cursor-pointer"
            >
              View Vault →
            </button>
          </div>
        )}

        {/* Main Question Card */}
        <section
          className="bg-white rounded-[26px] p-4 sm:p-6 flex-1 flex flex-col"
          style={{ boxShadow: '0 4px 0 #E2C700' }}
        >
          <div className="flex items-center flex-wrap gap-2 mb-3">
            <span className="px-3 py-1 rounded-full bg-[#EFE6FF] text-[#6C19E5] text-[12px] font-extrabold">
              {currentQuestion.subjectLabel}
            </span>
            <span className="text-[13px] font-bold text-[#5A467A]">
              {currentQuestion.topicLabel}
            </span>
          </div>

          <h1 className="text-[18.5px] sm:text-[21px] font-extrabold text-[#260559] leading-[1.4] mb-5 whitespace-pre-line">
            {currentQuestion.question}
          </h1>

          {/* 4 Options */}
          <div className="space-y-2.5 sm:space-y-3">
            {OPTION_KEYS.map(letter => {
              const isPicked = selected === letter;
              const isRightOpt = letter === currentQuestion.answer;

              let styleClass =
                'bg-[#F8F5FF] hover:bg-[#EFE6FF] text-[#260559] border border-[#E7DCFA]';
              let badgeClass = 'bg-white text-[#6C19E5] border border-[#DFCFFA]';

              if (showInstantFeedback) {
                if (isRightOpt) {
                  styleClass = 'bg-[#10B968] text-white border border-[#088247]';
                  badgeClass = 'bg-white text-[#088247]';
                } else if (isPicked && !isRightOpt) {
                  styleClass = 'bg-[#E5484D] text-white border border-[#A82328]';
                  badgeClass = 'bg-white text-[#A82328]';
                } else {
                  styleClass = 'bg-[#F8F5FF]/60 text-[#260559]/60 border border-transparent';
                }
              } else if (isPicked) {
                styleClass = 'bg-[#6C19E5] text-white border border-[#46099E]';
                badgeClass = 'bg-[#FFE824] text-[#260559]';
              }

              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => handlePick(letter)}
                  className={`w-full rounded-[18px] px-4 py-3.5 min-h-[56px] flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${styleClass}`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-extrabold text-[14px] shrink-0 ${badgeClass}`}
                    >
                      {letter}
                    </span>
                    <span className="text-[15.5px] font-bold leading-snug">
                      {currentQuestion.options[letter]}
                    </span>
                  </div>
                  {showInstantFeedback && isRightOpt && <Check size={20} strokeWidth={3} />}
                  {showInstantFeedback && isPicked && !isRightOpt && (
                    <X size={20} strokeWidth={3} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Instant Feedback Box */}
          {showInstantFeedback && (
            <div
              className={`mt-4 rounded-[18px] p-4 ${
                isCorrectNow ? 'bg-[#D8F8E8] text-[#11422C]' : 'bg-[#FFE2E5] text-[#5C1219]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[15px] font-extrabold">
                  {isCorrectNow ? 'Correct! You sabi am!' : `Correct answer: Option ${currentQuestion.answer}`}
                </span>
                <button
                  type="button"
                  onClick={() => setUsePidgin(prev => !prev)}
                  className="text-[11.5px] font-extrabold underline cursor-pointer"
                >
                  {usePidgin ? 'Standard English' : 'Naija Pidgin'}
                </button>
              </div>
              <p className="text-[13.5px] font-semibold leading-relaxed">
                {usePidgin ? currentQuestion.explanationPidgin : currentQuestion.explanationFull}
              </p>
            </div>
          )}

          {/* Footer Action */}
          <div className="mt-auto pt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={completeSession}
              className="px-4 py-3 rounded-[15px] bg-[#F5F0FF] text-[#4A356E] font-extrabold text-[13.5px] cursor-pointer"
            >
              Finish Early
            </button>

            <button
              type="button"
              disabled={!selected && config.feedbackTiming === 'instant'}
              onClick={handleNext}
              className="flex-1 sm:flex-none sm:min-w-[220px] py-3.5 px-6 rounded-[18px] bg-[#6C19E5] disabled:opacity-45 hover:brightness-105 text-white font-bold text-[16px] uppercase tracking-wide inline-flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 4px 0 #46099E',
              }}
            >
              <span>{currentIdx + 1 >= deck.length ? 'See Summary' : 'Next Question'}</span>
              <ArrowRight size={18} strokeWidth={2.7} />
            </button>
          </div>
        </section>
      </main>

      {shareTarget && (
        <QuestionShareSheet
          open={Boolean(shareTarget)}
          onClose={() => setShareTarget(null)}
          question={shareTarget.question}
          mode="custom"
          wasAnswered={shareTarget.wasAnswered}
          selectedOption={shareTarget.selectedOption}
          usePidgin={usePidgin}
        />
      )}
    </div>
  );
}
