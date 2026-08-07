import { and, eq, isNotNull, sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client';
import { historicalPerson, source, sourceChunk } from '../../db/schema/index';
import type { RetrievalQuery, RetrievalService, RetrievedChunk } from '../types';
import { getServices } from '../registry';

/**
 * Hybrid retrieval over pgvector.
 *
 * Three signals, combined:
 *
 * 1. **Vector** — cosine distance over the chunk embedding. Finds passages that
 *    mean the same thing in different words, which is most of what a
 *    conversational question needs.
 * 2. **Keyword** — Postgres full-text search over the chunk text. Vector search
 *    is weak exactly where this is strong: rare proper nouns, statute names,
 *    and archaic terms that sit off the manifold. "Habeas corpus" and
 *    "Jonesboro" must be findable literally.
 * 3. **Metadata** — SQL predicates on person, date, and source type. These are
 *    filters, not scores: they define what is *eligible*, and no amount of
 *    semantic similarity may override them.
 *
 * Scores are fused with Reciprocal Rank Fusion rather than a weighted sum of
 * raw scores. Cosine distance and ts_rank are not on comparable scales and
 * their distributions shift with corpus and query; RRF only uses the *rank* in
 * each list, so it needs no per-corpus tuning and cannot be skewed by one
 * signal's outliers.
 *
 * The date filter is the load-bearing part. A figure's knowledge cutoff is
 * enforced here, in the WHERE clause, so post-cutoff material is never in the
 * candidate set at all — as opposed to asking the model to ignore what it was
 * shown.
 */

/** RRF damping constant. 60 is the value from the original TREC work. */
const RRF_K = 60;

/** Candidates drawn from each signal before fusion. */
const CANDIDATE_DEPTH = 40;

interface ScoredRow {
  chunkId: string;
  sourceId: string;
  historicalPersonId: string;
  text: string;
  sourceTitle: string;
  sourceAuthor: string | null;
  sourceType: 'primary' | 'contemporary' | 'scholarly';
  dateContext: string | null;
  pageNumber: number | null;
  corpusSlug: string | null;
}

export class PgVectorRetrievalService implements RetrievalService {
  /**
   * Eligibility predicates shared by both signals.
   *
   * Both branches must apply exactly the same filters, or a chunk excluded by
   * the vector branch could re-enter through the keyword branch and bypass the
   * knowledge cutoff. Building them once is what makes that impossible.
   */
  private eligibility(query: RetrievalQuery): SQL[] {
    const filters: SQL[] = [
      eq(sourceChunk.historicalPersonId, query.historicalPersonId),
      eq(source.published, true),
      eq(historicalPerson.published, true),
    ];

    if (query.notAfterDate) {
      // Chunks with no date are excluded from date-bounded queries. Excluding
      // them can only lose recall; including them could leak material from
      // after the cutoff, which is the one failure that is not acceptable.
      filters.push(
        sql`${sourceChunk.dateContext} IS NOT NULL AND ${sourceChunk.dateContext} <= ${query.notAfterDate}::date`,
      );
    }

    if (query.sourceTypes && query.sourceTypes.length > 0) {
      filters.push(sql`${source.sourceType} = ANY(${query.sourceTypes}::source_type[])`);
    }

    return filters;
  }

  async retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]> {
    const limit = query.limit ?? 8;
    const services = getServices();

    const vector = await services.embedding.embed(query.query);
    const literal = `[${vector.join(',')}]`;
    const filters = this.eligibility(query);

    const select = {
      chunkId: sourceChunk.id,
      sourceId: source.id,
      historicalPersonId: sourceChunk.historicalPersonId,
      text: sourceChunk.text,
      sourceTitle: source.title,
      sourceAuthor: source.author,
      sourceType: source.sourceType,
      dateContext: sourceChunk.dateContext,
      pageNumber: sourceChunk.pageNumber,
      corpusSlug: sql<string | null>`${source.metadata}->>'corpusSlug'`,
    };

    const [vectorHits, keywordHits] = await Promise.all([
      db
        .select(select)
        .from(sourceChunk)
        .innerJoin(source, eq(sourceChunk.sourceId, source.id))
        .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
        .where(and(...filters, isNotNull(sourceChunk.embedding)))
        .orderBy(sql`${sourceChunk.embedding} <=> ${literal}::vector`)
        .limit(CANDIDATE_DEPTH),

      db
        .select(select)
        .from(sourceChunk)
        .innerJoin(source, eq(sourceChunk.sourceId, source.id))
        .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
        .where(
          and(
            ...filters,
            sql`to_tsvector('english', ${sourceChunk.text}) @@ websearch_to_tsquery('english', ${query.query})`,
          ),
        )
        .orderBy(
          sql`ts_rank(to_tsvector('english', ${sourceChunk.text}), websearch_to_tsquery('english', ${query.query})) DESC`,
        )
        .limit(CANDIDATE_DEPTH),
    ]);

    return this.fuse(vectorHits, keywordHits, limit);
  }

  /** Reciprocal Rank Fusion over the two candidate lists. */
  private fuse(vectorHits: ScoredRow[], keywordHits: ScoredRow[], limit: number): RetrievedChunk[] {
    const scores = new Map<string, { row: ScoredRow; score: number }>();

    const contribute = (rows: ScoredRow[]) => {
      rows.forEach((row, rank) => {
        const existing = scores.get(row.chunkId);
        const contribution = 1 / (RRF_K + rank + 1);
        if (existing) existing.score += contribution;
        else scores.set(row.chunkId, { row, score: contribution });
      });
    };

    contribute(vectorHits);
    contribute(keywordHits);

    return [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ row, score }) => ({
        chunkId: row.chunkId,
        sourceId: row.sourceId,
        historicalPersonId: row.historicalPersonId,
        text: row.text,
        score,
        sourceTitle: row.sourceTitle,
        sourceAuthor: row.sourceAuthor,
        sourceType: row.sourceType,
        dateContext: row.dateContext,
        pageNumber: row.pageNumber,
      }));
  }

  /** Which signals fired, for diagnostics. Used by the sanity-check script. */
  async explain(query: RetrievalQuery): Promise<{
    vectorSlugs: string[];
    keywordSlugs: string[];
    fusedSlugs: string[];
  }> {
    const services = getServices();
    const vector = await services.embedding.embed(query.query);
    const literal = `[${vector.join(',')}]`;
    const filters = this.eligibility(query);

    const select = {
      corpusSlug: sql<string | null>`${source.metadata}->>'corpusSlug'`,
      title: source.title,
    };

    const [vectorHits, keywordHits] = await Promise.all([
      db
        .select(select)
        .from(sourceChunk)
        .innerJoin(source, eq(sourceChunk.sourceId, source.id))
        .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
        .where(and(...filters, isNotNull(sourceChunk.embedding)))
        .orderBy(sql`${sourceChunk.embedding} <=> ${literal}::vector`)
        .limit(8),
      db
        .select(select)
        .from(sourceChunk)
        .innerJoin(source, eq(sourceChunk.sourceId, source.id))
        .innerJoin(historicalPerson, eq(source.historicalPersonId, historicalPerson.id))
        .where(
          and(
            ...filters,
            sql`to_tsvector('english', ${sourceChunk.text}) @@ websearch_to_tsquery('english', ${query.query})`,
          ),
        )
        .orderBy(
          sql`ts_rank(to_tsvector('english', ${sourceChunk.text}), websearch_to_tsquery('english', ${query.query})) DESC`,
        )
        .limit(8),
    ]);

    const fused = await this.retrieve({ ...query, limit: 8 });
    const [byId] = await Promise.all([
      db
        .select({ id: source.id, slug: sql<string | null>`${source.metadata}->>'corpusSlug'` })
        .from(source),
    ]);
    const slugById = new Map(byId.map((row) => [row.id, row.slug]));

    return {
      vectorSlugs: [...new Set(vectorHits.map((h) => h.corpusSlug ?? h.title))],
      keywordSlugs: [...new Set(keywordHits.map((h) => h.corpusSlug ?? h.title))],
      fusedSlugs: [...new Set(fused.map((h) => slugById.get(h.sourceId) ?? h.sourceTitle))].filter(
        (value): value is string => value !== null,
      ),
    };
  }
}
