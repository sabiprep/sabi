import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  CheckCheck,
  ChevronLeft,
  Flame,
  Monitor,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  loadNotifications,
  saveNotifications,
  type SabiNotificationItem,
} from '../utils/cbtAndCustomEngine';

/**
 * SCREEN 22 (`/notifications`): NOTIFICATIONS & STUDY REMINDERS
 * Streak alerts, SABI Coach nudges, CBT reminders, and quiet-hours controls.
 */
export function Screen22NotificationsWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const [items, setItems] = useState<SabiNotificationItem[]>(() => loadNotifications());
  const [quietHours, setQuietHours] = useState(
    () => localStorage.getItem('sabi_quiet_hours_v1') !== 'false'
  );
  const [streakAlerts, setStreakAlerts] = useState(
    () => localStorage.getItem('sabi_streak_alerts_v1') !== 'false'
  );

  const unreadCount = items.filter(i => !i.read).length;

  const markAllRead = () => {
    const next = items.map(i => ({ ...i, read: true }));
    setItems(next);
    saveNotifications(next);
  };

  const openNotification = (item: SabiNotificationItem) => {
    const next = items.map(i => (i.id === item.id ? { ...i, read: true } : i));
    setItems(next);
    saveNotifications(next);
    if (item.actionPath) {
      navigate(item.actionPath);
    }
  };

  return (
    <SabiAppChrome
      activeTab="home"
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1180px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 pb-6">
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.7} />
            </button>
            <div className="min-w-0">
              <h1
                className="text-[26px] sm:text-[32px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                Notifications
              </h1>
              <p className="text-[13.5px] font-semibold text-[#3C2263]">
                {unreadCount > 0
                  ? `${unreadCount} unread study update${unreadCount === 1 ? '' : 's'}`
                  : 'All caught up on your study updates.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="px-3.5 py-2.5 rounded-[14px] bg-white text-[#6C19E5] font-extrabold text-[12.5px] inline-flex items-center gap-1.5 cursor-pointer"
                style={{ boxShadow: '0 3px 0 #E2C700' }}
              >
                <CheckCheck size={15} />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <SabiMenuTriggerButton />
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT: Notifications Feed */}
          <div className="md:col-span-8 space-y-3">
            {items.map(item => {
              const Icon =
                item.category === 'streak'
                  ? Flame
                  : item.category === 'cbt'
                  ? Monitor
                  : item.category === 'coach'
                  ? Sparkles
                  : Bell;
              const iconStyle =
                item.category === 'streak'
                  ? 'bg-[#FFEBD6] text-[#EA580C]'
                  : item.category === 'cbt'
                  ? 'bg-[#E0F2FE] text-[#0369A1]'
                  : 'bg-[#EFE6FF] text-[#6C19E5]';

              return (
                <article
                  key={item.id}
                  className={`bg-white rounded-[22px] p-4 sm:p-5 border-[2px] transition-colors ${
                    item.read ? 'border-transparent' : 'border-[#6C19E5]'
                  }`}
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${iconStyle}`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h2 className="text-[15.5px] font-extrabold text-[#260559]">
                          {item.title}
                        </h2>
                        <span className="text-[11.5px] font-bold text-[#6E5C91] shrink-0">
                          {item.timeAgo}
                        </span>
                      </div>
                      <p className="mt-1 text-[13.5px] font-semibold text-[#5A467A] leading-snug">
                        {item.body}
                      </p>

                      {item.actionPath && (
                        <button
                          type="button"
                          onClick={() => openNotification(item)}
                          className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-extrabold text-[#6C19E5] hover:underline cursor-pointer"
                        >
                          <span>{item.actionLabel || 'Open'}</span>
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* RIGHT: Quiet Hours & Study Alert Settings */}
          <aside
            className="md:col-span-4 bg-white rounded-[24px] p-4 sm:p-5 space-y-4"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <h2 className="text-[17px] font-extrabold text-[#260559]">Reminder Controls</h2>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[14px] font-extrabold text-[#260559]">
                  Daily Streak Reminders
                </div>
                <div className="text-[12px] font-semibold text-[#5A467A]">
                  Gentle evening nudge before streak resets
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={streakAlerts}
                onClick={() => {
                  const next = !streakAlerts;
                  setStreakAlerts(next);
                  localStorage.setItem('sabi_streak_alerts_v1', String(next));
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  streakAlerts ? 'bg-[#6C19E5]' : 'bg-[#DDD5EE]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    streakAlerts ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#F1ECFA]">
              <div className="flex items-start gap-2">
                <Moon size={16} className="text-[#6C19E5] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[14px] font-extrabold text-[#260559]">
                    Quiet Hours (10 PM – 6 AM)
                  </div>
                  <div className="text-[12px] font-semibold text-[#5A467A]">
                    No overnight notifications while resting
                  </div>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={quietHours}
                onClick={() => {
                  const next = !quietHours;
                  setQuietHours(next);
                  localStorage.setItem('sabi_quiet_hours_v1', String(next));
                }}
                className={`w-12 h-7 rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                  quietHours ? 'bg-[#6C19E5]' : 'bg-[#DDD5EE]'
                }`}
              >
                <span
                  className={`block w-5 h-5 rounded-full bg-white transition-transform ${
                    quietHours ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </aside>
        </div>
      </main>
    </SabiAppChrome>
  );
}
