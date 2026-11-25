import { getSubjectRatingsSnapshot } from './progressInsightsEngine';
import { getEconomySnapshot, spendUserDiamonds } from './userProgressStore';

export type AssistantLanguage = 'english' | 'pidgin';
export type AssistantExplanationDepth = 'detailed' | 'short';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  subject: string;
  topic?: string;
  createdAt: string;
  creditSource?: 'assistance' | 'subscription';
}

export interface AssistantChatSession {
  id: string;
  title: string;
  subject: string;
  topic?: string;
  createdAt: string;
  updatedAt: string;
  messages: AssistantChatMessage[];
  topicMemory?: string;
}

export interface AssistantSettings {
  language: AssistantLanguage;
  explanationDepth: AssistantExplanationDepth;
  defaultSubject: string;
}

export interface AssistantStarterPrompt {
  id: string;
  label: string;
  subject: string;
  topic?: string;
  prompt: string;
  isWeakTopic?: boolean;
}

export interface AssistantCreditState {
  totalCredits: number;
  subscriptionDiamonds: number;
  assistanceDiamonds: number;
  costPerReply: number;
  hasEnoughCredits: boolean;
  xpPerAssistanceDiamond: number;
  xpTowardNextDiamond: number;
  xpNeededForNextDiamond: number;
  dailyAssistanceDiamondsEarned: number;
  dailyAssistanceDiamondCap: number;
  subscriptionPlan: 'free' | 'scholar_pass' | 'citadel_pro';
}

export const AI_CREDIT_COST_PER_REPLY = 1;
export const MAX_STORED_ASSISTANT_MESSAGES = 40;
export const MAX_STORED_ASSISTANT_SESSIONS = 25;

const LEGACY_MESSAGES_KEY = 'sabi_assistant_chat_v1';
const SESSIONS_STORAGE_KEY = 'sabi_assistant_sessions_v2';
const ACTIVE_SESSION_KEY = 'sabi_assistant_active_session_v2';
const SETTINGS_STORAGE_KEY = 'sabi_assistant_settings_v1';
const MEMORY_STORAGE_KEY = 'sabi_assistant_topic_memory_v1';
const LANGUAGE_STORAGE_KEY = 'sabi_assistant_lang_v1';

const DEFAULT_SETTINGS: AssistantSettings = {
  language: 'english',
  explanationDepth: 'detailed',
  defaultSubject: 'All Subjects',
};

const SUBJECT_STARTER_BANK: Record<string, { label: string; topic: string; prompt: string }[]> = {
  'English Language': [
    {
      label: 'Oral stress & emphatic stress',
      topic: 'Oral English',
      prompt: 'Teach me the fastest rules for JAMB emphatic stress and word stress with 3 exam examples.',
    },
    {
      label: 'Concord & subject-verb rules',
      topic: 'Concord',
      prompt: 'Summarize the top JAMB concord rules that trick candidates most and quiz me on one.',
    },
  ],
  Mathematics: [
    {
      label: 'Quadratic roots & discriminant',
      topic: 'Quadratic Equations',
      prompt: 'Explain how to use the discriminant and sum/product of roots to solve JAMB quadratic questions fast.',
    },
    {
      label: 'Calculus differentiation tricks',
      topic: 'Differentiation',
      prompt: 'Walk me through JAMB differentiation shortcuts for turning points and gradients step by step.',
    },
  ],
  Physics: [
    {
      label: 'Projectile motion formulas',
      topic: 'Projectile Motion',
      prompt: 'Break down the key JAMB projectile motion formulas (time of flight, max height, range) with a worked example.',
    },
    {
      label: 'Electricity & Ohm’s Law circuits',
      topic: 'Current Electricity',
      prompt: 'How do I quickly solve series-parallel resistor and internal resistance questions in JAMB Physics?',
    },
  ],
  Chemistry: [
    {
      label: 'Periodic table trends',
      topic: 'Periodic Table',
      prompt: 'Explain ionization energy, electronegativity, and atomic radius trends across periods and down groups for JAMB.',
    },
    {
      label: 'Stoichiometry & mole calculations',
      topic: 'Mole Concept',
      prompt: 'Show me a foolproof step-by-step method for JAMB mole ratio and gas volume calculations.',
    },
  ],
  Biology: [
    {
      label: 'Genetics & Mendelian crosses',
      topic: 'Genetics',
      prompt: 'Explain monohybrid and dihybrid crosses plus blood group inheritance the way JAMB tests them.',
    },
    {
      label: 'Ecology & nutrient cycles',
      topic: 'Ecology',
      prompt: 'Summarize the nitrogen cycle and ecological succession key terms that JAMB repeats every year.',
    },
  ],
  Economics: [
    {
      label: 'Elasticity of demand',
      topic: 'Elasticity',
      prompt: 'How do I calculate price elasticity of demand and interpret elastic vs inelastic goods for JAMB?',
    },
  ],
  Government: [
    {
      label: 'Nigerian federalism & constitutions',
      topic: 'Constitutional Development',
      prompt: 'Compare Clifford, Richards, Macpherson, and Lyttleton constitutions in a crisp JAMB revision table.',
    },
  ],
};

