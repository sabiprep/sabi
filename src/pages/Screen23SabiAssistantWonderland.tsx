import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  Gem,
  Globe,
  Lock,
  MessageSquare,
  RotateCcw,
  Send,
  Target,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SabiAppChrome, SabiMenuTriggerButton } from '../components/common/SabiAppChrome';
import { SabiBrandEmblem } from '../components/common/SabiBrandEmblem';
import { apiPostJson } from '../utils/apiClient';
import {
  AI_CREDIT_COST_PER_REPLY,
  appendAssistantMessage,
  buildAssistantStarterPrompts,
  clearAssistantConversation,
  consumeAssistantCredit,
  getAssistantCreditState,
  loadAssistantLanguage,
  loadAssistantMessages,
  loadTopicMemory,
  saveAssistantLanguage,
  saveTopicMemory,
  type AssistantChatMessage,
  type AssistantLanguage,
  type AssistantStarterPrompt,
} from '../utils/sabiAssistantStore';
import { getWonderlandDashboardState } from '../utils/wonderlandStudentState';
import { sound } from '../utils/soundEffects';

interface ChatErrorBanner {
  kind: 'auth' | 'credits' | 'server';
  message: string;
  retryPrompt?: string;
}

/**
 * Renders assistant text cleanly as structured paragraphs & bullet lists
 * without raw HTML injection.
 */
function SafeAssistantMessageBody({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-[14px] sm:text-[14.5px] font-semibold leading-relaxed text-[#260559] break-words">
      {blocks.map((block, bIdx) => {
        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const isList = lines.length > 1 && lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));

        if (isList) {
          return (
            <ul key={bIdx} className="space-y-1.5 pl-1">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#6C19E5] shrink-0" />
                  <span>{line.replace(/^([-*•]|\d+[.)])\s+/, '')}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={bIdx} className="whitespace-pre-line">
            {block}
          </p>
        );
      })}
    </div>
  );
}

/**
 * Screen 23: SABI Assistant Chat Screen (`/assistant`)
 * Full SABI Wonderland AI Q&A tutor wired to authenticated `/api/chat` and the real
 * AI Credits / Diamonds store (Subscription Diamonds primary, XP Assistance Diamonds spent first).
 */
