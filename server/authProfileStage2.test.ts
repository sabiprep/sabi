/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 2 tests: GET /api/profile/me, PATCH /api/profile/me, and upgraded /api/health
 * readiness booleans. Confirms strict authentication, input validation, privilege
 * column rejection, and user-ID scoping.
 */
process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.SABI_APP_URL = 'https://sabi-test-app.example.com';

import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

interface MockState {
  authUsersByToken: Record<
    string,
    { id: string; email: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> }
  >;
  profilesById: Record<string, Record<string, unknown>>;
}

const mockState: MockState = {
  authUsersByToken: {},
  profilesById: {},
};

function makeProfilesQuery() {
  let action: 'select' | 'update' | 'upsert' = 'select';
  let updateData: Record<string, unknown> | null = null;
  let upsertData: Record<string, unknown> | null = null;
  const filters: Record<string, unknown> = {};

  const query: any = {
    select: () => query,
    eq: (col: string, val: unknown) => {
      filters[col] = val;
      return query;
    },
    update: (data: Record<string, unknown>) => {
      action = 'update';
      updateData = data;
      return query;
    },
    upsert: (data: Record<string, unknown>) => {
      action = 'upsert';
      upsertData = data;
      return query;
    },
    maybeSingle: async () => {
      if (action === 'select') {
        const id = String(filters.id || '');
        return { data: mockState.profilesById[id] || null, error: null };
      }
      if (action === 'upsert' && upsertData) {
        const id = String(upsertData.id || '');
        mockState.profilesById[id] = { ...upsertData };
        return { data: mockState.profilesById[id], error: null };
      }
      if (action === 'update' && updateData) {
        const id = String(filters.id || '');
        const existing = mockState.profilesById[id];
        if (!existing) return { data: null, error: null };
        mockState.profilesById[id] = { ...existing, ...updateData };
        return { data: mockState.profilesById[id], error: null };
      }
      return { data: null, error: null };
    },
  };
  return query;
}

let app: import('express').Express;
let supabaseAdminClient: typeof import('./lib/supabaseAdmin').supabaseAdmin;

beforeAll(async () => {
  const [serverMod, adminMod] = await Promise.all([
    import('../server'),
    import('./lib/supabaseAdmin'),
  ]);
  app = serverMod.app;
  supabaseAdminClient = adminMod.supabaseAdmin;
});

