import { SEED_QUESTIONS } from '../data/questions';
import {
  CURATED_STARTER_QUESTIONS,
  getCuratedStarterQuestions,
  getShortSubjectLabel,
} from '../data/curatedStarterQuestions';
import type { Question } from '../types';
import { getRealUserProgress, recordSessionDurationBonus } from './userProgressStore';
import {
  getDailyFailureDrillPlan,
  type DailyFailureDrillPlan,
} from './dailyFailurePlan';

export { getCuratedStarterQuestions, getShortSubjectLabel, getDailyFailureDrillPlan };
export type { DailyFailureDrillPlan };

export type SmartPracticePace = 'blitz' | 'guided';
export type PracticeScope = 'merged' | 'single';
export type PracticeDeckMode = 'standard' | 'daily-failure';

export interface PracticeFeedQuestion {
  id: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
}

export interface PracticeAnswerRecord {
  questionId: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  selectedOption: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  xpEarned: number;
  elapsedSeconds: number;
}

export interface TopicBreakdownRow {
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  correct: number;
  total: number;
  accuracy: number;
}

export interface SmartPracticeSessionResult {
  pace: SmartPracticePace;
  firstName: string;
  durationMinutes: number;
  totalQuestions: number;
  correctCount: number;
  accuracyPercent: number;
  totalXp: number;
  bestStreak: number;
  subjectsCount: number;
  topics: TopicBreakdownRow[];
  coachMessage: string;
  nextBestStep: {
    subjectCanonical: string;
    subjectLabel: string;
    topicLabel: string;
    estimatedMinutes: number;
  };
  completedAt: string;
}

const LAST_RESULT_STORAGE_KEY = 'sabi_last_smart_practice_result_v1';
const SAVED_QUESTIONS_STORAGE_KEY = 'sabi_saved_question_ids_v1';
const MISTAKES_VAULT_KEY = 'sabi_mistakes_vault_v1';
const PRACTICE_SCOPE_PREF_KEY = 'sabi_practice_scope_pref_v1';

interface StoredMistakeLite {
  questionId: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  question: string;
  options: Record<'A' | 'B' | 'C' | 'D', string>;
  answer: 'A' | 'B' | 'C' | 'D';
  explanationShort: string;
  explanationFull: string;
  explanationPidgin: string;
  missedCount: number;
  lastMissedAt: string;
}

function readMistakesVaultSafe(): StoredMistakeLite[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MISTAKES_VAULT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredMistakeLite[]) : [];
  } catch {
    return [];
  }
}

export function loadSavedPracticeScope(): PracticeScope {
  if (typeof window === 'undefined') return 'merged';
  try {
    const raw = localStorage.getItem(PRACTICE_SCOPE_PREF_KEY);
    return raw === 'single' ? 'single' : 'merged';
  } catch {
    return 'merged';
  }
}

export function savePracticeScopePref(scope: PracticeScope): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRACTICE_SCOPE_PREF_KEY, scope);
  } catch {
    // ignore
  }
}

// Curated starter questions and short labels are imported from `src/data/curatedStarterQuestions.ts`.

function convertSeedQuestion(q: Question): PracticeFeedQuestion {
  const shortExplanation =
    q.explanation_short?.trim() ||
    (q.explanation ? q.explanation.split('.').slice(0, 2).join('.').trim() + '.' : 'Review the core concept behind this option.');
  return {
    id: q.id,
    subjectCanonical: q.subject,
    subjectLabel: getShortSubjectLabel(q.subject),
    topicLabel: q.subtopic || q.topic || 'Core Syllabus',
    question: q.question.replace(/\*/g, ''),
    options: {
      A: q.options.A,
      B: q.options.B,
      C: q.options.C,
      D: q.options.D,
    },
    answer: q.answer,
    explanationShort: shortExplanation,
    explanationFull: q.explanation || shortExplanation,
    explanationPidgin: q.explanation_pidgin || shortExplanation,
  };
}

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// `getDailyFailureDrillPlan` is defined in `./dailyFailurePlan` and re-exported above.

/**
 * Builds a question queue supporting:
 * - `scope: 'merged'` (default): Interleaves all 4 chosen JAMB subjects prioritizing focusSubject.
 * - `scope: 'single'`: 100% strictly from `focusSubjectCanonical` (one subject at a time).
 * - `mode: 'daily-failure'`: Prioritizes real missed questions + weak topics before fresh reinforcement.
 */
