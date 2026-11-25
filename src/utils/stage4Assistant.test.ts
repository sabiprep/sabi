import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_STORED_ASSISTANT_MESSAGES,
  appendAssistantMessage,
  appendMessageToSession,
  buildAssistantStarterPrompts,
  clearAssistantConversation,
  clearAssistantSessionMessages,
  consumeAssistantCredit,
  createAssistantSession,
  deleteAssistantSession,
  deriveChatTitleFromPrompt,
  getAssistantCreditState,
  loadAssistantLanguage,
  loadAssistantMessages,
  loadAssistantSessions,
  loadAssistantSettings,
  loadTopicMemory,
  saveAssistantLanguage,
  saveAssistantSettings,
  saveTopicMemory,
  searchAssistantSessions,
} from './sabiAssistantStore';
import {
  getRealUserProgress,
  recordStudyActivity,
  saveRealUserProgress,
} from './userProgressStore';

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe('Stage 1 / Stage 4 — SABI Assistant Multi-Chat Store, Settings, AI Credits & Prompts', () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', {
      localStorage: storage,
      dispatchEvent: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts with 0 AI Credits and refuses deduction when balance is empty', () => {
    const credits = getAssistantCreditState();
    expect(credits.totalCredits).toBe(0);
    expect(credits.hasEnoughCredits).toBe(false);

    const attempt = consumeAssistantCredit();
    expect(attempt.ok).toBe(false);
    expect(attempt.source).toBeNull();
    expect(attempt.remainingCredits).toBe(0);
  });

  it('spends limited Assistance Diamonds before paid Subscription Diamonds', () => {
    const base = getRealUserProgress();
    saveRealUserProgress({
      ...base,
      streakBonusDiamonds: 1,
      mainDiamonds: 5,
      subscriptionPlan: 'scholar_pass',
    });

    const firstSpend = consumeAssistantCredit();
    expect(firstSpend.ok).toBe(true);
    expect(firstSpend.source).toBe('assistance');
    expect(firstSpend.remainingCredits).toBe(5);

    const afterFirst = getAssistantCreditState();
    expect(afterFirst.assistanceDiamonds).toBe(0);
    expect(afterFirst.subscriptionDiamonds).toBe(5);

    const secondSpend = consumeAssistantCredit();
    expect(secondSpend.ok).toBe(true);
    expect(secondSpend.source).toBe('subscription');
    expect(secondSpend.remainingCredits).toBe(4);
  });

  it('manages multiple Old Chats sessions with auto-titling, search, clear, and delete', () => {
    const first = createAssistantSession({ subject: 'Chemistry' });
    appendMessageToSession(first.id, {
      id: 'u-1',
      role: 'user',
      text: 'Explain periodic table ionization energy trends',
      subject: 'Chemistry',
      createdAt: '2026-11-25T10:00:00.000Z',
    });

    const second = createAssistantSession({ subject: 'Physics' });
    appendMessageToSession(second.id, {
      id: 'u-2',
      role: 'user',
      text: 'How do I calculate maximum height in projectile motion?',
      subject: 'Physics',
      createdAt: '2026-11-25T10:05:00.000Z',
    });

    const all = loadAssistantSessions();
    expect(all).toHaveLength(2);
    expect(all[0].title).toContain('maximum height');
    expect(all[1].title).toContain('ionization energy');

    const matches = searchAssistantSessions(all, 'projectile');
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe(second.id);

    const cleared = clearAssistantSessionMessages(second.id);
    expect(cleared.find((s) => s.id === second.id)?.messages).toEqual([]);

    const afterDelete = deleteAssistantSession(first.id);
    expect(afterDelete).toHaveLength(1);
    expect(afterDelete[0].id).toBe(second.id);
  });

  it('migrates legacy v1 flat chat history cleanly into a session', () => {
    localStorage.setItem(
      'sabi_assistant_chat_v1',
      JSON.stringify([
        {
          id: 'legacy-1',
          role: 'user',
          text: 'What is Newton second law?',
          subject: 'Physics',
          createdAt: '2026-11-24T09:00:00.000Z',
        },
      ])
    );

    const sessions = loadAssistantSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].title).toBe(deriveChatTitleFromPrompt('What is Newton second law?'));
    expect(sessions[0].messages).toHaveLength(1);
  });

  it('persists chat messages, caps length, and clears cleanly', () => {
    for (let i = 0; i < MAX_STORED_ASSISTANT_MESSAGES + 5; i++) {
      appendAssistantMessage({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        text: `Question or reply ${i}`,
        subject: 'Chemistry',
        createdAt: new Date().toISOString(),
      });
    }

    const loaded = loadAssistantMessages();
    expect(loaded).toHaveLength(MAX_STORED_ASSISTANT_MESSAGES);
    expect(loaded[loaded.length - 1].id).toBe(`msg-${MAX_STORED_ASSISTANT_MESSAGES + 4}`);

    clearAssistantConversation();
    expect(loadAssistantMessages()).toEqual([]);
  });

  it('persists Assistant settings (language, explanation depth, default subject) and topic memory', () => {
    expect(loadAssistantLanguage()).toBe('english');
    saveAssistantLanguage('pidgin');
    expect(loadAssistantLanguage()).toBe('pidgin');

    const saved = saveAssistantSettings({
      explanationDepth: 'short',
      defaultSubject: 'Mathematics',
    });
    expect(saved).toEqual({
      language: 'pidgin',
      explanationDepth: 'short',
      defaultSubject: 'Mathematics',
    });
    expect(loadAssistantSettings()).toEqual(saved);

    saveTopicMemory('Physics::Projectile Motion', 'Student needs practice on max height formula.');
    expect(loadTopicMemory('Physics::Projectile Motion')).toContain('max height formula');
  });

  it('prioritizes real weak topics from study history in starter prompts', () => {
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Electrochemistry',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 20,
    });
    recordStudyActivity({
      subject: 'Chemistry',
      topic: 'Electrochemistry',
      isCorrect: false,
      mode: 'smart',
      elapsedSeconds: 20,
    });

    const prompts = buildAssistantStarterPrompts('Chemistry');
    expect(prompts.length).toBe(4);
    expect(prompts[0].isWeakTopic).toBe(true);
    expect(prompts[0].label).toContain('Electrochemistry');
    expect(prompts[0].prompt).toContain('Chemistry');

    const focused = buildAssistantStarterPrompts('Physics', 'Wave Optics');
    expect(focused[0].label).toBe('Fix Wave Optics');
    expect(focused[0].topic).toBe('Wave Optics');
  });
});
