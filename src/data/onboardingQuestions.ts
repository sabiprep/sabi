import { SubjectName } from '../types';

export interface OnboardingQuestion {
  id: number;
  category: string;
  question: string;
  subtext: string;
  type: 'subjects' | 'course_uni' | 'radio' | 'select' | 'confidence' | 'weak_topic';
  options?: string[];
  fieldName: string;
}

export const SUBJECTS_POOL: { name: SubjectName; category: string }[] = [
  { name: 'English Language', category: 'Compulsory' },
  { name: 'Mathematics', category: 'General' },
  { name: 'Physics', category: 'Science' },
  { name: 'Chemistry', category: 'Science' },
  { name: 'Biology', category: 'Science' },
  { name: 'Literature-in-English', category: 'Arts' },
  { name: 'Government', category: 'Social Sciences' },
  { name: 'Economics', category: 'Social Sciences' },
  { name: 'Christian Religious Studies', category: 'Arts' },
  { name: 'Islamic Religious Studies', category: 'Arts' },
  { name: 'Agricultural Science', category: 'Science' },
  { name: 'Geography', category: 'General' },
  { name: 'Commerce', category: 'Social Sciences' },
  { name: 'Financial Accounting', category: 'Social Sciences' },
  { name: 'History', category: 'Arts' },
  { name: 'Yoruba', category: 'Languages' },
  { name: 'Igbo', category: 'Languages' },
  { name: 'Hausa', category: 'Languages' },
  { name: 'Music', category: 'Arts' },
  { name: 'Fine Art', category: 'Arts' },
  { name: 'French', category: 'Languages' },
  { name: 'Arabic', category: 'Languages' },
  { name: 'Home Economics', category: 'General' }
];

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 1,
    category: 'Subject Combination',
    question: 'Select your 4 official JAMB UTME subjects',
    subtext: 'Use of English is compulsory for all candidates. Select 3 additional subjects matching your target faculty.',
    type: 'subjects',
    fieldName: 'chosenSubjects'
  },
  {
    id: 2,
    category: 'Admission Target',
    question: 'What is your target course and first-choice institution?',
    subtext: 'Your course and university benchmark determine your departmental cut-off target.',
    type: 'course_uni',
    fieldName: 'targets'
  },
  {
    id: 3,
    category: 'Score Benchmark',
    question: 'What is your target UTME aggregate score?',
    subtext: 'We calibrate your daily Blitz speed thresholds and mock accuracy targets to match your goal.',
    type: 'radio',
    options: [
      '250 – 279 (Standard Merit Admission)',
      '280 – 309 (Competitive Departmental Cut-Off)',
      '310 – 339 (High-Demand Faculty: Medicine, Law, Engineering)',
      '340+ (National Top 1% Merit Scholar)'
    ],
    fieldName: 'targetScore'
  },
  {
    id: 4,
    category: 'Academic Profile',
    question: 'What is your current academic level and prior UTME experience?',
    subtext: 'Helps SABI adjust question difficulty progression from foundational concepts to past exam traps.',
    type: 'select',
    fieldName: 'classAndAttempts'
  },
  {
    id: 5,
    category: 'Preparation Timeline',
    question: 'How much time remains until your JAMB UTME sitting?',
    subtext: 'Determines your syllabus pacing and weekly mock simulation frequency.',
    type: 'radio',
    options: [
      'Under 30 Days (Intensive Revision Sprint)',
      '1 to 3 Months (Focused Syllabus & Past Questions)',
      '3 to 6 Months (Comprehensive Topic Mastery)',
      'Over 6 Months (Early Foundation Building)'
    ],
    fieldName: 'monthsUntilExam'
  },
  {
    id: 6,
    category: 'Baseline Readiness',
    question: 'Rate your current mastery across your 4 selected subjects',
    subtext: 'Rate from 1 (Needs Foundation) to 5 (Exam Ready) so Smart Practice prioritizes your gaps.',
    type: 'confidence',
    fieldName: 'subjectConfidence'
  },
  {
    id: 7,
    category: 'Priority Subject',
    question: 'Which of your 4 subjects requires the most urgent improvement?',
    subtext: 'SABI will allocate extra diagnostic drills and step-by-step breakdowns to this subject.',
    type: 'weak_topic',
    fieldName: 'prioritySubject'
  },
  {
    id: 8,
    category: 'Exam Bottleneck',
    question: 'What is your biggest challenge under exam conditions?',
    subtext: 'Identifies whether to prioritize 60-second Blitz speed training or deep Smart Practice conceptual drills.',
    type: 'radio',
    options: [
      'Time Management — Running out of time before finishing all 180 questions',
      'Formula & Analytical Application — Solving calculation and multi-step problems',
      'Accuracy Under Pressure — Second-guessing between two close options',
      'Syllabus Coverage — Encountering unfamiliar topics from the JAMB syllabus'
    ],
    fieldName: 'struggleType'
  },
  {
    id: 9,
    category: 'Study Schedule',
    question: 'What daily practice commitment can you sustain consistently?',
    subtext: 'Consistent daily CBT practice outperforms irregular weekend cramming.',
    type: 'radio',
    options: [
      '30 – 45 Minutes Daily (2 Blitz Sets + 1 Smart Checkpoint)',
      '1 – 2 Hours Daily (4 Blitz Sets + 2 Smart Checkpoints)',
      '3+ Hours Daily (Full Intensive UTME Marathon)'
    ],
    fieldName: 'dailyStudyHours'
  },
  {
    id: 10,
    category: 'Coaching Format',
    question: 'How should SABI present answer corrections and explanations?',
    subtext: 'Customize how solutions are displayed after every Blitz and Smart Practice question.',
    type: 'radio',
    options: [
      'Concise Exam Rule — Direct formula, key principle, and final answer',
      'Detailed Step-by-Step Derivation — Full analytical workings and syllabus proof',
      'Dual-Layer Clarity — Standard English explanation paired with Nigerian Pidgin summary'
    ],
    fieldName: 'explanationPreference'
  }
];
