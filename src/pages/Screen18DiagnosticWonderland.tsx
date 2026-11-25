import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Compass,
  RotateCcw,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { SabiBrandEmblem } from '../components/common/SabiBrandEmblem';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  buildDiagnosticDeck,
  loadDiagnosticBaseline,
  saveDiagnosticBaseline,
  type DiagnosticBaselineResult,
} from '../utils/cbtAndCustomEngine';
import { getShortSubjectLabel } from '../utils/smartPracticeSession';
import {
  recordSessionDurationBonus,
  recordStudyActivity,
} from '../utils/userProgressStore';
import { sound } from '../utils/soundEffects';

const OPTION_KEYS: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

/**
 * SCREEN 18 (`/diagnostic`): SHORT ADAPTIVE JAMB DIAGNOSTIC
 * 12-question baseline across the student's 4 JAMB subjects (3 per subject)
 * that produces a transparent Mastery Estimate baseline without forcing a 180-Q mock.
 */
export function Screen18DiagnosticWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const mySubjects = useMemo(() => data.subjects.map(s => s.canonicalName), [data.subjects]);
  const existingBaseline = useMemo(() => loadDiagnosticBaseline(), []);

  const [phase, setPhase] = useState<'intro' | 'running' | 'report'>(
    existingBaseline ? 'report' : 'intro'
  );
  const [deck, setDeck] = useState(() => buildDiagnosticDeck(mySubjects));
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, 'A' | 'B' | 'C' | 'D'>>({});
  const [report, setReport] = useState<DiagnosticBaselineResult | null>(existingBaseline);
  const startedAtRef = useRef<number>(Date.now());

  const startDiagnostic = () => {
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }
    startedAtRef.current = Date.now();
    setDeck(buildDiagnosticDeck(mySubjects));
    setIdx(0);
    setAnswers({});
    setPhase('running');
  };

  const handleSelect = (opt: 'A' | 'B' | 'C' | 'D') => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    const nextAnswers = { ...answers, [idx]: opt };
    setAnswers(nextAnswers);

    if (idx + 1 < deck.length) {
      window.setTimeout(() => setIdx(prev => prev + 1), 160);
    } else {
      // Grade diagnostic strictly on real performance — no artificial floors
      const totalElapsedSec = Math.max(
        20,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );
      const perQuestionSec = Math.max(6, Math.round(totalElapsedSec / Math.max(1, deck.length)));
      const totals: Record<string, { correct: number; total: number }> = {};
      let correctCount = 0;

      deck.forEach((q, i) => {
        const isRight = nextAnswers[i] === q.answer;
        const bucket = totals[q.subjectCanonical] || { correct: 0, total: 0 };
        bucket.total += 1;
        if (isRight) {
          bucket.correct += 1;
          correctCount += 1;
        }
        totals[q.subjectCanonical] = bucket;
        recordStudyActivity({
          subject: q.subjectCanonical,
          topic: q.topicLabel,
          isCorrect: isRight,
          mode: 'diagnostic',
          elapsedSeconds: perQuestionSec,
        });
      });

      recordSessionDurationBonus({
        mode: 'diagnostic',
        durationSeconds: totalElapsedSec,
        completionBonusXp: 25,
      });

      const subjectMastery: Record<string, number> = {};
      Object.entries(totals).forEach(([subj, stats]) => {
        subjectMastery[subj] = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
      });

      const weakestEntry = Object.entries(subjectMastery).sort((a, b) => a[1] - b[1])[0];
      const nextReport: DiagnosticBaselineResult = {
        completedAt: new Date().toISOString(),
        overallPercent: Math.round((correctCount / deck.length) * 100),
        subjectMastery,
        weakestSubjectCanonical: weakestEntry?.[0] || mySubjects[3] || 'Chemistry',
        weakestSubjectLabel: getShortSubjectLabel(
          weakestEntry?.[0] || mySubjects[3] || 'Chemistry'
        ),
        totalQuestions: deck.length,
        correctCount,
      };
      saveDiagnosticBaseline(nextReport);
      setReport(nextReport);
      setPhase('report');
      try {
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.45 } });
      } catch {
        // ignore
      }
    }
  };

  if (phase === 'running') {
    const q = deck[idx] || deck[0];
    const progress = Math.round(((idx + 1) / deck.length) * 100);
    return (
      <div
        className="min-h-[100dvh] w-full bg-[#FFE824] text-[#260559] pt-[env(safe-area-inset-top,0px)] pb-[max(env(safe-area-inset-bottom,0px),16px)] flex flex-col"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
        }}
      >
        <main className="flex-1 w-full max-w-[820px] mx-auto px-3.5 sm:px-6 pt-4 flex flex-col">
          <header className="flex items-center gap-3 mb-4">
            <button
              type="button"
              onClick={() => setPhase('intro')}
              className="w-[42px] h-[42px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={21} strokeWidth={2.7} />
            </button>
            <div className="flex-1 h-3 rounded-full bg-white/80 overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-[#6C19E5] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[13px] font-extrabold tabular-nums">
              {idx + 1}/{deck.length}
            </span>
          </header>

          <section
            className="bg-white rounded-[26px] p-5 sm:p-6 flex-1 flex flex-col"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full bg-[#EFE6FF] text-[#6C19E5] text-[12px] font-extrabold">
                Diagnostic · {q.subjectLabel}
              </span>
              <span className="text-[12.5px] font-bold text-[#5A467A]">{q.topicLabel}</span>
            </div>

            <h1 className="text-[18.5px] sm:text-[21px] font-extrabold text-[#260559] leading-[1.4] mb-5">
              {q.question}
            </h1>

            <div className="space-y-3 mt-auto">
              {OPTION_KEYS.map(letter => {
                const picked = answers[idx] === letter;
                return (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => handleSelect(letter)}
                    className={`w-full rounded-[18px] px-4 py-3.5 min-h-[56px] flex items-center gap-3 text-left transition-all cursor-pointer ${
                      picked
                        ? 'bg-[#6C19E5] text-white'
                        : 'bg-[#F8F5FF] hover:bg-[#EFE6FF] text-[#260559] border border-[#E7DCFA]'
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-extrabold text-[14px] shrink-0 ${
                        picked ? 'bg-[#FFE824] text-[#260559]' : 'bg-white text-[#6C19E5]'
                      }`}
                    >
                      {letter}
                    </span>
                    <span className="text-[15.5px] font-bold leading-snug">{q.options[letter]}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <SabiAppChrome
      activeTab="home"
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1100px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 pb-6">
        <header className="flex items-center justify-between gap-3 mb-4">
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
                JAMB Diagnostic
              </h1>
              <p className="text-[13.5px] font-semibold text-[#3C2263]">
                Quick 12-question baseline across all 4 subjects — no 180-question stress.
              </p>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {phase === 'report' && report ? (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6">
            <section
              className="md:col-span-7 rounded-[26px] bg-[#2A085E] p-5 sm:p-6 text-white"
              style={{ boxShadow: '0 5px 0 #170338' }}
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/14 text-[#FFE51E] text-[11px] font-extrabold uppercase tracking-wider">
                <CheckCircle2 size={13} />
                Diagnostic Complete
              </span>
              <h2
                className="mt-2.5 text-[28px] sm:text-[34px] font-bold text-[#FFE51E] leading-tight"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                {report.correctCount}/{report.totalQuestions} baseline accuracy ({report.overallPercent}%)
              </h2>
              <p className="mt-1.5 text-[14px] font-semibold text-[#D9C7FA]">
                Priority focus detected: <strong className="text-white">{report.weakestSubjectLabel}</strong>.
                SABI has updated your Smart Practice recommendations.
              </p>

              <div className="mt-5 space-y-3">
                {Object.entries(report.subjectMastery).map(([subj, pct]) => (
                  <div key={subj}>
                    <div className="flex justify-between text-[13.5px] font-extrabold mb-1">
                      <span>{getShortSubjectLabel(subj)}</span>
                      <span className="text-[#FFE51E] tabular-nums">{pct}% est.</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#FFE824]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="md:col-span-5 bg-white rounded-[26px] p-5 sm:p-6 flex flex-col justify-between gap-4"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div>
                <h3 className="text-[18px] font-extrabold text-[#260559]">
                  Recommended Next Step
                </h3>
                <p className="mt-1.5 text-[13.5px] font-semibold text-[#5A467A] leading-relaxed">
                  Start a focused Smart Practice session in{' '}
                  <strong className="text-[#260559]">{report.weakestSubjectLabel}</strong> to lift
                  your lowest mastery estimate quickly.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/practice/session?pace=smart&focus=${encodeURIComponent(
                        report.weakestSubjectCanonical
                      )}`
                    )
                  }
                  className="w-full py-3.5 px-5 rounded-[18px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[16px] uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #46099E',
                  }}
                >
                  <span>Drill {report.weakestSubjectLabel} Now</span>
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  onClick={startDiagnostic}
                  className="w-full py-3 rounded-[16px] bg-[#F5F0FF] hover:bg-[#EAE0FC] text-[#260559] font-extrabold text-[14px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw size={15} />
                  <span>Retake 12-Q Diagnostic</span>
                </button>
              </div>
            </section>
          </div>
        ) : (
          <section
            className="bg-white rounded-[26px] p-5 sm:p-7 max-w-[760px]"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="w-14 h-14 rounded-[18px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center mb-4">
              <Compass size={28} strokeWidth={2.4} />
            </div>
            <h2
              className="text-[24px] sm:text-[28px] font-bold text-[#260559] leading-tight"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Find your exact starting point in ~6 minutes
            </h2>
            <p className="mt-2 text-[14.5px] font-semibold text-[#4F3B73] leading-relaxed">
              Answer 3 quick questions from each of your 4 JAMB subjects ({data.subjects.map(s => s.displayLabel).join(', ')}).
              SABI uses your baseline to pinpoint weak topics immediately.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startDiagnostic}
                className="px-6 py-4 rounded-[20px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[17px] uppercase tracking-wide inline-flex items-center gap-2 cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 5px 0 #46099E',
                }}
              >
                <SabiBrandEmblem size={20} />
                <span>Start 12-Q Diagnostic</span>
              </button>
            </div>
          </section>
        )}
      </main>
    </SabiAppChrome>
  );
}
