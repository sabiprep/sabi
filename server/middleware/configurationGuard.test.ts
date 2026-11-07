/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 0 regression tests for the "deployed without credentials" contract.
 *
 * Background: sign-up on the Vercel deployment answered
 * `HTTP 500: FUNCTION_INVOCATION_FAILED`. The API module threw while being
 * imported (missing SUPABASE_SERVICE_ROLE_KEY), so Vercel replaced the JSON body
 * with its own HTML error page. The fix is behavioural, not cosmetic: an
 * incomplete deployment must answer 503 JSON naming the missing variable, and the
 * boot path must never produce an unhandled import-time throw on a serverless
 * host.
 */

// Environment must be established before any module is imported.
process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

import { describe, expect, it } from 'vitest';
import { CONFIGURATION_STATUS, configurationResponse } from './configurationGuard';
import {
  MISSING_CONFIG_VARIABLES,
  SUPABASE_ADMIN_ERROR,
  hasServiceRoleKey,
} from '../lib/supabaseAdmin';

describe('configurationGuard decision', () => {
  it('stays out of the way when the deployment is complete', () => {
    expect(configurationResponse(null)).toBeNull();
  });

  it('reports a configured Supabase admin client in this environment', () => {
    expect(hasServiceRoleKey).toBe(true);
    expect(SUPABASE_ADMIN_ERROR).toBeNull();
  });

  it('answers 503 with a machine readable code instead of crashing the function', () => {
    const failure = configurationResponse(
      'SUPABASE_SERVICE_ROLE_KEY is not set.',
      'POST /api/auth/register'
    );

    expect(failure).not.toBeNull();
    expect(failure?.status).toBe(CONFIGURATION_STATUS);
    expect(failure?.status).toBe(503);
    expect(failure?.body.code).toBe('API_NOT_CONFIGURED');
  });

  it('names the missing variable and the route that was refused', () => {
    const failure = configurationResponse(
      'SUPABASE_SERVICE_ROLE_KEY is not set.',
      'POST /api/auth/register',
      ['SUPABASE_SERVICE_ROLE_KEY']
    );

    expect(failure?.body.missing).toEqual(['SUPABASE_SERVICE_ROLE_KEY']);
    expect(String(failure?.body.error)).toContain('POST /api/auth/register');
  });

  it('defaults to an empty missing list when nothing is passed', () => {
    const failure = configurationResponse('SUPABASE_SERVICE_ROLE_KEY is not set.');

    expect(failure?.body.missing).toEqual([]);
  });

  it('reports the variables this deployment is missing', () => {
    // The test environment sets both variables, so nothing is missing here; the
    // middleware passes MISSING_CONFIG_VARIABLES through to the response body.
    expect(MISSING_CONFIG_VARIABLES).toEqual([]);
  });

  it('tells the developer exactly where to set the variable', () => {
    const failure = configurationResponse('SUPABASE_URL (or VITE_SUPABASE_URL) is not set.');
    const fix = String(failure?.body.fix);

    expect(fix).toMatch(/Vercel/);
    expect(fix).toMatch(/Environment Variables/);
    expect(fix).toMatch(/redeploy/i);
    expect(fix).toMatch(/\/api\/health/);
  });

  it('never leaks a credential, only the name of the variable', () => {
    const serialized = JSON.stringify(
      configurationResponse('SUPABASE_SERVICE_ROLE_KEY is not set.')?.body
    );

    expect(serialized).not.toMatch(/test-service-role-key/);
    expect(serialized).not.toMatch(/eyJ/);
  });
});
