/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * API-level security tests for the Phase 0 rewrite.
 *
 * These run against the real Express app (no network calls: every request below
 * is rejected before it can reach Supabase or Gemini) and lock in the properties
 * that matter most:
 *  - privileged routes require a bearer token (defect B1);
 *  - request bodies are schema-validated and cannot smuggle identity fields (B7);
 *  - CORS is an allow-list, not a wildcard;
 *  - the retired Unique-SABI-ID recovery endpoint stays retired (B5).
 */

// Environment must be established before the app module is imported.
process.env.NODE_ENV = 'test';
// Prevents server.ts from binding a port (supertest drives the app directly).
process.env.VERCEL = '1';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
// The deployed app origin must be trusted even when ALLOWED_ORIGINS is empty.
process.env.SABI_APP_URL = 'https://sabi-test-app.example.com';

import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: import('express').Express;
let supabaseAdminClient: typeof import('./lib/supabaseAdmin').supabaseAdmin;

beforeAll(async () => {
  const [server, admin] = await Promise.all([import('../server'), import('./lib/supabaseAdmin')]);
  app = server.app;
  supabaseAdminClient = admin.supabaseAdmin;
});

describe('authentication gate', () => {
  it('rejects /api/profile/progress without a token', async () => {
    const response = await request(app).post('/api/profile/progress').send({ progress: { streak: 1 } });

    expect(response.status).toBe(401);
    expect(response.body.error).toMatch(/authentication required/i);
  });

  it('rejects a fabricated identity in the body', async () => {
    const response = await request(app)
      .post('/api/profile/progress')
      .send({ progress: {}, email: 'victim@example.com' });

    expect(response.status).toBe(401);
  });

  it('rejects an unverifiable bearer token', async () => {
    const response = await request(app)
      .post('/api/profile/onboarding')
      .set('Authorization', 'Bearer not-a-real-jwt')
      .send({ onboardingAnswers: {} });

    expect(response.status).toBe(401);
  });

  it('protects the AI routes', async () => {
    await expect(request(app).post('/api/explain').send({ topic: 'Algebra' })).resolves.toMatchObject({
      status: 401,
    });
    await expect(request(app).post('/api/chat').send({ messages: [] })).resolves.toMatchObject({ status: 401 });
    await expect(request(app).post('/api/generate-question').send({ subject: 'Maths', topic: 'Algebra' })).resolves.toMatchObject(
      { status: 401 }
    );
  });

  it('protects /api/auth/verify', async () => {
    const response = await request(app).post('/api/auth/verify').send({ email: 'someone@example.com' });

    expect(response.status).toBe(401);
  });
});


