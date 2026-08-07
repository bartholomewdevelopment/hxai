import {
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { EMBEDDING_DIMENSIONS } from '@historyai/shared';
import { historicalPerson } from './people';
import { source } from './sources';

/**
 * A retrievable passage of a source — the unit the RAG pipeline searches over.
 *
 * `text` is stored verbatim. Quotations shown to users are sliced from this
 * column, never regenerated, which is what makes "quotations are verbatim"
 * checkable rather than merely intended.
 *
 * `historicalPersonId` is denormalised from the parent source so that the hot
 * retrieval query — filter by person, filter by date, order by vector distance
 * — never needs a join.
 */
export const sourceChunk = pgTable(
  'source_chunk',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceId: uuid('source_id')
      .notNull()
      .references(() => source.id, { onDelete: 'cascade' }),
    historicalPersonId: uuid('historical_person_id')
      .notNull()
      .references(() => historicalPerson.id, { onDelete: 'cascade' }),

    /** Position within the parent source; used to stitch adjacent context. */
    chunkIndex: integer('chunk_index').notNull(),
    text: text('text').notNull(),
    tokenCount: integer('token_count'),

    /** Locators for the citation footer. */
    pageNumber: integer('page_number'),
    chapter: text('chapter'),
    section: text('section'),

    /**
     * Effective date of *this passage*, which can differ from the source's own
     * date — a collected-works volume published in 1905 may contain a letter
     * written in 1862. Temporal retrieval and knowledge-cutoff filtering read
     * this column in preference to `source.date_created`.
     */
    dateContext: date('date_context'),

    topicTags: text('topic_tags').array().notNull().default([]),

    /**
     * Null until the chunk is embedded (Phase 2). Dimensionality is fixed at
     * migration time — see EMBEDDING_DIMENSIONS. Switching to a model with a
     * different width requires a migration and a full re-embed.
     */
    embedding: vector('embedding', { dimensions: EMBEDDING_DIMENSIONS }),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('source_chunk_source_index_uq').on(table.sourceId, table.chunkIndex),
    index('source_chunk_person_idx').on(table.historicalPersonId),
    index('source_chunk_person_date_idx').on(table.historicalPersonId, table.dateContext),
    /**
     * HNSW index for cosine similarity. Present from Phase 1 so the query plan
     * the retrieval layer is built against is the one it ships on; it simply
     * indexes zero rows until ingestion runs.
     *
     * If bulk ingestion proves slow, drop this index, load, and recreate — the
     * usual pgvector build order.
     */
    index('source_chunk_embedding_hnsw_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ],
);

export type SourceChunkRow = typeof sourceChunk.$inferSelect;
export type NewSourceChunkRow = typeof sourceChunk.$inferInsert;
