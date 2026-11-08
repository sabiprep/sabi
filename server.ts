/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import { SEED_QUESTIONS } from './src/data/questions.ts';
import { config, isOriginAllowed, SUPABASE_URL } from './server/config';
import { hasServiceRoleKey, MISSING_CONFIG_VARIABLES, SUPABASE_ADMIN_ERROR, supabaseAdmin } from './server/lib/supabaseAdmin';
import { requireAuth, type AuthenticatedRequest } from './server/middleware/requireAuth';
import { requireRole } from './server/middleware/requireRole';
import { aiLimiter, authLimiter, globalLimiter } from './server/middleware/rateLimit';
import { validateBody } from './server/middleware/validate';
import { apiNotFoundHandler, errorHandler } from './server/middleware/errorHandler';
import { configurationGuard } from './server/middleware/configurationGuard';
import learningRouter from './server/learning/routes';
import aiRouter from './server/ai/routes';
import knowledgeRouter from './server/ai/knowledgeRoutes';
import paymentRouter from './server/billing/routes';
import notificationRouter from './server/notifications/routes';
import gamificationRouter from './server/gamification/routes';
import { generateAIText, getAIReadiness } from './server/ai/gateway';
import { recordAIUsage, refundAIRequestCredits, reserveAIRequestCredits } from './server/ai/usage';
import { AIUnavailableError } from './server/ai/types';
import { buildAnswerSignalObservations, buildMasterySignalObservation } from './server/learning/signalWorker';
import { executeEngineRequest } from './server/learning/engineExecution';
import { generateDeterministicSabiId } from './server/utils/sabiId';
import {
  generateQuestionSchema,
  loginSchema,
  onboardingSchema,
  progressCheckinSchema,
  learningEventsSchema,
  progressSchema,
  registerSchema,
  resetPasswordConfirmSchema,
  resetPasswordRequestSchema,
  verifyAccountSchema,
} from './server/validation/schemas';

const app = express();
const PORT = config.port;

/**
 * Names the host running this process so `/api/health` can tell a developer
 * whether they reached the Vercel function or a local server.
 */
function runtimeLabel(): string {
  if (process.env.VERCEL) return 'vercel-function';
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return 'aws-lambda';
  if (process.env.NETLIFY) return 'netlify-function';
  if (config.isTest) return 'test';
  return 'node-server';
}

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

app.use(express.json({
  limit: config.maxJsonBody,
  verify: (req, _res, buffer) => { (req as any).rawBody = Buffer.from(buffer); },
}));

// CORS: an explicit allow-list (local development, the Capacitor Android WebView
// and any origin configured through ALLOWED_ORIGINS / SABI_APP_URL) instead of a
// wildcard. Requests served by this very process are always same-origin-allowed.
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const selfOrigin = `${req.protocol}://${req.headers.host || ''}`;
  const isSameOrigin = Boolean(origin) && origin === selfOrigin;
  const allowed = isOriginAllowed(origin) || isSameOrigin;

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
    if (!allowed) {
      res.status(403).json({
        error: `Origin ${origin} is not allowed to call the SABI API. Add it to ALLOWED_ORIGINS.`,
      });
      return;
    }
    res.sendStatus(204);
    return;
  }

  // Fail closed on a cross-origin call we do not trust: never run a route (and
  // never touch Supabase) for it, and make the misconfiguration visible in logs.
  // Without this, the browser reports a bare "network error" and the UI can only
  // say "check your internet connection".
  if (origin && !allowed) {
    console.warn(
      `[SABI] Blocked request from disallowed origin "${origin}". ` +
        `Add it to ALLOWED_ORIGINS (comma separated) or set SABI_APP_URL to the deployed app origin.`
    );
    res.status(403).json({
      error: `Origin ${origin} is not allowed to call the SABI API. Add it to ALLOWED_ORIGINS.`,
    });
    return;
  }

  next();
});

