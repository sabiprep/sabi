import { SEED_QUESTIONS } from '../data/questions';
import type { Question } from '../types';

export type SmartPracticePace = 'blitz' | 'guided';

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
const BONUS_XP_STORAGE_KEY = 'sabi_wonderland_earned_xp_v1';
const DAILY_BONUS_XP_STORAGE_KEY = 'sabi_wonderland_daily_xp_v1';

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

/**
 * Builds a rich, mixed question queue prioritizing the student's chosen focus subject
 * while interleaving their other 3 JAMB subjects so practice never feels repetitive.
 */
export function buildSmartPracticeDeck(
  focusSubjectCanonical: string,
  chosenSubjects: string[]
): PracticeFeedQuestion[] {
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

  const focusPool = uniquePool.filter(
    q => q.subjectCanonical.toLowerCase() === focusSubjectCanonical.toLowerCase()
  );
  const otherSubjectsSet = new Set(
    validSubjects
      .filter(s => s.toLowerCase() !== focusSubjectCanonical.toLowerCase())
      .map(s => s.toLowerCase())
  );
  const otherPool = uniquePool.filter(q =>
    otherSubjectsSet.has(q.subjectCanonical.toLowerCase())
  );
  const fallbackPool = uniquePool.filter(
    q =>
      q.subjectCanonical.toLowerCase() !== focusSubjectCanonical.toLowerCase() &&
      !otherSubjectsSet.has(q.subjectCanonical.toLowerCase())
  );

  const deck: PracticeFeedQuestion[] = [];
  const usedIds = new Set<string>();

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
    coachMessage = `Good push today — you tackled ${totalQuestions} questions. ${weakest.topicLabel} needs a calm Guided review next so the core rules stick.`;
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
    const prevTotal = Number(localStorage.getItem(BONUS_XP_STORAGE_KEY) || '0') || 0;
    const prevDaily = Number(localStorage.getItem(DAILY_BONUS_XP_STORAGE_KEY) || '0') || 0;
    localStorage.setItem(BONUS_XP_STORAGE_KEY, String(prevTotal + result.totalXp));
    localStorage.setItem(DAILY_BONUS_XP_STORAGE_KEY, String(prevDaily + result.totalXp));
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
