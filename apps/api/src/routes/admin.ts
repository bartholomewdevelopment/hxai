import { Router } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { authenticate, requireAdmin } from '../middleware/auth';

export const adminRouter: Router = Router();

/**
 * Admin contract — shapes only, arriving in Phase 6.
 *
 * The protection is real from today: `authenticate` then `requireAdmin` guard
 * the whole subtree, so these return 401/403 before they return 501. That
 * ordering is deliberate — an unauthenticated caller learns nothing about
 * which admin routes exist.
 */

adminRouter.use('/admin', authenticate, requireAdmin);

const stub = (what: string) =>
  asyncHandler(async () => {
    throw AppError.notImplemented(`${what} arrives in Phase 6.`);
  });

adminRouter.get('/admin/people', stub('Listing all people, including drafts,'));
adminRouter.post('/admin/people', stub('Creating a person'));
adminRouter.patch('/admin/people/:id', stub('Updating a person'));
adminRouter.post('/admin/people/:id/persona', stub('Generating a persona configuration'));

adminRouter.post('/admin/sources', stub('Creating a source'));
adminRouter.patch('/admin/sources/:id', stub('Updating a source'));
adminRouter.delete('/admin/sources/:id', stub('Deleting a source'));
adminRouter.post('/admin/sources/:id/ingest', stub('Chunking and embedding a source'));

adminRouter.get('/admin/audit-logs', stub('Reading the audit trail'));
