import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ChevronLeft,
  Clock,
  Flame,
  Plus,
  Target,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import confetti from 'canvas-confetti';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { SabiBrandEmblem } from '../components/common/SabiBrandEmblem';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import {
  getTopicsForSubject,
  loadPracticeAiConfig,
  submitPracticeConfigToSabiAi,
  type ConcentrationLevel,
  type ConcentrationMode,
  type DifficultyPosture,
  type ExplanationStyle,
  type SabiPracticeAiConfig,
} from '../utils/sabiAiPracticeConfig';
import { sound } from '../utils/soundEffects';

const CONCENTRATION_LEVELS: {
  id: ConcentrationLevel;
  label: string;
  desc: string;
}[] = [
  { id: 'light', label: 'Light', desc: 'Keep fresh' },
  { id: 'balanced', label: 'Balanced', desc: 'Steady mix' },
  { id: 'deep', label: 'Deep', desc: 'Priority' },
  { id: 'sprint', label: 'Sprint', desc: 'Max focus' },
];

const CONCENTRATION_MODES: {
  id: ConcentrationMode;
  title: string;
  subtitle: string;
}[] = [
  {
    id: 'guided_first',
    title: 'Smart Practice First',
    subtitle: 'Calm step-by-step adaptive drills before rapid Blitz reinforcement.',
  },
  {
    id: 'blitz_heavy',
    title: 'Blitz Rapid Feed',
    subtitle: 'High-volume rapid-fire questions with micro-explanations and streaks.',
  },
  {
    id: 'balanced_mix',
    title: 'Balanced Smart Practice + Blitz',
    subtitle: 'SABI alternates deep Smart Practice fixes with quick Blitz retention runs.',
  },
  {
    id: 'cbt_readiness',
    title: 'CBT Exam Readiness',
    subtitle: 'Focus on JAMB past-question stamina and high-yield exam traps.',
  },
];

const DIFFICULTY_POSTURES: { id: DifficultyPosture; label: string; hint: string }[] = [
  { id: 'confidence', label: 'Build Confidence', hint: 'Start friendly' },
  { id: 'adaptive', label: 'Adaptive Mix', hint: 'SABI adjusts' },
  { id: 'challenge', label: 'Exam Stretch', hint: 'Tougher items' },
];

const EXPLANATION_STYLES: { id: ExplanationStyle; label: string }[] = [
  { id: 'brief', label: 'Brief & sharp' },
  { id: 'step_by_step', label: 'Detailed step-by-step' },
  { id: 'pidgin_friendly', label: 'Naija Pidgin friendly' },
];

const DAILY_MINUTES_OPTIONS = [15, 30, 45, 60, 90];

/**
 * SCREEN 10 (`/settings/practice`): SABI AI PRACTICE STUDIO
 * Allows students to configure exact topic/subject concentration levels, study mode,
 * explanation style, and personal instructions, then tap FINISH & SEND TO SABI AI
 * so SABI AI automatically structures Home, Smart Practice, and Blitz for them.
 */
