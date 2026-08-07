/**
 * Vocabularies shared by the API and the web client.
 *
 * These mirror the Postgres enum types declared in the API's Drizzle schema.
 * Keep the two in sync — the database is the source of truth, and any change
 * here needs a matching migration.
 */

/**
 * Provenance tier of a source. Drives citation presentation and, in later
 * phases, retrieval weighting: a figure's own words outrank a modern
 * biographer's paraphrase of them.
 */
export const SOURCE_TYPES = ['primary', 'contemporary', 'scholarly'] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

/** Whether we may reproduce a source's text, and under what terms. */
export const RIGHTS_STATUSES = [
  'public_domain',
  'licensed',
  'permission_required',
  'copyright',
  'unknown',
] as const;
export type RightsStatus = (typeof RIGHTS_STATUSES)[number];

/** Editorial review state of an ingested source. */
export const VERIFICATION_STATUSES = ['unverified', 'in_review', 'verified', 'disputed'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

/** Speaker of a conversation message. */
export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

/** Application-level permissions. */
export const USER_ROLES = ['user', 'curator', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

/** Ordered by privilege — used for `requireRole` comparisons. */
export const ROLE_RANK: Record<UserRole, number> = {
  user: 0,
  curator: 1,
  admin: 2,
};
