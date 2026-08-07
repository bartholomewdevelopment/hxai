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
