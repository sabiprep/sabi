import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';
import { getRealUserProgress, recordSessionDurationBonus } from './userProgressStore';

export type SmartPracticePace = 'blitz' | 'guided';
export type PracticeScope = 'merged' | 'single';
export type PracticeDeckMode = 'standard' | 'daily-failure';

export interface DailyFailureDrillPlan {
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  evidence: string;
  missedCount: number;
  weakTopicsCount: number;
  estimatedMinutes: number;
  isFailureDriven: boolean;
}

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

const SUBJECT_SHORT_LABELS: Record<string, string> = {
  'English Language': 'English',
  Mathematics: 'Mathematics',
  Physics: 'Physics',
  Chemistry: 'Chemistry',
  Biology: 'Biology',
  Economics: 'Economics',
  Government: 'Government',
  'Literature-in-English': 'Literature',
  Commerce: 'Commerce',
  Geography: 'Geography',
  'Agricultural Science': 'Agric Science',
  'Christian Religious Studies': 'CRS',
  'Islamic Religious Studies': 'IRS',
  'Financial Accounting': 'Accounting',
};

export function getShortSubjectLabel(canonical: string): string {
  return SUBJECT_SHORT_LABELS[canonical] || canonical;
}

/**
 * Curated high-clarity JAMB starter items aligned with the core Smart Practice
 * syllabus topics (Periodic table, Antonyms, Units, Logarithms) so the very first
 * 10-question Blitz / Guided run feels crisp, authentic, and balanced across 4 subjects.
 */
export function getCuratedStarterQuestions(): PracticeFeedQuestion[] {
  return CURATED_STARTER_QUESTIONS;
}