const GENERAL_STARTERS: AssistantStarterPrompt[] = [
  {
    id: 'gen-time',
    label: '120-minute CBT pacing plan',
    subject: 'All Subjects',
    topic: 'Exam Strategy',
    prompt: 'Give me a practical minute-by-minute time management plan for all 180 JAMB CBT questions in 2 hours.',
  },
  {
    id: 'gen-traps',
    label: 'Spot common JAMB option traps',
    subject: 'All Subjects',
    topic: 'Exam Strategy',
    prompt: 'What are the most common wrong-option traps JAMB sets across English and my other 3 subjects?',
  },
  {
    id: 'gen-revision',
    label: 'High-yield 7-day revision plan',
    subject: 'All Subjects',
    topic: 'Study Plan',
    prompt: 'Create a focused 7-day JAMB revision schedule balancing my 4 subjects for a 300+ score.',
  },
  {
    id: 'gen-formula',
    label: 'Must-know formulas & definitions',
    subject: 'All Subjects',
    topic: 'Quick Recap',
    prompt: 'Quiz me with 3 high-frequency JAMB concepts across my subjects and explain any I miss.',
  },
];

function sanitizeMessages(raw: unknown): AssistantChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is AssistantChatMessage =>
        Boolean(m) &&
        typeof (m as AssistantChatMessage).id === 'string' &&
        ((m as AssistantChatMessage).role === 'user' || (m as AssistantChatMessage).role === 'assistant') &&
        typeof (m as AssistantChatMessage).text === 'string' &&
        (m as AssistantChatMessage).text.trim().length > 0
    )
    .slice(-MAX_STORED_ASSISTANT_MESSAGES);
}

export function deriveChatTitleFromPrompt(prompt: string, fallback = 'New SABI Chat'): string {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (!cleaned) return fallback;
  return cleaned.length > 46 ? `${cleaned.slice(0, 45).trimEnd()}…` : cleaned;
}

function writeSessions(sessions: AssistantChatSession[]): AssistantChatSession[] {
  const trimmed = sessions
    .slice(0, MAX_STORED_ASSISTANT_SESSIONS)
    .map((s) => ({
      ...s,
      messages: sanitizeMessages(s.messages),
    }));
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage quota errors
    }
  }
  return trimmed;
}

/**
 * Loads all multi-session SABI Assistant chats, sorted most-recent first.
 * Automatically migrates any legacy single-thread history into Session 1.
 */
export function loadAssistantSessions(): AssistantChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(
            (s): s is AssistantChatSession =>
              Boolean(s) && typeof s.id === 'string' && typeof s.title === 'string'
          )
          .map((s) => ({
            ...s,
            subject: typeof s.subject === 'string' && s.subject ? s.subject : 'All Subjects',
            messages: sanitizeMessages(s.messages),
            createdAt: typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString(),
            updatedAt: typeof s.updatedAt === 'string' ? s.updatedAt : new Date().toISOString(),
          }))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, MAX_STORED_ASSISTANT_SESSIONS);
      }
    }

    // One-time migration from legacy v1 flat chat array
    const legacyRaw = localStorage.getItem(LEGACY_MESSAGES_KEY);
    if (legacyRaw) {
      const legacyMsgs = sanitizeMessages(JSON.parse(legacyRaw));
      if (legacyMsgs.length > 0) {
        const firstUser = legacyMsgs.find((m) => m.role === 'user');
        const migrated: AssistantChatSession = {
          id: `chat-${Date.now()}`,
          title: deriveChatTitleFromPrompt(firstUser?.text || 'Previous SABI Chat'),
          subject: firstUser?.subject || 'All Subjects',
          topic: firstUser?.topic,
          createdAt: legacyMsgs[0].createdAt || new Date().toISOString(),
          updatedAt: legacyMsgs[legacyMsgs.length - 1].createdAt || new Date().toISOString(),
          messages: legacyMsgs,
        };
        writeSessions([migrated]);
        setActiveAssistantSessionId(migrated.id);
        return [migrated];
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function getActiveAssistantSessionId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  } catch {
    return null;
  }
}

