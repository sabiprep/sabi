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

import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app: import('express').Express;

beforeAll(async () => {
  ({ app } = await import('../server'));
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

  it('does not advertise the framework and keeps helmet defaults', async () => {
    const response = await request(app).get('/api/questions');

    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });
});
