import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Screen1AssembleSplash } from './pages/Screen1AssembleSplash';
import { Screen2WelcomeWonderland } from './pages/Screen2WelcomeWonderland';
import { Screen3AuthWonderland } from './pages/Screen3AuthWonderland';

/**
 * SABI UI Renovation — Phase 1 (Active Build)
 * Only the first 3 renovated screens are active:
 *   - Screen 1 (`/`): SABI Assembly (`Screen1AssembleSplash`) -> transitions directly to Screen 2 (`/welcome`)
 *   - Screen 2 (`/welcome`): SABI Yellow & 3D Purple Wonderland Welcome Screen (`Screen2WelcomeWonderland`)
 *   - Screen 3 (`/auth/*`): SABI Yellow & 3D Purple Wonderland Auth Screen (`Screen3AuthWonderland`)
 *
 * All legacy pages, stylesheets, and components have been moved into `/src/archive/` and unlinked.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Screen 1: Full-Screen SABI Assembly Splash */}
        <Route path="/" element={<Screen1AssembleSplash />} />

        {/* Screen 2: Welcome to SABI (Uploaded Design 1) */}
        <Route path="/welcome" element={<Screen2WelcomeWonderland />} />

        {/* Screen 3: Auth Screen — Create Account / Sign In (Uploaded Design 2) */}
        <Route path="/auth" element={<Screen3AuthWonderland mode="sign-up" />} />
        <Route path="/auth/choice" element={<Screen3AuthWonderland mode="sign-up" />} />
        <Route path="/auth/sign-up" element={<Screen3AuthWonderland mode="sign-up" />} />
        <Route path="/auth/sign-in" element={<Screen3AuthWonderland mode="sign-in" />} />
        <Route path="/auth/verify" element={<Screen3AuthWonderland mode="verify" />} />
        <Route path="/auth/forgot-password" element={<Screen3AuthWonderland mode="forgot-password" />} />

        {/* Redirect any old or unknown path directly to Screen 2 (/welcome) */}
        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
