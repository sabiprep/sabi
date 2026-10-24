import { useEffect, useState } from 'react';
import { ArrowRight, BookOpenCheck, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand-lockup${compact ? ' brand-lockup--compact' : ''}`} to="/welcome" aria-label="SABI home">
      <img src="/icon.svg" alt="" />
      <span>SABI</span>
    </Link>
  );
}

export function SplashPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/welcome', { replace: true }), 900);
    return () => window.clearTimeout(timer);
  }, [navigate]);

  return (
    <main className="splash-screen" aria-label="Loading SABI">
      <div className="splash-brand">
        <img src="/logo.svg" alt="SABI" />
      </div>
      <span className="splash-caption">Know what you know. Improve what you don't.</span>
      <span className="splash-loader" aria-hidden="true" />
    </main>
  );
}

export function WelcomePage() {
  return (
    <main className="public-page">
      <header className="public-header"><Brand compact /><span className="preview-pill">Design preview</span></header>
      <section className="welcome-layout">
        <div className="welcome-copy">
          <span className="eyebrow">JAMB preparation, built around you</span>
          <h1>Know what you know.<br /><span>Improve what you don't.</span></h1>
          <p>Build confidence across your JAMB subjects with focused practice, clear feedback, and a plan for what to learn next.</p>
          <div className="welcome-actions">
            <Link className="button button--primary" to="/auth/sign-up">Get started <ArrowRight size={18} /></Link>
            <Link className="button button--secondary" to="/auth/sign-in">I already have an account</Link>
          </div>
          <div className="welcome-proof"><span><BookOpenCheck size={17} /> Practice with purpose</span><span><ShieldCheck size={17} /> Progress built on evidence</span></div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-orbit art-orbit--one" />
          <div className="art-orbit art-orbit--two" />
          <div className="art-card">
            <span className="art-card-label">YOUR JAMB JOURNEY</span>
            <div className="art-card-icon"><BookOpenCheck size={28} /></div>
            <strong>Small steps.<br />Stronger mastery.</strong>
            <div className="art-progress"><span /></div>
            <span className="art-card-note">Your progress starts with one question.</span>
          </div>
          <span className="art-spark art-spark--one">✦</span><span className="art-spark art-spark--two">✦</span>
        </div>
      </section>
      <footer className="public-footer">SABI · JAMB preparation platform <span>Preview only — accounts are not connected yet.</span></footer>
    </main>
  );
}

type AuthMode = 'sign-up' | 'sign-in' | 'verify' | 'forgot-password';

const AUTH_COPY: Record<AuthMode, { title: string; description: string; button: string }> = {
  'sign-up': { title: 'Create your account', description: 'Start building a JAMB study plan shaped around you.', button: 'Continue to onboarding' },
  'sign-in': { title: 'Welcome back', description: 'Sign-in is a preview screen for now. Real authentication will be connected in a later phase.', button: 'Preview onboarding' },
  verify: { title: 'Verify your sign-in', description: 'Phone and email verification will be connected when real authentication is added.', button: 'Continue preview' },
  'forgot-password': { title: 'Reset your password', description: 'Password recovery will be connected when real authentication is added.', button: 'Continue preview' },
};

export function AuthPage({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();
  const copy = AUTH_COPY[mode];
  const isSignUp = mode === 'sign-up';
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const continuePreview = () => navigate(authMethod === 'phone' ? '/auth/verify' : '/onboarding/1');

  return (
    <main className="auth-page">
      <div className="auth-aside">
        <div className="auth-aside-art" aria-hidden="true"><img src="/sabi-transparent.svg" alt="" /></div>
        <Brand />
      </div>
      <section className="auth-main">
        <Link className="back-link" to="/welcome">← Back to welcome</Link>
        <div className="auth-card">
          <span className="eyebrow">SABI account</span>
          <h2>{copy.title}</h2>
          <p className="muted-copy">{copy.description}</p>
          {(mode === 'sign-up' || mode === 'sign-in') && (
            <div className="auth-form">
              <div className="auth-method-switch" aria-label="Choose sign-in method">
                <button type="button" aria-pressed={authMethod === 'email'} className={authMethod === 'email' ? 'is-active' : ''} onClick={() => setAuthMethod('email')}>Email</button>
                <button type="button" aria-pressed={authMethod === 'phone'} className={authMethod === 'phone' ? 'is-active' : ''} onClick={() => setAuthMethod('phone')}>Phone + OTP</button>
              </div>
              <form className="auth-form-fields" onSubmit={event => { event.preventDefault(); continuePreview(); }}>
                {authMethod === 'email'
                  ? <label>Email address<input type="email" autoComplete="email" placeholder="you@example.com" required /></label>
                  : <label>Phone number<input type="tel" autoComplete="tel" placeholder="+234 800 000 0000" required /></label>}
                {authMethod === 'email' && <label>Password<input type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} placeholder="At least 8 characters" required /></label>}
                {mode === 'sign-in' && authMethod === 'email' && <Link className="form-sub-link" to="/auth/forgot-password">Forgot password?</Link>}
                <p className="form-preview-note"><LockKeyhole size={15} /> Preview only: this form does not create or authenticate an account.</p>
                <button className="button button--primary button--wide" type="submit">{authMethod === 'phone' ? 'Continue to verification' : copy.button}<ArrowRight size={17} /></button>
              </form>
              <button className="google-preview-button" type="button" onClick={() => navigate('/onboarding/1')}><span className="google-g">G</span> Continue with Google <span className="google-preview-tag">Preview</span></button>
            </div>
          )}
          {mode !== 'sign-up' && mode !== 'sign-in' && (
            <form className="auth-form" onSubmit={event => { event.preventDefault(); navigate('/onboarding/1'); }}>
              {mode === 'verify' && <label>Verification code<input inputMode="numeric" placeholder="Enter the code" /></label>}
              {mode === 'forgot-password' && <label>Email address<input type="email" placeholder="you@example.com" /></label>}
              <p className="form-preview-note"><Mail size={15} /> No email or verification request will be sent in this preview.</p>
              <button className="button button--primary button--wide" type="submit">{copy.button}<ArrowRight size={17} /></button>
            </form>
          )}
          {mode === 'sign-up' && <p className="auth-switch">Already have an account? <Link to="/auth/sign-in">Sign in</Link></p>}
          {mode === 'sign-in' && <p className="auth-switch">New to SABI? <Link to="/auth/sign-up">Create an account</Link></p>}
        </div>
        <span className="auth-legal">By continuing, you agree to SABI's Terms and Privacy Policy. Preview text only.</span>
      </section>
    </main>
  );
}
