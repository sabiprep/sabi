import { SubjectName } from '../types';
import { JAMB_SUBJECTS } from '../../shared/jamb';

export interface OnboardingQuestion {
  id: number;
  key:
    | 'chosenSubjects'
    | 'academicStatus'
    | 'targetCourse'
    | 'subjectConfidence'
    | 'prioritySubject'
    | 'struggleType'
    | 'troubleTopic'
    | 'studyStyle'
    | 'dailyStudyHours'
    | 'explanationPreference';
  category: string;
  question: string;
  subtext: string;
  sectionLabel: string;
  type: 'subjects' | 'status' | 'course_uni' | 'confidence' | 'priority' | 'radio' | 'text';
  fieldName: string;
  options?: string[];
}

export const SUBJECTS_POOL: { name: SubjectName; category: string }[] = JAMB_SUBJECTS.map(
  subject => ({ name: subject.name as SubjectName, category: subject.category })
);

/**
 * Exact 14-subject 2-column grid order from the uploaded Onboarding Design (Screen 00b)
 * Mapped to canonical SABI JAMB subject names where needed.
 */
export const WONDERLAND_ONBOARDING_SUBJECTS: {
  displayLabel: string;
  canonicalName: string;
  locked?: boolean;
}[] = [
  { displayLabel: 'English Language', canonicalName: 'English Language', locked: true },
  { displayLabel: 'Mathematics', canonicalName: 'Mathematics' },
  { displayLabel: 'Physics', canonicalName: 'Physics' },
  { displayLabel: 'Chemistry', canonicalName: 'Chemistry' },
  { displayLabel: 'Biology', canonicalName: 'Biology' },
  { displayLabel: 'Economics', canonicalName: 'Economics' },
  { displayLabel: 'Government', canonicalName: 'Government' },
  { displayLabel: 'Literature in English', canonicalName: 'Literature-in-English' },
  { displayLabel: 'Commerce', canonicalName: 'Commerce' },
  { displayLabel: 'Geography', canonicalName: 'Geography' },
  { displayLabel: 'Agricultural Science', canonicalName: 'Agricultural Science' },
  {
    displayLabel: 'Christian Religious Studies',
    canonicalName: 'Christian Religious Studies',
  },
  { displayLabel: 'Islamic Studies', canonicalName: 'Islamic Religious Studies' },
  { displayLabel: 'Principles of Accounts', canonicalName: 'Financial Accounting' },
];

export const CURRENT_CLASS_OPTIONS = [
  'Senior Secondary 2 (SS2)',
  'Senior Secondary 3 (SS3)',
  'Out of school / re-sitting',
] as const;

export const JAMB_ATTEMPT_OPTIONS = ['0', '1', '2+'] as const;

/**
 * Renovated SABI Wonderland Onboarding Questions
 * The following 4 legacy questions have been removed per product specification:
 *   1. When are you planning to write JAMB? (monthsUntilExam)
 *   2. Why is achieving your JAMB goal important to you? (motivation)
 *   3. Where do you usually study? (studyEnvironment)
 *   4. Which language style do you prefer? (languagePreference)
 */
export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 1,
    key: 'chosenSubjects',
    category: 'JAMB Subjects',
    question: 'Pick your 4 JAMB subjects',
    subtext:
      'English is compulsory for the Joint Admissions and Matriculation Board (JAMB) exam, so it’s already in. Choose exactly 3 more.',
    sectionLabel: 'Your 4 subjects',
    type: 'subjects',
    fieldName: 'chosenSubjects',
  },
  {
    id: 2,
    key: 'academicStatus',
    category: 'Academic Profile',
    question: 'Where are you right now?',
    subtext: 'This helps SABI pitch questions at the right level.',
    sectionLabel: 'Your current class',
    type: 'status',
    fieldName: 'academicStatus',
  },
  {
    id: 3,
    key: 'targetCourse',
    category: 'Admission Goal',
    question: 'What do you want to study?',
    subtext: 'Your intended course and preferred institution. We go chase am together.',
    sectionLabel: 'Intended course',
    type: 'course_uni',
    fieldName: 'targets',
  },
  {
    id: 4,
    key: 'subjectConfidence',
    category: 'Self-Assessment',
    question: 'How confident do you feel in each subject?',
    subtext:
      'Rate each of your 4 subjects from 1 (needs work) to 5 (very confident). This is your starting estimate.',
    sectionLabel: 'Rate your 4 subjects (1 – 5)',
    type: 'confidence',
    fieldName: 'subjectConfidence',
  },
  {
    id: 5,
    key: 'prioritySubject',
    category: 'Learning Priority',
    question: 'Which subject needs the most help?',
    subtext: 'Choose the subject you want SABI to pay extra attention to first.',
    sectionLabel: 'Your priority subject',
    type: 'priority',
    fieldName: 'prioritySubject',
  },
  {
    id: 6,
    key: 'struggleType',
    category: 'Learning Challenges',
    question: 'What usually makes JAMB tough for you?',
    subtext: 'Choose the challenge that affects your performance the most.',
    sectionLabel: 'Biggest exam challenge',
    type: 'radio',
    fieldName: 'struggleType',
    options: [
      'Careless mistakes or time pressure',
      'I run out of time',
      'I struggle with methods, concepts or formulas',
      'I find it difficult to study consistently',
    ],
  },
  {
    id: 7,
    key: 'troubleTopic',
    category: 'Learning Challenges',
    question: 'Is there a particular topic you struggle with?',
    subtext: 'Name a specific topic or concept you want SABI to break down for you.',
    sectionLabel: 'Specific trouble topic',
    type: 'text',
    fieldName: 'troubleTopic',
  },
  {
    id: 8,
    key: 'studyStyle',
    category: 'Study Preferences',
    question: 'How do you prefer to study?',
    subtext: 'There is no wrong answer. Choose what you are most likely to follow.',
    sectionLabel: 'Your study approach',
    type: 'radio',
    fieldName: 'studyStyle',
    options: [
      'I prefer a structured study plan',
      'I prefer to study flexibly',
      'I find it difficult to study regularly',
    ],
  },
  {
    id: 9,
    key: 'dailyStudyHours',
    category: 'Study Schedule',
    question: 'How much time can you study each day?',
    subtext: 'Choose the daily preparation time you can realistically sustain.',
    sectionLabel: 'Daily study dedication',
    type: 'radio',
    fieldName: 'dailyStudyHours',
    options: ['1 hour or less', '2–3 hours', '4 hours or more'],
  },
  {
    id: 10,
    key: 'explanationPreference',
    category: 'Explanation Style',
    question: 'How would you like SABI to explain questions?',
    subtext: 'Choose how detailed your answer explanations should be. You can change this anytime.',
    sectionLabel: 'Explanation preference',
    type: 'radio',
    fieldName: 'explanationPreference',
    options: ['Brief and straight to the point', 'Detailed, step-by-step explanations'],
  },
];
