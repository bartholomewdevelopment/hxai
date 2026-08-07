import { createHash } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { historicalPerson, source, sourceChunk } from '../../db/schema/index';
import type { SourceRow } from '../../db/schema/sources';
import { AppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import { extractText } from '../extraction/profiles';
import { chunkText, type ChunkOptions } from '../chunking/chunker';
import { getServices } from '../registry';

/**
 * The ingestion pipeline: fetch -> extract -> clean -> chunk -> store -> embed.
 *
 * Two invariants hold throughout:
 *
 * 1. **The chunk-to-source relationship is never lost.** Chunks are only ever
 *    replaced inside a transaction that rewrites the whole set for one source,
 *    and `source_id` is NOT NULL with a cascade. There is no code path that
 *    orphans a chunk or leaves a source half-chunked on success.
 *
 * 2. **The original text is preserved.** `source.full_text` holds the cleaned
 *    transcription in full, and chunking never mutates it. Chunk text is a
 *    substring of it, which is what makes verbatim quotation checkable.
 */

export const USER_AGENT =
  'HistoryAI/0.2 (source ingestion for a cited historical library; contact: repo owner)';

export interface FetchResult {
  body: string;
  contentType: string;
  finalUrl: string;
}

/** Download a document. Kept separate so ingestion can be tested offline. */
export async function fetchDocument(url: string, timeoutMs = 30_000): Promise<FetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,text/plain,application/json' },
      signal: controller.signal,
      redirect: 'follow',
    });

    if (!response.ok) {
      throw AppError.badRequest(`Fetch failed for ${url}: HTTP ${response.status}`);
    }

    return {
      body: await response.text(),
      contentType: response.headers.get('content-type') ?? 'text/html',
      finalUrl: response.url || url,
    };
  } finally {
    clearTimeout(timer);
  }
}

