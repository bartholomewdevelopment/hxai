import { Router } from 'express';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import type { HistoricalPersonSummary, Paginated, SourceSummary } from '@historyai/shared';
import { db } from '../db/client';
import { historicalPerson, source } from '../db/schema/index';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { validate } from '../middleware/validate';
import { toPersonDetail, toPersonSummary, toSourceSummary } from './serializers';

export const peopleRouter: Router = Router();

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().trim().min(1).max(120).optional(),
  era: z.string().trim().min(1).max(120).optional(),
  category: z.string().trim().min(1).max(120).optional(),
  featured: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

const slugParamSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Not a valid slug'),
});

const idParamSchema = z.object({ id: z.string().uuid() });

/**
 * Public reads are restricted to `published = true` throughout. Draft figures
 * are only reachable through the admin routes that arrive in Phase 6.
 */
peopleRouter.get(
  '/people',
  validate({ query: listQuerySchema }),
  asyncHandler(async (req, res) => {
    const { limit, offset, search, era, category, featured } = req.query as unknown as z.infer<
      typeof listQuerySchema
    >;

    const filters = [eq(historicalPerson.published, true)];

    if (search) {
      const pattern = `%${search}%`;
      const matches = or(
        ilike(historicalPerson.fullName, pattern),
        ilike(historicalPerson.displayName, pattern),
        ilike(historicalPerson.shortBiography, pattern),
      );
      if (matches) filters.push(matches);
    }
    if (era) filters.push(eq(historicalPerson.historicalEra, era));
    // `categories` is a text[]; `@>` asks whether it contains the given value.
    if (category) filters.push(sql`${historicalPerson.categories} @> ARRAY[${category}]::text[]`);
    if (featured !== undefined) filters.push(eq(historicalPerson.featured, featured));

    const where = and(...filters);

    const [rows, [totals]] = await Promise.all([
      db
        .select()
        .from(historicalPerson)
        .where(where)
        .orderBy(desc(historicalPerson.featured), asc(historicalPerson.displayName))
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(historicalPerson).where(where),
    ]);

    const body: Paginated<HistoricalPersonSummary> = {
      items: rows.map(toPersonSummary),
      total: totals?.value ?? 0,
      limit,
      offset,
    };

    res.json(body);
  }),
);

peopleRouter.get(
  '/people/:slug',
  validate({ params: slugParamSchema }),
  asyncHandler(async (req, res) => {
    const { slug } = req.params as unknown as z.infer<typeof slugParamSchema>;

    const [row] = await db
      .select()
      .from(historicalPerson)
      .where(and(eq(historicalPerson.slug, slug), eq(historicalPerson.published, true)))
      .limit(1);

    if (!row) throw AppError.notFound(`No published historical person with slug '${slug}'`);

    res.json(toPersonDetail(row));
  }),
);

/**
 * Sources for a person. Empty until Phase 2 ingestion runs — the route exists
 * now so the person page and the citation UI can be built against a real
 * contract rather than a mock.
 */
peopleRouter.get(
  '/people/:id/sources',
  validate({
    params: idParamSchema,
    query: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as z.infer<typeof idParamSchema>;
    const { limit, offset } = req.query as unknown as { limit: number; offset: number };

    const [person] = await db
      .select({ id: historicalPerson.id })
      .from(historicalPerson)
      .where(and(eq(historicalPerson.id, id), eq(historicalPerson.published, true)))
      .limit(1);

    if (!person) throw AppError.notFound('No published historical person with that id');

    // Unpublished sources must not appear in the public list. This route
    // predates the `published` column, so it was listing withheld documents —
    // the disputed Bixby letter showed up on Lincoln's page and then 404'd
    // when opened, because GET /sources/:id does filter correctly. Listing a
    // document we refuse to serve is worse than not listing it: it advertises
    // material we have deliberately declined to stand behind.
    const where = and(eq(source.historicalPersonId, id), eq(source.published, true));

    const [rows, [totals]] = await Promise.all([
      db
        .select()
        .from(source)
        // Primary sources first, then most recent — the order a reader expects
        // when scanning what a figure is grounded in.
        .orderBy(asc(source.sourceType), desc(source.dateCreated))
        .where(where)
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(source).where(where),
    ]);

    const body: Paginated<SourceSummary> = {
      items: rows.map(toSourceSummary),
      total: totals?.value ?? 0,
      limit,
      offset,
    };

    res.json(body);
  }),
);
