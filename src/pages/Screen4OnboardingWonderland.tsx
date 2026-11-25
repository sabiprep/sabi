import React, { useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, Lock, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import confetti from 'canvas-confetti';
import {
  CURRENT_CLASS_OPTIONS,
  JAMB_ATTEMPT_OPTIONS,
  ONBOARDING_QUESTIONS,
  WONDERLAND_ONBOARDING_SUBJECTS,
} from '../data/onboardingQuestions';
import {
  SabiGraduationBooksIllustration,
  SabiOnboardingMascot,
} from '../components/common/SabiWonderlandShell';
import { supabase } from '../lib/supabase';
import { apiPostJson } from '../utils/apiClient';
import { sound } from '../utils/soundEffects';

export interface WonderlandOnboardingAnswers {
  fullName: string;
  chosenSubjects: string[]; // Canonical JAMB subject names (4 items, English Language first)
  currentClass: string;
  attempts: string;
  yearsOutOfSchool?: string;
  targetCourse: string;
  targetUniversity: string;
  subjectConfidence: Record<string, number>;
  prioritySubject: string;
  struggleType: string;
  troubleTopic: string;
  studyStyle: string;
  dailyStudyHours: string;
  explanationPreference: string;
}

const DRAFT_STORAGE_KEY = 'sabi_onboarding_wonderland_v3_draft';
const COMPLETED_STORAGE_KEY = 'sabi_onboarding_v3_answers';
const LEGACY_STORAGE_KEY = 'sabi_onboarding_v2_answers';
const SUBMISSION_KEY = 'sabi_onboarding_submission_key';

const DEFAULT_ANSWERS: WonderlandOnboardingAnswers = {
  fullName: '',
  chosenSubjects: ['English Language'],
  currentClass: '',
  attempts: '',
  targetCourse: '',
  targetUniversity: '',
  subjectConfidence: {},
  prioritySubject: '',
  struggleType: '',
  troubleTopic: '',
  studyStyle: '',
  dailyStudyHours: '',
  explanationPreference: '',
};

const QUICK_TROUBLE_TOPICS = [
  'Quadratic Equations',
  'Organic Chemistry',
  'Mechanics & Projectiles',
  'Comprehension & Lexis',
  'Electrolysis & Stoichiometry',
  'Genetics & Ecology',
];

function loadSavedOnboardingAnswers(): WonderlandOnboardingAnswers {
  if (typeof window === 'undefined') return DEFAULT_ANSWERS;
  try {
    const savedName = localStorage.getItem('sabi_user_name') || '';
    const raw =
      localStorage.getItem(DRAFT_STORAGE_KEY) ||
      localStorage.getItem(COMPLETED_STORAGE_KEY) ||
      localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) {
      return {
        ...DEFAULT_ANSWERS,
        fullName: savedName && savedName !== 'Candidate' ? savedName : '',
      };
    }
    const parsed = JSON.parse(raw);
    const rawSubjects = Array.isArray(parsed.chosenSubjects)
      ? parsed.chosenSubjects.filter((s: unknown) => typeof s === 'string' && s.trim())
      : ['English Language'];
    const normalizedSubjects = [
      'English Language',
      ...rawSubjects.filter((s: string) => s !== 'English Language'),
    ].slice(0, 4);

    return {
      ...DEFAULT_ANSWERS,
      ...parsed,
      fullName:
        parsed.fullName ||
        (savedName && savedName !== 'Candidate' ? savedName : 'Candidate'),
      chosenSubjects: normalizedSubjects,
      subjectConfidence:
        parsed.subjectConfidence && typeof parsed.subjectConfidence === 'object'
          ? parsed.subjectConfidence
          : {},
    };
  } catch {
    return DEFAULT_ANSWERS;
  }
}

/**
 * Helper to convert a canonical subject name to the display label shown on the Onboarding UI
 */
function getSubjectDisplayLabel(canonicalName: string): string {
  const found = WONDERLAND_ONBOARDING_SUBJECTS.find(
    item => item.canonicalName === canonicalName
  );
  return found ? found.displayLabel : canonicalName;
}