export function buildSmartPracticeDeck(
  focusSubjectCanonical: string,
  chosenSubjects: string[],
  options?: {
    scope?: PracticeScope;
    mode?: PracticeDeckMode;
  }
): PracticeFeedQuestion[] {
  const scope: PracticeScope = options?.scope === 'single' ? 'single' : 'merged';
  const mode: PracticeDeckMode = options?.mode === 'daily-failure' ? 'daily-failure' : 'standard';

  const validSubjects =
    chosenSubjects.length > 0
      ? chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

  const convertedBank = SEED_QUESTIONS.map(convertSeedQuestion);
  const allPool = [...CURATED_STARTER_QUESTIONS, ...convertedBank];

  // Deduplicate by ID
  const uniqueMap = new Map<string, PracticeFeedQuestion>();
  for (const item of allPool) {
    if (!uniqueMap.has(item.id)) {
      uniqueMap.set(item.id, item);
    }
  }
  const uniquePool = Array.from(uniqueMap.values());
  const usedIds = new Set<string>();
  const deck: PracticeFeedQuestion[] = [];

  const pushUnique = (q: PracticeFeedQuestion) => {
    if (!usedIds.has(q.id)) {
      usedIds.add(q.id);
      deck.push(q);
      return true;
    }
    return false;
  };

  // MODE A: Daily Failure-Driven Prepared Drill
  if (mode === 'daily-failure') {
    const mistakes = readMistakesVaultSafe()
      .filter(m => validSubjects.some(s => s.toLowerCase() === m.subjectCanonical.toLowerCase()))
      .sort((a, b) => b.missedCount - a.missedCount);

    for (const m of mistakes.slice(0, 12)) {
      pushUnique({
        id: m.questionId,
        subjectCanonical: m.subjectCanonical,
        subjectLabel: m.subjectLabel || getShortSubjectLabel(m.subjectCanonical),
        topicLabel: m.topicLabel || 'Missed Review',
        question: m.question,
        options: m.options,
        answer: m.answer,
        explanationShort: m.explanationShort,
        explanationFull: m.explanationFull,
        explanationPidgin: m.explanationPidgin,
      });
    }

    // Add real weak-topic questions from userProgressStore.topicStats
    const progress = getRealUserProgress();
    const weakTopicLabels: { subject: string; topic: string }[] = [];
    for (const subj of validSubjects) {
      const tMap = progress.topicStats[subj] || {};
      Object.entries(tMap).forEach(([topic, stat]) => {
        if (stat.solved > 0 && stat.correct / stat.solved < 0.75) {
          weakTopicLabels.push({ subject: subj.toLowerCase(), topic: topic.toLowerCase() });
        }
      });
    }

    if (weakTopicLabels.length > 0) {
      const weakMatches = shuffleArray(
        uniquePool.filter(q =>
          weakTopicLabels.some(
            wt =>
              q.subjectCanonical.toLowerCase() === wt.subject &&
              (q.topicLabel.toLowerCase().includes(wt.topic) ||
                wt.topic.includes(q.topicLabel.toLowerCase()))
          )
        )
      );
      for (const q of weakMatches) {
        if (deck.length >= 20) break;
        pushUnique(q);
      }
    }

    // Top up with focus subject + chosen subjects so daily drill always has a rich set
    const focusFill = shuffleArray(
      uniquePool.filter(
        q => q.subjectCanonical.toLowerCase() === focusSubjectCanonical.toLowerCase()
      )
    );
    const chosenFill = shuffleArray(
      uniquePool.filter(q =>
        validSubjects.some(s => s.toLowerCase() === q.subjectCanonical.toLowerCase())
      )
    );
    for (const q of [...focusFill, ...chosenFill]) {
      if (deck.length >= 24) break;
      pushUnique(q);
    }

    return deck.length > 0 ? deck : CURATED_STARTER_QUESTIONS;
  }

  // MODE B: Single-Subject Exclusive Scope (100% strictly the selected subject)
  if (scope === 'single') {
    const subjectMistakes = readMistakesVaultSafe()
      .filter(m => m.subjectCanonical.toLowerCase() === focusSubjectCanonical.toLowerCase())
      .sort((a, b) => b.missedCount - a.missedCount);

    for (const m of subjectMistakes.slice(0, 6)) {
      pushUnique({
        id: m.questionId,
        subjectCanonical: m.subjectCanonical,
        subjectLabel: m.subjectLabel || getShortSubjectLabel(m.subjectCanonical),
        topicLabel: m.topicLabel || 'Review',
        question: m.question,
        options: m.options,
        answer: m.answer,
        explanationShort: m.explanationShort,
        explanationFull: m.explanationFull,
        explanationPidgin: m.explanationPidgin,
      });
    }

    const strictSubjectPool = shuffleArray(
      uniquePool.filter(
        q => q.subjectCanonical.toLowerCase() === focusSubjectCanonical.toLowerCase()
      )
    );
    for (const q of strictSubjectPool) {
      if (deck.length >= 40) break;
      pushUnique(q);
    }

    return deck.length > 0 ? deck : strictSubjectPool.slice(0, 20);
  }

  // MODE C: Merged Scope (Interleaves focusSubject with the student's other 3 JAMB subjects)
  const focusPool = shuffleArray(
    uniquePool.filter(
      q => q.subjectCanonical.toLowerCase() === focusSubjectCanonical.toLowerCase()
    )
  );
  const otherSubjectsSet = new Set(
    validSubjects
      .filter(s => s.toLowerCase() !== focusSubjectCanonical.toLowerCase())
      .map(s => s.toLowerCase())
  );
  const otherPool = shuffleArray(
    uniquePool.filter(q => otherSubjectsSet.has(q.subjectCanonical.toLowerCase()))
  );
  const fallbackPool = shuffleArray(
    uniquePool.filter(
      q =>
        q.subjectCanonical.toLowerCase() !== focusSubjectCanonical.toLowerCase() &&
        !otherSubjectsSet.has(q.subjectCanonical.toLowerCase())
    )
  );

  const pushNext = (list: PracticeFeedQuestion[]) => {
    const found = list.find(item => !usedIds.has(item.id));
    if (found) {
      usedIds.add(found.id);
      deck.push(found);
      return true;
    }
    return false;
  };

  // Interleave ~45% focus subject + ~55% mixed other subjects (starting cleanly with focus!)
  const maxItems = Math.min(40, uniquePool.length);
  let step = 0;
  while (deck.length < maxItems) {
    const wantFocus = step % 2 === 0;
    const added = wantFocus
      ? pushNext(focusPool) || pushNext(otherPool) || pushNext(fallbackPool)
      : pushNext(otherPool) || pushNext(focusPool) || pushNext(fallbackPool);
    if (!added) break;
    step++;
  }

  return deck.length > 0 ? deck : CURATED_STARTER_QUESTIONS;
}

