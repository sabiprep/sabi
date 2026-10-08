import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bell, BookOpen, Bot, Check, ChevronDown, ChevronRight,
  Clock3, Flame, Gauge, GraduationCap, Home, Info, Lightbulb, Menu, MoreHorizontal,
  Play, RotateCcw, Search, Settings, SlidersHorizontal, Sparkles, Target, Timer,
  Trophy, UserRound, X, Zap, CircleHelp, Flag, Bookmark, LogOut, Moon, Sun,
  BarChart3, Download, ShieldCheck, MessageCircle, LockKeyhole, CheckCircle2
} from 'lucide-react';

type Screen =
  | 'home' | 'practice' | 'smart' | 'question' | 'results' | 'progress'
  | 'blitz' | 'blitzSetup' | 'blitzActive' | 'cbt' | 'cbtActive' | 'cbtResult' | 'tutor'
  | 'profile' | 'settings';

type Theme = 'light' | 'dark';

const subjects = [
  { name: 'Mathematics', short: 'M', mastery: 72, tone: 'blue' },
  { name: 'Chemistry', short: 'C', mastery: 61, tone: 'green' },
  { name: 'Physics', short: 'P', mastery: 54, tone: 'yellow' },
  { name: 'Biology', short: 'B', mastery: 48, tone: 'purple' },
];

const recommendations = [
  { subject: 'Mathematics', topic: 'Indices', count: 12, tone: 'blue' },
  { subject: 'Physics', topic: 'Motion', count: 15, tone: 'purple' },
  { subject: 'Chemistry', topic: 'Stoichiometry', count: 10, tone: 'green' },
];

const recent = [
  { subject: 'Chemistry', topic: 'Atomic Structure', meta: 'Practice session · 10 questions', when: 'Yesterday', tone: 'green' },
  { subject: 'Mathematics', topic: 'Quadratic Equations', meta: 'Blitz session · 20 questions', when: '2 days ago', tone: 'yellow' },
];

const tone = {
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  yellow: 'bg-amber-50 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300',
  purple: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
};

const dotTone = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-400',
  yellow: 'bg-amber-400',
  purple: 'bg-purple-400',
};

function cx(...v: Array<string | false | null | undefined>) { return v.filter(Boolean).join(' '); }

function Button({
  children, onClick, variant = 'primary', className = '', disabled = false
}: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'ghost'; className?: string; disabled?: boolean;
}) {
  return <button disabled={disabled} onClick={onClick} className={cx(
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-extrabold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-45',
    variant === 'primary' && 'bg-[#F5C518] text-[#081225] hover:bg-[#ffd42e]',
    variant === 'outline' && 'border border-slate-200 bg-white text-[#0A1128] hover:bg-slate-50 dark:border-white/10 dark:bg-[#101b30] dark:text-white dark:hover:bg-[#14223b]',
    variant === 'ghost' && 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5',
    className
  )}>{children}</button>;
}

function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div onClick={onClick} className={cx(
    'rounded-2xl border border-slate-200/90 bg-white shadow-[0_5px_24px_rgba(15,23,42,.045)] dark:border-white/[.08] dark:bg-[#0e192b] dark:shadow-none',
    onClick && 'cursor-pointer transition hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-500/40',
    className
  )}>{children}</div>;
}

function ProgressBar({ value, className = '', fill = 'bg-blue-600' }: { value: number; className?: string; fill?: string }) {
  return <div className={cx('h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800', className)}>
    <div className={cx('h-full rounded-full transition-all', fill)} style={{ width: value + '%' }} />
  </div>;
}

function Logo({ compact = false }: { compact?: boolean }) {
  return <div className="flex items-center gap-2 font-display font-extrabold tracking-tight">
    <span className="text-2xl font-black leading-none text-blue-600">S</span>
    {!compact && <span className="text-xl text-[#0A1128] dark:text-white">SABI</span>}
  </div>;
}

function AtomArt() {
  return <div className="relative h-24 w-24 shrink-0 overflow-hidden sm:h-32 sm:w-36">
    <div className="absolute right-3 top-7 h-16 w-16 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-[0_0_30px_rgba(245,197,24,.45)]" />
    <div className="absolute right-0 top-2 h-28 w-32 rotate-[25deg] rounded-[50%] border-2 border-blue-400/60" />
    <div className="absolute right-0 top-2 h-28 w-32 -rotate-[35deg] rounded-[50%] border-2 border-cyan-300/50" />
    <div className="absolute right-12 top-3 h-2.5 w-2.5 rounded-full bg-blue-500 shadow-[0_0_10px_#4A90D9]" />
    <div className="absolute right-2 top-20 h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_12px_#22d3ee]" />
  </div>;
}

