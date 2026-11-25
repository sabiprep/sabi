import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  Gem,
  Globe,
  History,
  Lock,
  Menu,
  MessageSquarePlus,
  RotateCcw,
  Search,
  Send,
  SlidersHorizontal,
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
  appendMessageToSession,
  buildAssistantStarterPrompts,
  clearAssistantSessionMessages,
  consumeAssistantCredit,
  createAssistantSession,
  deleteAssistantSession,
  ensureActiveAssistantSession,
  getAssistantCreditState,
  loadAssistantSettings,
  loadTopicMemory,
  saveAssistantSettings,
  saveTopicMemory,
  searchAssistantSessions,
  setActiveAssistantSessionId,
  updateAssistantSessionContext,
  type AssistantChatMessage,
  type AssistantChatSession,
  type AssistantExplanationDepth,
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

type TopMenuTab = 'chats' | 'settings';

function formatShortTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function formatMessageTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-NG', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Renders assistant replies as structured paragraphs and bullet lists
 * safely with React elements only (no raw HTML injection).
 */
function SafeAssistantMessageBody({ text }: { text: string }) {
  const blocks = text
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2 text-[14px] sm:text-[15px] font-semibold leading-relaxed text-[#260559] break-words">
      {blocks.map((block, bIdx) => {
        const lines = block
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);
        const isList = lines.length > 1 && lines.every((l) => /^([-*•]|\d+[.)])\s+/.test(l));

        if (isList) {
          return (
            <ul key={bIdx} className="space-y-1.5 pl-0.5">
              {lines.map((line, lIdx) => (
                <li key={lIdx} className="flex items-start gap-2">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#6C19E5] shrink-0" />
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
 * Screen 23 (`/assistant`): Full-Viewport SABI Assistant Chat Dashboard
 * - Edge-to-edge Wonderland chat interface fitted cleanly for Android WebView & Desktop WebApp
 * - Right-aligned User Request cards + Left-aligned SABI AI Response cards
 * - Dedicated Middle-Top Dash Menu for Old Chats history, New Chat, and Assistant Settings
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

  const matchedQuerySubject = useMemo(() => {
    if (!querySubject) return '';
    const match = subjectOptions.find(
      (s) => s.canonicalName.toLowerCase() === querySubject.toLowerCase()
    );
    return match ? match.canonicalName : '';
  }, [querySubject, subjectOptions]);

  const [settings, setSettings] = useState(() => loadAssistantSettings());
  const [sessionsState, setSessionsState] = useState<{
    sessions: AssistantChatSession[];
    activeId: string;
  }>(() => {
    const initial = ensureActiveAssistantSession({
      subject: matchedQuerySubject || loadAssistantSettings().defaultSubject,
      topic: queryTopic.trim() || undefined,
    });
    return {
      sessions: initial.sessions,
      activeId: initial.activeSession.id,
    };
  });

  const activeSession = useMemo(
    () =>
      sessionsState.sessions.find((s) => s.id === sessionsState.activeId) ||
      sessionsState.sessions[0],
    [sessionsState]
  );

  const [selectedSubject, setSelectedSubject] = useState<string>(
    () => matchedQuerySubject || activeSession?.subject || settings.defaultSubject || 'All Subjects'
  );
  const [activeTopic, setActiveTopic] = useState<string>(
    () => queryTopic.trim() || activeSession?.topic || ''
  );

  // Dedicated Middle-Top Assistant Dash Menu state
  const [topMenuOpen, setTopMenuOpen] = useState(false);
  const [topMenuTab, setTopMenuTab] = useState<TopMenuTab>('chats');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmClearCurrent, setConfirmClearCurrent] = useState(false);

  // Composer & network state
  const [creditState, setCreditState] = useState(() => getAssistantCreditState());
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState<ChatErrorBanner | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Apply deep-linked ?subject=...&topic=... (e.g. from Subject Performance Insights)
  useEffect(() => {
    if (!matchedQuerySubject && !queryTopic.trim()) return;
    const nextSubject = matchedQuerySubject || selectedSubject;
    const nextTopic = queryTopic.trim();
    setSelectedSubject(nextSubject);
    setActiveTopic(nextTopic);
    if (activeSession && activeSession.messages.length === 0) {
      const updated = updateAssistantSessionContext(activeSession.id, {
        subject: nextSubject,
        topic: nextTopic,
      });
      setSessionsState((prev) => ({ ...prev, sessions: updated }));
    }
  }, [matchedQuerySubject, queryTopic]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep live AI Credits synced across tabs/events
  useEffect(() => {
    const syncCredits = () => setCreditState(getAssistantCreditState());
    window.addEventListener('sabi-progress-updated', syncCredits);
    return () => window.removeEventListener('sabi-progress-updated', syncCredits);
  }, []);

  // Close middle-top dash menu on Escape
  useEffect(() => {
    if (!topMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTopMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [topMenuOpen]);

  const activeMessages = activeSession?.messages || [];

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activeMessages.length, isSending, activeSession?.id]);

  const filteredSessions = useMemo(
    () => searchAssistantSessions(sessionsState.sessions, chatSearchQuery),
    [sessionsState.sessions, chatSearchQuery]
  );

  const starterPrompts = useMemo(
    () => buildAssistantStarterPrompts(selectedSubject, activeTopic || undefined),
    [selectedSubject, activeTopic]
  );

  const playTapSafe = () => {
    try {
      sound.playTap();
    } catch {
      // ignore
    }
  };

  const openMiddleMenu = (tab: TopMenuTab = 'chats') => {
    playTapSafe();
    setTopMenuTab(tab);
    setPendingDeleteId(null);
    setConfirmClearCurrent(false);
    setTopMenuOpen((prev) => (prev && topMenuTab === tab ? false : true));
  };

  const handleStartNewChat = (overrideSubject?: string, overrideTopic?: string) => {
    playTapSafe();
    const subject = overrideSubject || settings.defaultSubject || 'All Subjects';
    const created = createAssistantSession({ subject, topic: overrideTopic });
    const latest = ensureActiveAssistantSession().sessions;
    setSessionsState({ sessions: latest, activeId: created.id });
    setSelectedSubject(created.subject);
    setActiveTopic(created.topic || '');
    setErrorBanner(null);
    setTopMenuOpen(false);
    setSearchParams({});
    inputRef.current?.focus();
  };

  const handleSelectOldChat = (session: AssistantChatSession) => {
    playTapSafe();
    setActiveAssistantSessionId(session.id);
    setSessionsState((prev) => ({ ...prev, activeId: session.id }));
    setSelectedSubject(session.subject || 'All Subjects');
    setActiveTopic(session.topic || '');
    setErrorBanner(null);
    setTopMenuOpen(false);
    setSearchParams({});
  };

  const handleDeleteChat = (sessionId: string) => {
    playTapSafe();
    const remaining = deleteAssistantSession(sessionId);
    if (remaining.length === 0) {
      const fresh = createAssistantSession({ subject: settings.defaultSubject });
      setSessionsState({ sessions: [fresh], activeId: fresh.id });
      setSelectedSubject(fresh.subject);
      setActiveTopic('');
    } else {
      const nextActiveId =
        sessionId === sessionsState.activeId ? remaining[0].id : sessionsState.activeId;
      const nextActive = remaining.find((s) => s.id === nextActiveId) || remaining[0];
      setActiveAssistantSessionId(nextActive.id);
      setSessionsState({ sessions: remaining, activeId: nextActive.id });
      setSelectedSubject(nextActive.subject);
      setActiveTopic(nextActive.topic || '');
    }
    setPendingDeleteId(null);
  };

  const handleClearCurrentChat = () => {
    if (!activeSession) return;
    playTapSafe();
    const updated = clearAssistantSessionMessages(activeSession.id);
    setSessionsState((prev) => ({ ...prev, sessions: updated }));
    setConfirmClearCurrent(false);
    setErrorBanner(null);
    setTopMenuOpen(false);
  };

  const handleLanguageChange = (language: AssistantLanguage) => {
    playTapSafe();
    setSettings(saveAssistantSettings({ language }));
  };

  const handleDepthChange = (explanationDepth: AssistantExplanationDepth) => {
    playTapSafe();
    setSettings(saveAssistantSettings({ explanationDepth }));
  };

  const handleSubjectSelect = (canonicalName: string) => {
    playTapSafe();
    setSelectedSubject(canonicalName);
    setSettings(saveAssistantSettings({ defaultSubject: canonicalName }));
    const nextTopic = canonicalName === 'All Subjects' ? '' : activeTopic;
    setActiveTopic(nextTopic);
    if (activeSession) {
      const updated = updateAssistantSessionContext(activeSession.id, {
        subject: canonicalName,
        topic: nextTopic,
      });
      setSessionsState((prev) => ({ ...prev, sessions: updated }));
    }
    if (canonicalName === 'All Subjects') {
      setSearchParams({});
    } else {
      setSearchParams({ subject: canonicalName });
    }
  };

  const handleClearTopic = () => {
    setActiveTopic('');
    if (activeSession) {
      const updated = updateAssistantSessionContext(activeSession.id, { topic: '' });
      setSessionsState((prev) => ({ ...prev, sessions: updated }));
    }
    if (selectedSubject !== 'All Subjects') {
      setSearchParams({ subject: selectedSubject });
    } else {
      setSearchParams({});
    }
  };

  const handleCopyMessage = async (msg: AssistantChatMessage) => {
    try {
      await navigator.clipboard?.writeText(msg.text);
      setCopiedMsgId(msg.id);
      window.setTimeout(() => {
        setCopiedMsgId((prev) => (prev === msg.id ? null : prev));
      }, 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const sendQuestion = async (
    rawQuestion: string,
    overrideSubject?: string,
    overrideTopic?: string
  ) => {
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

    const ensured = activeSession || createAssistantSession({ subject: effectiveSubject });
    const sessionId = ensured.id;

    setErrorBanner(null);
    setTopMenuOpen(false);
    playTapSafe();

    const userMsg: AssistantChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      text: trimmed,
      subject: effectiveSubject,
      topic: effectiveTopic || undefined,
      createdAt: new Date().toISOString(),
    };

    const sessionsAfterUser = appendMessageToSession(sessionId, userMsg);
    setSessionsState({ sessions: sessionsAfterUser, activeId: sessionId });
    setInputText('');
    setIsSending(true);

    const updatedSession = sessionsAfterUser.find((s) => s.id === sessionId);
    const threadMessages = updatedSession?.messages || [userMsg];
    const scopeKey = `${effectiveSubject}::${effectiveTopic || 'general'}`;
    const rollingMemory = updatedSession?.topicMemory || loadTopicMemory(scopeKey);

    const payloadMessages = threadMessages.slice(-12).map((m) => ({
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
        languagePreference: settings.language,
        explanationPreference: settings.explanationDepth,
      },
      ...(rollingMemory ? { topicMemory: rollingMemory } : {}),
    });

    setIsSending(false);

    if (!result.ok) {
      if (result.status === 401) {
        setErrorBanner({
          kind: 'auth',
          message:
            'Sign in to your SABI account to chat live with SABI Assistant. No AI Credit was deducted.',
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

    const memoryUpdate =
      typeof result.data?.topicMemoryUpdate === 'string' && result.data.topicMemoryUpdate.trim()
        ? result.data.topicMemoryUpdate.trim()
        : undefined;

    if (memoryUpdate) {
      saveTopicMemory(scopeKey, memoryUpdate);
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

    const sessionsAfterAi = appendMessageToSession(sessionId, assistantMsg, memoryUpdate);
    setSessionsState({ sessions: sessionsAfterAi, activeId: sessionId });
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
          'You need 1 AI Credit to send this question. Top up Subscription Diamonds or earn a limited Assistance Diamond in Practice Hub.',
      });
      inputRef.current?.focus();
    }
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

  const activeSubjectShort =
    subjectOptions.find((s) => s.canonicalName === selectedSubject)?.displayLabel ||
    selectedSubject;

  return (
    <SabiAppChrome
      activeTab="assistant"
      backdropVariant="home"
      hideMobileBottomNav
      fullViewport
      streakDays={dashboard.streakDays}
      xpBalance={dashboard.xpBalance}
    >
      <div className="relative flex-1 flex flex-col h-full w-full overflow-hidden">
        {/* ================================================================= */}
        {/* 1. PINNED TOP CHAT HEADER WITH DEDICATED MIDDLE-TOP DASH MENU     */}
        {/* ================================================================= */}
        <header className="relative z-30 shrink-0 px-3 sm:px-6 pt-3 pb-2.5 bg-[#FFE824]/95 backdrop-blur-xs border-b border-[#E5CA00]/65">
          <div className="max-w-[920px] mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-3">
            {/* LEFT: Back to Home */}
            <button
              type="button"
              onClick={() => navigate('/home')}
              aria-label="Back to Home"
              className="w-[42px] h-[42px] rounded-[14px] bg-white text-[#260559] flex items-center justify-center shrink-0 cursor-pointer active:translate-y-[1px]"
              style={{ boxShadow: '0 3px 0 #E2C700' }}
            >
              <ChevronLeft size={22} strokeWidth={2.7} />
            </button>

            {/* MIDDLE-TOP: Dedicated SABI Assistant Dash Menu Trigger */}
            <div className="flex justify-center min-w-0">
              <button
                type="button"
                onClick={() => openMiddleMenu('chats')}
                aria-expanded={topMenuOpen}
                aria-label="Open SABI Assistant chats and settings menu"
                className={`max-w-full min-w-0 px-3 sm:px-4 py-2 rounded-[16px] flex items-center gap-2 sm:gap-2.5 transition-transform active:translate-y-[1px] cursor-pointer ${
                  topMenuOpen
                    ? 'bg-[#2A085E] text-white'
                    : 'bg-white text-[#260559] hover:bg-[#FFFDF5]'
                }`}
                style={{
                  boxShadow: topMenuOpen ? '0 3px 0 #170338' : '0 3px 0 #E2C700',
                }}
              >
                <span
                  className={`w-7 h-7 rounded-[10px] flex items-center justify-center shrink-0 ${
                    topMenuOpen
                      ? 'bg-[#FFE824] text-[#260559]'
                      : 'bg-[#6C19E5] text-[#FFE824]'
                  }`}
                >
                  <Menu size={15} strokeWidth={2.8} />
                </span>

                <div className="min-w-0 text-left">
                  <div
                    className="text-[14px] sm:text-[15.5px] font-bold leading-tight truncate max-w-[165px] sm:max-w-[280px]"
                    style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                  >
                    {activeSession?.title || 'SABI Assistant'}
                  </div>
                  <div
                    className={`text-[10.5px] sm:text-[11px] font-bold leading-none mt-0.5 truncate ${
                      topMenuOpen ? 'text-[#DDD0FA]' : 'text-[#6E5C91]'
                    }`}
                  >
                    Old Chats ({sessionsState.sessions.length}) · Settings
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  strokeWidth={2.7}
                  className={`shrink-0 transition-transform duration-150 ${
                    topMenuOpen ? 'rotate-180 text-[#FFE824]' : 'text-[#6C19E5]'
                  }`}
                />
              </button>
            </div>

            {/* RIGHT: AI Credits Pill + Main App 3-Dash Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => openMiddleMenu('settings')}
                aria-label={`${creditState.totalCredits} AI Credits available`}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-full bg-white text-[#260559] font-extrabold text-[13px] tabular-nums cursor-pointer active:translate-y-[1px] whitespace-nowrap"
                style={{ boxShadow: '0 3px 0 #E2C700' }}
              >
                <Gem size={14} className="text-[#711AE3] shrink-0" />
                <span>{creditState.totalCredits}</span>
              </button>

              <SabiMenuTriggerButton />
            </div>
          </div>

          {/* Ultra-Compact Active Context Strip (Subject · Language · Depth · Quick New Chat) */}
          <div className="max-w-[920px] mx-auto mt-2 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => openMiddleMenu('settings')}
                className="px-2.5 py-1 rounded-full bg-[#2A085E] text-[#FFE824] text-[11px] font-extrabold whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
              >
                <BookOpen size={11} />
                <span>{activeSubjectShort}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleLanguageChange(settings.language === 'english' ? 'pidgin' : 'english')
                }
                className="px-2.5 py-1 rounded-full bg-white/90 text-[#260559] text-[11px] font-extrabold whitespace-nowrap cursor-pointer inline-flex items-center gap-1"
              >
                <Globe size={11} className="text-[#6C19E5]" />
                <span>{settings.language === 'pidgin' ? 'Naija Pidgin' : 'English'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleDepthChange(settings.explanationDepth === 'detailed' ? 'short' : 'detailed')
                }
                className="px-2.5 py-1 rounded-full bg-white/90 text-[#5A467A] text-[11px] font-extrabold whitespace-nowrap cursor-pointer"
              >
                {settings.explanationDepth === 'short' ? 'Short & Direct' : 'Step-by-step'}
              </button>

              {activeTopic && (
                <span className="px-2.5 py-1 rounded-full bg-[#FFF0E0] text-[#C2410C] text-[11px] font-extrabold whitespace-nowrap inline-flex items-center gap-1">
                  <Target size={11} />
                  <span className="max-w-[140px] truncate">{activeTopic}</span>
                  <button
                    type="button"
                    onClick={handleClearTopic}
                    aria-label="Clear focused topic"
                    className="ml-0.5 hover:text-[#7C2D12] cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleStartNewChat()}
              className="px-2.5 py-1 rounded-full bg-[#6C19E5] text-white text-[11px] font-extrabold whitespace-nowrap inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <MessageSquarePlus size={12} />
              <span>New</span>
            </button>
          </div>
        </header>

        {/* ================================================================= */}
        {/* 2. MIDDLE-TOP ASSISTANT DASH MENU OVERLAY (OLD CHATS + SETTINGS)  */}
        {/* ================================================================= */}
        {topMenuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="SABI Assistant chats and settings"
            className="fixed inset-0 z-50 bg-[#170338]/60 backdrop-blur-xs flex flex-col items-center px-3 pt-[max(env(safe-area-inset-top,0px),12px)] pb-4"
            onClick={() => setTopMenuOpen(false)}
          >
            <div
              className="w-full max-w-[540px] max-h-[86dvh] rounded-[26px] bg-[#FFE824] text-[#260559] flex flex-col overflow-hidden shadow-[0_18px_48px_rgba(23,3,56,0.42)] border-[2px] border-[#F2D500]"
              style={{
                background: 'linear-gradient(180deg, #FFEC2E 0%, #FFE61E 100%)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Menu Header */}
              <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-[12px] bg-[#6C19E5] text-[#FFE824] flex items-center justify-center shrink-0 shadow-[0_3px_0_#46099E]">
                    <SabiBrandEmblem size={19} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <h2
                      className="text-[18px] font-bold text-[#260559] leading-tight truncate"
                      style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      SABI Assistant Menu
                    </h2>
                    <p className="text-[11.5px] font-bold text-[#4F3B73]">
                      Review old chats & tune how SABI answers you
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTopMenuOpen(false)}
                  aria-label="Close Assistant menu"
                  className="w-9 h-9 rounded-[12px] bg-white text-[#260559] flex items-center justify-center cursor-pointer shrink-0"
                  style={{ boxShadow: '0 3px 0 #E2C700' }}
                >
                  <X size={18} strokeWidth={2.7} />
                </button>
              </div>

              {/* Tab Switcher: Old Chats vs Settings */}
              <div className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-2 p-1 rounded-[16px] bg-[#2A085E]">
                  <button
                    type="button"
                    onClick={() => setTopMenuTab('chats')}
                    className={`py-2.5 px-3 rounded-[12px] text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      topMenuTab === 'chats'
                        ? 'bg-[#FFE824] text-[#260559]'
                        : 'text-[#DCD0F5] hover:text-white'
                    }`}
                  >
                    <History size={15} />
                    <span>Old Chats ({sessionsState.sessions.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTopMenuTab('settings')}
                    className={`py-2.5 px-3 rounded-[12px] text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                      topMenuTab === 'settings'
                        ? 'bg-[#FFE824] text-[#260559]'
                        : 'text-[#DCD0F5] hover:text-white'
                    }`}
                  >
                    <SlidersHorizontal size={15} />
                    <span>Settings & Credits</span>
                  </button>
                </div>
              </div>

              {/* Scrollable Panel Body */}
              <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
                {topMenuTab === 'chats' ? (
                  <>
                    {/* New Chat CTA */}
                    <button
                      type="button"
                      onClick={() => handleStartNewChat()}
                      className="w-full py-3 px-4 rounded-[16px] bg-[#6C19E5] hover:brightness-105 text-white font-extrabold text-[14px] inline-flex items-center justify-center gap-2 cursor-pointer active:translate-y-[1px]"
                      style={{
                        fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                        boxShadow: '0 4px 0 #46099E',
                      }}
                    >
                      <MessageSquarePlus size={18} />
                      <span>Start New SABI Chat</span>
                    </button>

                    {/* Search Old Chats */}
                    <div className="relative">
                      <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6E5C91]"
                      />
                      <input
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Search past chats or topics..."
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-[14px] bg-white text-[13.5px] font-semibold text-[#260559] placeholder:text-[#8A77AE] focus:outline-none focus:ring-2 focus:ring-[#6C19E5]"
                        style={{ boxShadow: '0 3px 0 #E2C700' }}
                      />
                    </div>

                    {/* Old Chats List */}
                    <div className="space-y-2">
                      {filteredSessions.length === 0 ? (
                        <div className="rounded-[18px] bg-white p-5 text-center text-[13px] font-bold text-[#5A467A]">
                          No matching chats found. Start a new conversation above!
                        </div>
                      ) : (
                        filteredSessions.map((session) => {
                          const isCurrent = session.id === activeSession?.id;
                          const isConfirmingDelete = pendingDeleteId === session.id;
                          return (
                            <div
                              key={session.id}
                              className={`rounded-[18px] p-3 flex items-center justify-between gap-2.5 transition-colors ${
                                isCurrent
                                  ? 'bg-[#2A085E] text-white'
                                  : 'bg-white text-[#260559] hover:bg-[#FFFDF5]'
                              }`}
                              style={{
                                boxShadow: isCurrent ? '0 3.5px 0 #170338' : '0 3.5px 0 #E2C700',
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => handleSelectOldChat(session)}
                                className="flex-1 min-w-0 text-left cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`text-[14px] font-extrabold truncate ${
                                      isCurrent ? 'text-[#FFE824]' : 'text-[#260559]'
                                    }`}
                                  >
                                    {session.title}
                                  </span>
                                  {isCurrent && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-[#6C19E5] text-[#FFE824] text-[9.5px] font-extrabold uppercase shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <div
                                  className={`mt-1 flex items-center gap-2 text-[11.5px] font-bold ${
                                    isCurrent ? 'text-[#D6C7EE]' : 'text-[#6E5C91]'
                                  }`}
                                >
                                  <span className="truncate">{session.subject}</span>
                                  <span>·</span>
                                  <span>{session.messages.length} msgs</span>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-0.5 shrink-0">
                                    <Clock size={10} />
                                    {formatShortTimestamp(session.updatedAt)}
                                  </span>
                                </div>
                              </button>

                              {isConfirmingDelete ? (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteChat(session.id)}
                                    className="px-2.5 py-1.5 rounded-[10px] bg-[#DC2626] text-white text-[11px] font-extrabold cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteId(null)}
                                    className="px-2 py-1.5 rounded-[10px] bg-white/15 text-current text-[11px] font-bold cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setPendingDeleteId(session.id)}
                                  aria-label={`Delete chat ${session.title}`}
                                  className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 cursor-pointer ${
                                    isCurrent
                                      ? 'text-[#D6C7EE] hover:bg-white/10 hover:text-white'
                                      : 'text-[#8A77AE] hover:bg-[#FEF2F2] hover:text-[#DC2626]'
                                  }`}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {/* Subject Focus Setting */}
                    <div
                      className="rounded-[20px] bg-white p-3.5 space-y-2.5"
                      style={{ boxShadow: '0 3.5px 0 #E2C700' }}
                    >
                      <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A]">
                        Subject Focus
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {subjectOptions.map((subj) => {
                          const isActive = selectedSubject === subj.canonicalName;
                          return (
                            <button
                              key={subj.canonicalName}
                              type="button"
                              onClick={() => handleSubjectSelect(subj.canonicalName)}
                              className={`px-3 py-1.5 rounded-[12px] text-[12.5px] font-extrabold cursor-pointer transition-colors ${
                                isActive
                                  ? 'bg-[#6C19E5] text-[#FFE824] shadow-[0_2.5px_0_#46099E]'
                                  : 'bg-[#F5F0FF] text-[#260559] hover:bg-[#EAE0FE]'
                              }`}
                            >
                              {subj.displayLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Language & Depth Toggles */}
                    <div
                      className="rounded-[20px] bg-white p-3.5 space-y-3"
                      style={{ boxShadow: '0 3.5px 0 #E2C700' }}
                    >
                      <div className="space-y-1.5">
                        <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A]">
                          Teaching Language
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleLanguageChange('english')}
                            className={`py-2.5 px-3 rounded-[13px] text-[13px] font-extrabold cursor-pointer ${
                              settings.language === 'english'
                                ? 'bg-[#6C19E5] text-white shadow-[0_3px_0_#46099E]'
                                : 'bg-[#F5F0FF] text-[#260559]'
                            }`}
                          >
                            Standard English
                          </button>
                          <button
                            type="button"
                            onClick={() => handleLanguageChange('pidgin')}
                            className={`py-2.5 px-3 rounded-[13px] text-[13px] font-extrabold cursor-pointer ${
                              settings.language === 'pidgin'
                                ? 'bg-[#6C19E5] text-white shadow-[0_3px_0_#46099E]'
                                : 'bg-[#F5F0FF] text-[#260559]'
                            }`}
                          >
                            Naija Pidgin
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11.5px] font-extrabold uppercase tracking-[0.06em] text-[#5A467A]">
                          Explanation Style
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleDepthChange('detailed')}
                            className={`py-2.5 px-3 rounded-[13px] text-[13px] font-extrabold cursor-pointer ${
                              settings.explanationDepth === 'detailed'
                                ? 'bg-[#2A085E] text-[#FFE824]'
                                : 'bg-[#F5F0FF] text-[#260559]'
                            }`}
                          >
                            Step-by-step
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDepthChange('short')}
                            className={`py-2.5 px-3 rounded-[13px] text-[13px] font-extrabold cursor-pointer ${
                              settings.explanationDepth === 'short'
                                ? 'bg-[#2A085E] text-[#FFE824]'
                                : 'bg-[#F5F0FF] text-[#260559]'
                            }`}
                          >
                            Short & Direct
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* AI Credits Wallet Card */}
                    <div
                      className="rounded-[20px] bg-[#2A085E] text-white p-4 space-y-3"
                      style={{ boxShadow: '0 4px 0 #170338' }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#C8B8E6]">
                            AI Credits Balance
                          </div>
                          <div
                            className="text-[24px] font-bold text-[#FFE824] leading-tight flex items-center gap-1.5 tabular-nums"
                            style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                          >
                            <Gem size={19} />
                            <span>{creditState.totalCredits} Credits</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTopMenuOpen(false);
                            navigate('/subscriptions');
                          }}
                          className="px-3.5 py-2 rounded-[12px] bg-[#FFE824] text-[#260559] font-extrabold text-[12px] cursor-pointer"
                        >
                          Top Up
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[12px]">
                        <div className="rounded-[12px] bg-[#3B1080] px-3 py-2">
                          <div className="text-[#C8B8E6] font-bold">Subscription</div>
                          <div className="text-[16px] font-extrabold tabular-nums">
                            {creditState.subscriptionDiamonds}
                          </div>
                        </div>
                        <div className="rounded-[12px] bg-[#3B1080] px-3 py-2">
                          <div className="text-[#C8B8E6] font-bold">Assistance (1st)</div>
                          <div className="text-[16px] font-extrabold text-[#FFE824] tabular-nums">
                            {creditState.assistanceDiamonds}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] font-bold text-[#EAE1FA]">
                          <span>Next Assistance Credit</span>
                          <span className="text-[#FFE824] tabular-nums">
                            {creditState.xpTowardNextDiamond}/{creditState.xpPerAssistanceDiamond} XP
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#FFE824]"
                            style={{ width: `${Math.max(4, xpProgressPct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Chat Maintenance & Connected Studio Links */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTopMenuOpen(false);
                          navigate('/settings/practice');
                        }}
                        className="py-2.5 px-3 rounded-[14px] bg-white text-[#260559] text-[12.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                        style={{ boxShadow: '0 3px 0 #E2C700' }}
                      >
                        <Target size={14} className="text-[#6C19E5]" />
                        <span>AI Practice Studio</span>
                      </button>

                      {confirmClearCurrent ? (
                        <button
                          type="button"
                          onClick={handleClearCurrentChat}
                          className="py-2.5 px-3 rounded-[14px] bg-[#DC2626] text-white text-[12.5px] font-extrabold cursor-pointer"
                        >
                          Confirm Clear Chat
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={activeMessages.length === 0}
                          onClick={() => setConfirmClearCurrent(true)}
                          className="py-2.5 px-3 rounded-[14px] bg-white disabled:opacity-50 text-[#DC2626] text-[12.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                          style={{ boxShadow: '0 3px 0 #E2C700' }}
                        >
                          <Trash2 size={14} />
                          <span>Clear This Chat</span>
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* 3. FULL-HEIGHT SCROLLABLE CHAT TRANSCRIPT                         */}
        {/* ================================================================= */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 select-text">
          <div className="max-w-[860px] mx-auto space-y-4 pb-2">
            {activeMessages.length === 0 ? (
              <div className="pt-2 sm:pt-6 space-y-5">
                {/* Welcome Hero Card */}
                <section
                  className="rounded-[26px] bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4"
                  style={{ boxShadow: '0 5px 0 #E2C700' }}
                >
                  <div className="w-14 h-14 rounded-[18px] bg-[#6C19E5] text-[#FFE824] flex items-center justify-center shrink-0 shadow-[0_4px_0_#46099E]">
                    <SabiBrandEmblem size={28} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <h1
                      className="text-[22px] sm:text-[25px] font-bold text-[#260559] leading-tight"
                      style={{ fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif" }}
                    >
                      {settings.language === 'pidgin'
                        ? `Oya ${dashboard.firstName}, wetin you wan make we solve?`
                        : `Ask SABI Assistant anything, ${dashboard.firstName}`}
                    </h1>
                    <p className="mt-1 text-[13.5px] sm:text-[14.5px] font-semibold text-[#5A467A] leading-relaxed">
                      Type any JAMB question or formula below. Tap the{' '}
                      <strong className="text-[#260559]">top-center menu</strong> anytime to switch
                      old chats or tune language & depth.
                    </p>
                  </div>
                </section>

                {/* Starter Prompts Grid */}
                <div className="space-y-2.5">
                  <div className="px-1 text-[12px] font-extrabold uppercase tracking-[0.06em] text-[#3C2263]">
                    Quick JAMB Starters for {activeSubjectShort}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {starterPrompts.map((starter) => (
                      <button
                        key={starter.id}
                        type="button"
                        onClick={() => handleStarterClick(starter)}
                        className="rounded-[20px] bg-white hover:bg-[#FFFDF5] p-4 text-left transition-transform active:translate-y-[1px] cursor-pointer"
                        style={{ boxShadow: '0 4px 0 #E2C700' }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span
                            className={`text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                              starter.isWeakTopic
                                ? 'bg-[#FFF0E0] text-[#C2410C]'
                                : 'bg-[#EFE6FF] text-[#6C19E5]'
                            }`}
                          >
                            {starter.isWeakTopic ? 'WEAK TOPIC' : starter.subject}
                          </span>
                          <ArrowRight size={15} className="text-[#6C19E5] shrink-0" />
                        </div>
                        <div className="text-[14.5px] font-extrabold text-[#260559] leading-snug">
                          {starter.label}
                        </div>
                        <p className="mt-1 text-[12.5px] font-semibold text-[#5A467A] line-clamp-2">
                          {starter.prompt}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {activeMessages.map((msg) => {
                  const isUser = msg.role === 'user';

                  if (isUser) {
                    // USER REQUEST CARD — ANCHORED RIGHT
                    return (
                      <div key={msg.id} className="flex justify-end">
                        <article
                          className="max-w-[88%] sm:max-w-[76%] rounded-[22px] rounded-br-[6px] bg-[#6C19E5] text-white px-4 py-3.5"
                          style={{ boxShadow: '0 4px 0 #46099E' }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5 text-[11px] font-bold text-[#E6D5FF]">
                            <span className="truncate">
                              You · {msg.subject}
                              {msg.topic ? ` · ${msg.topic}` : ''}
                            </span>
                            <span className="shrink-0 opacity-85">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>
                          <p className="text-[14.5px] sm:text-[15px] font-semibold leading-relaxed whitespace-pre-line break-words">
                            {msg.text}
                          </p>
                        </article>
                      </div>
                    );
                  }

                  // SABI AI RESPONSE CARD — ANCHORED LEFT
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="flex items-start gap-2.5 max-w-[94%] sm:max-w-[82%]">
                        <div
                          className="w-9 h-9 rounded-[12px] bg-[#2A085E] text-[#FFE824] flex items-center justify-center shrink-0 mt-0.5"
                          style={{ boxShadow: '0 3px 0 #170338' }}
                        >
                          <SabiBrandEmblem size={18} strokeWidth={2.4} />
                        </div>

                        <article
                          className="rounded-[22px] rounded-bl-[6px] bg-white border border-[#EDE3FC] px-4 py-3.5 min-w-0 flex-1"
                          style={{ boxShadow: '0 4px 0 #E2C700' }}
                        >
                          <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-[#F3EEFD]">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#6C19E5] truncate">
                              SABI Assistant · {msg.subject}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              {msg.creditSource && (
                                <span className="text-[10.5px] font-bold text-[#6E5C91] whitespace-nowrap">
                                  1 {msg.creditSource === 'assistance' ? 'Assist' : 'Plan'} Credit
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => void handleCopyMessage(msg)}
                                aria-label="Copy SABI answer"
                                className="p-1 rounded-md text-[#6E5C91] hover:bg-[#F5F0FF] hover:text-[#6C19E5] cursor-pointer"
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check size={13} className="text-[#059669]" />
                                ) : (
                                  <Copy size={13} />
                                )}
                              </button>
                            </div>
                          </div>

                          <SafeAssistantMessageBody text={msg.text} />
                        </article>
                      </div>
                    </div>
                  );
                })}

                {isSending && (
                  <div className="flex justify-start">
                    <div className="flex items-start gap-2.5 max-w-[85%]">
                      <div
                        className="w-9 h-9 rounded-[12px] bg-[#2A085E] text-[#FFE824] flex items-center justify-center shrink-0"
                        style={{ boxShadow: '0 3px 0 #170338' }}
                      >
                        <SabiBrandEmblem size={18} strokeWidth={2.4} />
                      </div>
                      <div
                        className="rounded-[22px] rounded-bl-[6px] bg-white px-4 py-3.5"
                        style={{ boxShadow: '0 4px 0 #E2C700' }}
                      >
                        <div className="flex items-center gap-2.5 text-[13.5px] font-extrabold text-[#6C19E5]">
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
                  </div>
                )}
              </>
            )}

            {/* ACTIONABLE ERROR / AUTH / OUT-OF-CREDITS BANNER */}
            {errorBanner && (
              <div
                role="alert"
                className={`rounded-[20px] p-4 border-[2px] space-y-3 ${
                  errorBanner.kind === 'credits'
                    ? 'bg-[#FFFDF2] border-[#F59E0B]'
                    : errorBanner.kind === 'auth'
                    ? 'bg-white border-[#6C19E5]'
                    : 'bg-[#FFF5F5] border-[#EF4444]'
                }`}
                style={{ boxShadow: '0 4px 0 #E2C700' }}
              >
                <div className="flex items-start gap-2.5">
                  {errorBanner.kind === 'auth' ? (
                    <Lock size={18} className="text-[#6C19E5] shrink-0 mt-0.5" />
                  ) : errorBanner.kind === 'credits' ? (
                    <Gem size={18} className="text-[#B45309] shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle size={18} className="text-[#DC2626] shrink-0 mt-0.5" />
                  )}
                  <p className="text-[13.5px] font-bold text-[#260559] leading-snug">
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
                        className="px-3.5 py-2 rounded-[12px] bg-[#F5F0FF] text-[#260559] text-[12.5px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
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
                      <span>Sign In to Chat</span>
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
        </main>

        {/* ================================================================= */}
        {/* 4. STICKY BOTTOM COMPOSER BAR                                     */}
        {/* ================================================================= */}
        <footer className="relative z-20 shrink-0 px-3 sm:px-6 pt-2 pb-[max(env(safe-area-inset-bottom,0px),10px)] bg-gradient-to-t from-[#FFE014] via-[#FFE61E]/95 to-transparent">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendQuestion(inputText);
            }}
            className="max-w-[860px] mx-auto"
          >
            <div
              className="rounded-[22px] bg-white border-[2px] border-[#E7DAFB] focus-within:border-[#6C19E5] p-2 sm:p-2.5 flex items-end gap-2"
              style={{ boxShadow: '0 4px 0 #E2C700' }}
            >
              <textarea
                ref={inputRef}
                rows={1}
                maxLength={1000}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  settings.language === 'pidgin'
                    ? 'Ask SABI any JAMB question or paste equation...'
                    : 'Ask any JAMB question, paste an equation, or request a breakdown...'
                }
                className="flex-1 resize-none max-h-[120px] min-h-[42px] bg-transparent px-2.5 py-2 text-[14.5px] font-semibold text-[#260559] placeholder:text-[#8A77AE] focus:outline-none leading-snug"
              />

              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                aria-label="Send message to SABI Assistant"
                className="h-[44px] px-4 sm:px-5 rounded-[15px] bg-[#6C19E5] hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed text-white font-extrabold text-[14px] inline-flex items-center justify-center gap-1.5 shrink-0 transition-transform active:translate-y-[1px] cursor-pointer"
                style={{
                  fontFamily: "'Fredoka', 'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 3.5px 0 #46099E',
                }}
              >
                <Send size={16} />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>

            <div className="mt-1.5 px-2 flex items-center justify-between gap-2 text-[11px] font-extrabold text-[#4F3B73]">
              <span className="inline-flex items-center gap-1">
                <Gem size={11} className="text-[#6C19E5]" />
                <span>
                  {AI_CREDIT_COST_PER_REPLY} Credit / reply · {creditState.totalCredits} left
                </span>
              </span>
              <span className="tabular-nums">{inputText.length}/1000</span>
            </div>
          </form>
        </footer>
      </div>
    </SabiAppChrome>
  );
}
