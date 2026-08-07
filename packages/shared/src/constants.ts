/**
 * Disclosure copy. Required on every person and chat surface — a user must
 * never be able to mistake a reconstruction for the historical figure.
 */
export const AI_RECONSTRUCTION_DISCLAIMER =
  'This is an AI reconstruction, not a historical figure. Responses are generated ' +
  'from primary and scholarly sources and are shown with citations, but they are ' +
  'interpretations — not the words or opinions of the person portrayed. Always ' +
  'consult the cited sources directly.';

export const AI_RECONSTRUCTION_DISCLAIMER_SHORT =
  'AI reconstruction — generated from cited sources, not the historical figure.';

/**
 * Dimensionality of the pgvector column. Baked into the migration; changing it
 * requires an `ALTER TABLE` and a complete re-embed of every chunk.
 */
export const EMBEDDING_DIMENSIONS = 1536;

/** Human labels for the source provenance tiers. */
export const SOURCE_TYPE_LABELS = {
  primary: 'Primary source',
  contemporary: 'Contemporary account',
  scholarly: 'Scholarly work',
} as const;

export const RIGHTS_STATUS_LABELS = {
  public_domain: 'Public domain',
  licensed: 'Licensed',
  permission_required: 'Permission required',
  copyright: 'In copyright',
  unknown: 'Rights unknown',
} as const;
