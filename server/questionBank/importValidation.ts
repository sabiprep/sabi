import { validateQuestionDraft, type NormalizedQuestionDraft } from './validation';

export type QuestionImportRowResult =
  | { rowNumber: number; outcome: 'valid'; fingerprint: string; normalized: NormalizedQuestionDraft }
  | { rowNumber: number; outcome: 'invalid'; errors: { field: string; code: string; message: string }[] }
  | { rowNumber: number; outcome: 'duplicate'; duplicateOfRow: number | null; duplicateQuestionId?: string; fingerprint: string };

export type QuestionImportReport = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  rows: QuestionImportRowResult[];
};

/**
 * Validates an import batch without writing to the question bank.
 * Existing fingerprints can be supplied by a privileged caller; duplicates
 * inside the same batch are also detected deterministically.
 */
export function validateQuestionImport(
  rows: unknown[],
  existingFingerprints: ReadonlyMap<string, string> = new Map(),
  validTaxonomyRefs?: ReadonlySet<string>
): QuestionImportReport {
  const seenInBatch = new Map<string, number>();
  const results: QuestionImportRowResult[] = rows.map((raw, index) => {
    const rowNumber = index + 1;
    const validated = validateQuestionDraft(raw);
    if (!validated.valid) {
      return { rowNumber, outcome: 'invalid', errors: validated.issues };
    }

    const taxonomyKey = `${validated.value.subjectSlug}:${validated.value.topicId}:${validated.value.subtopicId}`;
    if (validTaxonomyRefs && !validTaxonomyRefs.has(taxonomyKey)) {
      return {
        rowNumber,
        outcome: 'invalid',
        errors: [{
          code: 'invalid_taxonomy_reference',
          field: 'topicId/subtopicId',
          message: 'The selected topic and subtopic do not belong to the selected JAMB subject.',
        }],
      };
    }

    const existingId = existingFingerprints.get(validated.fingerprint);
    if (existingId) {
      return { rowNumber, outcome: 'duplicate', duplicateOfRow: null, duplicateQuestionId: existingId, fingerprint: validated.fingerprint };
    }

    const priorRow = seenInBatch.get(validated.fingerprint);
    if (priorRow) {
      return { rowNumber, outcome: 'duplicate', duplicateOfRow: priorRow, fingerprint: validated.fingerprint };
    }

    seenInBatch.set(validated.fingerprint, rowNumber);
    return {
      rowNumber,
      outcome: 'valid',
      fingerprint: validated.fingerprint,
      normalized: validated.value,
    };
  });

  const validRows = results.filter((row) => row.outcome === 'valid').length;
  const invalidRows = results.filter((row) => row.outcome === 'invalid').length;
  const duplicateRows = results.filter((row) => row.outcome === 'duplicate').length;

  return { totalRows: rows.length, validRows, invalidRows, duplicateRows, rows: results };
}
