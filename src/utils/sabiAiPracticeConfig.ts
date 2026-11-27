import { apiPostJson } from './apiClient';
import { getShortSubjectLabel } from '../data/curatedStarterQuestions';

export type ConcentrationLevel = 'light' | 'balanced' | 'deep' | 'sprint';
export type ConcentrationMode = 'guided_first' | 'blitz_heavy' | 'balanced_mix' | 'cbt_readiness';
export type DifficultyPosture = 'confidence' | 'adaptive' | 'challenge';
export type ExplanationStyle = 'brief' | 'step_by_step' | 'pidgin_friendly';

export interface SabiAiBlueprint {
  headline: string;
  coachSummary: string;
  recommendedSubjectCanonical: string;
  recommendedSubjectLabel: string;
  recommendedTopic: string;
  recommendedPace: 'guided' | 'blitz';
  recommendedMinutes: number;
  dailyXpGoal: number;
  subjectAllocations: {
    subjectCanonical: string;
    subjectLabel: string;
    level: ConcentrationLevel;
    sharePercent: number;
  }[];
  actionSteps: string[];
  generatedAt: string;
  source: 'sabi-ai-api' | 'sabi-ai-engine';
}

export interface SabiPracticeAiConfig {
  focusSubjectCanonical: string;
  focusTopics: string[];
  subjectLevels: Record<string, ConcentrationLevel>;
  concentrationMode: ConcentrationMode;
  difficultyPosture: DifficultyPosture;
  explanationStyle: ExplanationStyle;
  dailyMinutes: number;
  customInstructions: string;
  blueprint: SabiAiBlueprint | null;
}

const STORAGE_KEY = 'sabi_ai_practice_config_v1';

export const SUBJECT_TOPICS_CATALOG: Record<string, string[]> = {
  'English Language': [
    'Antonyms & Synonyms',
    'Comprehension & Summary',
    'Oral Stress & Intonation',
    'Concord & Sentence Structure',
    'Idioms & Figurative Usage',
  ],
  Mathematics: [
    'Laws of Logarithms',
    'Quadratic Equations',
    'Trigonometry & Bearings',
    'Differentiation & Integration',
    'Probability & Statistics',
  ],
  Physics: [
    'Units & Measurement',
    'Projectile Motion & Vectors',
    'Electricity & Circuits',
    'Waves, Optics & Sound',
    'Nuclear & Modern Physics',
  ],
  Chemistry: [
    'Periodic Table Trends',
    'Organic Chemistry & Alkanes',
    'Stoichiometry & Mole Concept',
    'Electrolysis & Redox',
    'Acids, Bases & Salts',
  ],
  Biology: [
    'Genetics & Heredity',
    'Cell Structure & Division',
    'Ecology & Ecosystems',
    'Human Transport & Respiration',
    'Evolution & Adaptation',
  ],
  Economics: [
    'Demand, Supply & Elasticity',
    'National Income Accounting',
    'Money, Banking & Inflation',
    'International Trade',
    'Market Structures',
  ],
  Government: [
    'Nigerian Federalism',
    'Constitutional Development',
    'Arms of Government',
    'Pre-Colonial Political Systems',
    'International Organizations',
  ],
  'Literature-in-English': [
    'Literary Devices & Figures',
    'African Prose Texts',
    'Drama & Characterization',
    'Unseen Poetry Analysis',
    'Literary Appreciation',
  ],
  Commerce: [
    'Money & Banking Systems',
    'Business Units & Structure',
    'Foreign Trade & Customs',
    'Insurance & Risk',
    'Consumer Protection',
  ],
  Geography: [
    'Map Reading & Contours',
    'Weather, Climate & Vegetation',
    'Rocks & Landforms',
    'Nigerian Population & Trade',
    'GIS & Remote Sensing',
  ],
  'Agricultural Science': [
    'Soil Fertility & Management',
    'Crop Production & Pests',
    'Animal Nutrition & Health',
    'Agricultural Economics',
    'Farm Mechanization',
  ],
  'Christian Religious Studies': [
    'Synoptic Gospels',
    'Acts of the Apostles',
    'Old Testament Covenants',
    'Epistles & Christian Living',
    'Prophetic Teachings',
  ],
  'Islamic Religious Studies': [
    'Quranic Revelation & Tafsir',
    'Hadith Collections',
    'Fiqh & Ibadah',
    'Islamic History & Caliphs',
    'Moral Teachings in Islam',
  ],
  'Financial Accounting': [
    'Control Accounts',
    'Bank Reconciliation',
    'Depreciation & Final Accounts',
    'Partnership Accounts',
    'Incomplete Records',
  ],
};

