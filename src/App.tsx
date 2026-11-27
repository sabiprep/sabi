import React, { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, PublicOnlyAuthRoute, RequireAuthRoute } from './context/AuthContext';
import { Screen1AssembleSplash } from './pages/Screen1AssembleSplash';
import { Screen2WelcomeWonderland } from './pages/Screen2WelcomeWonderland';
import { Screen3AuthWonderland } from './pages/Screen3AuthWonderland';
import { Screen5HomeWonderland } from './pages/Screen5HomeWonderland';

// Route-level code splitting keeps startup fast on Android APK WebView and Desktop Web
const Screen4OnboardingWonderland = lazy(() =>
  import('./pages/Screen4OnboardingWonderland').then((m) => ({
    default: m.Screen4OnboardingWonderland,
  }))
);
const Screen6SmartPracticeHubWonderland = lazy(() =>
  import('./pages/Screen6SmartPracticeHubWonderland').then((m) => ({
    default: m.Screen6SmartPracticeHubWonderland,
  }))
);
const Screen6bPracticeScopeSetupWonderland = lazy(() =>
  import('./pages/Screen6bPracticeScopeSetupWonderland').then((m) => ({
    default: m.Screen6bPracticeScopeSetupWonderland,
  }))
);
const Screen7ProgressWonderland = lazy(() =>
  import('./pages/Screen7ProgressWonderland').then((m) => ({
    default: m.Screen7ProgressWonderland,
  }))
);
const Screen7aStreakWonderland = lazy(() =>
  import('./pages/Screen7aStreakWonderland').then((m) => ({
    default: m.Screen7aStreakWonderland,
  }))
);
const Screen7bLeagueWonderland = lazy(() =>
  import('./pages/Screen7bLeagueWonderland').then((m) => ({
    default: m.Screen7bLeagueWonderland,
  }))
);
const Screen7cSubjectRatingsWonderland = lazy(() =>
  import('./pages/Screen7cSubjectRatingsWonderland').then((m) => ({
    default: m.Screen7cSubjectRatingsWonderland,
  }))
);
const Screen8SmartPracticeFeedWonderland = lazy(() =>
  import('./pages/Screen8SmartPracticeFeedWonderland').then((m) => ({
    default: m.Screen8SmartPracticeFeedWonderland,
  }))
);
const Screen9SmartPracticeResultsWonderland = lazy(() =>
  import('./pages/Screen9SmartPracticeResultsWonderland').then((m) => ({
    default: m.Screen9SmartPracticeResultsWonderland,
  }))
);
const Screen10PracticeSettingsWonderland = lazy(() =>
  import('./pages/Screen10PracticeSettingsWonderland').then((m) => ({
    default: m.Screen10PracticeSettingsWonderland,
  }))
);
const Screen11AccountProfileWonderland = lazy(() =>
  import('./pages/Screen11AccountProfileWonderland').then((m) => ({
    default: m.Screen11AccountProfileWonderland,
  }))
);
const Screen12SubscriptionsWonderland = lazy(() =>
  import('./pages/Screen12SubscriptionsWonderland').then((m) => ({
    default: m.Screen12SubscriptionsWonderland,
  }))
);
const Screen13CbtHubWonderland = lazy(() =>
  import('./pages/Screen13CbtHubWonderland').then((m) => ({
    default: m.Screen13CbtHubWonderland,
  }))
);
const Screen14CbtExamWonderland = lazy(() =>
  import('./pages/Screen14CbtExamWonderland').then((m) => ({
    default: m.Screen14CbtExamWonderland,
  }))
);
const Screen15CbtResultsWonderland = lazy(() =>
  import('./pages/Screen15CbtResultsWonderland').then((m) => ({
    default: m.Screen15CbtResultsWonderland,
  }))
);
const Screen16CustomPracticeHubWonderland = lazy(() =>
  import('./pages/Screen16CustomPracticeHubWonderland').then((m) => ({
    default: m.Screen16CustomPracticeHubWonderland,
  }))
);
const Screen17CustomPracticeSessionWonderland = lazy(() =>
  import('./pages/Screen17CustomPracticeSessionWonderland').then((m) => ({
    default: m.Screen17CustomPracticeSessionWonderland,
  }))
);
const Screen18DiagnosticWonderland = lazy(() =>
  import('./pages/Screen18DiagnosticWonderland').then((m) => ({
    default: m.Screen18DiagnosticWonderland,
  }))
);
const Screen19SubjectsWonderland = lazy(() =>
  import('./pages/Screen19SubjectsWonderland').then((m) => ({
    default: m.Screen19SubjectsWonderland,
  }))
);
const Screen20RecommendationsWonderland = lazy(() =>
  import('./pages/Screen20RecommendationsWonderland').then((m) => ({
    default: m.Screen20RecommendationsWonderland,
  }))
);
const Screen21MistakesVaultWonderland = lazy(() =>
  import('./pages/Screen21MistakesVaultWonderland').then((m) => ({
    default: m.Screen21MistakesVaultWonderland,
  }))
);
const Screen22NotificationsWonderland = lazy(() =>
  import('./pages/Screen22NotificationsWonderland').then((m) => ({
    default: m.Screen22NotificationsWonderland,
  }))
);
const Screen23SabiAssistantWonderland = lazy(() =>
  import('./pages/Screen23SabiAssistantWonderland').then((m) => ({
    default: m.Screen23SabiAssistantWonderland,
  }))
);
const Screen24SharedQuestionWonderland = lazy(() =>
  import('./pages/Screen24SharedQuestionWonderland').then((m) => ({
    default: m.Screen24SharedQuestionWonderland,
  }))
);

