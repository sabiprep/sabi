import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';
import {
  getShortSubjectLabel,
  loadSavedQuestionIds,
  toggleSavedQuestionId,
  type PracticeFeedQuestion,
} from './smartPracticeSession';
import { recordSessionDurationBonus, recordStudyActivity } from './userProgressStore';
import { flushOfflineActivityQueue, loadCachedLiveQuestions } from './activitySyncEngine';
import {
  loadDiagnosticBaseline,
  saveDiagnosticBaseline,
  type DiagnosticBaselineResult,
} from './dailyFailurePlan';

export { loadDiagnosticBaseline, saveDiagnosticBaseline };
export type { DiagnosticBaselineResult };

export type CbtMockPreset = 'full_180' | 'quick_40';
export type CbtSourceMode = 'shuffle' | 'year';

export interface CbtYearOption {
  year: number;
  matchedSubjectsCount: number;
  matchedSubjects: string[];
  questionCount: number;
}

export interface CbtExamQuestion extends PracticeFeedQuestion {
  examIndex: number;
  subjectOrderIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
  year?: number;
}

export interface CbtSubjectScore {
  subjectCanonical: string;
  subjectLabel: string;
  correct: number;
  total: number;
  answered: number;
  scaledScore100: number;
}

export interface CbtReviewItem {
  question: CbtExamQuestion;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  isCorrect: boolean;
  isFlagged: boolean;
}

export interface CbtMockResult {
  id: string;
  preset: CbtMockPreset;
  sourceMode?: CbtSourceMode;
  selectedYear?: number | null;
  title: string;
  completedAt: string;
  totalQuestions: number;
  answeredCount: number;
  correctCount: number;
  accuracyPercent: number;
  scaledUtme400: number;
  durationUsedSeconds: number;
  timeLimitSeconds: number;
  subjectScores: CbtSubjectScore[];
  weakestSubjectCanonical: string;
  weakestSubjectLabel: string;
  reviewItems: CbtReviewItem[];
}

export interface CustomPracticeConfig {
  subjects: string[];
  topics: string[];
  questionCount: number;
  difficulty: 'mix' | 'easy' | 'medium' | 'hard';
  feedbackTiming: 'instant' | 'end';
  timerMinutes: number | null;
  onlyMistakesOrSaved?: boolean;
}

export interface MistakeVaultEntry {
  questionId: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  lastSelectedOption?: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
  missedCount: number;
  lastMissedAt: string;
}

// DiagnosticBaselineResult is re-exported from `./dailyFailurePlan`.

export interface SabiNotificationItem {
  id: string;
  category: 'streak' | 'coach' | 'cbt' | 'system';
  title: string;
  body: string;
  timeAgo: string;
  read: boolean;
  actionPath?: string;
  actionLabel?: string;
}

const CBT_HISTORY_KEY = 'sabi_cbt_mock_history_v1';
const CBT_LAST_RESULT_KEY = 'sabi_cbt_last_result_v1';
const CUSTOM_CONFIG_KEY = 'sabi_custom_practice_config_v1';
const CUSTOM_HISTORY_KEY = 'sabi_custom_practice_history_v1';
const MISTAKES_VAULT_KEY = 'sabi_mistakes_vault_v1';
const NOTIFICATIONS_KEY = 'sabi_notifications_v1';

export const ALL_JAMB_SUBJECTS: string[] = [
  'English Language',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'Economics',
  'Government',
  'Literature-in-English',
  'Commerce',
  'Geography',
  'Financial Accounting',
  'Christian Religious Studies',
  'Islamic Religious Studies',
  'Agricultural Science',
];

function normalizeQuestion(q: Question): PracticeFeedQuestion & {
  difficulty: 'easy' | 'medium' | 'hard';
  year?: number;
} {
  return {
    id: q.id,
    subjectCanonical: q.subject,
    subjectLabel: getShortSubjectLabel(q.subject),
    topicLabel: q.topic || q.subtopic || 'Core Syllabus',
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanationShort:
      q.explanation_short ||
      `Option ${q.answer} is correct based on the official JAMB ${q.subject} syllabus.`,
    explanationFull:
      q.explanation ||
      q.explanation_short ||
      `Option ${q.answer} is the verified JAMB answer for ${q.topic || q.subject}.`,
    explanationPidgin:
      q.explanation_pidgin ||
      `Na Option ${q.answer} be the correct answer for dis ${q.subject} question.`,
    difficulty: q.difficulty || 'medium',
    year: q.year,
  };
}