export function Screen10PracticeSettingsWonderland() {
  const navigate = useNavigate();
  const dashboard = useMemo(() => getWonderlandDashboardState(), []);
  const chosenSubjectNames = useMemo(
    () => dashboard.subjects.map(s => s.canonicalName),
    [dashboard.subjects]
  );

  const [config, setConfig] = useState<SabiPracticeAiConfig>(() =>
    loadPracticeAiConfig(chosenSubjectNames)
  );
  const [customTopicInput, setCustomTopicInput] = useState('');
  const [isStructuring, setIsStructuring] = useState(false);
  const [justStructured, setJustStructured] = useState(false);

  const availableTopics = useMemo(() => {
    const base = getTopicsForSubject(config.focusSubjectCanonical);
    const extras = config.focusTopics.filter(t => !base.includes(t));
    return [...base, ...extras];
  }, [config.focusSubjectCanonical, config.focusTopics]);

  const activeSubjectLabel =
    dashboard.subjects.find(s => s.canonicalName === config.focusSubjectCanonical)?.displayLabel ||
    config.focusSubjectCanonical;

  const handleSelectFocusSubject = (canonical: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    const defaultTopic = getTopicsForSubject(canonical)[0];
    setConfig(prev => ({
      ...prev,
      focusSubjectCanonical: canonical,
      focusTopics: [defaultTopic],
      subjectLevels: {
        ...prev.subjectLevels,
        [canonical]:
          prev.subjectLevels[canonical] === 'light' || !prev.subjectLevels[canonical]
            ? 'deep'
            : prev.subjectLevels[canonical],
      },
    }));
    setJustStructured(false);
  };

  const handleToggleTopic = (topic: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setConfig(prev => {
      const exists = prev.focusTopics.includes(topic);
      if (exists) {
        if (prev.focusTopics.length === 1) return prev; // Keep at least 1 topic selected
        return { ...prev, focusTopics: prev.focusTopics.filter(t => t !== topic) };
      }
      return { ...prev, focusTopics: [...prev.focusTopics.slice(0, 4), topic] };
    });
    setJustStructured(false);
  };

  const handleAddCustomTopic = () => {
    const trimmed = customTopicInput.trim();
    if (trimmed.length < 2) return;
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setConfig(prev => ({
      ...prev,
      focusTopics: prev.focusTopics.includes(trimmed)
        ? prev.focusTopics
        : [...prev.focusTopics.slice(0, 4), trimmed],
    }));
    setCustomTopicInput('');
    setJustStructured(false);
  };

  const handleSetSubjectLevel = (canonical: string, level: ConcentrationLevel) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setConfig(prev => ({
      ...prev,
      subjectLevels: {
        ...prev.subjectLevels,
        [canonical]: level,
      },
    }));
    setJustStructured(false);
  };

  const handleFinishAndSendToAi = async () => {
    if (isStructuring) return;
    setIsStructuring(true);
    try {
      sound.playTap();
    } catch {
      // ignore
    }

    // Brief visual rhythm so the student clearly sees SABI AI structuring their app
    const [updated] = await Promise.all([
      submitPracticeConfigToSabiAi({
        config,
        chosenSubjects: chosenSubjectNames,
        firstName: dashboard.firstName,
      }),
      new Promise(resolve => setTimeout(resolve, 650)),
    ]);

    setConfig(updated);
    setIsStructuring(false);
    setJustStructured(true);

    try {
      sound.playSuccess();
      confetti({ particleCount: 55, spread: 60, origin: { y: 0.65 } });
    } catch {
      // ignore
    }
  };

  return (
    <SabiAppChrome
      activeTab="practice-settings"
      backdropVariant="practice"
      streakDays={dashboard.streakDays}
      xpBalance={dashboard.xpBalance}
    >
      <main className="w-full max-w-[1340px] mx-auto px-3 sm:px-5 lg:px-8 pt-3 sm:pt-5 lg:pt-7">
        {/* 1. TOP BAR: Back + Title + 3-Dash Menu */}
        <header className="flex items-center justify-between gap-3 mb-4 sm:mb-5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label="Back to Home"
              className="w-[44px] h-[44px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center transition-transform active:translate-y-[1.5px] cursor-pointer shrink-0"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.8} />
            </button>

            <div className="min-w-0">
              <h1
                className="text-[24px] sm:text-[30px] font-bold text-[#260559] leading-tight truncate"
                style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
              >
                SABI AI Practice Studio
              </h1>
              <p className="text-[13px] sm:text-[14.5px] font-semibold text-[#3C2263] leading-snug">
                Tell SABI where to concentrate — hit Finish and AI structures your whole app.
              </p>
            </div>
          </div>

          <SabiMenuTriggerButton />
        </header>

        {/* 2. ACTIVE SABI AI BLUEPRINT RESULT BANNER (Shows immediately after sending or if already active) */}
        {config.blueprint && (
          <section
            className={`rounded-[24px] p-4 sm:p-6 mb-5 text-white transition-all ${
              justStructured
                ? 'bg-[#2A085E] ring-[3px] ring-[#059669]'
                : 'bg-[#3B0D91]'
            }`}
            style={{ boxShadow: '0 5px 0 #1B0442' }}
          >
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="w-[48px] h-[48px] rounded-[15px] bg-[#FFE824] text-[#260559] flex items-center justify-center shrink-0">
                  <SabiBrandEmblem size={25} />
                </div>
                <div className="min-w-0">
                  <div className="text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-[#FFE51E]">
                    {justStructured ? 'SABI AI JUST STRUCTURED YOUR APP' : 'ACTIVE SABI AI BLUEPRINT'}
                  </div>
                  <h2 className="mt-0.5 text-[18.5px] sm:text-[21px] font-extrabold text-white leading-snug">
                    {config.blueprint.headline}
                  </h2>
                  <p className="mt-1.5 text-[14px] sm:text-[14.5px] font-medium text-[#E4D7FC] leading-relaxed">
                    {config.blueprint.coachSummary}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/practice/session?pace=${config.blueprint?.recommendedPace === 'blitz' ? 'blitz' : 'smart'}&focus=${encodeURIComponent(
                        config.blueprint?.recommendedSubjectCanonical || config.focusSubjectCanonical
                      )}`
                    )
                  }
                  className="px-4 py-3 rounded-[16px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[13.5px] uppercase tracking-wide flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  style={{ boxShadow: '0 3.5px 0 #C7AD00' }}
                >
                  <Zap size={16} className="fill-[#6C19E5] text-[#6C19E5]" />
                  <span>Start Session</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/home')}
                  className="px-4 py-3 rounded-[16px] bg-white/15 hover:bg-white/25 text-white font-extrabold text-[13.5px] cursor-pointer whitespace-nowrap"
                >
                  View Home
                </button>
              </div>
            </div>

            {/* Structured Allocation Strip */}
            <div className="mt-4 pt-3.5 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {config.blueprint.actionSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="rounded-[14px] bg-white/10 px-3.5 py-2.5 text-[12.5px] font-semibold text-[#F1E8FF] leading-snug"
                >
                  {step}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. RESPONSIVE 12-COL CONFIGURATOR GRID */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN (7/12): Subject & Topic Concentration + Per-Subject Intensity */}
          <div className="md:col-span-7 space-y-4">
            {/* A. PRIMARY SUBJECT & TOPICS */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-[12px] bg-[#EFE6FF] text-[#6C19E5] flex items-center justify-center shrink-0">
                  <Target size={19} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-[17px] sm:text-[18.5px] font-extrabold text-[#260559] leading-tight">
                    1. Primary Subject & Topics
                  </h2>
                  <p className="text-[12.5px] font-semibold text-[#5A467A]">
                    Pick the subject and exact topics SABI should concentrate on first.
                  </p>
                </div>
              </div>

              {/* 4 JAMB Subject Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {dashboard.subjects.map(subj => {
                  const isSelected = subj.canonicalName === config.focusSubjectCanonical;
                  return (
                    <button
                      key={subj.canonicalName}
                      type="button"
                      onClick={() => handleSelectFocusSubject(subj.canonicalName)}
                      className={`px-3 py-2.5 rounded-[14px] text-[13.5px] font-extrabold transition-transform active:translate-y-[1px] cursor-pointer truncate ${
                        isSelected
                          ? 'bg-[#6C19E5] text-white'
                          : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FC]'
                      }`}
                      style={{
                        boxShadow: isSelected ? '0 3.5px 0 #46099E' : '0 2.5px 0 #DFD3F8',
                      }}
                    >
                      {subj.displayLabel}
                    </button>
                  );
                })}
              </div>

              {/* Topic Selector Pills for Active Subject */}
              <div className="text-[13px] font-extrabold text-[#260559] mb-2">
                {activeSubjectLabel} topics to target ({config.focusTopics.length} selected):
              </div>
              <div className="flex flex-wrap gap-2 mb-3.5">
                {availableTopics.map(topic => {
                  const active = config.focusTopics.includes(topic);
                  return (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => handleToggleTopic(topic)}
                      className={`px-3.5 py-2 rounded-full text-[13px] font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                        active
                          ? 'bg-[#2A085E] text-[#FFE824]'
                          : 'bg-[#F6F3FF] text-[#3C2263] hover:bg-[#ECE4FF]'
                      }`}
                    >
                      {active && <Check size={14} strokeWidth={3} />}
                      <span>{topic}</span>
                    </button>
                  );
                })}
              </div>

              {/* Add Custom Topic */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customTopicInput}
                  onChange={e => setCustomTopicInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomTopic();
                    }
                  }}
                  placeholder={`Add another ${activeSubjectLabel} topic...`}
                  className="flex-1 min-w-0 px-4 py-2.5 rounded-[14px] bg-[#FAF8FF] border border-[#E5DAF9] text-[14px] font-semibold text-[#260559] placeholder:text-[#7E6AA3] focus:outline-none focus:ring-2 focus:ring-[#6C19E5]"
                />
                <button
                  type="button"
                  onClick={handleAddCustomTopic}
                  className="px-3.5 py-2.5 rounded-[14px] bg-[#EFE6FF] hover:bg-[#E2D2FF] text-[#6C19E5] font-extrabold text-[13.5px] flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus size={16} strokeWidth={2.8} />
                  <span>Add</span>
                </button>
              </div>
            </section>

            {/* B. CONCENTRATION LEVEL PER SUBJECT */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-[12px] bg-[#FFEBD6] text-[#C2410C] flex items-center justify-center shrink-0">
                  <Flame size={19} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-[17px] sm:text-[18.5px] font-extrabold text-[#260559] leading-tight">
                    2. Concentration Level by Subject
                  </h2>
                  <p className="text-[12.5px] font-semibold text-[#5A467A]">
                    Control how heavily SABI weights each of your 4 JAMB subjects.
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {dashboard.subjects.map(subj => {
                  const currentLevel: ConcentrationLevel =
                    config.subjectLevels[subj.canonicalName] || 'balanced';
                  return (
                    <div
                      key={subj.canonicalName}
                      className="rounded-[18px] bg-[#FAF8FF] p-3.5 border border-[#EFE9FC]"
                    >
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[15px] font-extrabold text-[#260559]">
                          {subj.displayLabel}
                        </span>
                        <span className="text-[12px] font-extrabold text-[#6C19E5] tabular-nums">
                          Mastery {subj.percent}% · {currentLevel.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
                        {CONCENTRATION_LEVELS.map(lvl => {
                          const isSelected = currentLevel === lvl.id;
                          return (
                            <button
                              key={lvl.id}
                              type="button"
                              onClick={() => handleSetSubjectLevel(subj.canonicalName, lvl.id)}
                              className={`py-2 px-1.5 rounded-[12px] text-center transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#6C19E5] text-white shadow-[0_3px_0_#46099E]'
                                  : 'bg-white text-[#260559] hover:bg-[#F1E8FF]'
                              }`}
                            >
                              <div className="text-[12.5px] font-extrabold leading-tight">
                                {lvl.label}
                              </div>
                              <div
                                className={`text-[10.5px] font-semibold leading-tight mt-0.5 ${
                                  isSelected ? 'text-[#E9D8FF]' : 'text-[#6E5C91]'
                                }`}
                              >
                                {lvl.desc}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN (5/12): Mode, Style, Personal AI Notes & FINISH Button */}
          <div className="md:col-span-5 space-y-4">
            {/* C. MODE OF CONCENTRATION & STUDY PACE */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-9 h-9 rounded-[12px] bg-[#DEF7EC] text-[#047857] flex items-center justify-center shrink-0">
                  <Clock size={19} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-[17px] sm:text-[18.5px] font-extrabold text-[#260559] leading-tight">
                    3. Mode & Coaching Style
                  </h2>
                  <p className="text-[12.5px] font-semibold text-[#5A467A]">
                    Choose how SABI should guide and explain answers to you.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 mb-4">
                {CONCENTRATION_MODES.map(mode => {
                  const active = config.concentrationMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => {
                        setConfig(prev => ({ ...prev, concentrationMode: mode.id }));
                        setJustStructured(false);
                      }}
                      className={`w-full text-left rounded-[16px] p-3.5 border-[2px] transition-all cursor-pointer flex items-start justify-between gap-3 ${
                        active
                          ? 'bg-[#F6F0FF] border-[#6C19E5]'
                          : 'bg-[#FAF8FF] border-transparent hover:border-[#DED1FA]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[14.5px] font-extrabold text-[#260559]">
                          {mode.title}
                        </div>
                        <div className="text-[12.5px] font-semibold text-[#5A467A] mt-0.5 leading-snug">
                          {mode.subtitle}
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          active
                            ? 'bg-[#6C19E5] text-white'
                            : 'border-[2px] border-[#BDA8E8]'
                        }`}
                      >
                        {active && <Check size={14} strokeWidth={3} />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Difficulty Posture */}
              <div className="mb-4">
                <div className="text-[13px] font-extrabold text-[#260559] mb-2">
                  Difficulty posture
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTY_POSTURES.map(item => {
                    const active = config.difficultyPosture === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setConfig(prev => ({ ...prev, difficultyPosture: item.id }));
                          setJustStructured(false);
                        }}
                        className={`py-2.5 px-2 rounded-[14px] text-center cursor-pointer transition-all ${
                          active
                            ? 'bg-[#2A085E] text-[#FFE824]'
                            : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FC]'
                        }`}
                      >
                        <div className="text-[12px] font-extrabold leading-tight">
                          {item.label}
                        </div>
                        <div
                          className={`text-[10.5px] font-semibold mt-0.5 ${
                            active ? 'text-[#DCD0F5]' : 'text-[#6E5C91]'
                          }`}
                        >
                          {item.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Explanation Style */}
              <div className="mb-4">
                <div className="text-[13px] font-extrabold text-[#260559] mb-2">
                  Explanation style
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXPLANATION_STYLES.map(style => {
                    const active = config.explanationStyle === style.id;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => {
                          setConfig(prev => ({ ...prev, explanationStyle: style.id }));
                          setJustStructured(false);
                        }}
                        className={`px-3.5 py-2 rounded-full text-[12.5px] font-extrabold cursor-pointer ${
                          active
                            ? 'bg-[#6C19E5] text-white'
                            : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FC]'
                        }`}
                      >
                        {style.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Daily Time Budget */}
              <div>
                <div className="text-[13px] font-extrabold text-[#260559] mb-2">
                  Daily study time
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {DAILY_MINUTES_OPTIONS.map(mins => {
                    const active = config.dailyMinutes === mins;
                    return (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => {
                          setConfig(prev => ({ ...prev, dailyMinutes: mins }));
                          setJustStructured(false);
                        }}
                        className={`py-2 rounded-[12px] text-[13px] font-extrabold tabular-nums cursor-pointer ${
                          active
                            ? 'bg-[#FF7A00] text-white shadow-[0_3px_0_#C45600]'
                            : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FC]'
                        }`}
                      >
                        {mins}m
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* D. FREEFORM STUDENT REQUEST TO SABI AI + FINISH CTA */}
            <section
              className="bg-white rounded-[24px] p-4 sm:p-6 border-[2.5px] border-[#6C19E5]"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <label
                htmlFor="sabi-ai-instructions"
                className="block text-[16.5px] font-extrabold text-[#260559] mb-1"
              >
                4. Tell SABI AI how to help you
              </label>
              <p className="text-[12.5px] font-semibold text-[#5A467A] mb-3">
                Share any specific trouble area, exam target, or teaching style you want SABI AI to
                apply across your practice feeds.
              </p>

              <textarea
                id="sabi-ai-instructions"
                rows={4}
                value={config.customInstructions}
                onChange={e => {
                  setConfig(prev => ({ ...prev, customInstructions: e.target.value }));
                  setJustStructured(false);
                }}
                placeholder="e.g. I keep missing Organic Chemistry naming and Laws of Logarithms. Give me more worked steps when I fail calculations and mix Physics units into my Blitz runs..."
                className="w-full rounded-[16px] bg-[#FAF8FF] border border-[#E2D6FA] p-3.5 text-[14px] font-semibold text-[#260559] placeholder:text-[#8672AB] focus:outline-none focus:ring-2 focus:ring-[#6C19E5] resize-none mb-4"
              />

              <button
                type="button"
                disabled={isStructuring}
                onClick={() => void handleFinishAndSendToAi()}
                className="w-full py-4 px-5 rounded-[20px] bg-[#6C19E5] hover:brightness-105 disabled:opacity-70 text-white font-bold text-[17px] sm:text-[18px] tracking-[0.04em] uppercase flex items-center justify-center gap-2.5 transition-transform duration-100 active:translate-y-[2px] cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 5px 0 #46099E',
                }}
              >
                <SabiBrandEmblem size={20} className="shrink-0" />
                <span>
                  {isStructuring ? 'SABI AI IS STRUCTURING...' : 'FINISH & SEND TO SABI AI'}
                </span>
                {!isStructuring && <ArrowRight size={19} strokeWidth={2.6} />}
              </button>

              <p className="mt-2.5 text-center text-[12px] font-semibold text-[#5A467A]">
                Automatically updates your Home focus, Daily Goal, and Practice Hub feeds.
              </p>
            </section>
          </div>
        </div>
      </main>
    </SabiAppChrome>
  );
}
