import { ArrowRight, Brain, CheckCircle2, Lightbulb, Target, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const principles = [
  { icon: Brain, title: 'Built around your learning', body: 'Questions respond to your progress, recent mistakes and areas that need more practice.' },
  { icon: Lightbulb, title: 'Learn from every answer', body: 'Get clear feedback and a useful explanation after you answer.' },
  { icon: Target, title: 'Progress without pressure', body: 'No countdown, speed bonus or fixed session length. Stop whenever you need to.' },
];

export function BlitzPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--sabi-page)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sabi-muted)] hover:text-[var(--sabi-blue)]">← Back to practice</Link>
        <section className="mt-6 overflow-hidden rounded-[2rem] bg-[var(--sabi-navy)] p-6 text-white sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-blue-200"><Zap size={15}/> Sabi learning mode</div>
          <div className="mt-8 grid gap-8 md:grid-cols-[1.3fr_.7fr] md:items-end">
            <div>
              <p className="text-sm font-semibold text-yellow-300">Small steps. Stronger understanding.</p>
              <h1 className="mt-3 max-w-xl text-4xl font-bold leading-tight sm:text-5xl">Blitz practice that helps you remember.</h1>
              <p className="mt-4 max-w-xl text-sm leading-7 text-blue-100 sm:text-base">A focused stream of personalised questions. Answer, understand what happened, and strengthen the knowledge you need for JAMB.</p>
              <Link to="/learning?mode=blitz" className="sabi-primary-button sabi-focus mt-7 !border-yellow-400 !bg-yellow-400 !text-[var(--sabi-navy)] hover:!bg-yellow-300">Start Blitz <ArrowRight size={18}/></Link>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-6">
              <div className="text-xs font-bold uppercase tracking-wider text-blue-200">The learning loop</div>
              <div className="mt-5 space-y-3">
                {['Question','Your answer','Feedback','Understand','Next question'].map((step, i) => <div key={step} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold">{i + 1}</span><span className="text-sm font-semibold">{step}</span>{i < 4 && <CheckCircle2 className="ml-auto text-yellow-300" size={16}/>}</div>)}
              </div>
            </div>
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {principles.map(({icon: Icon,title,body}) => <article key={title} className="sabi-card p-5 sm:p-6"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--sabi-blue)]"><Icon size={21}/></span><h2 className="mt-4 text-base font-bold text-[var(--sabi-ink)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--sabi-muted)]">{body}</p></article>)}
        </section>
        <p className="mt-6 text-center text-xs leading-5 text-[var(--sabi-muted)]">Your answers contribute to your learning record. You can pause or leave a session at any time.</p>
      </div>
    </main>
  );
}