let cachedSeedQuestions: (PracticeFeedQuestion & {
  difficulty: 'easy' | 'medium' | 'hard';
  year?: number;
})[] | null = null;

export function getAllNormalizedQuestions() {
  if (!cachedSeedQuestions) {
    cachedSeedQuestions = SEED_QUESTIONS.map(normalizeQuestion);
  }
  const liveCached = loadCachedLiveQuestions();
  if (liveCached.length === 0) {
    return cachedSeedQuestions;
  }
  const byId = new Map<
    string,
    PracticeFeedQuestion & { difficulty: 'easy' | 'medium' | 'hard'; year?: number }
  >();
  for (const item of liveCached) {
    byId.set(item.id, {
      ...item,
      difficulty: item.difficulty || 'medium',
      year: item.year,
    });
  }
  for (const seed of cachedSeedQuestions) {
    if (!byId.has(seed.id)) {
      byId.set(seed.id, seed);
    }
  }
  return Array.from(byId.values());
}

/**
 * Scans the real JAMB question bank for all available past years across the
 * candidate's 4 chosen subjects so the CBT Year Picker shows truthful coverage.
 */
export function getAvailableCbtYearsForSubjects(chosenSubjects: string[]): CbtYearOption[] {
  const orderedSubjects = Array.from(
    new Set([
      'English Language',
      ...chosenSubjects.filter(s => s && s !== 'English Language'),
    ])
  ).slice(0, 4);
  const subjectSet = new Set(orderedSubjects.map(s => s.toLowerCase()));
  const all = getAllNormalizedQuestions();

  const byYear = new Map<number, { subjects: Set<string>; count: number }>();

  for (const q of all) {
    if (!q.year || q.year < 2000) continue;
    if (!subjectSet.has(q.subjectCanonical.toLowerCase())) continue;
    const entry = byYear.get(q.year) || { subjects: new Set<string>(), count: 0 };
    entry.subjects.add(q.subjectCanonical);
    entry.count += 1;
    byYear.set(q.year, entry);
  }

  return Array.from(byYear.entries())
    .map(([year, info]) => ({
      year,
      matchedSubjectsCount: info.subjects.size,
      matchedSubjects: Array.from(info.subjects),
      questionCount: info.count,
    }))
    .sort((a, b) => b.matchedSubjectsCount - a.matchedSubjectsCount || b.year - a.year);
}