/**
 * SCREEN 4 (`/onboarding` & `/onboarding/:step`): SABI WONDERLAND ONBOARDING
 * Built 1:1 from the uploaded Onboarding UI reference screens (00a, 00b, 00c)
 * with the 4 excluded questions removed (Exam Timeline, Motivation, Study Environment, Language Style).
 */
export function Screen4OnboardingWonderland() {
  const { step } = useParams<{ step?: string }>();
  const navigate = useNavigate();

  const totalSteps = ONBOARDING_QUESTIONS.length;
  const parsedStep = step ? Number(step) : 1;
  const isCompletedView = step === 'complete';
  const currentStep = isCompletedView
    ? totalSteps
    : Number.isInteger(parsedStep) && parsedStep >= 1 && parsedStep <= totalSteps
    ? parsedStep
    : 1;

  const question = ONBOARDING_QUESTIONS[currentStep - 1];

  const [answers, setAnswers] = useState<WonderlandOnboardingAnswers>(
    loadSavedOnboardingAnswers
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync native Android status bar to #FFE51E yellow
  useEffect(() => {
    if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#FFE51E' }).catch(() => {});
      StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    }
  }, []);

  // Normalize invalid step parameter
  useEffect(() => {
    if (
      !isCompletedView &&
      step !== undefined &&
      (!Number.isInteger(parsedStep) || parsedStep < 1 || parsedStep > totalSteps)
    ) {
      navigate('/onboarding/1', { replace: true });
    }
  }, [isCompletedView, navigate, parsedStep, step, totalSteps]);

  // Persist draft answers on every change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(answers));
    } catch {
      // Ignore storage quota issues
    }
  }, [answers]);

  const selectedSubjects = answers.chosenSubjects;
  const additionalPickedCount = Math.max(0, selectedSubjects.length - 1);

  const updateAnswer = <K extends keyof WonderlandOnboardingAnswers>(
    key: K,
    value: WonderlandOnboardingAnswers[K]
  ) => {
    try {
      sound.playTap();
    } catch {
      // ignore audio errors
    }
    setSubmitError(null);
    setAnswers(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleToggleSubject = (canonicalName: string) => {
    if (canonicalName === 'English Language') return;
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setAnswers(prev => {
      const current = prev.chosenSubjects || ['English Language'];
      const exists = current.includes(canonicalName);
      let nextSubjects: string[];
      if (exists) {
        nextSubjects = current.filter(item => item !== canonicalName);
      } else if (current.length < 4) {
        nextSubjects = [...current, canonicalName];
      } else {
        // Already picked 3 additional subjects; replace the last picked subject or keep as is
        return prev;
      }

      const normalized = [
        'English Language',
        ...nextSubjects.filter(item => item !== 'English Language'),
      ];

      // Clean up confidence and prioritySubject if a subject was deselected
      const nextConfidence: Record<string, number> = {};
      for (const subj of normalized) {
        if (prev.subjectConfidence[subj]) {
          nextConfidence[subj] = prev.subjectConfidence[subj];
        }
      }
      const nextPriority = normalized.includes(prev.prioritySubject)
        ? prev.prioritySubject
        : '';

      return {
        ...prev,
        chosenSubjects: normalized,
        subjectConfidence: nextConfidence,
        prioritySubject: nextPriority,
      };
    });
  };

  const handleSetConfidence = (canonicalSubject: string, rating: number) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setAnswers(prev => ({
      ...prev,
      subjectConfidence: {
        ...prev.subjectConfidence,
        [canonicalSubject]: rating,
      },
    }));
  };

  // Validate whether the active step is complete and CONTINUE is enabled
  const canContinue = useMemo(() => {
    if (isCompletedView) return true;
    switch (question.key) {
      case 'chosenSubjects':
        return selectedSubjects.length === 4;
      case 'academicStatus':
        return Boolean(answers.currentClass.trim() && answers.attempts.trim());
      case 'targetCourse':
        return Boolean(
          answers.targetCourse.trim().length >= 2 &&
            answers.targetUniversity.trim().length >= 2
        );
      case 'subjectConfidence':
        return (
          selectedSubjects.length === 4 &&
          selectedSubjects.every(
            subj =>
              Number.isInteger(answers.subjectConfidence[subj]) &&
              answers.subjectConfidence[subj] >= 1 &&
              answers.subjectConfidence[subj] <= 5
          )
        );
      case 'prioritySubject':
        return selectedSubjects.includes(answers.prioritySubject);
      case 'struggleType':
        return Boolean(answers.struggleType.trim());
      case 'troubleTopic':
        return Boolean(answers.troubleTopic.trim().length >= 2);
      case 'studyStyle':
        return Boolean(answers.studyStyle.trim());
      case 'dailyStudyHours':
        return Boolean(answers.dailyStudyHours.trim());
      case 'explanationPreference':
        return Boolean(answers.explanationPreference.trim());
      default:
        return false;
    }
  }, [answers, isCompletedView, question.key, selectedSubjects]);

  const handleCompleteOnboarding = async () => {
    setSubmitError(null);
    setSubmitting(true);

    const resolvedName =
      (typeof window !== 'undefined' && localStorage.getItem('sabi_user_name')) ||
      answers.fullName ||
      'Candidate';

    const finalPayload: WonderlandOnboardingAnswers = {
      ...answers,
      fullName: resolvedName.trim().length >= 2 ? resolvedName.trim() : 'Candidate',
      chosenSubjects: selectedSubjects,
    };

    try {
      localStorage.setItem(COMPLETED_STORAGE_KEY, JSON.stringify(finalPayload));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(finalPayload));
      localStorage.setItem('sabi_onboarding_completed', 'true');
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      // Sync to backend if an authenticated Supabase session exists
      const { data: authData } = await supabase.auth
        .getUser()
        .catch(() => ({ data: null }));
      if (authData?.user) {
        const submissionKey =
          localStorage.getItem(SUBMISSION_KEY) || crypto.randomUUID();
        localStorage.setItem(SUBMISSION_KEY, submissionKey);
        await apiPostJson('/api/profile/onboarding', {
          questionSetVersion: 'v3',
          submissionKey,
          onboardingAnswers: finalPayload,
          registeredSubjects: selectedSubjects,
        }).catch(() => {});
        localStorage.removeItem(SUBMISSION_KEY);
      }

      try {
        sound.playSuccess();
        confetti({ particleCount: 70, spread: 65, origin: { y: 0.6 } });
      } catch {
        // ignore
      }

      setSubmitting(false);
      navigate('/onboarding/complete');
    } catch (err: any) {
      setSubmitting(false);
      setSubmitError(
        err?.message || 'Could not save your onboarding profile. Please try again.'
      );
    }
  };

  const handleContinue = () => {
    if (!canContinue || submitting) return;
    if (currentStep < totalSteps) {
      navigate(`/onboarding/${currentStep + 1}`);
    } else {
      void handleCompleteOnboarding();
    }
  };

  const handleBack = () => {
    if (isCompletedView) {
      navigate(`/onboarding/${totalSteps}`);
      return;
    }
    if (currentStep > 1) {
      navigate(`/onboarding/${currentStep - 1}`);
    } else {
      navigate('/welcome');
    }
  };

  const progressPercentage = isCompletedView
    ? 100
    : Math.max(12, Math.round((currentStep / totalSteps) * 100));

  const ratedConfidenceCount = selectedSubjects.filter(
    subj =>
      Number.isInteger(answers.subjectConfidence[subj]) &&
      answers.subjectConfidence[subj] >= 1
  ).length;

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#FFE824] text-[#260559] flex flex-col justify-between select-none pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
      }}
    >
      {/* ================================================================= */}
      {/* DECORATIVE BACKGROUND SHAPES (Matches Uploaded Screens 00a/00b/00c) */}
      {/* ================================================================= */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {/* Bottom-Left Soft Cream-Yellow Hollow Circle Ring */}
        <div
          className="absolute -left-[68px] bottom-[118px] sm:bottom-[135px] w-[176px] h-[176px] sm:w-[196px] sm:h-[196px] rounded-full"
          style={{
            border: '21px solid rgba(255, 248, 178, 0.78)',
          }}
        />

        {/* Bottom-Right Warm Orange Circle Dome Behind CONTINUE Button */}
        <div
          className="absolute -right-[42px] -bottom-[56px] w-[205px] h-[205px] sm:w-[235px] sm:h-[235px] rounded-full"
          style={{
            background: 'linear-gradient(145deg, #FFA71A 0%, #FB8C00 100%)',
          }}
        />
      </div>

      {/* ================================================================= */}
      {/* FOREGROUND ONBOARDING CONTAINER (Mobile APK & Desktop Responsive) */}
      {/* ================================================================= */}
      <main className="relative z-10 w-full flex-1 flex flex-col max-w-none md:max-w-[760px] lg:max-w-[840px] mx-auto px-3.5 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-6">
        {/* 1. TOP BAR: Back Square Button + White/Purple Pill Progress Track + Step Counter */}
        <header className="flex items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-5">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className={`w-[46px] h-[46px] rounded-[15px] flex items-center justify-center shrink-0 transition-transform duration-150 active:translate-y-[1.5px] cursor-pointer ${
              currentStep === 1 && !isCompletedView
                ? 'bg-[#FFF38A]/80 text-[#7E6624] shadow-[0_3px_0_rgba(222,194,0,0.45)]'
                : 'bg-white text-[#29065E] shadow-[0_3.5px_0_#E2C700]'
            }`}
          >
            <ChevronLeft size={23} strokeWidth={2.8} />
          </button>

          {/* Horizontal White Pill Track with Purple Progress Fill */}
          <div className="flex-1 h-[15px] sm:h-[16px] rounded-full bg-white overflow-hidden">
            <div
              className="h-full rounded-full bg-[#6C19E5] transition-all duration-300 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Step Counter (e.g. 1/10, 2/10, 3/10) */}
          <div className="text-[16.5px] sm:text-[17.5px] font-extrabold text-[#29065E] tabular-nums shrink-0 min-w-[38px] text-right">
            {currentStep}/{totalSteps}
          </div>
        </header>

        {/* =============================================================== */}
        {/* ACTIVE QUESTION FLOW                                            */}
        {/* =============================================================== */}
        {!isCompletedView ? (
          <>
            {/* 2. SABI OPEN-BOOK MASCOT + WHITE SPEECH BUBBLE PROMPT */}
            <section className="flex items-center gap-3.5 sm:gap-4 mb-6">
              <SabiOnboardingMascot />

              <div
                className="flex-1 bg-white rounded-[22px] px-5 py-4"
                style={{
                  boxShadow: '0 4px 0 #E2C700',
                }}
              >
                <h1 className="text-[20px] sm:text-[22px] font-extrabold text-[#260559] leading-[1.22] tracking-[-0.01em]">
                  {question.question}
                </h1>
                <p className="mt-1.5 text-[13.5px] sm:text-[14.5px] font-medium text-[#463266] leading-[1.4]">
                  {question.subtext}
                </p>
              </div>
            </section>

            {/* 3. QUESTION BODY */}
            <section className="flex-1 flex flex-col">
              {/* --------------------------------------------------------- */}
              {/* Q1: PICK YOUR 4 JAMB SUBJECTS (Screen 00b 1:1 Match)      */}
              {/* --------------------------------------------------------- */}
              {question.type === 'subjects' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15.5px] sm:text-[16px] font-extrabold text-[#260559]">
                      {question.sectionLabel}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#260559] text-[#FFE51E] text-[12.5px] font-extrabold tracking-tight">
                      {additionalPickedCount} of 3 picked
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                    {WONDERLAND_ONBOARDING_SUBJECTS.map(subj => {
                      const isLocked = Boolean(subj.locked);
                      const isSelected = selectedSubjects.includes(subj.canonicalName);

                      if (isLocked) {
                        return (
                          <div
                            key={subj.canonicalName}
                            className="rounded-[17px] bg-[#260559] text-[#FFE51E] px-3.5 sm:px-4 py-3.5 min-h-[54px] flex items-center justify-between gap-2 font-extrabold text-[14.5px] sm:text-[15px]"
                            style={{
                              boxShadow: '0 4px 0 #160236',
                            }}
                          >
                            <span className="leading-snug">{subj.displayLabel}</span>
                            <Lock
                              size={16}
                              strokeWidth={2.5}
                              className="shrink-0 text-[#FFE51E]"
                            />
                          </div>
                        );
                      }

                      return (
                        <button
                          key={subj.canonicalName}
                          type="button"
                          onClick={() => handleToggleSubject(subj.canonicalName)}
                          className={`rounded-[17px] px-3.5 sm:px-4 py-3.5 min-h-[54px] flex items-center justify-between gap-2 text-left font-extrabold text-[14.5px] sm:text-[15px] transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer ${
                            isSelected
                              ? 'bg-[#6C19E5] text-white'
                              : 'bg-white text-[#260559] hover:bg-[#FFFDF4]'
                          }`}
                          style={{
                            boxShadow: isSelected
                              ? '0 4px 0 #46099E'
                              : '0 4px 0 #E2C700',
                          }}
                        >
                          <span className="leading-snug">{subj.displayLabel}</span>
                          {isSelected && (
                            <Check
                              size={18}
                              strokeWidth={2.8}
                              className="shrink-0 text-white"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* Q2: WHERE ARE YOU RIGHT NOW? (Screen 00a 1:1 Match)       */}
              {/* --------------------------------------------------------- */}
              {question.type === 'status' && (
                <div className="space-y-5">
                  <div>
                    <div className="text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5">
                      Your current class
                    </div>
                    <div className="space-y-3">
                      {CURRENT_CLASS_OPTIONS.map(option => {
                        const isSelected = answers.currentClass === option;
                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() => updateAnswer('currentClass', option)}
                            className={`w-full rounded-[18px] px-5 py-4 text-left font-extrabold text-[16px] sm:text-[16.5px] transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer ${
                              isSelected
                                ? 'bg-[#6C19E5] text-white'
                                : 'bg-white text-[#260559] hover:bg-[#FFFDF4]'
                            }`}
                            style={{
                              boxShadow: isSelected
                                ? '0 4px 0 #46099E'
                                : '0 4px 0 #E2C700',
                            }}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5">
                      Times you’ve written JAMB before
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {JAMB_ATTEMPT_OPTIONS.map(attempt => {
                        const isSelected = answers.attempts === attempt;
                        return (
                          <button
                            key={attempt}
                            type="button"
                            onClick={() => updateAnswer('attempts', attempt)}
                            className={`rounded-[18px] py-3.5 sm:py-4 text-center font-extrabold text-[18px] sm:text-[19px] transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer ${
                              isSelected
                                ? 'bg-[#6C19E5] text-white'
                                : 'bg-white text-[#260559] hover:bg-[#FFFDF4]'
                            }`}
                            style={{
                              boxShadow: isSelected
                                ? '0 4px 0 #46099E'
                                : '0 4px 0 #E2C700',
                            }}
                          >
                            {attempt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* Q3: WHAT DO YOU WANT TO STUDY? (Screen 00c 1:1 Match)     */}
              {/* --------------------------------------------------------- */}
              {question.type === 'course_uni' && (
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="sabi-intended-course"
                      className="block text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5"
                    >
                      Intended course
                    </label>
                    <div
                      className="bg-white rounded-[18px] px-5 py-4 focus-within:ring-2 focus-within:ring-[#6C19E5]"
                      style={{ boxShadow: '0 4px 0 #E2C700' }}
                    >
                      <input
                        id="sabi-intended-course"
                        type="text"
                        value={answers.targetCourse}
                        onChange={e => updateAnswer('targetCourse', e.target.value)}
                        placeholder="Medicine and Surgery"
                        className="w-full bg-transparent text-[16px] sm:text-[17px] font-extrabold text-[#260559] placeholder:text-[#260559]/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="sabi-preferred-institution"
                      className="block text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5"
                    >
                      Preferred institution
                    </label>
                    <div
                      className="bg-white rounded-[18px] px-5 py-4 focus-within:ring-2 focus-within:ring-[#6C19E5]"
                      style={{ boxShadow: '0 4px 0 #E2C700' }}
                    >
                      <input
                        id="sabi-preferred-institution"
                        type="text"
                        value={answers.targetUniversity}
                        onChange={e => updateAnswer('targetUniversity', e.target.value)}
                        placeholder="University of Uyo"
                        className="w-full bg-transparent text-[16px] sm:text-[17px] font-extrabold text-[#260559] placeholder:text-[#260559]/40 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* Q4: SUBJECT CONFIDENCE LEVELS (Play Store 5-Star Rating)  */}
              {/* --------------------------------------------------------- */}
              {question.type === 'confidence' && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[15.5px] sm:text-[16px] font-extrabold text-[#260559]">
                      {question.sectionLabel}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#260559] text-[#FFE51E] text-[12.5px] font-extrabold tracking-tight">
                      {ratedConfidenceCount} of {selectedSubjects.length} rated
                    </span>
                  </div>

                  <div className="space-y-3">
                    {selectedSubjects.map(canonicalSubject => {
                      const currentRating = answers.subjectConfidence[canonicalSubject] || 0;
                      const ratingLabels: Record<number, string> = {
                        0: 'Tap stars to rate',
                        1: 'Needs heavy focus',
                        2: 'Still shaky',
                        3: 'Getting there',
                        4: 'Confident',
                        5: 'Exam-ready',
                      };
                      return (
                        <div
                          key={canonicalSubject}
                          className="bg-white rounded-[18px] px-4 py-3.5"
                          style={{ boxShadow: '0 4px 0 #E2C700' }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2.5">
                            <span className="text-[15px] sm:text-[15.5px] font-extrabold text-[#260559] truncate">
                              {getSubjectDisplayLabel(canonicalSubject)}
                            </span>
                            <span
                              className={`text-[12px] font-extrabold whitespace-nowrap ${
                                currentRating > 0 ? 'text-[#6C19E5]' : 'text-[#7A689C]'
                              }`}
                            >
                              {ratingLabels[currentRating] || ratingLabels[0]}
                            </span>
                          </div>
                          <div
                            className="flex items-center justify-between gap-1.5 sm:gap-2"
                            role="radiogroup"
                            aria-label={`${getSubjectDisplayLabel(canonicalSubject)} confidence rating`}
                          >
                            {[1, 2, 3, 4, 5].map(starValue => {
                              const isFilled = starValue <= currentRating;
                              return (
                                <button
                                  key={starValue}
                                  type="button"
                                  role="radio"
                                  aria-checked={currentRating === starValue}
                                  aria-label={`Rate ${getSubjectDisplayLabel(canonicalSubject)} ${starValue} out of 5 stars`}
                                  onClick={() =>
                                    handleSetConfidence(canonicalSubject, starValue)
                                  }
                                  className={`flex-1 min-h-[46px] rounded-[13px] flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                                    isFilled
                                      ? 'bg-[#FFF8D6] border border-[#F2C94C]'
                                      : 'bg-[#F6F2FF] border border-transparent hover:bg-[#EDE4FF]'
                                  }`}
                                >
                                  <Star
                                    size={26}
                                    strokeWidth={2.2}
                                    className={`transition-transform duration-150 ${
                                      isFilled
                                        ? 'text-[#F59E0B] fill-[#FFB800] scale-105'
                                        : 'text-[#B6A5D6] fill-transparent'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* Q5: PRIORITY / WEAKEST SUBJECT                            */}
              {/* --------------------------------------------------------- */}
              {question.type === 'priority' && (
                <div>
                  <div className="text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5">
                    {question.sectionLabel}
                  </div>
                  <div className="space-y-3">
                    {selectedSubjects.map(canonicalSubject => {
                      const isSelected = answers.prioritySubject === canonicalSubject;
                      return (
                        <button
                          key={canonicalSubject}
                          type="button"
                          onClick={() => updateAnswer('prioritySubject', canonicalSubject)}
                          className={`w-full rounded-[18px] px-5 py-4 flex items-center justify-between text-left font-extrabold text-[16px] sm:text-[16.5px] transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer ${
                            isSelected
                              ? 'bg-[#6C19E5] text-white'
                              : 'bg-white text-[#260559] hover:bg-[#FFFDF4]'
                          }`}
                          style={{
                            boxShadow: isSelected
                              ? '0 4px 0 #46099E'
                              : '0 4px 0 #E2C700',
                          }}
                        >
                          <span>{getSubjectDisplayLabel(canonicalSubject)}</span>
                          {isSelected && (
                            <Check size={19} strokeWidth={2.8} className="text-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* Q6, Q8, Q9, Q10: SINGLE-SELECT RADIO CARDS                */}
              {/* --------------------------------------------------------- */}
              {question.type === 'radio' && question.options && (
                <div>
                  <div className="text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5">
                    {question.sectionLabel}
                  </div>
                  <div className="space-y-3">
                    {question.options.map(option => {
                      const currentVal =
                        answers[question.key as keyof WonderlandOnboardingAnswers];
                      const isSelected = currentVal === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() =>
                            updateAnswer(
                              question.key as keyof WonderlandOnboardingAnswers,
                              option as never
                            )
                          }
                          className={`w-full rounded-[18px] px-5 py-4 flex items-center justify-between gap-3 text-left font-extrabold text-[15.5px] sm:text-[16.5px] transition-transform duration-100 active:translate-y-[1.5px] cursor-pointer ${
                            isSelected
                              ? 'bg-[#6C19E5] text-white'
                              : 'bg-white text-[#260559] hover:bg-[#FFFDF4]'
                          }`}
                          style={{
                            boxShadow: isSelected
                              ? '0 4px 0 #46099E'
                              : '0 4px 0 #E2C700',
                          }}
                        >
                          <span className="leading-snug">{option}</span>
                          {isSelected && (
                            <Check
                              size={19}
                              strokeWidth={2.8}
                              className="shrink-0 text-white"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------- */}
              {/* Q7: SPECIFIC TROUBLE TOPIC (Text Card + Quick Suggestions)*/}
              {/* --------------------------------------------------------- */}
              {question.type === 'text' && question.key === 'troubleTopic' && (
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="sabi-trouble-topic"
                      className="block text-[15.5px] sm:text-[16px] font-extrabold text-[#260559] mb-2.5"
                    >
                      {question.sectionLabel}
                    </label>
                    <div
                      className="bg-white rounded-[18px] px-5 py-4 focus-within:ring-2 focus-within:ring-[#6C19E5]"
                      style={{ boxShadow: '0 4px 0 #E2C700' }}
                    >
                      <input
                        id="sabi-trouble-topic"
                        type="text"
                        value={answers.troubleTopic}
                        onChange={e => updateAnswer('troubleTopic', e.target.value)}
                        placeholder="e.g. Quadratic Equations, Organic Chemistry..."
                        className="w-full bg-transparent text-[16px] sm:text-[17px] font-extrabold text-[#260559] placeholder:text-[#260559]/40 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="text-[13.5px] font-extrabold text-[#260559]/80 mb-2">
                      Or tap a common trouble topic:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_TROUBLE_TOPICS.map(topic => {
                        const isPicked =
                          answers.troubleTopic.toLowerCase() === topic.toLowerCase();
                        return (
                          <button
                            key={topic}
                            type="button"
                            onClick={() => updateAnswer('troubleTopic', topic)}
                            className={`px-3.5 py-2 rounded-full text-[13px] font-extrabold transition-transform active:translate-y-[1px] cursor-pointer ${
                              isPicked
                                ? 'bg-[#6C19E5] text-white'
                                : 'bg-white text-[#260559]'
                            }`}
                            style={{
                              boxShadow: isPicked
                                ? '0 3px 0 #46099E'
                                : '0 3px 0 #E2C700',
                            }}
                          >
                            {topic}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Optional Error Alert */}
            {submitError && (
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-600/15 border border-rose-600/35 text-xs font-extrabold text-rose-950">
                {submitError}
              </div>
            )}

            {/* 4. BOTTOM PRIMARY CTA: CONTINUE */}
            <footer className="mt-auto pt-4 pb-1">
              <button
                type="button"
                disabled={!canContinue || submitting}
                onClick={handleContinue}
                className={`w-full py-4 sm:py-4.5 rounded-[20px] font-extrabold text-[17px] sm:text-[18px] tracking-[0.06em] uppercase transition-all duration-150 ${
                  canContinue && !submitting
                    ? 'bg-[#6C19E5] text-white active:translate-y-[2px] hover:brightness-105 cursor-pointer'
                    : 'bg-[#DFD5F5] text-[#6B5A8E] cursor-not-allowed'
                }`}
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow:
                    canContinue && !submitting
                      ? '0 5px 0 #46099E'
                      : '0 5px 0 #C4B8DF',
                }}
              >
                {submitting ? 'SAVING PROFILE...' : 'CONTINUE'}
              </button>
            </footer>
          </>
        ) : (
          /* =============================================================== */
          /* ONBOARDING COMPLETE SUMMARY VIEW (Uses sabi-academic-hero.png)  */
          /* =============================================================== */
          <section className="flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3.5 sm:gap-4 mb-4">
                <SabiOnboardingMascot />
                <div
                  className="flex-1 bg-white rounded-[22px] px-5 py-4"
                  style={{ boxShadow: '0 4px 0 #E2C700' }}
                >
                  <h1 className="text-[20px] sm:text-[22px] font-extrabold text-[#260559] leading-[1.2]">
                    Your SABI profile is ready!
                  </h1>
                  <p className="mt-1 text-[13.5px] sm:text-[14.5px] font-medium text-[#463266] leading-[1.4]">
                    We’ve locked in your 4 JAMB subjects and personalized your study engine.
                  </p>
                </div>
              </div>

              <div className="my-2">
                <SabiGraduationBooksIllustration />
              </div>

              <div
                className="bg-white rounded-[22px] p-4 sm:p-5 space-y-3"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#6C19E5]">
                    Your 4 JAMB Subjects
                  </span>
                  <button
                    type="button"
                    onClick={() => navigate('/onboarding/1')}
                    className="text-xs font-extrabold text-[#6C19E5] underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {selectedSubjects.map(subj => (
                    <div
                      key={subj}
                      className="px-3 py-2 rounded-xl bg-[#F4EEFF] text-[#260559] text-xs font-extrabold"
                    >
                      {getSubjectDisplayLabel(subj)}
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-[#F4EEFF] flex items-center justify-between text-xs font-bold text-[#463266]">
                  <span>Goal: {answers.targetCourse || 'Medicine and Surgery'}</span>
                  <span className="font-extrabold text-[#260559]">
                    {answers.targetUniversity || 'University of Uyo'}
                  </span>
                </div>
              </div>
            </div>

            <footer className="mt-auto pt-4 pb-1">
              <button
                type="button"
                onClick={() => navigate('/home')}
                className="w-full py-4 sm:py-4.5 rounded-[20px] bg-[#6C19E5] text-white font-extrabold text-[17px] sm:text-[18px] tracking-[0.06em] uppercase active:translate-y-[2px] hover:brightness-105 transition-all cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 5px 0 #46099E',
                }}
              >
                ENTER HOME DASHBOARD
              </button>
            </footer>
          </section>
        )}
      </main>
    </div>
  );
}