describe('request validation', () => {
  it('rejects a sign-up without an email', async () => {
    const response = await request(app).post('/api/auth/register').send({ fullName: 'Ada', password: 'secret123' });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/invalid request body/i);
    expect(response.body.details.some((issue: { path: string }) => issue.path === 'email')).toBe(true);
  });

  it('refuses to attach a verified Auth user to a different profile with the same email', async () => {
    const tokenUser = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'legacy@example.com',
      user_metadata: {},
      app_metadata: { providers: ['email'] },
    };
    const getUserSpy = vi.spyOn(supabaseAdminClient.auth, 'getUser').mockResolvedValue({
      data: { user: tokenUser } as any,
      error: null,
    } as any);

    const byIdQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const byEmailQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: '33333333-3333-4333-8333-333333333333',
          email: 'legacy@example.com',
          sabi_unique_id: '1234A',
          auth_providers: ['email'],
        },
        error: null,
      }),
    };
    const fromSpy = vi.spyOn(supabaseAdminClient, 'from')
      .mockReturnValueOnce(byIdQuery as any)
      .mockReturnValueOnce(byEmailQuery as any);
    const confirmSpy = vi.spyOn(supabaseAdminClient.auth.admin, 'updateUserById');

    try {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer valid-test-token')
        .send({ email: 'legacy@example.com', uniqueId: '9999Z', authProviders: ['email', 'google'] });

      expect(response.status).toBe(409);
      expect(response.body.profile).toBeUndefined();
      expect(response.body.auth_user_id).toBeUndefined();
      expect(response.body.sabi_unique_id).toBeUndefined();
      expect(confirmSpy).not.toHaveBeenCalled();
    } finally {
      getUserSpy.mockRestore();
      fromSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it('does not expose or modify an existing profile through public registration', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: '11111111-1111-4111-8111-111111111111' },
        error: null,
      }),
      upsert: vi.fn(),
    };
    const fromSpy = vi.spyOn(supabaseAdminClient, 'from').mockReturnValueOnce(query as any);

    try {
      const response = await request(app).post('/api/auth/register').send({
        fullName: 'Someone Else',
        email: 'existing@example.com',
        password: 'secret123',
        phone: '+2348000000000',
      });

      expect(response.status).toBe(409);
      expect(response.body.profile).toBeUndefined();
      expect(response.body.auth_user_id).toBeUndefined();
      expect(response.body.sabi_unique_id).toBeUndefined();
      expect(query.upsert).not.toHaveBeenCalled();
    } finally {
      fromSpy.mockRestore();
    }
  });

  it('does not return a profile whose id differs from the authenticated login user', async () => {
    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: '33333333-3333-4333-8333-333333333333',
          email: 'legacy@example.com',
          sabi_unique_id: '1234A',
          auth_providers: ['email'],
        },
        error: null,
      }),
    };
    const fromSpy = vi.spyOn(supabaseAdminClient, 'from').mockReturnValueOnce(profileQuery as any);
    const signInSpy = vi.spyOn(supabaseAdminClient.auth, 'signInWithPassword').mockResolvedValue({
      data: {
        user: { id: '22222222-2222-4222-8222-222222222222', email: 'legacy@example.com' },
        session: {} as any,
      } as any,
      error: null,
    } as any);

    try {
      const response = await request(app).post('/api/auth/login').send({
        identifier: 'legacy@example.com',
        password: 'correct-password',
      });

      expect(response.status).toBe(409);
      expect(response.body.profile).toBeUndefined();
      expect(response.body.auth_user_id).toBeUndefined();
    } finally {
      fromSpy.mockRestore();
      signInSpy.mockRestore();
    }
  });

  it('rejects identity fields smuggled into a sign-up', async () => {
    const response = await request(app).post('/api/auth/register').send({
      fullName: 'Ada Obi',
      email: 'ada@example.com',
      password: 'secret123',
      role: 'MASTER_ADMIN',
    });

    expect(response.status).toBe(400);
    // zod reports strict-object violations at the body root with a key name.
    expect(response.body.details.some((issue: { message: string }) => /role/i.test(issue.message))).toBe(true);
    expect(response.body.details.some((issue: { path: string }) => issue.path === '(body)')).toBe(true);
  });

  it('rejects a login without a password', async () => {
    const response = await request(app).post('/api/auth/login').send({ identifier: 'ada@example.com' });

    expect(response.status).toBe(400);
    expect(response.body.details.some((issue: { path: string }) => issue.path === 'password')).toBe(true);
  });

  it('rejects a malformed recovery code', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password/confirm')
      .send({ email: 'ada@example.com', otp: '123', newPassword: 'newsecret' });

    expect(response.status).toBe(400);
    expect(response.body.details.some((issue: { path: string }) => issue.path === 'otp')).toBe(true);
  });

  it('retires the Unique-SABI-ID recovery endpoint', async () => {
    const response = await request(app)
      .post('/api/auth/reset-password')
      .send({ email: 'ada@example.com', uniqueId: '4829K', newPassword: 'newsecret' });

    expect(response.status).toBe(410);
    expect(response.body.error).toMatch(/retired/i);
  });

  it('answers unknown API routes with JSON instead of the SPA shell', async () => {
    const response = await request(app).get('/api/definitely-not-a-route');

    expect(response.status).toBe(404);
    expect(response.body.error).toMatch(/unknown api route/i);
  });

  it('serves the public question catalogue without a token', async () => {
    const response = await request(app).get('/api/questions');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.questions)).toBe(true);
  });
});