export function getQuestionsForSubject(
  subjectCanonical: string,
  count: number,
  options?: {
    topics?: string[];
    difficulty?: 'mix' | 'easy' | 'medium' | 'hard';
    year?: number | null;
  }
): (PracticeFeedQuestion & { difficulty: 'easy' | 'medium' | 'hard'; year?: number })[] {
  const all = getAllNormalizedQuestions();
  const normalizedTarget = subjectCanonical.toLowerCase();

  let pool = all.filter(q => q.subjectCanonical.toLowerCase() === normalizedTarget);
  if (pool.length === 0) {
    pool = all;
  }

  // Optional strict year prioritization with nearest-year fallback if that subject lacks the exact year
  if (typeof options?.year === 'number' && options.year > 0) {
    const exactYearMatches = pool.filter(q => q.year === options.year);
    if (exactYearMatches.length >= count) {
      pool = exactYearMatches;
    } else if (exactYearMatches.length > 0) {
      const remaining = pool
        .filter(q => q.year !== options.year)
        .sort(
          (a, b) =>
            Math.abs((a.year || 2020) - options.year!) -
            Math.abs((b.year || 2020) - options.year!)
        );
      const exactShuffled = [...exactYearMatches].sort(() => Math.random() - 0.5);
      const filler = remaining.slice(0, Math.max(0, count - exactShuffled.length));
      const combined = [...exactShuffled, ...filler];
      const pickedExact: (PracticeFeedQuestion & {
        difficulty: 'easy' | 'medium' | 'hard';
        year?: number;
      })[] = [];
      for (let i = 0; i < count; i += 1) {
        const base = combined[i % combined.length];
        pickedExact.push(
          i < combined.length
            ? base
            : { ...base, id: `${base.id}-y${Math.floor(i / combined.length)}` }
        );
      }
      return pickedExact;
    }
  }

  if (options?.topics && options.topics.length > 0) {
    const topicLower = options.topics.map(t => t.toLowerCase());
    const topicMatches = pool.filter(q =>
      topicLower.some(
        t =>
          q.topicLabel.toLowerCase().includes(t) ||
          t.includes(q.topicLabel.toLowerCase()) ||
          q.question.toLowerCase().includes(t.split(' ')[0] || '')
      )
    );
    if (topicMatches.length >= Math.min(count, 4)) {
      pool = topicMatches;
    }
  }

  if (options?.difficulty && options.difficulty !== 'mix') {
    const diffMatches = pool.filter(q => q.difficulty === options.difficulty);
    if (diffMatches.length >= Math.min(count, 4)) {
      pool = diffMatches;
    }
  }

  // Varied shuffle per run
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked: (PracticeFeedQuestion & { difficulty: 'easy' | 'medium' | 'hard'; year?: number })[] =
    [];

  for (let i = 0; i < count; i += 1) {
    const base = shuffled[i % shuffled.length];
    picked.push(
      i < shuffled.length
        ? base
        : {
            ...base,
            id: `${base.id}-r${Math.floor(i / shuffled.length)}`,
          }
    );
  }

  return picked;
}

/**
 * Builds an authentic JAMB UTME CBT mock deck:
 * - `full_180`: 60 English + 40 × 3 remaining chosen subjects = 180 questions (120 mins)
 * - `quick_40`: 10 × 4 chosen subjects = 40 questions (30 mins)
 * Supports `source: 'shuffle'` (Full Curriculum Random Shuffle) or `source: 'year'` (Specific Past Year).
 */
export function buildCbtMockDeck(
  chosenSubjects: string[],
  preset: CbtMockPreset,
  options?: {
    source?: CbtSourceMode;
    year?: number | null;
  }
): CbtExamQuestion[] {
  const orderedSubjects = Array.from(
    new Set([
      'English Language',
      ...chosenSubjects.filter(s => s && s !== 'English Language'),
    ])
  ).slice(0, 4);

  while (orderedSubjects.length < 4) {
    const fallback = ['Mathematics', 'Physics', 'Chemistry', 'Biology'].find(
      s => !orderedSubjects.includes(s)
    );
    if (fallback) orderedSubjects.push(fallback);
    else break;
  }

  const targetYear = options?.source === 'year' && options?.year ? options.year : null;
  const deck: CbtExamQuestion[] = [];
  let examIndex = 0;

  orderedSubjects.forEach((subject, _subjectIdx) => {
    const perSubjectCount =
      preset === 'full_180' ? (subject === 'English Language' ? 60 : 40) : 10;
    const questions = getQuestionsForSubject(subject, perSubjectCount, {
      year: targetYear,
    });
    questions.forEach((q, subIdx) => {
      deck.push({
        ...q,
        id: `${q.id}-cbt-${examIndex}`,
        examIndex,
        subjectOrderIndex: subIdx,
        subjectCanonical: subject,
        subjectLabel: getShortSubjectLabel(subject),
      });
      examIndex += 1;
    });
  });

  return deck;
}