export function setActiveAssistantSessionId(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch {
    // ignore
  }
}

export function createAssistantSession(options?: {
  subject?: string;
  topic?: string;
  title?: string;
}): AssistantChatSession {
  const now = new Date().toISOString();
  const subject = options?.subject?.trim() || 'All Subjects';
  const topic = options?.topic?.trim() || undefined;
  const session: AssistantChatSession = {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title:
      options?.title?.trim() ||
      (topic ? `${topic} (${subject})` : subject !== 'All Subjects' ? `${subject} Chat` : 'New SABI Chat'),
    subject,
    topic,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };

  const existing = loadAssistantSessions();
  writeSessions([session, ...existing]);
  setActiveAssistantSessionId(session.id);
  return session;
}

export function ensureActiveAssistantSession(options?: {
  subject?: string;
  topic?: string;
}): { sessions: AssistantChatSession[]; activeSession: AssistantChatSession } {
  const sessions = loadAssistantSessions();
  const activeId = getActiveAssistantSessionId();
  const existing = sessions.find((s) => s.id === activeId) || sessions[0];

  if (existing) {
    setActiveAssistantSessionId(existing.id);
    return { sessions, activeSession: existing };
  }

  const created = createAssistantSession(options);
  return { sessions: loadAssistantSessions(), activeSession: created };
}

export function appendMessageToSession(
  sessionId: string,
  message: AssistantChatMessage,
  topicMemoryUpdate?: string
): AssistantChatSession[] {
  const sessions = loadAssistantSessions();
  const idx = sessions.findIndex((s) => s.id === sessionId);
  const now = message.createdAt || new Date().toISOString();

  if (idx === -1) {
    const fresh: AssistantChatSession = {
      id: sessionId,
      title:
        message.role === 'user'
          ? deriveChatTitleFromPrompt(message.text)
          : 'SABI Study Chat',
      subject: message.subject || 'All Subjects',
      topic: message.topic,
      createdAt: now,
      updatedAt: now,
      messages: [message],
      topicMemory: topicMemoryUpdate?.trim() || undefined,
    };
    return writeSessions([fresh, ...sessions]);
  }

  const target = sessions[idx];
  const isFirstUserMessage =
    message.role === 'user' && !target.messages.some((m) => m.role === 'user');
  const nextTitle = isFirstUserMessage
    ? deriveChatTitleFromPrompt(message.text, target.title)
    : target.title;

  const updated: AssistantChatSession = {
    ...target,
    title: nextTitle,
    subject: message.subject || target.subject,
    topic: message.topic ?? target.topic,
    updatedAt: now,
    messages: [...target.messages, message].slice(-MAX_STORED_ASSISTANT_MESSAGES),
    topicMemory: topicMemoryUpdate?.trim() || target.topicMemory,
  };

  const others = sessions.filter((s) => s.id !== sessionId);
  return writeSessions([updated, ...others]);
}

export function updateAssistantSessionContext(
  sessionId: string,
  updates: { subject?: string; topic?: string }
): AssistantChatSession[] {
  const sessions = loadAssistantSessions();
  const next = sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          subject: updates.subject !== undefined ? updates.subject : s.subject,
          topic: updates.topic !== undefined ? updates.topic || undefined : s.topic,
        }
      : s
  );
  return writeSessions(next);
}

