import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  Lock,
  Save,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { ALL_JAMB_SUBJECTS } from '../utils/cbtAndCustomEngine';
import { getTopicsForSubject } from '../utils/sabiAiPracticeConfig';
import { getShortSubjectLabel } from '../utils/smartPracticeSession';
import { sound } from '../utils/soundEffects';

/**
 * SCREEN 19 (`/subjects`): SUBJECT SELECTION & SYLLABUS OVERVIEW
 * Lets candidates manage their 4-subject JAMB combination (Use of English locked)
 * and browse syllabus topics with one-tap practice launch.
 */
export function Screen19SubjectsWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const initialSubjects = useMemo(
    () => data.subjects.map(s => s.canonicalName),
    [data.subjects]
  );

  const [selected, setSelected] = useState<string[]>(initialSubjects);
  const [activeSyllabusSubject, setActiveSyllabusSubject] = useState<string>(
    initialSubjects[0] || 'English Language'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  const toggleSubject = (canonical: string) => {
    if (canonical === 'English Language') return; // Locked per JAMB rules
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setSelected(prev => {
      if (prev.includes(canonical)) {
        return prev.filter(s => s !== canonical);
      }
      if (prev.length >= 4) return prev;
      return [...prev, canonical];
    });
    setSavedNotice(false);
  };

  const handleSaveCombination = () => {
    if (selected.length !== 4) return;
    try {
      sound.playSuccess();
      const raw = localStorage.getItem('sabi_onboarding_profile_v1');
      const existing = raw ? JSON.parse(raw) : {};
      localStorage.setItem(
        'sabi_onboarding_profile_v1',
        JSON.stringify({ ...existing, chosenSubjects: selected })
      );
      setSavedNotice(true);
    } catch {
      setSavedNotice(true);
    }
  };

  const syllabusTopics = getTopicsForSubject(activeSyllabusSubject);

  return (
    <SabiAppChrome
      activeTab="home"
      backdropVariant="practice"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 pb-6">
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
                JAMB Subjects & Syllabus
              </h1>
              <p className="text-[13.5px] font-semibold text-[#3C2263]">
                Use of English is compulsory. Pick 3 more subjects ({selected.length}/4 selected).
              </p>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT: 4-Subject Selector */}
          <section
            className="md:col-span-7 bg-white rounded-[24px] p-4 sm:p-6"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center justify-between gap-2 mb-3.5">
              <h2 className="text-[17.5px] font-extrabold text-[#260559]">
                Your 4-Subject Combination
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-[12px] font-extrabold ${
                  selected.length === 4
                    ? 'bg-[#D8F8E8] text-[#065F46]'
                    : 'bg-[#FFF3CD] text-[#92400E]'
                }`}
              >
                {selected.length}/4 selected
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {ALL_JAMB_SUBJECTS.map(subj => {
                const isLocked = subj === 'English Language';
                const isPicked = selected.includes(subj);
                const disabled = !isPicked && selected.length >= 4;

                return (
                  <button
                    key={subj}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleSubject(subj)}
                    className={`rounded-[16px] px-4 py-3.5 flex items-center justify-between gap-2 text-left transition-all ${
                      isLocked
                        ? 'bg-[#2A085E] text-white cursor-default'
                        : isPicked
                        ? 'bg-[#6C19E5] text-white cursor-pointer'
                        : disabled
                        ? 'bg-[#F8F6FC] text-[#A295BA] cursor-not-allowed'
                        : 'bg-[#F8F5FF] hover:bg-[#EFE6FF] text-[#260559] cursor-pointer'
                    }`}
                    style={
                      isPicked && !isLocked ? { boxShadow: '0 3.5px 0 #46099E' } : undefined
                    }
                  >
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-extrabold truncate">
                        {getShortSubjectLabel(subj)}
                      </div>
                      <div
                        className={`text-[11.5px] font-semibold ${
                          isLocked
                            ? 'text-[#FFE51E]'
                            : isPicked
                            ? 'text-[#E7D8FF]'
                            : 'text-[#6E5C91]'
                        }`}
                      >
                        {isLocked ? 'Compulsory JAMB subject' : isPicked ? 'Active in your plan' : 'Tap to add'}
                      </div>
                    </div>

                    {isLocked ? (
                      <Lock size={16} className="text-[#FFE51E] shrink-0" />
                    ) : (
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isPicked
                            ? 'bg-[#FFE824] text-[#260559]'
                            : 'border-2 border-[#C7B3EA]'
                        }`}
                      >
                        {isPicked && <Check size={14} strokeWidth={3} />}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={selected.length !== 4}
                onClick={handleSaveCombination}
                className="px-6 py-3.5 rounded-[18px] bg-[#6C19E5] disabled:opacity-45 hover:brightness-105 text-white font-bold text-[15.5px] uppercase tracking-wide inline-flex items-center gap-2 cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #46099E',
                }}
              >
                <Save size={17} />
                <span>Save 4 Subjects</span>
              </button>

              {savedNotice && (
                <span className="text-[13px] font-extrabold text-[#059669]">
                  Saved! Home, Smart Practice, and CBT Simulator updated.
                </span>
              )}
            </div>
          </section>

          {/* RIGHT: Syllabus Explorer */}
          <section
            className="md:col-span-5 bg-white rounded-[24px] p-4 sm:p-6"
            style={{ boxShadow: '0 4px 0 #E2C700' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={19} className="text-[#6C19E5]" />
              <h2 className="text-[17.5px] font-extrabold text-[#260559]">
                Syllabus Topic Explorer
              </h2>
            </div>

            {/* Subject Switcher Chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {selected.map(subj => (
                <button
                  key={subj}
                  type="button"
                  onClick={() => setActiveSyllabusSubject(subj)}
                  className={`px-3 py-1.5 rounded-full text-[12.5px] font-extrabold cursor-pointer ${
                    activeSyllabusSubject === subj
                      ? 'bg-[#2A085E] text-[#FFE51E]'
                      : 'bg-[#F5F0FF] text-[#4A356E]'
                  }`}
                >
                  {getShortSubjectLabel(subj)}
                </button>
              ))}
            </div>

            <div className="space-y-2.5">
              {syllabusTopics.map(topic => (
                <button
                  key={topic}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/practice/session?pace=guided&focus=${encodeURIComponent(
                        activeSyllabusSubject
                      )}`
                    )
                  }
                  className="w-full rounded-[15px] bg-[#FAF7FF] hover:bg-[#EFE6FF] border border-[#E7DCFA] px-4 py-3 flex items-center justify-between gap-2 text-left cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-extrabold text-[#260559] truncate">
                      {topic}
                    </div>
                    <div className="text-[11.5px] font-semibold text-[#5A467A]">
                      JAMB Syllabus · Tap to practise
                    </div>
                  </div>
                  <ArrowRight size={16} className="text-[#6C19E5] shrink-0" />
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </SabiAppChrome>
  );
}
