import { describe, expect, it } from 'vitest';
import { buildVerifiedExplanationPrompt } from './routes';

describe('verified-answer explanation prompt', () => {
  const input = {
    subject: 'Mathematics',
    topic: 'Quadratic Equations',
    question: 'Find the sum of roots.',
    options: { A: '6', B: '5', C: '-6', D: '12' },
    correctOption: 'A' as const,
    selectedOption: 'B' as const,
    storedExplanation: 'The sum of roots is -b/a.',
    preference: 'detailed' as const,
    language: 'english' as const,
  };

  it('grounds the explanation in the verified key and learner selection', () => {
    const prompt = buildVerifiedExplanationPrompt(input);
    expect(prompt.prompt).toContain('Verified correct option: A — 6');
    expect(prompt.prompt).toContain('Student selected: B — 5');
    expect(prompt.prompt).toContain('The sum of roots is -b/a.');
  });

  it('explicitly prohibits the model from changing the key or score', () => {
    const prompt = buildVerifiedExplanationPrompt(input);
    expect(prompt.systemInstruction).toContain('Never change, dispute, reinterpret, or override it.');
    expect(prompt.systemInstruction).toContain('Do not calculate or alter the learner score.');
  });
});
