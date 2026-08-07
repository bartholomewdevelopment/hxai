import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '@historyai/shared';
import { AppError, isAppError } from '../lib/errors';
import { logger } from '../lib/logger';
import { isProduction } from '../config/env';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(AppError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/**
 * Terminal error handler. Produces the one error envelope the client knows how
 * to read, and keeps internal detail — stack traces, driver messages — out of
 * responses in production.
 */
export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = toAppError(error);

  const logContext = {
    requestId: req.requestId,
    code: appError.code,
    status: appError.status,
    path: req.originalUrl,
    userId: req.user?.id,
  };

  if (appError.status >= 500) {
    logger.error(appError.message, {
      ...logContext,
      stack: error instanceof Error ? error.stack : undefined,
    });
  } else {
    logger.warn(appError.message, logContext);
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.status >= 500 && isProduction ? 'Something went wrong' : appError.message,
      requestId: req.requestId,
      ...(appError.issues ? { issues: appError.issues } : {}),
    },
  };

  res.status(appError.status).json(body);
}

function toAppError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof ZodError) {
    return AppError.validation(
      error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    );
  }

  // Postgres unique-violation surfaces as a conflict rather than a 500.
  if (typeof error === 'object' && error !== null && 'code' in error) {
    if ((error as { code?: string }).code === '23505') {
      return AppError.conflict('That record already exists');
    }
  }

  return AppError.internal(error instanceof Error ? error.message : 'Unexpected error', error);
}
