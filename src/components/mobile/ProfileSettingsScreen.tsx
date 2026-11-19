import React, { useState } from 'react';
import {
  User, Sun, Moon, Bell, Volume2, Shield, Heart, Star,
  LogOut, School, BookOpen, ChevronRight, Check, Award
} from 'lucide-react';
import { StudentProfile, SubjectName } from '../../types';
import { sound } from '../../utils/soundEffects';

interface ProfileSettingsScreenProps {
  profile: StudentProfile | null;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onResetData: () => void;
  onOpenGoalCustomizer?: () => void;
}

export default function ProfileSettingsScreen({
  profile,
  darkMode,
  onToggleDarkMode,
  onResetData,
  onOpenGoalCustomizer,
}: ProfileSettingsScreenProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [offlineCached, setOfflineCached] = useState(true);
  const [rated, setRated] = useState(false);
  const [selectedStars, setSelectedStars] = useState(5);

  const studentName = profile?.name || 'David Chukwu';
  const targetCourse = profile?.targetCourse || 'Medicine & Surgery';
  const targetUni = profile?.targetUniversity || 'University of Lagos (UNILAG)';

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* 1. PROFILE HEADER CARD */}
      <section className="p-5 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-0.5 shadow-md shadow-emerald-500/20">
            <div className="w-full h-full rounded-2xl bg-white dark:bg-slate-900 flex items-center justify-center font-display text-lg font-black text-emerald-600 dark:text-emerald-400">
              {studentName.substring(0, 2).toUpperCase()}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base font-black text-slate-900 dark:text-white truncate">
              {studentName}
            </h1>
            <p className="text-xs text-slate-400 font-semibold truncate">
              Target: 320+ · JAMB 2027 Aspirant
            </p>
            <span className="inline-block mt-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
              SABI PRO Student
            </span>
          </div>
        </div>

        {/* Target Goals */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <span className="text-[10px] uppercase font-bold text-slate-400">Target Institution</span>
            <p className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{targetUni}</p>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <span className="text-[10px] uppercase font-bold text-slate-400">Desired Course</span>
            <p className="font-bold text-slate-900 dark:text-white truncate mt-0.5">{targetCourse}</p>
          </div>
        </div>

        {onOpenGoalCustomizer && (
          <button
            onClick={onOpenGoalCustomizer}
            className="mt-3 w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <span>Edit Target Score, University & Subjects</span>
            <ChevronRight size={14} />
          </button>
        )}
      </section>

      {/* 2. JAMB SUBJECT COMBINATION */}
      <section className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Selected 4 Subjects
          </h2>
          <span className="text-[10px] font-bold text-emerald-600">JAMB Approved</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {['English Language (Compulsory)', 'Mathematics', 'Physics', 'Chemistry'].map(sub => (
            <div
              key={sub}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 truncate"
            >
              {sub}
            </div>
          ))}
        </div>
      </section>

      {/* 3. APP PREFERENCES & TOGGLES */}
      <section className="p-4 rounded-3xl bg-white dark:bg-[#111A2E] border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
        <h2 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Preferences
        </h2>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              {darkMode ? <Moon size={16} /> : <Sun size={16} className="text-amber-500" />}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {darkMode ? 'Dark Mode (Active)' : 'Light Mode (Active)'}
              </p>
              <p className="text-[10px] text-slate-400">
                {darkMode ? 'Tap to switch to Crisp Light Theme' : 'Tap to switch to Night Dark Theme'}
              </p>
            </div>
          </div>
          <button
            onClick={onToggleDarkMode}
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              darkMode ? 'bg-emerald-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-xs ${
                darkMode ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Sound Effects */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Volume2 size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Sound & Haptics</p>
              <p className="text-[10px] text-slate-400">Audio cues for correct answers & streaks</p>
            </div>
          </div>
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              sound.setEnabled(next);
              if (next) sound.playTap();
            }}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              soundEnabled ? 'bg-emerald-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                soundEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>

        {/* Daily Study Reminders */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Bell size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Study Reminders</p>
              <p className="text-[10px] text-slate-400">Daily nudges to protect your streak</p>
            </div>
          </div>
          <button
            onClick={() => setRemindersEnabled(!remindersEnabled)}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              remindersEnabled ? 'bg-emerald-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                remindersEnabled ? 'left-6' : 'left-1'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 4. RATE SABI CARD */}
      <section className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300/40 dark:border-amber-900/40">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
              <Star size={16} className="fill-current" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">Rate SABI App</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Help other Nigerian students find us</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => {
                setSelectedStars(star);
                setRated(true);
              }}
              className="p-1 text-amber-500 hover:scale-110 transition"
            >
              <Star
                size={22}
                className={star <= selectedStars ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}
              />
            </button>
          ))}
        </div>
        {rated && (
          <p className="text-center text-[11px] font-bold text-emerald-600">
            Thank you for rating SABI 5 stars! 🌟
          </p>
        )}
      </section>

      {/* 5. ABOUT SABI & RESET */}
      <div className="text-center space-y-2 pt-2">
        <p className="text-[10px] text-slate-400">
          SABI JAMB Prep · Version 2.4 (Mobile Edition)
          <br />
          Built with ❤️ for Nigerian JAMB & WAEC Aspirants
        </p>

        <button
          onClick={onResetData}
          className="text-xs font-bold text-red-600 hover:underline flex items-center justify-center gap-1 mx-auto pt-1"
        >
          <LogOut size={13} />
          <span>Reset Practice Data</span>
        </button>
      </div>
    </div>
  );
}