export function Screen23SabiAssistantWonderland() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const dashboard = useMemo(() => getWonderlandDashboardState(), []);
  const subjectOptions = useMemo(
    () => [
      { canonicalName: 'All Subjects', displayLabel: 'All 4 Subjects', shortCode: 'ALL' },
      ...dashboard.subjects.map((s) => ({
        canonicalName: s.canonicalName,
        displayLabel: s.displayLabel,
        shortCode: s.shortCode,
      })),
    ],
    [dashboard.subjects]
  );

  const querySubject = searchParams.get('subject') || '';
  const queryTopic = searchParams.get('topic') || '';

  const initialSubject = useMemo(() => {
    if (!querySubject) return 'All Subjects';
    const match = subjectOptions.find(
      (s) => s.canonicalName.toLowerCase() === querySubject.toLowerCase()
    );
    return match ? match.canonicalName : 'All Subjects';
  }, [querySubject, subjectOptions]);

  const [selectedSubject, setSelectedSubject] = useState<string>(initialSubject);
  const [activeTopic, setActiveTopic] = useState<string>(queryTopic.trim());
  const [language, setLanguage] = useState<AssistantLanguage>(() => loadAssistantLanguage());
  const [messages, setMessages] = useState<AssistantChatMessage[]>(() => loadAssistantMessages());
  const [creditState, setCreditState] = useState(() => getAssistantCreditState());
  const [inputText, setInputText] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<ChatErrorBanner | null>(null);
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setSelectedSubject(initialSubject);
    if (queryTopic.trim()) {
      setActiveTopic(queryTopic.trim());
    }
  }, [initialSubject, queryTopic]);

  useEffect(() => {
    const syncCredits = () => setCreditState(getAssistantCreditState());
    window.addEventListener('sabi-progress-updated', syncCredits);
    return () => window.removeEventListener('sabi-progress-updated', syncCredits);
  }, []);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, isSending]);

  const starterPrompts = useMemo(
    () => buildAssistantStarterPrompts(selectedSubject, activeTopic || undefined),
    [selectedSubject, activeTopic]
  );

  const handleLanguageChange = (nextLang: AssistantLanguage) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setLanguage(nextLang);
    saveAssistantLanguage(nextLang);
  };

  const handleSubjectSelect = (canonicalName: string) => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
    setSelectedSubject(canonicalName);
    if (canonicalName === 'All Subjects') {
      setActiveTopic('');
      setSearchParams({});
    } else {
      setSearchParams({ subject: canonicalName });
    }
  };

  const handleClearTopic = () => {
    setActiveTopic('');
    if (selectedSubject !== 'All Subjects') {
      setSearchParams({ subject: selectedSubject });
    } else {
      setSearchParams({});
    }
  };

  const sendQuestion = async (rawQuestion: string, overrideSubject?: string, overrideTopic?: string) => {
    const trimmed = rawQuestion.trim();
    if (!trimmed || isSending) return;

    const latestCredits = getAssistantCreditState();
    setCreditState(latestCredits);

    if (!latestCredits.hasEnoughCredits) {
      setErrorBanner({
        kind: 'credits',
        message:
          'You have 0 AI Credits left. Top up with a Subscription plan or earn limited Assistance Diamonds (250 XP = +1 Diamond, up to 3/day) in Practice Hub.',
      });
      return;
    }

    const effectiveSubject = overrideSubject || selectedSubject;
    const effectiveTopic = overrideTopic ?? activeTopic;

    if (overrideSubject && overrideSubject !== selectedSubject) {
      setSelectedSubject(overrideSubject);
    }
    if (overrideTopic) {
      setActiveTopic(overrideTopic);
    }

    setErrorBanner(null);
    setConfirmClear(false);

    const userMsg: AssistantChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      text: trimmed,
      subject: effectiveSubject,
      topic: effectiveTopic || undefined,
      createdAt: new Date().toISOString(),
    };

    const nextHistory = appendAssistantMessage(userMsg);
    setMessages(nextHistory);
    setInputText('');
    setIsSending(true);

    try {
      sound.playTap();
    } catch {
      // ignore
    }

    const scopeKey = `${effectiveSubject}::${effectiveTopic || 'general'}`;
    const rollingMemory = loadTopicMemory(scopeKey);

    const payloadMessages = nextHistory.slice(-12).map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const result = await apiPostJson('/api/chat', {
      messages: payloadMessages,
      ...(effectiveSubject !== 'All Subjects' ? { currentSubject: effectiveSubject } : {}),
      ...(effectiveTopic ? { currentTopic: effectiveTopic } : {}),
      studentProfile: {
        name: dashboard.firstName,
        chosenSubjects: dashboard.subjects.map((s) => s.canonicalName),
        languagePreference: language,
        explanationPreference: 'detailed',
      },
      ...(rollingMemory ? { topicMemory: rollingMemory } : {}),
    });

    setIsSending(false);

    if (!result.ok) {
      if (result.status === 401) {
        setErrorBanner({
          kind: 'auth',
          message:
            'Sign in to your SABI account to ask SABI Assistant live questions. No AI Credit was deducted.',
          retryPrompt: trimmed,
        });
        return;
      }

      const serverMsg =
        typeof result.data?.error === 'string' && result.data.error.trim()
          ? result.data.error.trim()
          : 'Could not reach SABI Assistant right now. Please try again — no AI Credit was charged.';
      setErrorBanner({
        kind: 'server',
        message: serverMsg,
        retryPrompt: trimmed,
      });
      return;
    }

    const replyText =
      typeof result.data?.reply === 'string' && result.data.reply.trim()
        ? result.data.reply.trim()
        : '';

    if (!replyText) {
      setErrorBanner({
        kind: 'server',
        message: 'SABI Assistant returned an empty answer. Please retry — no AI Credit was charged.',
        retryPrompt: trimmed,
      });
      return;
    }

    // Deduct 1 AI Credit ONLY after receiving a real reply (Assistance Diamonds consumed first).
    const deduction = consumeAssistantCredit();
    setCreditState(getAssistantCreditState());

    if (typeof result.data?.topicMemoryUpdate === 'string' && result.data.topicMemoryUpdate.trim()) {
      saveTopicMemory(scopeKey, result.data.topicMemoryUpdate);
    }

    const assistantMsg: AssistantChatMessage = {
      id: `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'assistant',
      text: replyText,
      subject: effectiveSubject,
      topic: effectiveTopic || undefined,
      createdAt: new Date().toISOString(),
      creditSource: deduction.source || undefined,
    };

    setMessages(appendAssistantMessage(assistantMsg));
  };

  const handleStarterClick = (starter: AssistantStarterPrompt) => {
    if (creditState.hasEnoughCredits) {
      void sendQuestion(starter.prompt, starter.subject, starter.topic);
    } else {
      setInputText(starter.prompt);
      setSelectedSubject(starter.subject);
      if (starter.topic) setActiveTopic(starter.topic);
      setErrorBanner({
        kind: 'credits',
        message:
          'You need 1 AI Credit to send this question. Top up your Subscription Diamonds or earn a limited Assistance Diamond in Practice Hub.',
      });
      inputRef.current?.focus();
    }
  };

  const handleClearChat = () => {
    clearAssistantConversation();
    setMessages([]);
    setConfirmClear(false);
    setErrorBanner(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendQuestion(inputText);
    }
  };

  const xpProgressPct = Math.min(
    100,
    Math.round((creditState.xpTowardNextDiamond / creditState.xpPerAssistanceDiamond) * 100)
  );

  return (
    <SabiAppChrome
      activeTab="assistant"
      backdropVariant="home"
      streakDays={dashboard.streakDays}
      xpBalance={dashboard.xpBalance}
    >
      <main className="w-full max-w-[1160px] mx-auto px-3.5 sm:px-6 lg:px-8 pt-3.5 sm:pt-5 lg:pt-6 pb-4 flex-1 flex flex-col">
        {/* TOP HEADER */}
        <header className="flex items-center justify-between gap-2.5 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label="Back to Home"
              className="w-[42px] h-[42px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer active:translate-y-[1px]"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.7} />
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-[8px] bg-[#6C19E5] text-[#FFE824] shrink-0">
                  <SabiBrandEmblem size={15} strokeWidth={2.4} />
                </span>
                <h1
                  className="text-[22px] sm:text-[26px] font-bold text-[#260559] leading-none truncate"
                  style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                >
                  SABI Assistant
                </h1>
              </div>
              <p className="mt-1 text-[12.5px] sm:text-[13.5px] font-semibold text-[#3C2263] truncate">
                Ask any JAMB question across your 4 subjects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/subscriptions')}
              aria-label={`${creditState.totalCredits} AI Credits available`}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 rounded-full bg-white text-[#260559] font-extrabold text-[13px] sm:text-[14px] tabular-nums cursor-pointer active:translate-y-[1px] whitespace-nowrap"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <Gem size={15} className="text-[#711AE3] shrink-0" />
              <span>{creditState.totalCredits}</span>
              <span className="hidden sm:inline text-[12px] font-bold text-[#5A467A]">Credits</span>
            </button>

            <SabiMenuTriggerButton />
          </div>
        </header>

        {/* RESPONSIVE BODY: 8-col Chat Workspace + 4-col Credits & Weak-Topic Rail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start flex-1">
          {/* LEFT / MAIN CHAT COLUMN */}
          <section className="lg:col-span-8 flex flex-col gap-3.5">
            {/* CONTEXT BAR: Subject Chips + Language Toggle */}
            <div
              className="bg-white rounded-[20px] p-3.5 sm:p-4 space-y-3"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A]">
                  Subject Focus
                </span>

                {/* Standard English vs Naija Pidgin Toggle */}
                <div className="inline-flex items-center rounded-[12px] bg-[#F3EEFD] p-1">
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('english')}
                    className={`px-2.5 py-1 rounded-[9px] text-[11.5px] font-extrabold inline-flex items-center gap-1 transition-colors cursor-pointer ${
                      language === 'english'
                        ? 'bg-[#6C19E5] text-white'
                        : 'text-[#4F3B73] hover:text-[#260559]'
                    }`}
                  >
                    <Globe size={12} />
                    <span>Standard English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLanguageChange('pidgin')}
                    className={`px-2.5 py-1 rounded-[9px] text-[11.5px] font-extrabold transition-colors cursor-pointer ${
                      language === 'pidgin'
                        ? 'bg-[#6C19E5] text-white'
                        : 'text-[#4F3B73] hover:text-[#260559]'
                    }`}
                  >
                    Naija Pidgin
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
                {subjectOptions.map((subj) => {
                  const isActive = selectedSubject === subj.canonicalName;
                  return (
                    <button
                      key={subj.canonicalName}
                      type="button"
                      onClick={() => handleSubjectSelect(subj.canonicalName)}
                      className={`px-3.5 py-2 rounded-[13px] text-[12.5px] font-extrabold whitespace-nowrap transition-transform active:translate-y-[1px] cursor-pointer ${
                        isActive
                          ? 'bg-[#6C19E5] text-[#FFE824] shadow-[0_3px_0_#46099E]'
                          : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FE]'
                      }`}
                    >
                      {subj.displayLabel}
                    </button>
                  );
                })}
              </div>

              {activeTopic && (
                <div className="flex items-center justify-between gap-2 rounded-[12px] bg-[#FFF8EB] border border-[#FED7AA] px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Target size={14} className="text-[#C2410C] shrink-0" />
                    <span className="text-[12.5px] font-extrabold text-[#9A3412] truncate">
                      Focused Topic: {activeTopic}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearTopic}
                    aria-label="Clear focused topic"
                    className="p-1 rounded-md text-[#9A3412] hover:bg-[#FFEDD5] cursor-pointer shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* CHAT TRANSCRIPT + DOCKED COMPOSER */}
            <div
              className="bg-white rounded-[24px] flex flex-col overflow-hidden"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              {/* Chat Header Strip */}
              <div className="px-4 sm:px-5 py-3 border-b border-[#F1ECFA] flex items-center justify-between gap-2 bg-[#FCF9FF]">
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare size={16} className="text-[#6C19E5] shrink-0" />
                  <span className="text-[13.5px] font-extrabold text-[#260559] truncate">
                    {selectedSubject === 'All Subjects'
                      ? '4-Subject JAMB Study Chat'
                      : `${selectedSubject} Tutor`}
                  </span>
                </div>

                {messages.length > 0 && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {confirmClear ? (
                      <>
                        <button
                          type="button"
                          onClick={handleClearChat}
                          className="px-2.5 py-1 rounded-[10px] bg-[#DC2626] text-white text-[11.5px] font-extrabold cursor-pointer"
                        >
                          Clear now
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmClear(false)}
                          className="px-2.5 py-1 rounded-[10px] bg-[#F3EEFD] text-[#260559] text-[11.5px] font-extrabold cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmClear(true)}
                        className="px-2.5 py-1 rounded-[10px] text-[#6E5C91] hover:bg-[#F3EEFD] hover:text-[#260559] text-[12px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Scrollable Message List */}
              <div className="p-4 sm:p-5 space-y-4 min-h-[340px] max-h-[54dvh] lg:max-h-[56dvh] overflow-y-auto select-text">
                {messages.length === 0 ? (
                  <div className="py-2 sm:py-4 space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-[15px] bg-[#6C19E5] text-[#FFE824] flex items-center justify-center shrink-0 shadow-[0_3px_0_#46099E]">
                        <SabiBrandEmblem size={22} strokeWidth={2.4} />
                      </div>
                      <div className="min-w-0">
                        <h2
                          className="text-[18px] sm:text-[20px] font-bold text-[#260559] leading-tight"
                          style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                        >
                          {language === 'pidgin'
                            ? `Oya ${dashboard.firstName}, wetin you wan make we solve?`
                            : `Ask SABI anything about your JAMB subjects, ${dashboard.firstName}`}
                        </h2>
                        <p className="mt-1 text-[13.5px] font-semibold text-[#5A467A] leading-relaxed">
                          Paste any JAMB past question, ask for a formula breakdown, or tap a
                          suggested prompt below. Each AI reply uses {AI_CREDIT_COST_PER_REPLY}{' '}
                          Credit (Assistance Diamonds are spent first).
                        </p>
                      </div>
                    </div>

                    {/* Starter Prompt Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {starterPrompts.map((starter) => (
                        <button
                          key={starter.id}
                          type="button"
                          onClick={() => handleStarterClick(starter)}
                          className="rounded-[16px] bg-[#F8F5FF] hover:bg-[#F0E8FF] border border-[#E5D7FA] p-3.5 text-left transition-transform active:translate-y-[1px] cursor-pointer"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className={`text-[10.5px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                starter.isWeakTopic
                                  ? 'bg-[#FFF0E0] text-[#C2410C]'
                                  : 'bg-[#EFE6FF] text-[#6C19E5]'
                              }`}
                            >
                              {starter.isWeakTopic ? 'WEAK TOPIC' : starter.subject}
                            </span>
                            <ArrowRight size={14} className="text-[#6C19E5] shrink-0" />
                          </div>
                          <div className="text-[13.5px] font-extrabold text-[#260559] leading-snug">
                            {starter.label}
                          </div>
                          <p className="mt-1 text-[12px] font-semibold text-[#5A467A] line-clamp-2">
                            {starter.prompt}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => {
                      const isUser = msg.role === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                        >
                          {isUser ? (
                            <div className="max-w-[88%] sm:max-w-[80%] rounded-[20px] rounded-br-[6px] bg-[#6C19E5] text-white px-4 py-3 shadow-[0_3px_0_#46099E]">
                              <div className="text-[11px] font-bold text-[#E6D5FF] mb-1">
                                {msg.subject}
                                {msg.topic ? ` · ${msg.topic}` : ''}
                              </div>
                              <p className="text-[14px] sm:text-[14.5px] font-semibold leading-relaxed whitespace-pre-line break-words">
                                {msg.text}
                              </p>
                            </div>
                          ) : (
                            <div className="flex items-start gap-2.5 max-w-[94%] sm:max-w-[86%]">
                              <div className="w-8 h-8 rounded-[11px] bg-[#2A085E] text-[#FFE824] flex items-center justify-center shrink-0 mt-0.5">
                                <SabiBrandEmblem size={16} strokeWidth={2.4} />
                              </div>
                              <div className="rounded-[20px] rounded-bl-[6px] bg-[#F7F3FF] border border-[#E5D7FA] px-4 py-3 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6C19E5]">
                                    SABI Assistant · {msg.subject}
                                  </span>
                                  {msg.creditSource && (
                                    <span className="text-[10.5px] font-bold text-[#6E5C91] whitespace-nowrap">
                                      1 {msg.creditSource === 'assistance' ? 'Assistance' : 'Plan'} Credit
                                    </span>
                                  )}
                                </div>
                                <SafeAssistantMessageBody text={msg.text} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {isSending && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-[11px] bg-[#2A085E] text-[#FFE824] flex items-center justify-center shrink-0">
                          <SabiBrandEmblem size={16} strokeWidth={2.4} />
                        </div>
                        <div className="rounded-[20px] rounded-bl-[6px] bg-[#F7F3FF] border border-[#E5D7FA] px-4 py-3">
                          <div className="flex items-center gap-2 text-[13px] font-extrabold text-[#6C19E5]">
                            <span className="inline-flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#6C19E5] animate-bounce" />
                              <span
                                className="w-2 h-2 rounded-full bg-[#6C19E5] animate-bounce"
                                style={{ animationDelay: '120ms' }}
                              />
                              <span
                                className="w-2 h-2 rounded-full bg-[#6C19E5] animate-bounce"
                                style={{ animationDelay: '240ms' }}
                              />
                            </span>
                            <span>SABI is solving your question...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* ACTIONABLE STATUS / ERROR BANNER */}
                {errorBanner && (
                  <div
                    role="alert"
                    className={`rounded-[18px] p-3.5 sm:p-4 border space-y-3 ${
                      errorBanner.kind === 'credits'
                        ? 'bg-[#FFF9EB] border-[#FCD34D]'
                        : errorBanner.kind === 'auth'
                        ? 'bg-[#F5F0FF] border-[#D8B4FE]'
                        : 'bg-[#FEF2F2] border-[#FECACA]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {errorBanner.kind === 'auth' ? (
                        <Lock size={18} className="text-[#6C19E5] shrink-0 mt-0.5" />
                      ) : errorBanner.kind === 'credits' ? (
                        <Gem size={18} className="text-[#B45309] shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle size={18} className="text-[#DC2626] shrink-0 mt-0.5" />
                      )}
                      <p className="text-[13px] sm:text-[13.5px] font-bold text-[#260559] leading-snug">
                        {errorBanner.message}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {errorBanner.kind === 'credits' && (
                        <>
                          <button
                            type="button"
                            onClick={() => navigate('/subscriptions')}
                            className="px-3.5 py-2 rounded-[12px] bg-[#6C19E5] text-white text-[12.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                            style={{ boxShadow: '0 3px 0 #46099E' }}
                          >
                            <Gem size={14} />
                            <span>Get Subscription Credits</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/practice')}
                            className="px-3.5 py-2 rounded-[12px] bg-white border border-[#E5D7FA] text-[#260559] text-[12.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Zap size={14} className="text-[#6C19E5]" />
                            <span>Earn XP in Practice Hub</span>
                          </button>
                        </>
                      )}

                      {errorBanner.kind === 'auth' && (
                        <button
                          type="button"
                          onClick={() => navigate('/auth/sign-in')}
                          className="px-4 py-2 rounded-[12px] bg-[#6C19E5] text-white text-[12.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                          style={{ boxShadow: '0 3px 0 #46099E' }}
                        >
                          <span>Sign In to Continue</span>
                          <ArrowRight size={14} />
                        </button>
                      )}

                      {errorBanner.kind === 'server' && errorBanner.retryPrompt && (
                        <button
                          type="button"
                          onClick={() => void sendQuestion(errorBanner.retryPrompt!)}
                          className="px-3.5 py-2 rounded-[12px] bg-[#2A085E] text-[#FFE824] text-[12.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Retry Question</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div ref={threadEndRef} />
              </div>

              {/* DOCKED COMPOSER */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendQuestion(inputText);
                }}
                className="p-3.5 sm:p-4 border-t border-[#F1ECFA] bg-[#FCF9FF] space-y-2"
              >
                <div className="flex items-end gap-2.5">
                  <textarea
                    ref={inputRef}
                    rows={2}
                    maxLength={1000}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={
                      language === 'pidgin'
                        ? 'Type your JAMB question or topic here (Enter to send)...'
                        : 'Ask any JAMB question, paste an equation, or request a worked solution...'
                    }
                    className="flex-1 resize-none rounded-[16px] bg-white border-[2px] border-[#E5D7FA] focus:border-[#6C19E5] focus:outline-none px-3.5 py-2.5 text-[14px] font-semibold text-[#260559] placeholder:text-[#8A77AE]"
                  />

                  <button
                    type="submit"
                    disabled={isSending || !inputText.trim()}
                    className="px-4 sm:px-5 h-[52px] rounded-[16px] bg-[#6C19E5] hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-[13.5px] inline-flex items-center justify-center gap-1.5 shrink-0 transition-transform active:translate-y-[1px] cursor-pointer"
                    style={{
                      fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                      boxShadow: '0 4px 0 #46099E',
                    }}
                  >
                    <Send size={16} />
                    <span className="hidden sm:inline">Ask</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11.5px] font-bold text-[#6E5C91] px-1">
                  <span className="inline-flex items-center gap-1.5">
                    <Gem size={12} className="text-[#6C19E5]" />
                    <span>
                      {AI_CREDIT_COST_PER_REPLY} Credit per reply · {creditState.totalCredits} left
                    </span>
                  </span>
                  <span className="tabular-nums">{inputText.length}/1000</span>
                </div>
              </form>
            </div>
          </section>

          {/* RIGHT RAIL: AI CREDITS WALLET & QUICK STUDY ACTIONS */}
          <aside className="lg:col-span-4 space-y-3.5">
            {/* AI CREDITS WALLET CARD */}
            <section
              className="rounded-[24px] bg-[#2A085E] text-white p-4 sm:p-5 space-y-4"
              style={{ boxShadow: '0 5px 0 #170338' }}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#C8B8E6]">
                    SABI AI CREDITS
                  </div>
                  <div
                    className="mt-0.5 text-[28px] font-bold text-[#FFE824] leading-none tabular-nums flex items-center gap-2"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    <Gem size={22} className="text-[#FFE824]" />
                    <span>{creditState.totalCredits}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-white/12 text-[11px] font-extrabold uppercase text-[#FFE824]">
                  {creditState.subscriptionPlan === 'citadel_pro'
                    ? 'Citadel Pro'
                    : creditState.subscriptionPlan === 'scholar_pass'
                    ? 'Scholar Pass'
                    : 'Free Tier'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-[15px] bg-[#3B1080] p-3 border border-white/10">
                  <div className="text-[11px] font-bold text-[#D6C7EE]">Subscription</div>
                  <div className="mt-0.5 text-[19px] font-extrabold text-white tabular-nums">
                    {creditState.subscriptionDiamonds}
                  </div>
                  <div className="text-[10.5px] font-semibold text-[#C8B8E6]">Primary vault</div>
                </div>

                <div className="rounded-[15px] bg-[#3B1080] p-3 border border-white/10">
                  <div className="text-[11px] font-bold text-[#D6C7EE]">Assistance</div>
                  <div className="mt-0.5 text-[19px] font-extrabold text-[#FFE824] tabular-nums">
                    {creditState.assistanceDiamonds}
                  </div>
                  <div className="text-[10.5px] font-semibold text-[#C8B8E6]">Used first</div>
                </div>
              </div>

              {/* Limited XP Assistance Meter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11.5px] font-bold text-[#EAE1FA]">
                  <span>Next Assistance Credit</span>
                  <span className="tabular-nums text-[#FFE824]">
                    {creditState.xpTowardNextDiamond}/{creditState.xpPerAssistanceDiamond} XP
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#FFE824]"
                    style={{ width: `${Math.max(4, xpProgressPct)}%` }}
                  />
                </div>
                <p className="text-[11px] font-semibold text-[#C8B8E6] leading-snug">
                  Earned {creditState.dailyAssistanceDiamondsEarned}/
                  {creditState.dailyAssistanceDiamondCap} limited assistance credits today.
                  Subscriptions remain your main credit supply.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/subscriptions')}
                className="w-full py-3 px-4 rounded-[15px] bg-[#FFE824] hover:brightness-105 text-[#260559] font-extrabold text-[13.5px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-transform active:translate-y-[1px] cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 0 #C5AB00',
                }}
              >
                <span>Top Up / Manage Plan</span>
                <ArrowRight size={15} strokeWidth={2.7} />
              </button>
            </section>

            {/* QUICK PROMPT SHORTCUTS WHEN CHATTING */}
            {messages.length > 0 && (
              <section
                className="bg-white rounded-[22px] p-4 space-y-2.5"
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A]">
                  Suggested Follow-Ups
                </div>
                <div className="space-y-2">
                  {starterPrompts.slice(0, 3).map((starter) => (
                    <button
                      key={starter.id}
                      type="button"
                      onClick={() => handleStarterClick(starter)}
                      className="w-full rounded-[14px] bg-[#F8F5FF] hover:bg-[#EFE6FF] px-3 py-2.5 text-left flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <span className="text-[12.5px] font-extrabold text-[#260559] truncate">
                        {starter.label}
                      </span>
                      <ArrowRight size={14} className="text-[#6C19E5] shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* STUDY TOOLS LINKS */}
            <section
              className="bg-white rounded-[22px] p-4 space-y-2.5"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <div className="text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A]">
                Connected SABI Tools
              </div>

              <button
                type="button"
                onClick={() => navigate('/progress/subjects')}
                className="w-full rounded-[15px] bg-[#F8F5FF] hover:bg-[#EFE6FF] p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <BookOpen size={17} className="text-[#6C19E5] shrink-0" />
                  <span className="text-[13px] font-extrabold text-[#260559] truncate">
                    Subject Performance Insights
                  </span>
                </span>
                <ArrowRight size={15} className="text-[#6C19E5] shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => navigate('/settings/practice')}
                className="w-full rounded-[15px] bg-[#F8F5FF] hover:bg-[#EFE6FF] p-3 text-left flex items-center justify-between gap-2.5 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Target size={17} className="text-[#6C19E5] shrink-0" />
                  <span className="text-[13px] font-extrabold text-[#260559] truncate">
                    SABI AI Practice Studio
                  </span>
                </span>
                <ArrowRight size={15} className="text-[#6C19E5] shrink-0" />
              </button>
            </section>
          </aside>
        </div>
      </main>
    </SabiAppChrome>
  );
}
