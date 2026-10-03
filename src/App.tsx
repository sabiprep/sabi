import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Sparkles,
  Award,
  Users,
  Settings,
  HelpCircle,
  Info,
  Play,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Check,
  ChevronRight,
  User,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Eye,
  EyeOff,
  Clock,
  Heart,
  ChevronLeft,
  ShieldAlert,
  Sliders,
  AlertCircle,
  FileText,
  Volume2,
  Calendar,
  Zap,
  Lock,
  Trophy,
  Smartphone,
  Home
} from 'lucide-react';
import { SubjectName, Question, MasteryMapItem, StudentProfile, PipelineLog } from './types';
import { SEED_QUESTIONS } from './data/questions';
import { ONBOARDING_QUESTIONS, SUBJECTS_POOL, OnboardingQuestion } from './data/onboardingQuestions';
import MasteryMap from './components/MasteryMap';
import SabiAIChat from './components/SabiAIChat';
import MathText from './components/MathText';
import {
  reactNativeOnboardingCode,
  reactNativeAuthCode,
  reactNativeDashboardCode,
  reactNativePracticeCode,
  reactNativeMasteryCode,
  reactNativePredictorCode,
  reactNativeLeaderboardCode,
  reactNativeSettingsCode
} from './data/reactNativeCode';

// Utility helper to estimate remaining JAMB timeline
function getDynamicJAMBCountdown() {
  const targetDate = new Date(new Date().getFullYear() + (new Date().getMonth() >= 3 ? 1 : 0), 2, 15);
  const diffDays = Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const months = Math.max(1, Math.floor(diffDays / 30.4));
  const weeks = Math.max(1, Math.floor(diffDays / 7));
  return { diffDays, months, weeks, text: `${months} month${months > 1 ? 's' : ''} and ${Math.floor((diffDays % 30.4) / 7)} week${Math.floor((diffDays % 30.4) / 7) > 1 ? 's' : ''} left` };
}

