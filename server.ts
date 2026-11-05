/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { SEED_QUESTIONS, KNOWLEDGE_BASE, SYLLABUS_FREQUENCY } from './src/data/questions.ts';
import { Question, SubjectName } from './src/types';
import { config, isOriginAllowed } from './server/config';
import { hasServiceRoleKey, supabaseAdmin } from './server/lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from './server/middleware/requireAuth';
import { requireRole } from './server/middleware/requireRole';
import { aiLimiter, authLimiter, globalLimiter } from './server/middleware/rateLimit';
import { validateBody } from './server/middleware/validate';
import { apiNotFoundHandler, errorHandler } from './server/middleware/errorHandler';
import { generateDeterministicSabiId } from './server/utils/sabiId';
import {
  chatSchema,
  explainSchema,
  generateQuestionSchema,
  loginSchema,
  onboardingSchema,
  progressSchema,
  registerSchema,
  resetPasswordConfirmSchema,
  resetPasswordRequestSchema,
  verifyAccountSchema,
} from './server/validation/schemas';

const app = express();
const PORT = config.port;

// Vercel and other reverse proxies terminate TLS in front of the API. Trusting
// exactly one hop lets rate limiting see the real client IP.
app.set('trust proxy', 1);

// Do not advertise the framework.
app.disable('x-powered-by');

app.use(
  helmet({
    // The SPA relies on inline styles, Google Fonts and remote mascot SVGs, so a
    // strict Content-Security-Policy would break the app. A full CSP lands in the
    // web-hardening phase; the remaining helmet defaults are safe today.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json({ limit: config.maxJsonBody }));

// CORS: an explicit allow-list (local development, the Capacitor Android WebView
// and any origin configured through ALLOWED_ORIGINS) instead of a wildcard.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = isOriginAllowed(origin);

  if (allowed) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.header('Access-Control-Max-Age', '600');
  }

  if (req.method === 'OPTIONS') {
    res.sendStatus(allowed ? 204 : 403);
    return;
  }

  next();
});

// Global throttle for the entire API surface.
app.use('/api', globalLimiter);



// Deterministic Unique SABI ID generation lives in ./server/utils/sabiId.ts so it
// can be unit tested; it is imported above.

// Initialize Gemini SDK with telemetry header requested in the skill guide
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn('Warning: GEMINI_API_KEY is not defined in the environment. AI Tutor features will run in mock mode.');
}

// Helper to invoke AI with a safe timeout
async function callAiWithTimeout<T>(promise: Promise<T>, timeoutMs = 8000): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('AI response timed out')), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

// PHASE 0 (defect B2): the 2.5s "verification guardian" that confirmed EVERY
// pending Supabase user in the project has been removed. It turned account
// verification into a no-op and made every RLS/role check meaningless.
// Account confirmation now happens only through POST /api/auth/verify, which is
// authenticated and can only ever confirm the caller's own account.

// -------------------------------------------------------------
// API Endpoints: Auth, Unique SABI ID & Supabase Profile Sync
// -------------------------------------------------------------