function TopHeader({ onMenu, onProfile, onBell }: { onMenu?: () => void; onProfile: () => void; onBell: () => void }) {
  return <header className="flex items-center justify-between px-5 pb-3 pt-4 sm:px-8 lg:px-10">
    <button onClick={onMenu} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-white/5" aria-label="Open menu"><Menu size={20}/></button>
    <Logo />
    <div className="ml-auto flex items-center gap-2">
      <button onClick={onBell} className="relative rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"><Bell size={21}/><span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#081225]"/></button>
      <button onClick={onProfile} className="ml-1 h-10 w-10 overflow-hidden rounded-full border-2 border-white bg-gradient-to-br from-blue-200 to-amber-200 shadow-sm dark:border-[#20304a]">
        <span className="grid h-full w-full place-items-center text-xs font-black text-[#0A1128]">AO</span>
      </button>
    </div>
  </header>;
}

function BottomNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  const items = [
    ['home', 'Home', Home], ['practice', 'Practice', SlidersHorizontal], ['blitz', 'Blitz', Zap], ['cbt', 'CBT', BookOpen], ['profile', 'More', MoreHorizontal]
  ] as const;
  return <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl dark:border-white/[.08] dark:bg-[#081225]/95 lg:hidden">
    <div className="mx-auto flex max-w-lg items-center justify-around">
      {items.map(([id,label,Icon]) => <button key={id} onClick={() => go(id)} className={cx(
        'flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold transition',
        active === id || (id === 'profile' && ['profile','settings','tutor','progress'].includes(active))
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-500 dark:text-slate-400'
      )}><Icon size={19}/><span>{label}</span></button>)}
    </div>
  </nav>;
}

