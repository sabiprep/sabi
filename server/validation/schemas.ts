/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Zod schemas for every API route that accepts a body.
 *
 * Rules applied across the board (defect B7):
 *  - unknown keys are rejected (`strictObject`) so clients cannot smuggle fields
 *    such as `email`, `authUserId`, `role` or `id` into privileged handlers;
 *  - every string is length-capped;
 *  - trailing whitespace is trimmed, emails are lower-cased.
 */

import { z } from 'zod';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email is required.')
  .max(254, 'Email is too long.')
  .regex(EMAIL_REGEX, 'A valid email address is required.');

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters long.')
  .max(72, 'Password must be 72 characters or fewer.');

const phoneSchema = z.string().trim().max(20, 'Phone number is too long.');

export const uniqueSabiIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^\d{4}[A-Z]$/, 'Unique SABI ID must be 4 numbers followed by 1 letter (e.g. 4829K).');

/** POST /api/auth/register */
export const registerSchema = z.strictObject({
  fullName: z.string().trim().min(1, 'Full name is required.').max(120, 'Full name is too long.'),
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema.optional(),
  stateOfOrigin: z.string().trim().max(60).optional(),
  provider: z.enum(['email', 'google']).optional(),
});

/** POST /api/auth/login */
export const loginSchema = z.strictObject({
  identifier: z.string().trim().min(3, 'Email or phone number is required.').max(254),
  password: z.string().min(1, 'Password is required to sign in.').max(72),
  method: z.enum(['email', 'phone']).optional(),
});

/**
 * POST /api/auth/verify
 * Identity always comes from the bearer token; the body may only assert the
 * caller's own email / unique id and is cross-checked server-side.
 */
export const verifyAccountSchema = z.strictObject({
  email: emailSchema.optional(),
  uniqueId: uniqueSabiIdSchema.optional(),
  authProviders: z.array(z.enum(['email', 'google'])).max(4).optional(),
});

/** POST /api/auth/reset-password/request */
export const resetPasswordRequestSchema = z.strictObject({
  identifier: z.string().trim().min(3, 'Enter the email or phone number on your account.').max(254),
});

/** POST /api/auth/reset-password/confirm */
export const resetPasswordConfirmSchema = z.strictObject({
  email: emailSchema,
  otp: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code sent to your email.'),
  newPassword: passwordSchema,
});

/** POST /api/profile/onboarding */
export const onboardingSchema = z.strictObject({
  onboardingAnswers: z.record(z.string(), z.unknown()).default({}),
  registeredSubjects: z.array(z.string().trim().min(1).max(60)).min(1).max(8).optional(),
  targetScore: z.number().min(0).max(400).optional(),
});

/** POST /api/profile/progress */
export const progressSchema = z.strictObject({
  progress: z.record(z.string(), z.unknown()),
});

/** POST /api/explain */
export const explainSchema = z.strictObject({
  questionId: z.string().trim().max(80).optional(),
  preference: z.enum(['short', 'detailed']).optional(),
  language: z.enum(['english', 'pidgin', 'mixed']).optional(),
  userCustomPrompt: z.string().trim().max(2000).optional(),
  subject: z.string().trim().max(60).optional(),
  topic: z.string().trim().max(120).optional(),
});

/** POST /api/chat */
const chatMessageSchema = z.object({
  text: z.string().max(4000).optional(),
  content: z.string().max(4000).optional(),
  sender: z.enum(['user', 'tutor', 'assistant', 'model', 'system']).optional(),
  role: z.enum(['user', 'assistant', 'model', 'system']).optional(),
});

export const chatSchema = z.strictObject({
  messages: z.array(chatMessageSchema).max(30).default([]),
  currentTopic: z.string().trim().max(120).optional(),
  currentSubject: z.string().trim().max(60).optional(),
  studentProfile: z.record(z.string(), z.unknown()).optional(),
  topicMemory: z.string().trim().max(4000).optional(),
});

/** POST /api/generate-question */
export const generateQuestionSchema = z.strictObject({
  subject: z.string().trim().min(1, 'Subject is required.').max(60),
  topic: z.string().trim().min(1, 'Topic is required.').max(120),
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
