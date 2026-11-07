import { z } from 'zod';

export const questionReviewBodySchema = z.strictObject({
  decision: z.enum(['approved', 'rejected', 'changes_requested', 'flagged', 'retired']),
  comments: z.string().trim().max(2000).optional(),
  qualityChecks: z.strictObject({
    content_reviewed: z.boolean().optional(),
    answer_key_verified: z.boolean().optional(),
  }).optional(),
});

export type QuestionReviewDecision = z.infer<typeof questionReviewBodySchema>['decision'];

const transitions: Record<string, readonly QuestionReviewDecision[]> = {
  pending_review: ['approved', 'rejected', 'changes_requested', 'flagged', 'retired'],
  approved: ['flagged', 'retired'],
  rejected: ['changes_requested', 'retired'],
  flagged: ['approved', 'rejected', 'changes_requested', 'retired'],
  retired: [],
};

export function canTransitionQuestionReview(
  currentState: string,
  decision: QuestionReviewDecision
): boolean {
  return transitions[currentState]?.includes(decision) ?? false;
}

export function nextQuestionReviewState(decision: QuestionReviewDecision): string {
  return decision === 'changes_requested' ? 'pending_review' : decision;
}
