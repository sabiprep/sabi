import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './app/ThemeProvider';
import { AuthPage, SplashPage, WelcomePage } from './pages/PublicPages';
import './app/app.css';
import './styles/sabi-brand.css';

/**
 * UI Renovation Phase 1:
 * Only the first three screens are active:
 *   1. Screen 1 (`/`): SABI Assembly (`SplashPage`) -> transitions to Screen 2 (`/welcome`)
 *   2. Screen 2 (`/welcome`): SABI Yellow & 3D Purple Wonderland Welcome Screen (`WelcomePage`)
 *   3. Screen 3 (`/auth/*`): SABI Yellow & 3D Purple Wonderland Auth Screen (`AuthPage`)
 *
 * All previous build pages (Onboarding, Student Dashboard, Blitz, Smart Practice, Custom Simulator,
 * Diagnostic, Admin, etc.) have been archived in `/src/archive/old-build-pages/` and deactivated
 * until each screen is rebuilt to match the new SABI Wonderland design identity.
 */
export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          {/* Screen 1: SABI Assembly Splash */}
          <Route path="/" element={<SplashPage />} />

          {/* Screen 2: Welcome to SABI (Uploaded Design 1) */}
          <Route path="/welcome" element={<WelcomePage />} />

          {/* Screen 3: Auth Screen — Create Account / Sign In (Uploaded Design 2) */}
          <Route path="/auth" element={<AuthPage mode="sign-up" />} />
          <Route path="/auth/choice" element={<AuthPage mode="sign-up" />} />
          <Route path="/auth/sign-up" element={<AuthPage mode="sign-up" />} />
          <Route path="/auth/sign-in" element={<AuthPage mode="sign-in" />} />
          <Route path="/auth/verify" element={<AuthPage mode="verify" />} />
          <Route path="/auth/forgot-password" element={<AuthPage mode="forgot-password" />} />

          {/* Any old/deactivated route redirects cleanly to Screen 2 (/welcome) during UI renovation */}
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
