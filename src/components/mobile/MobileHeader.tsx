import React from 'react';
import { Flame, Bell, Coins, Sun, Moon } from 'lucide-react';
import { StudentProfile } from '../../types';

interface MobileHeaderProps {
  profile: StudentProfile | null;
  streakCount: number;
  xpPoints: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenLeaderboard?: () => void;
}

export default function MobileHeader({
  profile,
  streakCount,
  xpPoints,
  darkMode,
  onToggleDarkMode,
  onOpenNotifications,
  onOpenProfile,
  onOpenLeaderboard,
}: MobileHeaderProps) {
  const studentName = profile?.name ? profile.name.split(' ')[0] : 'David';
  const targetScore = profile?.priorScoreBaseline ? `${profile.priorScoreBaseline}+` : '320+';
  const targetCourse = profile?.targetCourse || 'Medicine';

  return (
    <header className="px-4 pt-3 pb-3 bg-white dark:bg-[#0E1526] border-b border-slate-100 dark:border-slate-800/80 sticky top-0 z-30 transition-colors">
      <div className="flex items-center justify-between gap-2">
        {/* Left: User Avatar & Morning Greeting */}
        <div className="flex items-center gap-2.5 min-w-0" onClick={onOpenProfile} role="button">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-600 to-emerald-400 p-0.5 shadow-sm shadow-emerald-500/20">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-black text-emerald-700 dark:text-emerald-400">
                {studentName.substring(0, 2).toUpperCase()}
              </div>
            </div>
            {/* Online Indicator */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Good morning,</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {studentName}
              </span>
              <span className="text-xs">👋</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                Target: {targetScore}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                {targetCourse}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Gamification Badges & Quick Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Streak Badge (opens leaderboard) */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-800/60 shadow-xs hover:border-amber-400 transition"
            title="Daily study streak · Click to view Peer Leaderboard"
          >
            <Flame size={13} className="text-amber-500 fill-amber-500" />
            <span className="text-[11px] font-black text-amber-700 dark:text-amber-300">
              {streakCount}d
            </span>
          </button>

          {/* XP Badge (opens leaderboard) */}
          <button
            onClick={onOpenLeaderboard}
            className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs hover:border-emerald-400 transition"
            title="Sabi XP Coins · Click to view Peer Leaderboard"
          >
            <Coins size={13} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[11px] font-black text-emerald-700 dark:text-emerald-300">
              {xpPoints.toLocaleString()}
            </span>
          </button>

          {/* Theme Quick Toggle */}
          <button
            onClick={onToggleDarkMode}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition"
            title="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-white dark:ring-slate-900" />
          </button>
        </div>
      </div>
    </header>
  );
}
