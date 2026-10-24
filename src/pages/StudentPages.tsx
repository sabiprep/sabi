import { useState, type ReactNode } from 'react';
import {
  Activity, ArrowRight, Bell, BookMarked, BookOpen, BookOpenCheck,
  ClipboardList, FileQuestion, HelpCircle,
  Home, Info, LogOut, Menu, Moon, Settings, ShieldCheck, Sun, Target,
  UserRound, X, Zap,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useParams } from 'react-router-dom';
import { useTheme } from '../app/ThemeProvider';

const MAIN_NAV = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/practice', label: 'Practice', Icon: BookOpen },
  { to: '/cbt', label: 'CBT', Icon: FileQuestion },
  { to: '/progress', label: 'Progress', Icon: Activity },
  { to: '/profile', label: 'Profile', Icon: UserRound },
];

const MENU_ITEMS = [
  { to: '/menu/mistakes', label: 'Mistake notebook', Icon: ClipboardList, description: 'Review questions to revisit' },
  { to: '/menu/resources', label: 'Study resources', Icon: BookMarked, description: 'Formula sheet and syllabus' },
  { to: '/menu/help', label: 'Help & support', Icon: HelpCircle, description: 'Get help using SABI' },
  { to: '/menu/about', label: 'About SABI', Icon: Info, description: 'About the learning platform' },
  { to: '/menu/settings', label: 'Settings & privacy', Icon: Settings, description: 'Preferences and account controls' },
];

function AppBrand() {
  return <Link className="brand-lockup brand-lockup--compact" to="/home"><img src="/icon.svg" alt="" /><span>SABI</span></Link>;
}

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const title = MAIN_NAV.find(item => item.to === location.pathname)?.label ?? 'SABI';

  return (
    <div className="student-app">
      <div className="student-main">
        <header className="app-topbar">
          <div className="topbar-leading">
            <button className="icon-button menu-trigger" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
            <AppBrand />
            <span className="breadcrumb-title">{title}</span>
          </div>
          <div className="topbar-actions">
            <span className="preview-pill top-preview-pill">Preview mode</span>
            <Link className="icon-button notification-button" to="/notifications" aria-label="Notifications"><Bell size={19} /></Link>
            <Link className="avatar avatar-link" to="/profile" aria-label="Open profile">S</Link>
          </div>
        </header>
        <main className="student-content"><Outlet /></main>
        <nav className="mobile-bottom-nav" aria-label="Main navigation">
          {MAIN_NAV.map(({ to, label, Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `mobile-nav-link${isActive ? ' is-active' : ''}`}><Icon size={19} /><span>{label}</span></NavLink>)}
        </nav>
      </div>
      {menuOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setMenuOpen(false)}>
          <aside className="app-drawer" aria-label="More SABI pages" onClick={event => event.stopPropagation()}>
            <div className="drawer-heading"><AppBrand /><button className="icon-button" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={20} /></button></div>
            <span className="sidebar-label">MORE FROM SABI</span>
            <nav className="drawer-nav">
              {MENU_ITEMS.map(({ to, label, Icon, description }) => <NavLink key={to} to={to} onClick={() => setMenuOpen(false)} className="drawer-item"><Icon size={19} /><span><strong>{label}</strong><small>{description}</small></span><ArrowRight size={15} /></NavLink>)}
            </nav>
            <div className="drawer-divider" />
            <Link to="/welcome" className="drawer-item drawer-signout" onClick={() => setMenuOpen(false)}><LogOut size={18} /><span><strong>Exit preview</strong><small>No account is signed in</small></span></Link>
            <p className="drawer-footnote">Admin tools are not part of the student menu.</p>
          </aside>
        </div>
      )}
    </div>
  );
}

