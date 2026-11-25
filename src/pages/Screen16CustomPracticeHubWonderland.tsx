import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  History,
  SlidersHorizontal,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { SabiBrandEmblem } from '../components/common/SabiBrandEmblem';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { getTopicsForSubject } from '../utils/sabiAiPracticeConfig';
import {
  ALL_JAMB_SUBJECTS,
  loadCustomPracticeConfig,
  loadCustomRunHistory,
  saveCustomPracticeConfig,
  type CustomPracticeConfig,
} from '../utils/cbtAndCustomEngine';
import { getShortSubjectLabel } from '../utils/smartPracticeSession';
import { sound } from '../utils/soundEffects';

const QUESTION_COUNTS = [10, 15, 20, 30, 40];
const DIFFICULTY_OPTIONS: {
  id: CustomPracticeConfig['difficulty'];
  label: string;
}[] = [
  { id: 'mix', label: 'Balanced Mix' },
  { id: 'easy', label: 'Foundation' },
  { id: 'medium', label: 'JAMB Standard' },
  { id: 'hard', label: 'Challenge' },
];
const TIMER_OPTIONS: { label: string; minutes: number | null }[] = [
  { label: 'Untimed', minutes: null },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
];

/**
 * SCREEN 16 (`/practice/custom`): CUSTOM PRACTICE DASHBOARD & BUILDER
 * Full student-controlled practice setup matching the SABI Wonderland UI.
 */
