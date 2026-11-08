import { describe, expect, it } from 'vitest';
import { chunkText } from './knowledgeRoutes';

describe('knowledge document chunking', () => {
  it('keeps paragraph boundaries when possible', () => {
    expect(chunkText('First paragraph.\n\nSecond paragraph.', 40)).toEqual([
      'First paragraph.\n\nSecond paragraph.',
    ]);
  });

  it('splits long paragraphs into bounded chunks', () => {
    const chunks = chunkText('A'.repeat(25), 10);
    expect(chunks).toEqual(['A'.repeat(10), 'A'.repeat(10), 'A'.repeat(5)]);
    expect(chunks.every((chunk) => chunk.length <= 10)).toBe(true);
  });

  it('does not emit empty chunks for blank input', () => {
    expect(chunkText('  \n\n  ', 100)).toEqual([]);
  });
});
