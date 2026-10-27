import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from './app/ThemeProvider';
import { AuthPage, SplashPage, WelcomePage } from './pages/PublicPages';
import './app/app.css';

const MascotsGalleryPage = lazy(() => import('./pages/MascotsGalleryPage').then(module => ({ default: module.MascotsGalleryPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(module => ({ default: module.OnboardingPage })));
const DiagnosticPage = lazy(() => import('./pages/DiagnosticPage').then(module => ({ default: module.DiagnosticPage })));
const BlitzPage = lazy(() => import('./pages/BlitzPage').then(module => ({ default: module.BlitzPage })));
const SmartPracticePage = lazy(() => import('./pages/SmartPracticePage').then(module => ({ default: module.SmartPracticePage })));
const AppShell = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.AppShell })));
const HomePage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.HomePage })));
const MainPage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.MainPage })));
const PracticePage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.PracticePage })));
const CbtPage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.CbtPage })));
const ProgressPage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.ProgressPage })));
const ProfilePage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.ProfilePage })));
const NotificationsPage = lazy(() => import('./pages/StudentPages').then(module => ({ default: module.NotificationsPage })));

function PageLoading() {
  return <main className="page-loading" aria-live="polite"><span className="splash-loader" /><span>Loading SABI preview…</span></main>;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<SplashPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/auth" element={<AuthPage mode="choice" />} />
            <Route path="/auth/choice" element={<AuthPage mode="choice" />} />
            <Route path="/auth/sign-up" element={<AuthPage mode="sign-up" />} />
            <Route path="/auth/sign-in" element={<AuthPage mode="sign-in" />} />
            <Route path="/auth/verify" element={<AuthPage mode="verify" />} />
            <Route path="/auth/forgot-password" element={<AuthPage mode="forgot-password" />} />
            <Route path="/mascots" element={<MascotsGalleryPage />} />
            <Route path="/onboarding/:step" element={<OnboardingPage />} />
            <Route path="/diagnostic" element={<DiagnosticPage />} />
            <Route path="/blitz" element={<BlitzPage />} />
            <Route path="/smart" element={<SmartPracticePage />} />
            <Route element={<AppShell />}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/subjects" element={<MainPage page="Subjects" />} />
              <Route path="/practice" element={<PracticePage />} />
              <Route path="/practice/smart" element={<SmartPracticePage />} />
              <Route path="/practice/blitz" element={<BlitzPage />} />
              <Route path="/practice/custom" element={<MainPage page="Custom Practice" />} />
              <Route path="/cbt" element={<CbtPage />} />
              <Route path="/cbt/:examId" element={<MainPage page="CBT Simulator" />} />
              <Route path="/cbt/:examId/results" element={<MainPage page="CBT Results" />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/recommendations" element={<MainPage page="Recommendations" />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/menu/:section" element={<MainPage page="SABI" />} />
              <Route path="/session/:sessionId/question/:number" element={<MainPage page="Practice Session" />} />
              <Route path="/session/:sessionId/explanation" element={<MainPage page="Explanation" />} />
              <Route path="/session/:sessionId/results" element={<MainPage page="Session Results" />} />
            </Route>
            <Route path="/interactive" element={<Navigate to="/home" replace />} />
            <Route path="/app" element={<Navigate to="/home" replace />} />
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ThemeProvider>
  );
}
