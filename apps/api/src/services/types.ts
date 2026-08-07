import type { Citation, PersonaConfiguration, SourceType } from '@historyai/shared';

/**
 * Service contracts for everything that will eventually talk to a third party.
 *
 * Phase 1 ships interfaces plus no-op implementations. Nothing here makes a
 * network call, and no API key is required to boot.
 *
 * The ordering of these interfaces encodes the pipeline invariant:
 *
 *     SOURCE -> RETRIEVAL -> RESPONSE -> CITATIONS
 *
 * Retrieval always runs before generation. `LLMService.generate` takes its
 * grounding context as a required argument, so there is no code path that
 * generates a response first and looks for sources afterwards. Citations are
 * assembled by CitationService from stored Source rows, never parsed out of
 * model output.
 */

// --------------------------------------------------------------------------
// Retrieval
// --------------------------------------------------------------------------

/** A chunk returned by retrieval, joined with the metadata a citation needs. */
export interface RetrievedChunk {
  chunkId: string;
  sourceId: string;
  historicalPersonId: string;
  /** Verbatim passage text. Quotations are sliced from this, never rewritten. */
  text: string;
  score: number;
  sourceTitle: string;
  sourceAuthor: string | null;
  sourceType: SourceType;
  dateContext: string | null;
  pageNumber: number | null;
}

export interface RetrievalQuery {
  historicalPersonId: string;
  query: string;
  limit?: number;
  /**
   * Hard temporal ceiling — the person's knowledge cutoff. Applied as a SQL
   * predicate on chunk/source dates, not as a prompt instruction.
   */
  notAfterDate?: string | null;
  /** Restrict to certain provenance tiers, e.g. primary sources only. */
  sourceTypes?: SourceType[];
}

export interface RetrievalService {
  retrieve(query: RetrievalQuery): Promise<RetrievedChunk[]>;
}

export interface RerankingService {
  rerank(query: string, chunks: RetrievedChunk[], topK?: number): Promise<RetrievedChunk[]>;
}

// --------------------------------------------------------------------------
// Embeddings
// --------------------------------------------------------------------------

export interface EmbeddingService {
  /** Must equal the pgvector column width. Checked at startup. */
  readonly dimensions: number;
  readonly model: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// --------------------------------------------------------------------------
// Generation
// --------------------------------------------------------------------------

export interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMGenerationRequest {
  /**
   * Retrieved grounding context. Required, not optional — the type makes
   * generate-then-find-sources unrepresentable.
   */
  context: RetrievedChunk[];
  messages: LLMMessage[];
  persona: PersonaConfiguration;
  personDisplayName: string;
  /** Passed through for prompt framing; enforcement happens at retrieval. */
  knowledgeCutoffDate?: string | null;
  maxTokens?: number;
  temperature?: number;
}

export interface LLMGenerationResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string;
}

export interface LLMService {
  readonly provider: string;
  readonly model: string;
  generate(request: LLMGenerationRequest): Promise<LLMGenerationResult>;
}

// --------------------------------------------------------------------------
// Citations
// --------------------------------------------------------------------------

export interface CitationService {
  /**
   * Build the citations for a response from the chunks that were actually
   * retrieved. Takes the response text only to decide which chunks were used —
   * every field of the returned Citation is read from the database.
   */
  buildCitations(responseText: string, chunks: RetrievedChunk[]): Promise<Citation[]>;

  /**
   * Verify that each quoted passage appears verbatim in its cited chunk.
   * Phase 3 runs this before a response is persisted or streamed.
   */
  verifyQuotations(
    responseText: string,
    chunks: RetrievedChunk[],
  ): Promise<{ ok: boolean; unverified: string[] }>;
}

// --------------------------------------------------------------------------
// Ingestion
// --------------------------------------------------------------------------

export interface IngestionRequest {
  sourceId: string;
  fullText: string;
  targetChunkTokens?: number;
  overlapTokens?: number;
}

export interface IngestionResult {
  sourceId: string;
  chunksCreated: number;
  chunksEmbedded: number;
}

export interface SourceIngestionService {
  ingest(request: IngestionRequest): Promise<IngestionResult>;
}

// --------------------------------------------------------------------------
// Voice
// --------------------------------------------------------------------------

export interface TranscriptionResult {
  text: string;
  language: string;
  durationSeconds: number;
}

export interface SpeechToTextService {
  transcribe(audio: Buffer, mimeType: string): Promise<TranscriptionResult>;
}

export interface SynthesisResult {
  audio: Buffer;
  mimeType: string;
}

export interface TextToSpeechService {
  synthesize(text: string, voiceId?: string): Promise<SynthesisResult>;
}

// --------------------------------------------------------------------------
// Object storage
// --------------------------------------------------------------------------

export interface StoredObject {
  key: string;
  url: string;
  size: number;
  contentType: string;
}

export interface StorageService {
  readonly provider: string;
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** Time-limited read URL for private objects. */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /** Stable public URL, for objects served from a CDN. */
  getPublicUrl(key: string): string;
}
