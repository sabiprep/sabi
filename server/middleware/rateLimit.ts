/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rate limiting (defect B7): the API previously had no throttling at all, so
 * the Gemini proxy and the auth endpoints could be hammered indefinitely.
 */

import { rateLimit } from 'express-rate-limit';
import { config } from '../config';

const sharedOptions = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
};

/** Broad protection for every API route. */
export const globalLimiter = rateLimit({
  ...sharedOptions,
  windowMs: config.rateLimitWindowMs,
  limit: config.rateLimitMax,
});

/** Stricter budget for credential endpoints (register, login, password reset). */
export const authLimiter = rateLimit({
  ...sharedOptions,
  windowMs: 15 * 60 * 1000,
  limit: config.authRateLimitMax,
});

/** Stricter budget for AI-backed endpoints (cost control). */
export const aiLimiter = rateLimit({
  ...sharedOptions,
  windowMs: config.rateLimitWindowMs,
  limit: config.aiRateLimitMax,
});