// 0a. Register a candidate.
//     Phase 0 (defects B1/B4): the client can no longer supply `authUserId`, and
//     an existing account can never have its password rewritten by a stranger who
//     merely knows the email address. Instant confirmation is gated by
//     config.instantVerify so Phase 1 can swap in a real OTP flow.
app.post('/api/auth/register', authLimiter, validateBody(registerSchema), async (req, res) => {
  try {
    const { fullName, email, password, phone, stateOfOrigin, provider = 'email' } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Look up an existing SABI profile for this address.
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const uniqueId =
      existingProfile?.sabi_unique_id || generateDeterministicSabiId(normalizedEmail);

    // 2. Create the Supabase Auth user. A caller-supplied user id is never trusted.
    let userId: string | undefined = existingProfile?.id;

    if (!userId) {
      const { data: authData, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password: String(password),
        email_confirm: config.instantVerify,
        user_metadata: {
          full_name: fullName || '',
          phone: phone || '',
          state_of_origin: stateOfOrigin || 'Lagos',
          sabi_unique_id: uniqueId,
          email_verified: config.instantVerify,
          issuer: 'SABI',
        },
      });

      if (authData?.user?.id) {
        userId = authData.user.id;
      } else if (createErr) {
        const reason = String(createErr.message || '').toLowerCase();
        const alreadyRegistered =
          reason.includes('already') || reason.includes('exists') || reason.includes('registered');

        if (alreadyRegistered) {
          // Never touch the credentials of an account we did not just create.
          return res.status(409).json({
            error: `An account with ${normalizedEmail} is already registered (Unique ID: ${uniqueId}). Please Sign In or use Forgot Password.`,
            sabi_unique_id: uniqueId,
          });
        }

        return res.status(400).json({
          error: createErr.message || 'Failed to create the candidate account in Supabase Auth.',
        });
      }
    }

    if (!userId) {
      return res.status(500).json({ error: 'Supabase Auth did not return a valid user ID.' });
    }

    // 3. Upsert the candidate profile, keyed to the auth user id (service role only).
    const updatedProviders = Array.from(
      new Set([...(existingProfile?.auth_providers || []), provider, 'email'])
    );

    const { data: savedProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: normalizedEmail,
          sabi_unique_id: uniqueId,
          full_name: fullName || existingProfile?.full_name || '',
          phone: phone || existingProfile?.phone || '',
          state_of_origin: stateOfOrigin || existingProfile?.state_of_origin || 'Lagos',
          auth_providers: updatedProviders,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'email' }
      )
      .select('*')
      .single();

    if (profileErr || !savedProfile) {
      return res.status(500).json({
        error: profileErr?.message || 'Failed to save the candidate profile in Supabase.',
      });
    }

    return res.json({
      status: 'created',
      verified: config.instantVerify,
      auth_user_id: userId,
      profile: savedProfile,
      sabi_unique_id: savedProfile.sabi_unique_id,
      requires_email_verification: !config.instantVerify,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Account registration failed on the server.',
    });
  }
});

// 0a-1. Confirm the caller's own account (defect B1/B2).
//       Requires a valid Supabase access token and can only ever affect the
//       authenticated user. An `email` in the body is cross-checked against the
//       token and rejected when it names somebody else.
app.post('/api/auth/verify', authLimiter, requireAuth, validateBody(verifyAccountSchema), async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user!;
  const { email, uniqueId, authProviders } = req.body;

  if (email && String(email).trim().toLowerCase() !== user.email) {
    return res.status(403).json({
      verified: false,
      error: 'You can only verify your own SABI account.',
    });
  }

  try {
    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile && user.email) {
      const { data: byEmail } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();
      profile = byEmail;
    }

    const resolvedUniqueId =
      profile?.sabi_unique_id || generateDeterministicSabiId(user.email || email || '');

    if (config.instantVerify) {
      const { error: confirmErr } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
        email_confirm: true,
        user_metadata: {
          sabi_unique_id: resolvedUniqueId,
          email_verified: true,
          issuer: 'SABI',
        },
      });

      if (confirmErr) {
        return res.status(500).json({
          verified: false,
          error: confirmErr.message || 'Could not confirm the SABI account.',
        });
      }
    }

    if (!profile) {
      const metadata = user.metadata || {};
      const { data: upserted } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || email,
            sabi_unique_id: uniqueId || resolvedUniqueId,
            full_name: metadata.full_name || metadata.name || '',
            phone: metadata.phone || user.phone || '',
            state_of_origin: metadata.state_of_origin || 'Lagos',
            auth_providers:
              authProviders ??
              (metadata.provider ? ['email', String(metadata.provider)] : ['email']),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('*')
        .maybeSingle();
      profile = upserted;
    } else if (authProviders) {
      // Merge newly linked providers (e.g. Google -> email) without ever
      // letting the client write identity columns itself.
      const mergedProviders = Array.from(
        new Set([...(profile.auth_providers || ['email']), ...authProviders])
      );
      const { data: updated } = await supabaseAdmin
        .from('profiles')
        .update({ auth_providers: mergedProviders, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select('*')
        .maybeSingle();
      if (updated) profile = updated;
    }

    return res.json({
      verified: true,
      email_verified: config.instantVerify,
      auth_user_id: user.id,
      sabi_unique_id: profile?.sabi_unique_id || resolvedUniqueId,
      profile,
    });
  } catch (err: any) {
    return res.status(500).json({
      verified: false,
      error: err?.message || 'Verification failed.',
    });
  }
});

