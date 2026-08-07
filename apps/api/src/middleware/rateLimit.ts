import rateLimit, { type Options } from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { ApiErrorBody } from '@historyai/shared';
import { env, isDevelopment } from '../config/env';

/**
 * Limiters share the standard error envelope so a 429 parses like any other
 * failure on the client.
 *
 * The default in-memory store is per-process. Running more than one API
 * instance means swapping in a shared store (Redis) — that is a Phase 7
 * concern, flagged here so it is not discovered in production.
 */
function envelope(req: Request, res: Response): void {
  const body: ApiErrorBody = {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down and try again shortly.',
      requestId: req.requestId,
    },
  };
  res.status(429).json(body);
}

const base: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => envelope(req, res),
  // Local development would otherwise trip the limiter on hot reload.
  skip: () => isDevelopment,
};

/** Applied to every /api route. */
export const globalRateLimit = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/** Tighter budget for credential endpoints, to blunt password guessing. */
export const authRateLimit = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
});

/**
 * Reserved for POST /api/conversations/:id/messages in Phase 3, where each
 * request costs an embedding call plus an LLM call.
 */
export const conversationRateLimit = rateLimit({
  ...base,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: Math.max(10, Math.floor(env.RATE_LIMIT_MAX / 4)),
});
