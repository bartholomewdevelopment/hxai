import { Router } from 'express';
import { and, count, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import {
  RIGHTS_STATUSES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  type Paginated,
} from '@historyai/shared';
import { db } from '../db/client';
import { historicalPerson, source, sourceChunk } from '../db/schema/index';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { recordAudit } from '../lib/audit';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { toAdminSourceDetail, toAdminSourceSummary } from './serializers';
import { embedSource, processSource, refreshPersonCounts } from '../services/ingestion/pipeline';

export const adminRouter: Router = Router();

/**
 * Admin surface for the source library.
 *
 * Guarded by `authenticate` then `requireRole('curator')` for the whole
 * subtree, so an unauthenticated caller gets 401 before learning which routes
 * exist. Destructive and publish operations require 'admin'.
 *
 * Every mutation writes an audit entry. The provenance of the library is as
 * much a part of the product as the provenance of the sources in it — "who
 * published this document, and when" has to be answerable.
 */
adminRouter.use('/admin', authenticate, requireRole('curator'));

const idParam = z.object({ id: z.string().uuid() });

const sourceBodySchema = z.object({
  historicalPersonId: z.string().uuid(),
  title: z.string().min(1).max(500).trim(),
  author: z.string().max(300).trim().optional(),
  documentType: z.string().max(120).trim().optional(),
  dateCreated: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use ISO format, YYYY-MM-DD')
    .optional(),
  approximateDate: z.string().max(120).trim().optional(),
  historicalPeriod: z.string().max(120).trim().optional(),
  description: z.string().max(5000).trim().optional(),
  archiveName: z.string().max(300).trim().optional(),
  collectionName: z.string().max(300).trim().optional(),
  canonicalUrl: z.string().url().max(2000).optional(),
  transcriptionUrl: z.string().url().max(2000).optional(),
  originalDocumentUrl: z.string().url().max(2000).optional(),
  /** Paste the transcription directly instead of importing from a URL. */
  fullText: z.string().max(5_000_000).optional(),
  language: z.string().max(20).default('en'),
  translated: z.boolean().default(false),
  translator: z.string().max(200).optional(),
  sourceType: z.enum(SOURCE_TYPES).default('primary'),
  rightsStatus: z.enum(RIGHTS_STATUSES).default('unknown'),
  copyrightJurisdiction: z.string().max(120).optional(),
  rightsNotes: z.string().max(5000).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).default('unverified'),
});

/**
 * A source needs either text or somewhere to fetch it from — otherwise there
 * is nothing to process and the record is a dead end.
 */
const createSourceSchema = sourceBodySchema.refine(
  (body) => Boolean(body.fullText?.trim() || body.transcriptionUrl || body.canonicalUrl),
  { message: 'Provide fullText, or a transcriptionUrl/canonicalUrl to import from' },
);

const updateSourceSchema = sourceBodySchema.partial().omit({ historicalPersonId: true });

// ---------------------------------------------------------------- dashboard

/** Corpus health at a glance: counts by processing state and by rights. */
adminRouter.get(
  '/admin/dashboard',
  asyncHandler(async (_req, res) => {
    const [people, byStatus, byRights, byType, chunkTotals] = await Promise.all([
      db
        .select({
          id: historicalPerson.id,
          slug: historicalPerson.slug,
          displayName: historicalPerson.displayName,
          published: historicalPerson.published,
          sourceCount: historicalPerson.sourceCount,
        })
        .from(historicalPerson)
        .orderBy(desc(historicalPerson.published), historicalPerson.displayName),
      db
        .select({ status: source.processingStatus, total: count() })
        .from(source)
        .groupBy(source.processingStatus),
      db
        .select({ rights: source.rightsStatus, total: count() })
        .from(source)
        .groupBy(source.rightsStatus),
      db
        .select({ sourceType: source.sourceType, total: count() })
        .from(source)
        .groupBy(source.sourceType),
      db
        .select({
          chunks: sql<number>`count(*)::int`,
          embedded: sql<number>`count(${sourceChunk.embedding})::int`,
        })
        .from(sourceChunk),
    ]);

    res.json({
      people,
      sourcesByProcessingStatus: byStatus,
      sourcesByRightsStatus: byRights,
      sourcesByType: byType,
      chunks: chunkTotals[0] ?? { chunks: 0, embedded: 0 },
    });
  }),
);