export function gradeCbtExam(params: {
  preset: CbtMockPreset;
  sourceMode?: CbtSourceMode;
  selectedYear?: number | null;
  deck: CbtExamQuestion[];
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>;
  flagged: Record<number, boolean>;
  durationUsedSeconds: number;
  timeLimitSeconds: number;
}): CbtMockResult {
  const {
    preset,
    sourceMode = 'shuffle',
    selectedYear = null,
    deck,
    answers,
    flagged,
    durationUsedSeconds,
    timeLimitSeconds,
  } = params;

  const bySubject = new Map<
    string,
    { subjectCanonical: string; subjectLabel: string; correct: number; total: number; answered: number }
  >();

  const reviewItems: CbtReviewItem[] = deck.map((q, idx) => {
    const selectedOption = answers[idx] ?? null;
    const isCorrect = selectedOption === q.answer;
    const isFlagged = Boolean(flagged[idx]);

    const bucket = bySubject.get(q.subjectCanonical) || {
      subjectCanonical: q.subjectCanonical,
      subjectLabel: q.subjectLabel,
      correct: 0,
      total: 0,
      answered: 0,
    };
    bucket.total += 1;
    if (selectedOption) bucket.answered += 1;
    if (isCorrect) bucket.correct += 1;
    bySubject.set(q.subjectCanonical, bucket);

    if (selectedOption) {
      recordStudyActivity({
        questionId: q.id,
        subject: q.subjectCanonical,
        topic: q.topicLabel,
        selectedOption,
        isCorrect,
        mode: 'cbt',
        elapsedSeconds: Math.max(
          8,
          Math.round(durationUsedSeconds / Math.max(1, deck.length))
        ),
      });
      if (!isCorrect) {
        recordMistakeInVault(q, selectedOption);
      }
    }

    return {
      question: q,
      selectedOption,
      isCorrect,
      isFlagged,
    };
  });

  const subjectScores: CbtSubjectScore[] = Array.from(bySubject.values()).map(b => ({
    ...b,
    scaledScore100: b.total > 0 ? Math.round((b.correct / b.total) * 100) : 0,
  }));

  const totalQuestions = deck.length;
  const answeredCount = reviewItems.filter(r => r.selectedOption !== null).length;
  const correctCount = reviewItems.filter(r => r.isCorrect).length;
  const accuracyPercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const scaledUtme400 = subjectScores.reduce((sum, s) => sum + s.scaledScore100, 0);

  const weakest =
    [...subjectScores].sort((a, b) => a.scaledScore100 - b.scaledScore100)[0] || subjectScores[0];

  const baseTitle =
    preset === 'full_180' ? 'Full JAMB UTME Mock (180Q)' : 'Quick CBT Mock (40Q)';
  const sourcePrefix =
    sourceMode === 'year' && selectedYear
      ? `${selectedYear} Past Paper · `
      : 'Curriculum Shuffle · ';

  const result: CbtMockResult = {
    id: `cbt-${Date.now()}`,
    preset,
    sourceMode,
    selectedYear,
    title: `${sourcePrefix}${baseTitle}`,
    completedAt: new Date().toISOString(),
    totalQuestions,
    answeredCount,
    correctCount,
    accuracyPercent,
    scaledUtme400,
    durationUsedSeconds,
    timeLimitSeconds,
    subjectScores,
    weakestSubjectCanonical: weakest?.subjectCanonical || 'Chemistry',
    weakestSubjectLabel: weakest?.subjectLabel || 'Chemistry',
    reviewItems,
  };

  saveCbtMockResult(result);
  void flushOfflineActivityQueue();
  return result;
}

export function saveCbtMockResult(result: CbtMockResult): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CBT_LAST_RESULT_KEY, JSON.stringify(result));
    const existing = loadCbtMockHistory();
    // Store summary copy in history (without full 180-item array to keep localStorage fast)
    const compact: CbtMockResult = {
      ...result,
      reviewItems: result.reviewItems.slice(0, 40),
    };
    localStorage.setItem(CBT_HISTORY_KEY, JSON.stringify([compact, ...existing].slice(0, 12)));

    // Credit CBT completion duration XP into the unified real progress store
    recordSessionDurationBonus({
      mode: 'cbt',
      durationSeconds: result.durationUsedSeconds,
      completionBonusXp: Math.max(20, Math.round(result.correctCount * 2)),
    });
  } catch {
    // ignore storage quota errors
  }
}

export function loadLastCbtMockResult(): CbtMockResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CBT_LAST_RESULT_KEY);
    return raw ? (JSON.parse(raw) as CbtMockResult) : null;
  } catch {
    return null;
  }
}