/**
 * Seamlessly upgrades upcoming unseen cards in an active Blitz / Smart Practice deck
 * with fresh questions fetched from Supabase `question_bank` without disturbing the
 * current question or already-answered cards.
 */
export function mergeLiveQuestionsIntoDeck(
  currentDeck: PracticeFeedQuestion[],
  liveQuestions: PracticeFeedQuestion[],
  currentIndex: number
): PracticeFeedQuestion[] {
  if (!liveQuestions.length) return currentDeck;
  const keepCount = Math.min(currentDeck.length, Math.max(1, currentIndex + 1));
  const lockedPrefix = currentDeck.slice(0, keepCount);
  const seen = new Set(lockedPrefix.map((q) => q.id));
  const merged: PracticeFeedQuestion[] = [...lockedPrefix];

  for (const live of liveQuestions) {
    if (!seen.has(live.id)) {
      seen.add(live.id);
      merged.push(live);
    }
  }
  for (const fallback of currentDeck.slice(keepCount)) {
    if (!seen.has(fallback.id)) {
      seen.add(fallback.id);
      merged.push(fallback);
    }
  }
  return merged;
}

/**
 * Combo math matching Screens 03 & 04:
 * - Streak 0–2 -> x1 (10 XP)
 * - Streak 3–5 -> x2 (20 XP)
 * - Streak 6+  -> x3 (30 XP)
 * Progress bar inside the strip has 3 segments indicating progress within the current tier.
 */
export function getComboState(currentStreak: number): {
  multiplier: 1 | 2 | 3;
  xpPerCorrect: number;
  filledSegments: number;
} {
  if (currentStreak >= 6) {
    return { multiplier: 3, xpPerCorrect: 30, filledSegments: 3 };
  }
  if (currentStreak >= 3) {
    return {
      multiplier: 2,
      xpPerCorrect: 20,
      filledSegments: Math.min(3, currentStreak - 2),
    };
  }
  return {
    multiplier: 1,
    xpPerCorrect: 10,
    filledSegments: Math.min(3, currentStreak),
  };
}

