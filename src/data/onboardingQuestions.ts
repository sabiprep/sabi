import { SubjectName } from '../types';
import { JAMB_SUBJECTS } from '../../shared/jamb';

export interface OnboardingQuestion {
  id: number;
  key: string;
  category: string;
  question: string;
  subtext: string;
  type: 'text' | 'subjects' | 'status' | 'course_uni' | 'radio' | 'confidence' | 'priority' | 'long_text';
  fieldName: string;
  options?: string[];
}

export const SUBJECTS_POOL: { name: SubjectName; category: string }[] = JAMB_SUBJECTS.map(
  (subject) => ({ name: subject.name as SubjectName, category: subject.category })
);

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  { id: 1, key: 'fullName', category: 'About You', question: 'What is your full name?', subtext: 'Enter the name you want Sabi to use when addressing you.', type: 'text', fieldName: 'fullName' },
  { id: 2, key: 'chosenSubjects', category: 'JAMB Subjects', question: 'Which four subjects will you write in JAMB?', subtext: 'Use of English is compulsory. Select exactly three additional subjects.', type: 'subjects', fieldName: 'chosenSubjects' },
  { id: 3, key: 'academicStatus', category: 'Academic Profile', question: 'What is your current academic status?', subtext: 'Tell us where you are in your education and about previous JAMB attempts.', type: 'status', fieldName: 'academicStatus' },
  { id: 4, key: 'targetCourse', category: 'Admission Goal', question: 'What course and university are you aiming for?', subtext: 'You can enter your preferred course and first-choice institution.', type: 'course_uni', fieldName: 'targets' },
  { id: 5, key: 'monthsUntilExam', category: 'Exam Timeline', question: 'How soon is your JAMB examination?', subtext: 'This helps Sabi plan a realistic preparation pace.', type: 'radio', fieldName: 'monthsUntilExam', options: ['1 month or less', '2–3 months', '4–6 months', 'More than 6 months'] },
  { id: 6, key: 'subjectConfidence', category: 'Self-Assessment', question: 'How confident do you feel in each subject?', subtext: 'This is your personal confidence rating, not a test or a measure of actual mastery.', type: 'confidence', fieldName: 'subjectConfidence' },
  { id: 7, key: 'prioritySubject', category: 'Learning Priority', question: 'Which subject should Sabi pay extra attention to?', subtext: 'Choose the subject you most want to improve.', type: 'priority', fieldName: 'prioritySubject' },
  { id: 8, key: 'struggleType', category: 'Learning Challenges', question: 'What usually makes JAMB questions difficult for you?', subtext: 'Choose the challenge that affects you most.', type: 'radio', fieldName: 'struggleType', options: ['Careless mistakes or time pressure', 'I run out of time', 'I struggle with methods, concepts or formulas', 'I find it difficult to study consistently'] },
  { id: 9, key: 'troubleTopic', category: 'Learning Challenges', question: 'Is there a particular topic you struggle with?', subtext: 'Name a topic or explain what you find difficult. Be as specific as you can.', type: 'text', fieldName: 'troubleTopic' },
  { id: 10, key: 'studyStyle', category: 'Study Preferences', question: 'Which study approach sounds most like you?', subtext: 'There is no wrong answer. Choose what you are most likely to follow.', type: 'radio', fieldName: 'studyStyle', options: ['I prefer a structured study plan', 'I prefer to study flexibly', 'I find it difficult to study regularly'] },
  { id: 11, key: 'dailyStudyHours', category: 'Study Schedule', question: 'How much time can you dedicate to studying each day?', subtext: 'Choose the time you can realistically sustain.', type: 'radio', fieldName: 'dailyStudyHours', options: ['1 hour or less', '2–3 hours', '4 hours or more'] },
  { id: 12, key: 'studyEnvironment', category: 'Study Environment', question: 'Where do you usually study?', subtext: 'This helps Sabi make the learning experience practical for your environment.', type: 'radio', fieldName: 'studyEnvironment', options: ['A quiet or private place', 'A busy or noisy environment'] },
  { id: 13, key: 'explanationPreference', category: 'Explanation Style', question: 'How would you like Sabi to explain difficult questions?', subtext: 'You can change your preference later.', type: 'radio', fieldName: 'explanationPreference', options: ['Brief and straight to the point', 'Detailed, step-by-step explanations'] },
  { id: 14, key: 'languagePreference', category: 'Language Preference', question: 'Which language style do you prefer?', subtext: 'Choose the style that makes explanations easiest to understand.', type: 'radio', fieldName: 'languagePreference', options: ['Plain Formal English', 'West African Pidgin', 'Mixed Nigerian English'] },
  { id: 15, key: 'motivation', category: 'Your Motivation', question: 'What is your biggest motivation for gaining admission?', subtext: 'Tell us what you are working towards. Share only what you are comfortable sharing.', type: 'long_text', fieldName: 'motivation' },
];
