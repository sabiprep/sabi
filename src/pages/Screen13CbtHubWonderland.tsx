import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  Check,
  Clock,
  FileCheck2,
  History,
  Lock,
  Monitor,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  loadCbtMockHistory,
  type CbtMockPreset,
} from '../utils/cbtAndCustomEngine';
import { sound } from '../utils/soundEffects';

/**
 * SCREEN 13 (`/cbt`): CBT EXAM SIMULATOR DASHBOARD
 * Full-bleed responsive SABI Wonderland dashboard for launching strict JAMB UTME
 * Full Mock (180Q / 120m) or Quick Mock (40Q / 30m) simulations.
 */
export function Screen13CbtHubWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const history = useMemo(() => loadCbtMockHistory(), []);
  const [preset, setPreset] = useState<CbtMockPreset>('quick_40');

  const bestScore = useMemo(() => {
    if (history.length === 0) return null;
    return Math.max(...history.map(h => h.scaledUtme400));
  }, [history]);

  const handleSelectPreset = (next: CbtMockPreset) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setPreset(next);
  };

  const handleStartExam = () => {
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }
    navigate(`/cbt/exam?preset=${preset}`);
  };

  return (
    <SabiAppChrome
      activeTab="cbt"
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7 pb-4">
        {/* 1. HEADER */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h1
              className="text-[28px] sm:text-[34px] font-bold text-[#260559] leading-tight truncate"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              CBT Simulator
            </h1>
            <p className="text-[13.5px] sm:text-[15px] font-semibold text-[#3C2263] leading-snug">
              Real JAMB UTME exam hall conditions. Strict timer, zero hints.
            </p>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* RESPONSIVE BODY: Full-width stack on Mobile, 12-Col Dashboard from `md:` */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (7/12): Mode Selector + Subject Breakdown + CTA */}
          <div className="md:col-span-7 space-y-4">
            {/* Hero Status Banner */}
            <section
              className="rounded-[24px] bg-[#2A085E] px-4 py-4 sm:px-6 sm:py-5 text-white flex items-center justify-between gap-4"
              style={{ boxShadow: '0 5px 0 #170338' }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-[52px] h-[52px] rounded-[16px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
                  <Monitor size={26} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#FFE51E]">
                    OFFICIAL-STYLE CBT MODE
                  </div>
                  <h2 className="mt-0.5 text-[17.5px] sm:text-[20px] font-extrabold text-white leading-snug">
                    {preset === 'full_180'
                      ? '180 Questions · 120 Minutes'
                      : '40 Questions · 30 Minutes'}
                  </h2>
                  <p className="text-[13px] font-medium text-[#D9C7FA]">
                    4 subjects · built-in calculator · flag & question navigator
                  </p>
                </div>
              </div>

              {bestScore !== null && (
                <div className="hidden sm:flex flex-col items-end shrink-0 pl-3 border-l border-white/15">
                  <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#FFE51E]">
                    Best Mock
                  </span>
                  <span
                    className="text-[24px] font-bold text-white tabular-nums leading-tight"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    {bestScore}/400
                  </span>
                </div>
              )}
            </section>

            {/* Choose Exam Format */}
            <section className="space-y-3">
              <div className="text-[12.5px] font-extrabold uppercase tracking-[0.06em] text-[#351766]">
                SELECT MOCK FORMAT
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Quick Mock 40Q */}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('quick_40')}
                  aria-pressed={preset === 'quick_40'}
                  className={`relative text-left rounded-[22px] bg-white p-4 sm:p-5 transition-all cursor-pointer ${
                    preset === 'quick_40'
                      ? 'border-[2.5px] border-[#6C19E5]'
                      : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
                  }`}
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#FF7A00] text-white text-[10px] font-extrabold uppercase tracking-wider">
                    FAST CHECK
                  </span>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="w-11 h-11 rounded-[14px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
                      <Clock size={22} strokeWidth={2.4} />
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        preset === 'quick_40'
                          ? 'bg-[#6C19E5] text-white'
                          : 'border-2 border-[#6C19E5]'
                      }`}
                    >
                      {preset === 'quick_40' && <Check size={15} strokeWidth={3} />}
                    </div>
                  </div>
                  <div className="text-[18px] font-extrabold text-[#260559]">Quick CBT Mock</div>
                  <div className="text-[13.5px] font-extrabold text-[#6C19E5] mt-0.5">
                    40 Questions · 30 mins
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-[#5A467A] leading-snug">
                    10 questions per subject across all 4 JAMB subjects. Great for weekday exam
                    stamina.
                  </p>
                </button>

                {/* Full UTME Mock 180Q */}
                <button
                  type="button"
                  onClick={() => handleSelectPreset('full_180')}
                  aria-pressed={preset === 'full_180'}
                  className={`relative text-left rounded-[22px] bg-white p-4 sm:p-5 transition-all cursor-pointer ${
                    preset === 'full_180'
                      ? 'border-[2.5px] border-[#6C19E5]'
                      : 'border-[2.5px] border-transparent hover:border-[#D8C5FA]'
                  }`}
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 rounded-full bg-[#2A085E] text-[#FFE51E] text-[10px] font-extrabold uppercase tracking-wider">
                    FULL UTME
                  </span>
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="w-11 h-11 rounded-[14px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center shrink-0">
                      <FileCheck2 size={22} strokeWidth={2.4} />
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        preset === 'full_180'
                          ? 'bg-[#6C19E5] text-white'
                          : 'border-2 border-[#6C19E5]'
                      }`}
                    >
                      {preset === 'full_180' && <Check size={15} strokeWidth={3} />}
                    </div>
                  </div>
                  <div className="text-[18px] font-extrabold text-[#260559]">Full JAMB Mock</div>
                  <div className="text-[13.5px] font-extrabold text-[#6C19E5] mt-0.5">
                    180 Questions · 2 hours
                  </div>
                  <p className="mt-1.5 text-[13px] font-semibold text-[#5A467A] leading-snug">
                    60 Use of English + 40 each for your 3 subjects. Complete official UTME layout.
                  </p>
                </button>
              </div>
            </section>

            {/* Your 4 Registered JAMB Subjects for this Sitting */}
            <section
              className="bg-white rounded-[22px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-[16px] sm:text-[17.5px] font-extrabold text-[#260559]">
                  Your 4 Exam Subjects
                </h2>
                <button
                  type="button"
                  onClick={() => navigate('/subjects')}
                  className="text-[12.5px] font-extrabold text-[#6C19E5] hover:underline cursor-pointer"
                >
                  Change subjects
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {data.subjects.map((subj, idx) => {
                  const qCount =
                    preset === 'full_180' ? (idx === 0 ? 60 : 40) : 10;
                  return (
                    <div
                      key={subj.canonicalName}
                      className="rounded-[16px] bg-[#F8F5FF] border border-[#E7DCFA] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6C19E5]">
                          {subj.shortCode}
                        </span>
                        {idx === 0 && (
                          <Lock size={12} className="text-[#6E5C91]" aria-label="Compulsory" />
                        )}
                      </div>
                      <div className="mt-1 text-[14px] font-extrabold text-[#260559] truncate">
                        {subj.displayLabel}
                      </div>
                      <div className="mt-0.5 text-[12px] font-bold text-[#5A467A] tabular-nums">
                        {qCount} questions
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Start CTA */}
            <button
              type="button"
              onClick={handleStartExam}
              className="w-full py-4 px-6 rounded-[22px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[18px] sm:text-[19px] tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 transition-transform duration-100 active:translate-y-[2px] cursor-pointer"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 5px 0 #46099E',
              }}
            >
              <span>
                {preset === 'full_180' ? 'START 180-Q CBT MOCK' : 'START 40-Q QUICK MOCK'}
              </span>
              <ArrowRight size={20} strokeWidth={2.8} />
            </button>
          </div>

          {/* RIGHT COLUMN (5/12): Strict Exam Rules + Past Mock History */}
          <div className="md:col-span-5 space-y-4">
            {/* Strict Exam Hall Rules Card */}
            <section
              className="bg-white rounded-[22px] p-4 sm:p-5 border-[2px] border-[#6C19E5]/20"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-[11px] bg-[#FFEBD6] text-[#C2410C] flex items-center justify-center shrink-0">
                  <ShieldAlert size={19} strokeWidth={2.4} />
                </div>
                <h2 className="text-[16.5px] font-extrabold text-[#260559]">
                  Strict CBT Exam Rules
                </h2>
              </div>

              <ul className="space-y-2.5 text-[13.5px] font-semibold text-[#4A356E]">
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-[#6C19E5] shrink-0" />
                  <span>
                    <strong className="text-[#260559]">No AI Coach or hints</strong> appear while
                    the exam clock is running.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-[#6C19E5] shrink-0" />
                  <span>
                    Switch freely between all 4 subjects, flag tricky questions, and use the
                    on-screen JAMB calculator.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1 w-2 h-2 rounded-full bg-[#6C19E5] shrink-0" />
                  <span>
                    Auto-submits when the timer hits <strong className="text-[#260559]">00:00</strong>{' '}
                    and unlocks full script review with worked solutions.
                  </span>
                </li>
              </ul>
            </section>

            {/* Recent CBT Attempts */}
            <section
              className="bg-white rounded-[22px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-[#6C19E5]" />
                  <h2 className="text-[16.5px] font-extrabold text-[#260559]">
                    Recent CBT Mocks
                  </h2>
                </div>
                <span className="text-[11.5px] font-bold text-[#6E5C91]">
                  Estimate · not official JAMB
                </span>
              </div>

              {history.length === 0 ? (
                <div className="rounded-[16px] bg-[#FAF7FF] border border-dashed border-[#D8C5FA] p-4 text-center">
                  <Award size={26} className="mx-auto text-[#711AE3] mb-1.5" />
                  <p className="text-[13.5px] font-bold text-[#260559]">No CBT mocks taken yet</p>
                  <p className="mt-0.5 text-[12.5px] font-semibold text-[#5A467A]">
                    Start a 30-minute Quick Mock to benchmark your real exam readiness.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {history.slice(0, 4).map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => navigate('/cbt/results', { state: { result: item } })}
                      className="w-full rounded-[16px] bg-[#FAF7FF] hover:bg-[#F2E9FF] border border-[#E7DCFA] px-3.5 py-3 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-extrabold text-[#260559] truncate">
                          {item.title}
                        </div>
                        <div className="text-[12px] font-semibold text-[#5A467A]">
                          {item.correctCount}/{item.totalQuestions} correct · {item.accuracyPercent}%
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className="text-[18px] font-bold text-[#6C19E5] tabular-nums leading-none"
                          style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                        >
                          {item.scaledUtme400}
                        </div>
                        <div className="text-[10.5px] font-bold text-[#6E5C91]">/400 est.</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Quick shortcut to Diagnostic if unsure */}
              <button
                type="button"
                onClick={() => navigate('/diagnostic')}
                className="mt-3.5 w-full rounded-[15px] bg-[#FFF8D6] hover:bg-[#FFF2B5] border border-[#F0D75B] px-3.5 py-2.5 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Sparkles size={16} className="text-[#6C19E5] shrink-0" />
                  <span className="text-[13px] font-extrabold text-[#260559] truncate">
                    Want a shorter 12-Q baseline first? Try Diagnostic
                  </span>
                </div>
                <ArrowRight size={15} className="text-[#6C19E5] shrink-0" />
              </button>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