const CURATED_STARTER_QUESTIONS: PracticeFeedQuestion[] = [
  {
    id: 'SABI-CHM-PT-1',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'Which of these elements is a noble gas?',
    options: {
      A: 'Nitrogen',
      B: 'Argon',
      C: 'Chlorine',
      D: 'Oxygen',
    },
    answer: 'B',
    explanationShort:
      'Argon is in Group 18: a full outer shell of 8 electrons, so it hardly reacts.',
    explanationFull:
      'Argon (Ar, atomic number 18) belongs to Group 18 (Group 0) of the periodic table. Because its valence shell already holds 8 electrons (a stable octet), it is chemically inert under normal conditions.',
    explanationPidgin:
      'Argon dey Group 18 — im outer shell full with 8 electrons already, so e no dey rush react with anything.',
  },
  {
    id: 'SABI-CHM-PT-2',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'As you move from left to right across Period 3, atomic radius generally:',
    options: {
      A: 'Decreases',
      B: 'Increases',
      C: 'Remains constant',
      D: 'Doubles at Group 14',
    },
    answer: 'A',
    explanationShort:
      'More protons pull the same electron shell tighter toward the nucleus, shrinking the atom.',
    explanationFull:
      'Across a period, electrons are added to the same principal energy level while nuclear charge increases by +1 per step. Stronger electrostatic attraction pulls the outer electrons closer, reducing atomic radius.',
    explanationPidgin:
      'As you waka go right across a period, more protons dey pull the same shell closer to the center, so the atom dey small pass.',
  },
  {
    id: 'SABI-ENG-ANT-1',
    subjectCanonical: 'English Language',
    subjectLabel: 'English',
    topicLabel: 'Antonyms',
    question: 'Choose the word opposite in meaning to "ephemeral" in: Fame is often ephemeral.',
    options: {
      A: 'Brief',
      B: 'Permanent',
      C: 'Fragile',
      D: 'Sudden',
    },
    answer: 'B',
    explanationShort:
      '"Ephemeral" means lasting for a very short time, so its exact opposite is "permanent".',
    explanationFull:
      '"Ephemeral" describes something short-lived or fleeting (like morning dew). "Brief", "fragile", and "sudden" lean similar, while "permanent" means lasting indefinitely.',
    explanationPidgin:
      'Ephemeral mean thing wey no dey last long. The direct opposite na permanent — thing wey dey stay.',
  },
  {
    id: 'SABI-PHY-UNI-1',
    subjectCanonical: 'Physics',
    subjectLabel: 'Physics',
    topicLabel: 'Units',
    question: 'Which of the following is the SI derived unit of electrical resistance?',
    options: {
      A: 'Coulomb',
      B: 'Volt',
      C: 'Ohm',
      D: 'Watt',
    },
    answer: 'C',
    explanationShort:
      'Resistance R = V / I is measured in ohms (Ω), equal to one volt per ampere.',
    explanationFull:
      'By Ohm’s law (R = V / I), electrical resistance is measured in ohms (Ω). Coulomb is charge, Volt is potential difference, and Watt is power.',
    explanationPidgin:
      'Na Ohm (Ω) dem dey use measure electrical resistance — Volt divide by Ampere.',
  },
  {
    id: 'SABI-MTH-LOG-1',
    subjectCanonical: 'Mathematics',
    subjectLabel: 'Mathematics',
    topicLabel: 'Logarithms',
    question: 'Evaluate log₁₀(1000) + log₁₀(0.01).',
    options: {
      A: '5',
      B: '1',
      C: '-1',
      D: '2',
    },
    answer: 'B',
    explanationShort:
      'log₁₀(1000) = 3 and log₁₀(0.01) = -2, so 3 + (-2) = 1.',
    explanationFull:
      'Write each term as a power of 10: 1000 = 10³ so log₁₀(1000) = 3, and 0.01 = 10⁻² so log₁₀(0.01) = -2. Adding them gives 3 + (-2) = 1.',
    explanationPidgin:
      '1000 na 10 raise to 3 (so log na 3), 0.01 na 10 raise to minus 2 (so log na -2). 3 plus -2 give you 1.',
  },
  {
    id: 'SABI-CHM-PT-3',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'Which halogen is the most electronegative element in the periodic table?',
    options: {
      A: 'Chlorine',
      B: 'Bromine',
      C: 'Iodine',
      D: 'Fluorine',
    },
    answer: 'D',
    explanationShort:
      'Fluorine has a tiny radius and 7 valence electrons, giving it the strongest pull on bonding electrons.',
    explanationFull:
      'Electronegativity increases up a group and across a period toward Group 17. Fluorine sits at the top right of the reactive elements (Pauling value 4.0), making it the most electronegative element.',
    explanationPidgin:
      'Fluorine small well-well and e need just one electron to complete im shell, so na im dey drag electron pass every other element.',
  },
  {
    id: 'SABI-ENG-ANT-2',
    subjectCanonical: 'English Language',
    subjectLabel: 'English',
    topicLabel: 'Antonyms',
    question: 'Choose the word opposite in meaning to "meticulous" in: She kept meticulous records.',
    options: {
      A: 'Careless',
      B: 'Detailed',
      C: 'Thorough',
      D: 'Orderly',
    },
    answer: 'A',
    explanationShort:
      '"Meticulous" means showing extreme care for details; its opposite is "careless".',
    explanationFull:
      'A meticulous person checks every tiny detail carefully. "Detailed", "thorough", and "orderly" are near-synonyms, leaving "careless" as the true antonym.',
    explanationPidgin:
      'Meticulous person dey check every tiny detail sharply. Opposite of dat one na careless.',
  },
  {
    id: 'SABI-PHY-UNI-2',
    subjectCanonical: 'Physics',
    subjectLabel: 'Physics',
    topicLabel: 'Units',
    question: 'Which of these physical quantities is a vector quantity?',
    options: {
      A: 'Mass',
      B: 'Temperature',
      C: 'Displacement',
      D: 'Energy',
    },
    answer: 'C',
    explanationShort:
      'Displacement has both magnitude and a specific direction, making it a vector.',
    explanationFull:
      'Scalar quantities (mass, temperature, energy) have magnitude only. Displacement specifies both how far and in which direction an object moved, so it is a vector.',
    explanationPidgin:
      'Vector get both size and direction. Displacement dey tell you how far you move AND which side you face.',
  },
  {
    id: 'SABI-MTH-LOG-2',
    subjectCanonical: 'Mathematics',
    subjectLabel: 'Mathematics',
    topicLabel: 'Logarithms',
    question: 'If log₂(x) = 5, what is the value of x?',
    options: {
      A: '10',
      B: '25',
      C: '32',
      D: '64',
    },
    answer: 'C',
    explanationShort:
      'Convert log₂(x) = 5 to index form: x = 2⁵ = 32.',
    explanationFull:
      'By the definition of a logarithm, log_b(x) = y is equivalent to x = b^y. Here b = 2 and y = 5, so x = 2⁵ = 32.',
    explanationPidgin:
      'Carry the base 2 raise am to power 5: 2 × 2 × 2 × 2 × 2 = 32.',
  },
  {
    id: 'SABI-CHM-PT-4',
    subjectCanonical: 'Chemistry',
    subjectLabel: 'Chemistry',
    topicLabel: 'Periodic table',
    question: 'Elements in Group 1 of the periodic table are collectively called:',
    options: {
      A: 'Alkali metals',
      B: 'Alkaline earth metals',
      C: 'Transition metals',
      D: 'Lanthanides',
    },
    answer: 'A',
    explanationShort:
      'Group 1 metals (Li, Na, K...) react vigorously with water to form alkaline hydroxides.',
    explanationFull:
      'Group 1 elements (excluding hydrogen) are known as alkali metals because they react rapidly with water to produce strong alkalis (metal hydroxides) and hydrogen gas.',
    explanationPidgin:
      'Group 1 metals like Sodium and Potassium na Alkali metals because once dem touch water, dem dey form strong alkali sharp-sharp.',
  },
];

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

/**
 * Computes a truthful, real-data Daily Failure-Driven Practice Plan based on:
 * 1) Questions the student actually missed (Mistakes Vault)
 * 2) Weakest topics recorded in `userProgressStore.topicStats` (< 70% accuracy)
 * 3) Lowest real subject mastery or starter baseline if brand new.
 */