export function Screen16CustomPracticeHubWonderland() {
  const navigate = useNavigate();
  const data = useMemo(() => getWonderlandDashboardState(), []);
  const mySubjects = useMemo(() => data.subjects.map(s => s.canonicalName), [data.subjects]);
  const history = useMemo(() => loadCustomRunHistory(), []);

  const [config, setConfig] = useState<CustomPracticeConfig>(() =>
    loadCustomPracticeConfig(mySubjects)
  );
  const [showAllCatalog, setShowAllCatalog] = useState(false);

  const visibleSubjects = showAllCatalog
    ? ALL_JAMB_SUBJECTS
    : Array.from(new Set([...mySubjects, ...config.subjects]));

  const topicPool = useMemo(() => {
    const merged: string[] = [];
    config.subjects.forEach(subj => {
      getTopicsForSubject(subj).forEach(t => {
        if (!merged.includes(t)) merged.push(t);
      });
    });
    return merged;
  }, [config.subjects]);

  const toggleSubject = (canonical: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setConfig(prev => {
      const exists = prev.subjects.includes(canonical);
      if (exists && prev.subjects.length === 1) return prev; // keep at least 1
      const nextSubjects = exists
        ? prev.subjects.filter(s => s !== canonical)
        : prev.subjects.length >= 4
        ? prev.subjects
        : [...prev.subjects, canonical];
      return { ...prev, subjects: nextSubjects, topics: [], onlyMistakesOrSaved: false };
    });
  };

  const toggleTopic = (topic: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setConfig(prev => {
      const exists = prev.topics.includes(topic);
      return {
        ...prev,
        topics: exists ? prev.topics.filter(t => t !== topic) : [...prev.topics, topic],
      };
    });
  };

  const handleStart = () => {
    try {
      sound.playSuccess();
    } catch {
      // ignore
    }
    const cleanConfig: CustomPracticeConfig = { ...config, onlyMistakesOrSaved: false };
    saveCustomPracticeConfig(cleanConfig);
    navigate('/practice/custom/session', { state: { config: cleanConfig } });
  };

  return (
    <SabiAppChrome
      activeTab="practice"
      backdropVariant="practice"
      streakDays={data.streakDays}
      xpBalance={data.xpBalance}
    >
      <main className="w-full max-w-[1360px] mx-auto px-3 sm:px-5 lg:px-8 pt-3.5 sm:pt-5 lg:pt-7 pb-5">
        {/* 1. HEADER */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label="Back to Home"
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
                Custom Practice
              </h1>
              <p className="text-[13.5px] sm:text-[14.5px] font-semibold text-[#3C2263] truncate">
                You choose exact subjects, topics, length, and feedback style.
              </p>
            </div>
          </div>
          <SabiMenuTriggerButton />
        </header>

        {/* RESPONSIVE BODY: Full-width stack on Mobile, 12-Col Dashboard from `md:` */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (7/12): Subjects + Topics */}
          <div className="md:col-span-7 space-y-4">
            {/* Step 1: Pick Subjects */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-[17px] sm:text-[18.5px] font-extrabold text-[#260559]">
                    1. Choose Subjects (1–4)
                  </h2>
                  <p className="text-[12.5px] font-semibold text-[#5A467A]">
                    Selected: {config.subjects.map(getShortSubjectLabel).join(', ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllCatalog(prev => !prev)}
                  className="text-[12.5px] font-extrabold text-[#6C19E5] hover:underline cursor-pointer shrink-0"
                >
                  {showAllCatalog ? 'My 4 subjects' : 'All JAMB subjects'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {visibleSubjects.map(subj => {
                  const selected = config.subjects.includes(subj);
                  return (
                    <button
                      key={subj}
                      type="button"
                      onClick={() => toggleSubject(subj)}
                      aria-pressed={selected}
                      className={`rounded-[16px] px-3.5 py-3 text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        selected
                          ? 'bg-[#6C19E5] text-white'
                          : 'bg-[#F8F5FF] hover:bg-[#EFE6FF] text-[#260559]'
                      }`}
                      style={selected ? { boxShadow: '0 3.5px 0 #46099E' } : undefined}
                    >
                      <span className="text-[13.5px] font-extrabold truncate">
                        {getShortSubjectLabel(subj)}
                      </span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                          selected ? 'bg-[#FFE824] text-[#260559]' : 'border-2 border-[#C7B3EA]'
                        }`}
                      >
                        {selected && <Check size={12} strokeWidth={3.2} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Step 2: Focus Topics */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <h2 className="text-[17px] sm:text-[18.5px] font-extrabold text-[#260559]">
                    2. Narrow by Topics (Optional)
                  </h2>
                  <p className="text-[12.5px] font-semibold text-[#5A467A]">
                    Leave unselected to cover all syllabus topics evenly.
                  </p>
                </div>
                {config.topics.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, topics: [] }))}
                    className="text-[12px] font-extrabold text-[#6C19E5] cursor-pointer shrink-0"
                  >
                    Clear ({config.topics.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {topicPool.map(topic => {
                  const active = config.topics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`px-3.5 py-2 rounded-full text-[12.5px] font-extrabold transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#2A085E] text-[#FFE51E]'
                          : 'bg-[#F5F0FF] hover:bg-[#EAE0FC] text-[#3B1E6E]'
                      }`}
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (5/12): Length, Difficulty, Feedback, Timer & Launch */}
          <div className="md:col-span-5 space-y-4">
            <section
              className="bg-white rounded-[24px] p-4 sm:p-5 space-y-4"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-[#6C19E5]" />
                <h2 className="text-[17px] font-extrabold text-[#260559]">
                  3. Session Controls
                </h2>
              </div>

              {/* Question Count */}
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#5A467A] mb-2">
                  Question Count
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {QUESTION_COUNTS.map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, questionCount: cnt }))}
                      className={`py-2.5 rounded-[13px] font-extrabold text-[14px] tabular-nums cursor-pointer ${
                        config.questionCount === cnt
                          ? 'bg-[#6C19E5] text-white'
                          : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FC]'
                      }`}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty */}
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#5A467A] mb-2">
                  Difficulty Level
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {DIFFICULTY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, difficulty: opt.id }))}
                      className={`py-2.5 px-3 rounded-[13px] font-extrabold text-[13px] cursor-pointer ${
                        config.difficulty === opt.id
                          ? 'bg-[#2A085E] text-[#FFE51E]'
                          : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FC]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feedback Timing */}
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#5A467A] mb-2">
                  Answer & Explanation Timing
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, feedbackTiming: 'instant' }))}
                    className={`py-2.5 px-3 rounded-[13px] font-extrabold text-[13px] cursor-pointer ${
                      config.feedbackTiming === 'instant'
                        ? 'bg-[#6C19E5] text-white'
                        : 'bg-[#F5F0FF] text-[#260559]'
                    }`}
                  >
                    After every question
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig(prev => ({ ...prev, feedbackTiming: 'end' }))}
                    className={`py-2.5 px-3 rounded-[13px] font-extrabold text-[13px] cursor-pointer ${
                      config.feedbackTiming === 'end'
                        ? 'bg-[#6C19E5] text-white'
                        : 'bg-[#F5F0FF] text-[#260559]'
                    }`}
                  >
                    At the end
                  </button>
                </div>
              </div>

              {/* Optional Pace Timer */}
              <div>
                <div className="text-[12px] font-extrabold uppercase tracking-wider text-[#5A467A] mb-2 flex items-center gap-1.5">
                  <Clock size={13} />
                  <span>Optional Pace Timer</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {TIMER_OPTIONS.map(t => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => setConfig(prev => ({ ...prev, timerMinutes: t.minutes }))}
                      className={`py-2.5 rounded-[13px] font-extrabold text-[13px] cursor-pointer ${
                        config.timerMinutes === t.minutes
                          ? 'bg-[#2A085E] text-[#FFE51E]'
                          : 'bg-[#F5F0FF] text-[#260559]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <button
                type="button"
                onClick={handleStart}
                className="w-full py-4 px-5 rounded-[20px] bg-[#6C19E5] hover:brightness-105 text-white font-bold text-[17px] uppercase tracking-[0.04em] flex items-center justify-center gap-2 transition-transform active:translate-y-[2px] cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 5px 0 #46099E',
                }}
              >
                <span>START CUSTOM ({config.questionCount}Q)</span>
                <ArrowRight size={19} strokeWidth={2.8} />
              </button>
            </section>

            {/* Recent Custom Runs */}
            <section
              className="bg-white rounded-[22px] p-4 sm:p-5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <History size={17} className="text-[#6C19E5]" />
                  <h2 className="text-[15.5px] font-extrabold text-[#260559]">
                    Recent Custom Sets
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/settings/practice')}
                  className="inline-flex items-center gap-1 text-[12px] font-extrabold text-[#6C19E5] cursor-pointer"
                >
                  <SabiBrandEmblem size={14} />
                  <span>Use AI Studio</span>
                </button>
              </div>

              {history.length === 0 ? (
                <p className="text-[13px] font-semibold text-[#5A467A]">
                  Your completed custom practice runs will appear here for quick replay.
                </p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 3).map(run => (
                    <div
                      key={run.id}
                      className="rounded-[14px] bg-[#FAF7FF] px-3.5 py-2.5 flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-extrabold text-[#260559] truncate">
                          {run.subjectsLabel}
                        </div>
                        <div className="text-[12px] font-semibold text-[#5A467A]">
                          {run.correctCount}/{run.totalQuestions} correct
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#EFE6FF] text-[#6C19E5] text-[12.5px] font-extrabold tabular-nums">
                        {run.accuracyPercent}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
