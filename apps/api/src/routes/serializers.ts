import type {
  AuthenticatedUser,
  HistoricalPersonDetail,
  HistoricalPersonSummary,
  SourceDetail,
  SourceSummary,
} from '@historyai/shared';
import type { HistoricalPersonRow } from '../db/schema/people';
import type { SourceRow } from '../db/schema/sources';
import type { UserRow } from '../db/schema/users';

/**
 * Row -> DTO. This is the only place database rows become API responses, which
 * is what keeps `password_hash`, raw embeddings, and unpublished internals from
 * leaking by accident when a column is added.
 */

export function toPersonSummary(row: HistoricalPersonRow): HistoricalPersonSummary {
  return {
    id: row.id,
    slug: row.slug,
    fullName: row.fullName,
    displayName: row.displayName,
    birthDate: row.birthDate,
    deathDate: row.deathDate,
    nationality: row.nationality,
    occupations: row.occupations,
    historicalEra: row.historicalEra,
    categories: row.categories,
    shortBiography: row.shortBiography,
    portraitUrl: row.portraitUrl,
    featured: row.featured,
    sourceCount: row.sourceCount,
    audioSourceCount: row.audioSourceCount,
    videoSourceCount: row.videoSourceCount,
  };
}

export function toPersonDetail(row: HistoricalPersonRow): HistoricalPersonDetail {
  return {
    ...toPersonSummary(row),
    birthplace: row.birthplace,
    deathPlace: row.deathPlace,
    longBiography: row.longBiography,
    heroImageUrl: row.heroImageUrl,
    knowledgeCutoffDate: row.knowledgeCutoffDate,
    personaConfiguration: row.personaConfiguration,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toSourceSummary(row: SourceRow): SourceSummary {
  return {
    id: row.id,
    historicalPersonId: row.historicalPersonId,
    title: row.title,
    author: row.author,
    documentType: row.documentType,
    dateCreated: row.dateCreated,
    approximateDate: row.approximateDate,
    historicalPeriod: row.historicalPeriod,
    archiveName: row.archiveName,
    collectionName: row.collectionName,
    canonicalUrl: row.canonicalUrl,
    sourceType: row.sourceType,
    rightsStatus: row.rightsStatus,
    verificationStatus: row.verificationStatus,
    language: row.language,
    translated: row.translated,
  };
}

/**
 * Rights statuses under which we may serve a source's full transcription.
 * Anything else is withheld and the user is sent to the archive's own copy.
 */
const FULL_TEXT_ALLOWED: ReadonlySet<SourceRow['rightsStatus']> = new Set([
  'public_domain',
  'licensed',
]);

export function toSourceDetail(row: SourceRow): SourceDetail {
  return {
    ...toSourceSummary(row),
    description: row.description,
    originalDocumentUrl: row.originalDocumentUrl,
    transcriptionUrl: row.transcriptionUrl,
    localFileUrl: row.localFileUrl,
    fullText: FULL_TEXT_ALLOWED.has(row.rightsStatus) ? row.fullText : null,
    translator: row.translator,
    copyrightJurisdiction: row.copyrightJurisdiction,
    rightsNotes: row.rightsNotes,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAuthenticatedUser(row: UserRow): AuthenticatedUser {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Admin-facing source shapes.
 *
 * Distinct from the public serializers above because the admin dashboard needs
 * exactly the operational fields the public API must never leak: processing
 * state, error text, content hashes, and where the text was actually fetched
 * from.
 */
export function toAdminSourceSummary(row: SourceRow) {
  return {
    id: row.id,
    historicalPersonId: row.historicalPersonId,
    title: row.title,
    author: row.author,
    documentType: row.documentType,
    dateCreated: row.dateCreated,
    approximateDate: row.approximateDate,
    archiveName: row.archiveName,
    sourceType: row.sourceType,
    rightsStatus: row.rightsStatus,
    verificationStatus: row.verificationStatus,
    published: row.published,
    processingStatus: row.processingStatus,
    processingError: row.processingError,
    chunkCount: row.chunkCount,
    hasText: Boolean(row.fullText && row.fullText.length > 0),
    textLength: row.fullText?.length ?? 0,
    embeddedAt: row.embeddedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toAdminSourceDetail(row: SourceRow) {
  return {
    ...toAdminSourceSummary(row),
    description: row.description,
    collectionName: row.collectionName,
    canonicalUrl: row.canonicalUrl,
    transcriptionUrl: row.transcriptionUrl,
    originalDocumentUrl: row.originalDocumentUrl,
    retrievedFrom: row.retrievedFrom,
    retrievedAt: row.retrievedAt?.toISOString() ?? null,
    fullText: row.fullText,
    language: row.language,
    translated: row.translated,
    translator: row.translator,
    historicalPeriod: row.historicalPeriod,
    copyrightJurisdiction: row.copyrightJurisdiction,
    rightsNotes: row.rightsNotes,
    contentHash: row.contentHash,
    processedAt: row.processedAt?.toISOString() ?? null,
    metadata: row.metadata,
    createdAt: row.createdAt.toISOString(),
  };
}
