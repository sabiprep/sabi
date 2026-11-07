/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vercel serverless entry point for the SABI API.
 *
 * Why this file is a wrapper instead of `export default app`:
 * a serverless host evaluates this module *before* it runs a request. If
 * `server.ts` throws while it is being imported (the classic cause: a missing
 * SUPABASE_SERVICE_ROLE_KEY), Vercel answers with its own
 * `FUNCTION_INVOCATION_FAILED` HTML page: no JSON body, no CORS headers, no hint
 * in the browser, so the SPA could only say "A server error has occurred".
 *
 * So the Express app is loaded *lazily, inside the request*, and any boot
 * failure becomes a JSON `500 {code:"API_BOOT_FAILED"}` that names the cause and
 * how to fix it. The file deliberately imports nothing from the server at module
 * scope: anything that can throw at import time cannot be caught here.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';

type VercelRequest = IncomingMessage & { method?: string };

type VercelResponse = ServerResponse & {
  status?(code: number): VercelResponse;
  json?(body: unknown): VercelResponse;
};

type ExpressApp = (req: unknown, res: unknown) => unknown;

interface LoadedServer {
  app: ExpressApp;
}

/** Origins the Android WebView and local development may use. */
const DEFAULT_ALLOWED_ORIGINS = [
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
];

/**
 * Same allow-list the Express CORS layer uses, recomputed here because this
 * response is written when Express never got the chance to run.
 */
function allowedOrigins(): string[] {
  const configured = [process.env.SABI_APP_URL ?? '', ...(process.env.ALLOWED_ORIGINS ?? '').split(',')]
    .map(value => value.trim())
    .filter(Boolean);

  return [...new Set([...configured, ...DEFAULT_ALLOWED_ORIGINS])];
}

function requestOrigin(req: VercelRequest): string | null {
  const origin = req.headers?.origin;
  return typeof origin === 'string' && origin ? origin : null;
}

/** Adds CORS headers for an allow-listed origin; never wildcards. */
function applyCors(req: VercelRequest, res: VercelResponse): void {
  const origin = requestOrigin(req);

  res.setHeader('Vary', 'Origin');

  if (origin && allowedOrigins().includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  }
}

/** Writes a JSON body whether the caller passed a Node or an Express response. */
function send(res: VercelResponse, status: number, payload: Record<string, unknown>): void {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(status).json(payload);
    return;
  }

  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

/**
 * Removes hosting build paths from a boot error. A candidate must be able to
 * read the message, and `/var/task/...` is noise (and a small information leak).
 */
function stripBuildPaths(message: string): string {
  return message.replace(/\/var\/task\/?/g, '').replace(/\s+/g, ' ').trim();
}

function bootFailurePayload(error: unknown): Record<string, unknown> {
  const message = error instanceof Error ? error.message : String(error);
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].filter(name => !process.env[name]);

  return {
    status: 'error',
    error: 'The SABI API failed to start inside the serverless function.',
    code: 'API_BOOT_FAILED',
    detail: stripBuildPaths(message),
    missing,
    hint:
      'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for this deployment ' +
      '(Vercel: Project -> Settings -> Environment Variables -> Production), then redeploy. ' +
      'GET /api/health reports supabase_url_configured and service_role_configured.',
    timestamp: new Date().toISOString(),
  };
}

let pendingServer: Promise<LoadedServer> | null = null;

/**
 * Loads `server.ts` once per instance. A rejected load is not cached, so a later
 * request after the operator fixes the environment can succeed without a
 * redeploy when the platform reuses the instance.
 */
function loadServer(): Promise<LoadedServer> {
  if (!pendingServer) {
    // Vercel's function bundle does not retain the root TypeScript entry as a
    // runtime file. The build script emits this bundled CommonJS server artifact.
    const serverBundlePath: string =
      process.env.NODE_ENV === 'test' ? '../server.ts' : '../dist/server.cjs';
    pendingServer = import(serverBundlePath).then(module => {
      const app = (module as { app?: ExpressApp }).app;

      if (typeof app !== 'function') {
        throw new Error('server.ts did not export an Express app');
      }

      return { app };
    });

    pendingServer.catch(() => {
      pendingServer = null;
    });
  }

  return pendingServer;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(req, res);

  // Answer the preflight even while the API is unhealthy: the real request that
  // follows is what reports the cause.
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  try {
    const { app } = await loadServer();
    await app(req, res);
  } catch (error) {
    console.error('[SABI] API_BOOT_FAILED', error);
    send(res, 500, bootFailurePayload(error));
  }
}
