import { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { historicalPerson, source, sourceChunk } from '../db/schema/index';
import { asyncHandler } from '../lib/asyncHandler';
import { AppError } from '../lib/errors';
import { validate } from '../middleware/validate';
import { toSourceDetail } from './serializers';

export const sourcesRouter: Router = Router();

/**
 * Public source viewer.
 *
 * A source is public only when its person is published *and* the source itself
 * is published. Reachability follows the figure, so unpublishing a person hides
 * their whole library in one move, and a document held back for disputed
 * authorship stays invisible regardless.
 *
 * **Chunk and vector ids are never exposed.** A citation resolves to a passage
 * by *offset into the document*, not by internal id: `?passage=1234-1890`. That
 * keeps the URL meaningful to a reader, survives re-chunking (offsets are into
 * the stored text, which is stable), and leaks nothing about the retrieval
 * index.
 */

const publicSourceWhere = (id: string) =>
  and(eq(source.id, id), eq(source.published, true), eq(historicalPerson.published, true));

const passageSchema = z
  .string()
  .regex(/^\d{1,9}-\d{1,9}$/, 'passage must look like "start-end"')
  .optional();

sourcesRouter.get(
  '/sources/:id',
  validate({
    params: z.object({ id: z.string().uuid() }),
    query: z.object({ passage: passageSchema }),
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const { passage } = req.query as unknown as { passage?: string };

    const [row] = await db
      .select({
        source,
        personSlug: historicalPerson.slug,
        personName: historicalPerson.displayName,
      })
      .from(source)
      .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
      .where(publicSourceWhere(id))
      .limit(1);

    if (!row) throw AppError.notFound('No source with that id');

    const detail = toSourceDetail(row.source);

    // Resolve the requested passage against the stored text. Clamped to the
    // document rather than trusted, so a malformed range cannot read past the
    // end or return an inverted slice.
    let highlight: { start: number; end: number; text: string } | null = null;
    if (passage && detail.fullText) {
      const [rawStart, rawEnd] = passage.split('-').map(Number);
      const start = Math.max(0, Math.min(rawStart ?? 0, detail.fullText.length));
      const end = Math.max(start, Math.min(rawEnd ?? 0, detail.fullText.length));
      if (end > start) {
        highlight = { start, end, text: detail.fullText.slice(start, end) };
      }
    }

    res.json({
      ...detail,
      person: { slug: row.personSlug, displayName: row.personName },
      highlight,
    });
  }),
);

/**
 * Resolve a passage to its position in a document.
 *
 * Phase 3's citation renderer calls this to turn "this chunk" into "this
 * offset range", so the reader lands on the exact text a claim was drawn from.
 * It takes a chunk id but returns only offsets — the id goes in, nothing about
 * the index comes out.
 */
sourcesRouter.get(
  '/sources/:id/passage',
  validate({
    params: z.object({ id: z.string().uuid() }),
    query: z.object({ chunk: z.string().uuid() }),
  }),
  asyncHandler(async (req, res) => {
    const { id } = req.params as unknown as { id: string };
    const { chunk } = req.query as unknown as { chunk: string };

    const [row] = await db
      .select({ chunk: sourceChunk, sourceId: source.id })
      .from(sourceChunk)
      .innerJoin(source, eq(sourceChunk.sourceId, source.id))
      .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
      .where(and(eq(sourceChunk.id, chunk), publicSourceWhere(id)))
      .limit(1);

    if (!row) throw AppError.notFound('No such passage in that source');

    const metadata = row.chunk.metadata as { startOffset?: number; endOffset?: number };

    res.json({
      text: row.chunk.text,
      pageNumber: row.chunk.pageNumber,
      chapter: row.chunk.chapter,
      section: row.chunk.section,
      dateContext: row.chunk.dateContext,
      // Offsets only — no chunk id, no vector, no index detail.
      start: metadata.startOffset ?? null,
      end: metadata.endOffset ?? null,
    });
  }),
);
