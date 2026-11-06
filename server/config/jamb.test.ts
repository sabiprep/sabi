import { describe, expect, it } from 'vitest';
import { canonicalizeJambSubject, COMPULSORY_JAMB_SUBJECT, JAMB_SUBJECTS } from './jamb';
import { onboardingSchema } from '../validation/schemas';

describe('canonical JAMB subject catalogue', () => {
  it('contains a stable unique slug for each subject', () => {
    const slugs = JAMB_SUBJECTS.map((subject) => subject.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('normalizes known display labels and aliases', () => {
    expect(canonicalizeJambSubject('Use of English')).toBe(COMPULSORY_JAMB_SUBJECT);
    expect(canonicalizeJambSubject('C.R.S')).toBe('Christian Religious Studies');
    expect(canonicalizeJambSubject(' financial accounting ')).toBe('Financial Accounting');
  });

  it('rejects unknown subjects', () => {
    expect(canonicalizeJambSubject('Computer Studies')).toBeNull();
  });
});

describe('UTME onboarding subject validation', () => {
  const valid = ['Use of English', 'Mathematics', 'Physics', 'Chemistry'];

  it('requires exactly four distinct known subjects including English', () => {
    expect(onboardingSchema.safeParse({ registeredSubjects: valid }).success).toBe(true);
    expect(onboardingSchema.safeParse({ registeredSubjects: ['English Language', 'Physics'] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ registeredSubjects: ['English Language', 'Physics', 'Physics', 'Chemistry'] }).success).toBe(false);
    expect(onboardingSchema.safeParse({ registeredSubjects: ['Mathematics', 'Physics', 'Chemistry', 'Biology'] }).success).toBe(false);
  });

  it('stores canonical display names after validation', () => {
    const result = onboardingSchema.safeParse({ registeredSubjects: valid });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registeredSubjects).toEqual(['English Language', 'Mathematics', 'Physics', 'Chemistry']);
    }
  });
});
