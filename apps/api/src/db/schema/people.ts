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
import { EMPTY_PERSONA_CONFIGURATION, type PersonaConfiguration } from '@historyai/shared';

/**
 * A historical figure the library can reconstruct.
 *
 * `knowledgeCutoffDate` is the temporal boundary of the persona. From Phase 3
 * it is applied as a retrieval filter — chunks dated after the cutoff are never
 * returned — so the figure cannot discuss events they did not live to see.
 * That is enforced in SQL rather than by prompting.
 */
export const historicalPerson = pgTable(
  'historical_person',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** URL identity: /people/abraham-lincoln. Stable once published. */
    slug: text('slug').notNull().unique(),
    fullName: text('full_name').notNull(),
    displayName: text('display_name').notNull(),

    /**
     * Dates are `date` (not timestamp) throughout: historical dating has
     * day-level precision at best, and timezone-shifting a 19th-century
     * birthday is meaningless. Nullable because many figures' dates are unknown.
     */
    birthDate: date('birth_date'),
    deathDate: date('death_date'),
    birthplace: text('birthplace'),
    deathPlace: text('death_place'),
    nationality: text('nationality'),
    occupations: text('occupations').array().notNull().default([]),
    historicalEra: text('historical_era'),
    categories: text('categories').array().notNull().default([]),

    shortBiography: text('short_biography'),
    longBiography: text('long_biography'),
    portraitUrl: text('portrait_url'),
    heroImageUrl: text('hero_image_url'),

    /** Temporal boundary of the persona. See note above. */
    knowledgeCutoffDate: date('knowledge_cutoff_date'),

    published: boolean('published').notNull().default(false),
    featured: boolean('featured').notNull().default(false),

    /**
     * Denormalised counts, maintained by the ingestion pipeline in Phase 2.
     * The directory grid reads them directly rather than aggregating per card.
     */
    sourceCount: integer('source_count').notNull().default(0),
    audioSourceCount: integer('audio_source_count').notNull().default(0),
    videoSourceCount: integer('video_source_count').notNull().default(0),

    /**
     * Persona voice model — see PersonaConfiguration in @historyai/shared.
     * JSONB rather than its own table: it is read whole, written whole, always
     * exactly one per person, and its shape is still moving.
     */
    personaConfiguration: jsonb('persona_configuration')
      .$type<PersonaConfiguration>()
      .notNull()
      .default(EMPTY_PERSONA_CONFIGURATION),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('historical_person_published_idx').on(table.published),
    index('historical_person_featured_idx').on(table.featured),
    index('historical_person_era_idx').on(table.historicalEra),
  ],
);

export type HistoricalPersonRow = typeof historicalPerson.$inferSelect;
export type NewHistoricalPersonRow = typeof historicalPerson.$inferInsert;
