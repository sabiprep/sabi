import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowUp, BrainCircuit, CheckCircle2, CircleHelp, LoaderCircle, LockKeyhole, MessageCircle, RotateCcw, ShieldCheck, Sparkles, XCircle } from 'lucide-react';
import { apiFetch, apiPostJson, describeApiFailure } from '../utils/apiClient';
import { supabase } from '../lib/supabase';
import { useTheme } from '../app/ThemeProvider';
import MathText from '../components/MathText';

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  model?: string;
};

const STARTERS = [
  'Explain a difficult concept step by step.',
  'Help me revise a topic in Physics.',
  'Show me how to solve a JAMB calculation question.',
];

function unavailableMessage(reason?: string) {
  switch (reason) {
    case 'AI_CONSENT_REQUIRED': return 'Enable AI tutoring consent before sending a message.';
    case 'AI_DISABLED': return 'Sabi AI is currently switched off. Your learning records remain available.';
    case 'AI_PROVIDER_NOT_CONFIGURED': return 'The AI service has not been configured by the Sabi team yet.';
    case 'AI_CREDITS_EXHAUSTED': return 'Your available AI credits have been used. Check your subscription or contact Sabi support.';
    case 'AI_CREDIT_PRICING_NOT_CONFIGURED': return 'AI credit pricing is not configured yet. Please try again later.';
    case 'AI_PROVIDER_FAILED': return 'The AI provider could not complete this response. Your request was not charged.';
    case 'CBT_AI_LOCKED': return 'AI tutoring is unavailable during an active CBT. Finish the exam before requesting help.';
    default: return 'Sabi AI Coach is temporarily unavailable. Please try again shortly.';
  }
}