function SabiRouteFallback() {
  return (
    <div
      className="min-h-[100dvh] w-full flex flex-col items-center justify-center bg-[#FFE824] text-[#260559] px-6 select-none"
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 60%, #FFE014 100%)',
      }}
      aria-busy="true"
      aria-label="Loading screen"
    >
      <div
        className="w-12 h-12 rounded-2xl bg-[#6C19E5] flex items-center justify-center animate-pulse"
        style={{ boxShadow: '0 4px 0 #46099E' }}
      >
        <div className="w-5 h-5 rounded-full border-[3px] border-[#FFE824] border-t-transparent animate-spin" />
      </div>
    </div>
  );
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class SabiErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[SABI] UI render boundary caught error:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-[100dvh] w-full flex items-center justify-center bg-[#FFE824] text-[#260559] px-5"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <div
            className="w-full max-w-[420px] rounded-[26px] bg-white p-6 text-center space-y-4"
            style={{ boxShadow: '0 6px 0 #E2C700' }}
          >
            <h1
              className="text-[24px] font-bold text-[#260559]"
              style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
            >
              Small hiccup — your progress is safe
            </h1>
            <p className="text-[14px] font-semibold text-[#5A467A] leading-relaxed">
              Something interrupted this screen. Tap below to refresh SABI right back to where you
              stopped.
            </p>
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full py-3.5 rounded-[16px] bg-[#6C19E5] text-white font-extrabold text-[15px] uppercase tracking-wide cursor-pointer"
                style={{ boxShadow: '0 4px 0 #46099E' }}
              >
                Reload SABI
              </button>
              <button
                type="button"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.assign('/home');
                }}
                className="w-full py-3 rounded-[16px] bg-[#F3EEFD] text-[#260559] font-extrabold text-[14px] cursor-pointer"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * SABI JAMB UTME CBT — Production Wonderland UI Build
 * All authenticated screens are protected by real Supabase session verification
 * and server-backed profile hydration across Desktop WebApp and Capacitor Android APK.
 */
export default function App() {
  return (
    <SabiErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<SabiRouteFallback />}>
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
              <Route path="/auth/callback" element={<Screen3AuthWonderland mode="verify" />} />
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
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </SabiErrorBoundary>
  );
}
