import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  ChevronRight,
  Compass,
  CreditCard,
  Flame,
  Home,
  LogOut,
  Menu,
  MessageSquare,
  Monitor,
  SlidersHorizontal,
  Target,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SabiPurpleBookLogo } from './SabiWonderlandShell';
import { SabiBrandEmblem } from './SabiBrandEmblem';
import { sound } from '../../utils/soundEffects';

export type SabiNavTab =
  | 'home'
  | 'practice'
  | 'cbt'
  | 'progress'
  | 'profile'
  | 'assistant'
  | 'subscriptions'
  | 'practice-settings';

interface SabiMenuContextValue {
  openMenu: () => void;
  closeMenu: () => void;
}

const SabiMenuContext = createContext<SabiMenuContextValue>({
  openMenu: () => {},
  closeMenu: () => {},
});

/**
 * Tactile 3-Dash Hamburger Menu Trigger Button (`☰`) matching the SABI Wonderland
 * rounded-square white button language (`shadow-[0_3px_0_#E2C700]`).
 */
export function SabiMenuTriggerButton({ className = '' }: { className?: string }) {
  const { openMenu } = useContext(SabiMenuContext);

  return (
    <button
      type="button"
      onClick={() => {
        try {
          sound.playTap();
        } catch {
          // ignore
        }
        openMenu();
      }}
      aria-label="Open SABI menu"
      className={`w-[42px] h-[42px] sm:w-[44px] sm:h-[44px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer shrink-0 ${className}`}
      style={{ boxShadow: '0 3px 0 #E2C700' }}
    >
      <Menu size={21} strokeWidth={2.7} />
    </button>
  );
}

interface SabiAppChromeProps {
  activeTab: SabiNavTab;
  children: React.ReactNode;
  /** Controls which decorative shapes appear on the SABI Yellow canvas */
  backdropVariant?: 'home' | 'practice' | 'progress';
  /** Hide bottom mobile pill nav on focused sub-screens like Smart Practice Hub */
  hideMobileBottomNav?: boolean;
  /** Lock main viewport to exact 100dvh with zero outer bottom padding (for full-bleed chat apps) */
  fullViewport?: boolean;
  /** Optional desktop sidebar stats */
  streakDays?: number;
  xpBalance?: number;
}