describe('auth profile synchronization fail-closed behavior', () => {
  it('fails closed when login cannot read the profile record', async () => {
    const query = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'database unavailable' } }),
    };
    const fromSpy = vi.spyOn(supabaseAdminClient, 'from').mockReturnValueOnce(query as any);
    const signInSpy = vi.spyOn(supabaseAdminClient.auth, 'signInWithPassword');
    try {
      const response = await request(app).post('/api/auth/login').send({
        identifier: 'candidate@example.com',
        password: 'correct-password',
      });
      expect(response.status).toBe(503);
      expect(signInSpy).not.toHaveBeenCalled();
    } finally {
      fromSpy.mockRestore();
      signInSpy.mockRestore();
    }
  });

  it('fails closed when verification cannot create the matching profile', async () => {
    const tokenUser = {
      id: '44444444-4444-4444-8444-444444444444',
      email: 'new-candidate@example.com',
      user_metadata: { full_name: 'New Candidate' },
      app_metadata: { providers: ['email'] },
    };
    const getUserSpy = vi.spyOn(supabaseAdminClient.auth, 'getUser').mockResolvedValue({
      data: { user: tokenUser } as any,
      error: null,
    } as any);
    const missingProfileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const failedUpsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'write rejected' } }),
    };
    const fromSpy = vi.spyOn(supabaseAdminClient, 'from')
      .mockReturnValueOnce(missingProfileQuery as any)
      .mockReturnValueOnce(missingProfileQuery as any)
      .mockReturnValueOnce(failedUpsertQuery as any);
    const confirmSpy = vi.spyOn(supabaseAdminClient.auth.admin, 'updateUserById').mockResolvedValue({
      data: { user: tokenUser } as any,
      error: null,
    } as any);
    try {
      const response = await request(app)
        .post('/api/auth/verify')
        .set('Authorization', 'Bearer valid-test-token')
        .send({});
      expect(response.status).toBe(503);
      expect(response.body.profile).toBeUndefined();
      expect(response.body.verified).toBe(false);
      expect(confirmSpy).toHaveBeenCalledWith(tokenUser.id, expect.any(Object));
    } finally {
      getUserSpy.mockRestore();
      fromSpy.mockRestore();
      confirmSpy.mockRestore();
    }
  });

  it('fails closed when login cannot synchronize the authenticated profile', async () => {
    const missingProfileQuery = {
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    const failedUpsertQuery = {
      upsert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: 'write rejected' } }),
    };
    const fromSpy = vi.spyOn(supabaseAdminClient, 'from')
      .mockReturnValueOnce(missingProfileQuery as any)
      .mockReturnValueOnce(failedUpsertQuery as any);
    const signInSpy = vi.spyOn(supabaseAdminClient.auth, 'signInWithPassword').mockResolvedValue({
      data: {
        user: { id: '55555555-5555-4555-8555-555555555555', email: 'candidate@example.com', user_metadata: {} },
        session: {} as any,
      } as any,
      error: null,
    } as any);
    try {
      const response = await request(app).post('/api/auth/login').send({
        identifier: 'candidate@example.com',
        password: 'correct-password',
      });
      expect(response.status).toBe(503);
      expect(response.body.profile).toBeUndefined();
    } finally {
      fromSpy.mockRestore();
      signInSpy.mockRestore();
    }
  });
});

describe('deployment self-check', () => {
  it('reports configuration state without leaking any secret', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.phase).toBe('phase0');
    expect(response.body.service_role_configured).toBe(true);
    expect(response.body.supabase_url_configured).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(/test-service-role-key/);
    expect(response.headers['cache-control']).toMatch(/no-store/);
  });
});

describe('CORS allow-list and security headers', () => {
  it('allows the Capacitor WebView origin', async () => {
    const response = await request(app).options('/api/chat').set('Origin', 'capacitor://localhost');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('capacitor://localhost');
  });

  it('allows localhost during development', async () => {
    const response = await request(app).options('/api/chat').set('Origin', 'http://localhost:5173');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('blocks unknown origins', async () => {
    const response = await request(app).options('/api/chat').set('Origin', 'https://evil.example');

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('refuses to run a route for a disallowed origin and explains why', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'https://evil.example')
      .send({ fullName: 'Ada Obi', email: 'ada@example.com', password: 'secret123' });

    expect(response.status).toBe(403);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
    expect(response.body.error).toMatch(/not allowed/i);
  });

  it('always allows the deployed app origin from SABI_APP_URL', async () => {
    const response = await request(app)
      .options('/api/auth/register')
      .set('Origin', 'https://sabi-test-app.example.com');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('https://sabi-test-app.example.com');
  });

  it('allows same-origin calls served by this process', async () => {
    const response = await request(app)
      .options('/api/auth/register')
      .set('Host', 'api.sabi.example.com')
      .set('Origin', 'http://api.sabi.example.com');

    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://api.sabi.example.com');
  });

  it('does not advertise the framework and keeps helmet defaults', async () => {
    const response = await request(app).get('/api/questions');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });
});
