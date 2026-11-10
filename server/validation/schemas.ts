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
  submissionKey: z.string().uuid().optional(),
  questionSetVersion: z.enum(['v2', 'v3']).optional(),
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
  if (input.questionSetVersion === 'v3') {
    const a = input.onboardingAnswers;
    let invalidV3 = false;
    const requiredText = ['fullName','currentClass','attempts','targetCourse','targetUniversity','monthsUntilExam','prioritySubject','struggleType','troubleTopic','studyStyle','dailyStudyHours','studyEnvironment','explanationPreference','languagePreference'];
    for (const key of requiredText) {
      if (typeof a[key] !== 'string' || !String(a[key]).trim()) {
        invalidV3 = true;
        ctx.addIssue({ code: 'custom', path: ['onboardingAnswers', key], message: `A valid ${key} answer is required.` });
      }
    }
    if (String(a.fullName ?? '').trim().length < 2) {
      invalidV3 = true;
      ctx.addIssue({ code: 'custom', path: ['onboardingAnswers','fullName'], message: 'Enter your full name.' });
    }
    if (a.currentClass === 'Currently out of school' && (typeof a.yearsOutOfSchool !== 'string' || !a.yearsOutOfSchool.trim())) {
      invalidV3 = true;
      ctx.addIssue({ code: 'custom', path: ['onboardingAnswers','yearsOutOfSchool'], message: 'Tell us how long you have been out of school.' });
    }
    const confidence = a.subjectConfidence;
    if (!confidence || typeof confidence !== 'object' || Array.isArray(confidence) ||
      !parsedSubjects.data.every((subject) => Number.isInteger((confidence as Record<string, unknown>)[subject]) &&
        Number((confidence as Record<string, unknown>)[subject]) >= 1 && Number((confidence as Record<string, unknown>)[subject]) <= 5)) {
      invalidV3 = true;
      ctx.addIssue({ code: 'custom', path: ['onboardingAnswers','subjectConfidence'], message: 'Provide a confidence rating from 1 to 5 for every selected subject.' });
    }
    if (typeof a.motivation !== 'string') {
      invalidV3 = true;
      ctx.addIssue({ code: 'custom', path: ['onboardingAnswers','motivation'], message: 'Motivation must be text.' });
    }
    if (invalidV3) return z.NEVER;
  }
  return { ...input, registeredSubjects: parsedSubjects.data };
});

export const progressCheckinSchema = z.strictObject({
  submissionKey: z.string().uuid(),
  confidenceScore: z.number().int().min(1).max(5).optional(),
  motivationScore: z.number().int().min(1).max(5).optional(),
  perceivedBarriers: z.array(z.enum([
    'limited_time','limited_data','device_access','financial_pressure',
    'work_or_family_duties','difficult_subjects','low_confidence','distractions','other'
  ])).max(9).default([]),
  reflectionText: z.string().trim().max(1000).optional(),
}).refine((value) =>
  value.confidenceScore !== undefined ||
  value.motivationScore !== undefined ||
  value.perceivedBarriers.length > 0 ||
  Boolean(value.reflectionText),
  { message: 'Provide at least one check-in response.' }
);

const learningEventSchema = z.strictObject({
  clientEventId: z.string().uuid(),
  sessionId: z.string().uuid(),
  sessionItemId: z.string().uuid().optional(),
  questionId: z.string().trim().max(120).optional(),
  eventType: z.enum([
    'session_started','session_paused','session_resumed','session_completed','session_abandoned',
    'question_presented','question_revisited','answer_selected','answer_changed','answer_submitted',
    'question_skipped','hint_requested','explanation_opened','navigation_changed','focus_lost','focus_returned'
  ]),
  sequenceNo: z.number().int().min(0).optional(),
  elapsedMs: z.number().int().min(0).max(3600000).optional(),
  activeElapsedMs: z.number().int().min(0).max(3600000).optional(),
  eventPayload: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.string().datetime(),
});
export const learningEventsSchema = z.strictObject({
  events: z.array(learningEventSchema).min(1).max(50),
}).refine((value) => value.events.every((event) =>
  new TextEncoder().encode(JSON.stringify(event.eventPayload)).length <= 4096
), { message: 'Each event payload must be 4 KB or smaller.' });

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

export type ProgressCheckinInput = z.infer<typeof progressCheckinSchema>;
export type LearningEventsInput = z.infer<typeof learningEventsSchema>;
