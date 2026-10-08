import React from 'react';
import { X, Flame, Sparkles, Trophy, Calendar, Check, Bell } from 'lucide-react';

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onActionClick?: (actionType: string) => void;
}

export default function NotificationsSheet({ isOpen, onClose, onActionClick }: NotificationsSheetProps) {
  if (!isOpen) return null;

  const notifications = [
    {
      id: '1',
      icon: Flame,
      iconColor: 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
      title: 'Protect your 14-day streak!',
      desc: "You're only 7 questions away from completing today's target. Keep your momentum alive!",
      time: '2h ago',
      unread: true,
      action: 'practice',
    },
    {
      id: '2',
      icon: Sparkles,
      iconColor: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
      title: 'Sabi AI analysis ready',
      desc: 'Your mastery in English (Proximity Concord) jumped from 42% to 58%. Check your updated mastery map.',
      time: '5h ago',
      unread: true,
      action: 'mastery',
    },
    {
      id: '3',
      icon: Trophy,
      iconColor: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
      title: 'Leaderboard Update: Rank #14',
      desc: 'You moved up 3 spots among SS3 candidates in Lagos State after your morning Blitz session.',
      time: '1d ago',
      unread: false,
      action: 'mastery',
    },
    {
      id: '4',
      icon: Calendar,
      iconColor: 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
      title: 'JAMB 2027 Countdown',
      desc: '114 days until official examination date. Consistent daily practice is the highest predictor of 300+ scores.',
      time: '2d ago',
      unread: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full sm:max-w-md bg-white dark:bg-[#0E1526] rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="font-display text-sm font-black text-slate-900 dark:text-white">
                Notifications
              </h3>
              <p className="text-[10px] text-slate-400">2 unread updates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X size={18} />
          </button>
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-2.5 overflow-y-auto flex-1 no-scrollbar">
          {notifications.map(n => {
            const Icon = n.icon;
            return (
              <div
                key={n.id}
                onClick={() => {
                  if (n.action && onActionClick) {
                    onActionClick(n.action);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-2xl border transition text-left cursor-pointer active:scale-98 ${
                  n.unread
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/60'
                    : 'bg-white dark:bg-[#111A2E] border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${n.iconColor}`}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {n.title}
                      </p>
                      <span className="text-[9px] font-semibold text-slate-400 shrink-0">
                        {n.time}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                      {n.desc}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 text-center">
          <button
            onClick={onClose}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Mark all as read
          </button>
        </div>
      </div>
    </div>
  );
}
