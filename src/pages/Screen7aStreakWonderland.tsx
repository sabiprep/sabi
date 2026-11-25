import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { sound } from '../utils/soundEffects';

const STREAK_MILESTONES = [
  { days: 3, title: '3-Day Spark', desc: 'Build the daily JAMB habit' },
  { days: 7, title: '7-Day Consistent', desc: 'Full week without skipping' },
  { days: 14, title: '14-Day Grinder', desc: 'Two weeks of real momentum' },
  { days: 30, title: '30-Day Scholar', desc: 'Elite UTME exam discipline' },
];

/**
 * SCREEN 7A (`/progress/streak`): MY STREAK DIRECTORY SCREEN
 * Full streak tracker with daily status CTA, interactive monthly calendar,
 * weekly flames strip, and real streak milestones.
 */
export function Screen7aStreakWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const [selectedDay, setSelectedDay] = useState<number | null>(data.calendarTodayDay);

  const daysToBeatRecord = Math.max(1, data.longestStreak - data.streakDays + 1);
  const activeDayDetail = data.calendarDays.find(item => item.day === selectedDay) || null;
  const practicedDaysThisMonth = data.calendarDays.filter(
    d => d.status === 'practised' || (d.status === 'today' && data.practicedToday)
  ).length;

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1280px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7 pb-5">
        {/* TOP BAR */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/progress')}
              aria-label="Back to Progress Hub"
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#29065E] flex items-center justify-center transition-transform active:translate-y-[1px] cursor-pointer shrink-0"
              style={{ boxShadow: '0 3.5px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.8} />
            </button>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#5B21B6]">
                PROGRESS · MY STREAK
              </div>
              <h1
                className="text-[26px] sm:text-[32px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                My Streak
              </h1>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (7/12): Streak Hero + Monthly Calendar */}
          <div className="md:col-span-7 space-y-4">
            {/* ORANGE STREAK HERO BANNER */}
            <section
              className="rounded-[24px] bg-[#FF7A00] px-5 py-5 sm:px-6 sm:py-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              style={{ boxShadow: '0 5px 0 #C45600' }}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-[58px] h-[58px] rounded-[18px] bg-white/20 flex items-center justify-center shrink-0">
                  <Flame size={40} className="text-white fill-white" strokeWidth={1.6} />
                </div>
                <div className="min-w-0">
                  <h2
                    className="text-[30px] sm:text-[34px] font-bold text-white leading-[1.08] tabular-nums"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    {data.streakDays}-day streak
                  </h2>
                  <p className="mt-1 text-[14px] sm:text-[15px] font-bold text-white/95 leading-snug">
                    {data.streakDays === 0 && data.longestStreak === 0
                      ? 'Complete your first practice session today to ignite your streak!'
                      : data.streakDays >= data.longestStreak && data.streakDays > 0
                      ? `Personal record! Longest ever: ${data.longestStreak} day${data.longestStreak === 1 ? '' : 's'}.`
                      : `Longest ever: ${data.longestStreak} day${data.longestStreak === 1 ? '' : 's'}. ${daysToBeatRecord} more to beat it!`}
                  </p>
                </div>
              </div>

              {!data.practicedToday && (
                <button
                  type="button"
                  onClick={() => navigate('/practice/setup?pace=blitz')}
                  className="px-4 py-3 rounded-[16px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[13.5px] uppercase tracking-wide inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #B89D00',
                  }}
                >
                  <Zap size={16} className="fill-[#6C19E5] text-[#6C19E5]" />
                  <span>{data.streakDays > 0 ? 'Protect Today' : 'Start Day 1'}</span>
                </button>
              )}
            </section>

            {/* MONTHLY PRACTICE CALENDAR CARD */}
            <section
              className="bg-white rounded-[24px] px-4 py-4 sm:px-6 sm:py-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-[18.5px] sm:text-[20px] font-extrabold text-[#260559]">
                    {data.calendarMonth}
                  </h2>
                  <p className="text-[12.5px] font-semibold text-[#5E4A80]">
                    {practicedDaysThisMonth} active day{practicedDaysThisMonth === 1 ? '' : 's'} logged this month
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#FFF0E0] text-[#C2410C] text-[12px] font-extrabold whitespace-nowrap">
                  Tap any day
                </span>
              </div>

              {/* 7-Column Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 sm:gap-2.5">
                {data.calendarDays.map(cell => {
                  const isSelected = selectedDay === cell.day;
                  let cellClasses = 'bg-[#FAF8FF] text-[#6E5C91] hover:bg-[#F3EEFD]';

                  if (cell.status === 'practised') {
                    cellClasses = 'bg-[#FF7A00] text-white hover:brightness-105';
                  } else if (cell.status === 'today') {
                    cellClasses = data.practicedToday
                      ? 'bg-[#FF7A00] text-white ring-[2.5px] ring-[#260559]'
                      : 'bg-[#FFF3E0] text-[#C2410C] ring-[2.5px] ring-[#FF7A00]';
                  } else if (cell.status === 'missed') {
                    cellClasses = 'bg-[#F2ECFC] text-[#5C487D] hover:bg-[#E9DFFA]';
                  }

                  return (
                    <button
                      key={cell.day}
                      type="button"
                      onClick={() => {
                        try {
                          sound.playTap();
                        } catch {
                          // ignore
                        }
                        setSelectedDay(cell.day);
                      }}
                      aria-label={`${data.calendarMonth} ${cell.day}, ${cell.status}`}
                      aria-pressed={isSelected}
                      className={`aspect-square rounded-[12px] flex items-center justify-center text-[14px] sm:text-[15.5px] font-extrabold tabular-nums transition-transform duration-100 active:scale-95 cursor-pointer ${cellClasses} ${
                        isSelected ? 'scale-[1.04] outline-2 outline-[#6C19E5]' : ''
                      }`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {activeDayDetail && (
                <div className="mt-4 pt-3.5 border-t border-[#F3EEFD] flex items-center justify-between text-[13px] sm:text-[14px] font-bold text-[#5A467A]">
                  <span>
                    {data.calendarMonth} {activeDayDetail.day}
                    {activeDayDetail.status === 'today' ? ' · Today' : ''}
                  </span>
                  <span className="text-[#260559] font-extrabold tabular-nums">
                    {activeDayDetail.status === 'practised' ||
                    (activeDayDetail.status === 'today' && data.practicedToday)
                      ? activeDayDetail.xpEarned && activeDayDetail.xpEarned > 0
                        ? `${activeDayDetail.xpEarned} XP earned`
                        : 'Session logged'
                      : activeDayDetail.status === 'today'
                      ? '0 XP today · Practice to keep streak'
                      : activeDayDetail.status === 'missed'
                      ? 'No practice logged'
                      : 'Upcoming'}
                  </span>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (5/12): Today's Status + Milestones */}
          <div className="md:col-span-5 space-y-4">
            {/* TODAY STATUS CARD */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <h2 className="text-[17px] font-extrabold text-[#260559] mb-3">
                This Week’s Rhythm
              </h2>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {data.weeklyDays.map((day, idx) => (
                  <div key={`${day.label}-${idx}`} className="flex flex-col items-center gap-1.5">
                    {day.status === 'done' ? (
                      <div className="w-9 h-9 rounded-full bg-[#FF7A00] flex items-center justify-center">
                        <Flame size={17} className="text-white fill-white" />
                      </div>
                    ) : day.status === 'today' ? (
                      <div className="w-9 h-9 rounded-full border-2 border-dashed border-[#FF7A00] bg-[#FFF8F0]" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#F1ECFA]" />
                    )}
                    <span className="text-[11.5px] font-extrabold text-[#5A467A]">{day.label}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-[16px] bg-[#FAF7FF] border border-[#E7DCFA] px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[12px] font-bold text-[#6E5C91]">Daily XP Goal</div>
                  <div className="text-[16px] font-extrabold text-[#260559] tabular-nums">
                    {data.dailyGoalDone} / {data.dailyGoalTarget} XP
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/practice/setup?pace=smart')}
                  className="px-3.5 py-2 rounded-[12px] bg-[#6C19E5] text-white text-[12.5px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Practise</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </section>

            {/* STREAK MILESTONES */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2 mb-3.5">
                <Award size={19} className="text-[#FF7A00]" />
                <h2 className="text-[17px] font-extrabold text-[#260559]">Streak Milestones</h2>
              </div>

              <div className="space-y-2.5">
                {STREAK_MILESTONES.map(ms => {
                  const unlocked = data.longestStreak >= ms.days;
                  const pct = Math.min(100, Math.round((data.longestStreak / ms.days) * 100));
                  return (
                    <div
                      key={ms.days}
                      className={`rounded-[16px] p-3.5 border ${
                        unlocked
                          ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                          : 'bg-[#FAF7FF] border-[#E7DCFA]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-[14px] font-extrabold text-[#260559] flex items-center gap-1.5">
                            {unlocked && <CheckCircle2 size={15} className="text-[#059669]" />}
                            <span>{ms.title}</span>
                          </div>
                          <div className="text-[12px] font-semibold text-[#5A467A]">{ms.desc}</div>
                        </div>
                        <span
                          className={`text-[12px] font-extrabold tabular-nums px-2.5 py-1 rounded-full shrink-0 ${
                            unlocked
                              ? 'bg-[#059669] text-white'
                              : 'bg-white text-[#6C19E5] border border-[#E7DCFA]'
                          }`}
                        >
                          {unlocked ? 'Unlocked' : `${Math.min(data.longestStreak, ms.days)}/${ms.days}d`}
                        </span>
                      </div>
                      {!unlocked && (
                        <div className="mt-2 w-full h-2 rounded-full bg-[#E9E0F7] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#FF7A00]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
