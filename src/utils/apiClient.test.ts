/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Unit tests for the API client's URL resolution and failure reporting.
 *
 * Regression guard: a failing sign-up used to render "please check your internet
 * connection" for every possible cause (unreachable host, CORS block, validation
 * error, HTML page from a static host). These tests pin down that the real reason
 * is always present in the message.
 */

import { describe, expect, it } from 'vitest';
import {
  describeApiFailure,
  isPreviewProxyHost,
  resolveApiUrl,
  type ApiResult,
} from './apiClient';

function result(overrides: Partial<ApiResult> = {}): ApiResult {
  return {
    ok: false,
    status: 500,
    data: null,
    contentType: 'application/json',
    snippet: '',
    url: 'https://api.sabi.example.com/api/auth/register',
    ...overrides,
  };
}

describe('resolveApiUrl', () => {
  it('prefixes relative API paths with the configured base', () => {
    expect(resolveApiUrl('/api/auth/register', 'https://api.sabi.example.com')).toBe(
      'https://api.sabi.example.com/api/auth/register'
    );
  });

  it('tolerates a trailing slash and a missing leading slash', () => {
    expect(resolveApiUrl('api/auth/register', 'https://api.sabi.example.com/')).toBe(
      'https://api.sabi.example.com/api/auth/register'
    );
  });

  it('leaves absolute URLs untouched', () => {
    expect(resolveApiUrl('https://other.example.com/api/x', 'https://api.sabi.example.com')).toBe(
      'https://other.example.com/api/x'
    );
  });

  it('keeps same-origin relative paths when no base is configured', () => {
    expect(resolveApiUrl('/api/auth/register', '')).toBe('/api/auth/register');
  });
});

describe('isPreviewProxyHost', () => {
  it('recognises AI Studio preview proxies', () => {
    expect(
      isPreviewProxyHost('https://ais-pre-hexoysblc7dzfjy3yyprez-26118416277.europe-west1.run.app')
    ).toBe(true);
    expect(
      isPreviewProxyHost('https://ais-dev-abc123def.europe-west1.run.app/api/health')
    ).toBe(true);
  });

  it('does not flag a real API, app host or relative path', () => {
    expect(isPreviewProxyHost('https://sabi-api-abc.europe-west1.run.app')).toBe(false);
    expect(isPreviewProxyHost('https://sabi.vercel.app')).toBe(false);
    expect(isPreviewProxyHost('/api/auth/register')).toBe(false);
    expect(isPreviewProxyHost('')).toBe(false);
  });
});

describe('describeApiFailure', () => {
  it('explains a transport failure with the URL it tried', () => {
    const message = describeApiFailure(
      result({ status: 0, contentType: '', networkError: 'Failed to fetch' }),
      'Could not create your account.'
    );

    expect(message).toContain('could not be reached');
    expect(message).toContain('https://api.sabi.example.com/api/auth/register');
    expect(message).toContain('Failed to fetch');
  });

  it('prefers the server error and appends validation details', () => {
    const message = describeApiFailure(
      result({
        status: 400,
        data: {
          error: 'Invalid request body.',
          details: [{ path: 'phone', message: 'Phone number is required.' }],
        },
      }),
      'Could not create your account.'
    );

    expect(message).toContain('Invalid request body.');
    expect(message).toContain('Phone number is required.');
  });

  it('calls out a hosting error page as a crashed API', () => {
    const message = describeApiFailure(
      result({ status: 502, contentType: 'text/html', snippet: '<!DOCTYPE html>' }),
      'Could not create your account.'
    );

    expect(message).toContain('HTTP 502');
    expect(message).toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY/i);
    expect(message).toContain('/api/health');
  });

  it('distinguishes an HTML page from a reachable API host', () => {
    const message = describeApiFailure(
      result({ status: 404, contentType: 'text/html', snippet: '<!DOCTYPE html>' }),
      'Could not create your account.'
    );

    expect(message).toContain('HTML page');
    expect(message).toContain('VITE_API_BASE_URL');
  });

  it('names an AI Studio preview proxy as the problem', () => {
    const message = describeApiFailure(
      result({
        status: 200,
        contentType: 'text/html',
        snippet: '<html><head><title>302 Found</title>',
        url: 'https://ais-pre-hexoysblc7dzfjy3yyprez-26118416277.europe-west1.run.app/api/auth/register',
      }),
      'Could not create your account.'
    );

    expect(message).toContain('preview proxy');
    expect(message).toContain('__cookie_check.html');
    expect(message).toContain('server.ts');
  });

  it('never loses the status code for an unexplained failure', () => {
    const message = describeApiFailure(result({ status: 418 }), 'Could not create your account.');

    expect(message).toContain('HTTP 418');
    expect(message).not.toMatch(/internet connection/i);
  });

  it('turns a misconfigured deployment into a candidate-safe message naming the variable', () => {
    const message = describeApiFailure(
      result({
        status: 503,
        contentType: 'application/json',
        data: {
          error: 'The SABI API is deployed without its Supabase credentials…',
          code: 'API_NOT_CONFIGURED',
          missing: ['SUPABASE_SERVICE_ROLE_KEY'],
          fix: 'Set it in Vercel and redeploy.',
        },
      }),
      'Could not create your account.'
    );

    expect(message).toContain('not fully configured');
    expect(message).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(message).toMatch(/deployment issue/);
    expect(message).toContain('/api/health');
    expect(message).not.toMatch(/internet connection/i);
  });

  it('explains a boot failure without exposing the hosting error page', () => {
    const message = describeApiFailure(
      result({
        status: 500,
        contentType: 'application/json',
        data: {
          error: 'The SABI API failed to start on this deployment…',
          code: 'API_BOOT_FAILED',
          detail: 'Cannot find package "vite" imported from server.ts',
          hint: 'Check SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.',
        },
      }),
      'Could not create your account.'
    );

    expect(message).toContain('failed to start');
    expect(message).toMatch(/deployment issue/);
    expect(message).toContain('[SABI]');
  });
});