export function HomePage() {
  return (
    <div className="page-stack">
      <section className="home-hero">
        <div className="hero-copy"><span className="eyebrow eyebrow--yellow">YOUR JAMB JOURNEY</span><h1>Welcome to SABI.</h1><p>A clearer way to prepare: practise with purpose, learn from every answer, and build confidence across your subjects.</p><Link className="button button--yellow" to="/practice">Explore practice <ArrowRight size={17} /></Link></div>
        <div className="hero-emblem" aria-hidden="true"><BookOpenCheck size={52} /><span>LEARN<br />WITH PURPOSE</span></div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">START HERE</span><h2>Choose your next step</h2></div></div>
        <div className="action-grid">
          <ActionCard to="/practice" icon={<BookOpen size={21} />} title="Practice" text="Choose a practice mode and build your skills." tone="blue" />
          <ActionCard to="/cbt" icon={<FileQuestion size={21} />} title="CBT" text="Prepare with a JAMB-style mock exam." tone="yellow" />
          <ActionCard to="/progress" icon={<Activity size={21} />} title="Progress" text="Review your learning and subject coverage." tone="navy" />
          <ActionCard to="/profile" icon={<UserRound size={21} />} title="Profile" text="Manage your profile and app preferences." tone="light" />
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">YOUR LEARNING</span><h2>Progress starts with your first session</h2></div><Link className="text-link" to="/progress">View progress <ArrowRight size={15} /></Link></div>
        <div className="empty-learning-card"><div className="empty-icon"><Activity size={22} /></div><div><strong>Your learning summary will appear here</strong><p>This preview does not contain real student activity. Once connected, your sessions will help build your progress and recommendations.</p></div></div>
      </section>
      <section className="home-footer-links"><Link to="/subjects"><BookMarked size={16} /> Browse JAMB subjects</Link><Link to="/notifications"><Bell size={16} /> Notifications</Link></section>
    </div>
  );
}

export function PracticePage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="PRACTICE HUB" title="Choose how you want to practise" description="Each practice mode has a distinct purpose. Your results will connect to one learning profile after backend integration." />
      <div className="practice-grid">
        <ModeCard to="/practice/smart" number="01" title="Smart Practice" label="SABI-guided" icon={<Target size={23} />} text="A guided practice mode that will adapt to the learning evidence recorded for you." />
        <ModeCard to="/practice/blitz" number="02" title="Blitz" label="Rapid reinforcement" icon={<Zap size={23} />} text="One question at a time, with no speed-based scoring or fixed session timer." />
        <ModeCard to="/practice/custom" number="03" title="Custom Practice" label="You choose" icon={<BookOpen size={23} />} text="Set your subjects, topics, question source, and practice preferences." />
      </div>
      <PreviewNotice>Practice sessions are interface previews until questions, session APIs, and learning-event storage are connected.</PreviewNotice>
    </div>
  );
}

export function CbtPage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="JAMB CBT" title="Prepare under exam conditions" description="The CBT simulator is a separate exam experience. During an active exam, no hints, AI coaching, or explanations are shown." />
      <div className="exam-grid">
        <ExamCard to="/cbt/full-mock" label="FULL MOCK" count="180 questions" duration="120 minutes" description="A complete JAMB-style mock exam." />
        <ExamCard to="/cbt/quick-mock" label="QUICK MOCK" count="40 questions" duration="30 minutes" description="A shorter exam simulation for focused practice." />
      </div>
      <PreviewNotice>Exam sessions and scoring are not connected yet. Subject combination should come from your approved JAMB profile.</PreviewNotice>
      <section className="section-block"><div className="section-heading"><div><span className="eyebrow">EXAM HISTORY</span><h2>Your completed mocks</h2></div></div><div className="empty-learning-card"><div className="empty-icon"><ClipboardList size={22} /></div><div><strong>No completed mock exams yet</strong><p>Completed exam results will appear here after CBT is connected.</p></div></div></section>
    </div>
  );
}

export function ProgressPage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="YOUR LEARNING" title="Progress & mastery" description="SABI will show mastery estimates and syllabus coverage from recorded learning—not as an exam score." />
      <div className="progress-intro-card"><div className="progress-illustration"><Activity size={30} /></div><div><span className="eyebrow eyebrow--yellow">EVIDENCE FIRST</span><h2>Your learning story is just beginning.</h2><p>There is no student activity connected to this preview, so we are not showing invented scores or mastery percentages.</p><Link className="button button--yellow" to="/practice">Start with practice <ArrowRight size={16} /></Link></div></div>
      <div className="action-grid action-grid--three"><ActionCard to="/subjects" icon={<BookMarked size={20} />} title="Subject coverage" text="See syllabus topics as you work through them." tone="blue" /><ActionCard to="/recommendations" icon={<Target size={20} />} title="Next actions" text="Recommendations will be based on your learning evidence." tone="yellow" /><ActionCard to="/notifications" icon={<Bell size={20} />} title="Learning updates" text="Find relevant updates and reminders." tone="light" /></div>
    </div>
  );
}