const LEVEL_WEIGHTS: Record<ConcentrationLevel, number> = {
  light: 1,
  balanced: 2,
  deep: 3.5,
  sprint: 5,
};

export function getTopicsForSubject(canonical: string): string[] {
  return (
    SUBJECT_TOPICS_CATALOG[canonical] || [
      'Core Foundations',
      'High-Yield Past Questions',
      'Problem Solving & Speed',
      'Common JAMB Traps',
    ]
  );
}

export function getDefaultPracticeAiConfig(
  chosenSubjects: string[],
  defaultFocusSubject?: string
): SabiPracticeAiConfig {
  const subjects =
    chosenSubjects.length > 0
      ? chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];
  const focusSubject =
    defaultFocusSubject && subjects.includes(defaultFocusSubject)
      ? defaultFocusSubject
      : subjects[subjects.length - 1];

  const subjectLevels: Record<string, ConcentrationLevel> = {};
  for (const subj of subjects) {
    subjectLevels[subj] = subj === focusSubject ? 'deep' : 'balanced';
  }

  return {
    focusSubjectCanonical: focusSubject,
    focusTopics: [getTopicsForSubject(focusSubject)[0]],
    subjectLevels,
    concentrationMode: 'balanced_mix',
    difficultyPosture: 'adaptive',
    explanationStyle: 'step_by_step',
    dailyMinutes: 30,
    customInstructions: '',
    blueprint: null,
  };
}

export function loadPracticeAiConfig(
  chosenSubjects: string[],
  defaultFocusSubject?: string
): SabiPracticeAiConfig {
  const fallback = getDefaultPracticeAiConfig(chosenSubjects, defaultFocusSubject);
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SabiPracticeAiConfig>;
    return {
      ...fallback,
      ...parsed,
      subjectLevels: {
        ...fallback.subjectLevels,
        ...(parsed.subjectLevels || {}),
      },
      focusTopics:
        Array.isArray(parsed.focusTopics) && parsed.focusTopics.length > 0
          ? parsed.focusTopics
          : fallback.focusTopics,
    };
  } catch {
    return fallback;
  }
}

export function savePracticeAiConfig(config: SabiPracticeAiConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // ignore quota errors
  }
}

/**
 * Generates a structured SABI AI Study Blueprint from the student's practice settings.
 * Opportunistically calls `/api/ai/chat` if an authenticated session is available,
 * and always falls back smoothly to SABI's deterministic Study Architect so the app
 * immediately restructures Home, Smart Practice Hub, and Blitz/Guided feeds.
 */
