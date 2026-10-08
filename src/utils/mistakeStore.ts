import { Question, SubjectName } from '../types';

export interface MistakeRecord {
  question: Question;
  selectedAnswer: string;
  timestamp: string;
  timesWrong: number;
  mastered: boolean;
}

const STORAGE_KEY = 'sabi_mistake_records_v1';

export function getMistakeRecords(): MistakeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

export function saveMistakeRecord(question: Question, selectedAnswer: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getMistakeRecords();
    const existingIndex = current.findIndex(m => m.question.id === question.id);

    if (existingIndex >= 0) {
      current[existingIndex].selectedAnswer = selectedAnswer;
      current[existingIndex].timesWrong += 1;
      current[existingIndex].timestamp = new Date().toISOString();
      current[existingIndex].mastered = false;
    } else {
      current.unshift({
        question,
        selectedAnswer,
        timestamp: new Date().toISOString(),
        timesWrong: 1,
        mastered: false,
      });
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (e) {}
}

export function markMistakeMastered(questionId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getMistakeRecords();
    const updated = current.map(m => (m.question.id === questionId ? { ...m, mastered: true } : m));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {}
}

export function removeMistakeRecord(questionId: string) {
  if (typeof window === 'undefined') return;
  try {
    const current = getMistakeRecords();
    const filtered = current.filter(m => m.question.id !== questionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {}
}

export function clearAllMistakes() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}