// ------------------------------------------------------------------ sources

adminRouter.get(
  '/admin/sources',
  validate({
    query: z.object({
      personId: z.string().uuid().optional(),
      status: z.string().optional(),
      limit: z.coerce.number().int().min(1).max(200).default(100),
      offset: z.coerce.number().int().min(0).default(0),
    }),
  }),
  asyncHandler(async (req, res) => {
    const { personId, status, limit, offset } = req.query as unknown as {
      personId?: string;
      status?: string;
      limit: number;
      offset: number;
    };

    const filters = [];
    if (personId) filters.push(eq(source.historicalPersonId, personId));
    if (status) filters.push(eq(source.processingStatus, status as never));
    const where = filters.length > 0 ? and(...filters) : undefined;

    const [rows, [totals]] = await Promise.all([
      db
        .select()
        .from(source)
        .where(where)
        .orderBy(source.dateCreated, source.title)
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(source).where(where),
    ]);

    const body: Paginated<ReturnType<typeof toAdminSourceSummary>> = {
      items: rows.map(toAdminSourceSummary),
      total: totals?.value ?? 0,
      limit,
      offset,
    };
    res.json(body);
  }),
);

adminRouter.get(
  '/admin/sources/:id',
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const [row] = await db.select().from(source).where(eq(source.id, id)).limit(1);
    if (!row) throw AppError.notFound('No source with that id');

    const chunks = await db
      .select({
        id: sourceChunk.id,
        chunkIndex: sourceChunk.chunkIndex,
        text: sourceChunk.text,
        tokenCount: sourceChunk.tokenCount,
        embedded: sql<boolean>`${sourceChunk.embedding} IS NOT NULL`,
      })
      .from(sourceChunk)
      .where(eq(sourceChunk.sourceId, id))
      .orderBy(sourceChunk.chunkIndex);

    res.json({ source: toAdminSourceDetail(row), chunks });
  }),
);

adminRouter.post(
  '/admin/sources',
  validate({ body: createSourceSchema }),
  asyncHandler(async (req, res) => {
    const body = req.body as z.infer<typeof createSourceSchema>;

    const [person] = await db
      .select({ id: historicalPerson.id })
      .from(historicalPerson)
      .where(eq(historicalPerson.id, body.historicalPersonId))
      .limit(1);
    if (!person) throw AppError.badRequest('No historical person with that id');

    const [created] = await db
      .insert(source)
      .values({ ...body, processingStatus: 'pending' })
      .returning();
    if (!created) throw AppError.internal('Failed to create source');

    await recordAudit(req, {
      action: 'admin.source.create',
      entityType: 'source',
      entityId: created.id,
      metadata: { title: created.title },
    });

    res.status(201).json(toAdminSourceDetail(created));
  }),
);