export function buildSmartPracticeResult(params: {
  pace: SmartPracticePace;
  firstName: string;
  records: PracticeAnswerRecord[];
  startedAtMs: number;
}): SmartPracticeSessionResult {
  const { pace, firstName, records, startedAtMs } = params;
  const totalQuestions = records.length;
  const correctCount = records.filter(r => r.isCorrect).length;
  const accuracyPercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const totalXp = records.reduce((sum, r) => sum + r.xpEarned, 0);

  let bestStreak = 0;
  let running = 0;
  for (const r of records) {
    if (r.isCorrect) {
      running++;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  const elapsedMinutes = Math.max(1, Math.round((Date.now() - startedAtMs) / 60000));
  const uniqueSubjects = new Set(records.map(r => r.subjectCanonical));

  // Group by subject + topic
  const topicMap = new Map<string, TopicBreakdownRow>();
  for (const rec of records) {
    const key = `${rec.subjectCanonical}::${rec.topicLabel}`;
    const existing = topicMap.get(key);
    if (existing) {
      existing.total += 1;
      if (rec.isCorrect) existing.correct += 1;
      existing.accuracy = Math.round((existing.correct / existing.total) * 100);
    } else {
      topicMap.set(key, {
        subjectCanonical: rec.subjectCanonical,
        subjectLabel: rec.subjectLabel,
        topicLabel: rec.topicLabel,
        correct: rec.isCorrect ? 1 : 0,
        total: 1,
        accuracy: rec.isCorrect ? 100 : 0,
      });
    }
  }

  const topics = Array.from(topicMap.values()).sort((a, b) => b.total - a.total);

  // Pick strongest & weakest topics for Coach copy and Next Best Step
  const sortedByPerf = [...topics].sort((a, b) => a.accuracy - b.accuracy);
  const weakest = sortedByPerf[0] || {
    subjectCanonical: 'Mathematics',
    subjectLabel: 'Mathematics',
    topicLabel: 'Laws of logarithms',
    correct: 1,
    total: 2,
    accuracy: 50,
  };
  const strongest = sortedByPerf[sortedByPerf.length - 1] || {
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    correct: 3,
    total: 4,
    accuracy: 75,
  };

  let coachMessage = '';
  if (weakest.accuracy < 100 && strongest.topicLabel !== weakest.topicLabel) {
    coachMessage = `${strongest.topicLabel} is coming together: ${strongest.correct} of ${strongest.total} right today. ${weakest.topicLabel} still dey worry you small. Let's fix that next.`;
  } else if (accuracyPercent >= 80) {
    coachMessage = `Clean work! You scored ${correctCount} of ${totalQuestions} across ${uniqueSubjects.size} subject${
      uniqueSubjects.size === 1 ? '' : 's'
    }. Keep sharpening ${weakest.topicLabel} to lock in your speed and confidence.`;
  } else {
    coachMessage = `Good push today — you tackled ${totalQuestions} questions. ${weakest.topicLabel} needs a calm Smart Practice review next so the core rules stick.`;
  }

  return {
    pace,
    firstName,
    durationMinutes: elapsedMinutes,
    totalQuestions,
    correctCount,
    accuracyPercent,
    totalXp,
    bestStreak,
    subjectsCount: Math.max(1, uniqueSubjects.size),
    topics,
    coachMessage,
    nextBestStep: {
      subjectCanonical: weakest.subjectCanonical,
      subjectLabel: weakest.subjectLabel,
      topicLabel: weakest.topicLabel,
      estimatedMinutes: 6,
    },
    completedAt: new Date().toISOString(),
  };
}

export function saveSmartPracticeResult(result: SmartPracticeSessionResult): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LAST_RESULT_STORAGE_KEY, JSON.stringify(result));
    recordSessionDurationBonus({
      mode: result.pace === 'blitz' ? 'blitz' : 'smart',
      durationSeconds: Math.max(30, result.durationMinutes * 60),
      completionBonusXp: Math.max(5, Math.round(result.correctCount * 2)),
    });
  } catch {
    // ignore storage failures
  }
}

export function loadLastSmartPracticeResult(firstName: string): SmartPracticeSessionResult {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(LAST_RESULT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SmartPracticeSessionResult;
        if (parsed && Array.isArray(parsed.topics) && parsed.topics.length > 0) {
          return parsed;
        }
      }
    } catch {
      // fall through to preview default
    }
  }

  // Honest empty state when no real practice session has been completed yet (zero fake preview numbers)
  const plan = getDailyFailureDrillPlan([]);
  return {
    pace: 'guided',
    firstName,
    durationMinutes: 0,
    totalQuestions: 0,
    correctCount: 0,
    accuracyPercent: 0,
    totalXp: 0,
    bestStreak: 0,
    subjectsCount: 0,
    topics: [],
    coachMessage:
      'Complete your first Blitz or Smart Practice session to see your real topic-by-topic breakdown and SABI Coach recommendations here.',
    nextBestStep: {
      subjectCanonical: plan.subjectCanonical,
      subjectLabel: plan.subjectLabel,
      topicLabel: plan.topicLabel,
      estimatedMinutes: plan.estimatedMinutes,
    },
    completedAt: new Date().toISOString(),
  };
}

export function loadSavedQuestionIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVED_QUESTIONS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function toggleSavedQuestionId(questionId: string): string[] {
  const current = new Set(loadSavedQuestionIds());
  if (current.has(questionId)) {
    current.delete(questionId);
  } else {
    current.add(questionId);
  }
  const next = Array.from(current);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SAVED_QUESTIONS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  return next;
}