export async function submitPracticeConfigToSabiAi(params: {
  config: SabiPracticeAiConfig;
  chosenSubjects: string[];
  firstName: string;
}): Promise<SabiPracticeAiConfig> {
  const { config, chosenSubjects, firstName } = params;
  const subjects =
    chosenSubjects.length > 0
      ? chosenSubjects
      : ['English Language', 'Mathematics', 'Physics', 'Chemistry'];

  // Compute normalized subject allocation shares
  const weighted = subjects.map(subj => {
    const level: ConcentrationLevel = config.subjectLevels[subj] || 'balanced';
    return {
      subjectCanonical: subj,
      subjectLabel: getShortSubjectLabel(subj),
      level,
      weight: LEVEL_WEIGHTS[level] || 2,
    };
  });
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1;
  const subjectAllocations = weighted.map(item => ({
    subjectCanonical: item.subjectCanonical,
    subjectLabel: item.subjectLabel,
    level: item.level,
    sharePercent: Math.round((item.weight / totalWeight) * 100),
  }));

  const primarySubjectLabel = getShortSubjectLabel(config.focusSubjectCanonical);
  const primaryTopic =
    config.focusTopics[0] || getTopicsForSubject(config.focusSubjectCanonical)[0];

  const recommendedPace: 'guided' | 'blitz' =
    config.concentrationMode === 'blitz_heavy' ? 'blitz' : 'guided';

  const dailyXpGoal =
    config.dailyMinutes <= 15
      ? 20
      : config.dailyMinutes <= 30
      ? 30
      : config.dailyMinutes <= 45
      ? 45
      : config.dailyMinutes <= 60
      ? 60
      : 80;

  const recommendedMinutes = Math.max(6, Math.min(18, Math.round(config.dailyMinutes * 0.35)));

  const modePhrase: Record<ConcentrationMode, string> = {
    guided_first: 'step-by-step Smart Practice sessions before speeding up in Blitz',
    blitz_heavy: 'high-volume Blitz rapid reinforcement with micro-explanations',
    balanced_mix: 'Smart Practice mastery drills paired with Blitz retention sweeps',
    cbt_readiness: 'exam-paced accuracy sets leading into timed CBT mocks',
  };

  const posturePhrase: Record<DifficultyPosture, string> = {
    confidence: 'foundational confidence builders first, then medium JAMB items',
    adaptive: 'adaptive difficulty that stretches you only as accuracy rises',
    challenge: 'harder JAMB past-question traps and multi-step derivations',
  };

  const stylePhrase: Record<ExplanationStyle, string> = {
    brief: 'crisp 2-line takeaways',
    step_by_step: 'full worked step-by-step breakdowns',
    pidgin_friendly: 'clear Naija Pidgin + standard English explanations',
  };

  let coachSummary = `${firstName}, SABI AI has restructured your workspace around ${primarySubjectLabel} (${config.focusTopics.join(', ')}). We will run ${modePhrase[config.concentrationMode]} using ${posturePhrase[config.difficultyPosture]}, with ${stylePhrase[config.explanationStyle]}.`;

  if (config.customInstructions.trim()) {
    coachSummary = `${firstName}, your note has been locked in. SABI AI is now prioritizing ${primarySubjectLabel} — especially ${config.focusTopics.join(', ')} — via ${modePhrase[config.concentrationMode]} and ${stylePhrase[config.explanationStyle]}.`;
  }

  let source: 'sabi-ai-api' | 'sabi-ai-engine' = 'sabi-ai-engine';

  // Opportunistically consult live backend SABI AI Coach when signed in
  try {
    const prompt = [
      `Student ${firstName} updated their SABI Practice Studio configuration:`,
      `Primary subject: ${primarySubjectLabel}. Focus topics: ${config.focusTopics.join(', ')}.`,
      `Concentration mode: ${config.concentrationMode}. Difficulty: ${config.difficultyPosture}.`,
      `Explanation style: ${config.explanationStyle}. Daily time: ${config.dailyMinutes} mins.`,
      config.customInstructions.trim()
        ? `Student note: "${config.customInstructions.trim()}"`
        : '',
      'Reply in 2 short, warm, motivating sentences confirming how SABI will structure their next study sessions.',
    ]
      .filter(Boolean)
      .join(' ');

    const apiResp = await apiPostJson('/api/ai/chat', {
      subject: config.focusSubjectCanonical,
      topic: primaryTopic,
      messages: [{ role: 'user', content: prompt }],
    });

    const aiReply =
      apiResp.ok &&
      typeof (apiResp.data?.reply || apiResp.data?.message || apiResp.data?.text) === 'string'
        ? String(apiResp.data?.reply || apiResp.data?.message || apiResp.data?.text).trim()
        : '';

    if (aiReply.length >= 24) {
      coachSummary = aiReply;
      source = 'sabi-ai-api';
    }
  } catch {
    // Offline or preview mode without auth token — deterministic blueprint remains active
  }

  const actionSteps: string[] = [
    `Focus block: ${primarySubjectLabel} · ${primaryTopic} (~${recommendedMinutes} min ${
      recommendedPace === 'blitz' ? 'Blitz feed' : 'Smart Practice set'
    })`,
    `Daily rhythm: ${config.dailyMinutes} min/day targeting ${dailyXpGoal} XP with ${stylePhrase[config.explanationStyle]}`,
    `Subject balance: ${subjectAllocations
      .map(s => `${s.subjectLabel} ${s.sharePercent}%`)
      .join(' · ')}`,
  ];

  const blueprint: SabiAiBlueprint = {
    headline: `${primarySubjectLabel} · ${primaryTopic}`,
    coachSummary,
    recommendedSubjectCanonical: config.focusSubjectCanonical,
    recommendedSubjectLabel: primarySubjectLabel,
    recommendedTopic: primaryTopic,
    recommendedPace,
    recommendedMinutes,
    dailyXpGoal,
    subjectAllocations,
    actionSteps,
    generatedAt: new Date().toISOString(),
    source,
  };

  const nextConfig: SabiPracticeAiConfig = {
    ...config,
    blueprint,
  };
  savePracticeAiConfig(nextConfig);
  return nextConfig;
}
