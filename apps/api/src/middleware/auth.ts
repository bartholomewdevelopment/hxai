import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { eq } from 'drizzle-orm';
import type { UserRole } from '@historyai/shared';
import { db } from '../db/client';
import { users } from '../db/schema/index';
import { hasRoleAtLeast, verifyToken } from '../lib/auth';
import { AppError } from '../lib/errors';

function extractBearerToken(req: Request): string | null {
  const header = req.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * Populate `req.user` when a valid token is present, and reject otherwise.
 *
 * The role is re-read from the database on every request rather than trusted
 * from the token, so a revoked admin loses access immediately instead of when
 * their token happens to expire.
 */
export const authenticate: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  try {
    const token = extractBearerToken(req);
    if (!token) throw AppError.unauthorized();

    const payload = verifyToken(token);

    const [row] = await db
      .select({ id: users.id, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!row) throw AppError.unauthorized('Account no longer exists');

    req.user = row;
    next();
  } catch (error) {
    next(error);
  }
};

/** Attach `req.user` when a token is present, but allow anonymous requests. */
export const optionalAuthenticate: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!extractBearerToken(req)) {
    next();
    return;
  }
  await authenticate(req, res, next);
};

/** Route protection by minimum role. Use after `authenticate`. */
export function requireRole(minimum: UserRole): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(AppError.unauthorized());
      return;
    }
    if (!hasRoleAtLeast(req.user.role, minimum)) {
      next(AppError.forbidden(`This action requires the '${minimum}' role or higher`));
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