export function loadCbtMockHistory(): CbtMockResult[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CBT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CbtMockResult[]) : [];
  } catch {
    return [];
  }
}

// =========================================================================
// CUSTOM PRACTICE CONFIG & DECK BUILDER
// =========================================================================
export function saveCustomPracticeConfig(config: CustomPracticeConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CUSTOM_CONFIG_KEY, JSON.stringify(config));
  } catch {
    // ignore
  }
}

export function loadCustomPracticeConfig(defaultSubjects: string[]): CustomPracticeConfig {
  const fallback: CustomPracticeConfig = {
    subjects: defaultSubjects.slice(0, 2),
    topics: [],
    questionCount: 15,
    difficulty: 'mix',
    feedbackTiming: 'instant',
    timerMinutes: null,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(CUSTOM_CONFIG_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<CustomPracticeConfig>;
    return {
      ...fallback,
      ...parsed,
      subjects:
        Array.isArray(parsed.subjects) && parsed.subjects.length > 0
          ? parsed.subjects
          : fallback.subjects,
      topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    };
  } catch {
    return fallback;
  }
}

export function buildCustomPracticeDeck(config: CustomPracticeConfig): PracticeFeedQuestion[] {
  if (config.onlyMistakesOrSaved) {
    const mistakes = loadMistakesVault();
    const savedIds = loadSavedQuestionIds();
    const all = getAllNormalizedQuestions();
    const savedQs = all.filter(q => savedIds.includes(q.id));
    const merged: PracticeFeedQuestion[] = [
      ...mistakes.map(m => ({
        id: m.questionId,
        subjectCanonical: m.subjectCanonical,
        subjectLabel: m.subjectLabel,
        topicLabel: m.topicLabel,
        question: m.question,
        options: m.options,
        answer: m.answer,
        explanationShort: m.explanationShort,
        explanationFull: m.explanationFull,
        explanationPidgin: m.explanationPidgin,
      })),
      ...savedQs,
    ];
    if (merged.length > 0) {
      return merged.slice(0, Math.max(5, config.questionCount));
    }
  }

  const subjects = config.subjects.length > 0 ? config.subjects : ['English Language', 'Mathematics'];
  const basePerSubject = Math.max(1, Math.floor(config.questionCount / subjects.length));
  const remainder = config.questionCount - basePerSubject * subjects.length;

  const deck: PracticeFeedQuestion[] = [];
  subjects.forEach((subj, idx) => {
    const take = basePerSubject + (idx < remainder ? 1 : 0);
    const items = getQuestionsForSubject(subj, take, {
      topics: config.topics,
      difficulty: config.difficulty,
    });
    deck.push(...items);
  });

  return deck.sort(() => Math.random() - 0.5).slice(0, config.questionCount);
}

export interface CustomRunSummary {
  id: string;
  completedAt: string;
  subjectsLabel: string;
  correctCount: number;
  totalQuestions: number;
  accuracyPercent: number;
}

export function recordCustomRunSummary(summary: CustomRunSummary): void {
  if (typeof window === 'undefined') return;
  try {
    const prev = loadCustomRunHistory();
    localStorage.setItem(CUSTOM_HISTORY_KEY, JSON.stringify([summary, ...prev].slice(0, 8)));
  } catch {
    // ignore
  }
}

export function loadCustomRunHistory(): CustomRunSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomRunSummary[]) : [];
  } catch {
    return [];
  }
}

