process.env.NODE_ENV = 'test';
process.env.VERCEL = '1';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://test-project.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';

import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('../lib/supabaseAdmin', () => ({
  hasServiceRoleKey: true,
  SUPABASE_ADMIN_ERROR: null,
  MISSING_CONFIG_VARIABLES: [],
  supabaseAdmin: {
    auth: {
      getUser: (...args: any[]) => mockGetUser(...args),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

import { publicQuestionRouter, snapshotRouter } from './routes';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/public/questions', publicQuestionRouter);
  app.use('/api/snapshots', snapshotRouter);
  return app;
}

describe('Stage 1 — Public Shared Questions & Cross-Device Saved Snapshots API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('serves a public shared question from Supabase question_bank without leaking its answer key', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'question_bank') {
        return {
          select: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: {
                    id: 'JAMB-PHY-2024-01',
                    subject: 'Physics',
                    topic: 'Electrostatics',
                    subtopic: "Coulomb's Law",
                    year: 2024,
                    question: 'What is the SI unit of electric charge?',
                    option_a: 'Volt',
                    option_b: 'Coulomb',
                    option_c: 'Ohm',
                    option_d: 'Watt',
                    answer: 'B',
                    explanation: 'Electric charge is measured in Coulombs (C).',
                    explanation_short: 'SI unit of electric charge is the Coulomb.',
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const app = buildTestApp();
    const res = await request(app).get('/api/public/questions/JAMB-PHY-2024-01');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('supabase');
    expect(res.body.question.id).toBe('JAMB-PHY-2024-01');
    expect(res.body.question.options.B).toBe('Coulomb');
    // Crucial anti-spoiler security check: answer & explanation must NOT be exposed before answering
    expect(res.body.question.answer).toBeUndefined();
    expect(res.body.question.explanation).toBeUndefined();
    expect(res.body.question.explanationFull).toBeUndefined();
  });

  it('grades a public shared question answer via POST /check and reveals verified explanations', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        in: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }));

    const app = buildTestApp();
    // Falls back to curated starter question SABI-CHM-PT-1 (answer is B)
    const correctRes = await request(app)
      .post('/api/public/questions/SABI-CHM-PT-1/check')
      .send({ selectedOption: 'B' });

    expect(correctRes.status).toBe(200);
    expect(correctRes.body.isCorrect).toBe(true);
    expect(correctRes.body.correctAnswer).toBe('B');
    expect(typeof correctRes.body.explanationFull).toBe('string');
    expect(typeof correctRes.body.explanationPidgin).toBe('string');

    const wrongRes = await request(app)
      .post('/api/public/questions/SABI-CHM-PT-1/check')
      .send({ selectedOption: 'A' });

    expect(wrongRes.status).toBe(200);
    expect(wrongRes.body.isCorrect).toBe(false);
    expect(wrongRes.body.correctAnswer).toBe('B');
  });

  it('rejects invalid answer options and unknown question IDs cleanly', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        in: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }),
    }));

    const app = buildTestApp();
    const badOpt = await request(app)
      .post('/api/public/questions/SABI-CHM-PT-1/check')
      .send({ selectedOption: 'Z' });
    expect(badOpt.status).toBe(400);

    const notFound = await request(app).get('/api/public/questions/UNKNOWN-ID-99999');
    expect(notFound.status).toBe(404);
  });

  it('requires authentication on /api/snapshots and upserts strictly under the authenticated user ID', async () => {
    const app = buildTestApp();
    const unauth = await request(app).get('/api/snapshots');
    expect(unauth.status).toBe(401);

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc-123', email: 'student@sabi.ng' } },
      error: null,
    });

    let insertedPayload: any = null;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { role: 'STUDENT' }, error: null }),
            }),
          }),
        };
      }
      if (table === 'saved_question_snapshots') {
        return {
          upsert: (payload: any) => {
            insertedPayload = payload;
            return {
              select: () => ({
                single: async () => ({ data: payload, error: null }),
              }),
            };
          },
        };
      }
      return {};
    });

    const postRes = await request(app)
      .post('/api/snapshots')
      .set('Authorization', 'Bearer valid-token')
      .send({
        snapshotId: 'snap-SABI-CHM-PT-1-100',
        questionId: 'SABI-CHM-PT-1',
        canonicalQuestionId: 'SABI-CHM-PT-1',
        mode: 'blitz',
        subjectCanonical: 'Chemistry',
        subjectLabel: 'Chemistry',
        topicLabel: 'Periodic Table',
        question: 'Which element is a noble gas?',
        options: { A: 'Sodium', B: 'Argon', C: 'Chlorine', D: 'Oxygen' },
        answer: 'B',
        explanationShort: 'Argon is in Group 18.',
        explanationFull: 'Argon has a complete octet shell.',
        explanationPidgin: 'Argon na noble gas.',
        wasAnswered: true,
        selectedOption: 'B',
        isCorrect: true,
        explanationStyle: 'english',
      });

    expect(postRes.status).toBe(200);
    expect(postRes.body.status).toBe('synced');
    expect(insertedPayload.user_id).toBe('user-abc-123');
    expect(insertedPayload.was_answered).toBe(true);
    expect(insertedPayload.selected_option).toBe('B');
  });
});
