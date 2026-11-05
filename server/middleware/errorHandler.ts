/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Structured error handling and JSON 404s for the API surface.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';
import { config } from '../config';

/** Returns a JSON 404 for unknown /api/* routes instead of falling through to the SPA. */
export const apiNotFoundHandler: RequestHandler = (req, res, next) => {
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }
  res.status(404).json({ error: `Unknown API route: ${req.method} ${req.path}` });
};

/** Final error handler: never leaks stack traces in production. */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 500;
  const message =
    status >= 500 && config.isProduction
      ? 'An unexpected error occurred.'
      : String((err as Error)?.message || 'Unexpected error');

  console.error(`[SABI] ${req.method} ${req.originalUrl} failed:`, (err as Error)?.message || err);

  if (res.headersSent) return;
  res.status(status).json({ error: message });
};

/**
 * Wraps an async route handler so rejected promises reach the error handler
 * instead of becoming unhandled rejections.
 */
export function asyncHandler(
  handler: (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1], next: Parameters<RequestHandler>[2]) => Promise<unknown>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
