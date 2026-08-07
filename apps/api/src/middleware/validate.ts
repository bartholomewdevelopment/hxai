import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodTypeAny, z } from 'zod';
import { AppError } from '../lib/errors';

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Validate and *replace* the request parts with their parsed output, so
 * handlers read coerced, defaulted values rather than raw strings.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const issues: { path: string; message: string }[] = [];

    for (const key of ['body', 'query', 'params'] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (result.success) {
        // `req.query` and `req.params` are getter-only in Express 5; defining
        // the property keeps this working across both major versions.
        Object.defineProperty(req, key, { value: result.data, writable: true, configurable: true });
      } else {
        issues.push(
          ...result.error.issues.map((issue) => ({
            path: [key, ...issue.path].join('.'),
            message: issue.message,
          })),
        );
      }
    }

    if (issues.length > 0) {
      next(AppError.validation(issues));
      return;
    }

    next();
  };
}

/** Infer the parsed type of a schema, for typing handler locals. */
export type Parsed<T extends ZodTypeAny> = z.infer<T>;
