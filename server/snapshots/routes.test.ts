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

import {
  injectSharedQuestionOpenGraphHtml,
  publicQuestionRouter,
  snapshotRouter,
} from './routes';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/public/questions', publicQuestionRouter);
  app.use('/api/snapshots', snapshotRouter);
  return app;
}

describe('Stage 1 & 1B — Public Shared Questions, Universal Share Links & Saved Snapshots API', () => {
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

  it('resolves future AI-generated or custom shared questions from shared_question_links without exposing answer keys', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'question_bank') {
        return {
          select: () => ({
            in: () => ({
              limit: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'shared_question_links') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  canonical_question_id: 'AI-BIO-GEN-2026-88',
                  question_id: 'AI-BIO-GEN-2026-88',
                  subject_canonical: 'Biology',
                  subject_label: 'Biology',
                  topic_label: 'Cell Respiration',
                  question_year: 2026,
                  question_text: 'Which organelle is the primary site of ATP synthesis in eukaryotes?',
                  options: {
                    A: 'Ribosome',
                    B: 'Golgi apparatus',
                    C: 'Mitochondrion',
                    D: 'Lysosome',
                  },
                  correct_answer: 'C',
                  explanation_short: 'Mitochondria perform oxidative phosphorylation.',
                  explanation_full: 'The inner mitochondrial membrane drives ATP synthase.',
                  explanation_pidgin: 'Na mitochondrion dey generate ATP energy for cell.',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {};
    });

    const app = buildTestApp();
    const res = await request(app).get('/api/public/questions/AI-BIO-GEN-2026-88');

    expect(res.status).toBe(200);
    expect(res.body.source).toBe('shared_link');
    expect(res.body.question.id).toBe('AI-BIO-GEN-2026-88');
    expect(res.body.question.options.C).toBe('Mitochondrion');
    expect(res.body.question.answer).toBeUndefined();

    const checkRes = await request(app)
      .post('/api/public/questions/AI-BIO-GEN-2026-88/check')
      .send({ selectedOption: 'C' });

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.isCorrect).toBe(true);
    expect(checkRes.body.correctAnswer).toBe('C');
  });

  it('publishes any shared question to shared_question_links via authenticated POST /api/snapshots/share-link', async () => {
    const app = buildTestApp();

    const unauth = await request(app).post('/api/snapshots/share-link').send({});
    expect(unauth.status).toBe(401);

    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-share-77', email: 'sharer@sabi.ng' } },
      error: null,
    });

    let publishedPayload: any = null;
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
      if (table === 'shared_question_links') {
        return {
          upsert: (payload: any) => {
            publishedPayload = payload;
            return Promise.resolve({ error: null });
          },
        };
      }
      return {};
    });

    const res = await request(app)
      .post('/api/snapshots/share-link')
      .set('Authorization', 'Bearer valid-token')
      .send({
        questionId: 'AI-MTH-2026-42-loop2',
        mode: 'smart',
        subjectCanonical: 'Mathematics',
        subjectLabel: 'Maths',
        topicLabel: 'Quadratic Equations',
        question: 'Find the roots of x^2 - 5x + 6 = 0.',
        options: { A: '1 and 6', B: '2 and 3', C: '-2 and -3', D: '3 and 5' },
        answer: 'B',
        explanationShort: '(x - 2)(x - 3) = 0 gives x = 2 or 3.',
        explanationFull: 'Factorising x^2 - 5x + 6 gives (x - 2)(x - 3) = 0.',
        explanationPidgin: 'Factorise am get (x-2)(x-3)=0, so x na 2 or 3.',
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.canonicalQuestionId).toBe('AI-MTH-2026-42');
    expect(res.body.path).toBe('/q/AI-MTH-2026-42?mode=smart&src=share');
    expect(publishedPayload.shared_by_user_id).toBe('user-share-77');
    expect(publishedPayload.canonical_question_id).toBe('AI-MTH-2026-42');
  });

  it('injects rich OpenGraph metadata for /q/:id links while escaping special characters and hiding the answer key', () => {
    const html = `<!doctype html><html><head><title>SABI</title><meta property="og:title" content="Old" /></head><body></body></html>`;
    const rendered = injectSharedQuestionOpenGraphHtml(
      html,
      {
        id: 'JAMB-CHM-2025-9',
        subjectCanonical: 'Chemistry',
        subjectLabel: 'Chemistry',
        topicLabel: 'Acids & "Bases" <script>alert(1)</script>',
        question: 'Which indicator turns pink in alkaline solution? <img src=x onerror=alert(1)>',
        options: { A: 'Litmus', B: 'Phenolphthalein', C: 'Methyl orange', D: 'Starch' },
        answer: 'B',
        explanationShort: 'Phenolphthalein turns pink in bases.',
        explanationFull: 'Phenolphthalein is colourless in acid and pink in alkali.',
        explanationPidgin: 'Phenolphthalein dey turn pink inside base.',
        source: 'supabase',
      },
      'https://sabi-tan.vercel.app/q/JAMB-CHM-2025-9?mode=blitz&src=share'
    );

    expect(rendered).toContain('og:title');
    expect(rendered).toContain('og:description');
    expect(rendered).toContain('twitter:card');
    expect(rendered).not.toContain('<script>alert(1)</script>');
    expect(rendered).not.toContain('<img src=x onerror=alert(1)>');
    expect(rendered).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(rendered).not.toContain('Phenolphthalein');
  });

  it('grades a public shared question answer via POST /check and reveals verified explanations', async () => {
    mockFrom.mockImplementation(() => ({
      select: () => ({
        in: () => ({
          limit: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
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
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
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
