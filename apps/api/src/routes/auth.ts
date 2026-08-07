import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { AuthResponse } from '@historyai/shared';
import { db } from '../db/client';
import { users } from '../db/schema/index';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { hashPassword, signToken, verifyPassword } from '../lib/auth';
import { recordAudit } from '../lib/audit';
import { authenticate } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';
import { validate } from '../middleware/validate';
import { toAuthenticatedUser } from './serializers';

export const authRouter: Router = Router();

const registerSchema = z.object({
  email: z.string().email().max(320).toLowerCase().trim(),
  password: z.string().min(10, 'Password must be at least 10 characters').max(200),
  displayName: z.string().min(1).max(120).trim().optional(),
});

const loginSchema = z.object({
  email: z.string().email().max(320).toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

authRouter.post(
  '/auth/register',
  authRateLimit,
  validate({ body: registerSchema }),
  asyncHandler(async (req, res) => {
    const { email, password, displayName } = req.body as z.infer<typeof registerSchema>;

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) throw AppError.conflict('An account with that email already exists');

    const [created] = await db
      .insert(users)
      .values({
        email,
        passwordHash: await hashPassword(password),
        displayName: displayName ?? null,
        // Roles are never self-assigned. Promotion to curator/admin is a
        // deliberate act, done out of band (see README) until the Phase 6
        // admin console exists.
        role: 'user',
      })
      .returning();

    if (!created) throw AppError.internal('Failed to create account');

    await recordAudit(req, {
      action: 'auth.register',
      actorId: created.id,
      entityType: 'users',
      entityId: created.id,
    });

    const user = toAuthenticatedUser(created);
    const body: AuthResponse = {
      user,
      token: signToken({ sub: user.id, email: user.email, role: user.role }),
    };

    res.status(201).json(body);
  }),
);

authRouter.post(
  '/auth/login',
  authRateLimit,
  validate({ body: loginSchema }),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // One message for both "no such account" and "wrong password", so the
    // endpoint cannot be used to enumerate registered addresses.
    const invalid = AppError.unauthorized('Incorrect email or password');
    if (!row) throw invalid;
    if (!(await verifyPassword(password, row.passwordHash))) {
      await recordAudit(req, {
        action: 'auth.login_failed',
        actorId: row.id,
        entityType: 'users',
        entityId: row.id,
      });
      throw invalid;
    }

    await recordAudit(req, {
      action: 'auth.login',
      actorId: row.id,
      entityType: 'users',
      entityId: row.id,
    });

    const user = toAuthenticatedUser(row);
    const body: AuthResponse = {
      user,
      token: signToken({ sub: user.id, email: user.email, role: user.role }),
    };

    res.json(body);
  }),
);

authRouter.get(
  '/auth/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const [row] = await db.select().from(users).where(eq(users.id, req.user!.id)).limit(1);
    if (!row) throw AppError.unauthorized('Account no longer exists');
    res.json({ user: toAuthenticatedUser(row) });
  }),
);
