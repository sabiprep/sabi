import React, { useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Clock,
  Flame,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  LEAGUE_TIER_META,
  getMultiTierLeagueSnapshot,
  getSubjectRatingsSnapshot,
} from '../utils/progressInsightsEngine';
import { sound } from '../utils/soundEffects';

/**
 * SCREEN 7 (`/progress`): EXPANDED PROGRESS HUB DASHBOARD
 * Serves as the unified hub directing students into:
 *  1. My Streak (`/progress/streak`)
 *  2. My League Awards (`/progress/league`) — Unranked -> Blue -> Silver -> Gold
 *  3. Subject Performance Ratings (`/progress/subjects`) — Real mastery & topic weakness insights
 */
export function Screen7ProgressWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const league = useMemo(() => getMultiTierLeagueSnapshot(), []);
  const subjectRatings = useMemo(() => getSubjectRatingsSnapshot(), []);

  const goTo = (path: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    navigate(path);
  };

  const activeTierMeta =
    league.currentTier !== 'unranked' ? LEAGUE_TIER_META[league.currentTier] : null;

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7 pb-4">
        {/* 1. HEADER */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="min-w-0">
            <h1
              className="text-[30px] sm:text-[34px] lg:text-[36px] font-bold text-[#260559] leading-tight tracking-[-0.01em]"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Your progress
            </h1>
            <p className="text-[13.5px] sm:text-[15px] font-semibold text-[#3C2263] leading-snug">
              Real streak, league standings, and subject-by-subject mastery insights.
            </p>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* 2. REAL PERFORMANCE KPI STRIP */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 mb-4 sm:mb-5">
          <div
            className="bg-white rounded-[20px] px-3.5 py-3.5 sm:px-4 sm:py-4"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wider text-[#6E5C91]">
              <Zap size={14} className="text-[#6C19E5] fill-[#6C19E5]" />
              <span>Total XP</span>
            </div>
            <div
              className="mt-1 text-[23px] sm:text-[26px] font-bold text-[#260559] tabular-nums leading-none"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {data.xpBalance.toLocaleString()}
            </div>
          </div>

          <div
            className="bg-white rounded-[20px] px-3.5 py-3.5 sm:px-4 sm:py-4"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wider text-[#6E5C91]">
              <Target size={14} className="text-[#059669]" />
              <span>Avg Mastery</span>
            </div>
            <div
              className="mt-1 text-[23px] sm:text-[26px] font-bold text-[#059669] tabular-nums leading-none"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {subjectRatings.averageMastery}%
            </div>
          </div>

          <div
            className="bg-white rounded-[20px] px-3.5 py-3.5 sm:px-4 sm:py-4"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wider text-[#6E5C91]">
              <CheckCircle2 size={14} className="text-[#2563EB]" />
              <span>Solved</span>
            </div>
            <div
              className="mt-1 text-[23px] sm:text-[26px] font-bold text-[#260559] tabular-nums leading-none"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {data.totalQuestionsSolved}
            </div>
          </div>

          <div
            className="bg-white rounded-[20px] px-3.5 py-3.5 sm:px-4 sm:py-4"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold uppercase tracking-wider text-[#6E5C91]">
              <Clock size={14} className="text-[#EA580C]" />
              <span>Today Active</span>
            </div>
            <div
              className="mt-1 text-[23px] sm:text-[26px] font-bold text-[#260559] tabular-nums leading-none"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              {data.dailyStudyMinutes}m
            </div>
          </div>
        </section>

        {/* 3. MAIN DIRECTORY GRID (2 Columns on Tablet/Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (6/12): MY STREAK DIRECTORY + MY LEAGUE AWARDS DIRECTORY */}
          <div className="md:col-span-6 space-y-4">
            {/* DIRECTORY CARD 1: MY STREAK */}
            <button
              type="button"
              onClick={() => goTo('/progress/streak')}
              className="w-full text-left rounded-[24px] bg-[#FF7A00] hover:brightness-105 px-5 py-5 sm:px-6 sm:py-6 text-white transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer"
              style={{ boxShadow: '0 5px 0 #C45600' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-[54px] h-[54px] rounded-[16px] bg-white/20 flex items-center justify-center shrink-0">
                    <Flame size={34} className="text-white fill-white" strokeWidth={1.7} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#FFF1B8]">
                      MY STREAK
                    </div>
                    <h2
                      className="text-[26px] sm:text-[30px] font-bold text-white leading-tight tabular-nums"
                      style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      {data.streakDays}-day streak
                    </h2>
                    <p className="mt-0.5 text-[13.5px] font-bold text-white/95 leading-snug">
                      {data.practicedToday
                        ? `Safe today · Best ever: ${data.longestStreak} day${data.longestStreak === 1 ? '' : 's'}`
                        : data.streakDays > 0
                        ? `Practise today to protect your streak · Best: ${data.longestStreak}d`
                        : 'Start today to light up your Day 1 streak'}
                    </p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-1">
                  <ArrowRight size={20} strokeWidth={2.7} />
                </div>
              </div>

              {/* Compact 7-day mini strip inside card */}
              <div className="mt-4 pt-3.5 border-t border-white/20 grid grid-cols-7 gap-1.5">
                {data.weeklyDays.map((day, idx) => (
                  <div key={`${day.label}-${idx}`} className="flex flex-col items-center gap-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        day.status === 'done'
                          ? 'bg-[#FFE824] text-[#260559]'
                          : day.status === 'today'
                          ? 'border-2 border-dashed border-white bg-white/10'
                          : 'bg-white/15'
                      }`}
                    >
                      {day.status === 'done' && (
                        <Flame size={13} className="fill-[#FF7A00] text-[#FF7A00]" />
                      )}
                    </div>
                    <span className="text-[10.5px] font-extrabold text-white/90">{day.label}</span>
                  </div>
                ))}
              </div>
            </button>

            {/* DIRECTORY CARD 2: MY LEAGUE AWARDS (Unranked -> Blue -> Silver -> Gold) */}
            <button
              type="button"
              onClick={() => goTo('/progress/league')}
              className="w-full text-left rounded-[24px] bg-[#2A085E] hover:brightness-105 px-5 py-5 sm:px-6 sm:py-6 text-white transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer"
              style={{ boxShadow: '0 5px 0 #170338' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-[54px] h-[54px] rounded-[16px] flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: activeTierMeta ? activeTierMeta.badgeBg : '#3D157C',
                      color: activeTierMeta ? activeTierMeta.badgeText : '#FFE824',
                    }}
                  >
                    <Trophy size={29} strokeWidth={2.3} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#FFE51E]">
                      MY LEAGUE AWARDS
                    </div>
                    <h2
                      className="text-[24px] sm:text-[28px] font-bold text-white leading-tight truncate"
                      style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      {activeTierMeta ? activeTierMeta.name : 'Not in a League Yet'}
                    </h2>
                    <p className="mt-0.5 text-[13px] font-semibold text-[#D9C7FA] leading-snug">
                      {league.isPlaced
                        ? `Rank #${league.currentRank ?? '—'} · ${league.daysLeftInWeek}d left this week · Blue → Silver → Gold`
                        : 'Complete any practice activity to enter Blue League and climb to Silver & Gold.'}
                    </p>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full bg-white/14 flex items-center justify-center shrink-0 mt-1">
                  <ArrowRight size={20} strokeWidth={2.7} className="text-[#FFE51E]" />
                </div>
              </div>

              {/* League Progression Pills + Zone Status */}
              <div className="mt-4 pt-3.5 border-t border-white/15 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  {(['blue', 'silver', 'gold'] as const).map(t => {
                    const isCurrent = league.currentTier === t;
                    return (
                      <span
                        key={t}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider ${
                          isCurrent
                            ? 'bg-[#FFE824] text-[#260559]'
                            : 'bg-white/12 text-[#D5C3F7]'
                        }`}
                      >
                        {LEAGUE_TIER_META[t].shortLabel}
                      </span>
                    );
                  })}
                </div>

                {league.isPlaced ? (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold ${
                      league.currentZone === 'promote'
                        ? 'bg-[#059669]/25 text-[#6EE7B7]'
                        : league.currentZone === 'demote'
                        ? 'bg-[#DC2626]/25 text-[#FCA5A5]'
                        : 'bg-white/12 text-[#EAE1FA]'
                    }`}
                  >
                    {league.currentZone === 'promote' && <TrendingUp size={12} />}
                    {league.currentZone === 'demote' && <TrendingDown size={12} />}
                    {league.currentZone === 'safe' && <Shield size={12} />}
                    <span>
                      {league.currentZone === 'promote'
                        ? 'Promotion zone'
                        : league.currentZone === 'demote'
                        ? 'Demotion risk'
                        : 'Safe zone'}
                    </span>
                  </span>
                ) : (
                  <span className="text-[11.5px] font-extrabold text-[#FFE51E]">
                    View all 3 league tables →
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* RIGHT COLUMN (6/12): SUBJECT PERFORMANCE RATINGS DIRECTORY */}
          <div className="md:col-span-6 space-y-4">
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-[46px] h-[46px] rounded-[14px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center shrink-0">
                    <BarChart3 size={24} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#6C19E5]">
                      REAL MASTERY ESTIMATES
                    </div>
                    <h2 className="text-[19px] sm:text-[21px] font-extrabold text-[#260559] leading-tight">
                      Subject Performance Ratings
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => goTo('/progress/subjects')}
                  className="px-3.5 py-2 rounded-[13px] bg-[#6C19E5] hover:brightness-105 text-white text-[12.5px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  style={{ boxShadow: '0 3px 0 #46099E' }}
                >
                  <span>Inspect</span>
                  <ArrowRight size={14} strokeWidth={2.7} />
                </button>
              </div>

              <p className="text-[13px] font-semibold text-[#5A467A] mb-4">
                Tap any subject below to inspect topic-by-topic accuracy and see where SABI AI
                spotted issues.
              </p>

              {/* 4 Subject Real Rating Rows */}
              <div className="space-y-3">
                {subjectRatings.subjects.map(item => (
                  <button
                    key={item.subject.canonicalName}
                    type="button"
                    onClick={() =>
                      goTo(
                        `/progress/subjects?subject=${encodeURIComponent(
                          item.subject.canonicalName
                        )}`
                      )
                    }
                    className="w-full text-left rounded-[18px] bg-[#FAF7FF] hover:bg-[#F1E8FF] border border-[#E7DCFA] px-4 py-3.5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider text-white shrink-0"
                          style={{ backgroundColor: item.subject.ringColor }}
                        >
                          {item.subject.shortCode}
                        </span>
                        <span className="text-[15px] font-extrabold text-[#260559] truncate">
                          {item.subject.displayLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className="text-[15.5px] font-extrabold tabular-nums"
                          style={{ color: item.subject.textColor }}
                        >
                          {item.subject.percent}%
                        </span>
                        <ArrowRight size={15} className="text-[#6E5C91]" />
                      </div>
                    </div>

                    {/* Real Mastery Progress Bar */}
                    <div className="w-full h-2.5 rounded-full bg-[#E9E0F7] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.max(item.subject.hasRealData ? 6 : 0, item.subject.percent)}%`,
                          backgroundColor: item.subject.ringColor,
                        }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2 text-[12px] font-bold">
                      <span className="text-[#5A467A]">
                        {item.subject.attempts > 0
                          ? `${item.subject.correct}/${item.subject.attempts} correct · ${item.readinessLabel}`
                          : 'No questions solved yet'}
                      </span>
                      {item.primaryWeakTopic && (
                        <span className="inline-flex items-center gap-1 text-[#C2410C] truncate max-w-[52%]">
                          <AlertCircle size={12} className="shrink-0" />
                          <span className="truncate">{item.primaryWeakTopic}</span>
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => goTo('/progress/subjects')}
                className="mt-4 w-full py-3 rounded-[16px] bg-[#F3EEFD] hover:bg-[#E7DCFA] text-[#260559] font-extrabold text-[13.5px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Open Full Subject Performance & AI Insights</span>
                <ArrowRight size={15} strokeWidth={2.6} />
              </button>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
