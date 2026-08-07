import { API_ERROR_STATUS, type ApiErrorCode, type FieldIssue } from '@historyai/shared';

/**
 * The only error type route handlers should throw. Everything else that
 * escapes a handler is treated as an unexpected fault and reported as
 * INTERNAL_ERROR with its details withheld from the client.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues?: FieldIssue[];
  /** Not serialised — logged only. */
  override readonly cause?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { issues?: FieldIssue[]; cause?: unknown },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = API_ERROR_STATUS[code];
    this.issues = options?.issues;
    this.cause = options?.cause;
  }

  static badRequest(message = 'Bad request'): AppError {
    return new AppError('BAD_REQUEST', message);
  }

  static validation(issues: FieldIssue[], message = 'Request validation failed'): AppError {
    return new AppError('VALIDATION_FAILED', message, { issues });
  }

  static unauthorized(message = 'Authentication required'): AppError {
    return new AppError('UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): AppError {
    return new AppError('FORBIDDEN', message);
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError('NOT_FOUND', message);
  }

  static conflict(message = 'Resource already exists'): AppError {
    return new AppError('CONFLICT', message);
  }

  /**
   * Used by every route whose contract exists but whose implementation lands in
   * a later phase. The route is registered and shaped now so the client can be
   * written against it.
   */
  static notImplemented(message = 'Not implemented yet'): AppError {
    return new AppError('NOT_IMPLEMENTED', message);
  }

  static internal(message = 'Something went wrong', cause?: unknown): AppError {
    return new AppError('INTERNAL_ERROR', message, { cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
