import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, PublicOnlyAuthRoute, RequireAuthRoute } from './context/AuthContext';
import { Screen1AssembleSplash } from './pages/Screen1AssembleSplash';
import { Screen2WelcomeWonderland } from './pages/Screen2WelcomeWonderland';
import { Screen3AuthWonderland } from './pages/Screen3AuthWonderland';
import { Screen4OnboardingWonderland } from './pages/Screen4OnboardingWonderland';
import { Screen5HomeWonderland } from './pages/Screen5HomeWonderland';
import { Screen6SmartPracticeHubWonderland } from './pages/Screen6SmartPracticeHubWonderland';
import { Screen6bPracticeScopeSetupWonderland } from './pages/Screen6bPracticeScopeSetupWonderland';
import { Screen7ProgressWonderland } from './pages/Screen7ProgressWonderland';
import { Screen7aStreakWonderland } from './pages/Screen7aStreakWonderland';
import { Screen7bLeagueWonderland } from './pages/Screen7bLeagueWonderland';
import { Screen7cSubjectRatingsWonderland } from './pages/Screen7cSubjectRatingsWonderland';
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
import { Screen23SabiAssistantWonderland } from './pages/Screen23SabiAssistantWonderland';
import { Screen24SharedQuestionWonderland } from './pages/Screen24SharedQuestionWonderland';

/**
 * SABI JAMB UTME CBT — Production Wonderland UI Build
 * All authenticated screens are protected by real Supabase session verification
 * and server-backed profile hydration across Desktop WebApp and Capacitor Android APK.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Screen 1: Full-Screen SABI Assembly Splash */}
          <Route path="/" element={<Screen1AssembleSplash />} />

          {/* Screen 2: Welcome to SABI (auto-routes signed-in candidates to /home) */}
          <Route
            path="/welcome"
            element={
              <PublicOnlyAuthRoute>
                <Screen2WelcomeWonderland />
              </PublicOnlyAuthRoute>
            }
          />

          {/* Screen 3: Auth Screen — Create Account / Sign In / Verify / Forgot Password */}
          <Route
            path="/auth"
            element={
              <PublicOnlyAuthRoute>
                <Screen3AuthWonderland mode="sign-up" />
              </PublicOnlyAuthRoute>
            }
          />
          <Route
            path="/auth/choice"
            element={
              <PublicOnlyAuthRoute>
                <Screen3AuthWonderland mode="sign-up" />
              </PublicOnlyAuthRoute>
            }
          />
          <Route
            path="/auth/sign-up"
            element={
              <PublicOnlyAuthRoute>
                <Screen3AuthWonderland mode="sign-up" />
              </PublicOnlyAuthRoute>
            }
          />
          <Route
            path="/auth/sign-in"
            element={
              <PublicOnlyAuthRoute>
                <Screen3AuthWonderland mode="sign-in" />
              </PublicOnlyAuthRoute>
            }
          />
          <Route path="/auth/verify" element={<Screen3AuthWonderland mode="verify" />} />
          <Route
            path="/auth/forgot-password"
            element={<Screen3AuthWonderland mode="forgot-password" />}
          />

          {/* Screen 4: Wonderland Onboarding Flow (Protected; does not require prior onboarding) */}
          <Route
            path="/onboarding"
            element={
              <RequireAuthRoute requireOnboarding={false}>
                <Navigate to="/onboarding/1" replace />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/onboarding/:step"
            element={
              <RequireAuthRoute requireOnboarding={false}>
                <Screen4OnboardingWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 5: JAMB Prep Home Dashboard */}
          <Route
            path="/home"
            element={
              <RequireAuthRoute>
                <Screen5HomeWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 6 & 6B: Practice Hub & Pre-Session Subject Scope Setup */}
          <Route
            path="/practice"
            element={
              <RequireAuthRoute>
                <Screen6SmartPracticeHubWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/practice/smart"
            element={
              <RequireAuthRoute>
                <Screen6SmartPracticeHubWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/practice/blitz"
            element={
              <RequireAuthRoute>
                <Screen6SmartPracticeHubWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/practice/setup"
            element={
              <RequireAuthRoute>
                <Screen6bPracticeScopeSetupWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 8 & 9: Smart Practice Live Feed (Blitz & Smart Practice + Checkpoint) & Results */}
          <Route
            path="/practice/session"
            element={
              <RequireAuthRoute>
                <Screen8SmartPracticeFeedWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/practice/results"
            element={
              <RequireAuthRoute>
                <Screen9SmartPracticeResultsWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 16 & 17: Custom Practice Dashboard & Live Runner */}
          <Route
            path="/practice/custom"
            element={
              <RequireAuthRoute>
                <Screen16CustomPracticeHubWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/practice/custom/session"
            element={
              <RequireAuthRoute>
                <Screen17CustomPracticeSessionWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 13, 14 & 15: Strict CBT Simulator Dashboard, Exam Hall & Script Review */}
          <Route
            path="/cbt"
            element={
              <RequireAuthRoute>
                <Screen13CbtHubWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/cbt/exam"
            element={
              <RequireAuthRoute>
                <Screen14CbtExamWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/cbt/results"
            element={
              <RequireAuthRoute>
                <Screen15CbtResultsWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 7 & 7A-C: Expanded Progress Hub, My Streak, Multi-Tier Leagues & Subject Performance Ratings */}
          <Route
            path="/progress"
            element={
              <RequireAuthRoute>
                <Screen7ProgressWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/progress/streak"
            element={
              <RequireAuthRoute>
                <Screen7aStreakWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/progress/league"
            element={
              <RequireAuthRoute>
                <Screen7bLeagueWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/progress/subjects"
            element={
              <RequireAuthRoute>
                <Screen7cSubjectRatingsWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 10, 11 & 12: 3-Dash Menu Studio (AI Practice Studio, Account Profile, Subscriptions) */}
          <Route
            path="/settings/practice"
            element={
              <RequireAuthRoute>
                <Screen10PracticeSettingsWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuthRoute>
                <Navigate to="/settings/practice" replace />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuthRoute requireOnboarding={false}>
                <Screen11AccountProfileWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <RequireAuthRoute>
                <Screen12SubscriptionsWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 18–23: Diagnostic, Subjects & Syllabus, Weak Areas, Mistakes Vault, Notifications, Assistant */}
          <Route
            path="/diagnostic"
            element={
              <RequireAuthRoute>
                <Screen18DiagnosticWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/subjects"
            element={
              <RequireAuthRoute>
                <Screen19SubjectsWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/recommendations"
            element={
              <RequireAuthRoute>
                <Screen20RecommendationsWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/mistakes"
            element={
              <RequireAuthRoute>
                <Screen21MistakesVaultWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <RequireAuthRoute>
                <Screen22NotificationsWonderland />
              </RequireAuthRoute>
            }
          />
          <Route
            path="/assistant"
            element={
              <RequireAuthRoute>
                <Screen23SabiAssistantWonderland />
              </RequireAuthRoute>
            }
          />

          {/* Screen 24: Public Standalone Shared Question Landing View (No login wall before attempting) */}
          <Route path="/q/:questionId" element={<Screen24SharedQuestionWonderland />} />

          {/* Redirect any unknown path cleanly to Screen 2 (/welcome) */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
