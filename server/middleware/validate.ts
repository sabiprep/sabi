/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Request validation middleware (zod).
 *
 * Phase 0 (defect B7): request bodies were passed straight into Supabase and
 * Gemini with no schema, no size cap and no type guarantees.
 */

import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

export interface ValidationIssue {
  path: string;
  message: string;
}

/** Validates `req.body` against a zod schema and replaces it with the parsed value. */
export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const details: ValidationIssue[] = result.error.issues.map((issue) => ({
        path: issue.path.join('.') || '(body)',
        message: issue.message,
      }));
      res.status(400).json({ error: 'Invalid request body.', details });
      return;
    }
    req.body = result.data;
    next();
  };
}

/** Validates a specific set of query-string parameters. */
export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid query parameters.',
        details: result.error.issues.map((issue) => ({
          path: issue.path.join('.') || '(query)',
          message: issue.message,
        })),
      });
      return;
    }
    next();
  };
}
