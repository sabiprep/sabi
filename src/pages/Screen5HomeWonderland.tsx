import React, { useMemo } from 'react';
import { Calendar, Flame, Monitor, SlidersHorizontal, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { loadPracticeAiConfig } from '../utils/sabiAiPracticeConfig';
import { sound } from '../utils/soundEffects';

/**
 * Illustrated Student Avatar inside Purple Ring with Orange Level Badge (`L7`)
 */
function StudentAvatarBadge({ level }: { level: number }) {
  return (
    <div className="relative w-[54px] h-[54px] sm:w-[58px] sm:h-[58px] shrink-0 select-none">
      <div className="w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-full p-[3px] bg-[#711AE3] shadow-[0_3px_0_#480A99]">
        <div className="w-full h-full rounded-full bg-[#FFE6C7] overflow-hidden flex items-end justify-center relative">
          <svg
            viewBox="0 0 64 64"
            className="w-full h-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle cx="32" cy="32" r="32" fill="#FFE8CE" />
            <path
              d="M12 64C12 50.5 20.5 44 32 44C43.5 44 52 50.5 52 64H12Z"
              fill="#6C19E5"
            />
            <circle cx="19" cy="24" r="6.5" fill="#2A120A" />
            <circle cx="45" cy="24" r="6.5" fill="#2A120A" />
            <circle cx="32" cy="20" r="11" fill="#2A120A" />
            <rect x="28" y="37" width="8" height="9" rx="4" fill="#9A5B36" />
            <circle cx="32" cy="29" r="10.5" fill="#A6653E" />
            <path
              d="M21.5 27C22.5 20.5 27 18.5 32 18.5C37 18.5 41.5 20.5 42.5 27C39 24.5 35.5 23.5 32 23.5C28.5 23.5 25 24.5 21.5 27Z"
              fill="#2A120A"
            />
            <circle cx="28" cy="29.5" r="1.4" fill="#260559" />
            <circle cx="36" cy="29.5" r="1.4" fill="#260559" />
            <path
              d="M28.5 33.8C29.8 35.3 34.2 35.3 35.5 33.8"
              stroke="#4A2112"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <span className="absolute -bottom-1 -right-1 px-1.5 py-[1px] rounded-full bg-[#FF7A00] border-2 border-white text-white text-[10px] font-extrabold leading-tight tracking-tight shadow-xs">
        L{level}
      </span>
    </div>
  );
}

/**
 * Circular SVG Mastery Ring (ENG 72%, MATH 64%, PHY 58%, CHM 41%)
 */
function SubjectMasteryRing({
  shortCode,
  percent,
  ringColor,
  textColor,
}: {
  shortCode: string;
  percent: number;
  ringColor: string;
  textColor: string;
}) {
  const size = 72;
  const strokeWidth = 7;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] lg:w-[82px] lg:h-[82px] flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-full h-full -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#EDE8F8"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[13px] sm:text-[14px] lg:text-[15px] font-extrabold text-[#260559] tracking-tight">
          {shortCode}
        </span>
      </div>
      <span
        className="mt-1.5 text-[14px] sm:text-[15px] font-extrabold tabular-nums"
        style={{ color: textColor }}
      >
        {clamped}%
      </span>
    </div>
  );
}

function ConcentricTargetIcon({
  size = 24,
  color = '#6C19E5',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="11" stroke={color} strokeWidth="2.6" />
      <circle cx="14" cy="14" r="6.3" stroke={color} strokeWidth="2.4" />
      <circle cx="14" cy="14" r="2.5" fill={color} />
    </svg>
  );
}

/**
 * SCREEN 5 (`/home`): JAMB PREP HOME DASHBOARD
 * Full-bleed edge-to-edge fit on mobile/Android APK, expanding cleanly into a wide
 * 2-column 12-grid dashboard from `md:` upwards with zero boxed inner framing.
 */