adminRouter.patch(
  '/admin/sources/:id',
  validate({ params: idParam, body: updateSourceSchema }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const body = req.body as z.infer<typeof updateSourceSchema>;

    const [existing] = await db.select().from(source).where(eq(source.id, id)).limit(1);
    if (!existing) throw AppError.notFound('No source with that id');

    // Editing the text invalidates the derived artifacts. Rather than leave
    // chunks that no longer match their source, the record drops back to
    // 'pending' so it must be reprocessed before it can be used.
    const textChanged = body.fullText !== undefined && body.fullText !== existing.fullText;

    const [updated] = await db
      .update(source)
      .set({
        ...body,
        ...(textChanged
          ? { processingStatus: 'pending' as const, contentHash: null, embeddedAt: null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(source.id, id))
      .returning();
    if (!updated) throw AppError.internal('Failed to update source');

    await recordAudit(req, {
      action: 'admin.source.update',
      entityType: 'source',
      entityId: id,
      metadata: { fields: Object.keys(body), textChanged },
    });

    res.json(toAdminSourceDetail(updated));
  }),
);

/** Fetch (if needed), extract, clean, and chunk. Does not embed. */
adminRouter.post(
  '/admin/sources/:id/process',
  validate({
    params: idParam,
    body: z
      .object({
        force: z.boolean().default(false),
        targetTokens: z.number().int().min(50).max(2000).optional(),
        overlapTokens: z.number().int().min(0).max(500).optional(),
      })
      .default({ force: false }),
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const options = req.body as { force: boolean; targetTokens?: number; overlapTokens?: number };

    const result = await processSource(id, options);

    await recordAudit(req, {
      action: 'admin.source.process',
      entityType: 'source',
      entityId: id,
      metadata: { chunksCreated: result.chunksCreated, skipped: result.skipped },
    });

    res.json(result);
  }),
);

/** Generate embeddings for a source's chunks. Requires a configured provider. */
adminRouter.post(
  '/admin/sources/:id/embed',
  validate({
    params: idParam,
    body: z.object({ force: z.boolean().default(false) }).default({ force: false }),
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const { force } = req.body as { force: boolean };

    const result = await embedSource(id, { force });

    await recordAudit(req, {
      action: 'admin.source.embed',
      entityType: 'source',
      entityId: id,
      metadata: { chunksEmbedded: result.chunksEmbedded },
    });

    res.json(result);
  }),
);

/**
 * Publish or unpublish.
 *
 * Publishing is gated on the source actually being usable: it must have chunks,
 * and it must not be editorially disputed. A disputed document that could be
 * retrieved and quoted in the figure's voice is exactly the failure this
 * library exists to prevent.
 */
adminRouter.post(
  '/admin/sources/:id/publish',
  requireRole('admin'),
  validate({ params: idParam, body: z.object({ published: z.boolean() }) }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const { published } = req.body as { published: boolean };

    const [existing] = await db.select().from(source).where(eq(source.id, id)).limit(1);
    if (!existing) throw AppError.notFound('No source with that id');

    if (published) {
      if (existing.chunkCount === 0) {
        throw AppError.badRequest(
          'Cannot publish a source with no chunks — run /process on it first.',
        );
      }
      if (existing.verificationStatus === 'disputed') {
        throw AppError.badRequest(
          'Cannot publish a source whose verification status is "disputed". ' +
            'Resolve the dispute or leave it withheld.',
        );
      }
      if (
        existing.rightsStatus === 'permission_required' ||
        existing.rightsStatus === 'copyright'
      ) {
        throw AppError.badRequest(
          `Cannot publish a source with rights status '${existing.rightsStatus}'.`,
        );
      }
    }

    const [updated] = await db
      .update(source)
      .set({ published, updatedAt: new Date() })
      .where(eq(source.id, id))
      .returning();
    if (!updated) throw AppError.internal('Failed to update source');

    await refreshPersonCounts(existing.historicalPersonId);

    await recordAudit(req, {
      action: published ? 'admin.source.publish' : 'admin.source.unpublish',
      entityType: 'source',
      entityId: id,
      metadata: { title: existing.title },
    });

    res.json(toAdminSourceDetail(updated));
  }),
);

adminRouter.delete(
  '/admin/sources/:id',
  requireRole('admin'),
  validate({ params: idParam }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const [existing] = await db.select().from(source).where(eq(source.id, id)).limit(1);
    if (!existing) throw AppError.notFound('No source with that id');

    // Chunks cascade on the foreign key, so the relationship can never be
    // half-torn-down.
    await db.delete(source).where(eq(source.id, id));
    await refreshPersonCounts(existing.historicalPersonId);

    await recordAudit(req, {
      action: 'admin.source.delete',
      entityType: 'source',
      entityId: id,
      metadata: { title: existing.title, chunkCount: existing.chunkCount },
    });

    res.status(204).send();
  }),
);

// ------------------------------------------------------------------- people

adminRouter.get(
  '/admin/people',
  asyncHandler(async (_req, res) => {
    const rows = await db
      .select()
      .from(historicalPerson)
      .orderBy(desc(historicalPerson.published), historicalPerson.displayName);
    res.json({ items: rows, total: rows.length });
  }),
);

adminRouter.post(
  '/admin/people/:id/persona',
  asyncHandler(async () => {
    throw AppError.notImplemented('Persona generation arrives in Phase 4.');
  }),
);
