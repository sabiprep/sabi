import React, { useMemo, useState } from 'react';
import { Flame, Trophy } from 'lucide-react';
import { SabiAppChrome } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { sound } from '../utils/soundEffects';

/**
 * SCREEN 7 (`/progress`): YOUR PROGRESS, STREAKS & LEAGUE
 * Built 1:1 from Uploaded Image `07___Progress___streaks_7ec43b15.png` for mobile/Android APK,
 * expanding into a balanced 2-column desktop workspace on `lg:` viewports.
 */
export function Screen7ProgressWonderland() {
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const [selectedDay, setSelectedDay] = useState<number | null>(23);

  const daysToBeatRecord = Math.max(1, data.longestStreak - data.streakDays);
  const activeDayDetail = data.calendarDays.find(item => item.day === selectedDay) || null;

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[440px] lg:max-w-[1060px] mx-auto px-5 sm:px-6 lg:px-9 pt-5 sm:pt-7 lg:pt-8">
        {/* 1. PAGE TITLE */}
        <header className="mb-4 sm:mb-5 lg:mb-7">
          <h1
            className="text-[30px] sm:text-[34px] font-bold text-[#260559] leading-tight tracking-[-0.01em]"
            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
          >
            Your progress
          </h1>
        </header>

        {/* RESPONSIVE BODY: Vertical stack on Mobile, 2-Column Layout on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (6/12 on Desktop): Streak Hero + Monthly Practice Calendar */}
          <div className="lg:col-span-6 space-y-4">
            {/* 2. ORANGE STREAK HERO BANNER */}
            <section
              className="rounded-[26px] bg-[#FF7A00] px-5 py-5 sm:px-6 sm:py-6 text-white flex items-center gap-4 sm:gap-5"
              style={{ boxShadow: '0 5px 0 #C45600' }}
            >
              <div className="w-[54px] h-[54px] sm:w-[60px] sm:h-[60px] flex items-center justify-center shrink-0">
                <Flame size={46} className="text-white fill-white" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <h2
                  className="text-[28px] sm:text-[32px] font-bold text-white leading-[1.1] tabular-nums"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {data.streakDays}-day streak
                </h2>
                <p className="mt-1.5 text-[14.5px] sm:text-[15.5px] font-bold text-white/95 leading-snug">
                  Longest ever: {data.longestStreak} days. {daysToBeatRecord} more to beat it!
                </p>
              </div>
            </section>

            {/* 3. MONTHLY PRACTICE CALENDAR CARD */}
            <section
              className="bg-white rounded-[24px] px-4 py-4 sm:px-5 sm:py-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="text-[18px] sm:text-[19px] font-extrabold text-[#260559]">
                  {data.calendarMonth}
                </h2>
                <span className="text-[13px] font-bold text-[#5E4A80] whitespace-nowrap">
                  Days you practised
                </span>
              </div>

              {/* 7-Column Calendar Grid (Days 1–30) */}
              <div className="grid grid-cols-7 gap-2">
                {data.calendarDays.map(cell => {
                  const isSelected = selectedDay === cell.day;
                  let cellClasses =
                    'bg-[#FAF8FF] text-[#6E5C91] hover:bg-[#F3EEFD]';

                  if (cell.status === 'practised') {
                    cellClasses = 'bg-[#FF7A00] text-white hover:brightness-105';
                  } else if (cell.status === 'today') {
                    cellClasses =
                      'bg-[#FF7A00] text-white ring-[2.5px] ring-[#260559] ring-offset-0';
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
                      className={`aspect-square rounded-[12px] flex items-center justify-center text-[14px] sm:text-[15px] font-extrabold tabular-nums transition-transform duration-100 active:scale-95 cursor-pointer ${cellClasses}`}
                    >
                      {cell.day}
                    </button>
                  );
                })}
              </div>

              {/* Quiet Selected Day Context Footer */}
              {activeDayDetail && (
                <div className="mt-4 pt-3 border-t border-[#F3EEFD] flex items-center justify-between text-[12.5px] font-bold text-[#5A467A]">
                  <span>
                    {data.calendarMonth} {activeDayDetail.day}
                    {activeDayDetail.status === 'today' ? ' · Today' : ''}
                  </span>
                  <span className="text-[#260559] font-extrabold tabular-nums">
                    {activeDayDetail.status === 'practised' || activeDayDetail.status === 'today'
                      ? `${activeDayDetail.xpEarned || 30} XP earned`
                      : activeDayDetail.status === 'missed'
                      ? 'Rest day'
                      : 'Upcoming'}
                  </span>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT COLUMN (6/12 on Desktop): Gold League Leaderboard */}
          <div className="lg:col-span-6 space-y-4">
            {/* 4. GOLD LEAGUE LEADERBOARD CARD */}
            <section
              className="bg-white rounded-[24px] px-4 py-4 sm:px-5 sm:py-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-[38px] h-[38px] rounded-[12px] bg-[#FFE36E] text-[#8F5900] flex items-center justify-center shrink-0">
                    <Trophy size={20} strokeWidth={2.3} />
                  </div>
                  <h2 className="text-[18px] sm:text-[19px] font-extrabold text-[#260559] truncate">
                    {data.leagueName}
                  </h2>
                </div>
                <span className="text-[12.5px] sm:text-[13px] font-bold text-[#5E4A80] whitespace-nowrap shrink-0">
                  {data.leagueMeta}
                </span>
              </div>

              {/* Ranked Student Rows */}
              <div className="space-y-2">
                {data.leagueRows.map(row => (
                  <React.Fragment key={row.rank}>
                    {row.rank === 6 && (
                      <div className="py-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                        <div className="flex-1 h-px bg-[#D1FAE5]" />
                        <span>Top 5 move up</span>
                        <div className="flex-1 h-px bg-[#D1FAE5]" />
                      </div>
                    )}
                    <div
                      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-[16px] ${
                        row.isCurrentUser ? 'bg-[#F3ECFF]' : 'bg-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span
                          className={`w-5 text-center text-[16px] font-extrabold tabular-nums shrink-0 ${
                            row.rank <= 3 ? 'text-[#B45309]' : 'text-[#5E4A80]'
                          }`}
                        >
                          {row.rank}
                        </span>
                        <div
                          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-extrabold text-[15px] shrink-0"
                          style={{ backgroundColor: row.avatarBg }}
                        >
                          {row.initial}
                        </div>
                        <span className="text-[16px] font-extrabold text-[#260559] truncate">
                          {row.name}
                        </span>
                      </div>

                      <span className="text-[15.5px] font-extrabold text-[#260559] tabular-nums whitespace-nowrap shrink-0">
                        {row.xp.toLocaleString()} XP
                      </span>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
