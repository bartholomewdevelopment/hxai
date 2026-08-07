import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { historicalPerson } from './people';
import { mediaKindEnum, rightsStatusEnum, verificationStatusEnum } from './enums';
import { source } from './sources';

/**
 * Audio and video hold recordings *of* or *about* a figure. Architecture only
 * in Phase 1 — nothing writes to these tables yet.
 *
 * Both carry a nullable `transcriptSourceId` pointing at a `source` row. That
 * is the hinge: once a recording is transcribed, its transcript becomes an
 * ordinary source, gets chunked and embedded like any other, and is cited
 * through exactly the same path. Media never becomes a second, parallel
 * retrieval system.
 *
 * `kind` matters for provenance: an 1888 wax-cylinder recording of the figure
 * is evidence; a modern documentary narration is not, and must never be quoted
 * as the figure's own words.
 */

export const audioSource = pgTable(
  'audio_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    historicalPersonId: uuid('historical_person_id')
      .notNull()
      .references(() => historicalPerson.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    description: text('description'),
    kind: mediaKindEnum('kind').notNull().default('recording'),

    /** Speaker on the recording — not necessarily the historical person. */
    speaker: text('speaker'),
    recordedDate: date('recorded_date'),
    approximateDate: text('approximate_date'),

    durationSeconds: integer('duration_seconds'),
    audioUrl: text('audio_url'),
    /** Object-storage key for our own copy. */
    localFileUrl: text('local_file_url'),
    format: text('format'),
    language: text('language').notNull().default('en'),

    archiveName: text('archive_name'),
    collectionName: text('collection_name'),
    canonicalUrl: text('canonical_url'),

    /** Set once transcribed; the transcript is an ordinary citable source. */
    transcriptSourceId: uuid('transcript_source_id').references(() => source.id, {
      onDelete: 'set null',
    }),
    transcriptionCompleted: boolean('transcription_completed').notNull().default(false),

    rightsStatus: rightsStatusEnum('rights_status').notNull().default('unknown'),
    rightsNotes: text('rights_notes'),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('audio_source_person_idx').on(table.historicalPersonId),
    index('audio_source_kind_idx').on(table.kind),
  ],
);

export const videoSource = pgTable(
  'video_source',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    historicalPersonId: uuid('historical_person_id')
      .notNull()
      .references(() => historicalPerson.id, { onDelete: 'cascade' }),

    title: text('title').notNull(),
    description: text('description'),
    kind: mediaKindEnum('kind').notNull().default('documentary'),

    recordedDate: date('recorded_date'),
    approximateDate: text('approximate_date'),

    durationSeconds: integer('duration_seconds'),
    videoUrl: text('video_url'),
    localFileUrl: text('local_file_url'),
    thumbnailUrl: text('thumbnail_url'),
    format: text('format'),
    language: text('language').notNull().default('en'),

    archiveName: text('archive_name'),
    collectionName: text('collection_name'),
    canonicalUrl: text('canonical_url'),

    transcriptSourceId: uuid('transcript_source_id').references(() => source.id, {
      onDelete: 'set null',
    }),
    transcriptionCompleted: boolean('transcription_completed').notNull().default(false),

    rightsStatus: rightsStatusEnum('rights_status').notNull().default('unknown'),
    rightsNotes: text('rights_notes'),
    verificationStatus: verificationStatusEnum('verification_status')
      .notNull()
      .default('unverified'),

    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('video_source_person_idx').on(table.historicalPersonId),
    index('video_source_kind_idx').on(table.kind),
  ],
);

export type AudioSourceRow = typeof audioSource.$inferSelect;
export type VideoSourceRow = typeof videoSource.$inferSelect;