const BOTTOM_NAV_ITEMS: {
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

const DRAWER_STUDIO_ITEMS: {
  id: SabiNavTab;
  title: string;
  subtitle: string;
  path: string;
  accentBg: string;
  accentText: string;
  badge?: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
}[] = [
  {
    id: 'assistant',
    title: 'SABI Assistant Chat',
    subtitle: 'Ask any JAMB question in English or Naija Pidgin',
    path: '/assistant',
    accentBg: 'bg-[#6C19E5]',
    accentText: 'text-[#FFE824]',
    badge: 'CHAT',
    Icon: MessageSquare,
  },
  {
    id: 'practice-settings',
    title: 'SABI AI Practice Studio',
    subtitle: 'Set topic focus, concentration & send to SABI AI',
    path: '/settings/practice',
    accentBg: 'bg-[#FFE824]',
    accentText: 'text-[#260559]',
    badge: 'AI',
    Icon: SabiBrandEmblem,
  },
  {
    id: 'profile',
    title: 'Account & Profile',
    subtitle: 'SABI ID, 4 JAMB subjects, preferences & security',
    path: '/profile',
    accentBg: 'bg-[#EFE6FF]',
    accentText: 'text-[#6C19E5]',
    Icon: User,
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions & Credits',
    subtitle: 'Free tier, JAMB Season Unlock & AI credits',
    path: '/subscriptions',
    accentBg: 'bg-[#FFEBD6]',
    accentText: 'text-[#C2410C]',
    Icon: CreditCard,
  },
];

/**
 * Shared SABI Wonderland Authenticated Shell
 * - Mobile / Android APK: Full-bleed edge-to-edge SABI Yellow canvas, 3-dash slide-over drawer
 *   (Account, Subscriptions, SABI AI Practice Studio), and compact low-anchored 5-tab bottom bar.
 * - Desktop WebApp (`lg:`): Persistent left dark-purple navigation rail with direct links to
 *   all 5 student hubs plus SABI AI Practice Studio & Subscriptions.
 */
export function SabiAppChrome({
  activeTab,
  children,
  backdropVariant = 'home',
  hideMobileBottomNav = false,
  fullViewport = false,
  streakDays = 0,
  xpBalance = 0,
}: SabiAppChromeProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const studentName =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) || 'Ada';
  const studentUniqueId =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_unique_id')) || '4829K';
  const currentPlanLabel =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_plan_label')) || 'Free Scholar';

  // Close drawer automatically on route changes
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [drawerOpen]);

  // Keep Android native StatusBar matched to SABI Yellow
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFE824' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }
  }, []);

  const goTo = (path: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setDrawerOpen(false);
    navigate(path);
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sabi_user_signed_in');
    }
    setDrawerOpen(false);
    navigate('/welcome');
  };

  return (
    <SabiMenuContext.Provider
      value={{
        openMenu: () => setDrawerOpen(true),
        closeMenu: () => setDrawerOpen(false),
      }}
    >
      <div
        className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#FFE824] text-[#260559] flex flex-col lg:flex-row select-none pt-[env(safe-area-inset-top,0px)]"
        style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
        }}
      >
        {/* ================================================================= */}
        {/* DECORATIVE AMBIENT SHAPES                                         */}
        {/* ================================================================= */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
          <div
            className="absolute -top-[48px] -right-[56px] w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] rounded-full"
            style={{
              background: 'linear-gradient(145deg, #7C22F2 0%, #6D18E3 100%)',
            }}
          />

          {backdropVariant === 'home' && (
            <div
              className="absolute -left-[74px] top-[340px] w-[160px] h-[160px] rounded-full lg:left-[186px]"
              style={{
                border: '20px solid rgba(255, 248, 178, 0.72)',
              }}
            />
          )}

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
          className="hidden lg:flex lg:flex-col lg:w-[244px] xl:w-[260px] lg:shrink-0 lg:sticky lg:top-0 lg:h-[100dvh] z-30 bg-[#2A085E] text-white px-4 py-6 justify-between shadow-[6px_0_24px_rgba(42,8,94,0.16)] overflow-y-auto"
          aria-label="Primary navigation"
        >
          <div>
            {/* SABI Brand Lockup */}
            <div className="flex items-center gap-3 px-1.5 mb-6">
              <div className="bg-[#FFE824] rounded-2xl px-3 py-1.5 shadow-[0_3px_0_#D8B700]">
                <SabiPurpleBookLogo size="sm" to="/home" />
              </div>
            </div>

            {/* 5 Core Student Navigation Links */}
            <nav className="space-y-1.5">
              {BOTTOM_NAV_ITEMS.map(({ id, label, path, Icon }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTo(path)}
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

            {/* Menu Studio & Billing Links (Matches 3-Dash Menu Drawer) */}
            <div className="mt-5 pt-4 border-t border-white/10 space-y-1.5">
              <div className="px-3 pb-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#B8A2DF]">
                Studio & Access
              </div>
              <button
                type="button"
                onClick={() => goTo('/assistant')}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-[16px] text-[14.5px] font-extrabold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'assistant'
                    ? 'bg-[#6C19E5] text-[#FFE51E] shadow-[0_4px_0_#46099E]'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <MessageSquare size={19} strokeWidth={2.4} className="shrink-0 text-[#FFE824]" />
                  <span className="truncate">SABI Assistant</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => goTo('/settings/practice')}
                className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-[16px] text-[14.5px] font-extrabold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'practice-settings'
                    ? 'bg-[#FFE824] text-[#260559] shadow-[0_4px_0_#C9AF00]'
                    : 'text-[#FFE824] hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <SabiBrandEmblem size={19} strokeWidth={2.4} className="shrink-0" />
                  <span className="truncate">AI Practice Studio</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => goTo('/subscriptions')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[16px] text-[14.5px] font-extrabold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  activeTab === 'subscriptions'
                    ? 'bg-[#6C19E5] text-[#FFE51E] shadow-[0_4px_0_#46099E]'
                    : 'text-[#D6C7EE] hover:bg-white/10 hover:text-white'
                }`}
              >
                <CreditCard size={19} strokeWidth={2.4} />
                <span>Subscriptions</span>
              </button>
            </div>
          </div>

          {/* Desktop Compact Streak & XP Summary */}
          <div className="space-y-2.5 pt-4">
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
              onClick={() => goTo('/onboarding/1')}
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
            fullViewport
              ? 'h-[100dvh] max-h-[100dvh] overflow-hidden pb-0'
              : hideMobileBottomNav
              ? 'pb-[max(env(safe-area-inset-bottom,0px),12px)] lg:pb-8'
              : 'pb-[calc(76px+env(safe-area-inset-bottom,0px))] lg:pb-8'
          }`}
        >
          {children}
        </div>

        {/* ================================================================= */}
        {/* MOBILE / TABLET LOW-ANCHORED DARK-PURPLE BOTTOM NAV BAR           */}
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
              {BOTTOM_NAV_ITEMS.map(({ id, label, path, Icon }) => {
                const isActive =
                  activeTab === id ||
                  (id === 'profile' &&
                    (activeTab === 'subscriptions' || activeTab === 'practice-settings'));
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => goTo(path)}
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

        {/* ================================================================= */}
        {/* 3-DASH HAMBURGER MENU DRAWER (Account, Subscriptions, AI Studio)  */}
        {/* ================================================================= */}
        {drawerOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="SABI Menu"
            className="fixed inset-0 z-50 flex justify-end bg-[#170338]/65 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          >
            <div
              className="relative w-full max-w-[360px] sm:max-w-[390px] h-full bg-[#FFE824] text-[#260559] flex flex-col justify-between shadow-[-12px_0_36px_rgba(23,3,56,0.38)] overflow-y-auto pt-[max(env(safe-area-inset-top,0px),14px)] pb-[max(env(safe-area-inset-bottom,0px),18px)] px-4"
              style={{
                background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div>
                {/* Drawer Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-[13px] bg-[#6C19E5] text-[#FFE824] flex items-center justify-center font-extrabold text-lg shadow-[0_3px_0_#46099E]">
                      {studentName.charAt(0).toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[18px] font-bold text-[#260559] leading-tight truncate"
                        style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                      >
                        {studentName}
                      </div>
                      <div className="text-[12px] font-bold text-[#4F3B73]">
                        ID: {studentUniqueId} · {currentPlanLabel}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    aria-label="Close menu"
                    className="w-[42px] h-[42px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center cursor-pointer active:translate-y-[1px]"
                    style={{ boxShadow: '0 3px 0 #E2C700' }}
                  >
                    <X size={20} strokeWidth={2.7} />
                  </button>
                </div>

                {/* Primary 3-Dash Menu Destination Cards */}
                <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#3C2263] mb-2.5 px-1">
                  Account, Plans & AI Setup
                </div>

                <div className="space-y-3 mb-5">
                  {DRAWER_STUDIO_ITEMS.map(item => {
                    const isCurrent = activeTab === item.id;
                    const IconComponent = item.Icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => goTo(item.path)}
                        className={`w-full rounded-[20px] p-3.5 flex items-center gap-3 text-left transition-transform duration-100 active:translate-y-[1px] cursor-pointer ${
                          isCurrent
                            ? 'bg-[#3B0D91] text-white'
                            : 'bg-white text-[#260559] hover:bg-[#FFFDF4]'
                        }`}
                        style={{
                          boxShadow: isCurrent ? '0 4px 0 #23055B' : '0 4px 0 #E2C700',
                        }}
                      >
                        <div
                          className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${item.accentBg} ${item.accentText}`}
                        >
                          <IconComponent size={21} strokeWidth={2.4} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[15.5px] font-extrabold leading-tight truncate">
                              {item.title}
                            </span>
                            {item.badge && (
                              <span className="px-2 py-0.5 rounded-full bg-[#6C19E5] text-[#FFE824] text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                                {item.badge}
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-[12.5px] font-semibold leading-snug mt-0.5 ${
                              isCurrent ? 'text-[#DDD0FA]' : 'text-[#5A467A]'
                            }`}
                          >
                            {item.subtitle}
                          </div>
                        </div>

                        <ChevronRight
                          size={19}
                          className={isCurrent ? 'text-[#FFE824] shrink-0' : 'text-[#8B76B3] shrink-0'}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Quick Study Shortcuts */}
                <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#3C2263] mb-2.5 px-1">
                  All SABI Study Tools
                </div>
                <div
                  className="bg-white rounded-[20px] p-2 space-y-0.5"
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  {[
                    { label: 'CBT Exam Simulator', path: '/cbt', Icon: Monitor },
                    { label: 'Custom Practice Builder', path: '/practice/custom', Icon: SlidersHorizontal },
                    { label: 'JAMB 12-Q Diagnostic', path: '/diagnostic', Icon: Compass },
                    { label: 'Subjects & Syllabus', path: '/subjects', Icon: BookOpen },
                    { label: 'Weak Areas & Study Plan', path: '/recommendations', Icon: Target },
                    { label: 'Mistakes & Saved Vault', path: '/mistakes', Icon: Bookmark },
                    { label: 'Notifications & Reminders', path: '/notifications', Icon: Bell },
                    { label: 'Edit Onboarding Answers', path: '/onboarding/1', Icon: SabiBrandEmblem },
                  ].map(({ label, path, Icon }) => (
                    <button
                      key={path}
                      type="button"
                      onClick={() => goTo(path)}
                      className="w-full px-3 py-2.5 rounded-[14px] hover:bg-[#F5F0FF] flex items-center justify-between text-[13.5px] font-extrabold text-[#260559] cursor-pointer"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={17} className="text-[#6C19E5]" />
                        <span>{label}</span>
                      </span>
                      <ChevronRight size={16} className="text-[#8B76B3]" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Drawer Footer: Sign Out */}
              <div className="pt-5">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3.5 px-4 rounded-[18px] bg-[#2A085E] hover:bg-[#370B7A] text-[#FFE824] font-extrabold text-[14.5px] flex items-center justify-center gap-2 cursor-pointer transition-transform active:translate-y-[1px]"
                  style={{ boxShadow: '0 4px 0 #170338' }}
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </SabiMenuContext.Provider>
  );
}
