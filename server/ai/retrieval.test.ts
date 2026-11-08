import { describe, expect, it } from 'vitest';
import { formatApprovedKnowledgeContext } from './retrieval';

describe('approved knowledge retrieval context', () => {
  it('includes only approved documents and preserves source attribution', () => {
    const result = formatApprovedKnowledgeContext([
      {
        id: 'chunk-1',
        content: 'A vector has magnitude and direction.',
        document: { title: 'Vectors', subject: 'Physics', topic: 'Scalars and Vectors', source_reference: 'Approved syllabus note', status: 'approved' },
      },
      {
        id: 'chunk-2',
        content: 'Unreviewed content must not be used.',
        document: { title: 'Draft', status: 'draft' },
      },
    ]);
    expect(result).toContain('Vectors');
    expect(result).toContain('Approved syllabus note');
    expect(result).toContain('magnitude and direction');
    expect(result).not.toContain('Unreviewed content');
  });

  it('limits context to five chunks and strips control characters', () => {
    const rows = Array.from({ length: 7 }, (_, index) => ({
      id: String(index),
      content: `Resource\u0000 ${index}`,
      document: { title: `Title ${index}`, status: 'approved' },
    }));
    const result = formatApprovedKnowledgeContext(rows);
    expect(result).toContain('Title 4');
    expect(result).not.toContain('Title 5');
    expect(result).not.toContain('\u0000');
  });
});
