import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Screen1AssembleSplash } from './pages/Screen1AssembleSplash';
import { Screen2WelcomeWonderland } from './pages/Screen2WelcomeWonderland';
import { Screen3AuthWonderland } from './pages/Screen3AuthWonderland';
import { Screen4OnboardingWonderland } from './pages/Screen4OnboardingWonderland';
import { Screen5HomeWonderland } from './pages/Screen5HomeWonderland';
import { Screen6SmartPracticeHubWonderland } from './pages/Screen6SmartPracticeHubWonderland';
import { Screen6bPracticeScopeSetupWonderland } from './pages/Screen6bPracticeScopeSetupWonderland';
import { Screen7ProgressWonderland } from './pages/Screen7ProgressWonderland';
import { Screen8SmartPracticeFeedWonderland } from './pages/Screen8SmartPracticeFeedWonderland';
import { Screen9SmartPracticeResultsWonderland } from './pages/Screen9SmartPracticeResultsWonderland';
import { Screen10PracticeSettingsWonderland } from './pages/Screen10PracticeSettingsWonderland';
import { Screen11AccountProfileWonderland } from './pages/Screen11AccountProfileWonderland';
import { Screen12SubscriptionsWonderland } from './pages/Screen12SubscriptionsWonderland';
import { Screen13CbtHubWonderland } from './pages/Screen13CbtHubWonderland';
import { Screen14CbtExamWonderland } from './pages/Screen14CbtExamWonderland';
import { Screen15CbtResultsWonderland } from './pages/Screen15CbtResultsWonderland';
import { Screen16CustomPracticeHubWonderland } from './pages/Screen16CustomPracticeHubWonderland';
import { Screen17CustomPracticeSessionWonderland } from './pages/Screen17CustomPracticeSessionWonderland';
import { Screen18DiagnosticWonderland } from './pages/Screen18DiagnosticWonderland';
import { Screen19SubjectsWonderland } from './pages/Screen19SubjectsWonderland';
import { Screen20RecommendationsWonderland } from './pages/Screen20RecommendationsWonderland';
import { Screen21MistakesVaultWonderland } from './pages/Screen21MistakesVaultWonderland';
import { Screen22NotificationsWonderland } from './pages/Screen22NotificationsWonderland';

/**
 * SABI JAMB UTME CBT — Complete Wonderland UI Build
 * All 15+ screens from `sabi-main-doc.md` live in the unified SABI Wonderland UI
 * across Desktop WebApp and Capacitor Android APK.
 * Legacy screens remain isolated in `/src/archive/`.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Screen 1: Full-Screen SABI Assembly Splash */}
        <Route path="/" element={<Screen1AssembleSplash />} />

        {/* Screen 2: Welcome to SABI */}
        <Route path="/welcome" element={<Screen2WelcomeWonderland />} />

        {/* Screen 3: Auth Screen — Create Account / Sign In / Verify / Forgot Password */}
        <Route path="/auth" element={<Screen3AuthWonderland mode="sign-up" />} />
        <Route path="/auth/choice" element={<Screen3AuthWonderland mode="sign-up" />} />
        <Route path="/auth/sign-up" element={<Screen3AuthWonderland mode="sign-up" />} />
        <Route path="/auth/sign-in" element={<Screen3AuthWonderland mode="sign-in" />} />
        <Route path="/auth/verify" element={<Screen3AuthWonderland mode="verify" />} />
        <Route path="/auth/forgot-password" element={<Screen3AuthWonderland mode="forgot-password" />} />

        {/* Screen 4: Wonderland Onboarding Flow (10 Active Questions) */}
        <Route path="/onboarding" element={<Navigate to="/onboarding/1" replace />} />
        <Route path="/onboarding/:step" element={<Screen4OnboardingWonderland />} />

        {/* Screen 5: JAMB Prep Home Dashboard */}
        <Route path="/home" element={<Screen5HomeWonderland />} />

        {/* Screen 6 & 6B: Practice Hub & Pre-Session Subject Scope Setup */}
        <Route path="/practice" element={<Screen6SmartPracticeHubWonderland />} />
        <Route path="/practice/smart" element={<Screen6SmartPracticeHubWonderland />} />
        <Route path="/practice/blitz" element={<Screen6SmartPracticeHubWonderland />} />
        <Route path="/practice/setup" element={<Screen6bPracticeScopeSetupWonderland />} />

        {/* Screen 8 & 9: Smart Practice Live Feed (Blitz & Smart Practice + Checkpoint) & Results */}
        <Route path="/practice/session" element={<Screen8SmartPracticeFeedWonderland />} />
        <Route path="/practice/results" element={<Screen9SmartPracticeResultsWonderland />} />

        {/* Screen 16 & 17: Custom Practice Dashboard & Live Runner */}
        <Route path="/practice/custom" element={<Screen16CustomPracticeHubWonderland />} />
        <Route path="/practice/custom/session" element={<Screen17CustomPracticeSessionWonderland />} />

        {/* Screen 13, 14 & 15: Strict CBT Simulator Dashboard, Exam Hall & Script Review */}
        <Route path="/cbt" element={<Screen13CbtHubWonderland />} />
        <Route path="/cbt/exam" element={<Screen14CbtExamWonderland />} />
        <Route path="/cbt/results" element={<Screen15CbtResultsWonderland />} />

        {/* Screen 7: Progress, Streaks & Gold League */}
        <Route path="/progress" element={<Screen7ProgressWonderland />} />

        {/* Screen 10, 11 & 12: 3-Dash Menu Studio (AI Practice Studio, Account Profile, Subscriptions) */}
        <Route path="/settings/practice" element={<Screen10PracticeSettingsWonderland />} />
        <Route path="/settings" element={<Navigate to="/settings/practice" replace />} />
        <Route path="/profile" element={<Screen11AccountProfileWonderland />} />
        <Route path="/subscriptions" element={<Screen12SubscriptionsWonderland />} />

        {/* Screen 18–22: Diagnostic, Subjects & Syllabus, Weak Areas, Mistakes Vault, Notifications */}
        <Route path="/diagnostic" element={<Screen18DiagnosticWonderland />} />
        <Route path="/subjects" element={<Screen19SubjectsWonderland />} />
        <Route path="/recommendations" element={<Screen20RecommendationsWonderland />} />
        <Route path="/mistakes" element={<Screen21MistakesVaultWonderland />} />
        <Route path="/notifications" element={<Screen22NotificationsWonderland />} />

        {/* Redirect any unknown path cleanly to Screen 2 (/welcome) */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
