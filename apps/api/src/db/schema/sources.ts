import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { historicalPerson } from './people';
import {
  rightsStatusEnum,
  sourceProcessingStatusEnum,
  sourceTypeEnum,
  verificationStatusEnum,
} from './enums';

/**
 * A document attributed to or about a historical figure.
 *
 * This table is the sole origin of every citation the application ever shows.
 * Titles, authors, archives, and URLs are read from here at response-assembly
 * time — the model is never asked to supply them, and a URL that is not in this
 * table cannot appear in a response.
 */
export const source = pgTable(
  'source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    historicalPersonId: uuid('historical_person_id')
      .notNull()
      .references(() => historicalPerson.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    author: text('author'),
    /** e.g. 'letter', 'speech', 'diary entry', 'newspaper article'. */
    documentType: text('document_type'),

    /**
     * Dating is first-class so retrieval can be filtered and weighted by time
     * (knowledge cutoffs, "what did you think in 1858?"). `dateCreated` is the
     * machine-comparable value; `approximateDate` carries the human hedge
     * ("circa 1858", "spring 1776") for display when precision is unavailable.
     */
    dateCreated: date('date_created'),
    approximateDate: text('approximate_date'),
    historicalPeriod: text('historical_period'),

    description: text('description'),
    archiveName: text('archive_name'),
    collectionName: text('collection_name'),

    /** Citation target shown to the user. */
    canonicalUrl: text('canonical_url'),
    /** Scan or facsimile of the original document. */
    originalDocumentUrl: text('original_document_url'),
    transcriptionUrl: text('transcription_url'),
    /** Object-storage key for our own copy, resolved via StorageService. */
    localFileUrl: text('local_file_url'),

    /** Full transcription. Chunked into `source_chunk` during ingestion. */
    fullText: text('full_text'),
    language: text('language').notNull().default('en'),
    translated: boolean('translated').notNull().default(false),
    translator: text('translator'),

    /** Provenance tier — drives retrieval weighting and citation labelling. */
    sourceType: sourceTypeEnum('source_type').notNull().default('primary'),

    rightsStatus: rightsStatusEnum('rights_status').notNull().default('unknown'),
    copyrightJurisdiction: text('copyright_jurisdiction'),
    rightsNotes: text('rights_notes'),

    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),

    /**
     * Public visibility, independent of processing state. A source can be
     * fully ingested and still withheld — for example while its transcription
     * is being checked against the scan, or while authorship is disputed.
     * Retrieval only ever considers published sources.
     */
    published: boolean('published').notNull().default(false),

    /** Ingestion pipeline position. See SOURCE_PROCESSING_STATUSES. */
    processingStatus: sourceProcessingStatusEnum('processing_status').notNull().default('pending'),
    /** Failure detail when processingStatus is 'failed'. */
    processingError: text('processing_error'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    embeddedAt: timestamp('embedded_at', { withTimezone: true }),

    /** Denormalised count of rows in source_chunk, maintained by ingestion. */
    chunkCount: integer('chunk_count').notNull().default(0),

    /**
     * SHA-256 of the cleaned full text. Ingestion is idempotent on this: a
     * re-run whose extraction produces identical text skips re-chunking, so
     * existing chunk ids (and any embeddings already computed against them)
     * survive. Re-embedding for a provider A/B therefore never has to
     * re-download or re-chunk anything.
     */
    contentHash: text('content_hash'),

    /**
     * The exact URL the text was retrieved from, when it differs from the
     * canonical citation target. Kept so a transcription can always be traced
     * back to what was actually downloaded.
     */
    retrievedFrom: text('retrieved_from'),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    /**
     * Natural key for corpus ingestion. A person cannot hold two documents
     * under the same title, which lets `corpus:ingest` upsert rather than
     * duplicate on every re-run.
     */
    uniqueIndex('source_person_title_uq').on(table.historicalPersonId, table.title),
    index('source_person_idx').on(table.historicalPersonId),
    index('source_type_idx').on(table.sourceType),
    index('source_rights_idx').on(table.rightsStatus),
    index('source_verification_idx').on(table.verificationStatus),
    index('source_published_idx').on(table.published),
    index('source_processing_status_idx').on(table.processingStatus),
    /** Supports temporal filtering and knowledge-cutoff enforcement. */
    index('source_person_date_idx').on(table.historicalPersonId, table.dateCreated),
  ],
);

export type SourceRow = typeof source.$inferSelect;
export type NewSourceRow = typeof source.$inferInsert;
