import type { PersonaConfiguration } from './persona.js';
import type {
  MessageRole,
  RightsStatus,
  SourceType,
  UserRole,
  VerificationStatus,
} from './enums.js';

/**
 * Wire shapes returned by the API. Dates cross the wire as ISO-8601 strings.
 *
 * These are deliberately separate from the Drizzle row types: the database may
 * hold columns (password hashes, unpublished drafts, raw embeddings) that must
 * never reach a client.
 */

/** A historical figure, as shown in the directory grid. */
export interface HistoricalPersonSummary {
  id: string;
  slug: string;
  fullName: string;
  displayName: string;
  birthDate: string | null;
  deathDate: string | null;
  nationality: string | null;
  occupations: string[];
  historicalEra: string | null;
  categories: string[];
  shortBiography: string | null;
  portraitUrl: string | null;
  featured: boolean;
  sourceCount: number;
  audioSourceCount: number;
  videoSourceCount: number;
}

/** A historical figure's full profile. */
export interface HistoricalPersonDetail extends HistoricalPersonSummary {
  birthplace: string | null;
  deathPlace: string | null;
  longBiography: string | null;
  heroImageUrl: string | null;
  /**
   * The temporal boundary of the persona: the figure knows nothing after this
   * date. Enforced at retrieval time in Phase 3 by filtering source chunks,
   * not by asking the model to pretend.
   */
  knowledgeCutoffDate: string | null;
  personaConfiguration: PersonaConfiguration;
  createdAt: string;
  updatedAt: string;
}

/** A document attributed to or about a figure. */
export interface SourceSummary {
  id: string;
  historicalPersonId: string;
  title: string;
  author: string | null;
  documentType: string | null;
  /** Precise date, when known. */
  dateCreated: string | null;
  /** Human-readable fallback when `dateCreated` is unknown, e.g. "circa 1858". */
  approximateDate: string | null;
  historicalPeriod: string | null;
  archiveName: string | null;
  collectionName: string | null;
  canonicalUrl: string | null;
  sourceType: SourceType;
  rightsStatus: RightsStatus;
  verificationStatus: VerificationStatus;
  language: string;
  translated: boolean;
}

export interface SourceDetail extends SourceSummary {
  description: string | null;
  originalDocumentUrl: string | null;
  transcriptionUrl: string | null;
  localFileUrl: string | null;
  /** Omitted unless rights permit full-text display. */
  fullText: string | null;
  translator: string | null;
  copyrightJurisdiction: string | null;
  rightsNotes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * A citation attached to an assistant message.
 *
 * Every field here is copied from a stored `Source` row at response-assembly
 * time. None of it is ever produced by the model — that is the invariant the
 * whole pipeline exists to protect.
 */
export interface Citation {
  sourceId: string;
  sourceChunkId: string;
  title: string;
  author: string | null;
  dateLabel: string | null;
  sourceType: SourceType;
  archiveName: string | null;
  canonicalUrl: string | null;
  /** Verbatim excerpt from the chunk. Never paraphrased. */
  quotation: string | null;
  pageNumber: number | null;
}

export interface ConversationSummary {
  id: string;
  userId: string;
  historicalPersonId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  retrievedSourceChunkIds: string[];
  createdAt: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
}

export interface AuthResponse {
  user: AuthenticatedUser;
  token: string;
}

/** Cursor-free pagination — the collections here are small and bounded. */
export interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
