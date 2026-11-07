/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression tests for the Vercel function entry point (`api/index.ts`).
 *
 * Background: sign-up on the deployment answered
 * `HTTP 500: FUNCTION_INVOCATION_FAILED`. Vercel produces that HTML page when a
 * function throws while it is being loaded, which is exactly what happened: a
 * missing SUPABASE_SERVICE_ROLE_KEY made `server.ts` throw at import time, so
 * Express never ran and the SPA could only report "A server error has occurred".
 *
 * `../server.ts` is mocked as a module whose factory throws, which reproduces that
 * boot failure deterministically. The assertions below pin the property that
 * matters: a broken deployment must still answer a JSON error that names the
 * cause - and it must be readable from the Android WebView, which is cross-origin
 * and therefore needs CORS headers that the (never-ran) Express app cannot add.
 */

process.env.NODE_ENV = 'test';
process.env.SABI_APP_URL = 'https://sabi-test-app.example.com';

import { describe, expect, it, vi } from 'vitest';

const BOOT_MESSAGE = 'Cannot find package "vite" imported from /var/task/server.ts';

/**
 * Reproduces an import-time crash in `server.ts`. The factory returns an object
 * whose `app` getter throws, which is the same failure `api/index.ts` has to
 * survive in production (the import promise rejects and Express never runs) but
 * without Vitest wrapping the error in its own "error when mocking" message.
 */
vi.mock('../server.ts', () => ({
  get app(): never {
    throw new Error(BOOT_MESSAGE);
  },
}));

import handler from './index';

const APP_ORIGIN = 'https://sabi-test-app.example.com';

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader(name: string, value: string): void;
  end(chunk?: string): void;
}

function createResponse(): FakeResponse {
  const response: FakeResponse = {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) {
      response.headers[name.toLowerCase()] = String(value);
    },
    end(chunk) {
      response.body = chunk ?? '';
    },
  };

  return response;
}

async function call(
  method: string,
  origin?: string
): Promise<{ status: number; headers: Record<string, string>; json: Record<string, unknown> | null }> {
  const res = createResponse();
  const req = { method, headers: origin ? { origin } : {} };

  await handler(
    req as unknown as Parameters<typeof handler>[0],
    res as unknown as Parameters<typeof handler>[1]
  );

  let json: Record<string, unknown> | null = null;
  try {
    json = res.body ? (JSON.parse(res.body) as Record<string, unknown>) : null;
  } catch {
    json = null;
  }

  return { status: res.statusCode, headers: res.headers, json };
}

describe('api/index boot failure', () => {
  it('answers 500 JSON with a machine readable code instead of Vercel HTML', async () => {
    const { status, headers, json } = await call('POST', APP_ORIGIN);

    expect(status).toBe(500);
    expect(headers['content-type']).toMatch(/application\/json/);
    expect(json?.code).toBe('API_BOOT_FAILED');
  });

  it('names the boot error and how to fix it', async () => {
    const { json } = await call('POST', APP_ORIGIN);

    expect(json?.detail).toBe('Cannot find package "vite" imported from server.ts');
    expect(String(json?.hint)).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(String(json?.error)).toMatch(/failed to start/i);
  });

  it('never leaks a filesystem build path', async () => {
    const { json } = await call('POST', APP_ORIGIN);

    expect(String(json?.detail)).not.toContain('/var/task/');
  });

  it('is readable from a cross-origin client (Capacitor WebView)', async () => {
    const { headers } = await call('POST', APP_ORIGIN);

    expect(headers['access-control-allow-origin']).toBe(APP_ORIGIN);
    expect(headers['vary']).toBe('Origin');
  });

  it('does not grant CORS to an origin outside the allow-list', async () => {
    const { headers } = await call('POST', 'https://evil.example.com');

    expect(headers['access-control-allow-origin']).toBeUndefined();
  });

  it('answers the preflight with 204 so the real request can still report the cause', async () => {
    const { status, headers, json } = await call('OPTIONS', APP_ORIGIN);

    expect(status).toBe(204);
    expect(json).toBeNull();
    expect(headers['access-control-allow-origin']).toBe(APP_ORIGIN);
  });

  it('works with an Express-style response that has status()/json()', async () => {
    const captured: { status?: number; body?: unknown } = {};
    const res = {
      statusCode: 200,
      setHeader: () => undefined,
      end: () => undefined,
      status(code: number) {
        captured.status = code;
        return this;
      },
      json(payload: unknown) {
        captured.body = payload;
        return this;
      },
    };

    await handler(
      { method: 'GET', headers: { origin: APP_ORIGIN } } as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1]
    );

    expect(captured.status).toBe(500);
    expect((captured.body as { code?: string }).code).toBe('API_BOOT_FAILED');
  });
});
