import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { historicalPerson, source } from '../db/schema/index';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { validate } from '../middleware/validate';
import { toSourceDetail } from './serializers';

export const sourcesRouter: Router = Router();

/**
 * A source is public only if its person is published. Reachability follows the
 * figure, so unpublishing a person hides their sources in the same move.
 */
sourcesRouter.get(
  '/sources/:id',
  validate({ params: z.object({ id: z.string().uuid() }) }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };

    const [row] = await db
      .select({ source })
      .from(source)
      .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
      .where(and(eq(source.id, id), eq(historicalPerson.published, true)))
      .limit(1);

    if (!row) throw AppError.notFound('No source with that id');

    res.json(toSourceDetail(row.source));
  }),
);
