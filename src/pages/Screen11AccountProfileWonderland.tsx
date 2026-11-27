import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Lock,
  LogOut,
  ShieldCheck,
  Volume2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { SabiBrandEmblem } from '../components/common/SabiBrandEmblem';
import { useAuth } from '../context/AuthContext';
import { apiPatchJson, describeApiFailure } from '../utils/apiClient';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { loadPracticeAiConfig } from '../utils/sabiAiPracticeConfig';
import { sound } from '../utils/soundEffects';

interface AppPreferencesState {
  soundEnabled: boolean;
  dailyReminder: boolean;
  quietHours: boolean;
  aiExplanationsConsent: boolean;
}

const PREFS_STORAGE_KEY = 'sabi_wonderland_prefs_v1';

function loadPrefs(): AppPreferencesState {
  const defaults: AppPreferencesState = {
    soundEnabled: true,
    dailyReminder: true,
    quietHours: true,
    aiExplanationsConsent: true,
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
  } catch {
    return defaults;
  }
}

/**
 * SCREEN 11 (`/profile`): ACCOUNT, JAMB PROFILE & SETTINGS
 * Replaces the placeholder Profile screen with a complete SABI Wonderland Account hub.
 */
export function Screen11AccountProfileWonderland() {
  const navigate = useNavigate();
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [progressRev, setProgressRev] = useState(0);
  useEffect(() => {
    const onUpdated = () => setProgressRev((r) => r + 1);
    window.addEventListener('sabi-progress-updated', onUpdated);
    return () => window.removeEventListener('sabi-progress-updated', onUpdated);
  }, []);
  const data = useMemo(() => getWonderlandDashboardState(), [profile, progressRev]);
  const aiConfig = useMemo(
    () => loadPracticeAiConfig(data.subjects.map(s => s.canonicalName)),
    [data.subjects]
  );

  const storedOnboarding = useMemo(() => {
    if (profile?.onboarding_answers && typeof profile.onboarding_answers === 'object') {
      return profile.onboarding_answers;
    }
    if (typeof window === 'undefined') return null;
    try {
      const raw =
        localStorage.getItem('sabi_onboarding_v3_answers') ||
        localStorage.getItem('sabi_onboarding_wonderland_v3_draft') ||
        localStorage.getItem('sabi_onboarding_v2_answers');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [profile]);

  const [fullName, setFullName] = useState(profile?.full_name || data.fullName);
  const email =
    profile?.email ||
    user?.email ||
    (typeof window !== 'undefined' && localStorage.getItem('sabi_user_email')) ||
    '';
  const uniqueId =
    profile?.sabi_unique_id ||
    (typeof window !== 'undefined' && localStorage.getItem('sabi_unique_id')) ||
    'PENDING';
  const [targetCourse, setTargetCourse] = useState(
    storedOnboarding?.targetCourse || ''
  );
  const [targetUniversity, setTargetUniversity] = useState(
    storedOnboarding?.targetUniversity || ''
  );
  const [prefs, setPrefs] = useState<AppPreferencesState>(loadPrefs);
  const [copied, setCopied] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (profile?.onboarding_answers?.targetCourse) {
      setTargetCourse(String(profile.onboarding_answers.targetCourse));
    }
    if (profile?.onboarding_answers?.targetUniversity) {
      setTargetUniversity(String(profile.onboarding_answers.targetUniversity));
    }
  }, [profile]);

  const currentPlanLabel =
    (typeof window !== 'undefined' && localStorage.getItem('sabi_plan_label')) || 'Free Scholar';

  const handleTogglePref = (key: keyof AppPreferencesState) => {
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'soundEnabled') {
        sound.setEnabled(next.soundEnabled);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(next));
      }
      if (next.soundEnabled) {
        try {
          sound.playTap();
        } catch {
          // ignore
        }
      }
      return next;
    });
  };

  const handleSaveIdentity = async () => {
    setSaveError('');
    setSavedNotice('');

    const cleanedName = fullName.trim();
    const cleanedCourse = targetCourse.trim();
    const cleanedUniversity = targetUniversity.trim();

    if (cleanedName.length < 2) {
      setSaveError('Full name must be at least 2 characters.');
      return;
    }

    setSavingProfile(true);
    const payload: Record<string, string> = { fullName: cleanedName };
    if (cleanedCourse.length >= 2) payload.targetCourse = cleanedCourse;
    if (cleanedUniversity.length >= 2) payload.targetUniversity = cleanedUniversity;

    const res = await apiPatchJson('/api/profile/me', payload);
    setSavingProfile(false);

    if (!res.ok) {
      setSaveError(describeApiFailure(res, 'Could not sync profile changes to your account.'));
      return;
    }

    try {
      sound.playSuccess();
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('sabi_user_name', cleanedName);
      const nextOnboarding = {
        ...(storedOnboarding || {}),
        fullName: cleanedName,
        chosenSubjects: data.subjects.map(s => s.canonicalName),
        ...(cleanedCourse ? { targetCourse: cleanedCourse } : {}),
        ...(cleanedUniversity ? { targetUniversity: cleanedUniversity } : {}),
      };
      localStorage.setItem('sabi_onboarding_v3_answers', JSON.stringify(nextOnboarding));
    }

    void refreshProfile();
    setSavedNotice('Profile synced to your SABI account!');
    window.setTimeout(() => setSavedNotice(''), 2600);
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(uniqueId).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/welcome', { replace: true });
  };

  return (
    <SabiAppChrome
      activeTab="profile"
      backdropVariant="home"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1340px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7">
        {/* 1. PAGE HEADER + 3-DASH MENU TRIGGER */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div>
            <h1
              className="text-[28px] sm:text-[34px] font-bold text-[#260559] leading-tight"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Account & Profile
            </h1>
            <p className="text-[13.5px] sm:text-[15px] font-semibold text-[#3C2263]">
              Manage your JAMB profile, SABI ID, and study preferences.
            </p>
          </div>
          <SabiMenuTriggerButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (7/12): Candidate Identity + JAMB Combination */}
          <div className="md:col-span-7 space-y-4">
            {/* CANDIDATE IDENTITY & SABI UNIQUE ID */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#F2ECFC]">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-[56px] h-[56px] rounded-full bg-[#6C19E5] text-[#FFE824] flex items-center justify-center font-extrabold text-[22px] shrink-0 shadow-[0_3.5px_0_#46099E]">
                    {(fullName.trim().charAt(0) || 'A').toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div
                      className="text-[20px] sm:text-[22px] font-bold text-[#260559] leading-tight truncate"
                      style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      {fullName || 'Ada'}
                    </div>
                    <div className="text-[13px] font-semibold text-[#5A467A] truncate">{email}</div>
                  </div>
                </div>

                {/* Copyable SABI Unique ID Chip */}
                <button
                  type="button"
                  onClick={handleCopyId}
                  className="px-3.5 py-2 rounded-[14px] bg-[#2A085E] text-[#FFE824] flex items-center gap-2 text-[13px] font-extrabold cursor-pointer active:translate-y-[1px]"
                >
                  <span>ID: {uniqueId}</span>
                  {copied ? <Check size={15} /> : <Copy size={14} />}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-4">
                <div>
                  <label
                    htmlFor="profile-full-name"
                    className="block text-[12.5px] font-extrabold text-[#4F3B73] mb-1.5"
                  >
                    Full Name
                  </label>
                  <input
                    id="profile-full-name"
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    className="w-full px-4 py-3 rounded-[14px] bg-[#FAF8FF] border border-[#E5DAF9] text-[14.5px] font-extrabold text-[#260559] focus:outline-none focus:ring-2 focus:ring-[#6C19E5]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="profile-course"
                    className="block text-[12.5px] font-extrabold text-[#4F3B73] mb-1.5"
                  >
                    Intended Course
                  </label>
                  <input
                    id="profile-course"
                    type="text"
                    value={targetCourse}
                    onChange={e => setTargetCourse(e.target.value)}
                    className="w-full px-4 py-3 rounded-[14px] bg-[#FAF8FF] border border-[#E5DAF9] text-[14.5px] font-extrabold text-[#260559] focus:outline-none focus:ring-2 focus:ring-[#6C19E5]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label
                    htmlFor="profile-university"
                    className="block text-[12.5px] font-extrabold text-[#4F3B73] mb-1.5"
                  >
                    Preferred Institution
                  </label>
                  <input
                    id="profile-university"
                    type="text"
                    value={targetUniversity}
                    onChange={e => setTargetUniversity(e.target.value)}
                    className="w-full px-4 py-3 rounded-[14px] bg-[#FAF8FF] border border-[#E5DAF9] text-[14.5px] font-extrabold text-[#260559] focus:outline-none focus:ring-2 focus:ring-[#6C19E5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span
                  className={`text-[12.5px] font-bold ${
                    saveError ? 'text-rose-700' : 'text-[#059669]'
                  }`}
                >
                  {saveError || savedNotice}
                </span>
                <button
                  type="button"
                  disabled={savingProfile}
                  onClick={() => void handleSaveIdentity()}
                  className="px-5 py-3 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[14.5px] uppercase tracking-wide cursor-pointer active:translate-y-[1px] disabled:opacity-60"
                  style={{
                    fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                    boxShadow: '0 4px 0 #46099E',
                  }}
                >
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </section>

            {/* JAMB 4-SUBJECT COMBINATION */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[12px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center">
                    <BookOpen size={19} strokeWidth={2.4} />
                  </div>
                  <h2 className="text-[17px] sm:text-[18.5px] font-extrabold text-[#260559]">
                    Your 4 JAMB Subjects
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/onboarding/1')}
                  className="text-[13px] font-extrabold text-[#6C19E5] hover:underline cursor-pointer"
                >
                  Change subjects
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {data.subjects.map(subj => {
                  const isEnglish = subj.canonicalName === 'English Language';
                  return (
                    <div
                      key={subj.canonicalName}
                      className={`rounded-[16px] px-3.5 py-3 flex items-center justify-between gap-2 ${
                        isEnglish
                          ? 'bg-[#2A085E] text-[#FFE824]'
                          : 'bg-[#F5F0FF] text-[#260559]'
                      }`}
                    >
                      <span className="text-[14px] font-extrabold truncate">
                        {subj.displayLabel}
                      </span>
                      {isEnglish ? (
                        <Lock size={15} className="text-[#FFE824] shrink-0" />
                      ) : (
                        <span className="text-[12.5px] font-extrabold tabular-nums text-[#6C19E5]">
                          {subj.percent}%
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (5/12): Quick Studio & Subscription Cards + Preferences */}
          <div className="md:col-span-5 space-y-4">
            {/* DIRECT JUMP TO SABI AI PRACTICE STUDIO */}
            <button
              type="button"
              onClick={() => navigate('/settings/practice')}
              className="w-full rounded-[24px] bg-[#3B0D91] p-5 text-left text-white flex items-center justify-between gap-3 transition-transform active:translate-y-[1px] cursor-pointer"
              style={{ boxShadow: '0 5px 0 #23055B' }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-[15px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
                  <SabiBrandEmblem size={24} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-[#FFE824]">
                    SABI AI PRACTICE STUDIO
                  </div>
                  <div className="text-[16.5px] font-extrabold leading-snug mt-0.5 truncate">
                    {aiConfig.blueprint
                      ? `Active: ${aiConfig.blueprint.headline}`
                      : 'Configure focus & send to SABI AI'}
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className="text-[#FFE824] shrink-0" />
            </button>

            {/* SUBSCRIPTION ACCESS CARD */}
            <button
              type="button"
              onClick={() => navigate('/subscriptions')}
              className="w-full rounded-[22px] bg-white p-4 sm:p-5 text-left flex items-center justify-between gap-3 transition-transform active:translate-y-[1px] cursor-pointer"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 rounded-[14px] bg-[#FFEBD6] text-[#C2410C] flex items-center justify-center shrink-0">
                  <CreditCard size={21} strokeWidth={2.4} />
                </div>
                <div className="min-w-0">
                  <div className="text-[15.5px] font-extrabold text-[#260559] truncate">
                    Plan: {currentPlanLabel}
                  </div>
                  <div className="text-[12.5px] font-semibold text-[#5A467A]">
                    View JAMB Season Unlock & AI credits
                  </div>
                </div>
              </div>
              <ChevronRight size={19} className="text-[#8B76B3] shrink-0" />
            </button>

            {/* APP & PRIVACY TOGGLES */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5 space-y-3"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <h2 className="text-[16.5px] font-extrabold text-[#260559] mb-1">
                Preferences & Privacy
              </h2>

              {[
                {
                  key: 'soundEnabled' as const,
                  label: 'Sound & tap feedback',
                  desc: 'Play crisp audio cues on streaks and answers',
                  Icon: Volume2,
                },
                {
                  key: 'dailyReminder' as const,
                  label: 'Daily streak reminders',
                  desc: 'Gentle nudge when your daily goal is unfinished',
                  Icon: Bell,
                },
                {
                  key: 'aiExplanationsConsent' as const,
                  label: 'SABI AI Coach & explanations',
                  desc: 'Allow SABI AI to tailor explanations & study plans',
                  Icon: ShieldCheck,
                },
              ].map(({ key, label, desc, Icon }) => {
                const enabled = prefs[key];
                return (
                  <button
                    key={key}
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    onClick={() => handleTogglePref(key)}
                    className="w-full py-2 flex items-center justify-between gap-3 text-left cursor-pointer"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <Icon size={18} className="text-[#6C19E5] mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[14px] font-extrabold text-[#260559] leading-tight">
                          {label}
                        </div>
                        <div className="text-[12px] font-semibold text-[#5A467A] leading-snug mt-0.5">
                          {desc}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`w-12 h-7 rounded-full p-1 transition-colors shrink-0 ${
                        enabled ? 'bg-[#6C19E5]' : 'bg-[#DED5F2]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white transition-transform ${
                          enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-[#F2ECFC]">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full py-3 rounded-[15px] bg-[#FFF1F2] hover:bg-[#FFE4E6] text-[#BE123C] font-extrabold text-[14px] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut size={17} />
                  <span>Sign Out</span>
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
