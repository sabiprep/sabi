import type { Question, SubjectName } from '../../types';

import eng2024Orig from './english-language/2024/original/questions.json';
import eng2024Twin1 from './english-language/2024/twin/twin1/questions.json';
import eng2024Twin2 from './english-language/2024/twin/twin2/questions.json';
import eng2024Twin3 from './english-language/2024/twin/twin3/questions.json';

import mth2024Orig from './mathematics/2024/original/questions.json';
import mth2024Twin1 from './mathematics/2024/twin/twin1/questions.json';
import mth2024Twin2 from './mathematics/2024/twin/twin2/questions.json';
import mth2024Twin3 from './mathematics/2024/twin/twin3/questions.json';

import phy2024Orig from './physics/2024/original/questions.json';
import phy2024Twin1 from './physics/2024/twin/twin1/questions.json';
import phy2024Twin2 from './physics/2024/twin/twin2/questions.json';
import phy2024Twin3 from './physics/2024/twin/twin3/questions.json';

import chm2024Orig from './chemistry/2024/original/questions.json';
import chm2024Twin1 from './chemistry/2024/twin/twin1/questions.json';
import chm2024Twin2 from './chemistry/2024/twin/twin2/questions.json';
import chm2024Twin3 from './chemistry/2024/twin/twin3/questions.json';

export type TwinDifficultyId = 'original' | 'simple' | 'medium' | 'hard';
export type QuestionVariantFolder = 'original' | 'twin1' | 'twin2' | 'twin3';

export interface StructuredJambQuestionItem {
  question_number: number;
  question_id: string;
  canonical_id: string;
  difficulty_id: TwinDifficultyId;
  subject: SubjectName;
  year: number;
  topic: string;
  subtopic: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanation_short: string;
  explanation_pidgin: string;
}

export interface YearQuestionFileEnvelope {
  /**
   * Differentiates the file difficulty mode:
   * - "original" for <subject>/<year>/original/questions.json
   * - "simple"   for <subject>/<year>/twin/twin1/questions.json
   * - "medium"   for <subject>/<year>/twin/twin2/questions.json
   * - "hard"     for <subject>/<year>/twin/twin3/questions.json
   */
  id: TwinDifficultyId;
  variant: QuestionVariantFolder;
  subject: SubjectName;
  subject_slug: string;
  year: number;
  questions: StructuredJambQuestionItem[];
}

export interface YearQuestionBundle {
  subject: SubjectName;
  subjectSlug: string;
  year: number;
  original: StructuredJambQuestionItem[];
  twin: {
    twin1: StructuredJambQuestionItem[]; // id = "simple"
    twin2: StructuredJambQuestionItem[]; // id = "medium"
    twin3: StructuredJambQuestionItem[]; // id = "hard"
  };
}

const REGISTERED_ORIGINAL_ENVELOPES: YearQuestionFileEnvelope[] = [
  eng2024Orig as YearQuestionFileEnvelope,
  mth2024Orig as YearQuestionFileEnvelope,
  phy2024Orig as YearQuestionFileEnvelope,
  chm2024Orig as YearQuestionFileEnvelope,
];

const REGISTERED_TWIN_ENVELOPES: YearQuestionFileEnvelope[] = [
  eng2024Twin1 as YearQuestionFileEnvelope,
  eng2024Twin2 as YearQuestionFileEnvelope,
  eng2024Twin3 as YearQuestionFileEnvelope,
  mth2024Twin1 as YearQuestionFileEnvelope,
  mth2024Twin2 as YearQuestionFileEnvelope,
  mth2024Twin3 as YearQuestionFileEnvelope,
  phy2024Twin1 as YearQuestionFileEnvelope,
  phy2024Twin2 as YearQuestionFileEnvelope,
  phy2024Twin3 as YearQuestionFileEnvelope,
  chm2024Twin1 as YearQuestionFileEnvelope,
  chm2024Twin2 as YearQuestionFileEnvelope,
  chm2024Twin3 as YearQuestionFileEnvelope,
];

/**
 * Converts a StructuredJambQuestionItem from the .json folder hierarchy
 * into the runtime Question interface consumed by CBT, Blitz, and Smart Practice.
 */
export function toRuntimeQuestion(item: StructuredJambQuestionItem): Question {
  const mappedDifficulty: 'easy' | 'medium' | 'hard' =
    item.difficulty_id === 'simple'
      ? 'easy'
      : item.difficulty_id === 'hard'
      ? 'hard'
      : 'medium';

  return {
    id: item.question_id,
    exam_type: 'JAMB',
    subject: item.subject,
    topic: item.topic,
    subtopic: item.subtopic,
    year: item.year,
    question: item.question,
    options: item.options,
    answer: item.answer,
    explanation: item.explanation,
    explanation_short: item.explanation_short,
    explanation_pidgin: item.explanation_pidgin,
    difficulty: mappedDifficulty,
    concepts: [item.topic.toLowerCase(), item.subtopic.toLowerCase()],
    source:
      item.difficulty_id === 'original'
        ? `JAMB ${item.year} Original`
        : `JAMB ${item.year} Twin (${item.difficulty_id.toUpperCase()})`,
    status: 'verified',
    confidence_score: 1.0,
    created_at: '2026-11-19T00:00:00Z',
  };
}

/**
 * Builds the complete indexed hierarchy:
 * Subject -> Year -> { original, twin: { twin1 (simple), twin2 (medium), twin3 (hard) } }
 */
export function getStructuredQuestionBank(): Record<string, Record<number, YearQuestionBundle>> {
  const tree: Record<string, Record<number, YearQuestionBundle>> = {};

  const ensureNode = (env: YearQuestionFileEnvelope): YearQuestionBundle => {
    const slug = env.subject_slug;
    if (!tree[slug]) tree[slug] = {};
    if (!tree[slug][env.year]) {
      tree[slug][env.year] = {
        subject: env.subject,
        subjectSlug: slug,
        year: env.year,
        original: [],
        twin: {
          twin1: [],
          twin2: [],
          twin3: [],
        },
      };
    }
    return tree[slug][env.year];
  };

  REGISTERED_ORIGINAL_ENVELOPES.forEach(env => {
    if (!env || !Array.isArray(env.questions)) return;
    const node = ensureNode(env);
    node.original.push(...env.questions);
  });

  REGISTERED_TWIN_ENVELOPES.forEach(env => {
    if (!env || !Array.isArray(env.questions)) return;
    const node = ensureNode(env);
    if (env.variant === 'twin1' || env.id === 'simple') {
      node.twin.twin1.push(...env.questions);
    } else if (env.variant === 'twin2' || env.id === 'medium') {
      node.twin.twin2.push(...env.questions);
    } else if (env.variant === 'twin3' || env.id === 'hard') {
      node.twin.twin3.push(...env.questions);
    }
  });

  return tree;
}

/**
 * Returns all questions (Originals + Simple/Medium/Hard Twins) flattened into runtime Question objects.
 */
export function getAllStructuredQuestionsAsRuntime(): Question[] {
  const results: Question[] = [];
  REGISTERED_ORIGINAL_ENVELOPES.forEach(env => {
    if (env?.questions) {
      results.push(...env.questions.map(toRuntimeQuestion));
    }
  });
  REGISTERED_TWIN_ENVELOPES.forEach(env => {
    if (env?.questions) {
      results.push(...env.questions.map(toRuntimeQuestion));
    }
  });
  return results;
}
