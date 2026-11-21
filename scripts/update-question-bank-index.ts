import fs from 'node:fs';
import path from 'node:path';

/**
 * Automatically scans src/data/question-bank/<subject>/<year>/,
 * normalizes and arranges all .json files in strict JAMB curriculum & chronological order,
 * writes src/data/question-bank/catalog.json,
 * and generates src/data/question-bank/index.ts with explicit JSON imports
 * (compatible with both Node/tsx server.ts and Vite frontend bundler).
 */

const QUESTION_BANK_DIR = path.resolve(process.cwd(), 'src/data/question-bank');
const INDEX_FILE = path.join(QUESTION_BANK_DIR, 'index.ts');
const CATALOG_FILE = path.join(QUESTION_BANK_DIR, 'catalog.json');

// Official JAMB Curriculum Subject Order
const SUBJECT_PRIORITY_ORDER: string[] = [
  'english-language',
  'mathematics',
  'physics',
  'chemistry',
  'biology',
  'economics',
  'accounting',
  'commerce',
  'government',
  'literature-in-english',
  'christian-religious-studies',
  'geography',
];

interface DiscoveredFile {
  subjectSlug: string;
  year: number;
  varName: string;
  importPath: string;
  isOriginal: boolean;
}

function makeVarPrefix(subjectSlug: string): string {
  return subjectSlug.replace(/[^a-zA-Z0-9]/g, '_');
}

function normalizeAndSortEnvelopeFile(filePath: string) {
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const questions = Array.isArray(raw.questions) ? raw.questions : [];

  questions.sort(
    (a: any, b: any) => (Number(a.question_number) || 0) - (Number(b.question_number) || 0)
  );

  const orderedEnvelope = {
    id: raw.id,
    variant: raw.variant,
    subject: raw.subject,
    subject_slug: raw.subject_slug,
    year: Number(raw.year),
    total_questions: questions.length,
    questions,
  };

  fs.writeFileSync(filePath, JSON.stringify(orderedEnvelope, null, 2) + '\n', 'utf8');
  return orderedEnvelope;
}

