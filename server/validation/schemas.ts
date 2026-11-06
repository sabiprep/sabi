/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zod schemas for every API route that accepts a body.
 * Unknown keys are rejected, strings are length-capped, and email values are normalized.
 */
import { z } from 'zod';
import { canonicalizeJambSubject, COMPULSORY_JAMB_SUBJECT } from '../config/jamb';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const emailSchema = z.string().trim().toLowerCase().min(3).max(254).regex(EMAIL_REGEX, 'A valid email address is required.');
export const passwordSchema = z.string().min(6, 'Password must be at least 6 characters long.').max(72, 'Password must be 72 characters or fewer.');
const phoneSchema = z.string().trim().max(20);
export const uniqueSabiIdSchema = z.string().trim().toUpperCase().regex(/^\d{4}[A-Z]$/, 'Unique SABI ID must be 4 numbers followed by 1 letter (e.g. 4829K).');

export const registerSchema = z.strictObject({
  fullName: z.string().trim().min(1).max(120), email: emailSchema, password: passwordSchema,
  phone: phoneSchema.optional(), stateOfOrigin: z.string().trim().max(60).optional(),
  provider: z.enum(['email', 'google']).optional(),
});
export const loginSchema = z.strictObject({
  identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(72),
  method: z.enum(['email', 'phone']).optional(),
});
export const verifyAccountSchema = z.strictObject({
  email: emailSchema.optional(), uniqueId: uniqueSabiIdSchema.optional(),
  authProviders: z.array(z.enum(['email', 'google'])).max(4).optional(),
});
export const resetPasswordRequestSchema = z.strictObject({
  identifier: z.string().trim().min(3).max(254),
});
export const resetPasswordConfirmSchema = z.strictObject({
  email: emailSchema, otp: z.string().trim().regex(/^\d{6}$/), newPassword: passwordSchema,
});

const registeredSubjectsSchema = z.array(z.string().trim().min(1).max(60))
  .length(4, 'Select exactly four JAMB UTME subjects.')
  .transform((subjects, ctx) => {
    const canonical = subjects.map((subject) => canonicalizeJambSubject(subject));
    if (canonical.some((subject) => subject === null)) {
      ctx.addIssue({ code: 'custom', message: 'One or more selected subjects are not in the SABI JAMB subject catalogue.' });
      return z.NEVER;
    }
    const normalized = canonical as string[];
    if (new Set(normalized).size !== 4) {
      ctx.addIssue({ code: 'custom', message: 'A JAMB subject can only be selected once.' });
      return z.NEVER;
    }
    if (!normalized.includes(COMPULSORY_JAMB_SUBJECT)) {
      ctx.addIssue({ code: 'custom', message: 'English Language is compulsory for every UTME subject combination.' });
      return z.NEVER;
    }
    return normalized;
  });

const onboardingBaseSchema = z.strictObject({
  onboardingAnswers: z.record(z.string(), z.unknown()).default({}),
  registeredSubjects: registeredSubjectsSchema.optional(),
  targetScore: z.number().min(0).max(400).optional(),
});

// Older clients submitted the selected subjects only inside onboardingAnswers.
// Validate that legacy shape too, then return one canonical registeredSubjects
// field so the API never has to guess or silently replace a candidate's choices.
export const onboardingSchema = onboardingBaseSchema.transform((input, ctx) => {
  const submittedSubjects = input.registeredSubjects ?? input.onboardingAnswers.chosenSubjects;
  const parsedSubjects = registeredSubjectsSchema.safeParse(submittedSubjects);
  if (!parsedSubjects.success) {
    ctx.addIssue({
      code: 'custom',
      path: ['registeredSubjects'],
      message: 'Submit exactly four valid JAMB subjects, including English Language.',
    });
    return z.NEVER;
  }
  return { ...input, registeredSubjects: parsedSubjects.data };
});

export const progressSchema = z.strictObject({ progress: z.record(z.string(), z.unknown()) });
export const explainSchema = z.strictObject({
  questionId: z.string().trim().max(80).optional(), preference: z.enum(['short', 'detailed']).optional(),
  language: z.enum(['english', 'pidgin', 'mixed']).optional(), userCustomPrompt: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(60).optional(), topic: z.string().trim().max(120).optional(),
});
const chatMessageSchema = z.object({
  text: z.string().max(4000).optional(), content: z.string().max(4000).optional(),
  sender: z.enum(['user', 'tutor', 'assistant', 'model', 'system']).optional(),
  role: z.enum(['user', 'assistant', 'model', 'system']).optional(),
});
export const chatSchema = z.strictObject({
  messages: z.array(chatMessageSchema).max(30).default([]), currentTopic: z.string().trim().max(120).optional(),
  currentSubject: z.string().trim().max(60).optional(), studentProfile: z.record(z.string(), z.unknown()).optional(),
  topicMemory: z.string().trim().max(4000).optional(),
});
export const generateQuestionSchema = z.strictObject({
  subject: z.string().trim().min(1).max(60), topic: z.string().trim().min(1).max(120),
  subtopic: z.string().trim().max(120).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type VerifyAccountInput = z.infer<typeof verifyAccountSchema>;
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof resetPasswordConfirmSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProgressInput = z.infer<typeof progressSchema>;
export type ExplainInput = z.infer<typeof explainSchema>;
export type ChatInput = z.infer<typeof chatSchema>;
export type GenerateQuestionInput = z.infer<typeof generateQuestionSchema>;