// 0a-2. Sign in a candidate (email or phone + password).
//       Session tokens are issued by Supabase on the client; this endpoint only
//       resolves the profile and reports the result.
app.post('/api/auth/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  try {
    const { identifier, password, method = 'email' } = req.body;
    const cleanIdentifier = String(identifier).trim().toLowerCase();

    // 1. Resolve the profile by email or phone.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or(
        method === 'phone' || !cleanIdentifier.includes('@')
          ? `phone.eq.${cleanIdentifier},email.eq.${cleanIdentifier}`
          : `email.eq.${cleanIdentifier}`
      )
      .maybeSingle();

    const targetEmail = profile?.email || (cleanIdentifier.includes('@') ? cleanIdentifier : '');
    if (!targetEmail) {
      return res.status(404).json({
        error:
          'No SABI account found with that phone number. Please Create an Account first or sign in with your registered email.',
      });
    }

    // 2. Verify the password against Supabase Auth.
    let { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
      email: targetEmail,
      password: String(password),
    });

    // 3. Accounts created before Phase 0 may still be unconfirmed. Only when the
    //    instant-verify product flag is on do we confirm them after a successful
    //    password sign-in (never for an anonymous caller).
    if (
      signInErr &&
      (signInErr.message || '').toLowerCase().includes('email not confirmed') &&
      config.instantVerify &&
      hasServiceRoleKey
    ) {
      const confirmUserId = profile?.id;
      if (confirmUserId) {
        await supabaseAdmin.auth.admin.updateUserById(confirmUserId, { email_confirm: true });
        const retryResult = await supabaseAdmin.auth.signInWithPassword({
          email: targetEmail,
          password: String(password),
        });
        signInData = retryResult.data;
        signInErr = retryResult.error;
      }
    }

    if (signInErr || !signInData?.user) {
      const notConfirmed = (signInErr?.message || '').toLowerCase().includes('email not confirmed');
      if (notConfirmed) {
        return res.status(403).json({
          error:
            'Your email address has not been confirmed yet. Check your inbox for the SABI verification link, then sign in again.',
          requires_email_verification: true,
        });
      }
      return res.status(401).json({
        error:
          'Incorrect email or password. If you forgot your password, use "Forgot Password" to receive a 6-digit recovery code.',
      });
    }

    // 4. Ensure the profile row is linked to the authenticated user id.
    let finalProfile = profile;
    if (!finalProfile || !finalProfile.id) {
      const fallbackId = finalProfile?.sabi_unique_id || generateDeterministicSabiId(targetEmail);
      const { data: syncedProfile } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: signInData.user.id,
            email: targetEmail,
            sabi_unique_id: fallbackId,
            full_name: finalProfile?.full_name || signInData.user.user_metadata?.full_name || 'Candidate',
            phone: finalProfile?.phone || signInData.user.user_metadata?.phone || '',
            state_of_origin: finalProfile?.state_of_origin || signInData.user.user_metadata?.state_of_origin || 'Lagos',
            auth_providers: finalProfile?.auth_providers || ['email'],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('*')
        .single();
      finalProfile = syncedProfile || finalProfile;
    }

    return res.json({
      status: 'authenticated',
      verified: true,
      auth_user_id: signInData.user.id,
      profile: finalProfile,
      sabi_unique_id: finalProfile?.sabi_unique_id || generateDeterministicSabiId(targetEmail),
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Sign in failed.' });
  }
});

