import { getSubjectRatingsSnapshot } from './progressInsightsEngine';
import { getEconomySnapshot, spendUserDiamonds } from './userProgressStore';

export type AssistantLanguage = 'english' | 'pidgin';

export interface AssistantChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  subject: string;
  topic?: string;
  createdAt: string;
  creditSource?: 'assistance' | 'subscription';
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

const MESSAGES_STORAGE_KEY = 'sabi_assistant_chat_v1';
const MEMORY_STORAGE_KEY = 'sabi_assistant_topic_memory_v1';
const LANGUAGE_STORAGE_KEY = 'sabi_assistant_lang_v1';

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

export function loadAssistantMessages(): AssistantChatMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (m): m is AssistantChatMessage =>
          Boolean(m) &&
          typeof m.id === 'string' &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.text === 'string' &&
          m.text.trim().length > 0
      )
      .slice(-MAX_STORED_ASSISTANT_MESSAGES);
  } catch {
    return [];
  }
}

export function saveAssistantMessages(messages: AssistantChatMessage[]): AssistantChatMessage[] {
  const trimmed = messages.slice(-MAX_STORED_ASSISTANT_MESSAGES);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // ignore storage quota errors
    }
  }
  return trimmed;
}

export function appendAssistantMessage(message: AssistantChatMessage): AssistantChatMessage[] {
  const existing = loadAssistantMessages();
  return saveAssistantMessages([...existing, message]);
}

export function clearAssistantConversation(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(MESSAGES_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function loadAssistantLanguage(): AssistantLanguage {
  if (typeof window === 'undefined') return 'english';
  try {
    const raw = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return raw === 'pidgin' ? 'pidgin' : 'english';
  } catch {
    return 'english';
  }
}

export function saveAssistantLanguage(language: AssistantLanguage): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // ignore
  }
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