export function hashContent(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function setStatus(
  sourceId: string,
  status: SourceRow['processingStatus'],
  error?: string | null,
): Promise<void> {
  await db
    .update(source)
    .set({ processingStatus: status, processingError: error ?? null, updatedAt: new Date() })
    .where(eq(source.id, sourceId));
}

export interface ProcessOptions extends ChunkOptions {
  /** Re-chunk even when the content hash is unchanged. */
  force?: boolean;
}

export interface ProcessResult {
  sourceId: string;
  title: string;
  status: SourceRow['processingStatus'];
  chunksCreated: number;
  charactersStored: number;
  extractionProfile: string | null;
  warnings: string[];
  skipped: boolean;
}

/**
 * Run a source through extraction and chunking.
 *
 * Text comes from `source.full_text` when it was pasted in directly, and is
 * otherwise downloaded from `transcription_url` (falling back to
 * `canonical_url`). Embedding is a separate step so a corpus can be fully
 * ingested with no API key present.
 */
export async function processSource(
  sourceId: string,
  options: ProcessOptions = {},
): Promise<ProcessResult> {
  const [row] = await db.select().from(source).where(eq(source.id, sourceId)).limit(1);
  if (!row) throw AppError.notFound(`No source with id ${sourceId}`);

  const warnings: string[] = [];
  let extractionProfile: string | null = null;

  try {
    let text: string;

    if (row.fullText && row.fullText.trim().length > 0 && !options.force) {
      // Text was supplied directly (pasted, or preserved from a prior run).
      text = row.fullText;
    } else {
      const url = row.transcriptionUrl ?? row.canonicalUrl;
      if (!url) {
        throw AppError.badRequest(
          'Source has neither stored full text nor a URL to retrieve it from',
        );
      }

      await setStatus(sourceId, 'fetching');
      const fetched = await fetchDocument(url);

      await setStatus(sourceId, 'extracting');
      const extracted = extractText(
        { body: fetched.body, url: fetched.finalUrl },
        fetched.contentType,
      );
      text = extracted.text;
      extractionProfile = extracted.profile;
      warnings.push(...extracted.warnings);

      await db
        .update(source)
        .set({
          fullText: text,
          retrievedFrom: fetched.finalUrl,
          retrievedAt: new Date(),
          metadata: {
            ...row.metadata,
            extractionProfile: extracted.profile,
            charactersRemovedInCleaning: extracted.charactersRemoved,
          },
          updatedAt: new Date(),
        })
        .where(eq(source.id, sourceId));
    }

    if (text.trim().length === 0) {
      throw AppError.badRequest('Extraction produced no text');
    }

    const contentHash = hashContent(text);

    // Idempotency: identical text means the existing chunks (and any vectors
    // already computed against them) are still correct, so leave them alone.
    if (!options.force && row.contentHash === contentHash && row.chunkCount > 0) {
      await setStatus(sourceId, row.embeddedAt ? 'ready' : 'chunked');
      return {
        sourceId,
        title: row.title,
        status: row.embeddedAt ? 'ready' : 'chunked',
        chunksCreated: row.chunkCount,
        charactersStored: text.length,
        extractionProfile,
        warnings,
        skipped: true,
      };
    }

    await setStatus(sourceId, 'chunking');
    const chunks = chunkText(text, options);
    if (chunks.length === 0) throw AppError.badRequest('Chunking produced no chunks');

    // Replace the chunk set atomically. A failure here rolls back to the
    // previous set rather than leaving the source with none.
    await db.transaction(async (tx) => {
      await tx.delete(sourceChunk).where(eq(sourceChunk.sourceId, sourceId));

      await tx.insert(sourceChunk).values(
        chunks.map((chunk) => ({
          sourceId,
          historicalPersonId: row.historicalPersonId,
          chunkIndex: chunk.index,
          text: chunk.text,
          tokenCount: chunk.tokenCount,
          // The chunk normally inherits the source's date so temporal
          // retrieval works without a join. Sources that declare their
          // per-chunk dates unknown (collected volumes) store NULL instead:
          // an unknown date must not masquerade as a known one, because the
          // date filter is what enforces the knowledge cutoff.
          dateContext: (row.metadata as { perChunkDatesUnknown?: boolean }).perChunkDatesUnknown
            ? null
            : row.dateCreated,
          metadata: {
            startOffset: chunk.startOffset,
            endOffset: chunk.endOffset,
          },
        })),
      );

      await tx
        .update(source)
        .set({
          contentHash,
          chunkCount: chunks.length,
          processingStatus: 'chunked',
          processingError: null,
          processedAt: new Date(),
          // Text changed, so any existing vectors are stale.
          embeddedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(source.id, sourceId));
    });

    await refreshPersonCounts(row.historicalPersonId);

    return {
      sourceId,
      title: row.title,
      status: 'chunked',
      chunksCreated: chunks.length,
      charactersStored: text.length,
      extractionProfile,
      warnings,
      skipped: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setStatus(sourceId, 'failed', message);
    logger.error('Source processing failed', { sourceId, title: row.title, error: message });
    throw error;
  }
}

export interface EmbedResult {
  sourceId: string;
  title: string;
  chunksEmbedded: number;
  skipped: boolean;
}

/**
 * Embed a source's chunks.
 *
 * Only chunks whose `embedding` is NULL are sent, so a run interrupted halfway
 * resumes rather than restarting — and re-running after a completed pass is a
 * no-op. `force` clears the vectors first, which is the path used when
 * switching providers for the A/B.
 */
export async function embedSource(
  sourceId: string,
  options: { force?: boolean; batchSize?: number } = {},
): Promise<EmbedResult> {
  const services = getServices();
  const batchSize = options.batchSize ?? 64;

  const [row] = await db.select().from(source).where(eq(source.id, sourceId)).limit(1);
  if (!row) throw AppError.notFound(`No source with id ${sourceId}`);

  if (options.force) {
    await db.update(sourceChunk).set({ embedding: null }).where(eq(sourceChunk.sourceId, sourceId));
  }

  const pending = await db
    .select({ id: sourceChunk.id, text: sourceChunk.text })
    .from(sourceChunk)
    .where(and(eq(sourceChunk.sourceId, sourceId), isNull(sourceChunk.embedding)))
    .orderBy(sourceChunk.chunkIndex);

  if (pending.length === 0) {
    await db
      .update(source)
      .set({ processingStatus: 'ready', embeddedAt: row.embeddedAt ?? new Date() })
      .where(eq(source.id, sourceId));
    return { sourceId, title: row.title, chunksEmbedded: 0, skipped: true };
  }

  await setStatus(sourceId, 'embedding');

  let embedded = 0;
  try {
    for (let i = 0; i < pending.length; i += batchSize) {
      const batch = pending.slice(i, i + batchSize);
      const vectors = await services.embedding.embedBatch(batch.map((chunk) => chunk.text));

      // Written one row at a time and paired by position within the batch, so
      // a vector can never be attached to the wrong chunk.
      await db.transaction(async (tx) => {
        for (const [offset, chunk] of batch.entries()) {
          const vector = vectors[offset];
          if (!vector) throw AppError.internal(`Missing embedding for chunk ${chunk.id}`);
          await tx
            .update(sourceChunk)
            .set({ embedding: vector, updatedAt: new Date() })
            .where(eq(sourceChunk.id, chunk.id));
        }
      });

      embedded += batch.length;
      logger.info(`Embedded ${embedded}/${pending.length} chunks`, { title: row.title });
    }

    await db
      .update(source)
      .set({
        processingStatus: 'ready',
        processingError: null,
        embeddedAt: new Date(),
        metadata: {
          ...row.metadata,
          embeddingProvider: services.embedding.model,
          embeddingDimensions: services.embedding.dimensions,
        },
        updatedAt: new Date(),
      })
      .where(eq(source.id, sourceId));

    return { sourceId, title: row.title, chunksEmbedded: embedded, skipped: false };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await setStatus(sourceId, 'failed', `Embedding failed after ${embedded} chunks: ${message}`);
    throw error;
  }
}

/**
 * Recompute a person's denormalised counts from the sources table.
 *
 * Only published, fully processed sources count — the number on a person's
 * card should mean "documents you can actually be shown", not "rows we have".
 */
export async function refreshPersonCounts(personId: string): Promise<void> {
  await db
    .update(historicalPerson)
    .set({
      sourceCount: sql`(
        SELECT count(*) FROM ${source}
        WHERE ${source.historicalPersonId} = ${personId}
          AND ${source.published} = true
      )`,
      updatedAt: new Date(),
    })
    .where(eq(historicalPerson.id, personId));
}
