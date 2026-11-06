/**
 * Canonical JAMB subject catalogue used by backend validation and configuration.
 * Display labels intentionally remain compatible with the current onboarding UI.
 * "Use of English" is retained as an alias for "English Language".
 */
export const JAMB_SUBJECTS = [
  { slug: 'use-of-english', name: 'English Language', category: 'Compulsory', aliases: ['Use of English'] },
  { slug: 'mathematics', name: 'Mathematics', category: 'General', aliases: [] },
  { slug: 'physics', name: 'Physics', category: 'Science', aliases: [] },
  { slug: 'chemistry', name: 'Chemistry', category: 'Science', aliases: [] },
  { slug: 'biology', name: 'Biology', category: 'Science', aliases: [] },
  { slug: 'literature-in-english', name: 'Literature-in-English', category: 'Arts', aliases: ['Literature in English'] },
  { slug: 'government', name: 'Government', category: 'Social Sciences', aliases: [] },
  { slug: 'economics', name: 'Economics', category: 'Social Sciences', aliases: [] },
  { slug: 'christian-religious-studies', name: 'Christian Religious Studies', category: 'Arts', aliases: ['CRS', 'C.R.S'] },
  { slug: 'islamic-religious-studies', name: 'Islamic Religious Studies', category: 'Arts', aliases: ['IRS'] },
  { slug: 'agricultural-science', name: 'Agricultural Science', category: 'Science', aliases: [] },
  { slug: 'geography', name: 'Geography', category: 'General', aliases: [] },
  { slug: 'commerce', name: 'Commerce', category: 'Social Sciences', aliases: [] },
  { slug: 'financial-accounting', name: 'Financial Accounting', category: 'Social Sciences', aliases: ['Accounting'] },
  { slug: 'history', name: 'History', category: 'Arts', aliases: [] },
  { slug: 'yoruba', name: 'Yoruba', category: 'Languages', aliases: [] },
  { slug: 'igbo', name: 'Igbo', category: 'Languages', aliases: [] },
  { slug: 'hausa', name: 'Hausa', category: 'Languages', aliases: [] },
  { slug: 'music', name: 'Music', category: 'Arts', aliases: [] },
  { slug: 'fine-art', name: 'Fine Art', category: 'Arts', aliases: ['Visual Arts'] },
  { slug: 'french', name: 'French', category: 'Languages', aliases: [] },
  { slug: 'arabic', name: 'Arabic', category: 'Languages', aliases: [] },
  { slug: 'home-economics', name: 'Home Economics', category: 'General', aliases: [] },
] as const;

const subjectLookup = new Map<string, (typeof JAMB_SUBJECTS)[number]>();
for (const subject of JAMB_SUBJECTS) {
  subjectLookup.set(subject.name.toLocaleLowerCase(), subject);
  subjectLookup.set(subject.slug.toLocaleLowerCase(), subject);
  for (const alias of subject.aliases) subjectLookup.set(alias.toLocaleLowerCase(), subject);
}

export function canonicalizeJambSubject(value: string): string | null {
  return subjectLookup.get(value.trim().toLocaleLowerCase())?.name ?? null;
}

export const COMPULSORY_JAMB_SUBJECT = 'English Language';