export function Screen5HomeWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);

  const goalPercent = Math.min(100, Math.round((data.dailyGoalDone / data.dailyGoalTarget) * 100));
  const xpRemaining = Math.max(0, data.dailyGoalTarget - data.dailyGoalDone);
  const goalSize = 60;
  const goalStroke = 6.5;
  const goalRadius = (goalSize - goalStroke) / 2;
  const goalCircumference = 2 * Math.PI * goalRadius;
  const goalOffset = goalCircumference - (goalPercent / 100) * goalCircumference;

  const goTo = (path: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore audio error
    }
    navigate(path);
  };

  const aiConfig = useMemo(
    () => loadPracticeAiConfig(data.subjects.map(s => s.canonicalName)),
    [data.subjects]
  );
  const recommendedPace = aiConfig.blueprint?.recommendedPace || 'guided';

  const focusCanonical =
    data.subjects.find(s => s.displayLabel === data.recommendedSubject)?.canonicalName ||
    data.subjects[3]?.canonicalName ||
    'Chemistry';

  return (
    <SabiAppChrome
      activeTab="home"
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1380px] mx-auto px-3 sm:px-5 lg:px-8 pt-3 sm:pt-5 lg:pt-7">
        {/* =============================================================== */}
        {/* 1. TOP GREETING HEADER + STREAK & XP PILLS                      */}
        {/* =============================================================== */}
        <header className="flex items-center justify-between gap-2.5 mb-3.5 sm:mb-5 lg:mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => goTo('/profile')}
              aria-label="Open profile"
              className="cursor-pointer focus-visible:outline-2 focus-visible:outline-[#6C19E5] rounded-full"
            >
              <StudentAvatarBadge level={data.level} />
            </button>
            <div className="min-w-0">
              <h1
                className="text-[22px] sm:text-[26px] lg:text-[30px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                Oya, {data.firstName}!
              </h1>
              <p className="text-[13.5px] sm:text-[14.5px] font-semibold text-[#3C2263] leading-snug">
                Make we sabi something today.
              </p>
            </div>
          </div>

          {/* Right: Streak, XP Tactile White Pills & 3-Dash Menu Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => goTo('/progress')}
              aria-label={`${data.streakDays} day streak`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full bg-white text-[#260559] font-extrabold text-[13.5px] sm:text-[15px] tabular-nums transition-transform active:translate-y-[1px] cursor-pointer whitespace-nowrap"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <Flame size={15} className="text-[#FF7A00] fill-[#FF7A00] shrink-0" />
              <span>{data.streakDays}</span>
            </button>

            <button
              type="button"
              onClick={() => goTo('/progress')}
              aria-label={`${data.xpBalance.toLocaleString()} XP`}
              className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-full bg-white text-[#260559] font-extrabold text-[13.5px] sm:text-[15px] tabular-nums transition-transform active:translate-y-[1px] cursor-pointer whitespace-nowrap"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <Zap size={14} className="text-[#711AE3] fill-[#711AE3] shrink-0" />
              <span>{data.xpBalance.toLocaleString()}</span>
            </button>

            <SabiMenuTriggerButton />
          </div>
        </header>

        {/* =============================================================== */}
        {/* RESPONSIVE BODY: Full-width stack on mobile, 12-col from `md:`  */}
        {/* =============================================================== */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (7/12 on Tablet & Desktop) */}
          <div className="md:col-span-7 space-y-3.5 sm:space-y-4">
            {/* 2. MASTERY ESTIMATE CARD */}
            <section
              className="bg-white rounded-[22px] px-4 py-4 sm:px-6 sm:py-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3.5 sm:mb-4">
                <h2 className="text-[16.5px] sm:text-[18px] font-extrabold text-[#260559]">
                  Mastery estimate
                </h2>
                <span className="text-[12px] sm:text-[13px] font-semibold text-[#5E4A80] whitespace-nowrap">
                  Not a JAMB score
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-4">
                {data.subjects.map(subj => (
                  <button
                    key={subj.canonicalName}
                    type="button"
                    onClick={() =>
                      goTo(`/practice?focus=${encodeURIComponent(subj.canonicalName)}`)
                    }
                    className="flex flex-col items-center rounded-2xl py-1.5 hover:bg-[#FAF7FF] transition-colors cursor-pointer"
                  >
                    <SubjectMasteryRing
                      shortCode={subj.shortCode}
                      percent={subj.percent}
                      ringColor={subj.ringColor}
                      textColor={subj.textColor}
                    />
                  </button>
                ))}
              </div>
            </section>

            {/* 3. JAMB EXAM COUNTDOWN BANNER */}
            <section
              className="w-full rounded-[20px] bg-[#2A085E] px-4 sm:px-6 py-3.5 sm:py-4 flex items-center gap-3 text-white"
              style={{ boxShadow: '0 4px 0 #170338' }}
            >
              <Calendar size={21} strokeWidth={2.4} className="text-[#FFE51E] shrink-0" />
              <div className="flex items-baseline gap-2 flex-wrap">
                <span
                  className="text-[21px] sm:text-[24px] font-bold text-[#FFE51E] tabular-nums leading-none"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {data.daysToJamb} days
                </span>
                <span className="text-[14.5px] sm:text-[15.5px] font-bold text-[#EAE1FA]">
                  to your JAMB exam
                </span>
              </div>
            </section>

            {/* 4. DAILY GOAL & WEEKLY STREAK CARD */}
            <section
              className="bg-white rounded-[22px] px-4 py-4 sm:px-6 sm:py-5 flex items-center gap-3.5 sm:gap-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="relative w-[58px] h-[58px] sm:w-[64px] sm:h-[64px] shrink-0 flex items-center justify-center">
                <svg
                  viewBox={`0 0 ${goalSize} ${goalSize}`}
                  className="w-full h-full -rotate-90"
                  aria-hidden="true"
                >
                  <circle
                    cx={goalSize / 2}
                    cy={goalSize / 2}
                    r={goalRadius}
                    fill="none"
                    stroke="#EDE8F8"
                    strokeWidth={goalStroke}
                  />
                  <circle
                    cx={goalSize / 2}
                    cy={goalSize / 2}
                    r={goalRadius}
                    fill="none"
                    stroke="#059669"
                    strokeWidth={goalStroke}
                    strokeLinecap="round"
                    strokeDasharray={goalCircumference}
                    strokeDashoffset={goalOffset}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11.5px] sm:text-[12.5px] font-extrabold text-[#260559] tabular-nums">
                  {data.dailyGoalDone}/{data.dailyGoalTarget}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-[15.5px] sm:text-[17px] font-extrabold text-[#260559] mb-2.5 truncate">
                  {xpRemaining > 0
                    ? `Daily goal · ${xpRemaining} XP to go`
                    : 'Daily goal complete!'}
                </div>
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {data.weeklyDays.map((day, idx) => (
                    <div key={`${day.label}-${idx}`} className="flex flex-col items-center gap-1">
                      {day.status === 'done' ? (
                        <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded-full bg-[#FF7A00] flex items-center justify-center">
                          <Flame size={15} className="text-white fill-white" />
                        </div>
                      ) : day.status === 'today' ? (
                        <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded-full border-[2px] border-dashed border-[#FF7A00] bg-transparent" />
                      ) : (
                        <div className="w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded-full bg-[#F1ECFA]" />
                      )}
                      <span className="text-[11px] sm:text-[12px] font-bold text-[#5A467A] leading-none">
                        {day.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* 5. RECOMMENDED ACTION CARD (SABI PICKED THIS FOR YOU) */}
            <section
              className="bg-white rounded-[22px] px-4 py-4 sm:px-6 sm:py-5 border-[2.5px] border-[#6C19E5]"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="inline-block px-3 py-1 rounded-full bg-[#EFE6FF] text-[#6C19E5] text-[11px] font-extrabold tracking-[0.04em] uppercase whitespace-nowrap">
                  SABI PICKED THIS FOR YOU
                </span>
                <span className="text-[13px] font-bold text-[#5A467A] whitespace-nowrap tabular-nums">
                  ~{data.recommendedMinutes} min
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-[18.5px] sm:text-[20px] font-extrabold text-[#260559] leading-tight truncate">
                    {data.recommendedTopic}
                  </h2>
                  <p className="mt-0.5 text-[13.5px] sm:text-[14px] font-semibold text-[#5A467A] truncate">
                    {data.recommendedEvidence}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    goTo(
                      `/practice/session?pace=${recommendedPace}&focus=${encodeURIComponent(
                        focusCanonical
                      )}`
                    )
                  }
                  className="px-5 sm:px-6 py-3 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[15px] tracking-[0.04em] uppercase shrink-0 transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer whitespace-nowrap"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #46099E',
                  }}
                >
                  START
                </button>
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (5/12 on Tablet & Desktop) */}
          <div className="md:col-span-5 space-y-3.5 sm:space-y-4">
            {/* 6. SMART PRACTICE FEATURE HUB (GUIDED + BLITZ) */}
            <section
              className="relative overflow-hidden rounded-[24px] bg-[#711AE3] p-4 sm:p-5 lg:p-6 text-white"
              style={{ boxShadow: '0 5px 0 #480A99' }}
            >
              <div
                className="pointer-events-none absolute -top-5 -right-8 w-44 h-44 rounded-full bg-[#8D3DFF]/55"
                aria-hidden="true"
              />

              <div className="relative z-10 flex items-baseline justify-between gap-2 mb-3.5 sm:mb-4">
                <h2
                  className="text-[20px] sm:text-[22px] font-bold text-white leading-tight whitespace-nowrap"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  Smart Practice
                </h2>
                <span className="text-[12px] sm:text-[13px] font-bold text-[#E6D5FF] whitespace-nowrap">
                  SABI picks · you set the pace
                </span>
              </div>

              <div className="relative z-10 grid grid-cols-2 gap-3">
                {/* Guided Mode Card */}
                <button
                  type="button"
                  onClick={() => goTo('/practice?pace=guided')}
                  className="rounded-[18px] bg-white px-3.5 sm:px-4 py-3.5 sm:py-4 text-left flex items-center gap-2.5 sm:gap-3 transition-transform duration-100 active:translate-y-[1.5px] hover:bg-[#FCF9FF] cursor-pointer min-h-[74px]"
                  style={{ boxShadow: '0 4px 0 #D8C7F7' }}
                >
                  <ConcentricTargetIcon size={25} color="#6C19E5" />
                  <div className="min-w-0">
                    <div className="text-[16px] sm:text-[17px] font-extrabold text-[#260559] leading-tight truncate">
                      Guided
                    </div>
                    <div className="text-[12px] sm:text-[12.5px] font-semibold text-[#5A467A] leading-tight mt-0.5 truncate">
                      Adaptive set
                    </div>
                  </div>
                </button>

                {/* Blitz Mode Card */}
                <button
                  type="button"
                  onClick={() => goTo('/practice?pace=blitz')}
                  className="rounded-[18px] bg-[#FFEB2B] px-3.5 sm:px-4 py-3.5 sm:py-4 text-left flex items-center gap-2.5 sm:gap-3 transition-transform duration-100 active:translate-y-[1.5px] hover:brightness-105 cursor-pointer min-h-[74px]"
                  style={{ boxShadow: '0 4px 0 #D6B500' }}
                >
                  <Zap size={24} className="text-[#6C19E5] fill-[#6C19E5] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[16px] sm:text-[17px] font-extrabold text-[#260559] leading-tight truncate">
                      Blitz
                    </div>
                    <div className="text-[12px] sm:text-[12.5px] font-semibold text-[#4B3612] leading-tight mt-0.5 truncate">
                      Rapid-fire feed
                    </div>
                  </div>
                </button>
              </div>
            </section>

            {/* 7. SECONDARY MODES: CBT SIMULATOR & CUSTOM */}
            <section className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => goTo('/cbt')}
                className="rounded-[20px] bg-white px-3.5 sm:px-4 py-3.5 sm:py-4 text-left flex items-center gap-2.5 sm:gap-3 transition-transform duration-100 active:translate-y-[1.5px] hover:bg-[#FFFDF5] cursor-pointer min-h-[74px]"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-[#FFEBD6] text-[#C2410C] flex items-center justify-center shrink-0">
                  <Monitor size={21} strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14.5px] sm:text-[15.5px] font-extrabold text-[#260559] leading-tight truncate">
                    CBT Simulator
                  </div>
                  <div className="text-[12px] font-semibold text-[#5A467A] leading-tight mt-0.5 truncate">
                    Real exam timer
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => goTo('/practice/custom')}
                className="rounded-[20px] bg-white px-3.5 sm:px-4 py-3.5 sm:py-4 text-left flex items-center gap-2.5 sm:gap-3 transition-transform duration-100 active:translate-y-[1.5px] hover:bg-[#FFFDF5] cursor-pointer min-h-[74px]"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[13px] bg-[#DEF7EC] text-[#047857] flex items-center justify-center shrink-0">
                  <SlidersHorizontal size={20} strokeWidth={2.3} />
                </div>
                <div className="min-w-0">
                  <div className="text-[14.5px] sm:text-[15.5px] font-extrabold text-[#260559] leading-tight truncate">
                    Custom
                  </div>
                  <div className="text-[12px] font-semibold text-[#5A467A] leading-tight mt-0.5 truncate">
                    You choose
                  </div>
                </div>
              </button>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
