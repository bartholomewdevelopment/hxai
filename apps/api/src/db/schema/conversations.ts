import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { Citation } from '@historyai/shared';
import { users } from './users';
import { historicalPerson } from './people';
import { messageRoleEnum } from './enums';

/**
 * A conversation between a user and one or more historical figures.
 *
 * `historicalPersonId` is the primary participant — the figure whose page the
 * conversation started from, and the one the UI is titled after. Additional
 * figures live in `conversation_participant`, so adding a second voice to an
 * existing conversation is an insert rather than a schema change.
 */
export const conversation = pgTable(
  'conversation',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    historicalPersonId: uuid('historical_person_id')
      .notNull()
      .references(() => historicalPerson.id, { onDelete: 'cascade' }),
    title: text('title'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('conversation_user_idx').on(table.userId),
    index('conversation_person_idx').on(table.historicalPersonId),
    index('conversation_updated_at_idx').on(table.updatedAt),
  ],
);

/** Every figure taking part, including the primary one. */
export const conversationParticipant = pgTable(
  'conversation_participant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    historicalPersonId: uuid('historical_person_id')
      .notNull()
      .references(() => historicalPerson.id, { onDelete: 'cascade' }),
    /** Display order in a multi-voice transcript. */
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('conversation_participant_uq').on(table.conversationId, table.historicalPersonId),
  ],
);

export const message = pgTable(
  'message',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversation.id, { onDelete: 'cascade' }),
    role: messageRoleEnum('role').notNull(),

    /** Which figure spoke, for assistant turns in a multi-person conversation. */
    speakerPersonId: uuid('speaker_person_id').references(() => historicalPerson.id, {
      onDelete: 'set null',
    }),

    content: text('content').notNull(),

    /**
     * Citations rendered under the message, denormalised at write time.
     *
     * Every entry is built from a stored `source` row during response assembly.
     * Snapshotting them here means a historical transcript keeps showing what
     * the user was actually shown, even if a source is later re-catalogued —
     * and it keeps the render path from depending on live joins.
     */
    citations: jsonb('citations').$type<Citation[]>().notNull().default([]),

    /**
     * The chunks that were retrieved for this turn, in rank order. Kept for
     * evaluation and auditing: it is the record of what the model was actually
     * shown, which is what makes a grounding failure diagnosable.
     */
    retrievedSourceChunkIds: uuid('retrieved_source_chunk_ids').array().notNull().default([]),

    /** Latency, token counts, model id, retrieval scores. */
    metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('message_conversation_idx').on(table.conversationId, table.createdAt)],
);

export type ConversationRow = typeof conversation.$inferSelect;
export type MessageRow = typeof message.$inferSelect;
