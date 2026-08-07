import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ROLE_RANK, type UserRole } from '@historyai/shared';
import { env } from '../config/env';
import { AppError } from './errors';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, env.BCRYPT_ROUNDS);
}

export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    if (typeof decoded === 'string' || !decoded.sub) {
      throw AppError.unauthorized('Malformed token');
    }
    return {
      sub: decoded.sub,
      email: String(decoded.email ?? ''),
      role: (decoded.role as UserRole) ?? 'user',
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw AppError.unauthorized('Invalid or expired token');
  }
}

/** Roles are ordered (user < curator < admin) so checks are a rank comparison. */
export function hasRoleAtLeast(actual: UserRole, required: UserRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}