function DesktopNav({ active, go }: { active: Screen; go: (s: Screen) => void }) {
  const items = [
    ['home','Home',Home],['practice','Practice',SlidersHorizontal],['blitz','Blitz',Zap],['cbt','CBT',BookOpen],['progress','Progress',BarChart3],['tutor','AI Tutor',Bot],['profile','Profile',UserRound]
  ] as const;
  return <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white px-3 py-6 dark:border-white/[.07] dark:bg-[#081225] lg:flex lg:flex-col">
    <div className="px-3 pb-8"><Logo/></div>
    <nav className="space-y-1">
      {items.map(([id,label,Icon]) => <button key={id} onClick={()=>go(id)} className={cx(
        'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold',
        active === id ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300' : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
      )}><Icon size={18}/>{label}</button>)}
    </nav>
    <div className="mt-auto border-t border-slate-100 pt-4 dark:border-white/[.07]">
      <button onClick={()=>go('settings')} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5"><Settings size={18}/>Settings</button>
    </div>
  </aside>;
}

function Home({ go }: { go: (s: Screen) => void }) {
  return <div className="space-y-7">
    <section className="px-1">
      <p className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Good morning, David.</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 sm:text-base">Let's move your JAMB preparation forward.</p>
    </section>

    <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-white to-blue-50/60 p-5 dark:border-blue-500/40 dark:bg-gradient-to-br dark:from-[#102044] dark:to-[#0b1830] sm:p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-[11px] font-extrabold text-blue-700 dark:bg-blue-500/20 dark:text-blue-200">Chemistry</span>
          <p className="mt-3 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Atomic Structure</p>
          <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-300">
            <span className="flex items-center gap-1.5"><BookOpen size={14}/>10 questions</span>
            <span className="flex items-center gap-1.5"><Clock3 size={14}/>~ 15 mins</span>
          </div>
        </div>
        <AtomArt/>
      </div>
      <Button onClick={()=>go('question')} className="mt-2 w-full sm:w-auto">Continue Practice <ArrowRight size={17}/></Button>
    </Card>

    <section>
      <SectionTitle title="Your learning space" action="See all" onClick={()=>go('practice')}/>
      <div className="grid grid-cols-2 gap-3">
        {[
          ['Practice','Sharpen your understanding.',SlidersHorizontal,'blue','practice'],
          ['Smart Practice','Focus on what matters.',Target,'green','smart'],
          ['Blitz','Quick practice to keep momentum.',Zap,'yellow','blitz'],
          ['CBT','Simulate the real JAMB experience.',BookOpen,'blue','cbt'],
        ].map(([title,desc,Icon,t,id]) => <Card key={title as string} onClick={()=>go(id as Screen)} className="p-4 sm:p-5">
          <div className={cx('grid h-10 w-10 place-items-center rounded-xl',tone[t as keyof typeof tone])}><Icon size={20}/></div>
          <p className="mt-4 text-sm font-extrabold">{title as string}</p>
          <p className="mt-1 min-h-8 text-[11px] leading-4 text-slate-500 dark:text-slate-400">{desc as string}</p>
          <ArrowRight size={16} className="mt-3 text-blue-600"/>
        </Card>)}
      </div>
    </section>

    <section>
      <SectionTitle title="Your progress" action="See details" onClick={()=>go('progress')}/>
      <Card className="p-5 sm:p-6">
        <div className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[170px_minmax(0,1fr)] sm:gap-5">
          <div className="relative grid aspect-square place-items-center rounded-full bg-[conic-gradient(#5ee1a1_0_65%,#e7edf5_65%_100%)] p-2 dark:bg-[conic-gradient(#22e6b5_0_65%,#1b2a42_65%_100%)]">
            <div className="grid h-full w-full place-items-center rounded-full bg-white dark:bg-[#0e192b]"><div className="text-center"><p className="font-display text-2xl font-extrabold">65%</p><p className="text-[10px] font-semibold text-slate-400">Overall Mastery</p></div></div>
          </div>
          <div className="space-y-4">
            {subjects.map((s)=><div key={s.name}><div className="mb-1 flex items-center justify-between text-[11px] font-semibold"><span>{s.name}</span><span className="text-slate-400">{s.mastery}%</span></div><ProgressBar value={s.mastery} fill={dotTone[s.tone as keyof typeof dotTone]}/></div>)}
          </div>
        </div>
      </Card>
    </section>

    <section>
      <SectionTitle title="Recent activity" action="See all" onClick={()=>go('progress')}/>
      <div className="space-y-2">
        {recent.map((r)=><Card key={r.topic} onClick={()=>go('results')} className="flex items-center gap-3 p-3.5">
          <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl',tone[r.tone as keyof typeof tone])}><CheckCircle2 size={18}/></div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-extrabold">{r.subject}<span className="mx-1 text-slate-300">·</span>{r.topic}</p><p className="mt-1 truncate text-[10px] text-slate-400">{r.meta}</p></div>
          <span className="shrink-0 text-[10px] font-semibold text-slate-400">{r.when}</span>
        </Card>)}
      </div>
    </section>

    <section className="pb-4">
      <SectionTitle title="Recommended for you" action="See all" onClick={()=>go('practice')}/>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {recommendations.map(r=><Card key={r.topic} onClick={()=>go('smart')} className={cx('min-w-[160px] snap-start p-4', r.tone==='purple' ? 'bg-purple-50/70 dark:bg-purple-500/10' : r.tone==='green' ? 'bg-emerald-50/70 dark:bg-emerald-500/10' : 'bg-blue-50/70 dark:bg-blue-500/10')}>
          <div className={cx('mb-5 grid h-8 w-8 place-items-center rounded-lg text-xs font-black',tone[r.tone as keyof typeof tone])}>{r.subject.slice(0,1)}</div>
          <p className="text-[11px] font-bold">{r.subject}</p><p className="mt-1 font-display text-sm font-extrabold">{r.topic}</p><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-slate-500 dark:text-slate-400">{r.count} questions</span><span className="grid h-7 w-7 place-items-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-white/10"><ArrowRight size={14}/></span></div>
        </Card>)}
      </div>
    </section>
  </div>;
}

function SectionTitle({title,action,onClick}:{title:string;action:string;onClick?:()=>void}) {
  return <div className="mb-3 flex items-center justify-between"><h2 className="font-display text-base font-extrabold">{title}</h2><button onClick={onClick} className="text-xs font-bold text-blue-600 hover:text-blue-700">{action}</button></div>;
}

function Practice({go}:{go:(s:Screen)=>void}) {
  return <div className="space-y-6">
    <PageHead eyebrow="Practice" title="Choose your next session" subtitle="Build understanding, target weak areas, or jump into a quick question."/>
    <div className="grid gap-3 sm:grid-cols-2">
      {[
        ['Smart Practice','SABI chooses what will help you most.',Sparkles,'smart','green'],
        ['Custom Practice','Choose subject, topic, year and questions.',SlidersHorizontal,'question','blue'],
        ['Quick Practice','Start answering immediately.',Play,'question','yellow'],
        ['AI Tutor','Ask, understand, then practice.',Bot,'tutor','purple'],
      ].map(([title,desc,Icon,id,t])=><Card key={title as string} onClick={()=>go(id as Screen)} className="p-5"><div className={cx('grid h-11 w-11 place-items-center rounded-xl',tone[t as keyof typeof tone])}><Icon size={21}/></div><h2 className="mt-5 font-display text-lg font-extrabold">{title as string}</h2><p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{desc as string}</p><div className="mt-5 flex items-center justify-between text-xs font-bold text-blue-600"><span>Open</span><ArrowRight size={15}/></div></Card>)}
    </div>
    <Card className="p-5"><div className="flex items-center gap-3"><Flame className="text-amber-500"/><div><p className="text-sm font-extrabold">7-day practice streak</p><p className="mt-1 text-xs text-slate-400">A small session today keeps your momentum alive.</p></div><ArrowRight className="ml-auto text-slate-300" size={17}/></div></Card>
  </div>;
}

function Smart({go}:{go:(s:Screen)=>void}) {
  return <div className="mx-auto max-w-3xl space-y-6"><Back onClick={()=>go('practice')}/><PageHead eyebrow="Adaptive practice" title="Smart Practice" subtitle="SABI picks the next questions from your learning signals."/><Card className="overflow-hidden"><div className="bg-gradient-to-br from-[#0a1128] to-[#173a70] p-6 text-white"><span className="rounded-full bg-blue-400/20 px-3 py-1 text-[10px] font-extrabold text-blue-200">RECOMMENDED NEXT</span><h2 className="mt-5 font-display text-2xl font-extrabold">Proximity Concord</h2><p className="mt-2 text-sm text-slate-300">English Language · current mastery 42%</p><div className="mt-6 grid grid-cols-3 gap-2">{[['15','Questions'],['Adaptive','Difficulty'],['~15m','Estimated']].map(([a,b])=><div key={b} className="rounded-xl bg-white/5 p-3"><p className="font-bold">{a}</p><p className="mt-1 text-[10px] text-slate-400">{b}</p></div>)}</div></div><div className="p-6"><div className="flex gap-3 rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10"><Lightbulb className="shrink-0 text-blue-600"/><p className="text-sm leading-6 text-slate-600 dark:text-slate-300">You'll get immediate feedback after each answer. Difficulty can change as you demonstrate mastery.</p></div><Button onClick={()=>go('question')} className="mt-5 w-full">Start Smart Practice <ArrowRight size={16}/></Button></div></Card></div>;
}

function Question({go, cbt=false}:{go:(s:Screen)=>void;cbt?:boolean}) {
  const [selected,setSelected]=useState<string|null>(null); const [submitted,setSubmitted]=useState(false);
  const options=[['A','2'],['B','3'],['C','4'],['D','5']];
  return <div className="mx-auto max-w-3xl space-y-4">
    <div className="flex items-center justify-between"><button onClick={()=>go(cbt?'cbt':'practice')} className="flex items-center gap-1 text-sm font-bold text-slate-500"><ArrowLeft size={16}/>Exit</button><div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold shadow-sm dark:bg-[#0e192b]"><Timer size={15} className="text-blue-500"/>{cbt?'00:48:21':'12:48'}</div></div>
    <Card className="overflow-hidden">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-white/[.07]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold text-blue-600">{cbt?'MATHEMATICS · CBT':'MATHEMATICS · QUICK PRACTICE'}</p><p className="mt-1 text-xs font-bold text-slate-400">Question {cbt?'12 of 50':'6 of 15'}</p></div><span className="text-xs font-bold text-slate-400">{cbt?'24%':'40%'}</span></div><ProgressBar value={cbt?24:40} className="mt-3 h-1"/></div>
      <div className="p-5 sm:p-8"><p className="font-display text-lg font-extrabold leading-8 sm:text-xl">If 2x + 3 = 11, what is the value of x?</p><div className="mt-7 space-y-3">{options.map(([letter,text])=><button key={letter} disabled={submitted} onClick={()=>setSelected(letter)} className={cx('flex w-full items-center gap-4 rounded-xl border p-3.5 text-left transition',submitted&&letter==='C'?'border-blue-500 bg-blue-50 dark:bg-blue-500/15':selected===letter?'border-blue-500 bg-blue-50 dark:bg-blue-500/15':'border-slate-200 hover:border-blue-300 dark:border-white/[.09] dark:hover:border-blue-500/50')}><span className={cx('grid h-9 w-9 place-items-center rounded-lg text-sm font-extrabold',selected===letter?'bg-blue-600 text-white':'bg-slate-100 dark:bg-white/5')}>{letter}</span><span className="font-semibold">{text}</span>{submitted&&letter==='C'&&<Check className="ml-auto text-emerald-500" size={18}/>}</button>)}</div>{submitted&&<div className="mt-5 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10"><p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">Correct. 2x = 8, therefore x = 4.</p></div>}<div className="mt-7 flex items-center justify-between gap-2"><Button variant="ghost"><Bookmark size={16}/>Bookmark</Button><div className="flex gap-2"><Button variant="outline"><Flag size={15}/>Flag</Button>{submitted?<Button onClick={()=>go(cbt?'cbtResult':'results')}>Next <ArrowRight size={16}/></Button>:<Button disabled={!selected} onClick={()=>setSubmitted(true)}>Check answer <Check size={16}/></Button>}</div></div></div>
    </Card>
    {cbt&&<div className="grid grid-cols-10 gap-1.5">{Array.from({length:20},(_,i)=><button key={i} className={cx('grid h-8 place-items-center rounded-md text-[10px] font-bold',i===11?'bg-blue-600 text-white':i===4?'bg-red-100 text-red-600 dark:bg-red-500/15':'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-300')}>{i+1}</button>)}</div>}
  </div>;
}

function Results({go}:{go:(s:Screen)=>void}) {
  return <div className="mx-auto max-w-4xl space-y-6"><PageHead eyebrow="Practice complete" title="Here's how you performed" subtitle="Use the result to decide what to do next."/><div className="grid gap-4 sm:grid-cols-2"><Card className="p-6"><div className="grid grid-cols-[130px_1fr] items-center gap-5"><div className="relative grid aspect-square place-items-center rounded-full bg-[conic-gradient(#21d39b_0_68%,#e9eef5_68%)] p-2 dark:bg-[conic-gradient(#22e6b5_0_68%,#1b2a42_68%)]"><div className="grid h-full w-full place-items-center rounded-full bg-white dark:bg-[#0e192b]"><p className="font-display text-3xl font-extrabold">68%</p></div></div><div><p className="text-sm font-bold text-slate-400">Score</p><p className="mt-1 font-display text-2xl font-extrabold">Good progress</p><p className="mt-2 text-xs text-emerald-600">+6% from last session</p></div></div><div className="mt-6 grid grid-cols-3 gap-2">{[['34','Correct'],['12','Incorrect'],['4','Unanswered']].map(([a,b])=><div key={b} className="rounded-xl bg-slate-50 p-3 text-center dark:bg-white/5"><p className="font-display text-lg font-extrabold">{a}</p><p className="text-[10px] text-slate-400">{b}</p></div>)}</div></Card><Card className="p-6"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Subject performance</p><div className="mt-5 space-y-4">{[['Mathematics',72,'blue'],['English',64,'green'],['Physics',60,'yellow'],['Chemistry',76,'purple']].map(([n,v,t])=><div key={n as string}><div className="mb-1 flex justify-between text-xs font-bold"><span>{n as string}</span><span className="text-slate-400">{v}%</span></div><ProgressBar value={v as number} fill={dotTone[t as keyof typeof dotTone]}/></div>)}</div></Card></div><div className="flex flex-wrap gap-3"><Button onClick={()=>go('question')}>Practice again <RotateCcw size={16}/></Button><Button variant="outline" onClick={()=>go('progress')}>View Progress <ArrowRight size={16}/></Button></div></div>;
}

function Progress({go}:{go:(s:Screen)=>void}) {
  return <div className="space-y-6"><PageHead eyebrow="Your learning" title="Progress & Mastery" subtitle="See how your practice is turning into exam readiness."/><div className="grid grid-cols-3 gap-2 sm:gap-4">{[['65%','Mastery',Gauge],['535','Questions',BookOpen],['7 days','Streak',Flame]].map(([v,l,Icon])=><Card key={l as string} className="p-4"><Icon size={18} className="text-blue-600"/><p className="mt-3 font-display text-xl font-extrabold">{v as string}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{l as string}</p></Card>)}</div><Card className="p-5"><SectionTitle title="Subject mastery" action="Last 30 days" onClick={()=>{}}/>{subjects.map(s=><div key={s.name} className="mb-5 last:mb-0"><div className="mb-2 flex justify-between text-xs font-bold"><span>{s.name}</span><span className="text-slate-400">{s.mastery}%</span></div><ProgressBar value={s.mastery} fill={dotTone[s.tone as keyof typeof dotTone]}/></div>)}</Card><Card className="p-5"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-extrabold">Priority topic</h2><p className="mt-1 text-xs text-slate-400">The next area most likely to improve your score.</p></div><Target className="text-blue-600"/></div><div className="mt-5 rounded-xl bg-blue-50 p-4 dark:bg-blue-500/10"><p className="font-extrabold">Proximity Concord</p><p className="mt-1 text-xs text-slate-400">English Language · 42% mastery</p><Button onClick={()=>go('smart')} className="mt-4 w-full">Work on it <ArrowRight size={15}/></Button></div></Card></div>;
}

function BlitzSetup({go}:{go:(s:Screen)=>void}) {
  const [subject,setSubject]=useState('Mathematics'); const [difficulty,setDifficulty]=useState('Easy');
  return <div className="mx-auto max-w-3xl space-y-6"><Back onClick={()=>go('blitz')}/><PageHead eyebrow="Fast practice" title="Blitz Mode" subtitle="Quick practice to keep your momentum. Short, timed sessions across key topics."/><Card className="p-5"><FieldTitle title="Choose a subject"/><div className="grid grid-cols-2 gap-3">{['Mathematics','English','Physics','Chemistry'].map(s=><button key={s} onClick={()=>setSubject(s)} className={cx('rounded-xl border p-3 text-left text-xs font-extrabold',subject===s?'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300':'border-slate-200 dark:border-white/[.08]')}><span className="block text-base">{s==='Mathematics'?'𝕄':s==='English'?'▣':s==='Physics'?'⚛':'◉'}</span><span className="mt-2 block">{s}</span><span className="mt-1 block text-[9px] font-normal text-slate-400">10 questions</span></button>)}</div><FieldTitle title="Choose difficulty" className="mt-7"/><div className="grid grid-cols-3 gap-2">{['Easy','Medium','Hard'].map(d=><button key={d} onClick={()=>setDifficulty(d)} className={cx('rounded-xl border py-3 text-xs font-bold',difficulty===d?'border-blue-500 text-blue-600':'border-slate-200 text-slate-500 dark:border-white/[.08]')}>{d}</button>)}</div><p className="mt-5 flex items-center gap-2 text-xs text-slate-400"><Clock3 size={15}/>Estimated time: ~8 mins</p><Button onClick={()=>go('blitzActive')} className="mt-5 w-full">Start Blitz <ArrowRight size={16}/></Button></Card></div>;
}

function BlitzActive({go}:{go:(s:Screen)=>void}) {
  const [selected,setSelected]=useState<string|null>(null); const [submitted,setSubmitted]=useState(false);
  const options=['Careless','Thorough','Immediate','Ordinary'];
  return <div className="mx-auto max-w-3xl space-y-5"><div className="flex items-center justify-between"><button onClick={()=>go('blitzSetup')} className="flex items-center gap-1 text-sm font-bold text-slate-500"><ArrowLeft size={16}/>Exit Blitz</button><span className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-extrabold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">00:45</span></div><Card className="p-5 sm:p-7"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600">Blitz · Question 4 / 10</p><p className="mt-2 text-xs font-bold text-slate-400">Streak 3 🔥</p></div><Zap className="text-amber-500"/></div><ProgressBar value={40} fill="bg-amber-400" className="mt-4"/><p className="mt-8 font-display text-xl font-extrabold leading-8">Choose the word nearest in meaning to “meticulous”.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{options.map((x,i)=><button key={x} disabled={submitted} onClick={()=>setSelected(x)} className={cx('rounded-xl border p-4 text-left text-sm font-bold transition',submitted&&x==='Thorough'?'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10':selected===x?'border-blue-500 bg-blue-50 dark:bg-blue-500/10':'border-slate-200 dark:border-white/[.08]')}><span className="mr-3 text-slate-400">{String.fromCharCode(65+i)}</span>{x}</button>)}</div>{submitted&&<div className="mt-5 rounded-xl bg-emerald-50 p-4 dark:bg-emerald-500/10"><p className="text-sm font-extrabold text-emerald-700 dark:text-emerald-300">Correct. Meticulous means very careful and thorough.</p></div>}<div className="mt-6 flex justify-end">{submitted?<Button onClick={()=>go('results')}>Finish Blitz <ArrowRight size={16}/></Button>:<Button disabled={!selected} onClick={()=>setSubmitted(true)}>Check <Check size={16}/></Button>}</div></Card></div>;
}

function Blitz({go}:{go:(s:Screen)=>void}) {
  return <div className="space-y-6"><PageHead eyebrow="Fast practice" title="Blitz Mode" subtitle="Train speed, recognition and decision-making in short bursts."/><Card className="p-5"><div className="flex items-center justify-between"><div><p className="text-sm font-extrabold">Keep your momentum.</p><p className="mt-1 text-xs text-slate-400">Current best streak: 12</p></div><div className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10"><Zap/></div></div><Button onClick={()=>go('blitzSetup')} className="mt-6 w-full">Set up Blitz <ArrowRight size={16}/></Button></Card></div>;
}

function CBTSetup({go}:{go:(s:Screen)=>void}) {
  return <div className="space-y-6"><PageHead eyebrow="Exam simulation" title="CBT Practice" subtitle="Simulate the real JAMB experience with timed past questions."/><Card className="p-5"><div className="mb-6 flex items-center gap-2 text-[10px] font-bold">{['1 Setup','2 Subjects','3 Review'].map((x,i)=><React.Fragment key={x}><span className={cx('rounded-full px-3 py-1',i===0?'bg-blue-600 text-white':'bg-slate-100 text-slate-400 dark:bg-white/5')}>{x}</span>{i<2&&<ChevronRight size={13} className="text-slate-300"/>}</React.Fragment>)}</div><FieldTitle title="Select exam type"/><div className="space-y-2">{[['JAMB (UTME)','Full CBT experience'],['Post-UTME','Institution past questions'],['Custom Practice','Choose subjects and topics']].map(([a,b],i)=><button key={a} className={cx('flex w-full items-center rounded-xl border p-3 text-left',i===0?'border-blue-500 bg-blue-50 dark:bg-blue-500/10':'border-slate-200 dark:border-white/[.08]')}><div className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15"><GraduationCap size={18}/></div><div className="ml-3"><p className="text-xs font-extrabold">{a}</p><p className="mt-1 text-[10px] text-slate-400">{b}</p></div>{i===0&&<Check className="ml-auto text-blue-600" size={17}/>}</button>)}</div><FieldTitle title="Number of questions" className="mt-6"/><div className="grid grid-cols-3 gap-2">{['50','100','180'].map((x,i)=><button key={x} className={cx('rounded-xl border py-3 text-xs font-bold',i===0?'border-blue-500 text-blue-600':'border-slate-200 text-slate-500 dark:border-white/[.08]')}>{x}</button>)}</div><FieldTitle title="Time limit" className="mt-6"/><button className="flex w-full items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-bold dark:border-white/[.08]"><span className="flex items-center gap-2"><Timer size={17} className="text-blue-600"/>60 mins</span><ChevronRight size={16} className="text-slate-400"/></button><Button onClick={()=>go('cbtActive')} className="mt-5 w-full">Next <ArrowRight size={16}/></Button></Card></div>;
}

function CBTResult({go}:{go:(s:Screen)=>void}) {
  return <div className="space-y-6"><PageHead eyebrow="CBT Result" title="Here's how you performed" subtitle="Your mock exam is complete. Review the result, then choose your next move."/><Results go={go}/></div>;
}

function Tutor() {
  return <div className="space-y-5"><PageHead eyebrow="SABI AI" title="AI Tutor" subtitle="Ask questions, get simple explanations, solve questions and learn with examples."/><Card className="p-4"><div className="flex gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-500/15"><Bot size={18}/></div><div className="rounded-xl bg-slate-50 p-3 text-xs leading-5 dark:bg-white/5">Hello! I'm your SABI Tutor. Ask me anything about your subjects. I can explain concepts, solve questions and give examples.</div></div><div className="mt-4 rounded-xl bg-blue-50 p-3 text-xs font-semibold dark:bg-blue-500/10">Explain photosynthesis in simple terms.</div><div className="mt-4 rounded-xl bg-slate-50 p-4 text-xs leading-5 dark:bg-white/5">Photosynthesis is the process by which green plants make their own food using sunlight, water and carbon dioxide.</div><div className="mt-5 flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2.5 dark:border-white/[.08]"><MessageCircle size={16} className="text-slate-400"/><span className="text-xs text-slate-400">Ask a question...</span><button className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-white"><ArrowRight size={15}/></button></div></Card></div>;
}

function Profile({go}:{go:(s:Screen)=>void}) {
  const rows=[['My Profile','View and edit your details',UserRound],['Learning Goals','Set your targets',Target],['Appearance','Light & dark mode',Sun],['Notifications','Manage your alerts',Bell],['Download Resources','Access offline content',Download],['Help & Support','Get help',CircleHelp],['Rate SABI','Tell us what you think',Trophy],['About SABI','Version 1.0.0',Info]] as const;
  return <div className="space-y-5"><PageHead eyebrow="Account" title="Profile & Settings" subtitle="Manage your account and learning preferences."/><Card className="p-4"><div className="flex items-center gap-3"><div className="grid h-14 w-14 place-items-center rounded-full bg-blue-100 font-extrabold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">AO</div><div className="min-w-0"><p className="font-display font-extrabold">David Ekong</p><p className="text-xs text-slate-400">UTME Candidate</p><p className="mt-1 truncate text-[10px] text-slate-400">davidekong@gmail.com</p></div><ChevronRight className="ml-auto text-slate-400" size={18}/></div></Card><Card className="divide-y divide-slate-100 dark:divide-white/[.06]">{rows.map(([a,b,Icon])=><button key={a} onClick={()=>a==='Appearance'?go('settings'):undefined} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 dark:hover:bg-white/5"><div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-50 text-blue-600 dark:bg-white/5"><Icon size={17}/></div><div className="min-w-0 flex-1"><p className="text-xs font-extrabold">{a}</p><p className="mt-1 text-[10px] text-slate-400">{b}</p></div><ChevronRight size={15} className="text-slate-300"/></button>)}</Card><Button variant="outline" className="w-full text-red-600"><LogOut size={16}/>Log Out</Button></div>;
}

function SettingsScreen({theme,setTheme,go}:{theme:Theme;setTheme:(t:Theme)=>void;go:(s:Screen)=>void}) {
  return <div className="space-y-5"><Back onClick={()=>go('profile')}/><PageHead eyebrow="Appearance" title="Make SABI yours" subtitle="Choose the environment that feels right for your study."/><Card className="p-5"><p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Theme</p><div className="mt-4 grid grid-cols-2 gap-3">{([['light','Light mode',Sun],['dark','Dark mode',Moon]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>setTheme(id)} className={cx('rounded-xl border p-4 text-left',theme===id?'border-blue-500 bg-blue-50 dark:bg-blue-500/10':'border-slate-200 dark:border-white/[.08]')}><Icon size={20} className={theme===id?'text-blue-600':'text-slate-400'}/><p className="mt-4 text-sm font-extrabold">{label}</p><p className="mt-1 text-[10px] text-slate-400">{id==='light'?'Bright and readable':'Focused and immersive'}</p></button>)}</div></Card><Card className="p-5"><div className="flex gap-3"><ShieldCheck className="text-blue-600"/><div><p className="text-sm font-extrabold">Designed for both environments</p><p className="mt-1 text-xs leading-5 text-slate-400">SABI keeps the same structure and learning flow in both themes. The choice changes the visual environment, not the experience.</p></div></div></Card></div>;
}

function PageHead({eyebrow,title,subtitle}:{eyebrow:string;title:string;subtitle:string}) {
  return <div><p className="text-xs font-extrabold uppercase tracking-wider text-blue-600">{eyebrow}</p><h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">{subtitle}</p></div>;
}

function Back({onClick}:{onClick:()=>void}) {
  return <button onClick={onClick} className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-blue-600"><ArrowLeft size={15}/>Back</button>;
}

function FieldTitle({title,className='' }:{title:string;className?:string}) { return <p className={cx('mb-3 text-xs font-extrabold text-slate-600 dark:text-slate-300',className)}>{title}</p>; }

export default function SabiMobileApp() {
  const [screen,setScreen]=useState<Screen>('home');
  const [theme,setTheme]=useState<Theme>('light');
  const [mobileOpen,setMobileOpen]=useState(false);

  const go=(next:Screen)=>{setScreen(next);setMobileOpen(false);window.scrollTo({top:0,behavior:'smooth'});};

  const content = useMemo(() => {
    switch(screen) {
      case 'home': return <Home go={go}/>;
      case 'practice': return <Practice go={go}/>;
      case 'smart': return <Smart go={go}/>;
      case 'question': return <Question go={go}/>;
      case 'results': return <Results go={go}/>;
      case 'progress': return <Progress go={go}/>;
      case 'blitz': return <Blitz go={go}/>;
      case 'blitzActive': return <BlitzActive go={go}/>;
      case 'blitzSetup': return <BlitzSetup go={go}/>;
      case 'cbt': return <CBTSetup go={go}/>;
      case 'cbtActive': return <Question go={go} cbt/>;
      case 'cbtResult': return <CBTResult go={go}/>;
      case 'tutor': return <Tutor/>;
      case 'profile': return <Profile go={go}/>;
      case 'settings': return <SettingsScreen theme={theme} setTheme={setTheme} go={go}/>;
      default: return <Home go={go}/>;
    }
  }, [screen, theme]);

  return <div className={cx(theme==='dark' && 'dark', 'min-h-screen bg-[#F8FAFC] text-[#0A1128] dark:bg-[#081225] dark:text-slate-100')}>
    <div className="flex min-h-screen">
      <DesktopNav active={screen} go={go}/>
      {mobileOpen && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" onClick={()=>setMobileOpen(false)} className="absolute inset-0 bg-slate-950/50"/><div className="absolute left-0 top-0 h-full w-72 bg-white p-5 dark:bg-[#0b1629]"><div className="flex items-center justify-between"><Logo/><button onClick={()=>setMobileOpen(false)}><X/></button></div><nav className="mt-8 space-y-1">{[['home','Home'],['practice','Practice'],['blitz','Blitz'],['cbt','CBT'],['progress','Progress'],['tutor','AI Tutor'],['profile','Profile'],['settings','Settings']].map(([id,label])=><button key={id} onClick={()=>go(id as Screen)} className="flex w-full items-center rounded-xl px-3 py-3 text-left text-sm font-bold hover:bg-slate-50 dark:hover:bg-white/5">{label}</button>)}</nav></div></div>}
      <main className="min-w-0 flex-1">
        <TopHeader onMenu={()=>setMobileOpen(true)} onProfile={()=>go('profile')} onBell={()=>{}}/>
        <div className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 lg:px-10 lg:pb-10">{content}</div>
      </main>
    </div>
    <BottomNav active={screen} go={go}/>
  </div>;
}
