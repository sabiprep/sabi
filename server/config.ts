/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Central server configuration.
 *
 * Phase 0 (security-first) rules enforced here:
 *  - No hard-coded Supabase URL, anon JWT or service-role key anywhere in the repo.
 *  - The service-role key is mandatory for the API to boot outside of tests.
 *  - CORS is served from an explicit allow-list instead of a wildcard.
 */

import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';

export const isProduction = nodeEnv === 'production';
export const isTest = nodeEnv === 'test';

function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
}

export const SUPABASE_URL = normalizeSupabaseUrl(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
);

export const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  ''
).trim();

function positiveInt(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const config = {
  port: positiveInt(process.env.PORT, 3000),
  nodeEnv,
  isProduction,
  isTest,

  /**
   * SABI currently confirms a candidate account on the server immediately after
   * sign-up (no email round-trip). That behaviour is now self-scoped and gated by
   * this flag so it can be replaced by a real OTP / email-link flow in Phase 1
   * without another refactor. Set SABI_INSTANT_VERIFY=false to disable it.
   */
  instantVerify: process.env.SABI_INSTANT_VERIFY !== 'false',

  /** Comma separated extra origins (production web app, preview URLs, ...). */
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  maxJsonBody: process.env.MAX_JSON_BODY || '256kb',

  rateLimitWindowMs: positiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  rateLimitMax: positiveInt(process.env.RATE_LIMIT_MAX, 120),
  authRateLimitMax: positiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
  aiRateLimitMax: positiveInt(process.env.AI_RATE_LIMIT_MAX, 20),
} as const;

/**
 * Origins that are always trusted: local development, the Capacitor Android
 * WebView (capacitor://localhost and https://localhost) and the iOS scheme.
 */
export const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:4173',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'capacitor://localhost',
  'https://localhost',
  'ionic://localhost',
];

/**
 * Returns true when a browser Origin header may be echoed back in
 * Access-Control-Allow-Origin. Requests without an Origin (native fetch,
 * server-to-server, same-origin navigation) are always allowed.
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;
  const allowList = [...DEFAULT_ALLOWED_ORIGINS, ...config.allowedOrigins];
  if (allowList.includes(origin)) return true;
  // Vercel deployments/previews of the SABI project itself.
  if (/^https:\/\/sabi[a-z0-9-]*\.vercel\.app$/i.test(origin)) return true;
  return false;
}