// Global throttle for the entire API surface.
app.use('/api', globalLimiter);
// Refuse privileged API work when Supabase server credentials are missing.
// Mounted at the app root so the middleware sees the full /api/... request path.
app.use(configurationGuard);
app.use('/api/learning', learningRouter);
app.use('/api/ai', aiRouter);
app.use('/api/ai/knowledge', knowledgeRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/internal/notifications', notificationRouter);
app.use('/api/gamification', gamificationRouter);



// Deterministic Unique SABI ID generation lives in ./server/utils/sabiId.ts so it
// can be unit tested; it is imported above.

// All model calls are routed through the provider-independent Sabi AI gateway.

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
    const { data: existingProfile, error: profileLookupError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileLookupError) {
      console.error('[SABI] Registration profile lookup failed:', profileLookupError.message);
      return res.status(503).json({ error: 'Registration is temporarily unavailable. Please try again.' });
    }

    // An existing profile is not proof that this caller owns its Auth identity.
    // Never reuse its ID, mutate its profile, or return its private fields from
    // this public endpoint. Account linking must happen through an authenticated flow.
    if (existingProfile) {
      return res.status(409).json({
        error: 'An account with this email is already registered. Please sign in or use Forgot Password.',
      });
    }

    const uniqueId = generateDeterministicSabiId(normalizedEmail);

    // 2. Create the Supabase Auth user. A caller-supplied user id is never trusted.
    let userId: string | undefined;

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
            error: 'An account with this email is already registered. Please sign in or use Forgot Password.',
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
    const updatedProviders = Array.from(new Set([provider, 'email']));

    const { data: savedProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: userId,
          email: normalizedEmail,
          sabi_unique_id: uniqueId,
          full_name: fullName || '',
          phone: phone || '',
          state_of_origin: stateOfOrigin || 'Lagos',
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
  const { email } = req.body;

  if (email && String(email).trim().toLowerCase() !== user.email) {
    return res.status(403).json({
      verified: false,
      error: 'You can only verify your own SABI account.',
    });
  }

  try {
    const { data: profileById, error: profileByIdError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (profileByIdError) {
      console.error('[SABI] Verification profile lookup failed:', profileByIdError.message);
      return res.status(503).json({
        verified: false,
        error: 'Profile verification is temporarily unavailable. Please try again.',
      });
    }

    let profile = profileById;
    if (!profile && user.email) {
      const { data: byEmail, error: emailLookupError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', user.email)
        .maybeSingle();

      if (emailLookupError) {
        console.error('[SABI] Verification profile lookup failed:', emailLookupError.message);
        return res.status(503).json({
          verified: false,
          error: 'Profile verification is temporarily unavailable. Please try again.',
        });
      }

      // A matching email is not sufficient to take over a profile linked to a
      // different Auth user. Legacy mismatches require a separately verified
      // support/reconciliation flow; never return or mutate that profile here.
      if (byEmail && byEmail.id !== user.id) {
        return res.status(409).json({
          verified: false,
          error: 'This email is linked to a different SABI profile. Contact support to reconcile your account.',
        });
      }
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
      const { data: upserted, error: upsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || email,
            sabi_unique_id: resolvedUniqueId,
            full_name: metadata.full_name || metadata.name || '',
            phone: metadata.phone || user.phone || '',
            state_of_origin: metadata.state_of_origin || 'Lagos',
            auth_providers: user.providers.length ? user.providers : ['email'],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'email' }
        )
        .select('*')
        .maybeSingle();
      if (upsertError || !upserted) {
        console.error('[SABI] Verification profile creation failed:', upsertError?.message || 'No profile returned');
        return res.status(503).json({ verified: false, error: 'Profile verification is temporarily unavailable. Please try again.' });
      }
      profile = upserted;
    } else if (user.providers.length) {
      // Provider metadata comes from the verified Auth user, never the request body.
      const mergedProviders = Array.from(
        new Set([...(profile.auth_providers || ['email']), ...user.providers])
      );
      const { data: updated, error: providerUpdateError } = await supabaseAdmin
        .from('profiles')
        .update({ auth_providers: mergedProviders, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select('*')
        .maybeSingle();
      if (providerUpdateError || !updated) {
        console.error('[SABI] Verification provider sync failed:', providerUpdateError?.message || 'No profile returned');
        return res.status(503).json({ verified: false, error: 'Profile verification is temporarily unavailable. Please try again.' });
      }
      profile = updated;
    }

    if (!profile) {
      return res.status(503).json({ verified: false, error: 'Profile verification is temporarily unavailable. Please try again.' });
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
    const { data: profile, error: profileLookupError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .or(
        method === 'phone' || !cleanIdentifier.includes('@')
          ? `phone.eq.${cleanIdentifier},email.eq.${cleanIdentifier}`
          : `email.eq.${cleanIdentifier}`
      )
      .maybeSingle();

    if (profileLookupError) {
      console.error('[SABI] Login profile lookup failed:', profileLookupError.message);
      return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again.' });
    }

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
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(confirmUserId, { email_confirm: true });
        if (confirmError) {
          console.error('[SABI] Legacy account confirmation failed:', confirmError.message);
          return res.status(503).json({ error: 'Sign-in is temporarily unavailable. Please try again.' });
        }
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

    // Never return a profile row unless it belongs to the Auth identity
    // that just passed password verification. Email/phone lookup alone is
    // not proof that two legacy identity records are the same account.
    if (profile && profile.id !== signInData.user.id) {
      return res.status(409).json({
        error: 'Your sign-in identity and SABI profile need reconciliation. Please contact support.',
      });
    }

    // 4. Ensure the profile row is linked to the authenticated user id.
    let finalProfile = profile;
    if (!finalProfile || !finalProfile.id) {
      const fallbackId = finalProfile?.sabi_unique_id || generateDeterministicSabiId(targetEmail);
      const { data: syncedProfile, error: syncError } = await supabaseAdmin
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
      if (syncError || !syncedProfile) {
        console.error('[SABI] Login profile synchronization failed:', syncError?.message || 'No profile returned');
        return res.status(503).json({ error: 'Your account profile could not be synchronized. Please try again.' });
      }
      finalProfile = syncedProfile;
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
    const { onboardingAnswers, registeredSubjects, targetScore, submissionKey } = req.body;
    // onboardingSchema normalizes either the current API field or the legacy
    // onboardingAnswers.chosenSubjects field into this canonical array.
    const canonicalSubjects = registeredSubjects;
    // Keep the legacy onboarding_answers snapshot aligned with the canonical
    // server-validated profile field. Downstream clients still read chosenSubjects.
    const normalizedAnswers = {
      ...(onboardingAnswers ?? {}),
      chosenSubjects: canonicalSubjects,
    };
    const stableSubmissionKey = submissionKey || randomUUID();

    try {
      const { data: questionSet, error: questionSetError } = await supabaseAdmin
        .from('student_onboarding_question_sets')
        .select('id')
        .eq('set_key', 'candidate-onboarding')
        .single();
      if (questionSetError || !questionSet?.id) {
        return res.status(500).json({ error: 'The versioned onboarding question set is not available.' });
      }

      const { data: questionVersion, error: versionError } = await supabaseAdmin
        .from('student_onboarding_question_versions')
        .select('id')
        .eq('question_set_id', questionSet.id)
        .eq('version_label', 'v2')
        .single();
      if (versionError || !questionVersion?.id) {
        return res.status(500).json({ error: 'The active onboarding question version is not available.' });
      }

      const { data: existingSubmission, error: existingError } = await supabaseAdmin
        .from('student_onboarding_submissions')
        .select('id')
        .eq('user_id', user.id)
        .eq('submission_key', stableSubmissionKey)
        .maybeSingle();
      if (existingError) {
        return res.status(500).json({ error: existingError.message || 'Could not check the onboarding submission.' });
      }

      let submissionId = existingSubmission?.id as string | undefined;
      if (!submissionId) {
        const { data: createdSubmission, error: submissionError } = await supabaseAdmin
          .from('student_onboarding_submissions')
          .insert({
            user_id: user.id,
            question_version_id: questionVersion.id,
            submission_key: stableSubmissionKey,
            submission_status: 'submitted',
            capture_source: 'in_app',
            // No optional analytics/research consent is inferred from onboarding completion.
            purpose_consent_snapshot: {},
          })
          .select('id')
          .single();

        if (submissionError || !createdSubmission?.id) {
          // A concurrent retry may have won the unique (user_id, submission_key) race.
          const { data: racedSubmission } = await supabaseAdmin
            .from('student_onboarding_submissions')
            .select('id')
            .eq('user_id', user.id)
            .eq('submission_key', stableSubmissionKey)
            .maybeSingle();
          if (!racedSubmission?.id) {
            return res.status(500).json({ error: submissionError?.message || 'Could not create the onboarding submission.' });
          }
          submissionId = racedSubmission.id;
        } else {
          submissionId = createdSubmission.id;
        }
      }

      const { data: questionDefinitions, error: questionsError } = await supabaseAdmin
        .from('student_onboarding_questions')
        .select('id, question_key')
        .eq('question_version_id', questionVersion.id);
      if (questionsError) {
        return res.status(500).json({ error: questionsError.message || 'Could not load onboarding question definitions.' });
      }

      if (!submissionId) {
        return res.status(500).json({ error: 'Could not resolve the onboarding submission record.' });
      }

      const questionIds = new Map<string, string>((questionDefinitions ?? []).map((item: { id: string; question_key: string }) => [item.question_key, item.id] as const));
      const responseRows = Object.entries(normalizedAnswers).map(([questionKey, answerValue]) => ({
        submission_id: submissionId,
        question_id: questionIds.get(questionKey) ?? null,
        question_key: questionKey,
        answer_value: answerValue,
        answer_text: typeof answerValue === 'string' ? answerValue : null,
        capture_source: 'in_app',
      }));

      if (responseRows.length > 0) {
        const { data: storedResponses, error: storedResponsesError } = await supabaseAdmin
          .from('student_onboarding_responses')
          .select('question_key, answer_value')
          .eq('submission_id', submissionId);
        if (storedResponsesError) {
          return res.status(500).json({ error: storedResponsesError.message || 'Could not verify the existing onboarding submission.' });
        }
        const canonicalJson = (value: any): string => JSON.stringify(
          value && typeof value === 'object' && !Array.isArray(value)
            ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, JSON.parse(canonicalJson(value[key]))]))
            : Array.isArray(value) ? value.map((item) => JSON.parse(canonicalJson(item))) : value
        );
        const incomingKeys = new Set(responseRows.map((row) => row.question_key));
        if ((storedResponses ?? []).some((row: { question_key: string }) => !incomingKeys.has(row.question_key))) {
          return res.status(409).json({ error: 'This onboarding submission key has already been used for a different answer set. Start a new submission.' });
        }
        const storedByKey = new Map((storedResponses ?? []).map((row: { question_key: string; answer_value: unknown }) => [row.question_key, row.answer_value]));
        for (const row of responseRows) {
          if (storedByKey.has(row.question_key) && canonicalJson(storedByKey.get(row.question_key)) !== canonicalJson(row.answer_value)) {
            return res.status(409).json({ error: 'This onboarding submission key has already been used with different answers. Start a new submission.' });
          }
        }
        const { error: responseError } = await supabaseAdmin
          .from('student_onboarding_responses')
          .upsert(responseRows, { onConflict: 'submission_id,question_key', ignoreDuplicates: true });
        if (responseError) {
          return res.status(500).json({ error: responseError.message || 'Could not preserve onboarding responses.' });
        }
      }

      if (typeof normalizedAnswers.motivation === 'string' && normalizedAnswers.motivation.trim()) {
        const { error: motivationSignalError } = await supabaseAdmin
          .from('student_signal_observations')
          .upsert({
            user_id: user.id,
            signal_key: 'student.motivation',
            schema_version: 1,
            source_key: 'onboarding-v2',
            value: normalizedAnswers.motivation.trim(),
            confidence: 1,
            purpose_key: 'personalized_learning',
            provenance: { submission_id: submissionId, question_key: 'motivation', method: 'student_self_report' },
            observed_at: new Date().toISOString(),
            idempotency_key: `onboarding:${submissionId}:motivation`,
          }, { onConflict: 'user_id,idempotency_key', ignoreDuplicates: true });
        if (motivationSignalError) {
          return res.status(500).json({ error: motivationSignalError.message || 'Could not register the motivation signal.' });
        }
      }

      const { error: normalizedProfileError } = await supabaseAdmin.rpc('save_student_onboarding_profile', {
        p_user_id: user.id,
        p_exam_year: new Date().getFullYear(),
        p_registered_subjects: canonicalSubjects,
        p_target_score: targetScore ?? 320,
        p_answers: normalizedAnswers,
      });
      if (normalizedProfileError) {
        return res.status(500).json({ error: normalizedProfileError.message || 'Could not save the normalized academic profile.' });
      }

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          onboarding_completed: true,
          onboarding_answers: normalizedAnswers,
          registered_subjects: canonicalSubjects,
          target_score: targetScore ?? 320,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        return res.status(500).json({ error: profileError.message || 'Failed to save onboarding profile.' });
      }

      return res.json({ status: 'saved', submissionId });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to save onboarding answers.' });
    }
  });

  // Voluntary learner check-ins are written atomically with normalized signals.
  app.post('/api/profile/checkin', requireAuth, validateBody(progressCheckinSchema), async (req, res) => {
    const user = (req as AuthenticatedRequest).user!;
    const { submissionKey, confidenceScore, motivationScore, perceivedBarriers, reflectionText } = req.body;
    try {
      const { data: checkinId, error } = await supabaseAdmin.rpc('record_student_progress_checkin', {
        p_user_id: user.id,
        p_submission_key: submissionKey,
        p_confidence_score: confidenceScore ?? null,
        p_motivation_score: motivationScore ?? null,
        p_perceived_barriers: perceivedBarriers ?? [],
        p_reflection_text: reflectionText ?? null,
      });
      if (error || !checkinId) {
        return res.status(500).json({ error: error?.message || 'Could not save the learning check-in.' });
      }
      return res.json({ status: 'saved', checkinId });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Could not save the learning check-in.' });
    }
  });

  // Internal worker: recover expired leases, convert server-verified learning
  // evidence into versioned signals, then fan out signal observations to engines.
  app.post('/api/internal/dispatch-signals', async (req, res) => {
    const configuredSecret = process.env.SIGNAL_WORKER_SECRET;
    if (!configuredSecret) {
      return res.status(503).json({ error: 'Signal worker is not configured.' });
    }
    const supplied = Buffer.from(req.header('authorization') || '');
    const expected = Buffer.from(`Bearer ${configuredSecret}`);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }

    try {
      const now = new Date();
      const staleLeaseBefore = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
      const { error: leaseRecoveryError } = await supabaseAdmin
        .from('signal_processing_outbox')
        .update({
          processing_status: 'failed',
          available_at: now.toISOString(),
          locked_at: null,
          last_error_code: 'stale_processing_lease_recovered',
        })
        .eq('processing_status', 'processing')
        .lt('locked_at', staleLeaseBefore);
      if (leaseRecoveryError) {
        console.error('[SABI] Signal worker lease recovery failed:', leaseRecoveryError.message);
        return res.status(500).json({ error: 'Could not recover stale signal processing work.' });
      }

      let learningEventsProcessed = 0;
      let learningEventsFailed = 0;
      const { data: pendingEvents, error: pendingEventsError } = await supabaseAdmin
        .from('signal_processing_outbox')
        .select('id, user_id, payload, attempt_count')
        .eq('event_kind', 'learning_event_received')
        .in('processing_status', ['pending', 'failed'])
        .lte('available_at', now.toISOString())
        .order('created_at', { ascending: true })
        .limit(10);
      if (pendingEventsError) throw pendingEventsError;

      for (const item of pendingEvents || []) {
        const attemptCount = Number(item.attempt_count || 0) + 1;
        const { data: claimedItem, error: claimEventError } = await supabaseAdmin
          .from('signal_processing_outbox')
          .update({
            processing_status: 'processing',
            attempt_count: attemptCount,
            locked_at: new Date().toISOString(),
          })
          .eq('id', item.id)
          .in('processing_status', ['pending', 'failed'])
          .select('id')
          .maybeSingle();
        if (claimEventError) throw claimEventError;
        if (!claimedItem) continue;

        try {
          const learningEventId = String(item.payload?.learning_event_id || '');
          if (!learningEventId || !item.user_id) {
            throw new Error('Learning event outbox payload is incomplete.');
          }
          const { data: learningEvent, error: learningEventError } = await supabaseAdmin
            .from('learning_events')
            .select('id, user_id, event_type, occurred_at, received_at, session_id, session_item_id, question_id')
            .eq('id', learningEventId)
            .eq('user_id', item.user_id)
            .maybeSingle();
          if (learningEventError) throw learningEventError;
          if (!learningEvent) throw new Error('Referenced learning event was not found.');

          // The client event only signals that an answer was submitted. Correctness
          // and elapsed time are read from server-written session item records.
          if (learningEvent.event_type === 'answer_submitted') {
            const { data: samples, error: samplesError } = await supabaseAdmin
              .from('learning_session_items')
              .select('is_correct, elapsed_ms')
              .eq('user_id', item.user_id)
              .not('answered_at', 'is', null)
              .lte('answered_at', learningEvent.received_at)
              .order('answered_at', { ascending: false })
              .limit(20);
            if (samplesError) throw samplesError;

            const observations = buildAnswerSignalObservations({
              userId: item.user_id,
              eventId: learningEvent.id,
              observedAt: learningEvent.occurred_at,
              samples: samples || [],
            });

            // Phase 2's answer RPC remains authoritative for mastery and review
            // scheduling. Mirror its current topic projection into the universal
            // signal layer so subscribed engines receive the same verified state.
            let answeredItemQuery = supabaseAdmin
              .from('learning_session_items')
              .select('question_id')
              .eq('user_id', item.user_id)
              .eq('session_id', learningEvent.session_id)
              .not('answered_at', 'is', null);
            answeredItemQuery = learningEvent.session_item_id
              ? answeredItemQuery.eq('id', learningEvent.session_item_id)
              : answeredItemQuery.eq('question_id', learningEvent.question_id || '');
            const { data: answeredItem, error: answeredItemError } = await answeredItemQuery.maybeSingle();
            if (answeredItemError) throw answeredItemError;

            if (answeredItem?.question_id) {
              const { data: question, error: questionError } = await supabaseAdmin
                .from('question_bank')
                .select('subject, topic')
                .eq('id', answeredItem.question_id)
                .maybeSingle();
              if (questionError) throw questionError;

              if (question?.subject && question?.topic) {
                const { data: mastery, error: masteryError } = await supabaseAdmin
                  .from('student_topic_mastery')
                  .select('mastery_score, attempted_count')
                  .eq('user_id', item.user_id)
                  .eq('subject', question.subject)
                  .eq('topic', question.topic)
                  .maybeSingle();
                if (masteryError) throw masteryError;
                if (mastery) {
                  observations.push(buildMasterySignalObservation({
                    userId: item.user_id,
                    eventId: learningEvent.id,
                    observedAt: learningEvent.occurred_at,
                    subject: question.subject,
                    topic: question.topic,
                    masteryScore: Number(mastery.mastery_score),
                    attemptedCount: Number(mastery.attempted_count),
                  }));
                }
              }
            }

            if (observations.length) {
              const { error: observationError } = await supabaseAdmin
                .from('student_signal_observations')
                .upsert(observations, {
                  onConflict: 'user_id,idempotency_key',
                  ignoreDuplicates: true,
                });
              if (observationError) throw observationError;
            }
          }

          const { error: completeEventError } = await supabaseAdmin
            .from('signal_processing_outbox')
            .update({
              processing_status: 'completed',
              completed_at: new Date().toISOString(),
              locked_at: null,
              last_error_code: null,
            })
            .eq('id', item.id)
            .eq('processing_status', 'processing');
          if (completeEventError) throw completeEventError;
          learningEventsProcessed += 1;
        } catch (error) {
          const isDeadLetter = attemptCount >= 8;
          const retryDelaySeconds = Math.min(30 * (2 ** Math.max(0, attemptCount - 1)), 3600);
          const { error: retryError } = await supabaseAdmin
            .from('signal_processing_outbox')
            .update({
              processing_status: isDeadLetter ? 'dead_letter' : 'failed',
              available_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
              locked_at: null,
              last_error_code: 'learning_event_signal_processing_failed',
            })
            .eq('id', item.id)
            .eq('processing_status', 'processing');
          if (retryError) console.error('[SABI] Learning event retry scheduling failed:', retryError.message);
          console.error('[SABI] Learning event signal processing failed:', error);
          learningEventsFailed += 1;
        }
      }

      const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_signal_outbox', { p_limit: 10 });
      if (claimError) return res.status(500).json({ error: 'Could not claim signal processing work.' });

      let completed = 0;
      let failed = 0;
      let engineRequestsCreated = 0;
      for (const item of claimed ?? []) {
        try {
          if (item.event_kind !== 'signal_observed' || !item.observation_id) {
            throw new Error('Unsupported outbox event for this dispatcher.');
          }
          const { data: createdCount, error: dispatchError } = await supabaseAdmin.rpc(
            'dispatch_signal_observation_to_engines',
            { p_observation_id: item.observation_id }
          );
          if (dispatchError) throw dispatchError;

          const { error: completeError } = await supabaseAdmin
            .from('signal_processing_outbox')
            .update({ processing_status: 'completed', completed_at: new Date().toISOString(), locked_at: null, last_error_code: null })
            .eq('id', item.id)
            .eq('processing_status', 'processing');
          if (completeError) throw completeError;
          completed += 1;
          engineRequestsCreated += Number(createdCount || 0);
        } catch {
          const attemptCount = Number(item.attempt_count || 1);
          const isDeadLetter = attemptCount >= 8;
          const retryDelaySeconds = Math.min(30 * (2 ** Math.max(0, attemptCount - 1)), 3600);
          await supabaseAdmin
            .from('signal_processing_outbox')
            .update({
              processing_status: isDeadLetter ? 'dead_letter' : 'failed',
              available_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
              locked_at: null,
              last_error_code: 'signal_dispatch_failed',
            })
            .eq('id', item.id)
            .eq('processing_status', 'processing');
          failed += 1;
        }
      }

      // Execute engine requests created by the versioned signal subscriptions.
      // Each request is claimed with a conditional status update so concurrent
      // invocations cannot run the same job at the same time.
      let engineRequestsProcessed = 0;
      let engineRequestsFailed = 0;
      const { data: pendingEngineJobs, error: pendingEngineJobsError } = await supabaseAdmin
        .from('signal_processing_outbox')
        .select('id, user_id, engine_key, payload, idempotency_key, attempt_count')
        .eq('event_kind', 'engine_requested')
        .in('processing_status', ['pending', 'failed'])
        .lte('available_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(10);
      if (pendingEngineJobsError) throw pendingEngineJobsError;

      for (const job of pendingEngineJobs || []) {
        const attemptCount = Number(job.attempt_count || 0) + 1;
        const { data: claimedJob, error: claimJobError } = await supabaseAdmin
          .from('signal_processing_outbox')
          .update({
            processing_status: 'processing',
            attempt_count: attemptCount,
            locked_at: new Date().toISOString(),
          })
          .eq('id', job.id)
          .in('processing_status', ['pending', 'failed'])
          .select('id')
          .maybeSingle();
        if (claimJobError) throw claimJobError;
        if (!claimedJob) continue;

        try {
          if (!job.user_id || !job.engine_key) throw new Error('engine_request_payload_incomplete');
          await executeEngineRequest(supabaseAdmin, {
            id: job.id,
            user_id: job.user_id,
            engine_key: job.engine_key,
            payload: job.payload || {},
            idempotency_key: job.idempotency_key,
            attempt_count: attemptCount,
          });
          const { error: completeJobError } = await supabaseAdmin
            .from('signal_processing_outbox')
            .update({
              processing_status: 'completed',
              completed_at: new Date().toISOString(),
              locked_at: null,
              last_error_code: null,
            })
            .eq('id', job.id)
            .eq('processing_status', 'processing');
          if (completeJobError) throw completeJobError;
          engineRequestsProcessed += 1;
        } catch (error) {
          const isDeadLetter = attemptCount >= 8;
          const retryDelaySeconds = Math.min(30 * (2 ** Math.max(0, attemptCount - 1)), 3600);
          const { error: runFailureError } = await supabaseAdmin
            .from('engine_runs')
            .update({ run_status: 'failed', error_code: 'engine_execution_failed' })
            .eq('engine_key', job.engine_key)
            .eq('idempotency_key', job.idempotency_key)
            .eq('run_status', 'running');
          if (runFailureError) console.error('[SABI] Engine run failure state update failed:', runFailureError.message);
          const { error: retryJobError } = await supabaseAdmin
            .from('signal_processing_outbox')
            .update({
              processing_status: isDeadLetter ? 'dead_letter' : 'failed',
              available_at: new Date(Date.now() + retryDelaySeconds * 1000).toISOString(),
              locked_at: null,
              last_error_code: 'engine_execution_failed',
            })
            .eq('id', job.id)
            .eq('processing_status', 'processing');
          if (retryJobError) console.error('[SABI] Engine request retry scheduling failed:', retryJobError.message);
          console.error('[SABI] Engine request execution failed:', job.engine_key, error);
          engineRequestsFailed += 1;
        }
      }

      const { count: pendingEngineRequests } = await supabaseAdmin
        .from('signal_processing_outbox')
        .select('id', { count: 'exact', head: true })
        .eq('event_kind', 'engine_requested')
        .in('processing_status', ['pending', 'failed']);
      return res.json({
        status: 'processed',
        learningEventsProcessed,
        learningEventsFailed,
        signalObservationsClaimed: (claimed ?? []).length,
        signalObservationsCompleted: completed,
        signalObservationsFailed: failed,
        engineRequestsCreated,
        engineRequestsProcessed,
        engineRequestsFailed,
        pendingEngineRequests: pendingEngineRequests || 0,
      });
    } catch (error) {
      console.error('[SABI] Signal worker failed:', error);
      return res.status(500).json({ error: 'Signal processing failed.' });
    }
  });

  // Append-only client telemetry. Every referenced session/item is checked against
  // the authenticated learner before service-role persistence.
  app.post('/api/learning/events', requireAuth, validateBody(learningEventsSchema), async (req, res) => {
    const user = (req as AuthenticatedRequest).user!;
    const events = req.body.events as Array<{ sessionId: string; sessionItemId?: string; questionId?: string; clientEventId: string; eventType: string; sequenceNo?: number; elapsedMs?: number; activeElapsedMs?: number; eventPayload: Record<string, unknown>; occurredAt: string }>;
    try {
      const sessionIds: string[] = [...new Set<string>(events.map((event) => event.sessionId))];
      const { data: ownedSessions, error: sessionsError } = await supabaseAdmin
        .from('learning_sessions')
        .select('id')
        .eq('user_id', user.id)
        .in('id', sessionIds);
      if (sessionsError) return res.status(500).json({ error: sessionsError.message || 'Could not validate learning sessions.' });
      const ownedSessionIds = new Set((ownedSessions ?? []).map((session: { id: string }) => session.id));
      if (sessionIds.some((id) => !ownedSessionIds.has(id))) {
        return res.status(403).json({ error: 'One or more learning sessions do not belong to this account.' });
      }

      const itemIds: string[] = [...new Set(events.map((event) => event.sessionItemId).filter((id): id is string => Boolean(id)))];
      const itemById = new Map<string, { id: string; session_id: string; question_id: string }>();
      if (itemIds.length) {
        const { data: ownedItems, error: itemsError } = await supabaseAdmin
          .from('learning_session_items')
          .select('id, session_id, question_id')
          .eq('user_id', user.id)
          .in('id', itemIds);
        if (itemsError) return res.status(500).json({ error: itemsError.message || 'Could not validate learning session items.' });
        for (const item of ownedItems ?? []) itemById.set(item.id, item);
        if (itemIds.some((id) => !itemById.has(id))) {
          return res.status(403).json({ error: 'One or more learning items do not belong to this account.' });
        }
        if (events.some((event: any) => event.sessionItemId && itemById.get(event.sessionItemId)?.session_id !== event.sessionId)) {
          return res.status(400).json({ error: 'A learning item does not belong to the supplied session.' });
        }
        if (events.some((event: any) => event.sessionItemId && event.questionId && itemById.get(event.sessionItemId)?.question_id !== event.questionId)) {
          return res.status(400).json({ error: 'A question does not match the supplied learning item.' });
        }
      }

      const rows = events.map((event) => ({
        user_id: user.id,
        session_id: event.sessionId,
        session_item_id: event.sessionItemId ?? null,
        question_id: event.questionId ?? (event.sessionItemId ? itemById.get(event.sessionItemId)?.question_id : null) ?? null,
        client_event_id: event.clientEventId,
        event_type: event.eventType,
        sequence_no: event.sequenceNo ?? null,
        elapsed_ms: event.elapsedMs ?? null,
        active_elapsed_ms: event.activeElapsedMs ?? null,
        event_payload: event.eventPayload ?? {},
        occurred_at: event.occurredAt,
        schema_version: 1,
      }));
      const { error: insertError } = await supabaseAdmin
        .from('learning_events')
        .upsert(rows, { onConflict: 'user_id,client_event_id', ignoreDuplicates: true });
      if (insertError) return res.status(500).json({ error: insertError.message || 'Could not save learning events.' });
      return res.json({ status: 'accepted', received: rows.length });
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'Could not save learning events.' });
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

  // 0. Deployment self-check. Exposes only booleans (never a secret) so a
  //    developer can confirm which build is live and whether the server is
  //    configured — the fastest way to diagnose "sign-up fails on the deployed app".
  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({
      status: 'ok',
      phase: 'phase0',
      timestamp: new Date().toISOString(),
      runtime: runtimeLabel(),
      supabase_url_configured: Boolean(SUPABASE_URL),
      service_role_configured: hasServiceRoleKey,
      admin_configured: SUPABASE_ADMIN_ERROR === null,
      configuration_error: SUPABASE_ADMIN_ERROR,
      missing_variables: MISSING_CONFIG_VARIABLES,
      instant_verify: config.instantVerify,
      ai_configured: Boolean(process.env.GEMINI_API_KEY),
      extra_cors_origins: config.allowedOrigins.length,
    });
  });

  // 1. Get seed questions (public, static payload: safe to cache).
  app.get('/api/questions', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ status: 'success', questions: SEED_QUESTIONS });
  });

  // Legacy unscoped explanation endpoint is closed. Explanations must be tied
  // to an owned, answered session through /api/ai/explanations.
  app.post('/api/explain', aiLimiter, requireAuth, (_req, res) => {
    return res.status(410).json({
      error: 'This explanation endpoint has been replaced by the session-verified AI endpoint.',
      code: 'AI_ENDPOINT_REPLACED',
      endpoint: '/api/ai/explanations',
    });
  });

  // Legacy chat endpoint now directs clients to the provider-independent gateway.
  app.post('/api/chat', aiLimiter, requireAuth, (_req, res) => {
    return res.status(410).json({
      error: 'This chat endpoint has been replaced by the Sabi AI gateway.',
      code: 'AI_ENDPOINT_REPLACED',
      endpoint: '/api/ai/chat',
    });
  });

  // AI-generated question content is persisted as an unpublished draft.
  // Human review is mandatory before it can enter student-facing selection.
  app.post(
    '/api/generate-question',
    aiLimiter,
    requireAuth,
    requireRole('CONTENT_MANAGER', 'ADMIN', 'MASTER_ADMIN'),
    validateBody(generateQuestionSchema),
    async (req, res) => {
      const { subject, topic, subtopic } = req.body;
      const contentCreatorId = (req as any).user?.id as string | undefined;
      if (!contentCreatorId) return res.status(401).json({ error: 'Authentication required.' });
      let aiRequestId: string | null = null;
      let reservedCreditCost = 0;
      let aiUsageRecorded = false;
      aiRequestId = randomUUID();
      const readiness = getAIReadiness('content_draft');
      if (!readiness.enabled || readiness.configuredProviders.length === 0) {
        await recordAIUsage(supabaseAdmin, {
          userId: contentCreatorId, task: 'content_draft', provider: 'none', model: 'none',
          outcome: 'blocked', promptVersion: 'question-draft-v1', requestId: aiRequestId,
          metadata: { reason: readiness.enabled ? 'AI_PROVIDER_NOT_CONFIGURED' : 'AI_DISABLED' },
        });
        return res.status(503).json({
          error: 'AI question drafting is not configured.',
          code: readiness.enabled ? 'AI_PROVIDER_NOT_CONFIGURED' : 'AI_DISABLED',
        });
      }

      const { data: approvedExamples, error: exampleError } = await supabaseAdmin
        .from('question_bank')
        .select('question, option_a, option_b, option_c, option_d, explanation_short')
        .eq('status', 'published')
        .eq('subject', subject)
        .eq('topic', topic)
        .limit(2);
      if (exampleError) {
        console.error('[SABI AI] Approved drafting examples could not be loaded:', exampleError.message);
        return res.status(503).json({ error: 'Approved question context is temporarily unavailable.' });
      }
      const examples = (approvedExamples || []).map((item) => ({
        question: item.question,
        options: { A: item.option_a, B: item.option_b, C: item.option_c, D: item.option_d },
        explanation: item.explanation_short,
      }));
      const prompt = [
        'Create one original UTME multiple-choice question for the requested subject and syllabus topic.',
        `Subject: ${subject}`,
        `Topic: ${topic}`,
        `Subtopic: ${subtopic || 'Not specified'}`,
        `Approved style examples (not to be copied): ${JSON.stringify(examples)}`,
        'Return a single JSON object with question, options A-D, answer (A/B/C/D), explanation, explanation_short, explanation_pidgin, difficulty (easy/medium/hard), concepts (string array), and common_wrong_answer.',
        'Check the solution and ensure exactly one option is correct. Do not claim official provenance.',
      ].join('\n');

      const creditReservation = await reserveAIRequestCredits(supabaseAdmin, contentCreatorId, 'content_draft', aiRequestId);
      if (!creditReservation.allowed) {
        await recordAIUsage(supabaseAdmin, {
          userId: contentCreatorId, task: 'content_draft', provider: 'none', model: 'none',
          outcome: 'blocked', promptVersion: 'question-draft-v1', requestId: aiRequestId,
          metadata: { reason: creditReservation.reason },
        });
        return res.status(creditReservation.reason === 'insufficient_credits' ? 402 : 503).json({
          error: creditReservation.reason === 'insufficient_credits' ? 'AI credits are exhausted.' : 'AI credit pricing is not configured.',
          code: creditReservation.reason === 'insufficient_credits' ? 'AI_CREDITS_EXHAUSTED' : 'AI_CREDIT_PRICING_NOT_CONFIGURED',
        });
      }
      reservedCreditCost = creditReservation.creditCost;

      try {
        const aiStartedAt = Date.now();
        const generated = await generateAIText({
          task: 'content_draft',
          systemInstruction: 'You are a careful JAMB content drafting assistant. Your output is an unverified draft. Never claim human verification or official provenance.',
          prompt,
          temperature: 0.35,
          maxOutputTokens: 1500,
          timeoutMs: 12000,
        });
        await recordAIUsage(supabaseAdmin, {
          userId: contentCreatorId, task: 'content_draft',
          provider: generated.provider, model: generated.model, usage: generated.usage,
          outcome: 'success', promptVersion: 'question-draft-v1',
          durationMs: Date.now() - aiStartedAt, requestId: aiRequestId || undefined,
          creditCost: reservedCreditCost,
        });
        aiUsageRecorded = true;
        const raw = generated.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        const parsed = JSON.parse(raw);
        const draft = parsed.question || parsed;
        const options = draft.options || {};
        const answer = String(draft.answer || '').trim().toUpperCase();
        const requiredText = [draft.question, options.A, options.B, options.C, options.D, draft.explanation];
        if (!requiredText.every((value) => typeof value === 'string' && value.trim()) ||
            !['A', 'B', 'C', 'D'].includes(answer)) {
          return res.status(422).json({ error: 'The AI returned an incomplete draft. No question was saved.', code: 'AI_DRAFT_INVALID' });
        }

        const normalizedContent = [
          subject, topic, draft.question, options.A, options.B, options.C, options.D,
        ].map((value) => String(value || '').trim().toLowerCase()).join('|');
        const contentFingerprint = createHash('sha256').update(normalizedContent).digest('hex');
        const { data: duplicate, error: duplicateError } = await supabaseAdmin
          .from('question_bank')
          .select('id, status')
          .eq('content_fingerprint', contentFingerprint)
          .limit(1)
          .maybeSingle();
        if (duplicateError) {
          console.error('[SABI AI] Draft duplicate check failed:', duplicateError.message);
          return res.status(503).json({ error: 'The draft quality check is temporarily unavailable.' });
        }
        if (duplicate) {
          return res.status(409).json({
            error: 'A question with the same content already exists.',
            code: 'QUESTION_DUPLICATE',
            existingQuestionId: duplicate.id,
          });
        }

        let aiSourceId: string | null = null;
        const { data: existingSource, error: sourceLookupError } = await supabaseAdmin
          .from('question_sources')
          .select('id')
          .eq('source_key', 'sabi-ai-draft-generator')
          .maybeSingle();
        if (sourceLookupError) {
          console.error('[SABI AI] Draft provenance lookup failed:', sourceLookupError.message);
          return res.status(503).json({ error: 'Draft provenance could not be verified.' });
        }
        if (existingSource) {
          aiSourceId = existingSource.id;
        } else {
          const { data: createdSource, error: sourceCreateError } = await supabaseAdmin
            .from('question_sources')
            .insert({
              source_key: 'sabi-ai-draft-generator',
              source_name: 'Sabi AI Draft Generator',
              source_type: 'ai_generated',
              permitted_use: 'unknown',
              verification_status: 'unverified',
              notes: 'AI-generated draft source. Human academic review and source-use verification are required before publication.',
            })
            .select('id')
            .single();
          if (sourceCreateError || !createdSource) {
            console.error('[SABI AI] Draft provenance creation failed:', sourceCreateError?.message);
            return res.status(503).json({ error: 'Draft provenance could not be recorded.' });
          }
          aiSourceId = createdSource.id;
        }

        const questionId = `SABI-AI-${randomUUID()}`;
        const record = {
          id: questionId,
          exam_type: 'UTME',
          subject,
          topic,
          subtopic: subtopic || null,
          year: new Date().getFullYear(),
          question: String(draft.question).trim(),
          option_a: String(options.A).trim(),
          option_b: String(options.B).trim(),
          option_c: String(options.C).trim(),
          option_d: String(options.D).trim(),
          answer,
          explanation: String(draft.explanation).trim(),
          explanation_short: String(draft.explanation_short || '').trim() || null,
          difficulty: ['easy', 'medium', 'hard'].includes(String(draft.difficulty)) ? draft.difficulty : 'medium',
          concepts: Array.isArray(draft.concepts) ? draft.concepts.filter((value: unknown) => typeof value === 'string').slice(0, 20) : [],
          common_wrong_answer: typeof draft.common_wrong_answer === 'string' ? draft.common_wrong_answer : null,
          source: 'Sabi AI Draft Generator',
          source_id: aiSourceId,
          content_fingerprint: contentFingerprint,
          status: 'ai-draft',
          review_status: 'unreviewed',
          confidence_score: 0,
          verified_by: 'pending-human-review',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: saveError } = await supabaseAdmin.from('question_bank').insert(record);
        if (saveError) {
          console.error('[SABI AI] Could not persist generated draft:', saveError.message);
          return res.status(503).json({ error: 'The generated draft could not be saved for human review.' });
        }

        return res.status(201).json({
          question: {
            id: questionId, exam_type: 'UTME', subject, topic, subtopic: subtopic || null,
            year: record.year, question: record.question,
            options: { A: record.option_a, B: record.option_b, C: record.option_c, D: record.option_d },
            answer: record.answer, explanation: record.explanation,
            explanation_short: record.explanation_short, difficulty: record.difficulty,
            concepts: record.concepts, status: 'ai-draft',
          },
          requires_review: true,
          provider: generated.provider,
          model: generated.model,
        });
      } catch (error) {
        if (aiRequestId && reservedCreditCost > 0 && !aiUsageRecorded) {
          try { await refundAIRequestCredits(supabaseAdmin, contentCreatorId, aiRequestId, 'ai_question_draft_provider_or_accounting_failed'); }
          catch { return res.status(503).json({ error: 'AI credit recovery is temporarily unavailable.' }); }
        }
        if (error instanceof AIUnavailableError) {
          try {
            await recordAIUsage(supabaseAdmin, {
              userId: contentCreatorId, task: 'content_draft', provider: 'none', model: 'none',
              outcome: error.code === 'AI_PROVIDER_FAILED' ? 'provider_failed' : 'blocked',
              promptVersion: 'question-draft-v1', requestId: aiRequestId || undefined,
              metadata: { reason: error.code, providersTried: error.providersTried, refundedCredits: reservedCreditCost },
            });
          } catch {
            return res.status(503).json({ error: 'AI usage accounting is temporarily unavailable.' });
          }
        }
        console.error('[SABI AI] Question drafting failed:', error instanceof Error ? error.name : 'unknown_error');
        return res.status(503).json({ error: 'AI question drafting is temporarily unavailable.' });
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
    // Vite is only needed for local development. Keep it out of the serverless
    // production module graph so the API does not load Rollup's native binaries.
    const { createServer: createViteServer } = await import('vite');
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
