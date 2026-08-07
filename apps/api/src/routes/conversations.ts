import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { authenticate } from '../middleware/auth';
import { conversationRateLimit } from '../middleware/rateLimit';

export const conversationsRouter: Router = Router();

/**
 * Conversation contract — shapes only.
 *
 * These land in Phase 3, once retrieval exists. They are registered now with
 * their real auth and rate-limit middleware so the client can be built against
 * the finished URL surface, and so nothing about the wiring is a surprise later.
 *
 * Every handler returns 501. Message creation in particular will run
 * retrieve -> rerank -> generate -> cite, in that order; there will be no
 * code path that generates first and looks for sources afterwards.
 */

conversationsRouter.use('/conversations', authenticate);

conversationsRouter.get(
  '/conversations',
  asyncHandler(async () => {
    throw AppError.notImplemented('Listing conversations arrives in Phase 3.');
  }),
);

conversationsRouter.post(
  '/conversations',
  asyncHandler(async () => {
    throw AppError.notImplemented('Starting a conversation arrives in Phase 3.');
  }),
);

conversationsRouter.get(
  '/conversations/:id',
  asyncHandler(async () => {
    throw AppError.notImplemented('Reading a conversation arrives in Phase 3.');
  }),
);

conversationsRouter.delete(
  '/conversations/:id',
  asyncHandler(async () => {
    throw AppError.notImplemented('Deleting a conversation arrives in Phase 3.');
  }),
);

conversationsRouter.get(
  '/conversations/:id/messages',
  asyncHandler(async () => {
    throw AppError.notImplemented('Reading messages arrives in Phase 3.');
  }),
);

conversationsRouter.post(
  '/conversations/:id/messages',
  conversationRateLimit,
  asyncHandler(async () => {
    throw AppError.notImplemented(
      'Sending a message arrives in Phase 3, after retrieval is implemented.',
    );
  }),
);