export function clearAssistantSessionMessages(sessionId: string): AssistantChatSession[] {
  const sessions = loadAssistantSessions();
  const next = sessions.map((s) =>
    s.id === sessionId
      ? {
          ...s,
          title:
            s.subject !== 'All Subjects' ? `${s.subject} Chat` : 'New SABI Chat',
          messages: [],
          topicMemory: undefined,
          updatedAt: new Date().toISOString(),
        }
      : s
  );
  return writeSessions(next);
}

export function deleteAssistantSession(sessionId: string): AssistantChatSession[] {
  const remaining = loadAssistantSessions().filter((s) => s.id !== sessionId);
  const saved = writeSessions(remaining);
  if (getActiveAssistantSessionId() === sessionId) {
    if (saved[0]) {
      setActiveAssistantSessionId(saved[0].id);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  }
  return saved;
}

export function searchAssistantSessions(
  sessions: AssistantChatSession[],
  query: string
): AssistantChatSession[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.subject.toLowerCase().includes(q) ||
      (s.topic && s.topic.toLowerCase().includes(q)) ||
      s.messages.some((m) => m.text.toLowerCase().includes(q))
  );
}

// --- Settings Store ---
export function loadAssistantSettings(): AssistantSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AssistantSettings>;
      return {
        language: parsed.language === 'pidgin' ? 'pidgin' : 'english',
        explanationDepth: parsed.explanationDepth === 'short' ? 'short' : 'detailed',
        defaultSubject:
          typeof parsed.defaultSubject === 'string' && parsed.defaultSubject.trim()
            ? parsed.defaultSubject
            : 'All Subjects',
      };
    }
    const legacyLang = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return {
      ...DEFAULT_SETTINGS,
      language: legacyLang === 'pidgin' ? 'pidgin' : 'english',
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAssistantSettings(partial: Partial<AssistantSettings>): AssistantSettings {
  const current = loadAssistantSettings();
  const next: AssistantSettings = {
    language: partial.language ?? current.language,
    explanationDepth: partial.explanationDepth ?? current.explanationDepth,
    defaultSubject: partial.defaultSubject ?? current.defaultSubject,
  };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next.language);
    } catch {
      // ignore
    }
  }
  return next;
}

// --- Backwards-compatible single-thread wrappers ---
export function loadAssistantMessages(): AssistantChatMessage[] {
  const { activeSession } = ensureActiveAssistantSession();
  return activeSession.messages;
}

export function saveAssistantMessages(messages: AssistantChatMessage[]): AssistantChatMessage[] {
  const { activeSession, sessions } = ensureActiveAssistantSession();
  const trimmed = sanitizeMessages(messages);
  const next = sessions.map((s) =>
    s.id === activeSession.id
      ? { ...s, messages: trimmed, updatedAt: new Date().toISOString() }
      : s
  );
  writeSessions(next);
  return trimmed;
}

export function appendAssistantMessage(message: AssistantChatMessage): AssistantChatMessage[] {
  const { activeSession } = ensureActiveAssistantSession({
    subject: message.subject,
    topic: message.topic,
  });
  const updated = appendMessageToSession(activeSession.id, message);
  return updated.find((s) => s.id === activeSession.id)?.messages || [];
}

export function clearAssistantConversation(): void {
  const activeId = getActiveAssistantSessionId();
  if (activeId) {
    clearAssistantSessionMessages(activeId);
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(LEGACY_MESSAGES_KEY);
    } catch {
      // ignore
    }
  }
}

export function loadAssistantLanguage(): AssistantLanguage {
  return loadAssistantSettings().language;
}

export function saveAssistantLanguage(language: AssistantLanguage): void {
  saveAssistantSettings({ language });
}

export function loadTopicMemory(scopeKey: string): string {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return '';
    const map = JSON.parse(raw) as Record<string, string>;
    return typeof map[scopeKey] === 'string' ? map[scopeKey] : '';
  } catch {
    return '';
  }
}