export default function App() {
  // Simulator View Controls (Workspace Shell)
  const [isOfflineSimulated, setIsOfflineSimulated] = useState(false);

  // Global App Routing Stage
  // 'SIGNUP' -> 'WELCOME_SETUP' -> 'ONBOARDING_PERSONALIZATION' -> 'DIAGNOSTIC_INTRO' -> 'DIAGNOSTIC_QUIZ' -> 'PROFILE_EVALUATION' -> 'DASHBOARD'
  const [appStage, setAppStage] = useState<'SIGNUP' | 'WELCOME_SETUP' | 'ONBOARDING_PERSONALIZATION' | 'DIAGNOSTIC_INTRO' | 'DIAGNOSTIC_QUIZ' | 'PROFILE_EVALUATION' | 'DASHBOARD'>('SIGNUP');

  // Fast Account Creation Status
  const [signupForm, setSignupForm] = useState({ email: '', phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Onboarding Step state (Exactly 15 questions)
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, any>>({
    name: '',
    chosenSubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
    classAndAttempts: { classLevel: 'Senior Secondary 3 (SS3)', attempts: '0 sittings (First-time aspirant)', yearsOutOfSchool: '1 year' },
    targets: { course: '', university: '' },
    monthsUntilExam: `${getDynamicJAMBCountdown().months} months`,
    subjectConfidence: { 'English Language': 3, 'Mathematics': 4, 'Physics': 2, 'Chemistry': 2 } as Record<SubjectName, number>,
    prioritySubject: 'Physics',
    struggleType: 'I make careless mistakes under time pressure',
    selfIdentifiedWeakTopic: '',
    studyHabits: "Structured schedule (set times every day)",
    dailyStudyHours: '2 to 3 hours per day',
    studyEnvironment: 'Quiet private space (home/library)',
    explanationPreference: 'Detailed step-by-step (with proofs and derivations)',
    languagePreference: 'Mixed Nigerian English (Formal logic + supportive Pidgin vibes)',
    motivation: ''
  });

  // Current User Profile state
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  // Mastery Map Database structures
  const [masteryMap, setMasteryMap] = useState<Record<string, MasteryMapItem>>({});
  const [mapSubject, setMapSubject] = useState<SubjectName>('English Language');

  // Adaptive Diagnostic Quiz State Controllers
  const [diagnosticSubjectIndex, setDiagnosticSubjectIndex] = useState(0); // 0 to 3 index of selected 4 subjects
  const [diagnosticQuestionIndex, setDiagnosticQuestionIndex] = useState(0); // 0 to 9 index inside each subject (10 questions per subject)
  const [diagnosticSelectedConfidence, setDiagnosticSelectedConfidence] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [diagnosticCorrectCount, setDiagnosticCorrectCount] = useState(0);

  // Question lists for active diagnostics
  const [diagnosticCurrentQuestions, setDiagnosticCurrentQuestions] = useState<Question[]>([]);
  const [diagnosticActiveQuestion, setDiagnosticActiveQuestion] = useState<Question | null>(null);
  const [diagnosticAnswerSelected, setDiagnosticAnswerSelected] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [diagnosticHasSubmitted, setDiagnosticHasSubmitted] = useState(false);
  
  // Adaptive tracking
  const [quizAdaptiveDifficulty, setQuizAdaptiveDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [quizAnswerLog, setQuizAnswerLog] = useState<{
    subject: SubjectName;
    questionId: string;
    correct: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
    confidence: 'Low' | 'Medium' | 'High';
    timeSpent: number;
  }[]>([]);

  // AI explanations during quiz
  const [aiExplainText, setAiExplainText] = useState('');
  const [aiExplainLoading, setAiExplainLoading] = useState(false);
  const [aiExplainLanguage, setAiExplainLanguage] = useState<'formal' | 'pidgin' | 'mixed'>('mixed');

  // Diagnostic processing state. Authoritative learning metrics come from the backend.
  const [evaluationProgress, setEvaluationProgress] = useState(0);

  // Lifted AI Tutor state to prevent reset on tab transitions
  const [tutorMessages, setTutorMessages] = useState<any[]>([]);
  const [tutorSubject, setTutorSubject] = useState<'English Language' | 'Mathematics' | 'Physics' | 'Chemistry' | 'Biology'>('English Language');
  const [tutorTopic, setTutorTopic] = useState<string>('Proximity Concord');
  const [tutorChatActive, setTutorChatActive] = useState<boolean>(false);

  // Home Dashboard States & Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'practice' | 'blitz' | 'cbt' | 'progress' | 'recommendations' | 'mastery' | 'leaderboard' | 'profile' | 'settings' | 'aitutor' | 'mobile'>('home');
  const [selectedSubjectPractice, setSelectedSubjectPractice] = useState<SubjectName>('English Language');
  const [activeSessionTopicPractice, setActiveSessionTopicPractice] = useState<string>('');
  const [practiceSessionType, setPracticeSessionType] = useState<'smart' | 'custom' | null>(null);
  const [activeSmartSubject, setActiveSmartSubject] = useState<SubjectName>('English Language');
  const [customPracticeSubject, setCustomPracticeSubject] = useState<SubjectName | null>(null);
  const [customPracticeTopic, setCustomPracticeTopic] = useState<string | null>(null);
  const [customPracticeYear, setCustomPracticeYear] = useState<string | null>(null);
  const [practiceQuestions, setPracticeQuestions] = useState<Question[]>([]);
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceSelectedAnswer, setPracticeSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [practiceHasSubmitted, setPracticeHasSubmitted] = useState(false);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [practiceCorrectCount, setPracticeCorrectCount] = useState(0);
  const [showExitQuizModal, setShowExitQuizModal] = useState(false);
  const [customPracticeModalVisible, setCustomPracticeModalVisible] = useState(false);

  // CBT preview state. Production exam session/timer/scoring must come from the backend.
  const [cbtPreviewConfig, setCbtPreviewConfig] = useState<{mode: 'full' | 'quick'; questionCount: number; durationMinutes: number} | null>(null);
  const [cbtPreviewQuestions, setCbtPreviewQuestions] = useState<Question[]>([]);
  const [cbtPreviewIndex, setCbtPreviewIndex] = useState(0);
  const [cbtPreviewAnswers, setCbtPreviewAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [cbtPreviewSubmitted, setCbtPreviewSubmitted] = useState(false);
  const [cbtPreviewStartedAt, setCbtPreviewStartedAt] = useState<number | null>(null);

  // Leaderboard lists
  const [leaderboardFilter, setLeaderboardFilter] = useState<'weekly' | 'alltime'>('weekly');
  const [whatsappInviteMessage, setWhatsappInviteMessage] = useState('Hey buddy! Join Sabi JAMB today, we test our margins adaptively, chat with RAG Sabi AI systems, and watch our score climb! Let\'s pass together: https://sabi.jamb/register?ref=aspirant');

  // Trigger setup initial seeds
  useEffect(() => {
    // Determine active subject is English Language
    setMapSubject('English Language');
  }, []);

  // OTP Verification interaction inputs
  const handleOtpInput = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = val.slice(-1);
    setOtpDigits(newDigits);
    setOtpError('');

    if (val && index < 5) {
      setTimeout(() => {
        otpRefs.current[index + 1]?.focus();
      }, 10);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const newDigits = [...otpDigits];
      newDigits[index - 1] = '';
      setOtpDigits(newDigits);
      setTimeout(() => {
        otpRefs.current[index - 1]?.focus();
      }, 10);
    }
  };

  const handleTriggerSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupForm.email || !signupForm.password) return;
    // Authentication is not connected to the backend yet.
    // Keep the OTP surface as a UI preview without claiming a real verification.
    setShowOtpModal(true);
    setOtpError('');
    // Focus first input box
    setTimeout(() => {
      otpRefs.current[0]?.focus();
    }, 150);
  };

  const handleVerifyOtp = () => {
    const fullCode = otpDigits.join('');
    if (fullCode.length < 6) {
      setOtpError('Please input all 6 verification digits.');
      return;
    }
    setIsVerifyingOtp(true);
    // Preview-only transition. A real implementation must call the
    // authentication/verification API and use its authoritative session state.
    setTimeout(() => {
      setIsVerifyingOtp(false);
      setShowOtpModal(false);
      setAppStage('WELCOME_SETUP');
    }, 600);
  };

  // Onboarding Question validation and navigation
  const handleNextOnboarding = () => {
    // Validation
    if (onboardingStep === 1) {
      if (!onboardingAnswers.name.trim()) return;
    }
    if (onboardingStep === 2) {
      // Must have compulsory English + exactly 3 other subjects
      const selection = onboardingAnswers.chosenSubjects || [];
      if (!selection.includes('English Language')) {
        setOnboardingAnswers(prev => ({ ...prev, chosenSubjects: ['English Language', ...selection] }));
      }
      if ((onboardingAnswers.chosenSubjects || []).length !== 4) return;
    }
    if (onboardingStep === 4) {
      if (!onboardingAnswers.targets.course.trim() || !onboardingAnswers.targets.university.trim()) return;
    }

    if (onboardingStep < 15) {
      setOnboardingStep(prev => prev + 1);
    } else {
      // Completed onboarding journey! Proceed into diagnostic overview.
      setAppStage('DIAGNOSTIC_INTRO');
    }
  };

  const handleBackOnboarding = () => {
    if (onboardingStep > 1) {
      setOnboardingStep(prev => prev - 1);
    } else {
      setAppStage('WELCOME_SETUP');
    }
  };

  const handleSubjectSelectToggle = (subj: SubjectName) => {
    if (subj === 'English Language') return; // Compulsory, can't change
    const current = onboardingAnswers.chosenSubjects || [];
    if (current.includes(subj)) {
      setOnboardingAnswers(prev => ({
        ...prev,
        chosenSubjects: current.filter((s: any) => s !== subj)
      }));
    } else {
      if (current.length >= 4) return; // Limit total to exactly 4
      setOnboardingAnswers(prev => ({
        ...prev,
        chosenSubjects: [...current, subj]
      }));
    }
  };

  const currentOnbQuestion: OnboardingQuestion = ONBOARDING_QUESTIONS[onboardingStep - 1];

  // Diagnostic Quiz initialization Stage
  const handleStartDiagnostic = () => {
    setQuizAnswerLog([]);
    setDiagnosticSubjectIndex(0);
    setDiagnosticQuestionIndex(0);
    setDiagnosticCorrectCount(0);
    setDiagnosticAnswerSelected(null);
    setDiagnosticHasSubmitted(false);
    setQuizAdaptiveDifficulty('medium');
    
    // Choose first subject
    const list = onboardingAnswers.chosenSubjects || ['English Language'];
    const currentSubj = list[0];
    
    // Seed first question of 'medium' difficulty
    initializeNextDiagnosticQuestion(currentSubj, 'medium', []);
    setAppStage('DIAGNOSTIC_QUIZ');
  };

  const initializeNextDiagnosticQuestion = (subj: SubjectName, targetDifficulty: 'easy' | 'medium' | 'hard', answeredIds: string[]) => {
    // Pull from SEED_QUESTIONS for matching subject
    let pool = SEED_QUESTIONS.filter(q => q.subject === subj && !answeredIds.includes(q.id));
    
    // Attempt exact difficulty match
    let subPool = pool.filter(q => q.difficulty === targetDifficulty);
    if (subPool.length === 0) {
      // Fallback
      subPool = pool.filter(q => q.difficulty === 'medium');
    }
    if (subPool.length === 0) {
      subPool = pool; // ultimate fallback
    }

    if (subPool.length > 0) {
      const idx = Math.floor(Math.random() * subPool.length);
      const selectedQ = subPool[idx];
      setDiagnosticActiveQuestion(selectedQ);
      setDiagnosticSelectedConfidence('Medium');
      setDiagnosticAnswerSelected(null);
      setDiagnosticHasSubmitted(false);
      setAiExplainText('');
    } else {
      // Never fabricate or label an invented question as verified.
      // If the preview pool is exhausted, reuse a real seeded question
      // for the UI rather than manufacturing assessment content.
      const reusablePool = SEED_QUESTIONS.filter(q => q.subject === subj);
      if (reusablePool.length === 0) {
        setDiagnosticActiveQuestion(null);
        setDiagnosticSelectedConfidence('Medium');
        setDiagnosticAnswerSelected(null);
        setDiagnosticHasSubmitted(false);
        setAiExplainText('');
        return;
      }

      const selectedQ = reusablePool[Math.floor(Math.random() * reusablePool.length)];
      setDiagnosticActiveQuestion(selectedQ);
      setDiagnosticSelectedConfidence('Medium');
      setDiagnosticAnswerSelected(null);
      setDiagnosticHasSubmitted(false);
      setAiExplainText('');
    }
  };

  const handleSubmitDiagnosticAnswer = async () => {
    if (!diagnosticAnswerSelected || !diagnosticActiveQuestion || diagnosticHasSubmitted) return;
    
    const isCorrect = diagnosticAnswerSelected === diagnosticActiveQuestion.answer;
    setDiagnosticHasSubmitted(true);
    if (isCorrect) setDiagnosticCorrectCount(p => p + 1);

    // Save logs
    const logItem = {
      subject: diagnosticActiveQuestion.subject,
      questionId: diagnosticActiveQuestion.id,
      correct: isCorrect,
      difficulty: diagnosticActiveQuestion.difficulty,
      confidence: diagnosticSelectedConfidence,
      timeSpent: 0 // Preview: real timing belongs to the diagnostic session service.
    };

    const newLog = [...quizAnswerLog, logItem];
    setQuizAnswerLog(newLog);

    // Adaptive difficulty logic update:
    // Start with Medium. Correct -> Hard. Incorrect -> Easy.
    let nextDifficulty: 'easy' | 'medium' | 'hard' = 'medium';
    if (isCorrect) {
      nextDifficulty = diagnosticActiveQuestion.difficulty === 'easy' ? 'medium' : 'hard';
    } else {
      nextDifficulty = diagnosticActiveQuestion.difficulty === 'hard' ? 'medium' : 'easy';
    }
    setQuizAdaptiveDifficulty(nextDifficulty);

    // Auto-advance logic: if correct, 2-second auto-timer. For incorrect, let them read explanation first.
    if (isCorrect) {
      setTimeout(() => {
        // Double check they haven't manually clicked ahead
        handleNextDiagnosticQuestion(newLog, nextDifficulty);
      }, 2500);
    }
  };

  const fetchDiagnosticExplanation = async () => {
    if (!diagnosticActiveQuestion) return;
    setAiExplainLoading(true);
    try {
      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: diagnosticActiveQuestion.id,
          preference: onboardingAnswers.explanationPreference === 'Brief & concise (straight to the point)' ? 'short' : 'detailed',
          language: onboardingAnswers.languagePreference === 'Plain Formal English' ? 'english' : onboardingAnswers.languagePreference === 'West African Pidgin English (Warm and laid back)' ? 'pidgin' : 'mixed'
        })
      });
      const data = await resp.json();
      setAiExplainText(data.explanation || diagnosticActiveQuestion.explanation);
    } catch {
      setAiExplainText(onboardingAnswers.languagePreference.includes('Pidgin') ? diagnosticActiveQuestion.explanation_pidgin : diagnosticActiveQuestion.explanation);
    } finally {
      setAiExplainLoading(false);
    }
  };

  const handleNextDiagnosticQuestion = (currentLog = quizAnswerLog, targetDiff = quizAdaptiveDifficulty) => {
    // Determine subject loop
    const chosenSubjects = onboardingAnswers.chosenSubjects || ['English Language'];
    const currentSubject = chosenSubjects[diagnosticSubjectIndex];
    
    const nextQIndex = diagnosticQuestionIndex + 1;
    if (nextQIndex < 10) {
      // Next question of current subject
      setDiagnosticQuestionIndex(nextQIndex);
      const answeredIds = currentLog.map(l => l.questionId);
      initializeNextDiagnosticQuestion(currentSubject, targetDiff, answeredIds);
    } else {
      // Finished 10 questions for this subject. Move to next subject or end.
      const nextSubIndex = diagnosticSubjectIndex + 1;
      if (nextSubIndex < chosenSubjects.length) {
        setDiagnosticSubjectIndex(nextSubIndex);
        setDiagnosticQuestionIndex(0);
        const nextSubject = chosenSubjects[nextSubIndex];
        const answeredIds = currentLog.map(l => l.questionId);
        initializeNextDiagnosticQuestion(nextSubject, 'medium', answeredIds);
      } else {
        // Complete Diagnostic Diagnostics Quiz! Proceed to Evaluation Stage
        handleTransitionToEvaluation(currentLog);
      }
    }
  };

  const handleTransitionToEvaluation = (fullLog = quizAnswerLog) => {
    // The diagnostic has captured frontend evidence, but authoritative
    // mastery, readiness, weak areas, blindspots and score ranges belong
    // to the backend learning engine.
    setAppStage('PROFILE_EVALUATION');
    setEvaluationProgress(10);

    let step = 10;
    const interval = setInterval(() => {
      step += 15;

      if (step >= 100) {
        step = 100;
        clearInterval(interval);

        const activeProfile: StudentProfile = {
          name: onboardingAnswers.name,
          classLevel: onboardingAnswers.classAndAttempts.classLevel === "Out-of-school Candidate / Resitter"
            ? `Out-of-school (${onboardingAnswers.classAndAttempts.yearsOutOfSchool || '1 year'} out)`
            : (onboardingAnswers.classAndAttempts.classLevel || 'Senior Secondary 3 (SS3)'),
          attempts: onboardingAnswers.classAndAttempts.attempts.includes('First-time') ? 0 : 1,
          chosenSubjects: onboardingAnswers.chosenSubjects,
          targetCourse: onboardingAnswers.targets.course.trim() || '',
          targetUniversity: onboardingAnswers.targets.university.trim() || '',
          monthsUntilExam: parseInt(onboardingAnswers.monthsUntilExam) || getDynamicJAMBCountdown().months,
          subjectConfidence: onboardingAnswers.subjectConfidence,
          struggleTypes: onboardingAnswers.chosenSubjects.reduce((acc: any, curr: any) => {
            acc[curr] = onboardingAnswers.struggleType.includes('careless') ? 'careless' : 'method';
            return acc;
          }, {}),
          studyHabits: onboardingAnswers.studyHabits.includes('Structured') ? 'scheduled' : onboardingAnswers.studyHabits.includes("don't study") ? 'none' : 'flexible',
          dailyStudyHours: onboardingAnswers.dailyStudyHours,
          studyEnvironment: onboardingAnswers.studyEnvironment.includes('Quiet') ? 'quiet' : 'noisy',
          explanationPreference: onboardingAnswers.explanationPreference.includes('Detailed') ? 'step-by-step' : 'short',
          languagePreference: onboardingAnswers.languagePreference.includes('Pidgin') ? 'pidgin' : onboardingAnswers.languagePreference.includes('Mixed') ? 'mixed' : 'english',
          motivation: onboardingAnswers.motivation,
          blindSpots: [],
          // Account, entitlement and engagement values are backend-owned.
          streakCount: 0,
          xpPoints: 0,
          unlockedSubjectsCount: 0,
          isPremium: false,
          aiCredits: 0,
          topicMemories: {},
          conversationHistory: []
        };

        setProfile(activeProfile);

        // Keep diagnostic evidence in the session only. Do not convert it
        // into client-authoritative mastery scores or review dates.
        setTimeout(() => setEvaluationProgress(100), 300);
      } else {
        setEvaluationProgress(step);
      }
    }, 400);
  };

  const handleSkipToDashboard = () => {
    // Populate mock profile
    const activeProfile: StudentProfile = {
      name: "Skipped User",
      classLevel: "Senior Secondary 3 (SS3)",
      attempts: 0,
      chosenSubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
      targetCourse: 'Computer Engineering',
      targetUniversity: 'University of Lagos',
      monthsUntilExam: 2,
      subjectConfidence: { 'English Language': 3, 'Mathematics': 4, 'Physics': 2, 'Chemistry': 3 } as any,
      struggleTypes: { 'English Language': 'careless', 'Mathematics': 'method' } as any,
      studyHabits: 'flexible',
      dailyStudyHours: "1-2 hours",
      studyEnvironment: 'quiet',
      explanationPreference: 'short',
      languagePreference: 'english',
      motivation: "Pass JAMB flawlessly",
      blindSpots: [],
      // Backend-owned account metrics remain neutral until the account/profile API is connected.
      streakCount: 0,
      xpPoints: 0,
      unlockedSubjectsCount: 0,
      isPremium: false,
      aiCredits: 0,
      topicMemories: {},
      conversationHistory: []
    };

    setProfile(activeProfile);

    // Do not manufacture authoritative score, weak-area, or blindspot data in the client.
    setCalculatedScoreRange({ min: 0, max: 0 });
    setCalculatedWeakAreas([]);
    setCalculatedBlindspots([]);

    // No synthetic mastery records in the dashboard preview.
    // The backend learning engine must supply authoritative mastery state.
    setMasteryMap({});


    setAppStage('DASHBOARD');
    setActiveTab('home');
  };

  const handleEnterDashboard = () => {
    setAppStage('DASHBOARD');
    setActiveTab('home');
  };

  // Preview-only question router. The production backend will own Smart Practice
  // selection, exclusions, adaptive sequencing and session configuration.
  const quizInitializationRouter = (sessionType: 'smart' | 'custom', subject: SubjectName): Question[] => {
    const subjectPool = SEED_QUESTIONS.filter(q => q.subject === subject);
    if (subjectPool.length === 0) {
      return SEED_QUESTIONS.slice(0, 10);
    }

    if (sessionType === 'smart') {
      // Preview mix only: 5 easy, 3 medium and 2 hard where available.
      // This must not be treated as the production adaptive-selection algorithm.
      const easyPool = subjectPool.filter(q => q.difficulty === 'easy');
      const mediumPool = subjectPool.filter(q => q.difficulty === 'medium');
      const hardPool = subjectPool.filter(q => q.difficulty === 'hard');

      const selectedQuestions: Question[] = [];

      // Take up to 5 easy
      selectedQuestions.push(...easyPool.slice(0, 5));
      // Take up to 3 medium
      selectedQuestions.push(...mediumPool.slice(0, 3));
      // Take up to 2 hard
      selectedQuestions.push(...hardPool.slice(0, 2));

      // If we don't have enough to make up 10, fill from general subject pool
      if (selectedQuestions.length < 10) {
        const remainingPool = subjectPool.filter(q => !selectedQuestions.includes(q));
        selectedQuestions.push(...remainingPool.slice(0, 10 - selectedQuestions.length));
      }

      return selectedQuestions.slice(0, 10);
    } else {
      // For custom practice sessions
      return subjectPool;
    }
  };

  // Launch customized practice session
  const handleStartSmartPractice = (topicOrSubject: SubjectName | string) => {
    setPracticeSessionType('smart');
    setActiveSessionTopicPractice('Adaptive Mix');
    setPracticeQuestions([]);
    setPracticeIndex(0);
    setPracticeSelectedAnswer(null);
    setPracticeHasSubmitted(false);
    setPracticeComplete(false);
    setPracticeCorrectCount(0);

    const subjectNorm = topicOrSubject as SubjectName;
    const questions = quizInitializationRouter('smart', subjectNorm);
    setPracticeQuestions(questions);
    setActiveTab('practice');
  };

  const handleLaunchCustomPractice = () => {
    if (!customPracticeSubject || !customPracticeTopic || !customPracticeYear) return;
    setCustomPracticeModalVisible(false);
    setPracticeSessionType('custom');
    setActiveSessionTopicPractice(customPracticeTopic === 'All' ? 'Mixed Topics' : customPracticeTopic);
    setPracticeIndex(0);
    setPracticeSelectedAnswer(null);
    setPracticeHasSubmitted(false);
    setPracticeComplete(false);
    setPracticeCorrectCount(0);

    let subPool = SEED_QUESTIONS.filter(q => q.subject === customPracticeSubject);
    if (customPracticeTopic !== 'All') {
      subPool = subPool.filter(q => q.topic === customPracticeTopic);
    }
    if (customPracticeYear !== 'All') {
      subPool = subPool.filter(q => q.year === parseInt(customPracticeYear, 10));
    }
    // Do not silently replace a requested subject/topic/year with unrelated questions.
    // An empty result should become an explicit empty state once the backend
    // question-search contract is connected.
    setPracticeQuestions(subPool);
    setActiveTab('practice');
  };

  const handleQuizExitAndSave = () => {
    setShowExitQuizModal(false);
    setPracticeSessionType(null);
    setPracticeQuestions([]);
    // No authoritative progress or XP is written here.
    // The backend session-result contract will own persistence.
  };

  const handleSubmitPracticeChoice = async () => {
    if (!practiceSelectedAnswer || practiceHasSubmitted) return;
    const activeQ = practiceQuestions[practiceIndex];
    if (!activeQ) return;

    const isCorrect = practiceSelectedAnswer === activeQ.answer;
    setPracticeHasSubmitted(true);
    if (isCorrect) setPracticeCorrectCount(p => p + 1);

    // Practice correctness is kept only for this UI session until the backend
    // practice-result contract is connected. Do not mutate mastery, review dates,
    // XP, or readiness state from the frontend.
    

    // Auto-advance if correct
    if (isCorrect) {
      setTimeout(() => {
        handleNextPracticeStep();
      }, 2500);
    }
  };

  const fetchPracticeExplanation = async () => {
    const activeQ = practiceQuestions[practiceIndex];
    if (!activeQ) return;
    setAiExplainLoading(true);
    try {
      const resp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: activeQ.id,
          preference: profile?.explanationPreference || 'short',
          language: profile?.languagePreference || 'mixed'
        })
      });
      const data = await resp.json();
      setAiExplainText(data.explanation || activeQ.explanation);
    } catch {
      setAiExplainText(activeQ.explanation);
    } finally {
      setAiExplainLoading(false);
    }
  };

  const handlePrevPracticeStep = () => {
    if (practiceIndex > 0) {
      setPracticeIndex(p => p - 1);
      setPracticeSelectedAnswer(null);
      setPracticeHasSubmitted(false);
      setAiExplainText('');
    }
  };

  const handleNextPracticeStep = () => {
    if (practiceIndex < practiceQuestions.length - 1) {
      setPracticeIndex(p => p + 1);
      setPracticeSelectedAnswer(null);
      setPracticeHasSubmitted(false);
      setAiExplainText('');
    } else {
      setPracticeComplete(true);
      // Clear global AI Tutor session slice when the student completes the practice loop
      setTutorMessages([]);
      setTutorChatActive(false);
      // Persistence is intentionally deferred to the backend session-result contract.
    }
  };

  const handleResetProfileSystem = () => {
    setOnboardingStep(1);
    setAppStage('SIGNUP');
    setProfile(null);
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
      }
      
      const key = e.key.toUpperCase();
      
      if (['A', 'B', 'C', 'D'].includes(key)) {
        if (appStage === 'DIAGNOSTIC_QUIZ' && !diagnosticHasSubmitted) {
          setDiagnosticAnswerSelected(key as 'A' | 'B' | 'C' | 'D');
        } else if (appStage === 'DASHBOARD' && activeTab === 'practice' && practiceQuestions.length > 0 && !practiceHasSubmitted) {
          setPracticeSelectedAnswer(key as 'A' | 'B' | 'C' | 'D');
        }
      }
      
      // Handle Next
      if (key === 'N') {
        if (appStage === 'DIAGNOSTIC_QUIZ' && diagnosticHasSubmitted) {
          handleNextDiagnosticQuestion();
        } else if (appStage === 'DASHBOARD' && activeTab === 'practice' && practiceHasSubmitted) {
          handleNextPracticeStep();
        }
      }
      
      // Handle Previous
      if (key === 'P') {
        if (appStage === 'DASHBOARD' && activeTab === 'practice') {
          handlePrevPracticeStep();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    appStage, diagnosticHasSubmitted, activeTab, practiceHasSubmitted, practiceQuestions,
    handleNextDiagnosticQuestion, handleNextPracticeStep, handlePrevPracticeStep
  ]);

  const isAuthView = ['SIGNUP', 'WELCOME_SETUP'].includes(appStage);

  return (
    <div 
      className="min-h-screen text-slate-800 flex flex-col justify-between overflow-x-hidden font-sans relative"
      style={isAuthView ? {
        backgroundColor: '#EBF1FA',
        backgroundImage: `
          linear-gradient(to bottom, #EBF1FA, #D0E1F9),
          linear-gradient(to right, rgba(10, 17, 40, 0.035) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(10, 17, 40, 0.035) 1px, transparent 1px)
        `,
        backgroundSize: '100% 100%, 20px 20px, 20px 20px',
        backgroundBlendMode: 'overlay'
      } : {
        backgroundColor: '#F4F7FB'
      }}
    >
      {/* Dynamic Moving Abstract Circles behind Workspace */}
      <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-[#4A90D9]/5 pointer-events-none filter blur-2xl animate-pulse-slow" />
      <div className="absolute bottom-10 right-10 w-80 h-80 rounded-full bg-sky-300/5 pointer-events-none filter blur-3xl animate-pulse-slow" />

      {/* Header bar */}
      <header className="border-b border-[#D6E4F0] px-6 py-4 flex items-center justify-between shrink-0 bg-[#0A1128] text-white z-55 shadow-md">
        <div className="flex items-center gap-3">
          <div className="py-1 px-3 bg-gradient-to-r from-[#0A1128] to-[#4A90D9] border-2 border-[#F5C518] rounded-xl font-display font-black text-lg tracking-wider text-white shadow-md flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-[#F5C518]" /> Sabi <span className="text-[#F5C518]">JAMB</span>
          </div>
          <span className="text-xs text-sky-200/80 hidden sm:inline-block font-mono tracking-widest uppercase">SS2 & SS3 Adaptive Coach</span>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3 text-xs z-50">
          <button
            onClick={() => setIsOfflineSimulated(!isOfflineSimulated)}
            className={`px-3 py-1.5 rounded-full border transition flex items-center gap-1.5 ${isOfflineSimulated ? 'bg-rose-500 border-rose-500 text-white font-bold' : 'border-slate-700 text-sky-200 hover:bg-[#12234e]'}`}
          >
            <ShieldAlert className="h-3.5 w-3.5 animate-bounce" />
            <span>{isOfflineSimulated ? 'Offline: active' : 'Simulate Offline'}</span>
          </button>
        </div>
      </header>

      {/* Main play Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 flex flex-col z-40">
        {isOfflineSimulated && (
          <div role="status" aria-live="polite" className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-bold text-rose-700 flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
            Offline simulation is active. Network-backed account, learning and payment state must not be treated as synchronized.
          </div>
        )}
        <div className="flex-1 flex flex-col min-h-[600px]">
          {renderScreenRouter()}
        </div>
      </main>

      {/* Footer system details */}
      <footer className="shrink-0 border-t border-[#D6E4F0] py-4 px-6 text-center text-xs text-slate-500 bg-white z-20">
        <p>© 2026 Sabi JAMB Team • Frontend preview. Authoritative account, learning and payment state is supplied by backend services.</p>
      </footer>

      {renderOtpValidationModal()}
    </div>
  );

  // Router for Screens within Simulator Frame
  function renderScreenRouter() {
    switch (appStage) {
      case 'SIGNUP':
        return (
          <div className="max-w-md mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col">
            {renderSignupScreen()}
          </div>
        );
      case 'WELCOME_SETUP':
        return (
          <div className="max-w-md mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col p-6">
            {renderWelcomeSetup()}
          </div>
        );
      case 'ONBOARDING_PERSONALIZATION':
        return (
          <div className="max-w-2xl mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col min-h-[500px]">
            {renderOnboardingQuestions()}
          </div>
        );
      case 'DIAGNOSTIC_INTRO':
        return (
          <div className="max-w-xl mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col p-6">
            {renderDiagnosticIntro()}
          </div>
        );
      case 'DIAGNOSTIC_QUIZ':
        return (
          <div className="max-w-3xl mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col">
            {renderDiagnosticQuiz()}
          </div>
        );
      case 'PROFILE_EVALUATION':
        return (
          <div className="max-w-md mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col p-8">
            {renderProfileEvaluation()}
          </div>
        );
      case 'DASHBOARD':
        return renderHomeDashboard();
      default:
        return (
          <div className="max-w-md mx-auto w-full bg-white border border-[#D6E4F0] rounded-3xl shadow-xl overflow-hidden my-auto flex flex-col">
            {renderSignupScreen()}
          </div>
        );
    }
  }

  // --- STAGE 1: SIGNUP SCREEN ---
  function renderSignupScreen() {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-white animate-fade-in font-sans relative">
        {/* Subtle decorative layout grid behind the form content card */}
        <div className="absolute inset-0 grid grid-cols-6 gap-0 opacity-[0.03] pointer-events-none z-0">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="border-b border-r border-[#0A1128] h-12 w-full" />
          ))}
        </div>

        <button 
          onClick={handleSkipToDashboard}
          title="Open frontend preview dashboard"
          className="absolute top-6 right-6 z-20 text-slate-400 hover:text-[#0A1128] p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
        >
          <Home className="w-4 h-4" />
        </button>

        <div className="space-y-5 pt-2 z-10">
          <div className="text-center space-y-1.5 pt-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#4A90D9] block">
              Stage 1 of 5: ACCOUNT PREVIEW
            </span>
            <h3 className="text-xl font-bold text-[#0A1128] font-display tracking-tight">
              Create Account — Frontend Preview
            </h3>
            <p className="text-xs text-[#4A5568] leading-relaxed px-1">
              Account creation will be connected to the authentication service. This screen currently previews the approved signup experience.
            </p>
          </div>

          <form onSubmit={handleTriggerSignupSubmit} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase text-[#0A1128] tracking-wider font-display">
                Email Address
              </label>
              <input
                type="email"
                required
                value={signupForm.email}
                onChange={e => setSignupForm(p => ({ ...p, email: e.target.value }))}
                placeholder="e.g. tunde@gmail.com"
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-[#D6E4F0] bg-[#F0F4FA] focus:outline-none focus:border-[#1B3A7A] focus:bg-white text-[#0A1128] font-medium transition duration-150"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase text-[#0A1128] tracking-wider font-display">
                Phone Number (Nigerian)
              </label>
              <div className="relative flex rounded-xl border border-[#D6E4F0] bg-[#F0F4FA] overflow-hidden focus-within:border-[#1B3A7A] focus-within:bg-white transition duration-150">
                <div className="flex items-center gap-1 px-3 bg-slate-200 text-xs font-bold text-[#0A1128] border-r border-[#CBD5E1]">
                  <span>🇳🇬</span>
                  <span className="font-mono text-[11px]">+234</span>
                </div>
                <input
                  type="tel"
                  required
                  value={signupForm.phone}
                  onChange={e => setSignupForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                  placeholder="8123456789"
                  maxLength={10}
                  className="w-full text-xs px-3 py-2.5 bg-transparent outline-none text-[#0A1128] font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[9px] font-black uppercase text-[#0A1128] tracking-wider font-display">
                Password
              </label>
              <div className="relative flex rounded-xl border border-[#D6E4F0] bg-[#F0F4FA] overflow-hidden focus-within:border-[#1B3A7A] focus-within:bg-white transition duration-150">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={signupForm.password}
                  onChange={e => setSignupForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Create strong password"
                  className="w-full text-xs px-3 py-2.5 bg-transparent outline-none text-[#0A1128] font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="px-3.5 text-slate-400 hover:text-[#0A1128] transition text-sm"
                >
                  {showPassword ? '👁️' : '🕶️'}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pt-1 cursor-pointer">
              <input 
                type="checkbox" 
                required 
                id="terms" 
                className="mt-0.5 rounded border-[#D6E4F0] text-[#1B3A7A] focus:ring-[#1B3A7A]/25" 
              />
              <label htmlFor="terms" className="text-[11px] text-[#4A5568] leading-tight select-none">
                I agree to Sabi Privacy Terms and Syllabus Guidelines.
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-11 bg-[#F5C518] hover:bg-[#F5C518]/95 text-[#0A1128] border border-[#0A1128] font-black font-display uppercase tracking-wider text-xs rounded-xl shadow-[0_4px_0_#0A1128] active:translate-y-[2px] active:shadow-[0_2px_0_#0A1128] transition-all flex items-center justify-center gap-1.5"
            >
              <span>Register & Verify</span>
              <span className="font-mono font-black">&gt;</span>
            </button>
          </form>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 text-center space-y-1 z-10">
          <p className="text-[11px] text-slate-400">
            Already sitting? <span className="font-bold text-[#0A1128] hover:underline cursor-pointer">Login</span>
          </p>
        </div>
      </div>
    );
  }

  // --- OTP VALIDATION MODAL ---
  function renderOtpValidationModal() {
    if (!showOtpModal) return null;
    return (
      <div className="fixed inset-0 bg-[#0A1128]/85 backdrop-blur-sm z-[100] flex justify-center items-center p-4">
        <div className="bg-white border border-[#D6E4F0] text-[#0A1128] w-full max-w-[340px] rounded-[24px] overflow-hidden shadow-2xl relative p-5 space-y-4 font-sans animate-fade-in">
          <button
            onClick={() => setShowOtpModal(false)}
            className="absolute right-4 top-4 w-6 h-6 rounded-full bg-[#F0F4FA] hover:bg-[#D6E4F0] text-slate-500 hover:text-[#0A1128] transition flex items-center justify-center text-xs font-bold"
          >
            ✕
          </button>

          <div className="text-center space-y-1 pt-2">
            <h4 className="text-lg font-black text-[#0A1128] font-display tracking-tight">
              Enter Verification Code
            </h4>
            <p className="text-[11px] text-[#4A5568] leading-normal px-1">
              Authentication service is not connected in this frontend preview. Enter any 6 digits to preview the next state.
            </p>
          </div>

          <div className="grid grid-cols-6 gap-1.5 py-1">
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                ref={el => { otpRefs.current[i] = el; }}
                onChange={e => handleOtpInput(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-full h-11 text-center font-mono text-base font-black rounded-lg bg-[#F0F4FA] border-2 border-[#D6E4F0] focus:border-[#1B3A7A] focus:bg-white text-[#1B3A7A] focus:outline-none transition-all duration-150"
              />
            ))}
          </div>

          {otpError && (
            <p className="text-[10px] font-bold text-rose-600 text-center">{otpError}</p>
          )}

          <button
            onClick={handleVerifyOtp}
            disabled={isVerifyingOtp}
            className="w-full h-11 bg-[#F5C518] border border-[#0A1128] hover:bg-[#F5C518]/90 text-[#0A1128] font-black font-display uppercase tracking-wider text-xs rounded-xl shadow-sm active:scale-[0.98] transition flex items-center justify-center gap-1.5"
          >
            {isVerifyingOtp ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-[#0A1128]" />
                <span>VERIFYING...</span>
              </>
            ) : (
              <>
                <span>CONTINUE PREVIEW</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 text-center">
            Real OTP delivery and resend will be supplied by the authentication service.
          </p>
        </div>
      </div>
    );
  }

  // --- STAGE 1.2: WELCOME SETUP INFO ---
  function renderWelcomeSetup() {
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-white animate-fade-in rounded-3xl border border-[#D6E4F0]/80 relative overflow-hidden">
        {/* Curved bot gradient header */}
        <div className="bg-gradient-to-r from-[#0A1128] to-[#1B3A7A] -mx-6 -mt-6 p-5 text-white text-center rounded-b-[24px] relative overflow-hidden">
          {/* Decorative geometric details */}
          <div className="absolute top-10 right-10 w-16 h-16 rounded-full bg-white/10" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#FFF3B0] block">
            WELCOME ONBOARD
          </span>
          <p className="text-xs text-sky-100 font-display mt-0.5">
            Sabi adaptive pathways — preview
          </p>
        </div>

        <div className="space-y-4 py-4 text-center">
          {/* Unique classroom panel identifier */}
          <div className="bg-[#F0F4FA] border border-[#D6E4F0] p-3 rounded-xl flex items-center gap-3 text-left">
            <div className="w-8 h-8 rounded-full bg-white border border-[#D6E4F0] flex items-center justify-center text-sm shadow-sm select-none">
              🌍
            </div>
            <div>
              <span className="text-[10px] font-black text-[#1B3A7A] block uppercase tracking-wider">
                Nigeria Aspirants Classroom
              </span>
              <span className="text-[9px] text-slate-400 block font-medium">
                Auto-assigned active workspace
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <h3 className="text-lg font-black text-[#0A1128] font-display tracking-tight leading-tight">
              Crack JAMB. Own Your Future.
            </h3>
            <p className="text-xs text-[#4A5568] leading-relaxed">
              We are going to ask you <span className="font-bold text-[#0A1128]">exactly 15 quick questions</span> to build your personalized <span className="font-bold text-[#0A1128]">Mastery Map</span>. No empty profiles, only high morale!
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setOnboardingStep(1);
            setAppStage('ONBOARDING_PERSONALIZATION');
          }}
          className="w-full h-11 bg-[#F5C518] text-[#0A1128] hover:bg-[#F5C518]/90 font-black font-display uppercase tracking-wider text-xs rounded-xl shadow-[0_4px_0_#0A1128] active:translate-y-[2px] active:shadow-[0_2px_0_#0A1128] transition-all flex items-center justify-center gap-1.5 border border-[#0A1128]"
        >
          <span>GET STARTED</span>
          <span className="font-mono font-black">&gt;</span>
        </button>
      </div>
    );
  }

  // --- STAGE 2: ONBOARDING QUESTIONS SYSTEM (15 screens) ---
  function renderOnboardingQuestions() {
    const isSubjectPick = currentOnbQuestion.type === 'subjects';
    const isConfidenceGrid = currentOnbQuestion.type === 'confidence';
    const isText = currentOnbQuestion.type === 'text';
    const isSelect = currentOnbQuestion.type === 'select';
    const isCourseUni = currentOnbQuestion.type === 'course_uni';
    const isRadio = currentOnbQuestion.type === 'radio';
    const isTextarea = currentOnbQuestion.type === 'textarea';
    const isWeakTopic = currentOnbQuestion.type === 'weak_topic';

    const selectedList = onboardingAnswers.chosenSubjects || [];
    const selectionCount = selectedList.length;

    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-white animate-fade-in relative">
        {/* Progressive Header Row */}
        <div className="bg-gradient-to-r from-[#0A1128] to-[#4A90D9] -mx-6 -mt-6 p-4 text-white rounded-b-[20px] relative overflow-hidden shrink-0 z-10">
          {/* Floating Circle details */}
          <div className="absolute top-8 right-6 w-12 h-12 rounded-full bg-white/10" />

          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
            <span className="text-[#F5C518]">Stage 2: Personalization</span>
            <span>Question {onboardingStep} of 15</span>
          </div>
          {/* Top Progress Bar */}
          <div className="w-full h-1.5 bg-white/20 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F5C518] to-yellow-300 transition-all duration-300"
              style={{ width: `${(onboardingStep / 15) * 100}%` }}
            />
          </div>
        </div>

        {/* Dynamic Question Stage Content */}
        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          <div className="space-y-1">
            <h4 className="text-base font-extrabold text-[#0A1128] leading-snug font-display flex gap-2">
              <span className="text-[#4A90D9]">{onboardingStep}.</span>
              <span>{currentOnbQuestion.question}</span>
            </h4>
            <p className="text-[11px] text-[#4A5568] leading-normal">{currentOnbQuestion.subtext}</p>
          </div>

          <div className="pt-2">
            {/* Input Types branch widgets */}
            {isText && (
              <input
                type="text"
                value={onboardingAnswers[currentOnbQuestion.fieldName] || ''}
                onChange={e => setOnboardingAnswers(prev => ({ ...prev, [currentOnbQuestion.fieldName]: e.target.value }))}
                placeholder={currentOnbQuestion.placeholder}
                className="w-full text-xs p-3 rounded-xl border border-[#D6E4F0] bg-[#F4F7FB] focus:outline-none focus:border-[#4A90D9] text-[#0A1128]"
              />
            )}

            {isTextarea && (
              <textarea
                value={onboardingAnswers[currentOnbQuestion.fieldName] || ''}
                onChange={e => setOnboardingAnswers(prev => ({ ...prev, [currentOnbQuestion.fieldName]: e.target.value }))}
                placeholder={currentOnbQuestion.placeholder}
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-[#D6E4F0] bg-[#F4F7FB] focus:outline-none focus:border-[#4A90D9] text-[#0A1128] font-sans h-21"
              />
            )}

            {isSelect && currentOnbQuestion.fieldName === 'monthsUntilExam' && (
              <div className="space-y-4">
                {/* Dynamic Tracker Display Panel */}
                <div className="bg-gradient-to-r from-[#0A1128] to-[#1E293B] text-white rounded-2xl p-4 shadow-md border border-[#F5C518]/20 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/10 rounded-full filter blur-xl pointer-events-none" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black tracking-widest text-[#F5C518] uppercase bg-[#F5C518]/10 px-2 py-0.5 rounded">
                      Sabi Smart Tracker
                    </span>
                    <span className="text-[10px] font-mono text-sky-200">
                      Target: March ({new Date().getFullYear() + (new Date().getMonth() >= 2 ? 1 : 0)}) JAMB Exam
                    </span>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-white font-mono">{getDynamicJAMBCountdown().months}</span>
                    <span className="text-sm font-bold text-sky-200">Months Countdown</span>
                  </div>

                  {/* Visual Progress Timeline */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[9px] text-slate-300 font-mono font-bold">
                      <span>Today ({new Date().toLocaleString('en-US', { month: 'short', year: 'numeric' })})</span>
                      <span>Exam (March {new Date().getFullYear() + (new Date().getMonth() >= 2 ? 1 : 0)})</span>
                    </div>
                    {/* Visual Line */}
                    <div className="relative w-full h-3 bg-slate-800 rounded-full border border-slate-700 p-0.5 flex items-center">
                      <div className="absolute left-2.5 right-2 h-1 bg-slate-700 rounded-full" />
                      <div className="absolute left-[35%] -translate-x-1/2 w-4.5 h-4.5 bg-gradient-to-tr from-[#F5C518] to-yellow-300 rounded-full shadow-lg border border-[#0A1128] flex items-center justify-center animate-pulse">
                        <div className="w-1.5 h-1.5 bg-[#0A1128] rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-between text-[8px] text-sky-200/70 font-mono">
                      <span>Syllabus Prep</span>
                      <span>Drill Phase</span>
                      <span>Mock Testing</span>
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-2.5 flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-[#F5C518] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-300 leading-normal">
                      Based on today's signup, JAMB is dynamically calculated to be <span className="text-white font-black">{getDynamicJAMBCountdown().text}</span> away!
                    </p>
                  </div>
                </div>

                {/* Confirm estimated prep card option */}
                <div 
                  onClick={() => setOnboardingAnswers(prev => ({ ...prev, monthsUntilExam: `${getDynamicJAMBCountdown().months} months` }))}
                  className={`p-4 rounded-xl border-2 text-xs cursor-pointer select-none transition flex items-center justify-between ${
                    onboardingAnswers.monthsUntilExam.includes(String(getDynamicJAMBCountdown().months))
                      ? 'border-[#0A1128] bg-slate-50 text-[#0A1128] font-bold shadow-sm' 
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#0A1128] text-[#F5C518] flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="font-extrabold text-xs">Use Dynamic Smart Estimate</h5>
                      <p className="text-[10px] text-slate-500 leading-tight">Calculated automatically for you</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black bg-[#4A90D9] text-white px-2 py-0.5 rounded">
                      {getDynamicJAMBCountdown().months} Months
                    </span>
                    {onboardingAnswers.monthsUntilExam.includes(String(getDynamicJAMBCountdown().months)) && <Check className="h-4 w-4 text-[#0A1128]" />}
                  </div>
                </div>

                <div className="text-center text-[10px] font-black text-slate-400 py-1 uppercase tracking-wider">
                  — Or Choose Manual Timings —
                </div>

                {/* Additional manual Override Options */}
                <div className="grid grid-cols-2 gap-2">
                  {["1 month (Cram mode)", "2 months (Speed pass)", "3-4 months (Medium pace)", "5-6 months (Standard duration)"].map((opt, i) => {
                    const isSelected = onboardingAnswers.monthsUntilExam === opt;
                    return (
                      <div
                        key={i}
                        onClick={() => setOnboardingAnswers(prev => ({ ...prev, monthsUntilExam: opt }))}
                        className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition flex items-center justify-between ${
                          isSelected 
                            ? 'border-[#0A1128] bg-[#F4F7FB] font-bold text-[#0A1128]' 
                            : 'border-slate-100 hover:bg-slate-50 text-slate-650 bg-white'
                        }`}
                      >
                        <span className="truncate pr-1">{opt}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 text-[#0A1128] shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isSelect && currentOnbQuestion.fieldName === 'classAndAttempts' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#0A1128] mb-1 font-display">Target Class Level</label>
                  <select
                    value={onboardingAnswers.classAndAttempts.classLevel}
                    onChange={e => setOnboardingAnswers(prev => ({
                      ...prev,
                      classAndAttempts: { ...prev.classAndAttempts, classLevel: e.target.value }
                    }))}
                    className="w-full p-2.5 border border-[#D6E4F0] rounded-xl text-xs bg-[#F4F7FB] text-[#0A1128] font-bold focus:ring-2 focus:ring-[#4A90D9] focus:outline-none"
                  >
                    <option value="Senior Secondary 2 (SS2)">Senior Secondary 2 (SS2)</option>
                    <option value="Senior Secondary 3 (SS3)">Senior Secondary 3 (SS3)</option>
                    <option value="Out-of-school Candidate / Resitter">Out-of-school Candidate</option>
                  </select>
                </div>

                {onboardingAnswers.classAndAttempts.classLevel === "Out-of-school Candidate / Resitter" && (
                  <div className="mt-2.5 animate-fade-in bg-[#F4F7FB] border border-dashed border-[#D6E4F0] rounded-xl p-3 animate-fade-in">
                    <label className="block text-[10px] font-black uppercase text-[#4A90D9] mb-1.5 font-display">
                      How many years have you been out of school?
                    </label>
                    <select
                      value={onboardingAnswers.classAndAttempts.yearsOutOfSchool || '1 year'}
                      onChange={e => setOnboardingAnswers(prev => ({
                        ...prev,
                        classAndAttempts: { ...prev.classAndAttempts, yearsOutOfSchool: e.target.value }
                      }))}
                      className="w-full p-2 border border-[#D6E4F0] rounded-lg text-xs bg-white text-[#0A1128] font-bold focus:ring-2 focus:ring-[#4A90D9] focus:outline-none"
                    >
                      <option value="Less than 1 year">Less than 1 year</option>
                      <option value="1 year">1 year</option>
                      <option value="2 years">2 years</option>
                      <option value="3 years">3 years</option>
                      <option value="4 years or more">4 years or more</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#0A1128] mb-1 font-display">Prior JAMB Attempts</label>
                  <select
                    value={onboardingAnswers.classAndAttempts.attempts}
                    onChange={e => setOnboardingAnswers(prev => ({
                      ...prev,
                      classAndAttempts: { ...prev.classAndAttempts, attempts: e.target.value }
                    }))}
                    className="w-full p-2.5 border border-[#D6E4F0] rounded-xl text-xs bg-[#F4F7FB] text-[#0A1128] font-bold focus:ring-2 focus:ring-[#4A90D9] focus:outline-none"
                  >
                    <option value="0 sittings (First-time aspirant)">0 sittings (First time)</option>
                    <option value="1 sitting (Prior attempt)">1 sitting</option>
                    <option value="2 sittings or more">2 sittings or more</option>
                  </select>
                </div>
              </div>
            )}

            {isCourseUni && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-450 mb-1">Your Dream Course</label>
                  <input
                    type="text"
                    value={onboardingAnswers.targets.course}
                    onChange={e => setOnboardingAnswers(p => ({
                      ...p,
                      targets: { ...p.targets, course: e.target.value }
                    }))}
                    placeholder="e.g. Electrical Engineering"
                    className="w-full text-sm p-3.5 rounded-xl border border-[#D6E4F0] bg-[#F4F7FB] focus:bg-white focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent focus:outline-none placeholder-slate-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-slate-450 mb-1">Your Goal University</label>
                  <input
                    type="text"
                    value={onboardingAnswers.targets.university}
                    onChange={e => setOnboardingAnswers(p => ({
                      ...p,
                      targets: { ...p.targets, university: e.target.value }
                    }))}
                    placeholder="e.g. University of Ibadan (UI)"
                    className="w-full text-sm p-3.5 rounded-xl border border-[#D6E4F0] bg-[#F4F7FB] focus:bg-white focus:ring-2 focus:ring-[#4A90D9] focus:border-transparent focus:outline-none placeholder-slate-400 transition"
                  />
                </div>
              </div>
            )}

            {isSubjectPick && (
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase text-slate-400">Total selected: {selectionCount} of 4</span>
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-auto scrollbar-none pb-2">
                  {SUBJECTS_POOL.map((sub, i) => {
                    const isSelected = selectedList.includes(sub.name);
                    const disabled = sub.name === 'English Language';
                    return (
                      <div
                        key={i}
                        onClick={() => !disabled && handleSubjectSelectToggle(sub.name)}
                        className={`p-2 rounded-xl text-[11px] font-semibold flex items-center justify-between border cursor-pointer select-none transition-all duration-200 ${isSelected ? 'border-[#0a1128] bg-slate-50 text-[#0a1128] font-bold' : 'border-slate-100 text-slate-500'} ${disabled ? 'opacity-85 font-black bg-slate-100 cursor-not-allowed text-[#0a1128]' : ''}`}
                      >
                        <span className="truncate">{sub.name}</span>
                        {isSelected && <Check className="h-3.5 w-3.5 stroke-[3px]" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isConfidenceGrid && (
              <div className="space-y-3">
                {selectedList.map((subObj: any, index: number) => {
                  const rating = onboardingAnswers.subjectConfidence[subObj] || 3;
                  return (
                    <div key={index} className="p-2.5 rounded-xl border border-slate-100 bg-[#F4F7FB] space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-[#0A1128] truncate max-w-[170px]">{subObj}</span>
                        <span className="text-[10px] font-bold uppercase text-[#4A90D9]">{rating === 5 ? 'High Core' : rating >= 3 ? 'Medium-High' : 'Needs Work'}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={rating}
                        onChange={e => {
                          const val = parseInt(e.target.value);
                          setOnboardingAnswers(p => ({
                            ...p,
                            subjectConfidence: { ...p.subjectConfidence, [subObj]: val }
                          }));
                        }}
                        className="w-full h-1 bg-[#D6E4F0] rounded-lg appearance-none cursor-pointer accent-[#0A1128]"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {isWeakTopic && (
              <div className="space-y-2">
                {selectedList.map((subName: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setOnboardingAnswers(prev => ({ ...prev, prioritySubject: subName }))}
                    className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition flex items-center justify-between ${onboardingAnswers.prioritySubject === subName ? 'border-[#0A1128] bg-slate-50 font-bold text-[#0A1128]' : 'border-slate-100 hover:bg-slate-50 text-slate-600'}`}
                  >
                    <span>{subName}</span>
                    {onboardingAnswers.prioritySubject === subName && <Check className="h-4 w-4 text-[#0A1128]" />}
                  </div>
                ))}
              </div>
            )}

            {isRadio && (
              <div className="space-y-2">
                {currentOnbQuestion.options?.map((opt, i) => {
                  const isSel = onboardingAnswers[currentOnbQuestion.fieldName] === opt;
                  return (
                    <div
                      key={i}
                      onClick={() => setOnboardingAnswers(prev => ({ ...prev, [currentOnbQuestion.fieldName]: opt }))}
                      className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition flex items-center justify-between ${isSel ? 'border-[#0A1128] bg-slate-55 font-bold text-[#0A1128]' : 'border-slate-100 hover:bg-slate-50 text-slate-500'}`}
                    >
                      <span className="leading-snug">{opt}</span>
                      {isSel && <Check className="h-4 w-4 text-[#0A1128]" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Button Tray */}
        <div className="pt-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            onClick={handleBackOnboarding}
            className="flex-1 py-3 border border-[#D6E4F0] text-slate-500 hover:bg-slate-50 hover:text-[#0A1128] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
          
          <button
            onClick={handleNextOnboarding}
            disabled={
              (onboardingStep === 1 && !onboardingAnswers.name.trim()) ||
              (onboardingStep === 2 && selectionCount !== 4) ||
              (onboardingStep === 4 && (!onboardingAnswers.targets.course.trim() || !onboardingAnswers.targets.university.trim()))
            }
            className="flex-1 py-3 bg-[#F5C518] border-2 border-[#0A1128] text-[#0A1128] font-extrabold uppercase tracking-wide text-xs rounded-xl shadow-md transition transform active:scale-95 disabled:opacity-45 flex items-center justify-center gap-1.5"
          >
            {onboardingStep === 15 ? <span>Finalize Set</span> : <span>Next step</span>}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // --- STAGE 3: SUBJECT DIAGNOSTIC INTRO ---
  function renderDiagnosticIntro() {
    const list = onboardingAnswers.chosenSubjects || [];
    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-white animate-fade-in relative">
        <div className="bg-gradient-to-r from-[#0A1128] to-[#4A90D9] -mx-6 -mt-6 p-5 text-white rounded-b-[24px] relative overflow-hidden shrink-0">
          {/* Floating Circle details */}
          <div className="absolute top-10 right-8 w-14 h-14 rounded-full bg-white/10 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-[#F5C518]">Stage 3 of 5: EVALUATION</span>
          <h4 className="text-sm font-bold font-display mt-0.5 leading-snug">Personalized Diagnostic Intro</h4>
          <p className="text-[11px] text-sky-100 leading-normal mt-1">Ready to benchmark your parameters adaptively</p>
        </div>

        <div className="flex-1 overflow-y-auto py-5 space-y-4">
          <div className="p-4 bg-yellow-50/50 border border-yellow-200/60 rounded-xl space-y-2">
            <span className="text-[10px] font-extrabold text-[#F5C518] uppercase tracking-wide block flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#F5C518]" /> Adaptive testing rules active
            </span>
            <p className="text-xs text-[#0A1128] leading-relaxed">
              We are serving a <span className="font-bold">10-question adaptive test</span> for each of your selected subjects. Sabi starts at Medium; correct answers jump difficulty to Hard, wrong answers slide down to Easy.
            </p>
          </div>

          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Evaluating active core:</span>
            <div className="grid grid-cols-2 gap-2">
              {list.map((subName: any, i: number) => {
                const conf = onboardingAnswers.subjectConfidence[subName] || 3;
                return (
                  <div key={i} className="p-2.5 bg-[#F4F7FB] border border-[#D6E4F0] rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold text-[#0A1128] truncate pr-1 max-w-[100px]">{subName}</p>
                      <p className="text-[9px] text-[#4A90D9] mt-0.5">Rating: {conf}/5</p>
                    </div>
                    <BookOpen className="h-4 w-4 text-slate-400" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 mt-3 z-10 w-full shrink-0">
          <button
            onClick={handleStartDiagnostic}
            className="w-full py-3 bg-[#F5C518] border-2 border-[#0A1128] hover:bg-[#F5C518]/90 font-extrabold font-display uppercase tracking-wider text-xs rounded-xl shadow transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Start Diagnostic Quiz</span>
            <Play className="h-4 w-4 fill-current text-[#0A1128]" />
          </button>
          
          <button
            onClick={() => handleTransitionToEvaluation([])}
            className="w-full py-2 text-slate-400 font-bold uppercase tracking-wider text-[10px] hover:underline transition mb-1"
          >
            Skip Diagnostic Quiz
          </button>
        </div>
      </div>
    );
  }

  // --- STAGE 4: ADAPTIVE DIAGNOSTIC QUIZ SPACE ---
  function renderDiagnosticQuiz() {
    if (!diagnosticActiveQuestion) return null;

    const list = onboardingAnswers.chosenSubjects || ['English Language'];
    const currentSubjectName = list[diagnosticSubjectIndex];
    const totalSelectedCount = list.length;
    const progressPercent = ((diagnosticQuestionIndex + 1) / 10) * 100;

    return (
      <div className="flex-1 flex flex-col justify-between p-6 bg-white animate-fade-in relative font-sans">
        {/* Dynamic header details with progress bar */}
        <div className="bg-gradient-to-r from-[#0A1128] to-[#4A90D9] -mx-6 -mt-6 p-4 text-white rounded-b-[20px] relative overflow-hidden shrink-0 z-10">
          <div className="absolute top-10 right-8 w-12 h-12 rounded-full bg-white/10" />

          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
            <span className="text-[#F5C518] truncate pr-1.5 max-w-[120px]">{currentSubjectName}</span>
            <span>Question {diagnosticQuestionIndex + 1} of 10</span>
          </div>

          <div className="w-full h-1 bg-white/20 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-white transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>

          {/* Subtopic header */}
          <div className="flex justify-between items-center mt-2 text-[9px] text-sky-100/90 font-semibold font-mono">
            <span>Core: {diagnosticActiveQuestion.topic}</span>
            <span className="uppercase text-yellow-300">Level: {diagnosticActiveQuestion.difficulty}</span>
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
            <span className="px-2 py-0.5 rounded bg-slate-200 text-[8px] font-mono font-bold uppercase text-slate-500">
              {diagnosticActiveQuestion.id} • {diagnosticActiveQuestion.source}
            </span>
            <div className="text-xs text-[#0A1128] font-bold font-sans leading-relaxed mt-2 leading-[1.65]">
              <MathText text={diagnosticActiveQuestion.question} />
            </div>
          </div>

          {/* Answer choices */}
          <div className="space-y-2">
            {Object.entries(diagnosticActiveQuestion.options).map(([key, value]) => {
              const representsCorrect = key === diagnosticActiveQuestion.answer;
              const isSelected = diagnosticAnswerSelected === key;

              let cardStyle = 'border-slate-100 hover:bg-slate-50 text-slate-700';
              if (diagnosticHasSubmitted) {
                if (isSelected) {
                  cardStyle = representsCorrect ? 'border-[#27AE60] bg-emerald-50 text-emerald-950 font-bold' : 'border-[#E74C3C] bg-rose-50 text-rose-950';
                } else if (representsCorrect) {
                  cardStyle = 'border-[#27AE60] bg-emerald-50 text-emerald-950 font-bold';
                } else {
                  cardStyle = 'opacity-40 border-slate-50 text-slate-400 cursor-not-allowed';
                }
              } else if (isSelected) {
                cardStyle = 'border-[#0a1128] bg-slate-50 font-bold text-[#0a1128]';
              }

              return (
                <div
                  key={key}
                  onClick={() => {
                    if (!diagnosticHasSubmitted) {
                      setDiagnosticAnswerSelected(key as any);
                    }
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer select-none transition flex items-center gap-3 ${cardStyle}`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] border ${isSelected ? 'bg-[#0a1128] text-[#F5C518] border-[#0a1128]' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {key}
                  </span>
                  <span className="leading-snug">
                    <MathText text={value as string} />
                  </span>
                </div>
              );
            })}
          </div>

          {/* Interactive Confidence Level Input before submitting */}
          {!diagnosticHasSubmitted && (
            <div className="p-3 bg-slate-50/70 border border-slate-100 rounded-xl space-y-1.5 pt-2.5">
              <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Rate your confidence on this question:</span>
              <div className="flex gap-2">
                {(['Low', 'Medium', 'High'] as const).map((conf) => (
                  <button
                    key={conf}
                    type="button"
                    onClick={() => setDiagnosticSelectedConfidence(conf)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition ${diagnosticSelectedConfidence === conf ? 'bg-[#0A1128] text-white border-[#0A1128]' : 'bg-white border-slate-100 text-slate-500 hover:text-slate-700'}`}
                  >
                    {conf}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic explanation sliding up if submitted */}
          {diagnosticHasSubmitted && (
            <div className="p-4 bg-indigo-50/40 border border-[#D6E4F0]/60 rounded-xl space-y-2.5 animate-fade-in shrink-0">
              {!aiExplainText && !aiExplainLoading ? (
                <div className="flex flex-col items-center gap-2 py-1">
                  <p className="text-[10px] text-slate-500 font-medium">To check the step-by-step breakdown:</p>
                  <button
                    onClick={fetchDiagnosticExplanation}
                    className="px-4 py-2 bg-[#0A1128] text-[#F5C518] rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center gap-1.5 shadow-sm"
                  >
                    See Explanation
                  </button>
                </div>
              ) : aiExplainLoading ? (
                <div className="flex items-center gap-2 text-[#4A90D9] text-[10px]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Coach is drafting explanation...</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] uppercase font-bold text-[#4A90D9]">Sabi AI Worked Explanation</span>
                    {/* Style settings */}
                    <div className="flex gap-1">
                      {(['formal', 'pidgin'] as const).map((lang) => (
                        <button
                          key={lang}
                          onClick={() => {
                            setAiExplainLanguage(lang);
                            setAiExplainText(lang === 'pidgin' ? diagnosticActiveQuestion.explanation_pidgin : diagnosticActiveQuestion.explanation);
                          }}
                          className={`px-1.5 py-0.5 text-[8px] font-bold rounded ${aiExplainLanguage === lang ? 'bg-[#0A1128] text-white' : 'bg-white text-slate-500'}`}
                        >
                          {lang === 'pidgin' ? 'Pidgin Vibe' : 'Formal'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] leading-relaxed text-slate-800 font-sans leading-[1.6]">
                    <MathText text={aiExplainText} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Bottom Panel controllers */}
        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 shrink-0 z-20 bg-white">
          {!diagnosticHasSubmitted ? (
            <button
              onClick={handleSubmitDiagnosticAnswer}
              disabled={!diagnosticAnswerSelected}
              className="w-full py-3 bg-[#F5C518] border-2 border-[#0A1128] text-[#0A1128] font-extrabold uppercase tracking-wide text-xs rounded-xl shadow transition disabled:opacity-45"
            >
              Verify Choice
            </button>
          ) : (
            <button
              onClick={() => handleNextDiagnosticQuestion()}
              className="w-full py-3 bg-[#0A1128] hover:bg-[#030610] text-[#F5C518] font-extrabold uppercase tracking-wide text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
            >
              <span>{diagnosticQuestionIndex === 9 && diagnosticSubjectIndex === totalSelectedCount - 1 ? 'Finish review & evaluate' : 'Next diagnostic question'}</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={() => handleTransitionToEvaluation()}
            className="w-full pb-1 text-slate-400 font-bold uppercase tracking-wide text-[9px] hover:underline"
          >
            Skip to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // --- STAGE 5: PROFILE EVALUATION GENERATING SCREEN ---
  function renderProfileEvaluation() {
    return (
      <div className="flex-1 flex flex-col justify-center items-center p-6 bg-white animate-fade-in font-sans">
        <div className="space-y-6 text-center max-w-[270px]">
          <div className="relative">
            {/* Spinning Loader */}
            <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-yellow-400 animate-spin mx-auto" />
            <Sparkles className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-5 w-5 text-indigo-600 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="text-[10px] font-extrabold text-[#4A90D9] uppercase tracking-wider block">Processing Diagnostic</span>
            <h3 className="text-base font-extrabold text-[#0A1128] font-display">Preparing Your Learning Profile</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Preparing the diagnostic evidence for the learning engine. Authoritative mastery, readiness, recommendations and score data are not calculated in this frontend.
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-yellow-400 transition-all duration-350" style={{ width: `${evaluationProgress}%` }} />
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">{evaluationProgress}%</span>
          </div>

          {evaluationProgress === 100 && (
            <div className="bg-[#F4F7FB] border border-[#D6E4F0] p-4 rounded-2xl animate-fade-in space-y-4 text-left">
              <div className="text-center font-sans space-y-0.5 border-b border-rose-50 pb-3">
                <span className="text-[10px] uppercase font-bold text-[#4A5568]">Initial learning profile:</span>
                <h4 className="text-xl font-black text-[#0A1128] leading-tight tracking-tight">
                  Diagnostic evidence captured
                </h4>
                <p className="text-[9px] text-[#4A5568] uppercase font-semibold">Authoritative readiness and score data will come from the learning engine.</p>
              </div>

              <div className="rounded-xl bg-white border border-[#D6E4F0] p-3 space-y-2">
                <span className="text-[9px] uppercase font-extrabold text-[#4A90D9] tracking-wide block">Diagnostic evidence</span>
                <p className="text-[10px] text-slate-500 leading-snug">
                  {quizAnswerLog.length} response{quizAnswerLog.length === 1 ? '' : 's'} captured in this frontend preview. The learning engine will determine mastery, weak areas, blindspots, readiness and score after the diagnostic is connected to the backend.
                </p>
              </div>

              <button
                onClick={handleEnterDashboard}
                className="w-full py-2.5 bg-[#F5C518] border-2 border-[#0A1128] hover:bg-[#F5C518]/90 font-extrabold font-display uppercase tracking-wider text-xs rounded-xl shadow transition"
              >
                Enter Sabi Portal
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- STAGE 6: HOME DASHBOARD PWA ---
  function renderHomeDashboard() {
    if (!profile) return null;

    const tabsList = [
      { id: 'home', label: 'Home', icon: Home, action: () => { setActiveTab('home'); } },
      { id: 'practice', label: 'Practice', icon: Play, action: () => { setActiveTab('practice'); setPracticeSessionType(null); } },
      { id: 'blitz', label: 'Blitz', icon: Zap, action: () => { setActiveTab('blitz'); } },
      { id: 'cbt', label: 'CBT', icon: FileText, action: () => { setActiveTab('cbt'); } },
      { id: 'progress', label: 'Progress', icon: ArrowUpRight, action: () => { setActiveTab('progress'); } },
      { id: 'profile', label: 'Profile', icon: User, action: () => { setActiveTab('profile'); } },
      { id: 'settings', label: 'Settings', icon: Settings, action: () => { setActiveTab('settings'); } },
    ];

    return (
      <div className="flex-1 flex flex-col md:flex-row bg-[#F4F7FB] text-slate-800 animate-fade-in shrink-0 relative min-h-[600px] rounded-2xl overflow-hidden border border-[#D6E4F0] shadow-sm">
        
        {/* Left Sidebar for Desktop Web */}
        <aside className="hidden md:flex md:w-64 bg-[#0A1128] text-white flex-col justify-between shrink-0 p-6 border-r border-[#D6E4F0]/10 z-30">
          <div className="space-y-6">
            {/* User Profile Badge */}
            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#F5C518] to-yellow-300 text-[#0A1128] flex items-center justify-center font-black text-sm uppercase shadow shrink-0">
                  {profile.name[0]}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-black truncate text-white">{profile.name}</h4>
                  <p className="text-[9px] text-sky-200/80 uppercase font-mono tracking-wider">{profile.classLevel}</p>
                </div>
              </div>
              <div className="border-t border-white/10 pt-2.5">
                <p className="text-[9px] text-slate-400">Target Goal:</p>
                <p className="text-[10px] font-bold text-[#F5C518] truncate leading-tight mt-0.5">
                  {profile.targetCourse}
                </p>
                <p className="text-[9px] font-bold text-slate-300 truncate leading-tight mt-0.5">
                  at {profile.targetUniversity}
                </p>
                <p className="text-[10px] font-bold text-sky-300 mt-1">{getDynamicJAMBCountdown().diffDays} Days to Exam</p>
              </div>
              <div className="flex justify-between items-center text-[10px] bg-white/10 px-2 py-1 rounded-lg">
                <span className="text-slate-300">Account sync:</span>
                <span className="font-extrabold text-[#F5C518]">Pending</span>
              </div>
            </div>

            {/* Nav Menu */}
            <nav className="space-y-1">
              {tabsList.map((tab) => {
                const IconComponent = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={tab.action}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
                      isActive 
                        ? 'bg-[#F5C518] text-[#0A1128] shadow-md border-2 border-[#0A1128]' 
                        : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <IconComponent className="h-4 w-4 shrink-0" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Exit */}
          <div className="border-t border-white/10 pt-4">
            <button 
              onClick={handleResetProfileSystem} 
              className="w-full py-2 bg-rose-950/40 border border-rose-900/50 hover:bg-rose-900/40 text-rose-300 rounded-xl text-[10px] font-bold uppercase tracking-wider transition"
            >
              Reset Portal
            </button>
          </div>
        </aside>

        {/* Main Content Pane */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#F4F7FB]">
          
          {/* Header row for Mobile view / Status display for Web */}
          <header className={`bg-gradient-to-r from-[#0A1128] to-[#4A90D9] p-4 text-white shadow-sm shrink-0 md:bg-white md:text-slate-850 md:from-white md:to-white md:border-b md:border-[#D6E4F0] ${activeTab === 'practice' ? 'flex justify-center md:justify-start' : 'flex justify-between items-center'}`}>
            {activeTab === 'practice' ? (
              <h1 className="text-sm md:text-base font-black uppercase tracking-widest text-[#F5C518] md:text-[#0A1128]">
                {practiceSessionType === null 
                  ? "Practice Portal" 
                  : practiceSessionType === 'smart' 
                    ? "Smart Practice: Adaptive Mix" 
                    : `Custom Practice: ${customPracticeSubject}`}
              </h1>
            ) : activeTab === 'home' ? (
              <>
                <div className="flex items-center gap-2.5 md:hidden">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#F5C518] to-yellow-300 text-[#0A1128] flex items-center justify-center font-black text-sm shadow">
                    {profile.name[0]}
                  </div>
                  <div className="truncate flex flex-col justify-center">
                    <h4 className="text-xs font-extrabold truncate max-w-[120px] text-white">{profile.name}</h4>
                    <p className="text-[8px] text-sky-100/95 leading-none mt-1">Goal: {profile.targetCourse}</p>
                    <p className="text-[8px] font-bold text-sky-300 mt-1">{getDynamicJAMBCountdown().diffDays} Days to Exam</p>
                  </div>
                </div>

                {/* Desktop status row */}
                <div className="hidden md:flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500">Active Workspace:</span>
                  <span className="text-xs font-extrabold text-[#0A1128] bg-[#EBF1FA] px-3 py-1 rounded-full border border-[#D0E1F9] uppercase tracking-wide">
                    Home Dashboard
                  </span>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="text-xs text-slate-500">Exam countdown:</span>
                  <span className="text-xs font-black text-[#4A90D9]">
                    {getDynamicJAMBCountdown().text}
                  </span>
                </div>

                {/* Right Header Side Badge */}
                <div className="flex items-center gap-2">
                  <div className="flex md:hidden items-center gap-1 bg-white/10 px-2 py-1 rounded-full border border-white/20">
                    <Zap className="h-3.5 w-3.5 text-[#F5C518] fill-current" />
                    <span className="text-[10px] font-black">Account sync pending</span>
                  </div>
                  
                  <div className="hidden md:flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-xl border border-yellow-200 text-[#0A1128]">
                    <Zap className="h-4 w-4 text-[#F5C518] fill-current" />
                    <span className="text-xs font-black">Account sync pending</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center">
                <span className="text-sm md:text-base font-black uppercase tracking-widest text-[#F5C518] md:text-[#0A1128]">
                  {activeTab === 'mastery' ? 'Learning Evidence' : activeTab === 'aitutor' ? 'AI Coach Hub' : activeTab === 'leaderboard' ? 'Standings Leaderboard' : activeTab === 'mobile' ? 'Mobile App Prototype' : activeTab === 'settings' ? 'Settings' : activeTab === 'blitz' ? 'Blitz' : activeTab === 'cbt' ? 'CBT Simulator' : activeTab === 'progress' ? 'Progress' : activeTab === 'recommendations' ? 'Recommendations' : 'Account Details'}
                </span>
              </div>
            )}
          </header>

          {/* Tab Content Canvas context */}
          <div className={`flex-1 ${((activeTab === 'practice' && practiceSessionType === null) || activeTab === 'aitutor') ? 'overflow-hidden flex flex-col bg-[#F4F7FB] p-3 md:p-4 pb-4 md:pb-4' : 'overflow-y-auto p-4 md:p-6 pb-20 md:pb-6'} relative break-words`}>
            {activeTab === 'home' && renderHomeTab()}
            {activeTab === 'practice' && renderPracticeTab()}
            {activeTab === 'blitz' && renderBlitzTab()}
            {activeTab === 'cbt' && renderCBTTab()}
            {activeTab === 'progress' && renderProgressTab()}
            {activeTab === 'recommendations' && renderRecommendationsTab()}
            {activeTab === 'mastery' && renderMasteryTab()}
            {activeTab === 'leaderboard' && renderLeaderboardTab()}
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'settings' && renderSettingsTab()}
            {activeTab === 'aitutor' && renderAITutorTab()}
            {activeTab === 'mobile' && renderMobileTab()}
          </div>
          
          {/* Bottom Mobile Tab Bar (Hidden on Desktop) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0A1128] border-t border-slate-800 flex justify-around items-center z-50 shrink-0 select-none pb-1.5 px-2 text-white shadow-lg">
            {tabsList.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={tab.action}
                  className={`flex flex-col items-center gap-0.5 text-[9px] font-bold ${isActive ? 'text-[#F5C518]' : 'text-[#9AACBF]/85'}`}
                >
                  <IconComponent className="h-4.5 w-4.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    );
  }

  // --- SUB-PANE: DASHBOARD HOME TAB ---
  function renderHomeTab() {
    if (!profile) return null;

    return (
      <div className="space-y-4 animate-fade-in font-sans">
        {/* Learning-state hero: never present client calculations as authoritative */}
        <div className="sabi-surface p-5 md:p-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-[#4A90D9]/5 pointer-events-none" />
          <div className="relative">
            <span className="text-[9px] uppercase font-black tracking-widest text-[#4A90D9]">Today's learning state</span>
            <h2 className="text-2xl md:text-3xl font-black text-[#0A1128] mt-1">What should I do now?</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">SABI keeps the measurement and recommendation logic behind the interface. This dashboard presents the state supplied by the learning engine.</p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => setActiveTab('practice')} className="px-4 py-2.5 rounded-xl bg-[#F5C518] text-[#0A1128] font-black text-xs uppercase tracking-wider">Practice</button>
              <button onClick={() => setActiveTab('blitz')} className="px-4 py-2.5 rounded-xl bg-[#0A1128] text-white font-black text-xs uppercase tracking-wider">Blitz</button>
              <button onClick={() => setActiveTab('cbt')} className="px-4 py-2.5 rounded-xl border border-[#D6E4F0] bg-white text-[#0A1128] font-black text-xs uppercase tracking-wider">CBT</button>
              <button onClick={() => setActiveTab('recommendations')} className="px-4 py-2.5 rounded-xl border border-[#D6E4F0] bg-white text-[#0A1128] font-black text-xs uppercase tracking-wider">Focus area</button>
            </div>
          </div>
        </div>

        {/* Activity summary: do not fabricate streak values before the learning API is connected */}
        <div className="sabi-surface p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Award className="h-5 w-5 text-[#4A90D9] shrink-0" />
            <div>
              <p className="text-xs font-black text-[#0A1128]">Study activity</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Your streak, XP and activity history will appear here from the learning engine.</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-[#F4F7FB] border border-[#D6E4F0] text-[9px] font-black uppercase text-slate-400 shrink-0">Sync pending</span>
        </div>

        {/* Subject progress modules */}
        <div className="space-y-2">
          <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Your Syllabus Progress:</span>
          <div className="grid grid-cols-1 gap-2">
            {profile.chosenSubjects.map((subName) => {
              const observedEvidence = (Object.values(masteryMap) as MasteryMapItem[])
                .filter(t => t.subject === subName)
                .reduce((sum, item) => sum + item.attempts, 0);
              const selfReportedConfidence = profile.subjectConfidence[subName];

              return (
                <div
                  key={subName}
                  onClick={() => {
                    setMapSubject(subName);
                    setActiveTab('mastery');
                  }}
                  className="bg-white border border-[#D6E4F0] p-3 rounded-xl flex justify-between items-center cursor-pointer hover:border-[#4A90D9] transition shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-slate-50 text-[#0A1128] border border-slate-100">
                      <BookOpen className="h-4 w-4 text-slate-500 hover:text-slate-700" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0A1128] truncate max-w-[170px]">{subName}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">{observedEvidence} observed question{observedEvidence === 1 ? '' : 's'} • self-report {selfReportedConfidence}/5</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommendation surface: backend-owned */}
        <div className="bg-[#0A1128] border-2 border-[#0A1128] rounded-2xl p-5 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-white/10" />
          <span className="text-[8px] bg-[#F5C518] text-[#0A1128] px-2 py-0.5 rounded-full font-black uppercase tracking-wider">Learning engine</span>
          <h3 className="text-base font-black mt-3">Your next study action</h3>
          <p className="text-[11px] text-sky-100 leading-relaxed mt-1.5">
            SABI will show the next recommended subject, topic, reason and duration here when recommendation data is available.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 mt-4">
            <button
              onClick={() => setActiveTab('recommendations')}
              className="w-full py-2.5 bg-[#F5C518] text-[#0A1128] font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-yellow-400 transition"
            >
              View recommendations
            </button>
            <button
              onClick={() => { setActiveTab('practice'); setPracticeSessionType(null); }}
              className="w-full py-2.5 bg-transparent border-2 border-white/20 text-sky-100 font-black text-[10px] uppercase tracking-wider rounded-xl hover:bg-white/5 transition"
            >
              Practice on your own
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB-PANE: BLITZ / PROGRESS / CBT / RECOMMENDATIONS ---
  function renderBlitzTab() {
    const blitzQuestion = practiceQuestions[0] || SEED_QUESTIONS.find(q => profile?.chosenSubjects.includes(q.subject)) || SEED_QUESTIONS[0];
    const hasAnswer = practiceSelectedAnswer !== null;
    const isCorrect = hasAnswer && practiceSelectedAnswer === blitzQuestion.answer;

    return (
      <div className="space-y-4 animate-fade-in max-w-5xl mx-auto w-full">
        {/* Blitz hero */}
        <div className="relative overflow-hidden rounded-3xl bg-[#0A1128] text-white p-5 md:p-7 shadow-lg">
          <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-[#4A90D9]/20" />
          <div className="absolute right-16 -bottom-20 h-36 w-36 rounded-full bg-[#F5C518]/10" />
          <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-8 w-8 rounded-xl bg-[#F5C518] text-[#0A1128]">
                  <Zap className="h-4 w-4" />
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] font-black text-[#F5C518]">Blitz</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-black mt-3 tracking-tight">Fast practice. One question at a time.</h2>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                Blitz is a focused rapid-practice mode. The learning engine will control question selection, session state and scoring when connected.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 md:min-w-[250px]">
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">Mode</span>
                <span className="block text-sm font-black mt-1">Rapid practice</span>
              </div>
              <div className="rounded-2xl bg-white/10 border border-white/10 p-3">
                <span className="block text-[9px] uppercase tracking-wider font-bold text-slate-400">State</span>
                <span className="block text-sm font-black mt-1">Preview</span>
              </div>
            </div>
          </div>
        </div>

        {/* Session controls / evidence boundary */}
        <div className="grid md:grid-cols-[1fr_auto] gap-3 items-stretch">
          <div className="sabi-surface p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-[#EAF3FC] text-[#1B3A7A] text-[9px] uppercase tracking-wider font-black">Question 1</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] uppercase tracking-wider font-black">{blitzQuestion.subject}</span>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] uppercase tracking-wider font-black">{blitzQuestion.difficulty}</span>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              No frontend speed ranking or authoritative score is calculated here.
            </p>
          </div>
          <button
            onClick={() => {
              setPracticeQuestions([]);
              setPracticeSelectedAnswer(null);
              setPracticeHasSubmitted(false);
              setPracticeSessionType(null);
            }}
            className="px-4 py-3 rounded-2xl border border-[#D6E4F0] bg-white text-[#0A1128] font-black text-[10px] uppercase tracking-wider hover:border-[#4A90D9] transition"
          >
            Reset preview
          </button>
        </div>

        {/* Question workspace */}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-4 items-start">
          <section className="sabi-surface overflow-hidden">
            <div className="px-5 md:px-7 py-4 border-b border-[#D6E4F0] flex items-center justify-between gap-3">
              <div>
                <span className="text-[9px] uppercase tracking-widest font-black text-[#4A90D9]">Question</span>
                <h3 className="text-sm md:text-base font-black text-[#0A1128] mt-0.5">{blitzQuestion.topic}</h3>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{blitzQuestion.year} • {blitzQuestion.exam_type}</span>
            </div>

            <div className="p-5 md:p-7">
              <div className="text-base md:text-lg font-bold leading-8 text-[#0A1128]">
                <MathText text={blitzQuestion.question} />
              </div>

              <div className="grid gap-3 mt-7">
                {Object.entries(blitzQuestion.options).map(([key, value]) => {
                  const selected = practiceSelectedAnswer === key;
                  const correct = key === blitzQuestion.answer;
                  const resultClass = hasAnswer
                    ? correct
                      ? 'border-[#15803D] bg-[#F0FDF4]'
                      : selected
                        ? 'border-[#B91C1C] bg-[#FEF2F2]'
                        : 'border-slate-200 bg-white opacity-80'
                    : selected
                      ? 'border-[#4A90D9] bg-[#EAF3FC]'
                      : 'border-slate-200 bg-white hover:border-[#4A90D9] hover:bg-[#F8FBFF]';

                  return (
                    <button
                      key={key}
                      disabled={hasAnswer}
                      onClick={() => {
                        setPracticeQuestions([blitzQuestion]);
                        setPracticeSelectedAnswer(key as any);
                        setPracticeHasSubmitted(true);
                        setPracticeSessionType('smart');
                      }}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition flex items-start gap-3 ${resultClass}`}
                    >
                      <span className="w-9 h-9 shrink-0 rounded-xl bg-[#F4F7FB] border border-[#D6E4F0] flex items-center justify-center text-xs font-black text-[#0A1128]">{key}</span>
                      <span className="text-sm md:text-base text-slate-700 leading-relaxed pt-1"><MathText text={value as string} /></span>
                      {hasAnswer && correct && <CheckCircle className="h-5 w-5 text-[#15803D] ml-auto shrink-0 mt-1" />}
                      {hasAnswer && selected && !correct && <XCircle className="h-5 w-5 text-[#B91C1C] ml-auto shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>

              {hasAnswer && (
                <div className={`mt-6 rounded-2xl border p-4 ${isCorrect ? 'border-[#BBF7D0] bg-[#F0FDF4]' : 'border-[#FECACA] bg-[#FEF2F2]'}`}>
                  <div className="flex items-center gap-2">
                    {isCorrect ? <CheckCircle className="h-5 w-5 text-[#15803D]" /> : <Info className="h-5 w-5 text-[#B91C1C]" />}
                    <span className={`text-sm font-black ${isCorrect ? 'text-[#166534]' : 'text-[#991B1B]'}`}>
                      {isCorrect ? 'Answer recorded in preview' : 'Answer recorded in preview'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    The authoritative result, mastery update and any XP/recommendation changes must come from the backend Blitz session.
                  </p>
                  <div className="mt-3 pt-3 border-t border-black/5">
                    <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Explanation preview</span>
                    <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                      <MathText text={blitzQuestion.explanation_short || blitzQuestion.explanation} />
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Blitz information rail */}
          <aside className="space-y-3">
            <div className="sabi-surface p-4">
              <span className="text-[9px] uppercase tracking-widest font-black text-[#4A90D9]">How Blitz works</span>
              <div className="space-y-3 mt-4">
                <div className="flex gap-3">
                  <span className="h-7 w-7 rounded-lg bg-[#EAF3FC] text-[#1B3A7A] flex items-center justify-center text-xs font-black">1</span>
                  <div><p className="text-xs font-black text-[#0A1128]">Receive a focused question</p><p className="text-[10px] text-slate-500 mt-0.5">Selection comes from SABI's learning engine.</p></div>
                </div>
                <div className="flex gap-3">
                  <span className="h-7 w-7 rounded-lg bg-[#FFF8D8] text-[#8A6900] flex items-center justify-center text-xs font-black">2</span>
                  <div><p className="text-xs font-black text-[#0A1128]">Answer quickly</p><p className="text-[10px] text-slate-500 mt-0.5">Stay focused without frontend speed scoring.</p></div>
                </div>
                <div className="flex gap-3">
                  <span className="h-7 w-7 rounded-lg bg-[#F0FDF4] text-[#166534] flex items-center justify-center text-xs font-black">3</span>
                  <div><p className="text-xs font-black text-[#0A1128]">Build learning evidence</p><p className="text-[10px] text-slate-500 mt-0.5">Backend services update mastery and recommendations.</p></div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#F8FBFF] border border-[#D6E4F0] p-4">
              <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Backend boundary</span>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                This preview intentionally does not invent streaks, XP, mastery, readiness or predicted JAMB scores.
              </p>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  function renderProgressTab() {
    const subjects = profile?.chosenSubjects || [];
    return (
      <div className="space-y-4 animate-fade-in max-w-4xl mx-auto w-full">
        <div className="sabi-surface p-5 md:p-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4A90D9]">Learning state</span>
          <h2 className="text-xl md:text-2xl font-black text-[#0A1128] mt-1">Progress & Mastery</h2>
          <p className="text-sm text-slate-500 mt-1">Mastery, confidence, coverage and readiness are displayed from the learning engine; they are not calculated in this screen.</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {subjects.map(subject => {
            const evidence = Object.values(masteryMap).filter(item => item.subject === subject).reduce((sum, item) => sum + item.attempts, 0);
            const confidence = profile?.subjectConfidence?.[subject];
            return (
              <button key={subject} onClick={() => { setMapSubject(subject); setActiveTab('mastery'); }} className="sabi-surface p-4 text-left hover:border-[#4A90D9] transition">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-black text-sm text-[#0A1128]">{subject}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#F8FAFC] border border-slate-100 p-3">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Observed evidence</span>
                    <span className="font-black text-lg text-[#0A1128]">{evidence}</span>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] border border-slate-100 p-3">
                    <span className="block text-[9px] uppercase font-bold text-slate-400">Self-report</span>
                    <span className="font-black text-lg text-[#0A1128]">{confidence ? `${confidence}/5` : '—'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="sabi-surface p-5">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-[#4A90D9]" />
            <span className="font-black text-sm text-[#0A1128]">Not enough evidence?</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">SABI should never turn missing evidence into a 0% score. Complete learning sessions and let the backend update the learning state.</p>
        </div>
      </div>
    );
  }

  function renderRecommendationsTab() {
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl mx-auto w-full">
        <div className="sabi-surface p-5 md:p-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4A90D9]">Next best action</span>
          <h2 className="text-xl md:text-2xl font-black text-[#0A1128] mt-1">Recommendations</h2>
          <p className="text-sm text-slate-500 mt-1">Recommendations come from the learning engine. This screen does not rank or invent them.</p>
        </div>
        <div className="sabi-surface p-5">
          <div className="rounded-2xl bg-[#F8FBFF] border border-[#D6E4F0] p-5">
            <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Current state</span>
            <h3 className="text-base font-black text-[#0A1128] mt-1">Waiting for recommendation data</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">Once the recommendation API supplies an action, target, reason, priority and estimated duration, this surface will render it here without recomputing those values.</p>
          </div>
          <button onClick={() => setActiveTab('practice')} className="mt-4 w-full sm:w-auto px-5 py-3 rounded-xl bg-[#0A1128] text-[#F5C518] font-black text-xs uppercase tracking-wider">
            Open Practice
          </button>
        </div>
      </div>
    );
  }

  function renderCBTTab() {
    const currentQuestion = cbtPreviewQuestions[cbtPreviewIndex];

    if (cbtPreviewConfig && !cbtPreviewSubmitted && cbtPreviewQuestions.length > 0) {
      const selectedAnswer = currentQuestion ? cbtPreviewAnswers[currentQuestion.id] : undefined;
      const answeredCount = Object.keys(cbtPreviewAnswers).length;

      return (
        <div className="space-y-4 animate-fade-in max-w-4xl mx-auto w-full">
          <div className="sabi-surface p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[9px] font-black uppercase tracking-widest text-[#4A90D9]">CBT preview</span>
              <h2 className="text-lg md:text-xl font-black text-[#0A1128] mt-1">{cbtPreviewConfig.mode === 'full' ? 'Full Mock' : 'Quick Mock'}</h2>
              <p className="text-xs text-slate-500 mt-1">Preview question {cbtPreviewIndex + 1} of {cbtPreviewQuestions.length} • {answeredCount} answered</p>
            </div>
            <button onClick={() => setCbtPreviewConfig(null)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-black text-slate-600 hover:bg-slate-50">Exit Preview</button>
          </div>

          <div className="sabi-surface p-5 md:p-7">
            <div className="flex items-center justify-between gap-3 mb-5">
              <span className="px-2.5 py-1 rounded-full bg-[#F4F7FB] border border-[#D6E4F0] text-[9px] font-black uppercase tracking-wider text-slate-500">{currentQuestion?.subject}</span>
              <span className="text-[10px] font-black text-slate-400">No production timer active</span>
            </div>
            <div className="text-base md:text-lg font-bold text-[#0A1128] leading-relaxed">{currentQuestion?.question}</div>
            <div className="grid gap-2.5 mt-6">
              {(['A', 'B', 'C', 'D'] as const).map(option => (
                <button
                  key={option}
                  disabled={Boolean(selectedAnswer)}
                  onClick={() => currentQuestion && setCbtPreviewAnswers(prev => ({ ...prev, [currentQuestion.id]: option }))}
                  className={selectedAnswer === option ? 'w-full text-left p-3.5 rounded-xl border-2 transition font-medium text-sm border-[#4A90D9] bg-[#EEF6FF] text-[#0A1128]' : 'w-full text-left p-3.5 rounded-xl border-2 transition font-medium text-sm border-slate-200 bg-white hover:border-[#4A90D9]/60'}
                >
                  <span className="font-black mr-2">{option}.</span>{currentQuestion?.options[option]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap justify-between gap-2 mt-6 pt-4 border-t border-slate-100">
              <button disabled={cbtPreviewIndex === 0} onClick={() => setCbtPreviewIndex(i => Math.max(0, i - 1))} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-black disabled:opacity-40">Previous</button>
              {cbtPreviewIndex < cbtPreviewQuestions.length - 1 ? (
                <button onClick={() => setCbtPreviewIndex(i => i + 1)} className="px-5 py-2.5 rounded-xl bg-[#0A1128] text-white text-xs font-black">Next Question</button>
              ) : (
                <button onClick={() => setCbtPreviewSubmitted(true)} className="px-5 py-2.5 rounded-xl bg-[#F5C518] text-[#0A1128] text-xs font-black">Submit Preview</button>
              )}
            </div>
          </div>

          <div className="sabi-surface p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-slate-500 leading-relaxed"><strong className="text-[#0A1128]">Preview boundary:</strong> these answers are local to this screen. Production CBT must own question order, authoritative timer, autosave, expiry, submission, scoring and recovery.</p>
          </div>
        </div>
      );
    }

    if (cbtPreviewConfig && cbtPreviewSubmitted) {
      const answeredQuestions = cbtPreviewQuestions.filter(q => cbtPreviewAnswers[q.id]);
      const correctAnswers = answeredQuestions.filter(q => cbtPreviewAnswers[q.id] === q.answer).length;

      return (
        <div className="space-y-4 animate-fade-in max-w-2xl mx-auto w-full">
          <div className="sabi-surface p-6 md:p-8 text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#4A90D9]">Preview complete</span>
            <h2 className="text-2xl font-black text-[#0A1128] mt-2">CBT Preview Submitted</h2>
            <p className="text-sm text-slate-500 mt-2">This is a local UI result only. It is not an official JAMB score or backend exam result.</p>
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4"><span className="text-[9px] uppercase font-black text-slate-400">Answered</span><strong className="block text-xl font-black text-[#0A1128] mt-1">{answeredQuestions.length}/{cbtPreviewQuestions.length}</strong></div>
              <div className="rounded-xl bg-[#F8FAFC] border border-slate-200 p-4"><span className="text-[9px] uppercase font-black text-slate-400">Preview accuracy</span><strong className="block text-xl font-black text-[#0A1128] mt-1">{answeredQuestions.length ? Math.round((correctAnswers / answeredQuestions.length) * 100) : 0}%</strong></div>
            </div>
            <button onClick={() => { setCbtPreviewConfig(null); setCbtPreviewQuestions([]); setCbtPreviewAnswers({}); setCbtPreviewSubmitted(false); setCbtPreviewIndex(0); setCbtPreviewStartedAt(null); }} className="mt-6 w-full py-3 rounded-xl bg-[#0A1128] text-white text-xs font-black uppercase tracking-wider">Back to CBT</button>
          </div>
        </div>
      );
    }

    const startPreview = (mode: 'full' | 'quick') => {
      const count = mode === 'full' ? 180 : 40;
      const duration = mode === 'full' ? 120 : 30;
      const questions = [...SEED_QUESTIONS].slice(0, Math.min(count, SEED_QUESTIONS.length));
      setCbtPreviewConfig({ mode, questionCount: count, durationMinutes: duration });
      setCbtPreviewQuestions(questions);
      setCbtPreviewIndex(0);
      setCbtPreviewAnswers({});
      setCbtPreviewSubmitted(false);
      setCbtPreviewStartedAt(Date.now());
    };

    return (
      <div className="space-y-4 animate-fade-in max-w-3xl mx-auto w-full">
        <div className="sabi-surface p-5 md:p-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4A90D9]">Strict exam environment</span>
          <h2 className="text-xl md:text-2xl font-black text-[#0A1128] mt-1">CBT Simulator</h2>
          <p className="text-sm text-slate-500 mt-1">English Language plus your three selected subjects. AI assistance is unavailable during an active exam.</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <button className="sabi-surface p-5 text-left hover:border-[#4A90D9] transition" onClick={() => startPreview('full')}>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#4A90D9]">Full Mock</span>
            <h3 className="text-lg font-black text-[#0A1128] mt-1">180 questions</h3>
            <p className="text-sm text-slate-500 mt-1">120 minutes • production configuration</p>
            <span className="inline-block mt-4 px-3 py-1.5 rounded-lg bg-[#0A1128] text-white text-[9px] font-black uppercase">Open UI Preview</span>
          </button>
          <button className="sabi-surface p-5 text-left hover:border-[#4A90D9] transition" onClick={() => startPreview('quick')}>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#4A90D9]">Quick Mock</span>
            <h3 className="text-lg font-black text-[#0A1128] mt-1">40 questions</h3>
            <p className="text-sm text-slate-500 mt-1">30 minutes • production configuration</p>
            <span className="inline-block mt-4 px-3 py-1.5 rounded-lg bg-[#0A1128] text-white text-[9px] font-black uppercase">Open UI Preview</span>
          </button>
        </div>
        <div className="sabi-surface p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h3 className="font-black text-sm text-[#0A1128]">Production CBT contract still required</h3>
              <p className="text-sm text-slate-500 mt-1">The preview lets us validate the interface without pretending that local questions, the local clock or local scoring are the real exam service.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB-PANE: DASHBOARD ADAPTIVE PRACTICE ---
  function renderPracticeTab() {
    if (practiceSessionType === null) {
      return (
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto animate-fade-in pb-6">
          {customPracticeModalVisible && (
            <div
              className="absolute inset-0 z-[60] bg-[#0A1128]/55 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="custom-practice-title"
            >
              <div className="bg-white w-full md:max-w-2xl md:rounded-3xl rounded-t-[28px] shadow-2xl border border-[#D6E4F0] overflow-hidden animate-slide-up">
                <div className="bg-[#0A1128] text-white px-5 md:px-7 py-5 relative overflow-hidden">
                  <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#4A90D9]/20" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <span className="text-[9px] uppercase tracking-[0.18em] font-black text-[#F5C518]">Custom Practice</span>
                      <h3 id="custom-practice-title" className="text-xl md:text-2xl font-black mt-1">Build your practice session.</h3>
                      <p className="text-[11px] md:text-xs text-white/60 mt-1.5 max-w-lg">
                        Choose exactly what you want to practise. Your selections stay visible before the session starts.
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close custom practice"
                      onClick={() => setCustomPracticeModalVisible(false)}
                      className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-5 md:p-7 space-y-5 max-h-[72vh] overflow-y-auto">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="rounded-2xl border border-[#D6E4F0] bg-[#F8FBFF] p-4">
                      <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Subject</span>
                      <select
                        aria-label="Custom practice subject"
                        className="w-full mt-2 text-sm font-bold p-3 rounded-xl border border-slate-200 bg-white text-[#0A1128] focus:outline-none focus:border-[#4A90D9]"
                        value={customPracticeSubject || ''}
                        onChange={e => {
                          setCustomPracticeSubject(e.target.value as SubjectName);
                          setCustomPracticeTopic(null);
                        }}
                      >
                        <option value="" disabled>Select subject</option>
                        {(((profile as any)?.subjects || profile?.chosenSubjects || ['English Language', 'Mathematics', 'Physics', 'Chemistry']) as SubjectName[]).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-[#D6E4F0] bg-[#F8FBFF] p-4">
                      <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Topic</span>
                      <select
                        aria-label="Custom practice topic"
                        className="w-full mt-2 text-sm font-bold p-3 rounded-xl border border-slate-200 bg-white text-[#0A1128] focus:outline-none focus:border-[#4A90D9]"
                        value={customPracticeTopic || ''}
                        onChange={e => setCustomPracticeTopic(e.target.value)}
                        disabled={!customPracticeSubject}
                      >
                        <option value="" disabled>{customPracticeSubject ? 'Select topic' : 'Select subject first'}</option>
                        <option value="All">All topics</option>
                        {Array.from(new Set(
                          SEED_QUESTIONS
                            .filter(q => q.subject === customPracticeSubject)
                            .map(q => q.topic)
                            .filter(Boolean)
                        )).map(topic => (
                          <option key={topic} value={topic}>{topic}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-[#D6E4F0] bg-[#F8FBFF] p-4">
                      <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Exam year</span>
                      <select
                        aria-label="Custom practice exam year"
                        className="w-full mt-2 text-sm font-bold p-3 rounded-xl border border-slate-200 bg-white text-[#0A1128] focus:outline-none focus:border-[#4A90D9]"
                        value={customPracticeYear || ''}
                        onChange={e => setCustomPracticeYear(e.target.value)}
                      >
                        <option value="" disabled>Select year</option>
                        <option value="All">Any past year</option>
                        {Array.from(new Set(
                          SEED_QUESTIONS
                            .filter(q => !customPracticeSubject || q.subject === customPracticeSubject)
                            .map(q => q.year)
                            .filter(Boolean)
                        )).sort((a, b) => Number(b) - Number(a)).map(year => (
                          <option key={year} value={String(year)}>{year}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#D6E4F0] bg-white p-4 md:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Session preview</span>
                        <p className="text-sm font-black text-[#0A1128] mt-1">
                          {customPracticeSubject || 'Choose a subject'}
                          {customPracticeTopic ? ` • ${customPracticeTopic === 'All' ? 'All topics' : customPracticeTopic}` : ''}
                          {customPracticeYear ? ` • ${customPracticeYear === 'All' ? 'Any past year' : customPracticeYear}` : ''}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-[#EAF3FC] text-[#1B3A7A] text-[9px] font-black uppercase">
                        {customPracticeSubject && customPracticeTopic && customPracticeYear ? 'Ready to launch' : '3 selections required'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2">
                      SABI will not substitute unrelated questions if this exact preview filter returns no results.
                    </p>
                  </div>

                  <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomPracticeModalVisible(false)}
                      className="flex-1 py-3.5 rounded-2xl border border-slate-200 bg-white text-[#0A1128] text-xs font-black uppercase tracking-wider hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLaunchCustomPractice}
                      disabled={!customPracticeSubject || !customPracticeTopic || !customPracticeYear}
                      className="flex-[1.5] py-3.5 rounded-2xl bg-[#F5C518] border border-[#0A1128] text-[#0A1128] text-xs font-black uppercase tracking-wider shadow-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:shadow-none transition"
                    >
                      Launch Custom Practice
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="mb-5 rounded-3xl bg-[#0A1128] text-white p-5 md:p-7 relative overflow-hidden">
            <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-[#4A90D9]/20 blur-2xl" />
            <div className="absolute right-10 bottom-[-60px] w-32 h-32 rounded-full bg-[#F5C518]/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-center justify-between gap-3 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-[#F5C518]" />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">Practice Hub</span>
                </div>
                <span className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-white/10 border border-white/10 text-white/75">PREVIEW</span>
              </div>
              <div className="max-w-2xl">
                <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Practice with purpose.</h2>
                <p className="mt-2 text-sm md:text-base text-white/65 leading-relaxed max-w-xl">
                  Choose how you want to practise. Smart Practice is designed around your learning state; Custom Practice lets you control the questions yourself.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3 mt-6 max-w-xl">
                <div className="rounded-2xl bg-white/8 border border-white/10 p-3"><span className="text-[9px] uppercase tracking-wider text-white/45 block">Mode</span><span className="text-xs font-black mt-1 block">Focused</span></div>
                <div className="rounded-2xl bg-white/8 border border-white/10 p-3"><span className="text-[9px] uppercase tracking-wider text-white/45 block">Selection</span><span className="text-xs font-black mt-1 block">Backend-led</span></div>
                <div className="rounded-2xl bg-white/8 border border-white/10 p-3"><span className="text-[9px] uppercase tracking-wider text-white/45 block">Session</span><span className="text-xs font-black mt-1 block">Adaptive</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 mb-5 flex items-start gap-3">
            <span className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shrink-0 border border-amber-100"><Info className="w-4 h-4 text-amber-700" /></span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-amber-900">Frontend preview boundary</p>
              <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">Seeded questions power this interface preview. The production backend must own recommendations, question selection, adaptive sequencing, mastery, XP, readiness and session persistence.</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-4">
            <section className="lg:col-span-3 rounded-3xl border border-[#D6E4F0] bg-white p-5 md:p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-9 h-9 rounded-xl bg-[#FFF3B0] border border-[#F5C518]/60 flex items-center justify-center"><Sparkles className="w-4 h-4 text-[#0A1128]" /></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4A90D9]">Recommended mode</span>
                  </div>
                  <h3 className="text-xl font-black text-[#0A1128] tracking-tight">Smart Practice</h3>
                  <p className="text-xs text-slate-500 mt-1.5 max-w-lg leading-relaxed">Let the learning engine decide what deserves your attention next. The current build uses a safe seeded preview until recommendation APIs are connected.</p>
                </div>
              </div>
              <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200 p-4 mb-4">
                <div className="flex items-center justify-between gap-3 mb-3"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Subject focus</span><span className="text-[9px] font-bold text-slate-400">Select one for preview</span></div>
                <div className="flex flex-wrap gap-2">
                  {(((profile as any)?.subjects || profile?.chosenSubjects || ['English Language', 'Mathematics', 'Physics', 'Chemistry']) as SubjectName[]).map(sub => (
                    <button key={sub} onClick={() => setActiveSmartSubject(sub)} className={activeSmartSubject === sub ? 'px-3 py-2 rounded-xl text-[10px] font-black transition border bg-[#0A1128] text-white border-[#0A1128]' : 'px-3 py-2 rounded-xl text-[10px] font-black transition border bg-white text-slate-600 border-slate-200 hover:border-[#4A90D9]'}>
                      {sub}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#D6E4F0] p-4 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#EBF1FA] flex items-center justify-center shrink-0"><RefreshCw className="w-4 h-4 text-[#4A90D9]" /></div>
                <div className="min-w-0"><p className="text-xs font-black text-[#0A1128]">Recommendation data pending</p><p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">When connected, this area will show the backend-selected next practice focus.</p></div>
              </div>
              <button onClick={() => handleStartSmartPractice(activeSmartSubject)} className="w-full py-3.5 bg-[#F5C518] text-[#0A1128] font-black text-xs uppercase tracking-[0.12em] rounded-2xl hover:bg-yellow-400 transition shadow-sm flex items-center justify-center gap-2">Start Smart Practice Preview<ChevronRight className="w-4 h-4" /></button>
            </section>

            <section className="lg:col-span-2 rounded-3xl border border-[#D6E4F0] bg-white p-5 md:p-6 shadow-sm">
              <div className="flex items-start gap-3 mb-5">
                <span className="w-9 h-9 rounded-xl bg-[#EBF1FA] border border-[#D6E4F0] flex items-center justify-center"><Sliders className="w-4 h-4 text-[#0A1128]" /></span>
                <div><span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">You control the mix</span><h3 className="text-xl font-black text-[#0A1128] tracking-tight mt-1">Custom Practice</h3></div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">Choose a subject, topic and past exam year, then launch a focused practice session.</p>
              <div className="space-y-2.5 mb-4">
                <button onClick={() => setCustomPracticeModalVisible(true)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#4A90D9] p-3.5 text-left transition flex items-center justify-between gap-3"><div className="min-w-0"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Subject</span><span className="text-xs font-black text-[#0A1128] block mt-1 truncate">{customPracticeSubject || 'Choose a subject'}</span></div><ChevronRight className="w-4 h-4 text-slate-400 shrink-0" /></button>
                <button onClick={() => setCustomPracticeModalVisible(true)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#4A90D9] p-3.5 text-left transition flex items-center justify-between gap-3"><div className="min-w-0"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Topic</span><span className="text-xs font-black text-[#0A1128] block mt-1 truncate">{customPracticeTopic ? (customPracticeTopic === 'All' ? 'All Areas' : customPracticeTopic) : 'Choose a topic'}</span></div><ChevronRight className="w-4 h-4 text-slate-400 shrink-0" /></button>
                <button onClick={() => setCustomPracticeModalVisible(true)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[#4A90D9] p-3.5 text-left transition flex items-center justify-between gap-3"><div className="min-w-0"><span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Exam year</span><span className="text-xs font-black text-[#0A1128] block mt-1 truncate">{customPracticeYear ? (customPracticeYear === 'All' ? 'Any past year' : customPracticeYear) : 'Choose a year'}</span></div><ChevronRight className="w-4 h-4 text-slate-400 shrink-0" /></button>
              </div>
              <button onClick={() => setCustomPracticeModalVisible(true)} className="w-full py-3.5 rounded-2xl bg-[#0A1128] text-white text-xs font-black uppercase tracking-[0.12em] hover:bg-slate-800 transition">Configure Custom Practice</button>
            </section>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="w-8 h-8 rounded-lg bg-[#F4F7FB] flex items-center justify-center text-[#4A90D9] mb-3"><Sparkles className="w-4 h-4" /></span><h4 className="text-[11px] font-black text-[#0A1128]">Smart Practice</h4><p className="text-[10px] text-slate-500 leading-relaxed mt-1">Personalized when backend recommendations are available.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="w-8 h-8 rounded-lg bg-[#F4F7FB] flex items-center justify-center text-[#4A90D9] mb-3"><Sliders className="w-4 h-4" /></span><h4 className="text-[11px] font-black text-[#0A1128]">Custom Practice</h4><p className="text-[10px] text-slate-500 leading-relaxed mt-1">Choose your own subject, topic and year.</p></div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4"><span className="w-8 h-8 rounded-lg bg-[#F4F7FB] flex items-center justify-center text-[#4A90D9] mb-3"><BookOpen className="w-4 h-4" /></span><h4 className="text-[11px] font-black text-[#0A1128]">Shared question flow</h4><p className="text-[10px] text-slate-500 leading-relaxed mt-1">Answer, review and learn in one consistent experience.</p></div>
          </div>
        </div>
      );
    }

    if (practiceQuestions.length === 0) {
      return <div className="sabi-surface p-6 text-center space-y-4 max-w-xl mx-auto w-full"><div className="w-12 h-12 rounded-2xl bg-[#F4F7FB] border border-[#D6E4F0] flex items-center justify-center mx-auto"><AlertCircle className="h-5 w-5 text-[#4A90D9]" /></div><div><h4 className="text-base font-black text-[#0A1128]">No preview questions available</h4><p className="text-xs text-slate-500 mt-1">The selected configuration returned no seeded preview questions.</p></div><button onClick={() => { setPracticeSessionType(null); setPracticeQuestions([]); setPracticeComplete(false); }} className="px-5 py-2.5 rounded-xl bg-[#0A1128] text-white text-xs font-black uppercase tracking-wider">Return to Practice Hub</button></div>;
    }

    if (practiceComplete) {
      const accuracy = Math.floor((practiceCorrectCount / practiceQuestions.length) * 100);
      return <div className="max-w-2xl mx-auto w-full animate-fade-in"><div className="rounded-3xl bg-[#0A1128] text-white p-6 md:p-8 text-center"><CheckCircle className="w-12 h-12 text-emerald-300 mx-auto mb-4" /><span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50">Session complete</span><h3 className="text-2xl font-black mt-2">Practice review finished.</h3><p className="text-xs text-white/60 mt-2">Preview result only. Authoritative progress comes from the learning engine.</p></div><div className="grid grid-cols-2 gap-3 mt-4"><div className="rounded-2xl border border-[#D6E4F0] bg-white p-5"><span className="text-[9px] uppercase font-black text-slate-400">Correct</span><p className="text-2xl font-black text-[#0A1128] mt-1 font-mono">{practiceCorrectCount}<span className="text-sm text-slate-400"> / {practiceQuestions.length}</span></p></div><div className="rounded-2xl border border-[#D6E4F0] bg-white p-5"><span className="text-[9px] uppercase font-black text-slate-400">Preview accuracy</span><p className="text-2xl font-black text-[#0A1128] mt-1 font-mono">{accuracy}%</p></div></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mt-3"><p className="text-[10px] font-black uppercase text-amber-900">Not a backend result</p><p className="text-[11px] text-amber-800 mt-1">This preview does not update mastery, XP, readiness, recommendations or JAMB score.</p></div><button onClick={() => { setPracticeSessionType(null); setPracticeQuestions([]); setPracticeComplete(false); setActiveTab('practice'); }} className="w-full mt-4 py-3.5 rounded-2xl bg-[#0A1128] text-white text-xs font-black uppercase">Back to Practice Hub</button></div>;
    }

    const currentQ = practiceQuestions[practiceIndex];
    const progress = ((practiceIndex + (practiceHasSubmitted ? 1 : 0)) / practiceQuestions.length) * 100;
    return (
      <div className="flex flex-col animate-fade-in relative">
        {showExitQuizModal && <div className="absolute inset-0 z-50 bg-slate-900/50 backdrop-blur-sm rounded-3xl flex items-center justify-center p-4"><div className="bg-white rounded-3xl p-6 shadow-2xl w-full max-w-sm"><h3 className="text-lg font-black text-[#0A1128]">Leave this practice session?</h3><p className="text-xs text-slate-500 mt-2">Current preview answers are local only.</p><div className="grid grid-cols-2 gap-2 mt-5"><button onClick={() => setShowExitQuizModal(false)} className="py-3 rounded-xl border border-slate-200 text-xs font-black">Stay</button><button onClick={handleQuizExitAndSave} className="py-3 rounded-xl bg-[#0A1128] text-white text-xs font-black">Exit Preview</button></div></div></div>}
        <div className="rounded-3xl bg-[#0A1128] text-white p-4 md:p-5 relative overflow-hidden"><div className="relative"><div className="flex items-center justify-between gap-3"><button onClick={() => setShowExitQuizModal(true)} className="flex items-center gap-1 text-[10px] font-black uppercase text-white/60"><ChevronLeft className="w-4 h-4" /> Exit</button><div className="text-center"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#F5C518] block">{practiceSessionType === 'smart' ? 'Smart Practice' : 'Custom Practice'}</span><span className="text-[10px] text-white/55 block mt-1">{currentQ.subject}</span></div><span className="text-[10px] font-black font-mono text-white/70">{practiceIndex + 1}/${practiceQuestions.length}</span></div><div className="mt-5 h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-[#F5C518] rounded-full" style={{width: Math.min(100, progress) + '%'}} /></div><div className="flex justify-between mt-3 text-[9px] font-bold text-white/50 uppercase"><span>{currentQ.topic}</span><span>{currentQ.difficulty} difficulty</span></div></div></div>
        <div className="grid lg:grid-cols-3 gap-4 mt-4"><main className="lg:col-span-2 rounded-3xl border border-[#D6E4F0] bg-white p-5 md:p-7 shadow-sm"><div className="flex justify-between mb-5"><span className="text-[9px] font-black uppercase tracking-[0.18em] text-[#4A90D9]">Question {practiceIndex + 1}</span><span className="text-[9px] font-bold text-slate-400">Preview question</span></div><div className="text-base md:text-lg font-bold text-[#0A1128] leading-[1.8]"><MathText text={currentQ.question} /></div><div className="space-y-2.5 mt-7">{Object.entries(currentQ.options).map(([key, value]) => { const correct = key === currentQ.answer, selected = practiceSelectedAnswer === key; let style = 'border-slate-200 bg-white hover:border-[#4A90D9] hover:bg-[#F8FBFF] text-slate-700'; if (practiceHasSubmitted) style = selected && correct ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : selected ? 'border-rose-500 bg-rose-50 text-rose-950' : correct ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : 'border-slate-100 bg-slate-50 text-slate-400 opacity-60'; else if (selected) style = 'border-[#0A1128] bg-[#F4F7FB] text-[#0A1128] ring-2 ring-[#0A1128]/5'; return <button key={key} type="button" disabled={practiceHasSubmitted} onClick={() => !practiceHasSubmitted && setPracticeSelectedAnswer(key as any)} className={'w-full p-4 rounded-2xl border text-left transition flex items-start gap-3 ' + style}><span className={'w-8 h-8 rounded-xl shrink-0 flex items-center justify-center text-[10px] font-black border ' + (selected ? 'bg-[#0A1128] text-[#F5C518] border-[#0A1128]' : 'bg-slate-50 text-slate-500 border-slate-200')}>{key}</span><span className="text-sm leading-relaxed pt-1"><MathText text={value as string} /></span></button>; })}</div>{practiceHasSubmitted && <div className="mt-5 rounded-2xl border border-[#D6E4F0] bg-[#F8FAFC] p-4">{!aiExplainText && !aiExplainLoading ? <div className="flex items-center justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-wider text-[#4A90D9]">Sabi AI Coach</p><p className="text-[11px] text-slate-500 mt-1">See a step-by-step explanation.</p></div><button onClick={fetchPracticeExplanation} className="px-4 py-2.5 rounded-xl bg-[#0A1128] text-[#F5C518] text-[10px] font-black">Explain</button></div> : aiExplainLoading ? <div className="flex items-center gap-2 text-[#4A90D9] text-[10px]"><Loader2 className="h-4 w-4 animate-spin" /> Coach is drafting an explanation…</div> : <div><span className="text-[9px] uppercase font-black tracking-wider text-[#4A90D9]">Worked explanation</span><div className="text-xs text-slate-800 leading-relaxed mt-2"><MathText text={aiExplainText} /></div></div>}</div>}<div className="mt-6"><button onClick={practiceHasSubmitted ? handleNextPracticeStep : handleSubmitPracticeChoice} disabled={!practiceHasSubmitted && !practiceSelectedAnswer} className={'w-full py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider ' + (practiceHasSubmitted ? 'bg-[#0A1128] text-white' : practiceSelectedAnswer ? 'bg-[#F5C518] text-[#0A1128]' : 'bg-slate-100 text-slate-400 cursor-not-allowed')}>{practiceHasSubmitted ? (practiceIndex === practiceQuestions.length - 1 ? 'Finish Session' : 'Next Question') : 'Submit Answer'}</button></div></main>
        <aside className="rounded-3xl border border-[#D6E4F0] bg-white p-5 h-fit"><div className="flex items-center gap-2 mb-4"><span className="w-9 h-9 rounded-xl bg-[#EBF1FA] flex items-center justify-center"><Info className="w-4 h-4 text-[#4A90D9]" /></span><h4 className="text-sm font-black text-[#0A1128]">Practice guide</h4></div><div className="space-y-4"><div><span className="text-[9px] font-black uppercase text-slate-400">1. Choose</span><p className="text-[10px] text-slate-500 mt-1">Select one answer before submitting.</p></div><div><span className="text-[9px] font-black uppercase text-slate-400">2. Review</span><p className="text-[10px] text-slate-500 mt-1">Review the answer and explanation after submission.</p></div><div><span className="text-[9px] font-black uppercase text-slate-400">3. Learn</span><p className="text-[10px] text-slate-500 mt-1">Production learning evidence will be handled by the backend.</p></div></div><div className="mt-5 rounded-2xl bg-amber-50 border border-amber-200 p-3"><p className="text-[9px] font-black uppercase text-amber-900">Preview boundary</p><p className="text-[10px] text-amber-800 mt-1">No XP, mastery, readiness, recommendation or JAMB score changes here.</p></div></aside></div>
      </div>
    );
  }

  // --- SUB-PANE: DASHBOARD MASTERY MAP CORE ---
  function renderMasteryTab() {
    return (
      <MasteryMap
        profile={profile}
        masteryMap={masteryMap}
        selectedSubject={mapSubject}
        onSubjectChange={setMapSubject}
        onStartPractice={handleStartSmartPractice}
        onStartTutor={(subj, topic) => {
          setTutorSubject(subj);
          setTutorTopic(topic);
          setTutorChatActive(true);
          setActiveTab('aitutor');
        }}
      />
    );
  }

  // --- SUB-PANE: SQUAD LEADERBOARDS ---
  function renderLeaderboardTab() {
    return (
      <div className="space-y-4 animate-fade-in font-sans max-w-3xl mx-auto w-full">
        <div className="sabi-surface p-5 md:p-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4A90D9]">Community progress</span>
          <h2 className="text-xl md:text-2xl font-black text-[#0A1128] mt-1">Leaderboard</h2>
          <p className="text-sm text-slate-500 mt-1">Rankings, XP, streaks and mastery gains must come from the backend leaderboard service.</p>
        </div>
        <div className="sabi-surface p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F4F7FB] border border-[#D6E4F0] flex items-center justify-center mx-auto">
            <Trophy className="w-5 h-5 text-[#4A90D9]" />
          </div>
          <h3 className="text-base font-black text-[#0A1128] mt-4">Leaderboard data pending</h3>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">No peer rankings are shown until the leaderboard API supplies authoritative rank, period, participant and score data. The frontend will not invent standings.</p>
        </div>
      </div>
    );
  }

  // --- SUB-PANE: DASHBOARD PROFILE TAB ---
  function renderProfileTab() {
    if (!profile) return null;

    return (
      <div className="space-y-4 animate-fade-in font-sans">
        {/* Profile Card details */}
        <div className="bg-white border border-[#D6E4F0] p-5 rounded-2xl shadow-sm space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#0A1128] to-[#4A90D9] text-white flex items-center justify-center font-bold text-lg mx-auto uppercase">
            {profile.name[0]}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-[#0A1128]">{profile.name}</h4>
            <p className="text-[10px] text-[#4A90D9] leading-tight bg-[#F4F7FB] px-3 py-1 rounded inline-block font-bold">
              Goal: {profile.targetCourse} at {profile.targetUniversity}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-left">
            <div className="p-2.5 theme bg-[#F4F7FB] rounded-xl">
              <span className="block text-[8px] uppercase tracking-wide text-slate-400">Class Level</span>
              <span className="font-bold text-[#0A1128] text-[10px] truncate block">{profile.classLevel}</span>
            </div>
            <div className="p-2.5 theme bg-[#F4F7FB] rounded-xl">
              <span className="block text-[8px] uppercase tracking-wide text-slate-400">Language preference</span>
              <span className="font-bold text-[#0A1128] text-[10px] uppercase block">{profile.languagePreference}</span>
            </div>
            <div className="p-2.5 theme bg-[#F4F7FB] rounded-xl">
              <span className="block text-[8px] uppercase tracking-wide text-slate-400">Explanation style</span>
              <span className="font-bold text-[#0A1128] text-[10px] uppercase block">{profile.explanationPreference}</span>
            </div>
            <div className="p-2.5 theme bg-[#F4F7FB] rounded-xl">
              <span className="block text-[8px] uppercase tracking-wide text-slate-400">Streak history</span>
              <span className="font-bold text-[#0A1128] text-[10px] block font-mono">Backend sync pending</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="rounded-xl bg-[#F8FBFF] border border-[#D6E4F0] p-3 text-left">
              <span className="text-[9px] uppercase tracking-wider font-black text-slate-400">Account & access</span>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div><span className="block text-[8px] uppercase text-slate-400">Access status</span><span className="text-[10px] font-black text-[#0A1128]">Backend sync pending</span></div>
                <div><span className="block text-[8px] uppercase text-slate-400">AI credits</span><span className="text-[10px] font-black text-[#0A1128]">Not available in preview</span></div>
              </div>
              <p className="text-[9px] text-slate-500 mt-2 leading-relaxed">Subscription, entitlements, payments, AI-credit balance and account security are authoritative server state and are not fabricated here.</p>
            </div>
            <button
              onClick={handleResetProfileSystem}
              className="w-full py-2 bg-rose-50 border border-rose-200 text-rose-600 font-bold text-[10px] uppercase tracking-wider rounded-xl transition"
            >
              Reset frontend preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB-PANE: DASHBOARD SETTINGS TAB ---
  function renderSettingsTab() {
    return (
      <div className="space-y-4 animate-fade-in max-w-3xl mx-auto w-full">
        <div className="sabi-surface p-5 md:p-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-[#4A90D9]">Account preferences</span>
          <h2 className="text-xl md:text-2xl font-black text-[#0A1128] mt-1">Settings</h2>
          <p className="text-sm text-slate-500 mt-1">Manage learning preferences and account controls. Changes that affect the account must be persisted by the backend.</p>
        </div>
        <div className="grid gap-3">
          <div className="sabi-surface p-5 space-y-4">
            <h3 className="text-sm font-black text-[#0A1128]">Learning preferences</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 p-3"><span className="block text-[9px] uppercase font-black text-slate-400">Language</span><span className="text-xs font-bold text-[#0A1128]">{profile?.languagePreference || 'Not set'}</span></div>
              <div className="rounded-xl border border-slate-200 p-3"><span className="block text-[9px] uppercase font-black text-slate-400">Explanation style</span><span className="text-xs font-bold text-[#0A1128]">{profile?.explanationPreference || 'Not set'}</span></div>
            </div>
            <p className="text-[10px] text-slate-500">Preference editing controls will connect to the profile/preferences API. This preview does not silently persist local changes as account state.</p>
          </div>
          <div className="sabi-surface p-5 space-y-3">
            <h3 className="text-sm font-black text-[#0A1128]">Access & billing</h3>
            <div className="grid sm:grid-cols-3 gap-2">
              <div className="rounded-xl bg-[#F8FBFF] border border-[#D6E4F0] p-3"><span className="block text-[8px] uppercase font-black text-slate-400">Plan</span><span className="text-[10px] font-black text-[#0A1128]">Pending sync</span></div>
              <div className="rounded-xl bg-[#F8FBFF] border border-[#D6E4F0] p-3"><span className="block text-[8px] uppercase font-black text-slate-400">Entitlements</span><span className="text-[10px] font-black text-[#0A1128]">Pending sync</span></div>
              <div className="rounded-xl bg-[#F8FBFF] border border-[#D6E4F0] p-3"><span className="block text-[8px] uppercase font-black text-slate-400">AI credits</span><span className="text-[10px] font-black text-[#0A1128]">Pending sync</span></div>
            </div>
            <p className="text-[10px] text-slate-500">Payment, subscription, access limits and AI-credit balances are server-authoritative.</p>
          </div>
          <div className="sabi-surface p-5 space-y-3">
            <h3 className="text-sm font-black text-[#0A1128]">Session</h3>
            <button onClick={handleResetProfileSystem} className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs font-black uppercase tracking-wider">Exit frontend preview</button>
            <p className="text-[10px] text-slate-500">Production logout will invalidate the authenticated session through the authentication service. This preview action only exits the local frontend flow.</p>
          </div>
        </div>
      </div>
    );
  }

  // --- SUB-PANE: AI TUTOR HUB CHAT ---
  function renderAITutorTab() {
    return (
      <SabiAIChat
        profile={profile}
        masteryMap={masteryMap}
        messages={tutorMessages}
        setMessages={setTutorMessages}
        chatSubject={tutorSubject}
        setChatSubject={setTutorSubject}
        chatTopic={tutorTopic}
        setChatTopic={setTutorTopic}
        isChatActive={tutorChatActive}
        setIsChatActive={setTutorChatActive}
      />
    );
  }

  // --- SUB-PANE: MOBILE NATIVE PROTOTYPE CONTROLLER ---
  function renderMobileTab() {
    const [selectedScreen, setSelectedScreen] = useState<number>(1);
    const [onboardingSlide, setOnboardingSlide] = useState<number>(0);
    const [authScore, setAuthScore] = useState<number>(290);
    const [authChosen, setAuthChosen] = useState<string[]>(['English Language', 'Mathematics']);
    const [pracSelected, setPracSelected] = useState<string | null>(null);
    const [pracVerified, setPracVerified] = useState<boolean>(false);
    const [masteryNodeSelected, setMasteryNodeSelected] = useState<any>(null);
    const [leaderboardTab, setLeaderboardTab] = useState<'weekly' | 'alltime'>('weekly');
    const [codeCopied, setCodeCopied] = useState<boolean>(false);
    const [activeCodeTab, setActiveCodeTab] = useState<'details' | 'code' | 'expo'>('code');

    const [authFlowStep, setAuthFlowStep] = useState<'register' | 'otp' | 'welcome'>('register');
    const [authFlowEmail, setAuthFlowEmail] = useState<string>('aspirant@sabi.com');
    const [authFlowPhone, setAuthFlowPhone] = useState<string>('8123456789');
    const [authFlowPassword, setAuthFlowPassword] = useState<string>('SabiSuccess2026!');
    const [authFlowAgree, setAuthFlowAgree] = useState<boolean>(true);
    const [authFlowSecure, setAuthFlowSecure] = useState<boolean>(true);
    const [authFlowOtp, setAuthFlowOtp] = useState<string[]>(['', '', '', '', '', '']);
    const [activeOtpBoxIdx, setActiveOtpBoxIdx] = useState<number>(0);

    const screensList = [
      { id: 1, name: '1. Onboarding & Slider', desc: 'Pre-calibrated 3 slide tutorial with animated particles and live score count loops.', code: reactNativeOnboardingCode },
      { id: 2, name: '2. Custom Sign Up', desc: 'Context-aware registrations with Nigeria flag divider, target score slider & multi-select chips.', code: reactNativeAuthCode },
      { id: 3, name: '3. Home Dashboard', desc: 'Syllabus motivational center carrying the Gold score dial, streak capsule matrix and tasks.', code: reactNativeDashboardCode },
      { id: 4, name: '4. High-Focus Practice', desc: 'Question workspaces featuring LaTeX formulas, dynamic clock thresholds, state answer feedback & AI coach sheet.', code: reactNativePracticeCode },
      { id: 5, name: '5. Mastery Node map', desc: 'Topological visual nodes graph linked by dynamic layout paths showing mastery weights.', code: reactNativeMasteryCode },
      { id: 6, name: '6. Score Forecast', desc: 'Speedometer gauge indicator rendering dynamic predictions withPOINT-gap recommendations.', code: reactNativePredictorCode },
      { id: 7, name: '7. Squad Standings', desc: 'Elite leaderboards segmented by timelines highlighting top medals and personalized active student row.', code: reactNativeLeaderboardCode },
      { id: 8, name: '8. Profile & Calendar', desc: 'Student profile operations equipped with a 28-day study block activity grid and critical deletion items.', code: reactNativeSettingsCode },
    ];

    const currentScreenObj = screensList.find(s => s.id === selectedScreen) || screensList[0];

    const copyCodeToClipboard = () => {
      navigator.clipboard.writeText(currentScreenObj.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    };

    const toggleAuthSubject = (subjectName: string) => {
      if (subjectName === 'English Language') return;
      if (authChosen.includes(subjectName)) {
        setAuthChosen(authChosen.filter(s => s !== subjectName));
      } else {
        if (authChosen.length >= 4) return;
        setAuthChosen([...authChosen, subjectName]);
      }
    };

    return (
      <div className="flex flex-col lg:flex-row gap-6 bg-slate-50 min-h-[500px] border border-slate-200 rounded-2xl overflow-hidden p-2 md:p-4">
        
        {/* LEFT COLUMN: MODULE NAVIGATION TABS */}
        <div className="w-full lg:w-72 shrink-0 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
            <h3 className="text-xs font-black uppercase text-[#0A1128] tracking-widest">UTME MOBILE APP CENTER</h3>
            <p className="text-[11px] text-slate-500 leading-normal">
              Inspect, interact, and copy complete **Expo-ready** TypeScript screen codes designed for the SABI JAMB mobile suite.
            </p>
          </div>

          <div className="space-y-1 bg-white p-2 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block px-3 py-1.5 label">Available Screens</span>
            {screensList.map((sc) => (
              <button
                key={sc.id}
                onClick={() => {
                  setSelectedScreen(sc.id);
                  // Reset states for interactive components on change
                  setPracSelected(null);
                  setPracVerified(false);
                  setMasteryNodeSelected(null);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                  selectedScreen === sc.id
                    ? 'bg-[#EBF1FA] text-[#0A1128] border-l-4 border-[#1B3A7A]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span>{sc.name}</span>
                <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />
              </button>
            ))}
          </div>

          {/* PALETTE HIGHLIGHTS CARD */}
          <div className="bg-[#0A1128] text-white p-4 rounded-xl space-y-3 shadow-sm">
            <h4 className="text-[10px] font-black text-[#F5C518] uppercase tracking-wider">60-30-10 PALETTE DESIGN RULES</h4>
            <div className="space-y-2 text-[10px] leading-relaxed">
              <div className="flex gap-2 items-center">
                <span className="w-3.5 h-3.5 rounded bg-[#EBF1FA] border border-slate-700 block shrink-0" />
                <span>**60% Dominant (Ice Blue #EBF1FA)**: Smooth eye-safe background canvas</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="w-3.5 h-3.5 rounded bg-[#0A1128] border border-slate-700 block shrink-0" />
                <span>**30% Secondary (Navy #0A1128)**: Structured typography & titles</span>
              </div>
              <div className="flex gap-2 items-center">
                <span className="w-3.5 h-3.5 rounded bg-[#F5C518] border border-slate-700 block shrink-0" />
                <span>**10% Accent (Gold #F5C518)**: Crucial study milestones and CTAs</span>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: MODERN VIRTUAL INTERACTIVE SMARTPHONE (Aesthetic Live Simulation) */}
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-200/60 p-4 rounded-2xl border border-slate-200 relative min-h-[640px]">
          <span className="absolute top-2 left-6 text-[10px] font-black font-mono text-slate-500 uppercase z-10">Active Simulated Mobile Interface (Click Widgets to Interact)</span>
          
          {/* Sabi Phone Frame Shell */}
          <div className="w-[320px] h-[640px] bg-[#0A1128] rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 flex flex-col overflow-hidden relative shrink-0">
            {/* Camera / Speaker Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-full z-40 flex items-center justify-between px-4">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
              <div className="w-12 h-1 bg-slate-950 rounded" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#0A1128] border border-slate-950" />
            </div>

            {/* Simulated Live Viewport Mobile screen */}
            <div className="flex-1 bg-[#EBF1FA] rounded-[34px] overflow-hidden flex flex-col relative pt-8 font-sans text-slate-800 select-none">
              
              {/* SCREEN 1: ONBOARDING MOCKUP */}
              {selectedScreen === 1 && (
                <div className="flex-1 flex flex-col justify-between p-4 relative bg-[#EBF1FA]">
                  {/* Strategic grid background lines */}
                  <div className="absolute inset-0 border border-slate-200/5 border-dashed pointer-events-none" />
                  
                  {/* Top Branding Bar */}
                  <div className="flex justify-between items-center z-10 mt-2">
                    <span className="text-[11px] font-black tracking-wide text-[#0A1128]">SABI JAMB</span>
                    {onboardingSlide < 2 && (
                      <button 
                        onClick={() => setOnboardingSlide(2)} 
                        className="text-[10px] font-black bg-white border border-slate-200 text-[#0A1128] px-2.5 py-0.5 rounded-full"
                      >
                        Skip
                      </button>
                    )}
                  </div>

                  {/* Main Content Card Inside */}
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200/80 p-4 flex flex-col items-center justify-between text-center my-4 relative">
                    
                    {onboardingSlide === 0 && (
                      <div className="flex-1 flex flex-col justify-center items-center gap-2 animate-fade-in">
                        <div className="w-10 h-10 rounded-full bg-[#FFF3B0] flex items-center justify-center border border-[#F5C518] mb-2 shadow-sm">
                          <span className="text-sm">🤖</span>
                        </div>
                        <h4 className="text-sm font-black text-[#0A1128] leading-tight font-sans">Crack JAMB. Own Your Future.</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">
                          AI-powered prep designed specifically for Nigerian students. We make learning stick.
                        </p>
                      </div>
                    )}

                    {onboardingSlide === 1 && (
                      <div className="flex-1 flex flex-col justify-center items-center gap-2 animate-fade-in w-full">
                        <span className="text-[9px] font-bold text-slate-300 tracking-wider">SYSTEMATIC MAP</span>
                        <h4 className="text-sm font-black text-[#0A1128] leading-tight">See Your Weak Spots. Fix Them Fast.</h4>
                        
                        <div className="w-full bg-[#F4F7FB] border border-slate-200 p-2.5 rounded-xl my-2 space-y-1 text-left relative">
                          <div className="flex justify-between items-center text-[8px] font-bold text-slate-400">
                            <span>Matrices Syllabus Node Connection</span>
                            <span className="text-red-500">Gaps found</span>
                          </div>
                          <div className="flex justify-around items-center pt-1.5">
                            <span className="bg-emerald-50 text-emerald-700 text-[8px] font-bold border border-emerald-300 px-1.5 py-0.5 rounded-full">82% OK</span>
                            <span className="bg-rose-50 text-rose-700 text-[8px] font-bold border border-rose-300 px-1.5 py-0.5 rounded-full">34% Weak</span>
                            <span className="bg-blue-50 text-blue-700 text-[8px] font-bold border border-blue-300 px-1.5 py-0.5 rounded-full">50% Mid</span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">
                          Our visual interactive graph highlights what you forgot and what to read.
                        </p>
                      </div>
                    )}

                    {onboardingSlide === 2 && (
                      <div className="flex-1 flex flex-col justify-center items-center gap-3 animate-fade-in">
                        <span className="text-[9px] font-bold text-[#1B3A7A] tracking-wider">REAL TIME TRACKING</span>
                        <h4 className="text-sm font-black text-[#0A1128] leading-tight">Watch Your Score Climb.</h4>
                        
                        {/* Glowing radial dial mockup */}
                        <div className="w-24 h-24 rounded-full border-4 border-[#F5C518] bg-[#FFF3B0]/40 flex flex-col justify-center items-center shadow-lg transform scale-95 relative">
                          <span className="text-2xl font-black font-mono text-[#0A1128]">287</span>
                          <span className="text-[7px] text-[#1B3A7A] font-bold tracking-widest mt-0.5">EST. UTME</span>
                        </div>
                        
                        <p className="text-[10px] text-slate-500 leading-relaxed max-w-[200px]">
                          Watch your target score climb as you pass mock questions.
                        </p>
                      </div>
                    )}

                    {/* Sliding micro-progress indicators */}
                    <div className="flex gap-1.5 justify-center mt-2">
                      {[0, 1, 2].map(slideNo => (
                        <span 
                          key={slideNo} 
                          className={`h-1.5 rounded-full block transition-all duration-300 ${onboardingSlide === slideNo ? 'w-4 bg-[#F5C518]' : 'w-1.5 bg-slate-200'}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Back or Next Slide Controller */}
                  <div className="flex justify-between items-center z-10 gap-4">
                    <button
                      disabled={onboardingSlide === 0}
                      onClick={() => setOnboardingSlide(prev => prev - 1)}
                      className={`text-[10px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 ${onboardingSlide === 0 && 'opacity-30'}`}
                    >
                      Back
                    </button>
                    
                    <button
                      onClick={() => {
                        if (onboardingSlide < 2) {
                          setOnboardingSlide(prev => prev + 1);
                        } else {
                          setOnboardingSlide(0); // Loop back
                        }
                      }}
                      className="flex-1 bg-[#F5C518] hover:bg-[#F5C518]/90 text-[#0A1128] py-2 px-4 rounded-xl text-xs font-black text-center transition shadow-sm border border-[#0A1128]"
                    >
                      {onboardingSlide === 2 ? 'Start Over' : 'Next'}
                    </button>
                  </div>
                </div>
              )}

              {/* SCREEN 2: AUTH REGISTER */}
              {selectedScreen === 2 && (
                <div className="flex-1 flex flex-col bg-[#EBF1FA] relative overflow-hidden select-none">
                  {/* Subtle Blueprint grid background simulation */}
                  <div className="absolute inset-0 grid grid-cols-12 gap-0 opacity-[0.06] pointer-events-none z-0">
                    {Array.from({ length: 48 }).map((_, i) => (
                      <div key={i} className="border-b border-r border-[#0A1128] h-8 w-full" />
                    ))}
                  </div>

                  <div className="z-10 flex-grow flex flex-col overflow-y-auto">
                    {/* Top Bar Layout */}
                    <div className="bg-[#0A1128] text-white px-4 py-2.5 flex justify-between items-center shrink-0 shadow-sm">
                      <div className="flex items-center gap-1.5 border border-[#F5C518]/60 bg-white/5 py-1 px-2.5 rounded-full">
                        <div className="w-1.5 h-1.5 bg-[#F5C518] rounded-full animate-pulse" />
                        <span className="text-[11px] font-black tracking-wider">
                          Sabi <span className="text-[#F5C518]">JAMB</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 border border-white/25 py-1 px-2.5 rounded-full">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        <span className="text-[8px] font-bold text-white/95">Simulate Offline</span>
                      </div>
                    </div>

                    <div className="p-4 flex-grow flex flex-col justify-center">
                      {/* STEP 1: Registration Form */}
                      {authFlowStep === 'register' && (
                        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-md space-y-4">
                          <div className="space-y-1 text-center">
                            <span className="text-[9px] font-black uppercase text-[#4A90D9] tracking-widest block">STAGE 1 OF 5: FAST ENTRY</span>
                            <h3 className="text-xl font-bold text-[#0A1128] tracking-tight">Create Account</h3>
                            <p className="text-[11px] text-[#4A5568] leading-normal px-2">
                              We'll customize your study pathways specifically to pass your target score.
                            </p>
                          </div>

                          {/* Email Input */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-[#0A1128] tracking-wider block">EMAIL ADDRESS</label>
                            <input 
                              type="email"
                              value={authFlowEmail}
                              onChange={(e) => setAuthFlowEmail(e.target.value)}
                              className="w-full text-xs px-3 py-2 bg-[#F0F4FA] border border-[#D6E4F0] rounded-xl text-[#0A1128] font-medium outline-none focus:border-[#1B3A7A] focus:bg-white transition"
                              placeholder="e.g. tunde@gmail.com"
                            />
                          </div>

                          {/* Phone Number Input with Flag */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-[#0A1128] tracking-wider block">PHONE NUMBER (NIGERIAN)</label>
                            <div className="flex bg-[#F0F4FA] border border-[#D6E4F0] rounded-xl overflow-hidden focus-within:border-[#1B3A7A] focus-within:bg-white transition">
                              <div className="flex items-center gap-1 px-3 bg-slate-200 text-xs font-bold text-[#0A1128] border-r border-[#CBD5E1]">
                                <span>🇳🇬</span>
                                <span className="font-mono text-[11px]">+234</span>
                              </div>
                              <input 
                                type="tel"
                                value={authFlowPhone}
                                onChange={(e) => setAuthFlowPhone(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 text-xs px-3 py-2 bg-transparent outline-none font-medium text-[#0A1128]"
                                placeholder="8123456789"
                                maxLength={10}
                              />
                            </div>
                          </div>

                          {/* Password Input with eye toggles */}
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-[#0A1128] tracking-wider block">PASSWORD</label>
                            <div className="flex bg-[#F0F4FA] border border-[#D6E4F0] rounded-xl overflow-hidden focus-within:border-[#1B3A7A] focus-within:bg-white transition">
                              <input 
                                type={authFlowSecure ? "password" : "text"}
                                value={authFlowPassword}
                                onChange={(e) => setAuthFlowPassword(e.target.value)}
                                className="flex-1 text-xs px-3 py-2 bg-transparent outline-none font-medium text-[#0A1128]"
                                placeholder="Create strong password"
                              />
                              <button 
                                type="button"
                                onClick={() => setAuthFlowSecure(!authFlowSecure)}
                                className="px-3 text-slate-400 hover:text-[#0A1128] transition text-sm"
                              >
                                {authFlowSecure ? '👁️' : '🕶️'}
                              </button>
                            </div>
                          </div>

                          {/* Custom Checkbox */}
                          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                            <input 
                              type="checkbox"
                              checked={authFlowAgree}
                              onChange={(e) => setAuthFlowAgree(e.target.checked)}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded-md border-1.5 flex items-center justify-center shrink-0 transition ${authFlowAgree ? 'bg-[#0A1128] border-[#0A1128]' : 'border-[#1B3A7A] bg-white'}`}>
                              {authFlowAgree && <div className="w-1.5 h-1.5 bg-[#F5C518] rounded-full" />}
                            </div>
                            <span className="text-[11px] text-[#4A5568] leading-tight selection:bg-transparent">
                              I agree to Sabi Privacy Terms and Syllabus Guidelines.
                            </span>
                          </label>

                          {/* Submit Action */}
                          <button 
                            type="button"
                            onClick={() => {
                              if (!authFlowEmail || !authFlowPhone || !authFlowPassword) {
                                alert('Please complete the registration fields.');
                                return;
                              }
                              if (!authFlowAgree) {
                                alert('Please check the Syllabus Guidelines compliance mark.');
                                return;
                              }
                              setAuthFlowStep('otp');
                            }}
                            className="w-full h-11 bg-[#F5C518] border border-[#0A1128] hover:bg-[#F5C518]/90 text-[#0A1128] font-black text-center text-xs rounded-xl shadow-sm hover:shadow active:scale-[0.98] transition duration-150 flex items-center justify-center gap-1"
                          >
                            REGISTER & VERIFY <span className="font-mono font-black">&gt;</span>
                          </button>

                          <div className="text-center pt-1 text-[11px] text-slate-500">
                            Already sitting? <span className="font-[#0A1128] font-bold hover:underline cursor-pointer">Login</span>
                          </div>
                        </div>
                      )}

                      {/* STEP 2: OTP Verification Overlay Dialog container */}
                      {authFlowStep === 'otp' && (
                        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-lg space-y-4 relative">
                          <button 
                            type="button"
                            onClick={() => setAuthFlowStep('register')}
                            className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center text-[10px] text-slate-600 font-bold"
                          >
                            ✕
                          </button>

                          <div className="space-y-1 text-center">
                            <h3 className="text-lg font-black text-[#0A1128] tracking-tight">Enter Verification Code</h3>
                            <p className="text-[11px] text-[#4A5568] leading-normal px-2">
                              We sent a 6-digit verification code to your device.
                            </p>
                          </div>

                          {/* Six digit OTP blocks */}
                          <div className="grid grid-cols-6 gap-2 py-1">
                            {Array.from({ length: 6 }).map((_, idx) => {
                              const value = authFlowOtp[idx];
                              const isFocused = activeOtpBoxIdx === idx;
                              return (
                                <input
                                  key={idx}
                                  type="tel"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  maxLength={1}
                                  value={value}
                                  onFocus={() => setActiveOtpBoxIdx(idx)}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    const nextOtp = [...authFlowOtp];
                                    nextOtp[idx] = val;
                                    setAuthFlowOtp(nextOtp);
                                    if (val && idx < 5) {
                                      setActiveOtpBoxIdx(idx + 1);
                                      // Focus next element programmatically in browser mock
                                      setTimeout(() => {
                                        const nextEl = document.getElementById(`browser-otp-${idx + 1}`);
                                        nextEl?.focus();
                                      }, 10);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Backspace' && !authFlowOtp[idx] && idx > 0) {
                                      setActiveOtpBoxIdx(idx - 1);
                                      setTimeout(() => {
                                        const prevEl = document.getElementById(`browser-otp-${idx - 1}`);
                                        prevEl?.focus();
                                      }, 10);
                                    }
                                  }}
                                  id={`browser-otp-${idx}`}
                                  className={`w-full h-11 text-center font-mono text-base font-black rounded-lg bg-[#F0F4FA] border-2 transition ${isFocused ? 'border-[#1B3A7A] bg-white text-[#1B3A7A]' : 'border-[#D6E4F0] text-[#0A1128]'}`}
                                />
                              );
                            })}
                          </div>

                          {/* Confirm action */}
                          <button 
                            type="button"
                            onClick={() => {
                              const codeStr = authFlowOtp.join('');
                              if (codeStr.length === 6) {
                                setAuthFlowStep('welcome');
                              } else {
                                alert('Please complete the 6 digit code');
                              }
                            }}
                            className="w-full h-11 bg-[#F5C518] border border-[#0A1128] hover:bg-[#F5C518]/90 text-[#0A1128] font-black text-center text-xs rounded-xl shadow-sm active:scale-[0.98] transition cursor-pointer"
                          >
                            CONFIRM CODE
                          </button>

                          <div className="text-center pt-1 text-[11px] text-slate-500">
                            Didn't get a code? <span className="font-[#0A1128] font-bold hover:underline cursor-pointer">Resend SMS</span>
                          </div>
                        </div>
                      )}

                      {/* STEP 3: Welcome Configured Gateway */}
                      {authFlowStep === 'welcome' && (
                        <div className="bg-white p-5 rounded-[22px] border border-slate-200/80 shadow-lg space-y-4 text-center">
                          {/* Banner block gradient */}
                          <div className="bg-gradient-to-r from-[#0A1128] to-[#1B3A7A] text-white p-3.5 rounded-xl border border-slate-200/10">
                            <span className="text-[10px] font-black uppercase text-white tracking-widest block">WELCOME ONBOARD</span>
                            <span className="text-[8px] text-[#D0E1F9] block mt-0.5">Sabi adaptive pathways configured</span>
                          </div>

                          {/* Classroom Orb Card container */}
                          <div className="bg-[#F4F7FB] border border-[#D6E4F0] p-3 rounded-xl flex items-center gap-3 text-left">
                            <div className="w-7 h-7 rounded-full bg-white border border-[#D6E4F0] flex items-center justify-center text-sm shadow-sm">
                              🌍
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-[#1B3A7A] block">Nigeria Aspirants Classroom</span>
                              <span className="text-[8.5px] text-slate-400 block font-medium">Auto-assigned active workspace</span>
                            </div>
                          </div>

                          <div className="space-y-2 py-1">
                            <h3 className="text-lg font-black text-[#0A1128] tracking-tight leading-tight">Crack JAMB. Own Your Future.</h3>
                            <p className="text-[11px] text-[#4A5568] leading-relaxed">
                              We are going to ask you <span className="font-bold text-[#0A1128]">exactly 15 quick questions</span> to build your personalized <span className="font-bold text-[#0A1128]">Mastery Map</span>. No empty profiles, only high morale!
                            </p>
                          </div>

                          {/* Tactile gold button with shadow lift */}
                          <button 
                            type="button"
                            onClick={() => {
                              // Reset active step so they can play it again
                              setAuthFlowStep('register');
                              setAuthFlowOtp(['', '', '', '', '', '']);
                              setActiveOtpBoxIdx(0);
                              alert('Onboarding Simulation Complete! Resetting to Stage 1 form.');
                            }}
                            className="w-full h-11 bg-[#F5C518] border border-[#0A1128] hover:bg-[#F5C518]/90 text-[#0A1128] font-black text-center text-xs rounded-xl shadow-[0_4px_0_#0A1128] active:translate-y-[2px] active:shadow-[0_2px_0_#0A1128] transition-all flex items-center justify-center gap-1 font-sans"
                          >
                            GET STARTED <span className="font-mono font-black">&gt;</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* SCREEN 3: DASHBOARD */}
              {selectedScreen === 3 && (
                <div className="flex-1 flex flex-col bg-[#EBF1FA] relative">
                  
                  {/* Top Navy hero background section overlay */}
                  <div className="bg-[#0A1128] text-white p-3 pb-8 rounded-b-2xl relative space-y-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <div>
                        <span className="text-slate-400 block text-[8px]">ASPIRANT LEVEL</span>
                        <span className="font-extrabold text-white text-[11px]">Labc Candidate</span>
                      </div>
                      <span className="bg-yellow-400/10 border border-[#F5C518] text-[#F5C518] font-mono text-[9px] px-2 py-0.5 rounded font-black">EXAM COUNTDOWN — BACKEND DATA</span>
                    </div>

                    {/* Giant score dial vector */}
                    <div className="flex flex-col items-center justify-center pt-1 relative">
                      <span className="text-3xl font-black font-mono text-[#F5C518]">—</span>
                      <span className="text-[7px] text-slate-300 font-bold tracking-widest uppercase">BACKEND SCORE — DESIGN PREVIEW</span>
                      <span className="bg-[#1B3A7A] text-[#FFF3B0] text-[8px] font-black px-2 py-0.5 rounded-full absolute bottom--6 font-mono">LIVE TREND — BACKEND DATA</span>
                    </div>
                  </div>

                  {/* Overlap float streak card */}
                  <div className="mx-3 -mt-3 bg-white p-2.5 rounded-xl border border-slate-200 z-10 shadow-sm space-y-1.5 flex gap-2 items-center">
                    <span className="text-xl shrink-0">🔥</span>
                    <div className="flex-1">
                      <span className="text-[10px] font-black leading-none block text-[#0A1128]">Study streak — backend data</span>
                      <span className="text-[8px] text-slate-500 block">Sabi memory calibrator is active</span>
                    </div>
                    {/* Tiny micro dots representing day columns */}
                    <div className="flex gap-0.5 shrink-0">
                      {[1, 2, 3, 4, 5, 0, 0].map((v, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full ${v > 0 ? 'bg-[#F5C518]' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  </div>

                  {/* Scrollable grid metrics content */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-12">
                    
                    {/* Quick stats matric boxes */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <span className="block text-[11px] font-black text-sky-700 font-mono">180</span>
                        <span className="text-[7px] text-slate-400">Questions Done</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <span className="block text-[11px] font-black text-emerald-700 font-mono">81%</span>
                        <span className="text-[7px] text-slate-400">Accuracy</span>
                      </div>
                      <div className="bg-white p-1.5 rounded-lg border border-slate-200 text-center">
                        <span className="block text-[11px] font-black text-blue-700 font-mono">12</span>
                        <span className="text-[7px] text-slate-400">Units Clean</span>
                      </div>
                    </div>

                    {/* Subjects items horizontal */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">My UTME Study Pack</span>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {[
                          { key: 'Mth', val: '78%', style: 'border-[#F5C518]' },
                          { key: 'Eng', val: '61%', style: 'border-l-[#1B3A7A]' },
                          { key: 'Phy', val: '42%', style: 'border-[#D32F2F]' }
                        ].map((m) => (
                          <div key={m.key} className={`w-20 bg-white p-2 rounded-lg border ${m.style} shrink-0 text-center`}>
                            <span className="block text-[10px] font-black text-[#0A1128]">{m.key}</span>
                            <span className="text-[8px] font-bold text-slate-500">Mastery: **{m.val}**</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Weekly study plan card */}
                    <div className="bg-white rounded-xl border-l-[6px] border-l-[#1B3A7A] border border-slate-200 p-2.5 space-y-1.5">
                      <span className="text-[8px] font-black uppercase tracking-wider text-[#1B3A7A]">TODAY'S STUDY DIRECTIVE</span>
                      <div className="space-y-1 text-[10px] text-[#0A1128]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                          <span>Complete 10 Physics Mechanics equations</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Review English Subject-Verb Concord</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedScreen(4)}
                        className="bg-[#F5C518] text-[#0A1128] text-[9px] font-black px-3 py-1 rounded shadow-sm border border-black inline-block mt-1"
                      >
                        Start Session →
                      </button>
                    </div>

                  </div>

                  {/* Temporary Bottom nav simulated strip */}
                  <div className="absolute bottom-0 left-0 right-0 h-11 bg-[#0A1128] flex justify-around items-center text-[10px]">
                    <span className="text-[#F5C518]">🏠</span>
                    <span className="text-slate-400">📝</span>
                    <span className="text-slate-400">🗺️</span>
                    <span className="text-slate-400">🏆</span>
                  </div>
                </div>
              )}

              {/* SCREEN 4: PRACTICE MODULE */}
              {selectedScreen === 4 && (
                <div className="flex-1 flex flex-col bg-slate-50 relative pb-10">
                  {/* Countdown Clock with top progress line */}
                  <div className="bg-[#0A1128] text-white p-2 flex justify-between items-center px-4 relative">
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CHALLENGE 3 OF 10</span>
                    {/* Time limit text styled in JetBrains color changes */}
                    <div className="flex items-center gap-1">
                      <span className="text-[12px] font-black font-mono text-[#F5C518]">01:48</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    
                    {/* Question Presentation cardboard */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                      <span className="bg-[#EBF1FA] text-[#1B3A7A] px-2 py-0.5 rounded font-mono text-[8px] inline-block font-extrabold">JAMB CHEMISTRY 2019 • QUIZ</span>
                      <p className="text-[11px] font-bold text-[#0A1128] leading-relaxed">
                        What is the empirical formula of a compound containing 40.0% Carbon, 6.7% Hydrogen, and 53.3% Oxygen? [Take atomic masses: C=12, H=1, O=16]
                      </p>
                    </div>

                    {/* Choices matrix clickable options */}
                    <div className="space-y-1.5">
                      {[
                        { key: 'A', text: 'CH2O (Standard Formula)', correct: true },
                        { key: 'B', text: 'CHO Empirical Acid', correct: false },
                        { key: 'C', text: 'C2H4O Aldehyde Ratio', correct: false },
                        { key: 'D', text: 'CH3O Methyl Group', correct: false }
                      ].map((item) => {
                        const sel = pracSelected === item.key;
                        let cardClass = 'bg-white border-slate-200 text-slate-800';
                        
                        if (sel && !pracVerified) {
                          cardClass = 'bg-[#0A1128] text-white border-[#0A1128]';
                        } else if (pracVerified) {
                          if (item.correct) {
                            cardClass = 'bg-emerald-50 text-emerald-800 border-emerald-500 border-2';
                          } else if (sel) {
                            cardClass = 'bg-rose-50 text-rose-800 border-rose-500 border-2';
                          } else {
                            cardClass = 'bg-white border-slate-200 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={item.key}
                            onClick={() => { if (!pracVerified) setPracSelected(item.key); }}
                            className={`w-full text-left p-3 rounded-lg border text-xs font-bold transition flex items-center gap-2.5 ${cardClass}`}
                          >
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] border ${sel ? 'bg-[#F5C518] text-[#0A1128] border-black' : 'bg-slate-100 text-slate-500'}`}>
                              {item.key}
                            </span>
                            <span className="leading-tight">{item.text}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* AI interactive verification button */}
                    {!pracVerified ? (
                      <button
                        disabled={!pracSelected}
                        onClick={() => setPracVerified(true)}
                        className={`w-full py-2.5 bg-[#F5C518] hover:bg-[#F5C518]/90 text-[#0A1128] rounded-xl text-xs font-black tracking-widest border border-black ${!pracSelected && 'opacity-40'}`}
                      >
                        SUBMIT RUNNING SABI AI COACH
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setPracSelected(null);
                          setPracVerified(false);
                        }}
                        className="w-full py-2.5 bg-[#0A1128] text-white rounded-xl text-xs font-black tracking-widest"
                      >
                        RETRY / CONTINUE PRACTICE
                      </button>
                    )}

                  </div>

                  {/* Contextual AI Explanation bottom-sheet (Visible when submitted) */}
                  {pracVerified && (
                    <div className="absolute bottom-0 left-0 right-0 h-40 bg-white border-t border-slate-200 p-3 shadow-lg flex flex-col z-10 animate-slide-up">
                      <div className="w-8 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                        <span className="text-[10px] uppercase font-black text-indigo-700">🤖 Sabi AI Step Explanation</span>
                        <span className="text-[8px] font-mono text-slate-400">Success Math Model</span>
                      </div>
                      <div className="flex-1 overflow-y-auto text-[10px] text-slate-600 leading-normal pt-1 space-y-1.5 font-mono">
                        <p>Calculate moles for 100g Carbon:</p>
                        <p className="bg-[#F4F7FB] p-1 rounded font-bold text-slate-700 font-mono">40.0g / 12 = 3.33 Moles</p>
                        <p>Divide smallest value to lock formula: $CH_2O$</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SCREEN 5: MASTERY MAP NODES */}
              {selectedScreen === 5 && (
                <div className="flex-1 flex flex-col bg-slate-100 relative overflow-hidden">
                  
                  {/* Scrollable horizontal subject selectors */}
                  <div className="bg-white border-b border-slate-200 p-1.5 flex gap-1.5 overflow-x-auto">
                    {['Mth', 'Eng', 'Phy', 'Chm'].map(v2 => (
                      <span key={v2} className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-[#0A1128] shrink-0 border border-slate-200">
                        {v2}
                      </span>
                    ))}
                  </div>

                  {/* Infinite matrix topological layout */}
                  <div className="flex-1 p-4 flex flex-col items-center justify-start space-y-4 overflow-y-auto">
                    <span className="text-[8px] font-black font-mono text-slate-400 tracking-widest uppercase">SYLLABUS GRAPH PATH</span>
                    
                    {/* Interconnected node preview paths */}
                    {[
                      { id: 1, title: 'Matrices Determinants', accuracy: '82%', style: 'border-emerald-500 text-emerald-800' },
                      { id: 2, title: 'Indices Surds Review', accuracy: '34%', style: 'border-[#D32F2F] text-rose-800' },
                      { id: 3, title: 'Calculus Derivatives', accuracy: '?', style: 'border-slate-400 border-dashed text-slate-400' }
                    ].map((nd, idx) => (
                      <button
                        key={nd.id}
                        onClick={() => setMasteryNodeSelected(nd)}
                        className="flex flex-col items-center group relative w-full"
                      >
                        {idx > 0 && <span className="w-0.5 h-6 bg-slate-300 block -mt-2" />}
                        <div className={`w-12 h-12 rounded-full bg-white border-2 flex items-center justify-center font-mono font-black text-[12px] shadow-sm transform hover:scale-105 active:scale-95 ${nd.style}`}>
                          {nd.accuracy}
                        </div>
                        <span className="text-[10px] font-black text-[#0A1128] mt-1">{nd.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Node bottom drawer detail context slider sheet */}
                  {masteryNodeSelected && (
                    <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex flex-col shadow-2xl animate-fade-in">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] font-black text-[#0A1128]">{masteryNodeSelected.title}</span>
                        <button onClick={() => setMasteryNodeSelected(null)} className="text-slate-400 text-xs font-bold font-mono">✕</button>
                      </div>
                      <div className="flex justify-between pt-2">
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400">Exam Weight:</span>
                          <span className="block text-[11px] font-black text-[#1B3A7A]">HIGH TOPIC PRIORITY</span>
                        </div>
                        <button 
                          onClick={() => {
                            setMasteryNodeSelected(null);
                            setSelectedScreen(4);
                          }}
                          className="bg-[#0A1128] text-white text-[9px] font-black px-3 py-1 rounded"
                        >
                          Practice Topic
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* SCREEN 6: SCORE PREDICTOR */}
              {selectedScreen === 6 && (
                <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-4">
                  
                  {/* Gauge speedometer hero */}
                  <div className="bg-[#0A1128] text-white p-4 rounded-b-2xl items-center flex flex-col space-y-1">
                    <span className="text-[8px] font-mono text-slate-300 tracking-wider font-bold">EXAM SCALE — DESIGN PREVIEW</span>
                    <div className="w-24 h-14 border-4 border-dashed border-[#F5C518] rounded-t-full flex items-center justify-center pt-4 mt-1">
                      <span className="text-2xl font-black font-mono text-[#F5C518]">—</span>
                    </div>
                    <span className="text-[8px] text-slate-400">CALIBRATION DATA — BACKEND REQUIRED</span>
                  </div>

                  <div className="p-3 space-y-3">
                    
                    {/* Point Gaps outline cards directive banner */}
                    <div className="bg-[#EBF1FA] border-2 border-dashed border-[#D0E1F9] p-2.5 rounded-xl text-left space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#0A1128]">
                        <span>🎯</span><span>Strategic Score Prognosis</span>
                      </div>
                      <p className="text-[10px] text-slate-600 leading-normal">
                        Score-gap and recommendation data will be supplied by the learning engine. This design preview does not calculate admission targets.
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        <span className="bg-[#D0E1F9] text-[9px] font-bold px-2 py-0.5 rounded text-[#0A1128]">Recommendation data pending</span>
                      </div>
                    </div>

                    {/* Metric deck performance */}
                    <div className="space-y-1 bg-white p-3 rounded-lg border border-slate-200">
                      <span className="text-[8px] font-black text-slate-400 mt-1 uppercase block">Backend Performance Metrics</span>
                      {[
                        { name: 'Mathematics', value: '—', width: 'w-0', color: 'bg-emerald-500' },
                        { name: 'English Concord', value: '—', width: 'w-0', color: 'bg-indigo-500' },
                        { name: 'Chemistry Surds', value: '—', width: 'w-0', color: 'bg-[#D32F2F]' }
                      ].map(metric => (
                        <div key={metric.name} className="space-y-0.5 text-slate-700 text-[10px]">
                          <div className="flex justify-between items-center font-bold">
                            <span>{metric.name}</span>
                            <span className="font-mono">{metric.value}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${metric.color} ${metric.width} rounded-full`} />
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>
              )}

              {/* SCREEN 7: LEADERBOARD Hub */}
              {selectedScreen === 7 && (
                <div className="flex-1 flex flex-col bg-[#EBF1FA]">
                  
                  {/* weekly/alltime navigation buttons strip */}
                  <div className="bg-[#0A1128] text-white p-3 rounded-b-2xl space-y-2">
                    <span className="text-[9px] font-black text-slate-400 block text-center uppercase tracking-widest">SABB ATHLETICS STANDINGS</span>
                    <div className="flex justify-around items-center border-t border-slate-700/60 pt-2 text-[10px]">
                      <button onClick={() => setLeaderboardTab('weekly')} className={`font-bold ${leaderboardTab === 'weekly' ? 'text-[#F5C518] border-b-2 border-[#F5C518]' : 'text-slate-400'}`}>Weekly Squad</button>
                      <button onClick={() => setLeaderboardTab('alltime')} className={`font-bold ${leaderboardTab === 'alltime' ? 'text-[#F5C518] border-b-2 border-[#F5C518]' : 'text-slate-400'}`}>All-time Elite</button>
                    </div>
                  </div>

                  {/* Leaderboard list frame */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                    {[
                      { rank: '🥇', name: 'Grace Adebayo', score: '345 pts', me: false },
                      { rank: '🥈', name: 'Chinedu Joseph', score: '328 pts', me: false },
                      { rank: '🥉', name: 'Mustapha Kabir', score: '318 pts', me: false },
                      { rank: '4', name: 'Aspirant (You)', score: '287 pts', me: true },
                      { rank: '5', name: 'Sarah Peters', score: '275 pts', me: false }
                    ].map((st) => (
                      <div 
                        key={st.name} 
                        className={`p-2.5 rounded-xl flex items-center border justify-between transition-all ${
                          st.me 
                            ? 'bg-[#FFF3B0] border-[#F5C518] shadow-sm transform scale-102 font-bold' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-black text-slate-500 w-5">{st.rank}</span>
                          <span className="text-[11px] text-[#0A1128]">{st.name}</span>
                        </div>
                        <span className="bg-[#0A1128] text-[#F5C518] px-2 py-0.5 rounded font-mono text-[9px] font-bold shrink-0">{st.score}</span>
                      </div>
                    ))}
                  </div>

                </div>
              )}

              {/* SCREEN 8: PROFILE / CALENDAR TRACK */}
              {selectedScreen === 8 && (
                <div className="flex-1 flex flex-col bg-slate-50 overflow-y-auto pb-4 text-slate-800">
                  
                  {/* Account Header with rounded avatar metallic border */}
                  <div className="bg-white border-b border-slate-200 p-4 text-center items-center flex flex-col">
                    <div className="w-12 h-12 rounded-full border-2 border-[#F5C518] bg-[#0A1128] text-[#FFF3B0] flex items-center justify-center font-black text-xs uppercase shadow-md">
                      JD
                    </div>
                    <span className="block font-black text-[#0A1128] text-[12px] leading-tight mt-1.5">John Doe</span>
                    <span className="block text-[8px] text-slate-400">UI Aspirant • Medical Surgery Goals</span>
                  </div>

                  <div className="p-3 space-y-3">
                    
                    {/* Active study calendar day block pattern tracker */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                      <span className="text-[8px] font-black uppercase text-slate-400 inline-block block">28-DAY STUDY MATRIX</span>
                      <div className="grid grid-cols-7 gap-1 bg-slate-100/40 p-2 rounded">
                        {Array.from({ length: 28 }).map((_, i2) => {
                          const activ = i2 % 5 === 0 || i2 % 7 === 1;
                          return (
                            <span 
                              key={i2} 
                              className={`w-4 h-4 rounded-sm block ${activ ? 'bg-[#F5C518]' : 'bg-slate-200'}`} 
                            />
                          );
                        })}
                      </div>
                      <span className="text-[8px] text-slate-500 block">Gold blocks denote completed mock sessions</span>
                    </div>

                    {/* Settings controllers */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5">
                      <span className="text-[8px] font-black uppercase text-indigo-700 tracking-wider">Aspirant Settings</span>
                      <div className="flex justify-between items-center text-[10px]">
                        <div>
                          <span className="font-bold block">Practice Notifications</span>
                          <span className="text-[8px] text-slate-400">At 8:00 AM daily</span>
                        </div>
                        <span className="w-7 h-4 bg-[#1B3A7A] rounded-full p-0.5 flex items-center justify-end"><span className="w-3 h-3 rounded-full bg-white block" /></span>
                      </div>
                    </div>

                    {/* Danger Zones Logout button */}
                    <div className="space-y-1 text-center pt-2">
                      <span className="text-[8px] font-bold text-red-500 tracking-wider block hover:underline">LOGOUT SESSION DEVICE</span>
                      <span className="text-[8px] font-bold text-slate-400 block hover:underline">DELETE ACCOUNT HISTORY</span>
                    </div>

                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: CODE PREVIEW & SPECIFICATIONS */}
        <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          
          {/* Section banner */}
          <div className="bg-slate-100 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h3 className="text-xs font-black text-[#0A1128] uppercase">{currentScreenObj.name}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{currentScreenObj.desc}</p>
            </div>

            <button
              onClick={copyCodeToClipboard}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide border-2 transition shrink-0 ${
                codeCopied 
                  ? 'bg-emerald-500 text-white border-emerald-500' 
                  : 'bg-[#0A1128] text-white border-[#0A1128] hover:bg-[#0A1128]/90'
              }`}
            >
              {codeCopied ? 'Code Copied! ✓' : 'Copy Full TSX Code'}
            </button>
          </div>

          {/* Sub Tab selection */}
          <div className="flex border-b border-cyan-800/10 px-4 bg-slate-50 text-[11px] font-bold text-slate-600">
            <button 
              onClick={() => setActiveCodeTab('code')} 
              className={`py-3 px-4 transition ${activeCodeTab === 'code' ? 'text-indigo-700 border-b-2 border-indigo-700 bg-white font-extrabold' : 'hover:text-slate-900'}`}
            >
              💻 CLEAN TS SCREEN CODE
            </button>
            <button 
              onClick={() => setActiveCodeTab('details')} 
              className={`py-3 px-4 transition ${activeCodeTab === 'details' ? 'text-indigo-700 border-b-2 border-indigo-700 bg-white font-extrabold' : 'hover:text-slate-900'}`}
            >
              🎨 DESIGN HIGHLIGHTS
            </button>
            <button 
              onClick={() => setActiveCodeTab('expo')} 
              className={`py-3 px-4 transition ${activeCodeTab === 'expo' ? 'text-indigo-700 border-b-2 border-indigo-700 bg-white font-extrabold' : 'hover:text-slate-900'}`}
            >
              🚀 EXPO INTEGRATION
            </button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto max-h-[500px]">
            {activeCodeTab === 'code' && (
              <div className="bg-slate-900 text-slate-200 p-4 rounded-xl border border-slate-950 font-mono text-[11px] whitespace-pre overflow-x-auto leading-relaxed select-text">
                {currentScreenObj.code}
              </div>
            )}

            {activeCodeTab === 'details' && (
              <div className="space-y-4 text-slate-700 text-xs leading-relaxed">
                <div className="bg-[#EBF1FA] border-l-4 border-[#1B3A7A] p-3 rounded text-[#0A1128]">
                  <h4 className="font-black text-xs uppercase">SCREEN LAYOUT FOCUS</h4>
                  <p className="mt-1">
                    This screen represents a core page in the student's journey. It follows the **Restraint & Balance** visual system, keeping content panels clean of distractions while utilizing strategic concentric wireframes.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Typography Hierarchy</span>
                    <p className="text-[11px] leading-normal font-sans">
                      - **Header & Display Title**: *Plus Jakarta Sans* (modern, confident geometric feel).<br/>
                      - **Body Paragraphs**: *Inter* (supreme contrast & readability).<br/>
                      - **Timers & Math Numbers**: *JetBrains Mono* (gives technical and clean feedback values).
                    </p>
                  </div>

                  <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-1">
                    <span className="text-[10px] uppercase font-black text-slate-400 block">Touch Responsiveness</span>
                    <p className="text-[11px] leading-normal font-sans">
                      Every interactable choice, multi-select chip, and submit CTA is wrapped in an animated React Native spring component. Users feel custom, subtle scale transitions on press.
                    </p>
                  </div>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Technical Architecture</span>
                  <ul className="list-disc pl-4 text-[11px] space-y-1 text-slate-600">
                    <li>Supports high-gloss embossed badges using soft yellows sparingly.</li>
                    <li>Integrated TypeScript interfaces declare standard types for screen props and state containers.</li>
                    <li>Unified style parameters prevent style leakage and optimize render pipelines.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeCodeTab === 'expo' && (
              <div className="space-y-4 text-slate-700 text-xs leading-relaxed">
                <h4 className="font-black text-xs text-[#0A1128] uppercase">QUICK EXPO BOOTSTRAP GUIDE</h4>
                <p className="text-[11px]">
                  Follow these simple setup instructions to run any of the generated components inside your Expo sandbox environment:
                </p>

                <div className="bg-slate-100 p-3 rounded-lg font-mono text-[10px] text-slate-800 space-y-1">
                  <p className="font-bold text-slate-500"># Install the required packages</p>
                  <p>npx expo install expo-linear-gradient lucide-react-native react-native-webview zustand</p>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl space-y-2 bg-white">
                  <span className="block text-[10px] uppercase font-black text-slate-400">Step 2: Copy & Paste</span>
                  <p className="text-[11px]">
                    Create a file in your project, e.g., <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold text-slate-800">src/components/SabiScreen.tsx</code>, paste the clean TypeScript code, and import it into your main App root. Let Sabi handle the rest!
                  </p>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    );
  }
}

