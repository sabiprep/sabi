import { ArrowRight, BrainCircuit, ChartNoAxesCombined, Compass, Lightbulb, Target } from 'lucide-react';
import { Link } from 'react-router-dom';

const steps = [
  { icon: ChartNoAxesCombined, title: 'Understand your progress', body: 'Sabi uses your learning history and question attempts to identify what needs attention.' },
  { icon: Target, title: 'Choose the next best practice', body: 'Your next practice is guided by your current learning needs, not a fixed level or road map.' },
  { icon: Lightbulb, title: 'Build mastery over time', body: 'Each answer gives Sabi new evidence to help guide what you should work on next.' },
];

export function SmartPracticePage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--sabi-page)] px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto max-w-5xl">
        <Link to="/practice" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--sabi-muted)] hover:text-[var(--sabi-blue)]">← Back to practice</Link>
        <section className="mt-6 rounded-[2rem] border border-[var(--sabi-border)] bg-[var(--sabi-surface)] p-6 shadow-sm sm:p-10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--sabi-blue)]"><BrainCircuit size={16}/> Adaptive learning</div>
          <div className="mt-8 grid gap-8 md:grid-cols-[1.2fr_.8fr] md:items-center">
            <div>
              <h1 className="max-w-xl text-4xl font-bold leading-tight text-[var(--sabi-navy)] sm:text-5xl">Your next step, thoughtfully chosen.</h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--sabi-muted)] sm:text-base">Smart Practice helps you focus on the topics that matter most right now. Sabi uses your learning evidence to guide your practice, then updates its recommendations as you answer.</p>
              <Link to="/learning?mode=smart_practice" className="sabi-primary-button sabi-focus mt-7">Start Smart Practice <ArrowRight size={18}/></Link>
              <p className="mt-3 text-xs text-[var(--sabi-muted)]">No fixed level path. No arbitrary question target. You can stop and continue later.</p>
            </div>
            <div className="rounded-3xl bg-blue-50 p-6 sm:p-7">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--sabi-blue)] shadow-sm"><Compass size={23}/></div>
              <h2 className="mt-5 text-lg font-bold text-[var(--sabi-navy)]">Practice with purpose</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">A learning cycle that adapts as your understanding grows.</p>
              <div className="mt-5 space-y-3">
                {['Recommendation','Practice question','Answer and feedback','New learning evidence','Updated next step'].map((item, i) => <div className="flex items-center gap-3" key={item}><span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--sabi-blue)]">{i + 1}</span><span className="text-sm font-semibold text-slate-700">{item}</span></div>)}
              </div>
            </div>
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(({icon: Icon,title,body}) => <article className="sabi-card p-5 sm:p-6" key={title}><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[var(--sabi-blue)]"><Icon size={21}/></span><h2 className="mt-4 font-bold text-[var(--sabi-ink)]">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--sabi-muted)]">{body}</p></article>)}
        </section>
      </div>
    </main>
  );
}