export function getDailyFailureDrillPlan(chosenSubjects: string[]): DailyFailureDrillPlan {
  const validSubjects =
    chosenSubjects.length > 0
      ? chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
  const progress = getRealUserProgress();
  const mistakes = readMistakesVaultSafe();

  // Rank weak topics from real recorded topicStats
  const weakTopics: {
    subjectCanonical: string;
    topicLabel: string;
    accuracy: number;
    missed: number;
    solved: number;
  }[] = [];

  for (const subj of validSubjects) {
    const topicsMap = progress.topicStats[subj] || {};
    for (const [topicLabel, stat] of Object.entries(topicsMap)) {
      if (!stat || stat.solved <= 0) continue;
      const accuracy = Math.round((stat.correct / stat.solved) * 100);
      const missed = Math.max(0, stat.solved - stat.correct);
      if (accuracy < 75 || missed > 0) {
        weakTopics.push({
          subjectCanonical: subj,
          topicLabel,
          accuracy,
          missed,
          solved: stat.solved,
        });
      }
    }
  }
  weakTopics.sort((a, b) => a.accuracy - b.accuracy || b.missed - a.missed);

  const relevantMistakes = mistakes
    .filter(m => validSubjects.some(s => s.toLowerCase() === m.subjectCanonical.toLowerCase()))
    .sort((a, b) => b.missedCount - a.missedCount);

  if (relevantMistakes.length > 0) {
    const top = relevantMistakes[0];
    const subjectMistakes = relevantMistakes.filter(
      m => m.subjectCanonical.toLowerCase() === top.subjectCanonical.toLowerCase()
    );
    const subjLabel = getShortSubjectLabel(top.subjectCanonical);
    return {
      subjectCanonical: top.subjectCanonical,
      subjectLabel: subjLabel,
      topicLabel: top.topicLabel || 'Missed questions recovery',
      evidence: `${subjLabel} · ${subjectMistakes.length} missed question${
        subjectMistakes.length === 1 ? '' : 's'
      } queued for today's fix`,
      missedCount: relevantMistakes.length,
      weakTopicsCount: weakTopics.length,
      estimatedMinutes: Math.max(5, Math.min(12, relevantMistakes.length + 4)),
      isFailureDriven: true,
    };
  }

  if (weakTopics.length > 0) {
    const weakest = weakTopics[0];
    const subjLabel = getShortSubjectLabel(weakest.subjectCanonical);
    return {
      subjectCanonical: weakest.subjectCanonical,
      subjectLabel: subjLabel,
      topicLabel: weakest.topicLabel,
      evidence: `${subjLabel} · ${weakest.accuracy}% accuracy across ${weakest.solved} attempt${
        weakest.solved === 1 ? '' : 's'
      }`,
      missedCount: 0,
      weakTopicsCount: weakTopics.length,
      estimatedMinutes: 8,
      isFailureDriven: true,
    };
  }

  // Brand-new student with zero failures yet: prepare a clean starter drill
  const fallbackSubj = validSubjects[validSubjects.length - 1] || 'Chemistry';
  const fallbackLabel = getShortSubjectLabel(fallbackSubj);
  return {
    subjectCanonical: fallbackSubj,
    subjectLabel: fallbackLabel,
    topicLabel: `${fallbackLabel} Starter Drill`,
    evidence: `${fallbackLabel} · SABI builds your daily fix queue from your answers`,
    missedCount: 0,
    weakTopicsCount: 0,
    estimatedMinutes: 6,
    isFailureDriven: false,
  };
}

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

  // Design-accurate preview default matching Screen 06 if opened directly
  return {
    pace: 'blitz',
    firstName,
    durationMinutes: 12,
    totalQuestions: 10,
    correctCount: 8,
    accuracyPercent: 80,
    totalXp: 84,
    bestStreak: 5,
    subjectsCount: 4,
    topics: [
      {
        subjectCanonical: 'Chemistry',
        subjectLabel: 'Chemistry',
        topicLabel: 'Periodic table',
        correct: 3,
        total: 4,
        accuracy: 75,
      },
      {
        subjectCanonical: 'English Language',
        subjectLabel: 'English',
        topicLabel: 'Antonyms',
        correct: 2,
        total: 2,
        accuracy: 100,
      },
      {
        subjectCanonical: 'Physics',
        subjectLabel: 'Physics',
        topicLabel: 'Units',
        correct: 2,
        total: 2,
        accuracy: 100,
      },
      {
        subjectCanonical: 'Mathematics',
        subjectLabel: 'Mathematics',
        topicLabel: 'Logarithms',
        correct: 1,
        total: 2,
        accuracy: 50,
      },
    ],
    coachMessage:
      "Periodic table is coming together: 3 of 4 right today. Logarithm rules still dey worry you small. Let's fix that next.",
    nextBestStep: {
      subjectCanonical: 'Mathematics',
      subjectLabel: 'Mathematics',
      topicLabel: 'Laws of logarithms',
      estimatedMinutes: 6,
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
