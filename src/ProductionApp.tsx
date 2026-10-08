import React, { useState, useEffect } from 'react';
import MobileFrame from './components/mobile/MobileFrame';
import MobileHeader from './components/mobile/MobileHeader';
import MobileBottomNav, { MobileTab } from './components/mobile/MobileBottomNav';
import HomeDashboard from './components/mobile/HomeDashboard';
import PracticeHubScreen from './components/mobile/PracticeHubScreen';
import SpeedBlitzScreen from './components/mobile/SpeedBlitzScreen';
import MasteryAnalyticsScreen from './components/mobile/MasteryAnalyticsScreen';
import ProfileSettingsScreen from './components/mobile/ProfileSettingsScreen';
import FullMockExamModal from './components/mobile/FullMockExamModal';
import MobileAITutorModal from './components/mobile/MobileAITutorModal';
import NotificationsSheet from './components/mobile/NotificationsSheet';
import GoalCustomizerModal from './components/mobile/GoalCustomizerModal';
import FormulaCheatSheetModal from './components/mobile/FormulaCheatSheetModal';
import JAMBCalculatorModal from './components/mobile/JAMBCalculatorModal';
import MistakeNotebookModal from './components/mobile/MistakeNotebookModal';
import JAMBResultSlipModal from './components/mobile/JAMBResultSlipModal';
import NovelMasterGuideModal from './components/mobile/NovelMasterGuideModal';
import OralEnglishModal from './components/mobile/OralEnglishModal';
import OfflineIndicator from './components/mobile/OfflineIndicator';
import LeaderboardModal from './components/mobile/LeaderboardModal';
import JAMBBrochureCheckerModal from './components/mobile/JAMBBrochureCheckerModal';
import SyllabusFrequencyHeatmapModal from './components/mobile/SyllabusFrequencyHeatmapModal';
import DailyUTMEChallengeModal from './components/mobile/DailyUTMEChallengeModal';
import { SubjectName, StudentProfile, Question } from './types';
import { sound } from './utils/soundEffects';