export function saveTopicMemory(scopeKey: string, summary: string): void {
  if (typeof window === 'undefined' || !summary.trim()) return;
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[scopeKey] = summary.trim().slice(0, 1500);
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getAssistantCreditState(): AssistantCreditState {
  const economy = getEconomySnapshot();
  return {
    totalCredits: economy.aiCreditsAvailable,
    subscriptionDiamonds: economy.subscriptionDiamonds,
    assistanceDiamonds: economy.assistanceDiamonds,
    costPerReply: AI_CREDIT_COST_PER_REPLY,
    hasEnoughCredits: economy.aiCreditsAvailable >= AI_CREDIT_COST_PER_REPLY,
    xpPerAssistanceDiamond: economy.xpPerAssistanceDiamond,
    xpTowardNextDiamond: economy.xpTowardNextDiamond,
    xpNeededForNextDiamond: economy.xpNeededForNextDiamond,
    dailyAssistanceDiamondsEarned: economy.dailyAssistanceDiamondsEarned,
    dailyAssistanceDiamondCap: economy.dailyAssistanceDiamondCap,
    subscriptionPlan: economy.subscriptionPlan,
  };
}

/**
 * Deducts 1 AI Credit (1 Diamond) after a successful SABI Assistant reply.
 * Always spends limited Assistance Diamonds before paid Subscription Diamonds.
 */
export function consumeAssistantCredit(): {
  ok: boolean;
  source: 'assistance' | 'subscription' | null;
  remainingCredits: number;
} {
  const result = spendUserDiamonds(AI_CREDIT_COST_PER_REPLY);
  if (!result.success) {
    return {
      ok: false,
      source: null,
      remainingCredits: result.progress.diamonds,
    };
  }
  return {
    ok: true,
    source: result.usedStreakBonus > 0 ? 'assistance' : 'subscription',
    remainingCredits: result.progress.diamonds,
  };
}

/**
 * Generates contextual starter prompts for SABI Assistant, prioritizing real weak topics
 * tracked by SABI's mastery engine for the selected subject (or all 4 subjects).
 */
export function buildAssistantStarterPrompts(
  selectedSubject: string,
  activeTopic?: string
): AssistantStarterPrompt[] {
  const prompts: AssistantStarterPrompt[] = [];
  const seenPrompts = new Set<string>();

  const pushPrompt = (item: AssistantStarterPrompt) => {
    const key = item.prompt.toLowerCase();
    if (seenPrompts.has(key) || prompts.length >= 4) return;
    seenPrompts.add(key);
    prompts.push(item);
  };

  if (activeTopic && selectedSubject !== 'All Subjects') {
    pushPrompt({
      id: `focused-topic-${activeTopic}`,
      label: `Fix ${activeTopic}`,
      subject: selectedSubject,
      topic: activeTopic,
      isWeakTopic: true,
      prompt: `Break down "${activeTopic}" in ${selectedSubject} step by step, show the common JAMB exam traps, and give me 1 quick practice check.`,
    });
  }

  const ratings = getSubjectRatingsSnapshot();
  const matchingSubjects =
    selectedSubject === 'All Subjects'
      ? ratings.subjects
      : ratings.subjects.filter(
          (entry) => entry.subject.canonicalName.toLowerCase() === selectedSubject.toLowerCase()
        );

  for (const entry of matchingSubjects) {
    for (const weak of entry.weakTopics.slice(0, 2)) {
      pushPrompt({
        id: `weak-${entry.subject.shortCode}-${weak.topicLabel}`,
        label: `${entry.subject.displayLabel}: ${weak.topicLabel} (${weak.accuracy}%)`,
        subject: entry.subject.canonicalName,
        topic: weak.topicLabel,
        isWeakTopic: true,
        prompt: `I currently have ${weak.accuracy}% accuracy on ${weak.topicLabel} in ${entry.subject.canonicalName}. Explain the core rules clearly and walk me through a typical JAMB question.`,
      });
    }
  }

  if (selectedSubject !== 'All Subjects') {
    const subjectBank = SUBJECT_STARTER_BANK[selectedSubject] || [];
    for (const item of subjectBank) {
      pushPrompt({
        id: `bank-${selectedSubject}-${item.topic}`,
        label: item.label,
        subject: selectedSubject,
        topic: item.topic,
        prompt: item.prompt,
      });
    }
    pushPrompt({
      id: `custom-subject-${selectedSubject}`,
      label: `Top JAMB topics in ${selectedSubject}`,
      subject: selectedSubject,
      topic: 'High-Yield Syllabus',
      prompt: `List the 5 most frequently tested JAMB topics in ${selectedSubject} and give me one key rule to remember for each.`,
    });
  }

  for (const fallback of GENERAL_STARTERS) {
    pushPrompt(fallback);
  }

  return prompts.slice(0, 4);
}
