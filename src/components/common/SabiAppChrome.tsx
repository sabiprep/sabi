import React, { useEffect } from 'react';
import { BarChart3, Flame, Home, Monitor, User, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SabiPurpleBookLogo } from './SabiWonderlandShell';

export type SabiNavTab = 'home' | 'practice' | 'cbt' | 'progress' | 'profile';

interface SabiAppChromeProps {
  activeTab: SabiNavTab;
  children: React.ReactNode;
  /** Controls which decorative shapes appear on the SABI Yellow canvas */
  backdropVariant?: 'home' | 'practice' | 'progress';
  /** Hide bottom mobile pill nav on focused sub-screens like Smart Practice Hub */
  hideMobileBottomNav?: boolean;
  /** Optional desktop sidebar stats */
  streakDays?: number;
  xpBalance?: number;
}

const NAV_ITEMS: {
  id: SabiNavTab;
  label: string;
  path: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  { id: 'home', label: 'Home', path: '/home', Icon: Home },
  { id: 'practice', label: 'Practice', path: '/practice', Icon: Zap },
  { id: 'cbt', label: 'CBT', path: '/cbt', Icon: Monitor },
  { id: 'progress', label: 'Progress', path: '/progress', Icon: BarChart3 },
  { id: 'profile', label: 'Profile', path: '/profile', Icon: User },
];

/**
 * Shared SABI Wonderland Authenticated Shell
 * - Mobile / Android APK: Full-bleed edge-to-edge SABI Yellow canvas with a compact,
 *   low-anchored dark-purple 5-tab bottom navigation bar so content fills the screen naturally.
 * - Desktop WebApp (`lg:`): Persistent left dark-purple navigation rail with a wide,
 *   full-bleed responsive workspace canvas (no narrow "frame inside a frame" margins).
 */
export function SabiAppChrome({
  activeTab,
  children,
  backdropVariant = 'home',
  hideMobileBottomNav = false,
  streakDays = 14,
  xpBalance = 1240,
}: SabiAppChromeProps) {
  const navigate = useNavigate();

  // Keep Android native StatusBar matched to SABI Yellow
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFE824' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }
  }, []);

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#FFE824] text-[#260559] flex flex-col lg:flex-row select-none pt-[env(safe-area-inset-top,0px)]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
      }}
    >
      {/* ================================================================= */}
      {/* DECORATIVE AMBIENT SHAPES (Matches Uploaded Screens 01, 02, 07)   */}
      {/* ================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Top-Right Large Purple Circle Orb */}
        <div
          className="absolute -top-[48px] -right-[56px] w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full"
          style={{
            background: 'linear-gradient(145deg, #7C22F2 0%, #6D18E3 100%)',
          }}
        />

        {/* Home Screen: Pale Cream-Yellow Ring Peeking on Middle-Left */}
        {backdropVariant === 'home' && (
          <div
            className="absolute -left-[74px] top-[340px] w-[160px] h-[160px] rounded-full lg:left-[186px]"
            style={{
              border: '20px solid rgba(255, 248, 178, 0.72)',
            }}
          />
        )}

        {/* Smart Practice Hub: Vibrant Emerald-Green Hollow Ring at Bottom-Left */}
        {backdropVariant === 'practice' && (
          <div
            className="absolute -left-[62px] -bottom-[56px] w-[190px] h-[190px] sm:w-[215px] sm:h-[215px] rounded-full lg:left-[195px]"
            style={{
              border: '22px solid #00B862',
            }}
          />
        )}
      </div>

      {/* ================================================================= */}
      {/* DESKTOP LEFT NAVIGATION RAIL (`lg:flex`)                          */}
      {/* ================================================================= */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[232px] xl:w-[248px] lg:shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] z-30 bg-[#2A085E] text-white px-4 py-6 justify-between shadow-[6px_0_24px_rgba(42,8,94,0.16)]"
        aria-label="Primary navigation"
      >
        <div>
          {/* SABI Brand Lockup */}
          <div className="flex items-center gap-3 px-1.5 mb-7">
            <div className="bg-[#FFE824] rounded-2xl px-3 py-1.5 shadow-[0_3px_0_#D8B700]">
              <SabiPurpleBookLogo size="sm" to="/home" />
            </div>
          </div>

          {/* 5 Student Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map(({ id, label, path, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-[15px] font-extrabold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-[#6C19E5] text-[#FFE51E] shadow-[0_4px_0_#46099E]'
                      : 'text-[#D6C7EE] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.4} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Desktop Compact Streak & XP Summary */}
        <div className="space-y-2.5">
          <div className="rounded-[18px] bg-[#3B1080] p-3.5 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#D6C7EE]">
              <span className="flex items-center gap-1.5">
                <Flame size={15} className="text-[#FF7A00] fill-[#FF7A00]" />
                <span>Daily Streak</span>
              </span>
              <span className="text-white font-extrabold tabular-nums">{streakDays} days</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold text-[#D6C7EE]">
              <span className="flex items-center gap-1.5">
                <Zap size={15} className="text-[#FFE51E] fill-[#FFE51E]" />
                <span>Total XP</span>
              </span>
              <span className="text-[#FFE51E] font-extrabold tabular-nums">
                {xpBalance.toLocaleString()} XP
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/onboarding/1')}
            className="w-full py-2.5 px-3 rounded-[14px] bg-white/10 hover:bg-white/15 text-xs font-bold text-[#E6DCF8] transition-colors cursor-pointer whitespace-nowrap"
          >
            Edit Onboarding Setup
          </button>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MAIN CONTENT VIEWPORT (Full-width fluid on mobile & desktop)      */}
      {/* ================================================================= */}
      <div
        className={`relative z-10 flex-1 min-w-0 w-full flex flex-col ${
          hideMobileBottomNav
            ? 'pb-[max(env(safe-area-inset-bottom,0px),12px)] lg:pb-8'
            : 'pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-8'
        }`}
      >
        {children}
      </div>

      {/* ================================================================= */}
      {/* MOBILE / TABLET FLOATING DARK-PURPLE BOTTOM NAV BAR               */}
      {/* Anchored low & full-width so cards occupy the full screen cleanly */}
      {/* ================================================================= */}
      {!hideMobileBottomNav && (
        <nav
          aria-label="Mobile navigation"
          className="lg:hidden fixed bottom-0 left-0 right-0 z-40 px-2 sm:px-4 pt-1 pb-[max(env(safe-area-inset-bottom,0px),8px)] pointer-events-none"
        >
          <div
            className="pointer-events-auto w-full md:max-w-[640px] mx-auto rounded-[22px] bg-[#2A085E] px-1.5 py-1.5 grid grid-cols-5 items-center"
            style={{
              boxShadow: '0 6px 20px rgba(42, 8, 94, 0.30)',
            }}
          >
            {NAV_ITEMS.map(({ id, label, path, Icon }) => {
              const isActive = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(path)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-[16px] transition-transform duration-100 active:scale-95 cursor-pointer ${
                    isActive ? 'text-[#FFE51E]' : 'text-[#C8B8E6]'
                  }`}
                >
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2.1}
                    className={isActive ? 'text-[#FFE51E]' : 'text-[#C8B8E6]'}
                  />
                  <span
                    className={`text-[11px] leading-none whitespace-nowrap ${
                      isActive ? 'font-extrabold text-[#FFE51E]' : 'font-semibold text-[#C8B8E6]'
                    }`}
                  >
                    {label}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
