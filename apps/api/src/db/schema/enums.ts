import { pgEnum } from 'drizzle-orm/pg-core';
import {
  MESSAGE_ROLES,
  RIGHTS_STATUSES,
  SOURCE_TYPES,
  USER_ROLES,
  VERIFICATION_STATUSES,
} from '@historyai/shared';

/**
 * Postgres enum types. The value lists live in @historyai/shared so the web
 * client narrows on exactly the same vocabulary the database enforces.
 */
export const sourceTypeEnum = pgEnum('source_type', SOURCE_TYPES);
export const rightsStatusEnum = pgEnum('rights_status', RIGHTS_STATUSES);
export const verificationStatusEnum = pgEnum('verification_status', VERIFICATION_STATUSES);
export const messageRoleEnum = pgEnum('message_role', MESSAGE_ROLES);
export const userRoleEnum = pgEnum('user_role', USER_ROLES);

/** Provenance tier for audio/video media, mirroring `source_type` semantics. */
export const mediaKindEnum = pgEnum('media_kind', ['recording', 'reenactment', 'documentary']);

/**
 * Where a source sits in the ingestion pipeline.
 *
 * The order is the pipeline order, and it is one-directional:
 *
 *   pending -> fetching -> extracting -> chunking -> embedding -> ready
 *
 * `chunked` is a real resting state, not a transient one: a source can be
 * fully chunked and stored while embeddings wait on an API key. That is
 * exactly the state this corpus ships in until a key is supplied.
 *
 * `failed` records the step that failed in `processing_error`.
 */
export const SOURCE_PROCESSING_STATUSES = [
  'pending',
  'fetching',
  'extracting',
  'chunking',
  'chunked',
  'embedding',
  'ready',
  'failed',
] as const;

export const sourceProcessingStatusEnum = pgEnum(
  'source_processing_status',
  SOURCE_PROCESSING_STATUSES,
);