describe('Stage 2 — Real Auth, Profile Hydration & Env Readiness', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    mockState.authUsersByToken = {
      'valid-candidate-token': {
        id: 'user-stage2-001',
        email: 'chinedu@sabi.ng',
        user_metadata: {
          full_name: 'Chinedu Okafor',
          state_of_origin: 'Anambra',
          sabi_unique_id: '7391M',
        },
        app_metadata: { providers: ['email'] },
      },
    };
    mockState.profilesById = {
      'user-stage2-001': {
        id: 'user-stage2-001',
        email: 'chinedu@sabi.ng',
        sabi_unique_id: '7391M',
        full_name: 'Chinedu Okafor',
        phone: '+2348012345678',
        state_of_origin: 'Anambra',
        auth_providers: ['email'],
        onboarding_completed: true,
        registered_subjects: ['English Language', 'Mathematics', 'Physics', 'Chemistry'],
        target_score: 330,
        onboarding_answers: {
          targetCourse: 'Mechanical Engineering',
          targetUniversity: 'UNN',
          live_progress: { xp: 1450, streakDays: 5 },
        },
      },
    };

    vi.spyOn(supabaseAdminClient.auth, 'getUser').mockImplementation(async (token?: string) => {
      const user = token ? mockState.authUsersByToken[token] : undefined;
      if (!user) return { data: { user: null }, error: { message: 'Invalid JWT' } } as any;
      return { data: { user }, error: null } as any;
    });

    vi.spyOn(supabaseAdminClient, 'from').mockImplementation((table: string) => {
      if (table === 'profiles') return makeProfilesQuery();
      return {
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
      } as any;
    });
  });

  it('exposes Stage 2 readiness booleans on GET /api/health without leaking secrets', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.stage).toMatch(/^stage[2-6]-/);
    expect(typeof res.body.supabase_url_configured).toBe('boolean');
    expect(typeof res.body.service_role_configured).toBe('boolean');
    expect(typeof res.body.ai_configured).toBe('boolean');
    expect(typeof res.body.public_web_url_configured).toBe('boolean');
    expect(typeof res.body.billing_configured).toBe('boolean');
    expect(typeof res.body.email_notifications_configured).toBe('boolean');
    expect(JSON.stringify(res.body)).not.toContain('eyJhbGci');
  });

  it('rejects unauthenticated GET /api/profile/me and PATCH /api/profile/me with 401', async () => {
    const getRes = await request(app).get('/api/profile/me');
    expect(getRes.status).toBe(401);

    const patchRes = await request(app)
      .patch('/api/profile/me')
      .send({ fullName: 'Unauthorized User' });
    expect(patchRes.status).toBe(401);
  });

  it('hydrates the authenticated candidate profile and live_progress on GET /api/profile/me', async () => {
    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.profile.id).toBe('user-stage2-001');
    expect(res.body.profile.sabi_unique_id).toBe('7391M');
    expect(res.body.onboarding_completed).toBe(true);
    expect(res.body.registered_subjects).toEqual([
      'English Language',
      'Mathematics',
      'Physics',
      'Chemistry',
    ]);
    expect(res.body.live_progress).toEqual({ xp: 1450, streakDays: 5 });
  });

  it('auto-initializes a missing profile row cleanly for a newly authenticated candidate', async () => {
    delete mockState.profilesById['user-stage2-001'];

    const res = await request(app)
      .get('/api/profile/me')
      .set('Authorization', 'Bearer valid-candidate-token');

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe('user-stage2-001');
    expect(res.body.profile.full_name).toBe('Chinedu Okafor');
    expect(res.body.profile.sabi_unique_id).toBe('7391M');
    expect(res.body.onboarding_completed).toBe(false);
  });

  it('updates allowed identity fields via PATCH /api/profile/me and rejects privileged keys', async () => {
    // Reject privileged/unknown keys via strict Zod schema
    const tamperRes = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-candidate-token')
      .send({ fullName: 'Chinedu', sabi_unique_id: '9999Z', role: 'super_admin' });
    expect(tamperRes.status).toBe(400);

    // Accept valid identity update
    const okRes = await request(app)
      .patch('/api/profile/me')
      .set('Authorization', 'Bearer valid-candidate-token')
      .send({
        fullName: 'Chinedu Emmanuel Okafor',
        targetCourse: 'Computer Engineering',
        targetUniversity: 'UNILAG',
        targetScore: 345,
      });

    expect(okRes.status).toBe(200);
    expect(okRes.body.status).toBe('updated');
    expect(okRes.body.profile.full_name).toBe('Chinedu Emmanuel Okafor');
    expect(okRes.body.profile.target_score).toBe(345);
    expect(okRes.body.profile.onboarding_answers.targetCourse).toBe('Computer Engineering');
    expect(okRes.body.profile.onboarding_answers.targetUniversity).toBe('UNILAG');
    // Existing live_progress must be preserved during identity update
    expect(okRes.body.profile.onboarding_answers.live_progress).toEqual({
      xp: 1450,
      streakDays: 5,
    });
  });

  it('ships Stage 2 RLS security migration and removes hardcoded Supabase fallback credentials', () => {
    const rootDir = process.cwd();
    const migrationSql = fs.readFileSync(
      path.join(rootDir, 'supabase/migrations/20261127090000_stage2_auth_rls_and_session_hardening.sql'),
      'utf8'
    );
    const supabaseClientTs = fs.readFileSync(path.join(rootDir, 'src/lib/supabase.ts'), 'utf8');

    expect(migrationSql).toContain('ENABLE ROW LEVEL SECURITY');
    expect(migrationSql).toContain('REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon');
    expect(migrationSql).toContain('trg_guard_profile_privileged_columns');

    expect(supabaseClientTs).not.toContain('DEFAULT_PUBLIC_SUPABASE_URL');
    expect(supabaseClientTs).not.toContain('dnrzixaasphxiswjyglj.supabase.co');
  });
});
