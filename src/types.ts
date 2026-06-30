/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SubjectName = 
  | 'English Language' 
  | 'Mathematics' 
  | 'Physics' 
  | 'Chemistry'
  | 'Biology' 
  | 'Agricultural Science'
  | 'Geography'
  | 'Economics'
  | 'Government' 
  | 'History'
  | 'Commerce'
  | 'Financial Accounting'
  | 'Christian Religious Studies'
  | 'Islamic Religious Studies'
  | 'Literature-in-English'
  | 'Music'
  | 'Fine Art'
  | 'French'
  | 'Arabic'
  | 'Yoruba'
  | 'Igbo'
  | 'Hausa'
  | 'Home Economics';

export interface Question {
  id: string;
  exam_type: 'JAMB' | 'WAEC' | 'NECO' | 'AI-Generated';
  subject: SubjectName;
  topic: string;
  subtopic: string;
  year: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  explanation_short: string;
  explanation_pidgin: string;
  difficulty: 'easy' | 'medium' | 'hard';
  difficulty_actual?: 'easy' | 'medium' | 'hard';
  concepts: string[];
  common_wrong_answer?: string;
  source: string;
  status: 'verified' | 'ai-draft' | 'low-confidence' | 'flagged';
  confidence_score: number;
  flag_count?: number;
  verified_by?: string;
  created_at: string;
}

export interface MasteryMapItem {
  subject: SubjectName;
  topic: string;
  subtopic: string;
  score: number; // 0 - 100
  confidence: 'Low' | 'Medium' | 'High';
  attempts: number;
  lastAttemptAt?: string;
  nextReviewDate: string; // ISO string
  history: {
    questionId: string;
    correct: boolean;
    timestamp: string;
    timeSpentSeconds: number;
  }[];
}

export interface StudentProfile {
  name: string;
  classLevel: string;
  attempts: number;
  chosenSubjects: SubjectName[];
  targetCourse: string;
  targetUniversity: string;
  monthsUntilExam: number;
  priorScoreBaseline?: number;
  
  // Onboarding conversational self-reported signals (Layer 2)
  subjectConfidence: Record<SubjectName, number>; // 1-5 scale
  struggleTypes: Record<SubjectName, 'method' | 'careless' | 'time' | 'none'>;
  studyHabits: 'scheduled' | 'flexible' | 'none';
  dailyStudyHours: string;
  studyEnvironment: 'quiet' | 'noisy';
  explanationPreference: 'short' | 'step-by-step';
  languagePreference: 'english' | 'pidgin' | 'mixed';
  motivation: string;
  prioritySubject?: SubjectName;
  selfIdentifiedWeakTopic?: string;

  // Calculated flags (Layer 3)
  blindSpots: string[]; // List of topic names where confidence is high but score is low
  streakCount: number;
  lastActiveDate?: string;
  xpPoints: number;
  unlockedSubjectsCount: number;
  isPremium: boolean;
  aiCredits: number;

  // Rolling per-topic summary / memory layers
  topicMemories: Record<string, string>; // topic -> summary paragraph
  conversationHistory: { role: 'user' | 'model'; parts: { text: string }[] }[];
}

export interface KnowledgeBaseEntry {
  id: string;
  subject: string;
  topic: string;
  subtopic: string;
  title: string;
  content: string;
  type: 'concept' | 'faq' | 'misconception';
}

export interface PipelineLog {
  id: string;
  pipelineId: number;
  name: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  lastRunTime?: string;
  itemsProcessed: number;
  itemsFlagged: number;
  logs: string[];
}
