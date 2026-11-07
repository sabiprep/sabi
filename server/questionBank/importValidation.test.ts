import { describe, expect, it } from 'vitest';
import { validateQuestionImport } from './importValidation';

const draft = {
  subjectSlug: 'biology',
  topicId: '2a7f56d8-26ad-4b73-9eab-5d9fba17b432',
  subtopicId: '9baf2b5c-f6a0-4d1d-9a8b-6f6c2d39e3e8',
  question: 'Which feature helps a camel survive in a desert?',
  options: { A: 'Long eyelashes', B: 'Webbed feet', C: 'Thin fur', D: 'Gills' },
  answer: 'A',
  explanation: 'Long eyelashes help keep blowing sand out of the camel’s eyes.',
  difficulty: 'easy',
};

describe('validateQuestionImport', () => {
  it('returns row-level validation outcomes without writing data', () => {
    const report = validateQuestionImport([draft, { ...draft, question: 'x' }]);
    expect(report).toMatchObject({ totalRows: 2, validRows: 1, invalidRows: 1, duplicateRows: 0 });
    expect(report.rows[1].outcome).toBe('invalid');
  });

  it('detects repeated questions within the same batch', () => {
    const report = validateQuestionImport([draft, { ...draft, question: ' WHICH FEATURE HELPS A CAMEL SURVIVE IN A DESERT? ' }]);
    expect(report).toMatchObject({ totalRows: 2, validRows: 1, invalidRows: 0, duplicateRows: 1 });
    expect(report.rows[1]).toMatchObject({ outcome: 'duplicate', duplicateOfRow: 1 });
  });

  it('detects fingerprints already present in the bank', () => {
    const first = validateQuestionImport([draft]);
    if (first.rows[0].outcome !== 'valid') throw new Error('Fixture must be valid');
    const report = validateQuestionImport([draft], new Map([[first.rows[0].fingerprint, 'BIO-001']]));
    expect(report).toMatchObject({ totalRows: 1, validRows: 0, duplicateRows: 1 });
  });
});
