import { getShortSubjectLabel } from '../data/curatedStarterQuestions';
import { getRealUserProgress } from './userProgressStore';

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

export interface DiagnosticBaselineResult {
  completedAt: string;
  overallPercent: number;
  subjectMastery: Record<string, number>;
  weakestSubjectCanonical: string;
  weakestSubjectLabel: string;
  totalQuestions: number;
  correctCount: number;
}

const MISTAKES_VAULT_KEY = 'sabi_mistakes_vault_v1';
const DIAGNOSTIC_RESULT_KEY = 'sabi_diagnostic_baseline_v1';

interface StoredMistakeLite {
  questionId: string;
  subjectCanonical: string;
  subjectLabel: string;
  topicLabel: string;
  missedCount: number;
}

function readMistakesVaultLite(): StoredMistakeLite[] {
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

export function saveDiagnosticBaseline(result: DiagnosticBaselineResult): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DIAGNOSTIC_RESULT_KEY, JSON.stringify(result));
  } catch {
    // ignore storage errors
  }
}

export function loadDiagnosticBaseline(): DiagnosticBaselineResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DIAGNOSTIC_RESULT_KEY);
    return raw ? (JSON.parse(raw) as DiagnosticBaselineResult) : null;
  } catch {
    return null;
  }
}

/**
 * Lightweight, zero-question-bank calculation of the student's Daily Failure-Driven
 * Practice Plan so Home, Progress, Profile, and Streak load instantly without
 * downloading the 3.8 MB offline seed question bank.
 */
export function getDailyFailureDrillPlan(chosenSubjects: string[]): DailyFailureDrillPlan {
  const validSubjects =
    chosenSubjects.length > 0
      ? chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
  const progress = getRealUserProgress();
  const mistakes = readMistakesVaultLite();

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
    .filter((m) =>
      validSubjects.some((s) => s.toLowerCase() === m.subjectCanonical.toLowerCase())
    )
    .sort((a, b) => b.missedCount - a.missedCount);

  if (relevantMistakes.length > 0) {
    const top = relevantMistakes[0];
    const subjectMistakes = relevantMistakes.filter(
      (m) => m.subjectCanonical.toLowerCase() === top.subjectCanonical.toLowerCase()
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