export default function ProductionApp() {
  const [currentTab, setCurrentTab] = useState<MobileTab>('home');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sabi_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
    }
    return false; // Default to clean, modern Light Mode
  });
  const [fullWidthMode, setFullWidthMode] = useState<boolean>(false);

  // Student Profile State
  const [profile, setProfile] = useState<StudentProfile>({
    name: 'David Chukwu',
    classLevel: 'SS3',
    attempts: 1,
    chosenSubjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
    targetCourse: 'Medicine & Surgery',
    targetUniversity: 'University of Lagos (UNILAG)',
    monthsUntilExam: 4,
    priorScoreBaseline: 320,
    subjectConfidence: {
      'English Language': 4,
      'Mathematics': 4,
      'Physics': 3,
      'Chemistry': 3,
      'Biology': 3,
      'Agricultural Science': 3,
      'Geography': 3,
      'Economics': 3,
      'Government': 3,
      'History': 3,
      'Commerce': 3,
      'Financial Accounting': 3,
      'Christian Religious Studies': 3,
      'Islamic Religious Studies': 3,
      'Literature-in-English': 3,
      'Music': 3,
      'Fine Art': 3,
      'French': 3,
      'Arabic': 3,
      'Yoruba': 3,
      'Igbo': 3,
      'Hausa': 3,
      'Home Economics': 3,
    },
    struggleTypes: {
      'English Language': 'none',
      'Mathematics': 'time',
      'Physics': 'method',
      'Chemistry': 'careless',
      'Biology': 'none',
      'Agricultural Science': 'none',
      'Geography': 'none',
      'Economics': 'none',
      'Government': 'none',
      'History': 'none',
      'Commerce': 'none',
      'Financial Accounting': 'none',
      'Christian Religious Studies': 'none',
      'Islamic Religious Studies': 'none',
      'Literature-in-English': 'none',
      'Music': 'none',
      'Fine Art': 'none',
      'French': 'none',
      'Arabic': 'none',
      'Yoruba': 'none',
      'Igbo': 'none',
      'Hausa': 'none',
      'Home Economics': 'none',
    },
    studyHabits: 'scheduled',
    dailyStudyHours: '2-3 hours',
    studyEnvironment: 'quiet',
    explanationPreference: 'step-by-step',
    languagePreference: 'english',
    motivation: 'To gain admission to UNILAG for Medicine & Surgery on first attempt.',
    blindSpots: ['Proximity Concord', 'Refraction & Critical Angle'],
    streakCount: 14,
    xpPoints: 1450,
    unlockedSubjectsCount: 4,
    isPremium: true,
    aiCredits: 50,
    topicMemories: {},
    conversationHistory: [],
  });

  // Gamification Counters
  const [streakCount, setStreakCount] = useState<number>(14);
  const [xpPoints, setXpPoints] = useState<number>(1450);

  // Active Target Subject for Practice Drill
  const [activePracticeSubject, setActivePracticeSubject] = useState<SubjectName>('English Language');

  // Modals & Sheets State
  const [isMockExamOpen, setIsMockExamOpen] = useState<boolean>(false);
  const [isAITutorOpen, setIsAITutorOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);
  const [isGoalCustomizerOpen, setIsGoalCustomizerOpen] = useState<boolean>(false);
  const [isCheatSheetOpen, setIsCheatSheetOpen] = useState<boolean>(false);
  const [isMistakeNotebookOpen, setIsMistakeNotebookOpen] = useState<boolean>(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);
  const [isResultSlipOpen, setIsResultSlipOpen] = useState<boolean>(false);
  const [isNovelGuideOpen, setIsNovelGuideOpen] = useState<boolean>(false);
  const [isOralEnglishOpen, setIsOralEnglishOpen] = useState<boolean>(false);
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [isBrochureCheckerOpen, setIsBrochureCheckerOpen] = useState<boolean>(false);
  const [isSyllabusHeatmapOpen, setIsSyllabusHeatmapOpen] = useState<boolean>(false);
  const [isDailyChallengeArenaOpen, setIsDailyChallengeArenaOpen] = useState<boolean>(false);
  const [mockExamResult, setMockExamResult] = useState<{
    totalScore: number;
    subjects: { name: string; score: number; maxScore: number }[];
  } | undefined>(undefined);

  const [aiTutorSubject, setAiTutorSubject] = useState<SubjectName>('Physics');
  const [aiTutorTopic, setAiTutorTopic] = useState<string>('Waves & Optics');

  // Sync dark mode class on document element and persist preference
  useEffect(() => {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('sabi_theme', 'dark');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0B0F19');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('sabi_theme', 'light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#FFFFFF');
    }
  }, [darkMode]);

  const handleAddXP = (amount: number) => {
    setXpPoints(prev => prev + amount);
  };

  const handleStartSubjectPractice = (subject: SubjectName) => {
    sound.playTap();
    setActivePracticeSubject(subject);
    setCurrentTab('practice');
  };

  const handleOpenAITutor = (subject?: SubjectName, topic?: string) => {
    sound.playTap();
    if (subject) setAiTutorSubject(subject);
    if (topic) setAiTutorTopic(topic);
    setIsAITutorOpen(true);
  };

  const handleSaveProfile = (updated: Partial<StudentProfile>) => {
    sound.playCorrect();
    setProfile(prev => ({
      ...prev,
      ...updated,
    }));
  };

  const handleResetData = () => {
    sound.playTap();
    setXpPoints(100);
    setStreakCount(1);
    setCurrentTab('home');
  };

  const handleTabChange = (tab: MobileTab) => {
    sound.playTap();
    setCurrentTab(tab);
  };

  return (
    <MobileFrame
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      fullWidthMode={fullWidthMode}
      setFullWidthMode={setFullWidthMode}
      onOpenAIModal={() => handleOpenAITutor()}
    >
      {/* Mobile Top Header (Present across tabs) */}
      <MobileHeader
        profile={profile}
        streakCount={streakCount}
        xpPoints={xpPoints}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(d => !d)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenProfile={() => setCurrentTab('profile')}
        onOpenLeaderboard={() => {
          sound.playTap();
          setIsLeaderboardOpen(true);
        }}
      />

      {/* Screen Views based on Active Mobile Tab */}
      <div className="flex-1 flex flex-col">
        {currentTab === 'home' && (
          <HomeDashboard
            profile={profile}
            onNavigateToTab={handleTabChange}
            onStartSubjectPractice={handleStartSubjectPractice}
            onStartMockExam={() => {
              sound.playTap();
              setIsMockExamOpen(true);
            }}
            onOpenAITutor={handleOpenAITutor}
            onAddXP={handleAddXP}
            onOpenPastQuestions={() => handleTabChange('practice')}
            onOpenCheatSheet={() => {
              sound.playTap();
              setIsCheatSheetOpen(true);
            }}
            onOpenMistakeNotebook={() => {
              sound.playTap();
              setIsMistakeNotebookOpen(true);
            }}
            onOpenCalculator={() => {
              sound.playTap();
              setIsCalculatorOpen(true);
            }}
            onOpenNovelGuide={() => {
              sound.playTap();
              setIsNovelGuideOpen(true);
            }}
            onOpenResultSlip={() => {
              sound.playTap();
              setIsResultSlipOpen(true);
            }}
            onOpenOralEnglish={() => {
              sound.playTap();
              setIsOralEnglishOpen(true);
            }}
            onOpenBrochureChecker={() => {
              sound.playTap();
              setIsBrochureCheckerOpen(true);
            }}
            onOpenSyllabusHeatmap={() => {
              sound.playTap();
              setIsSyllabusHeatmapOpen(true);
            }}
            onOpenDailyChallengeArena={() => {
              sound.playTap();
              setIsDailyChallengeArenaOpen(true);
            }}
            onOpenLeaderboard={() => {
              sound.playTap();
              setIsLeaderboardOpen(true);
            }}
          />
        )}

        {currentTab === 'practice' && (
          <PracticeHubScreen
            initialSubject={activePracticeSubject}
            onOpenAITutor={(subj, topic) => handleOpenAITutor(subj, topic)}
            onAddXP={handleAddXP}
          />
        )}

        {currentTab === 'blitz' && (
          <SpeedBlitzScreen onAddXP={handleAddXP} />
        )}

        {currentTab === 'mastery' && (
          <MasteryAnalyticsScreen
            onStartTopicPractice={(subj, topic) => {
              sound.playTap();
              setActivePracticeSubject(subj);
              setCurrentTab('practice');
            }}
          />
        )}

        {currentTab === 'profile' && (
          <ProfileSettingsScreen
            profile={profile}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(d => !d)}
            onResetData={handleResetData}
            onOpenGoalCustomizer={() => {
              sound.playTap();
              setIsGoalCustomizerOpen(true);
            }}
          />
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <MobileBottomNav
        currentTab={currentTab}
        onChangeTab={handleTabChange}
      />

      {/* Full Mock CBT Exam Simulator Modal */}
      <FullMockExamModal
        isOpen={isMockExamOpen}
        onClose={() => setIsMockExamOpen(false)}
        onAddXP={handleAddXP}
        onOpenResultSlip={(res) => {
          setMockExamResult(res);
          setIsResultSlipOpen(true);
        }}
      />

      {/* Sabi AI Tutor Doubt Solver Drawer/Modal */}
      <MobileAITutorModal
        isOpen={isAITutorOpen}
        onClose={() => setIsAITutorOpen(false)}
        initialSubject={aiTutorSubject}
        initialTopic={aiTutorTopic}
      />

      {/* Notifications Drawer */}
      <NotificationsSheet
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onActionClick={action => {
          if (action === 'practice' || action === 'mastery') {
            handleTabChange(action as MobileTab);
          }
        }}
      />

      {/* Academic Goal Customizer */}
      <GoalCustomizerModal
        isOpen={isGoalCustomizerOpen}
        onClose={() => setIsGoalCustomizerOpen(false)}
        profile={profile}
        onSaveProfile={handleSaveProfile}
      />

      {/* Formula & Rules Cheat Sheet Modal */}
      <FormulaCheatSheetModal
        isOpen={isCheatSheetOpen}
        onClose={() => setIsCheatSheetOpen(false)}
      />

      {/* Official JAMB CBT 8-Digit Basic Calculator */}
      <JAMBCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

      {/* Mistake Notebook / Review Queue Modal */}
      <MistakeNotebookModal
        isOpen={isMistakeNotebookOpen}
        onClose={() => setIsMistakeNotebookOpen(false)}
        onStartRetest={(questions: Question[]) => {
          if (questions.length > 0) {
            setActivePracticeSubject(questions[0].subject);
            setCurrentTab('practice');
          }
        }}
        onOpenAITutor={(subj, topic) => handleOpenAITutor(subj, topic)}
      />

      {/* Official JAMB Mock Result Slip & Certificate */}
      <JAMBResultSlipModal
        isOpen={isResultSlipOpen}
        onClose={() => setIsResultSlipOpen(false)}
        profile={profile}
        mockResult={mockExamResult}
      />

      {/* JAMB Compulsory Novel Master Guide: The Life Changer */}
      <NovelMasterGuideModal
        isOpen={isNovelGuideOpen}
        onClose={() => setIsNovelGuideOpen(false)}
        onAddXP={handleAddXP}
      />

      {/* Oral English & Phonetics Drill */}
      <OralEnglishModal
        isOpen={isOralEnglishOpen}
        onClose={() => setIsOralEnglishOpen(false)}
        onAddXP={handleAddXP}
      />

      {/* Peer Leaderboard & Standings Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserXP={xpPoints}
        currentUserStreak={streakCount}
      />

      {/* JAMB CAPS Brochure Advisor & Subject Combination Validator */}
      <JAMBBrochureCheckerModal
        isOpen={isBrochureCheckerOpen}
        onClose={() => setIsBrochureCheckerOpen(false)}
        profile={profile}
        onUpdateProfileSubjects={(subjects, course, university) => {
          setProfile(prev => ({
            ...prev,
            chosenSubjects: subjects,
            ...(course ? { targetCourse: course } : {}),
            ...(university ? { targetUniversity: university } : {}),
          }));
        }}
      />

      {/* Syllabus Frequency Heatmap & Weightings Modal */}
      <SyllabusFrequencyHeatmapModal
        isOpen={isSyllabusHeatmapOpen}
        onClose={() => setIsSyllabusHeatmapOpen(false)}
        onStartTopicPractice={(subj, topic) => {
          setActivePracticeSubject(subj);
          setCurrentTab('practice');
        }}
      />

      {/* Daily 5-Min UTME Challenge Arena Sprint */}
      <DailyUTMEChallengeModal
        isOpen={isDailyChallengeArenaOpen}
        onClose={() => setIsDailyChallengeArenaOpen(false)}
        profile={profile}
        onAddXP={handleAddXP}
        onOpenLeaderboard={() => {
          sound.playTap();
          setIsLeaderboardOpen(true);
        }}
      />

      {/* Network Connectivity Offline Toast */}
      <OfflineIndicator />
    </MobileFrame>
  );
}
