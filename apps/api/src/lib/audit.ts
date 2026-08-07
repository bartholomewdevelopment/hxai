import type { Request } from 'express';
import { db } from '../db/client';
import { auditLogs } from '../db/schema/index';
import { logger } from './logger';

export interface AuditEntry {
  action: string;
  actorId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append to the audit trail.
 *
 * Deliberately never throws: an audit write must not be able to fail the user's
 * request. A dropped entry is logged loudly instead. Phase 6 adds admin
 * mutations as the main caller; Phase 1 records authentication events.
 */
export async function recordAudit(req: Request, entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action: entry.action,
      actorId: entry.actorId ?? req.user?.id ?? null,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId ?? null,
      ipAddress: req.ip ?? null,
      userAgent: req.get('user-agent') ?? null,
      requestId: req.requestId,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    });
  } catch (error) {
    logger.error('Failed to write audit log', {
      action: entry.action,
      requestId: req.requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
