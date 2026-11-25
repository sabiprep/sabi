import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Screen1AssembleSplash } from './pages/Screen1AssembleSplash';
import { Screen2WelcomeWonderland } from './pages/Screen2WelcomeWonderland';
import { Screen3AuthWonderland } from './pages/Screen3AuthWonderland';
import { Screen4OnboardingWonderland } from './pages/Screen4OnboardingWonderland';
import { Screen5HomeWonderland } from './pages/Screen5HomeWonderland';
import { Screen6SmartPracticeHubWonderland } from './pages/Screen6SmartPracticeHubWonderland';
import { Screen7ProgressWonderland } from './pages/Screen7ProgressWonderland';
import { Screen8SmartPracticeFeedWonderland } from './pages/Screen8SmartPracticeFeedWonderland';
import { Screen9SmartPracticeResultsWonderland } from './pages/Screen9SmartPracticeResultsWonderland';
import { Screen10PracticeSettingsWonderland } from './pages/Screen10PracticeSettingsWonderland';
import { Screen11AccountProfileWonderland } from './pages/Screen11AccountProfileWonderland';
import { Screen12SubscriptionsWonderland } from './pages/Screen12SubscriptionsWonderland';
import { WonderlandComingNextScreen } from './pages/WonderlandComingNextScreen';

/**
 * SABI UI Renovation — Active Build
 * Active renovated Wonderland screens:
 *   - Screen 1 (`/`): SABI Assembly (`Screen1AssembleSplash`) -> transitions directly to Screen 2 (`/welcome`)
 *   - Screen 2 (`/welcome`): SABI Yellow & 3D Purple Wonderland Welcome Screen (`Screen2WelcomeWonderland`)
 *   - Screen 3 (`/auth/*`): SABI Yellow & 3D Purple Wonderland Auth Screen (`Screen3AuthWonderland`)
 *   - Screen 4 (`/onboarding` & `/onboarding/:step`): Wonderland Onboarding (`Screen4OnboardingWonderland`)
 *   - Screen 5 (`/home`): JAMB Prep Home Dashboard (`Screen5HomeWonderland`)
 *   - Screen 6 (`/practice`): Smart Practice Hub — Guided & Blitz Directory (`Screen6SmartPracticeHubWonderland`)
 *   - Screen 7 (`/progress`): Your Progress, Streaks & Gold League (`Screen7ProgressWonderland`)
 *   - Screen 8 (`/practice/session`): Smart Practice Live Feed — Blitz & Guided + Checkpoint
 *   - Screen 9 (`/practice/results`): Smart Practice Results & Next Best Step
 *   - Screen 10 (`/settings/practice`): SABI AI Practice Studio (`Screen10PracticeSettingsWonderland`)
 *   - Screen 11 (`/profile`): Account & Profile (`Screen11AccountProfileWonderland`)
 *   - Screen 12 (`/subscriptions`): Subscriptions & AI Credits (`Screen12SubscriptionsWonderland`)
 *
 * All legacy pages, stylesheets, and components remain archived inside `/src/archive/`.
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

        {/* Screen 6: Smart Practice Hub (Guided Session & Blitz Directory) */}
        <Route path="/practice" element={<Screen6SmartPracticeHubWonderland />} />
        <Route path="/practice/smart" element={<Screen6SmartPracticeHubWonderland />} />
        <Route path="/practice/blitz" element={<Screen6SmartPracticeHubWonderland />} />

        {/* Screen 8: Smart Practice Live Feed — Blitz & Guided + 10-Question Checkpoint */}
        <Route path="/practice/session" element={<Screen8SmartPracticeFeedWonderland />} />

        {/* Screen 9: Smart Practice Results & Next Best Step */}
        <Route path="/practice/results" element={<Screen9SmartPracticeResultsWonderland />} />

        {/* Screen 7: Progress, Streaks & Gold League */}
        <Route path="/progress" element={<Screen7ProgressWonderland />} />

        {/* Upcoming Next-Batch Surfaces (Clean Wonderland Shells — No Dead Links) */}
        <Route
          path="/cbt"
          element={
            <WonderlandComingNextScreen
              tab="cbt"
              title="CBT Simulator"
              subtitle="Full 180-question & 40-question real exam timer."
              detail="The renovated CBT Simulator screens will be wired here as soon as you send the next UI batch."
              icon="cbt"
            />
          }
        />
        <Route
          path="/practice/custom"
          element={
            <WonderlandComingNextScreen
              tab="practice"
              title="Custom Practice"
              subtitle="Choose your exact subjects, topics, and question count."
              detail="The renovated Custom Practice setup screen will be wired here as soon as you send the next UI batch."
              icon="custom"
            />
          }
        />
        {/* Screen 10: SABI AI Practice Studio (Practice Configuration & AI Auto-Structure) */}
        <Route path="/settings/practice" element={<Screen10PracticeSettingsWonderland />} />
        <Route path="/settings" element={<Navigate to="/settings/practice" replace />} />

        {/* Screen 11: Account & Profile */}
        <Route path="/profile" element={<Screen11AccountProfileWonderland />} />

        {/* Screen 12: Subscriptions & AI Credits */}
        <Route path="/subscriptions" element={<Screen12SubscriptionsWonderland />} />

        {/* Redirect any old or unknown path directly to Screen 2 (/welcome) */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