function main() {
  const rawSubjects = fs
    .readdirSync(QUESTION_BANK_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const subjects = rawSubjects.sort((a, b) => {
    const idxA = SUBJECT_PRIORITY_ORDER.indexOf(a);
    const idxB = SUBJECT_PRIORITY_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const discovered: DiscoveredFile[] = [];
  const catalogSubjects: any[] = [];
  let grandTotalOriginalQuestions = 0;
  let grandTotalDiagrams = 0;

  for (const subject of subjects) {
    const subjectDir = path.join(QUESTION_BANK_DIR, subject);
    const years = fs
      .readdirSync(subjectDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && /^\d{4}$/.test(d.name))
      .map(d => d.name)
      .sort((a, b) => Number(a) - Number(b));

    const prefix = makeVarPrefix(subject);
    let subjectDisplayName = subject;
    let subjectQuestionsTotal = 0;
    let subjectDiagramsTotal = 0;
    const yearEntries: any[] = [];

    for (const year of years) {
      const yrNum = Number(year);
      const origPath = path.join(subjectDir, year, 'original', 'questions.json');
      let origCount = 0;
      let diagCount = 0;

      if (fs.existsSync(origPath)) {
        const env = normalizeAndSortEnvelopeFile(origPath);
        if (env) {
          subjectDisplayName = env.subject || subjectDisplayName;
          origCount = env.total_questions;
          diagCount = env.questions.filter((q: any) => Boolean(q.image_url)).length;
          subjectQuestionsTotal += origCount;
          subjectDiagramsTotal += diagCount;
        }
        discovered.push({
          subjectSlug: subject,
          year: yrNum,
          varName: `${prefix}_${year}_Orig`,
          importPath: `./${subject}/${year}/original/questions.json`,
          isOriginal: true,
        });
      }

      for (const twinNum of ['1', '2', '3']) {
        const twinPath = path.join(
          subjectDir,
          year,
          'twin',
          `twin${twinNum}`,
          'questions.json'
        );
        if (fs.existsSync(twinPath)) {
          normalizeAndSortEnvelopeFile(twinPath);
          discovered.push({
            subjectSlug: subject,
            year: yrNum,
            varName: `${prefix}_${year}_Twin${twinNum}`,
            importPath: `./${subject}/${year}/twin/twin${twinNum}/questions.json`,
            isOriginal: false,
          });
        }
      }

      yearEntries.push({
        year: yrNum,
        original_questions: origCount,
        diagrams: diagCount,
        paths: {
          original: `src/data/question-bank/${subject}/${year}/original/questions.json`,
          twin1_simple: `src/data/question-bank/${subject}/${year}/twin/twin1/questions.json`,
          twin2_medium: `src/data/question-bank/${subject}/${year}/twin/twin2/questions.json`,
          twin3_hard: `src/data/question-bank/${subject}/${year}/twin/twin3/questions.json`,
        },
      });
    }

    grandTotalOriginalQuestions += subjectQuestionsTotal;
    grandTotalDiagrams += subjectDiagramsTotal;

    catalogSubjects.push({
      order: catalogSubjects.length + 1,
      subject: subjectDisplayName,
      subject_slug: subject,
      years_extracted: years.map(Number),
      total_years: years.length,
      total_original_questions: subjectQuestionsTotal,
      total_diagrams: subjectDiagramsTotal,
      years: yearEntries,
    });
  }

  // Write well-arranged master catalog.json
  const catalogPayload = {
    database: 'SABI JAMB UTME Structured Question Bank',
    total_subjects: catalogSubjects.length,
    total_subject_years: discovered.filter(d => d.isOriginal).length,
    total_json_files: discovered.length,
    total_original_questions: grandTotalOriginalQuestions,
    total_diagrams: grandTotalDiagrams,
    subjects: catalogSubjects,
  };
  fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalogPayload, null, 2) + '\n', 'utf8');

  const importsBlock = discovered
    .map(d => `import ${d.varName} from '${d.importPath}';`)
    .join('\n');

  const origList = discovered
    .filter(d => d.isOriginal)
    .map(d => `  ${d.varName} as YearQuestionFileEnvelope,`)
    .join('\n');

  const twinList = discovered
    .filter(d => !d.isOriginal)
    .map(d => `  ${d.varName} as YearQuestionFileEnvelope,`)
    .join('\n');

  const code = `import type { Question, SubjectName } from '../../types';

${importsBlock}

export type TwinDifficultyId = 'original' | 'simple' | 'medium' | 'hard';
export type QuestionVariantFolder = 'original' | 'twin1' | 'twin2' | 'twin3';

export interface StructuredJambQuestionItem {
  question_number: number;
  question_id: string;
  canonical_id: string;
  aloc_id?: string;
  parent_question_id?: string;
  difficulty_id: TwinDifficultyId;
  subject: SubjectName;
  year: number;
  topic: string;
  subtopic: string;
  section?: string | null;
  image_url?: string | null;
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
  total_questions?: number;
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
${origList}
];

const REGISTERED_TWIN_ENVELOPES: YearQuestionFileEnvelope[] = [
${twinList}
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
    image_url: item.image_url || null,
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
        ? \`JAMB \${item.year} Original\`
        : \`JAMB \${item.year} Twin (\${item.difficulty_id.toUpperCase()})\`,
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
`;

  fs.writeFileSync(INDEX_FILE, code, 'utf8');
  console.log(
    `[SABI Question Bank Indexer] Arranged & registered ${discovered.filter(d => d.isOriginal).length} subject-year original files and ${discovered.filter(d => !d.isOriginal).length} twin files (${grandTotalOriginalQuestions} total Original questions) in src/data/question-bank/index.ts & catalog.json`
  );
}

main();