export function ProfilePage() {
  const { mode, setMode } = useTheme();
  const themeOptions = [{ id: 'light' as const, label: 'Light', Icon: Sun }, { id: 'dark' as const, label: 'Dark', Icon: Moon }, { id: 'system' as const, label: 'System', Icon: Settings }];

  return (
    <div className="page-stack">
      <PageHeading eyebrow="YOUR ACCOUNT" title="Profile & settings" description="Profile information and account controls will connect to your secure account in a later phase." />
      <section className="settings-card">
        <div className="settings-section"><div className="settings-icon"><UserRound size={19} /></div><div className="settings-copy"><h2>Student profile</h2><p>Sign-in and saved profile details are not connected in this frontend preview.</p></div><span className="preview-pill">Not connected</span></div>
        <div className="settings-section settings-section--theme"><div className="settings-icon"><Sun size={19} /></div><div className="settings-copy"><h2>Appearance</h2><p>Choose how SABI looks on this device.</p></div><div className="theme-switcher">{themeOptions.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={mode === id} className={mode === id ? 'is-active' : ''} onClick={() => setMode(id)}><Icon size={15} />{label}</button>)}</div></div>
        <div className="settings-section"><div className="settings-icon"><ShieldCheck size={19} /></div><div className="settings-copy"><h2>Privacy & security</h2><p>Account security, data controls, and privacy details will be added with authentication.</p></div></div>
      </section>
      <PreviewNotice>Theme choice is saved locally in this browser. Account settings do not change any backend data.</PreviewNotice>
    </div>
  );
}

export function NotificationsPage() {
  return (
    <div className="page-stack">
      <PageHeading eyebrow="UPDATES" title="Notifications" description="Learning reminders and account updates will appear here when notifications are connected." />
      <div className="empty-state"><div className="empty-icon empty-icon--large"><Bell size={25} /></div><h2>You’re all caught up</h2><p>There are no notifications in this preview.</p><Link className="button button--secondary" to="/home">Back to Home</Link></div>
    </div>
  );
}

export function MainPage({ page }: { page: string }) {
  const { section } = useParams();
  const sectionPage: Record<string, { title: string; description: string; Icon: typeof BookMarked }> = {
    mistakes: { title: 'Mistake notebook', description: 'Questions to review will be collected here after practice is connected.', Icon: ClipboardList },
    resources: { title: 'Study resources', description: 'Syllabus and formula resources will be organized here.', Icon: BookMarked },
    help: { title: 'Help & support', description: 'Support information will be available here.', Icon: HelpCircle },
    about: { title: 'About SABI', description: 'SABI is a JAMB preparation platform focused on helping students learn from evidence.', Icon: Info },
    settings: { title: 'Settings & privacy', description: 'Theme and appearance preferences are available in your profile. Account settings will follow later.', Icon: Settings },
  };
  const content = section ? sectionPage[section] : undefined;
  const title = content?.title ?? page;
  const description = content?.description ?? 'This destination has a route and page boundary. Its real data and actions will be connected in later implementation phases.';
  const Icon = content?.Icon ?? BookOpenCheck;

  return (
    <div className="page-stack">
      <PageHeading eyebrow={section ? 'MORE FROM SABI' : 'SABI PREVIEW'} title={title} description={description} />
      <div className="empty-state"><div className="empty-icon empty-icon--large"><Icon size={25} /></div><h2>{content ? 'This space is ready for its feature' : 'Page structure is in place'}</h2><p>This frontend preview contains navigation and page structure only. No student account, session, result, or backend action is being represented as real.</p><Link className="button button--secondary" to="/home">Back to Home</Link></div>
    </div>
  );
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="page-heading"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}

function ActionCard({ to, icon, title, text, tone }: { to: string; icon: ReactNode; title: string; text: string; tone: string }) {
  return <Link to={to} className={`action-card action-card--${tone}`}><span className="action-icon">{icon}</span><span className="action-card-title">{title}</span><p>{text}</p><span className="action-arrow"><ArrowRight size={16} /></span></Link>;
}

function ModeCard({ to, number, title, label, icon, text }: { to: string; number: string; title: string; label: string; icon: ReactNode; text: string }) {
  return <Link className="mode-card" to={to}><div className="mode-card-top"><span className="mode-number">{number}</span><span className="mode-icon">{icon}</span></div><span className="mode-label">{label}</span><h2>{title}</h2><p>{text}</p><span className="text-link">Explore mode <ArrowRight size={15} /></span></Link>;
}

function ExamCard({ to, label, count, duration, description }: { to: string; label: string; count: string; duration: string; description: string }) {
  return <Link className="exam-card" to={to}><span className="exam-label">{label}</span><h2>{count}</h2><p>{description}</p><div className="exam-meta"><span><FileQuestion size={15} />{count}</span><span><Activity size={15} />{duration}</span></div><span className="button button--secondary">View exam setup <ArrowRight size={16} /></span></Link>;
}

function PreviewNotice({ children }: { children: ReactNode }) {
  return <div className="preview-notice"><Info size={17} /><span>{children}</span></div>;
}
