import React, { useState } from 'react';
import { X, Trophy, Medal, Flame, Sparkles, Crown, ArrowUp, ArrowDown } from 'lucide-react';
import { sound } from '../../utils/soundEffects';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserXP: number;
  currentUserStreak: number;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  state: string;
  xp: number;
  streak: number;
  change: 'up' | 'down' | 'same';
  targetCourse: string;
}

const LAGOS_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Chioma Adeyemi', avatar: 'CA', state: 'Lagos', xp: 3420, streak: 31, change: 'same', targetCourse: 'Medicine (UNILAG)' },
  { rank: 2, name: 'Ibrahim Danladi', avatar: 'ID', state: 'Lagos', xp: 2980, streak: 28, change: 'up', targetCourse: 'Comp Sci (UNILAG)' },
  { rank: 3, name: 'Emeka Nwosu', avatar: 'EN', state: 'Lagos', xp: 2750, streak: 24, change: 'down', targetCourse: 'Law (UI)' },
  { rank: 4, name: 'Zainab Balogun', avatar: 'ZB', state: 'Lagos', xp: 2410, streak: 21, change: 'up', targetCourse: 'Pharmacy (OAU)' },
  { rank: 5, name: 'Femi Olatunji', avatar: 'FO', state: 'Lagos', xp: 2200, streak: 19, change: 'same', targetCourse: 'Mech Eng (FUTA)' },
  { rank: 6, name: 'Blessing Okon', avatar: 'BO', state: 'Lagos', xp: 2050, streak: 18, change: 'up', targetCourse: 'Nursing (UNIBEN)' },
  { rank: 7, name: 'Samuel Adeleke', avatar: 'SA', state: 'Lagos', xp: 1920, streak: 17, change: 'down', targetCourse: 'Software Eng (Covenant)' },
  { rank: 8, name: 'Ngozi Eze', avatar: 'NE', state: 'Lagos', xp: 1830, streak: 16, change: 'same', targetCourse: 'Economics (UNILAG)' },
  { rank: 9, name: 'Tunde Bakare', avatar: 'TB', state: 'Lagos', xp: 1740, streak: 15, change: 'up', targetCourse: 'Accounting (UNILAG)' },
  { rank: 10, name: 'Aisha Bello', avatar: 'AB', state: 'Lagos', xp: 1650, streak: 15, change: 'same', targetCourse: 'Dentistry (UI)' },
  { rank: 11, name: 'Chinedu Obi', avatar: 'CO', state: 'Lagos', xp: 1580, streak: 14, change: 'down', targetCourse: 'Civil Eng (UNILAG)' },
  { rank: 12, name: 'Maryam Sani', avatar: 'MS', state: 'Lagos', xp: 1510, streak: 14, change: 'up', targetCourse: 'Medicine (LASU)' },
  { rank: 13, name: 'Kelechi Uba', avatar: 'KU', state: 'Lagos', xp: 1480, streak: 14, change: 'same', targetCourse: 'Law (UNILAG)' },
];

export default function LeaderboardModal({
  isOpen,
  onClose,
  currentUserXP,
  currentUserStreak,
}: LeaderboardModalProps) {
  const [scope, setScope] = useState<'lagos' | 'national'>('lagos');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[85vh] sm:h-[680px]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 flex items-center justify-center">
              <Trophy size={16} />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                Peer Leaderboard
              </h3>
              <p className="text-[10px] text-slate-400">JAMB 2027 Aspirant Standings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scope Selector Tabs */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/40">
          <button
            onClick={() => {
              sound.playTap();
              setScope('lagos');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              scope === 'lagos'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Lagos State (SS3)
          </button>
          <button
            onClick={() => {
              sound.playTap();
              setScope('national');
            }}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
              scope === 'national'
                ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            National (All Nigeria)
          </button>
        </div>

        {/* Top 3 Podium Cards */}
        <div className="p-4 pb-2 grid grid-cols-3 gap-2 items-end">
          {/* #2 Silver */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
            <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-black flex items-center justify-center mb-1">
              2
            </span>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-800 dark:text-slate-200">
              ID
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-900 dark:text-white truncate w-full">
              Ibrahim D.
            </p>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              2,980 XP
            </p>
          </div>

          {/* #1 Gold (Taller) */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-b from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/20 border border-amber-300 dark:border-amber-800 text-center flex flex-col items-center shadow-xs">
            <Crown size={16} className="text-amber-500 fill-amber-500 mb-0.5" />
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 p-0.5 shadow-xs">
              <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center text-xs font-black text-amber-700">
                CA
              </div>
            </div>
            <p className="mt-1 text-xs font-black text-slate-900 dark:text-white truncate w-full">
              Chioma A.
            </p>
            <p className="text-[11px] font-black text-amber-600 dark:text-amber-400">
              3,420 XP
            </p>
          </div>

          {/* #3 Bronze */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-center flex flex-col items-center">
            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px] font-black flex items-center justify-center mb-1">
              3
            </span>
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-black text-slate-800 dark:text-slate-200">
              EN
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-900 dark:text-white truncate w-full">
              Emeka N.
            </p>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              2,750 XP
            </p>
          </div>
        </div>

        {/* Scrollable Ranks 4 to 13 */}
        <div className="flex-1 overflow-y-auto px-4 space-y-2 no-scrollbar">
          {LAGOS_LEADERBOARD.slice(3).map(entry => (
            <div
              key={entry.rank}
              className="p-3 rounded-2xl bg-white dark:bg-[#111A2E] border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-5 text-center font-display font-bold text-slate-400">
                  {entry.rank}
                </span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                  {entry.avatar}
                </div>
                <div className="min-w-0 truncate">
                  <p className="font-bold text-slate-900 dark:text-white truncate">
                    {entry.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {entry.targetCourse}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0 flex items-center gap-2.5">
                <div>
                  <span className="font-black text-slate-900 dark:text-white">
                    {entry.xp.toLocaleString()} XP
                  </span>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-amber-500 font-bold">
                    <Flame size={10} className="fill-current" />
                    <span>{entry.streak}d</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Sticky Current User Standing */}
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border-t border-emerald-200 dark:border-emerald-800 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center shrink-0">
              14
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  You (David Chukwu)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800">
                  You
                </span>
              </div>
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                Top 5% · 30 XP to reach Rank #13
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-emerald-800 dark:text-emerald-200">
              {currentUserXP.toLocaleString()} XP
            </span>
            <p className="text-[10px] font-bold text-amber-600 flex items-center justify-end gap-0.5">
              <Flame size={11} className="fill-current" />
              <span>{currentUserStreak}d Streak</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