// 0b. Password recovery step 1: send a 6-digit recovery code.
//     Phase 0 (defect B5): the previous flow let anyone reset a password with the
//     public 5-character SABI ID, which was also printed on screen and enumerable.
//     The response is intentionally identical whether or not the account exists.
app.post(
  '/api/auth/reset-password/request',
  authLimiter,
  validateBody(resetPasswordRequestSchema),
  async (req, res) => {
      const genericResponse = {
        status: 'sent',
        message:
          'If a SABI account matches those details, a 6-digit recovery code has been emailed to it.',
      };

      try {
        const cleanIdentifier = String(req.body.identifier).trim().toLowerCase();
        let targetEmail = cleanIdentifier.includes('@') ? cleanIdentifier : '';

        if (!targetEmail) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('phone', cleanIdentifier)
            .maybeSingle();
          targetEmail = String(profile?.email || '').toLowerCase();
        }

        if (targetEmail && targetEmail.includes('@')) {
          const { error } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
            redirectTo: process.env.SABI_APP_URL || undefined,
          });
          if (error) {
            // Logged, never surfaced: the response must not reveal account existence.
            console.warn('[SABI] Recovery email dispatch failed:', error.message);
          }
        }
      } catch (err: any) {
        console.warn('[SABI] Recovery request failed:', err?.message || err);
      }

      return res.json(genericResponse);
    }
  );

  // 0b-2. Password recovery step 2: exchange the emailed code for a new password.
  app.post(
    '/api/auth/reset-password/confirm',
    authLimiter,
    validateBody(resetPasswordConfirmSchema),
    async (req, res) => {
      const { email, otp, newPassword } = req.body;

      try {
        const { data: verifyData, error: verifyErr } = await supabaseAdmin.auth.verifyOtp({
          email: String(email).trim().toLowerCase(),
          token: String(otp),
          type: 'recovery',
        });

        if (verifyErr || !verifyData?.user?.id) {
          return res.status(400).json({
            verified: false,
            error: 'That recovery code is invalid or has expired. Please request a new code.',
          });
        }

        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
          verifyData.user.id,
          { password: String(newPassword) }
        );

        if (updateErr) {
          return res.status(500).json({
            verified: false,
            error: 'Could not update the password. Please request a new code and try again.',
          });
        }

        return res.json({
          verified: true,
          message: 'Password updated. You can now sign in with your new password.',
        });
      } catch (err: any) {
        return res.status(500).json({
          verified: false,
          error: err?.message || 'Could not process the password reset.',
        });
      }
    }
  );

  // 0b-3. The Unique-SABI-ID recovery endpoint is retired (defect B5).
  //       Kept as an explicit 410 so out-of-date installed apps fail loudly.
  app.post('/api/auth/reset-password', (_req, res) => {
    res.status(410).json({
      verified: false,
      error:
        'This recovery method has been retired for security reasons. Update the SABI app and use "Forgot Password" to receive a 6-digit recovery code.',
    });
  });

  // 0c. Save the 10-question onboarding diagnostic for the authenticated candidate.
  //     Phase 0 (defect B1): the row is addressed by the verified auth user id,
  //     never by an email supplied in the request body.
  app.post('/api/profile/onboarding', requireAuth, validateBody(onboardingSchema), async (req, res) => {
    const user = (req as AuthenticatedRequest).user!;
    const { onboardingAnswers, registeredSubjects, targetScore } = req.body;

    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_answers: onboardingAnswers ?? {},
          registered_subjects:
            registeredSubjects ?? ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
          target_score: Number(targetScore) || 320,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return res.status(500).json({ error: error.message || 'Failed to save onboarding answers.' });
      }

      return res.json({ status: 'saved' });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save onboarding answers.' });
    }
  });

  // 0d. Sync real candidate progress (diamond balance starts at 0) to Supabase.
  app.post('/api/profile/progress', requireAuth, validateBody(progressSchema), async (req, res) => {
    const user = (req as AuthenticatedRequest).user!;
    const { progress } = req.body;

    try {
      const { data: existing } = await supabaseAdmin
        .from('profiles')
        .select('onboarding_answers')
        .eq('id', user.id)
        .maybeSingle();

      const mergedAnswers = {
        ...(existing?.onboarding_answers || {}),
        live_progress: progress,
      };

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          onboarding_answers: mergedAnswers,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        return res.json({ status: 'synced_locally' });
      }

      return res.json({ status: 'synced' });
    } catch {
      return res.json({ status: 'synced_locally' });
    }
  });

  // 1. Get seed questions (public, static payload: safe to cache).
  app.get('/api/questions', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ status: 'success', questions: SEED_QUESTIONS });
  });

  // 2. Explain a question on-demand (API proxy to protect key)
  app.post('/api/explain', aiLimiter, requireAuth, validateBody(explainSchema), async (req, res) => {
    const { questionId, preference, language, userCustomPrompt, subject, topic } = req.body;
    const question = SEED_QUESTIONS.find(q => q.id === questionId);
  
    if (!question && !userCustomPrompt) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Choose the best pre-written explanation if it matches preference, otherwise ask AI
    if (!ai) {
      const mockExp = question
        ? (language === 'pidgin' ? question.explanation_pidgin : (preference === 'short' ? question.explanation_short : question.explanation))
        : `Here is the key breakdown for ${topic || subject || 'this topic'}: Focus on the core definitions, formulas, and common exam traps in the JAMB syllabus.`;
      return res.json({ explanation: mockExp, isMock: true });
    }

    try {
      const prompt = question
        ? `
        You are Sabi AI Tutor, Nigeria's premiere JAMB preparation instructor.
        Explain and verify this UTME question in detail:
        Subject: ${question.subject} (${question.topic})
        Question: ${question.question}
        Options: A) ${question.options.A}, B) ${question.options.B}, C) ${question.options.C}, D) ${question.options.D}
        Correct Answer: Option ${question.answer}
        Our database worked solution: ${question.explanation}
        ${userCustomPrompt ? `\nStudent's specific verification question: "${userCustomPrompt}"\nPlease directly answer the student's question while verifying why Option ${question.answer} is correct.` : ''}
      
        The student has specific preferences:
        - Explanation length/detail: ${preference === 'short' ? 'Concise/Short summary' : 'Step-by-step detailed breakdown'}
        - Language: ${language === 'pidgin' ? 'West African Pidgin English (e.g. "for this question, you go find...")' : language === 'mixed' ? 'Nigerian English mixed with light Pidgin vibes' : 'Plain formal English'}
      
        Generate a warm, encouraging, and accurate study explanation reflecting these precise stylistic guidelines. Format equations as LaTeX enclosed in $ signs (e.g. $x^2 + 5x + 6$).
      `
        : `
        You are Sabi AI Tutor, Nigeria's premiere JAMB preparation instructor.
        The student asks: "${userCustomPrompt}"
        Subject: ${subject || 'JAMB Prep'}
        Topic: ${topic || 'General Practice'}
      
        Provide a clear, pedagogical, step-by-step explanation suitable for a Nigerian UTME candidate. Format equations in LaTeX using single $ delimiters.
      `;

      const response = await callAiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            temperature: 0.7,
          }
        }),
        8000
      );

      res.json({ explanation: response.text || (question ? question.explanation : 'Review the core definitions and formulas for this topic.') });
    } catch (error: any) {
      console.warn('Fallback: Error generating explanation:', error?.message || error);
      const fallbackExp = question
        ? (language === 'pidgin' ? question.explanation_pidgin : (preference === 'short' ? question.explanation_short : question.explanation))
        : `Here is the key concept to remember for ${topic || subject || 'your JAMB exam'}: Focus on the fundamental definitions and standard UTME question patterns. Practice with step-by-step calculations and verify each option systematically.`;
      res.json({ explanation: fallbackExp });
    }
  });

  // 3. AI Smart Tutor Open Chat (Ask Me Anything) with RAG and 3-Tier memory updates
  //    Phase 0 (defect B7): authenticated + throttled + schema-validated, so the
  //    Gemini key cannot be drained by anonymous callers.
  app.post('/api/chat', aiLimiter, requireAuth, validateBody(chatSchema), async (req, res) => {
    const { messages, currentTopic, currentSubject, studentProfile, topicMemory } = req.body;

    // Simple RAG implementation: search locally mapped concept notes or seed questions
    let retrievedContext = '';
    if (currentSubject) {
      const relatedQuestions = SEED_QUESTIONS.filter(
        q => q.subject.toLowerCase() === currentSubject.toLowerCase() &&
             (!currentTopic || q.topic.toLowerCase().includes(currentTopic.toLowerCase()))
      ).slice(0, 2);
      if (relatedQuestions.length > 0) {
        retrievedContext = `Syllabus Exemplars: ` + relatedQuestions.map(q => `[${q.topic} - ${q.subtopic}]: ${q.question} (Key concept: ${q.concepts.join(', ')})`).join('; ');
      }
    }

    const lastUserMsg = (messages || []).slice().reverse().find((m: any) => m.sender === 'user' || m.role === 'user')?.text || '';

    if (!ai) {
      return res.json({
        reply: `Sabi Tutor: You are asking about "${currentTopic || currentSubject || 'your studies'}". Key syllabus takeaway: Ensure you master the underlying definitions, formulas, and past questions for ${currentTopic || 'this topic'}. Keep up the great practice!`,
        topicMemoryUpdate: `User practiced ${currentTopic || currentSubject || 'JAMB topics'}.`,
        isMock: true
      });
    }

    const systemInstruction = `
      You are Sabi AI Tutor, the highly intelligent, friendly, and expert Nigerian JAMB tutor.
      Your mission is to guide students to achieve high scores (300+) in the Unified Tertiary Matriculation Examination (UTME).
    
      You have direct access to three layers of student context:
      1. Student Profile (Tier 1 - Permanent):
         - Name: ${studentProfile?.name || 'Student'}
         - Class Level: ${studentProfile?.classLevel || 'Senior Candidate'}
         - 4 Chosen Subjects: ${studentProfile?.chosenSubjects?.join(', ') || 'JAMB Subjects'}
         - Target Course & University: ${studentProfile?.targetCourse || 'Medicine'} at ${studentProfile?.targetUniversity || 'University'}
         - Explanation preference: ${studentProfile?.explanationPreference === 'short' ? 'Brief and straight to the point' : 'Detailed step-by-step'}
         - Language preference: ${studentProfile?.languagePreference || 'english'}
         - Motivation: ${studentProfile?.motivation || 'General excellence'}
       
      2. Topic Summary Memory (Tier 2):
         - Existing rolling memory about the topic "${currentTopic || 'General studies'}": "${topicMemory || 'No prior conversation summary has been recorded for this topic yet.'}"
       
      3. Grounding Knowledge Base (RAG context):
         - ${retrievedContext || 'Rely on official JAMB syllabus principles.'}
       
      Behavioral Directives:
      - Never give answers immediately on a platter of gold. Ask scaffolding, thought-provoking questions if they seem stuck.
      - Reference their target course/university or mock performance naturally.
      - Be warm, extremely knowledgeable about the JAMB syllabus, and maintain steady, high-morale guidance.
    
      Return your outputs strictly as a JSON object adhering to this schema:
      {
        "reply": "tutor's message supporting the user, with helpful hints/feedback or explanations, structured in markdown with equations formatted as LaTeX enclosed in $ signs (e.g. $x^2 + 5x + 6$)",
        "topicMemoryUpdate": "re-written, updated single-paragraph rolling summary of the user's progress, strengths, and remaining weak concepts in this specific topic."
      }
    `;

    try {
      // Format conversation history and ensure it begins with a user message
      let rawHistory = (messages || [])
        .filter((m: any) => m && (m.text || m.content))
        .slice(-6)
        .map((m: any) => ({
          role: ((m.sender === 'user' || m.role === 'user') ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: String(m.text || m.content) }]
        }));

      // CRITICAL: Gemini requires the first turn in contents to have role: 'user'
      while (rawHistory.length > 0 && rawHistory[0].role !== 'user') {
        rawHistory.shift();
      }

      if (rawHistory.length === 0) {
        rawHistory = [{
          role: 'user',
          parts: [{ text: lastUserMsg || `Explain the core concepts for ${currentTopic || currentSubject || 'this topic'}.` }]
        }];
      }

      const response = await callAiWithTimeout(
        ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: rawHistory,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { 
                  type: Type.STRING, 
                  description: 'The supportive conversational reply to the student.' 
                },
                topicMemoryUpdate: { 
                  type: Type.STRING, 
                  description: 'The updated rolling summary of what the student understands or struggles with in this topic, to be stored for subsequent turns.' 
                }
              },
              required: ['reply', 'topicMemoryUpdate']
            },
            temperature: 0.7,
          }
        }),
        8000
      );

      const parsed = JSON.parse(response.text?.trim() || '{}');
      res.json({
        reply: parsed.reply || "Let's keep our momentum going! Ask me anything about your syllabus or practice questions.",
        topicMemoryUpdate: parsed.topicMemoryUpdate || topicMemory
      });
    } catch (error: any) {
      console.warn('Fallback: Error in AI Tutor chat endpoint:', error?.message || error);
      // Graceful pedagogical fallback so user never gets stuck or sees an error
      const friendlyReply = currentTopic
        ? `Under **${currentTopic}** (${currentSubject || 'JAMB'}), key rules to always remember include knowing the fundamental definitions, the working formulas, and identifying the trap options JAMB frequently sets. What specific sub-question or calculation are you currently tackling?`
        : `I am right here with you! Let us keep our focus sharp on mastering your 4 JAMB subjects. What topic or concept would you like us to break down next?`;
      res.json({
        reply: friendlyReply,
        topicMemoryUpdate: topicMemory || `Practiced ${currentTopic || 'JAMB concepts'}.`,
      });
    }
  });

  // 4. Pipeline 5: AI-generated question drafts (question pool expansion for weak topics).
  //    Phase 0: AI output is never auto-published. It is returned with
  //    status 'draft' and only CONTENT_MANAGER / ADMIN / MASTER_ADMIN may request it.
  app.post(
    '/api/generate-question',
    aiLimiter,
    requireAuth,
    requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'),
    validateBody(generateQuestionSchema),
    async (req, res) => {
    const { subject, topic, subtopic } = req.body;

    if (!ai) {
      // Generate a simulated question if AI is not connected
      const randId = `AI-GEN-${Math.floor(1000 + Math.random() * 9000)}`;
      const mockQuestion: Question = {
        id: randId,
        exam_type: 'AI-Generated',
        subject: subject || 'Mathematics',
        topic: topic || 'Algebra',
        subtopic: subtopic || 'General Practice',
        year: new Date().getFullYear(),
        question: `Determine the sum of the roots of a simulated quadratic equation $2x^2 - 12x + 10 = 0$.`,
        options: {
          A: '6',
          B: '5',
          C: '-6',
          D: '12'
        },
        answer: 'A',
        explanation: 'For any quadratic equation $ax^2 + bx + c = 0$, the sum of roots is given by $-b/a$.\nHere, $a = 2$, $b = -12$, and $c = 10$.\nSum of roots = $-(-12) / 2 = 12 / 2 = 6$.',
        explanation_short: 'The sum of roots is $-b/a = -(-12)/2 = 6$.',
        explanation_pidgin: 'To find sum of roots, use the formula $-b/a$. Our b na -12, and a na 2. So $-(-12)/2 = 6$. No shaking!',
        difficulty: 'medium',
        concepts: ['roots of quadratic', 'sum of roots'],
        source: 'Sabi AI Pipeline 5',
        status: 'ai-draft',
        confidence_score: 0.95,
        created_at: new Date().toISOString()
      };
      return res.json({ question: mockQuestion, isMock: true, requires_review: true });
    }

    const existingSubset = SEED_QUESTIONS.filter(q => q.subject === subject && q.topic === topic).slice(0, 2);
    const sampleData = existingSubset.length > 0
      ? `Here are examples of existing verified questions of this type:\n${JSON.stringify(existingSubset)}`
      : `Ensure the style matches official JAMB multiple-choice question format.`;

    const instructionPrompt = `
      You are an AI-powered JAMB question-generation engine (Sabi Pipeline 5).
      Your task is to generate a new, high-quality, syllabus-aligned multiple choice question for:
      Subject: ${subject}
      Topic: ${topic}
      Subtopic: ${subtopic}
    
      ${sampleData}
    
      Stricter Rules:
      - Solve and review the question yourself to ensure exactly ONE option is correctly mathematical aligned.
      - Write a detailed step-by-step worked explanation, a concise short summary explanation, and an encouraging West African Pidgin English explanation.
      - Set difficulty to 'easy', 'medium', or 'hard' depending on the concept's cognitive depth.
      - Use appropriate LaTeX notation for math/technical symbols wrapped inside single $ signs (e.g., $x^2 + 5x + 6$). Make sure it parses beautifully.
    
      Structure the response strictly as a JSON object matching this schema:
      {
        "question": {
          "id": "A unique alpha-numeric string, e.g. MTH-ALG-2026-X",
          "exam_type": "AI-Generated",
          "subject": "${subject}",
          "topic": "${topic}",
          "subtopic": "${subtopic}",
          "year": 2026,
          "question": "The question text, styled elegantly with LaTeX math",
          "options": {
            "A": "Option text A",
            "B": "Option text B",
            "C": "Option text C",
            "D": "Option text D"
          },
          "answer": "A, B, C, or D (strictly the correct option)",
          "explanation": "Clear double-pass verified step-by-step worked solution",
          "explanation_short": "Brief, concise summary solution",
          "explanation_pidgin": "Laidback Nigerian Pidgin solution starting warmly and keeping the logic super plain",
          "difficulty": "easy, medium, or hard",
          "concepts": ["analytical concepts"],
          "common_wrong_answer": "Why students usually fail this and which option represents that trap"
        }
      }
    `;

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: instructionPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.8,
        }
      });

      const parsed = JSON.parse(response.text?.trim() || '{}');
      const questionObj = parsed.question;
    
      if (questionObj) {
        // AI output is a DRAFT. A human (CONTENT_MANAGER / ADMIN) must verify it
        // before it can be shown to candidates as a graded question.
        questionObj.status = 'ai-draft';
        questionObj.review_required = true;
        questionObj.confidence_score = 0.94;
        questionObj.source = 'AI Pipeline 5';
        questionObj.created_at = new Date().toISOString();
        res.json({ question: questionObj, requires_review: true });
      } else {
        throw new Error('Could not parse question object from AI response.');
      }
    } catch (error: any) {
      console.error('Error generating AI question:', error);
      // Return a robust backup question
      res.status(500).json({ error: 'AI generation failed', message: error.message });
    }
  }
);

// -------------------------------------------------------------
// API fallbacks: JSON 404s for unknown API routes, then structured errors.
// Mounted before Vite/static so `/api/*` never falls through to the SPA shell.
// -------------------------------------------------------------
app.use(apiNotFoundHandler);
app.use(errorHandler);

// -------------------------------------------------------------
// Vite and Static Assets Orchestration
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sabi Server] Running on http://localhost:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export { app };
