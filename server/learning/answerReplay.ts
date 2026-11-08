import { isCbtFeedbackLocked } from './answerVisibility';

export type StoredAnswerReplayInput = {
  requestedOption: string;
  storedOption: string | null;
  isCorrect: boolean;
  correctOption: string;
  explanation: string;
  answeredCount: number;
  totalQuestions: number;
  mode: string | null | undefined;
  status: string | null | undefined;
};

export function buildStoredAnswerReplay(input: StoredAnswerReplayInput) {
  if (input.storedOption !== input.requestedOption) {
    return { kind: 'conflict' as const };
  }

  if (isCbtFeedbackLocked(input.mode, input.status)) {
    return {
      kind: 'replay' as const,
      result: {
        recorded: true,
        answered_count: input.answeredCount,
        total_questions: input.totalQuestions,
        session_completed: false,
      },
    };
  }

  return {
    kind: 'replay' as const,
    result: {
      correct: input.isCorrect,
      correct_option: input.correctOption,
      explanation: input.explanation,
      answered_count: input.answeredCount,
      total_questions: input.totalQuestions,
      session_completed: input.status === 'completed',
    },
  };
}