// =========================================================================
// MISTAKES VAULT & SAVED QUESTIONS
// =========================================================================
export function loadMistakesVault(): MistakeVaultEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MISTAKES_VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as MistakeVaultEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordMistakeInVault(
  q: PracticeFeedQuestion,
  selectedOption?: 'A' | 'B' | 'C' | 'D'
): void {
  if (typeof window === 'undefined') return;
  try {
    const current = loadMistakesVault();
    const existingIdx = current.findIndex(item => item.questionId === q.id);
    if (existingIdx >= 0) {
      const existing = current[existingIdx];
      current[existingIdx] = {
        ...existing,
        lastSelectedOption: selectedOption,
        missedCount: existing.missedCount + 1,
        lastMissedAt: new Date().toISOString(),
      };
    } else {
      current.unshift({
        questionId: q.id,
        subjectCanonical: q.subjectCanonical,
        subjectLabel: q.subjectLabel,
        topicLabel: q.topicLabel,
        question: q.question,
        options: q.options,
        answer: q.answer,
        lastSelectedOption: selectedOption,
        explanationShort: q.explanationShort,
        explanationFull: q.explanationFull,
        explanationPidgin: q.explanationPidgin,
        missedCount: 1,
        lastMissedAt: new Date().toISOString(),
      });
    }
    localStorage.setItem(MISTAKES_VAULT_KEY, JSON.stringify(current.slice(0, 60)));
  } catch {
    // ignore
  }
}

export function removeMistakeFromVault(questionId: string): MistakeVaultEntry[] {
  const next = loadMistakesVault().filter(m => m.questionId !== questionId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(MISTAKES_VAULT_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}

export function getSavedQuestionsDetailed(): PracticeFeedQuestion[] {
  const savedIds = loadSavedQuestionIds();
  if (savedIds.length === 0) return [];
  const all = getAllNormalizedQuestions();
  const byId = new Map(all.map(q => [q.id, q]));
  const result: PracticeFeedQuestion[] = [];
  for (const id of savedIds) {
    const found = byId.get(id);
    if (found) result.push(found);
  }
  return result;
}

export { toggleSavedQuestionId };

// =========================================================================
// DIAGNOSTIC BASELINE
// =========================================================================
export function buildDiagnosticDeck(chosenSubjects: string[]): PracticeFeedQuestion[] {
  const ordered = Array.from(
    new Set(['English Language', ...chosenSubjects.filter(s => s !== 'English Language')])
  ).slice(0, 4);

  const deck: PracticeFeedQuestion[] = [];
  ordered.forEach(subj => {
    deck.push(...getQuestionsForSubject(subj, 3));
  });
  return deck;
}

// `saveDiagnosticBaseline` & `loadDiagnosticBaseline` are re-exported from `./dailyFailurePlan`.

// =========================================================================
// NOTIFICATIONS & REMINDERS
// =========================================================================
const DEFAULT_NOTIFICATIONS: SabiNotificationItem[] = [
  {
    id: 'notif-streak-1',
    category: 'streak',
    title: 'Keep your study streak alive!',
    body: 'A quick 5-minute Blitz run today locks in your daily XP goal and protects your streak.',
    timeAgo: '12m ago',
    read: false,
    actionPath: '/practice?pace=blitz',
    actionLabel: 'Start Blitz',
  },
  {
    id: 'notif-coach-1',
    category: 'coach',
    title: 'SABI Coach spotted a high-yield topic',
    body: 'Periodic Table Trends & Stoichiometry can lift your Chemistry mastery estimate fastest this week.',
    timeAgo: '2h ago',
    read: false,
    actionPath: '/recommendations',
    actionLabel: 'View Weak Areas',
  },
  {
    id: 'notif-cbt-1',
    category: 'cbt',
    title: 'Weekend CBT Simulator Ready',
    body: 'Test your stamina with a 40-question Quick Mock (30 min) or the full 180-question UTME Simulator.',
    timeAgo: 'Yesterday',
    read: true,
    actionPath: '/cbt',
    actionLabel: 'Open CBT Hub',
  },
  {
    id: 'notif-system-1',
    category: 'system',
    title: 'SABI AI Practice Studio is live',
    body: 'Customize how SABI focuses on your topics and subjects, then send your plan directly to SABI AI.',
    timeAgo: '2d ago',
    read: true,
    actionPath: '/settings/practice',
    actionLabel: 'Open AI Studio',
  },
];

export function loadNotifications(): SabiNotificationItem[] {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (!raw) return DEFAULT_NOTIFICATIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? (parsed as SabiNotificationItem[])
      : DEFAULT_NOTIFICATIONS;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function saveNotifications(items: SabiNotificationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}
