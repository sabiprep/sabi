import React from 'react';
import { Home, BookOpen, Zap, BarChart3, User } from 'lucide-react';

export type MobileTab = 'home' | 'practice' | 'blitz' | 'mastery' | 'profile';

interface MobileBottomNavProps {
  currentTab: MobileTab;
  onChangeTab: (tab: MobileTab) => void;
}

export default function MobileBottomNav({ currentTab, onChangeTab }: MobileBottomNavProps) {
  const tabs = [
    { id: 'home' as MobileTab, label: 'Home', icon: Home },
    { id: 'practice' as MobileTab, label: 'Practice', icon: BookOpen },
    { id: 'blitz' as MobileTab, label: 'Blitz', icon: Zap, badge: 'NEW' },
    { id: 'mastery' as MobileTab, label: 'Mastery', icon: BarChart3 },
    { id: 'profile' as MobileTab, label: 'Profile', icon: User },
  ];

  return (
    <nav className="sticky bottom-0 z-40 bg-white/95 dark:bg-[#0E1526]/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800/80 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all duration-150 active:scale-95 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium'
              }`}
            >
              {/* Badge for Blitz */}
              {tab.badge && (
                <span className="absolute -top-1 right-1.5 px-1.5 py-0.2 text-[8px] font-black uppercase tracking-wider rounded-full bg-amber-500 text-white animate-pulse">
                  {tab.badge}
                </span>
              )}

              {/* Active Indicator Background Pill */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : ''
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>

              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-extrabold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
