import { SubjectName } from '../types';

export interface OnboardingQuestion {
  id: number;
  question: string;
  subtext: string;
  type: 'text' | 'subjects' | 'select' | 'course_uni' | 'confidence' | 'radio' | 'weak_topic' | 'textarea';
  options?: string[];
  placeholder?: string;
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
  { name: 'Hausa', category: 'Languages' }
];

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    id: 1,
    question: "What is your full name?",
    subtext: "We want to address you warmly on your JAMB journey.",
    type: 'text',
    placeholder: "e.g. Daniel Etim",
    fieldName: 'name'
  },
  {
    id: 2,
    question: "Select your 4 JAMB subjects:",
    subtext: "English Language is compulsory. Select exactly 3 other subjects to build your core team of 4.",
    type: 'subjects',
    fieldName: 'chosenSubjects'
  },
  {
    id: 3,
    question: "What is your current class and prior attempts?",
    subtext: "Tell us about your current level and previous sittings for the exam.",
    type: 'select',
    fieldName: 'classAndAttempts'
  },
  {
    id: 4,
    question: "Do you have a dream course and goal university in mind?",
    subtext: "Focusing on a concrete target keeps motivation high and structures our score pacing.",
    type: 'course_uni',
    fieldName: 'targets'
  },
  {
    id: 5,
    question: "When are you sitting for your JAMB exam?",
    subtext: "We will tailor your daily workloads around the remaining countdown duration.",
    type: 'select',
    options: [
      "1 month or less",
      "2-3 months",
      "4-6 months",
      "More than 6 months"
    ],
    fieldName: 'monthsUntilExam'
  },
  {
    id: 6,
    question: "Rate your confidence level for each selected subject:",
    subtext: "Be completely honest! Sabi adapts specifically to make your weakest subjects your strongest.",
    type: 'confidence',
    fieldName: 'subjectConfidence'
  },
  {
    id: 7,
    question: "Which of these subjects worries you the most?",
    subtext: "This subject will receive extra protective study alerts and gentle supportive tutoring.",
    type: 'weak_topic', // We'll render chips of the selected 4 subjects
    fieldName: 'prioritySubject'
  },
  {
    id: 8,
    question: "When you struggle with this subject, what is the root cause?",
    subtext: "Identifying the precise friction point helps Sabi tailor its exercise methods.",
    type: 'radio',
    options: [
      "I make careless mistakes under time pressure",
      "I run out of exam time before answering all questions",
      "I struggle with the core solving methods/formulas",
      "I don't study consistently enough"
    ],
    fieldName: 'struggleType'
  },
  {
    id: 9,
    question: "Is there a specific topic that historically trips you up?",
    subtext: "We will flag this for immediate, deep diagnostic evaluation. (e.g. Concord, Surds)",
    type: 'text',
    placeholder: "e.g. Proximity Concord, Alternating Currents",
    fieldName: 'selfIdentifiedWeakTopic'
  },
  {
    id: 10,
    question: "What is your typical study style?",
    subtext: "We adapt to fit your calendar-whether you're micro-learning or cramming.",
    type: 'radio',
    options: [
      "Structured schedule (set times every day)",
      "Flexible flexible slots (study on-the-go)",
      "I don't study at all"
    ],
    fieldName: 'studyHabits'
  },
  {
    id: 11,
    question: "How much time can you realistically dedicate daily?",
    subtext: "Consistent micro-habits perform far better than intensive weekend cramming.",
    type: 'radio',
    options: [
      "1 hour or less per day",
      "2 to 3 hours per day",
      "4 hours or more per day"
    ],
    fieldName: 'dailyStudyHours'
  },
  {
    id: 12,
    question: "Where do you usually study, and is it quiet?",
    subtext: "This helps Sabi suggest audio guides or offline-ready focus modules.",
    type: 'radio',
    options: [
      "Quiet private space (home/library)",
      "Busy/noisy environment (transit/evening centers)"
    ],
    fieldName: 'studyEnvironment'
  },
  {
    id: 13,
    question: "How do you prefer your study explanations?",
    subtext: "Tell us how deep you want your Sabi Coach to go when reviewing answers.",
    type: 'radio',
    options: [
      "Brief & concise (straight to the point)",
      "Detailed step-by-step (with proofs and derivations)"
    ],
    fieldName: 'explanationPreference'
  },
  {
    id: 14,
    question: "What language style works best for complex topics?",
    subtext: "We support formal English, West African Pidgin, or a comfortable mix of both.",
    type: 'radio',
    options: [
      "Plain Formal English",
      "West African Pidgin English (Warm and laid back)",
      "Mixed Nigerian English (Formal logic + supportive Pidgin vibes)"
    ],
    fieldName: 'languagePreference'
  },
  {
    id: 15,
    question: "What is your core motivation for passing your JAMB?",
    subtext: "Is it family pride, career ambitions, or proving to yourself that you can win?",
    type: 'textarea',
    placeholder: "Write from the heart... Sabi will remind you of this when the going gets tough.",
    fieldName: 'motivation'
  }
];