export function AICoachPage() {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [registeredSubjects, setRegisteredSubjects] = useState<string[]>([]);
  const [consent, setConsent] = useState<boolean | null>(null);
  const [creditsEnabled, setCreditsEnabled] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const [consentResponse, creditsResponse, userResult] = await Promise.all([
        apiFetch('/api/ai/consent'),
        apiFetch('/api/ai/credits'),
        supabase.auth.getUser(),
      ]);
      const profileResponse = userResult.data.user
        ? await supabase.from('profiles').select('registered_subjects').eq('id', userResult.data.user.id).maybeSingle()
        : { data: null, error: null };
      const consentData = await consentResponse.json().catch(() => ({}));
      const creditData = await creditsResponse.json().catch(() => ({}));
      if (!active) return;
      if (consentResponse.ok) setConsent(consentData.granted === true);
      else setError(consentData.error || 'Your AI preference could not be checked.');
      if (creditsResponse.ok) setCreditsEnabled(Boolean(creditData.enabled));
      if (!profileResponse.error && Array.isArray(profileResponse.data?.registered_subjects)) {
        const subjects = profileResponse.data.registered_subjects.filter((value: unknown): value is string => typeof value === 'string');
        setRegisteredSubjects(subjects);
        setSubject(subjects[0] || '');
      }
      setLoading(false);
    })().catch(() => {
      if (active) {
        setError('Sabi AI settings could not be loaded. Please refresh and try again.');
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const saveConsent = async (granted: boolean) => {
    setBusy(true); setError('');
    const result = await apiPostJson('/api/ai/consent', { granted });
    if (!result.ok) {
      setError(describeApiFailure(result, 'Your AI preference could not be saved.'));
      setBusy(false);
      return;
    }
    setConsent(granted);
    if (!granted) setMessages([]);
    setBusy(false);
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || busy || !consent) return;
    if (text.length > 4000) {
      setError('Keep each message under 4,000 characters.');
      return;
    }
    const nextMessages: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setDraft('');
    setBusy(true);
    setError('');

    const result = await apiPostJson('/api/ai/chat', {
      messages: nextMessages.slice(-12).map(({ role, content }) => ({ role, content: content.slice(-4000) })),
      ...(subject ? { subject } : {}),
      ...(topic.trim() ? { topic: topic.trim() } : {}),
    });

    if (!result.ok) {
      if (result.data?.reason === 'AI_CONSENT_REQUIRED') setConsent(false);
      setError(result.data?.reason
        ? unavailableMessage(result.data.reason)
        : describeApiFailure(result, 'Sabi could not answer that message.'));
      setBusy(false);
      return;
    }
    if (result.data?.aiAvailable !== true || typeof result.data?.reply !== 'string') {
      setError(unavailableMessage(result.data?.reason));
      setBusy(false);
      return;
    }
    setMessages(previous => [...previous, {
      role: 'assistant',
      content: result.data.reply,
      provider: result.data.provider,
      model: result.data.model,
    }]);
    setBusy(false);
  };

  const surface = isDark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-7rem)] max-w-5xl flex-col gap-5 pb-20 lg:pb-0">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.18em] text-blue-600"><BrainCircuit size={15}/> Personal AI tutor</span>
          <h1 className="mt-2 text-3xl font-black">Sabi AI Coach</h1>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>Ask questions, understand difficult concepts and practise your reasoning with explanations grounded in Sabi's approved learning resources.</p>
        </div>
        <button type="button" onClick={() => { setMessages([]); setError(''); }} disabled={!messages.length || busy} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold disabled:opacity-40 dark:border-slate-700"><RotateCcw size={14}/> Clear chat</button>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200">{error}</div>}

      {loading ? (
        <section className={`rounded-2xl border p-6 text-sm ${surface} ${muted}`}>Checking your AI preferences…</section>
      ) : consent !== true ? (
        <section className={`rounded-3xl border p-5 sm:p-7 ${surface}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><ShieldCheck size={24}/></div>
          <h2 className="mt-4 text-xl font-black">Choose whether to enable AI tutoring</h2>
          <p className={`mt-2 max-w-2xl text-sm leading-6 ${muted}`}>When you enable AI Coach, the messages you send and the subject or topic you select are processed by Sabi's configured AI provider to generate tutoring responses. Sabi may also use your registered subjects and saved learning progress to provide relevant context.</p>
          <p className={`mt-3 text-xs leading-5 ${muted}`}>Do not send passwords, payment details or other sensitive personal information. You can revoke this permission from this page at any time.</p>
          <button type="button" onClick={() => void saveConsent(true)} disabled={busy} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50">{busy?<LoaderCircle size={16} className="animate-spin"/>:<CheckCircle2 size={16}/>}Enable AI Coach</button>
          <p className={`mt-3 text-xs ${muted}`}>AI tutoring is optional. You can continue using Sabi's non-AI learning features without enabling it.</p>
        </section>
      ) : (
        <>
          <section className={`grid gap-3 rounded-2xl border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end ${surface}`}>
            <label className="space-y-2 text-xs font-bold">Subject context
              <select value={subject} onChange={event=>setSubject(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700">
                <option value="">No specific subject</option>
                {(registeredSubjects.length?registeredSubjects:['Use of English','Mathematics','Physics','Chemistry','Biology']).map(item=><option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="space-y-2 text-xs font-bold">Topic (optional)
              <input value={topic} onChange={event=>setTopic(event.target.value)} maxLength={160} placeholder="e.g. Newton's laws of motion" className="w-full rounded-xl border border-slate-200 bg-transparent p-3 text-sm dark:border-slate-700"/>
            </label>
            <button type="button" onClick={()=>void saveConsent(false)} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300"><XCircle size={15}/> Revoke AI consent</button>
          </section>

          <section aria-label="AI Coach conversation" className={`flex min-h-[360px] flex-1 flex-col rounded-3xl border ${surface}`}>
            <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white"><Sparkles size={19}/></div>
              <div><h2 className="text-sm font-black">Your study conversation</h2><p className={`text-xs ${muted}`}>Recent context (up to 12 messages) is sent with each request. This chat is not saved as a learning session.</p></div>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
              {!messages.length && <div className="mx-auto max-w-xl py-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><MessageCircle size={25}/></div>
                <h3 className="mt-4 text-lg font-black">What would you like to understand?</h3>
                <p className={`mt-2 text-sm ${muted}`}>Ask for a concept explanation, a worked example or a revision plan.</p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">{STARTERS.map(item=><button key={item} type="button" onClick={()=>setDraft(item)} className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">{item}</button>)}</div>
              </div>}
              {messages.map((message,index)=><div key={index} className={`flex ${message.role==='user'?'justify-end':'justify-start'}`}>
                <article className={`max-w-[92%] rounded-2xl p-4 sm:max-w-[82%] ${message.role==='user'?'bg-blue-600 text-white':'bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100'}`}>
                  <div className="text-sm leading-7 [&_strong]:!text-inherit [&_em]:!text-inherit"><MathText text={message.content}/></div>
                  {message.provider&&<p className="mt-2 text-[10px] opacity-60">Sabi AI · {message.provider}{message.model? ` / ${message.model}`:''}</p>}
                </article>
              </div>)}
              {busy&&<div className="flex justify-start"><div className="inline-flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs text-slate-500 dark:bg-slate-950"><LoaderCircle size={15} className="animate-spin"/> Sabi is thinking…</div></div>}
              <div ref={endRef}/>
            </div>
            <form onSubmit={sendMessage} className="border-t border-slate-100 p-3 sm:p-4 dark:border-slate-800">
              <div className="flex items-end gap-2">
                <textarea value={draft} onChange={event=>setDraft(event.target.value)} rows={2} maxLength={4000} placeholder="Ask Sabi to explain something…" disabled={busy} className="min-h-12 flex-1 resize-y rounded-xl border border-slate-200 bg-transparent p-3 text-sm outline-none focus:border-blue-500 disabled:opacity-60 dark:border-slate-700"/>
                <button type="submit" disabled={busy||!draft.trim()} aria-label="Send message" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-40"><ArrowUp size={20}/></button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3"><p className={`text-[10px] ${muted}`}>{draft.length}/4,000 characters · AI responses may need verification</p>{creditsEnabled&&<span className="inline-flex items-center gap-1 text-[10px] text-amber-600"><LockKeyhole size={11}/> Credit controls active</span>}</div>
            </form>
          </section>
        </>
      )}

      <p className={`flex items-start gap-2 text-xs leading-5 ${muted}`}><CircleHelp size={14} className="mt-0.5 shrink-0"/> Sabi AI helps you learn; it does not change official answer keys, exam scores or your saved mastery records.</p>
    </main>
  );
}
