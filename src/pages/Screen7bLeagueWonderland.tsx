import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  Crown,
  Medal,
  Shield,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import {
  getWonderlandDashboardState,
  type LeagueRow,
} from '../utils/wonderlandStudentState';
import {
  LEAGUE_TIER_META,
  getMultiTierLeagueSnapshot,
  syncAndFetchRemoteLeague,
  type PlacedLeagueTier,
} from '../utils/progressInsightsEngine';
import { sound } from '../utils/soundEffects';

const TIER_LIST: PlacedLeagueTier[] = ['blue', 'silver', 'gold'];

/**
 * SCREEN 7B (`/progress/league`): MY LEAGUE AWARDS & MULTI-TIER STANDINGS
 * Features:
 *  - Starts Unranked until the student logs real practice activity
 *  - Separate standings tables for Blue League, Silver League, and Gold League (Rank #1 to lowest)
 *  - Explicit Promotion Zone (Blue -> Silver -> Gold) and Demotion Zone (Gold -> Silver -> Blue)
 *  - Live cross-device sync via `/api/gamification/leagues` when signed in
 */
export function Screen7bLeagueWonderland() {
  const navigate = useNavigate();
  const dashboard = useMemo(() => getWonderlandDashboardState(), []);
  const [remoteTables, setRemoteTables] = useState<Partial<Record<PlacedLeagueTier, LeagueRow[]>>>(
    {}
  );
  const [syncSource, setSyncSource] = useState<'local' | 'supabase'>('local');

  const snapshot = useMemo(
    () => getMultiTierLeagueSnapshot({ remoteTables, syncSource }),
    [remoteTables, syncSource]
  );

  const [selectedTier, setSelectedTier] = useState<PlacedLeagueTier>(() =>
    snapshot.currentTier === 'unranked' ? 'blue' : snapshot.currentTier
  );

  // Sync authenticated student's XP & pull live standings for the viewed tier
  useEffect(() => {
    let active = true;
    syncAndFetchRemoteLeague(selectedTier).then(res => {
      if (!active) return;
      if (res.source === 'supabase' && res.standings.length > 0) {
        setRemoteTables(prev => ({ ...prev, [selectedTier]: res.standings }));
        setSyncSource('supabase');
      }
    });
    return () => {
      active = false;
    };
  }, [selectedTier]);

  const tierMeta = LEAGUE_TIER_META[selectedTier];
  const rows = snapshot.tables[selectedTier];
  const isViewingOwnTier = snapshot.currentTier === selectedTier;
  const promoteCutoffIndex = rows.findIndex(r => r.zone !== 'promote');
  const firstDemoteIndex = rows.findIndex(r => r.zone === 'demote');

  return (
    <SabiAppChrome
      activeTab="progress"
      backdropVariant="progress"
      streakDays={dashboard.streakDays}
      xpBalance={dashboard.xpBalance}
    >
      <main className="w-full max-w-[1320px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7 pb-5">
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
                PROGRESS · MY LEAGUE AWARDS
              </div>
              <h1
                className="text-[26px] sm:text-[32px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                League Standings
              </h1>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* PROMOTION / DEMOTION MOVEMENT BANNER */}
        {snapshot.movement === 'promoted' && snapshot.currentTier !== 'unranked' && (
          <section
            className="mb-4 rounded-[20px] bg-[#059669] px-4 py-3.5 text-white flex items-center justify-between gap-3"
            style={{ boxShadow: '0 4px 0 #046C4E' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <TrendingUp size={22} className="text-[#FFE824] shrink-0" />
              <div className="min-w-0">
                <div className="text-[14.5px] font-extrabold">
                  Promoted to {LEAGUE_TIER_META[snapshot.currentTier].name}!
                </div>
                <p className="text-[12.5px] font-semibold text-[#D1FAE5]">
                  Your recent XP moved you up a division. Keep pushing to climb higher.
                </p>
              </div>
            </div>
          </section>
        )}

        {snapshot.movement === 'demoted' && snapshot.currentTier !== 'unranked' && (
          <section
            className="mb-4 rounded-[20px] bg-[#DC2626] px-4 py-3.5 text-white flex items-center justify-between gap-3"
            style={{ boxShadow: '0 4px 0 #991B1B' }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <TrendingDown size={22} className="text-[#FFE824] shrink-0" />
              <div className="min-w-0">
                <div className="text-[14.5px] font-extrabold">
                  Dropped to {LEAGUE_TIER_META[snapshot.currentTier].name}
                </div>
                <p className="text-[12.5px] font-semibold text-[#FEE2E2]">
                  Your performance dipped below the division floor. Practise today to earn promotion back!
                </p>
              </div>
            </div>
          </section>
        )}

        {/* UNRANKED CALLOUT FOR BRAND-NEW ACCOUNTS */}
        {!snapshot.isPlaced && (
          <section
            className="mb-5 rounded-[24px] bg-[#2A085E] px-5 py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{ boxShadow: '0 5px 0 #170338' }}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-[52px] h-[52px] rounded-[16px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
                <Trophy size={26} strokeWidth={2.4} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#FFE51E]">
                  CURRENT STATUS · UNRANKED
                </div>
                <h2 className="text-[19px] sm:text-[21px] font-extrabold text-white leading-tight">
                  You’re not placed in a league yet
                </h2>
                <p className="mt-0.5 text-[13px] font-semibold text-[#D9C7FA]">
                  Complete any Smart Practice, Blitz, or CBT session to enter Blue League and start
                  competing for Silver and Gold awards.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/practice/setup?pace=blitz')}
              className="px-5 py-3 rounded-[16px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[14px] uppercase tracking-wide inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
              style={{
                fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                boxShadow: '0 4px 0 #C7AD00',
              }}
            >
              <Zap size={16} className="fill-[#6C19E5] text-[#6C19E5]" />
              <span>Enter Blue League</span>
            </button>
          </section>
        )}

        {/* 3-TIER SWITCHER CARDS (BLUE -> SILVER -> GOLD) */}
        <section className="grid grid-cols-3 gap-2.5 sm:gap-3.5 mb-5">
          {TIER_LIST.map(tierId => {
            const meta = LEAGUE_TIER_META[tierId];
            const isActive = selectedTier === tierId;
            const isUserHere = snapshot.currentTier === tierId;
            return (
              <button
                key={tierId}
                type="button"
                onClick={() => {
                  try {
                    sound.playTap();
                  } catch {
                    // ignore
                  }
                  setSelectedTier(tierId);
                }}
                aria-pressed={isActive}
                className={`relative rounded-[20px] p-3 sm:p-4 text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#2A085E] text-white ring-2 ring-[#6C19E5]'
                    : 'bg-white text-[#260559] hover:bg-[#FAF7FF]'
                }`}
                style={{
                  boxShadow: isActive ? '0 5px 0 #170338' : '0 4px 0 #E2C700',
                }}
              >
                {isUserHere && (
                  <span className="absolute -top-2.5 right-2.5 px-2.5 py-0.5 rounded-full bg-[#FFE824] text-[#260559] text-[10px] font-extrabold uppercase tracking-wider">
                    YOU
                  </span>
                )}
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-[11px] flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.badgeBg, color: meta.badgeText }}
                  >
                    {tierId === 'gold' ? (
                      <Crown size={18} strokeWidth={2.4} />
                    ) : tierId === 'silver' ? (
                      <Medal size={18} strokeWidth={2.4} />
                    ) : (
                      <Trophy size={18} strokeWidth={2.4} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] sm:text-[16px] font-extrabold leading-tight truncate">
                      {meta.shortLabel}
                    </div>
                    <div
                      className={`text-[11px] font-bold truncate ${
                        isActive ? 'text-[#D5C3F7]' : 'text-[#6E5C91]'
                      }`}
                    >
                      {tierId === 'blue'
                        ? 'Starter'
                        : tierId === 'silver'
                        ? '450+ XP'
                        : '1,200+ XP'}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        {/* MAIN STANDINGS TABLE + LEAGUE RULES */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT (8/12): ACTIVE TIER STANDINGS TABLE */}
          <section
            className="lg:col-span-8 bg-white rounded-[24px] overflow-hidden"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            {/* Tier Banner Header */}
            <div
              className="px-5 py-4 sm:px-6 sm:py-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              style={{ backgroundColor: tierMeta.bannerBg }}
            >
              <div className="min-w-0">
                <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-white/85">
                  {isViewingOwnTier ? 'YOUR ACTIVE DIVISION' : 'DIVISION STANDINGS'} ·{' '}
                  {snapshot.daysLeftInWeek} DAYS LEFT
                </div>
                <h2
                  className="text-[22px] sm:text-[26px] font-bold text-white leading-tight"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  {tierMeta.name}
                </h2>
                <p className="text-[12.5px] sm:text-[13.5px] font-semibold text-white/90">
                  {tierMeta.tagline}
                </p>
              </div>

              {isViewingOwnTier && snapshot.currentRank && (
                <div className="self-start sm:self-center px-3.5 py-2 rounded-[14px] bg-black/20 text-right shrink-0">
                  <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-white/80">
                    Your Rank
                  </div>
                  <div
                    className="text-[22px] font-bold text-[#FFE824] tabular-nums leading-none"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    #{snapshot.currentRank}
                  </div>
                </div>
              )}
            </div>

            {/* Standings Rows (Top to Lowest) */}
            <div className="p-3.5 sm:p-5 space-y-2">
              {rows.map((row, idx) => {
                const showPromotionLine =
                  tierMeta.promoteTarget !== null &&
                  promoteCutoffIndex > 0 &&
                  idx === promoteCutoffIndex;
                const showDemotionLine =
                  tierMeta.demoteTarget !== null &&
                  firstDemoteIndex > 0 &&
                  idx === firstDemoteIndex;

                return (
                  <React.Fragment key={`${selectedTier}-${row.rank}-${row.name}`}>
                    {showPromotionLine && (
                      <div className="py-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#059669]">
                        <div className="flex-1 h-px bg-[#A7F3D0]" />
                        <span className="inline-flex items-center gap-1">
                          <ArrowUpRight size={13} />
                          Top {promoteCutoffIndex} promote to {tierMeta.promoteTarget}
                        </span>
                        <div className="flex-1 h-px bg-[#A7F3D0]" />
                      </div>
                    )}

                    {showDemotionLine && (
                      <div className="py-1.5 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[#DC2626]">
                        <div className="flex-1 h-px bg-[#FECACA]" />
                        <span className="inline-flex items-center gap-1">
                          <ArrowDownRight size={13} />
                          Demotion zone · drops to {tierMeta.demoteTarget}
                        </span>
                        <div className="flex-1 h-px bg-[#FECACA]" />
                      </div>
                    )}

                    <div
                      className={`flex items-center justify-between gap-3 px-3.5 py-3 rounded-[16px] transition-colors ${
                        row.isCurrentUser
                          ? 'bg-[#F3ECFF] ring-2 ring-[#6C19E5]'
                          : row.zone === 'demote'
                          ? 'bg-[#FFF5F5]'
                          : 'bg-[#FAF8FF]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-6 text-center text-[15.5px] font-extrabold tabular-nums shrink-0 ${
                            row.rank === 1
                              ? 'text-[#D97706]'
                              : row.rank === 2
                              ? 'text-[#475569]'
                              : row.rank === 3
                              ? 'text-[#B45309]'
                              : 'text-[#5E4A80]'
                          }`}
                        >
                          {row.rank}
                        </span>
                        <div
                          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-white font-extrabold text-[14.5px] shrink-0"
                          style={{ backgroundColor: row.avatarBg }}
                        >
                          {row.initial}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[15px] sm:text-[16px] font-extrabold text-[#260559] truncate">
                            {row.name}
                          </div>
                          {row.zone === 'promote' && tierMeta.promoteTarget && (
                            <div className="text-[11px] font-bold text-[#059669]">
                              Promoting to {tierMeta.promoteTarget}
                            </div>
                          )}
                          {row.zone === 'demote' && tierMeta.demoteTarget && (
                            <div className="text-[11px] font-bold text-[#DC2626]">
                              At risk of dropping to {tierMeta.demoteTarget}
                            </div>
                          )}
                        </div>
                      </div>

                      <span className="text-[15px] sm:text-[16px] font-extrabold text-[#260559] tabular-nums whitespace-nowrap shrink-0">
                        {row.xp.toLocaleString()} XP
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* RIGHT (4/12): HOW PROMOTION & DEMOTION WORKS */}
          <aside className="lg:col-span-4 space-y-4">
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Shield size={19} className="text-[#6C19E5]" />
                <h2 className="text-[17px] font-extrabold text-[#260559]">
                  How League Awards Work
                </h2>
              </div>

              <div className="space-y-3 text-[13px] font-semibold text-[#4A356E]">
                <div className="rounded-[15px] bg-[#EFF6FF] border border-[#BFDBFE] p-3">
                  <div className="font-extrabold text-[#1D4ED8]">1. Blue League (Entry)</div>
                  <p className="mt-0.5 leading-snug">
                    Unlocks immediately after your first practice activity. Reach Top 5 or 450+ XP
                    to earn promotion to Silver.
                  </p>
                </div>

                <div className="rounded-[15px] bg-[#F1F5F9] border border-[#CBD5E1] p-3">
                  <div className="font-extrabold text-[#334155]">2. Silver League</div>
                  <p className="mt-0.5 leading-snug">
                    Top 5 or 1,200+ XP promotes you to Gold League. Finishing in the bottom zone
                    drops you back to Blue.
                  </p>
                </div>

                <div className="rounded-[15px] bg-[#FFFBEB] border border-[#FDE68A] p-3">
                  <div className="font-extrabold text-[#92400E]">3. Gold League (Top Tier)</div>
                  <p className="mt-0.5 leading-snug">
                    SABI’s top JAMB competitors. Keep practising daily to defend your Gold award —
                    slipping into the bottom zone demotes back to Silver.
                  </p>
                </div>
              </div>

              {snapshot.nextTierName && (
                <div className="mt-4 rounded-[16px] bg-[#2A085E] p-3.5 text-white">
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#FFE51E]">
                    NEXT PROMOTION TARGET
                  </div>
                  <div className="mt-0.5 text-[15px] font-extrabold">
                    {snapshot.xpToNextTier > 0
                      ? `${snapshot.xpToNextTier.toLocaleString()} XP to ${snapshot.nextTierName}`
                      : `Eligible for ${snapshot.nextTierName}`}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/practice/setup?pace=blitz')}
                    className="mt-2.5 w-full py-2.5 rounded-[12px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[13px] inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Earn XP Now</span>
                    <ArrowRight size={14} strokeWidth={2.8} />
                  </button>
                </div>
              )}
            </section>
          </aside>
        </div>
      </main>
    </SabiAppChrome>
  );
}
