import { env } from '../config/env';
import { logger } from '../lib/logger';
import type {
  CitationService,
  EmbeddingService,
  LLMService,
  RerankingService,
  RetrievalService,
  SourceIngestionService,
  SpeechToTextService,
  StorageService,
  TextToSpeechService,
} from './types';
import {
  PassthroughRerankingService,
  StubCitationService,
  StubEmbeddingService,
  StubLLMService,
  StubRetrievalService,
  StubSourceIngestionService,
  StubSpeechToTextService,
  StubStorageService,
  StubTextToSpeechService,
} from './stubs';
import { OpenAIEmbeddingService } from './embedding/openai';
import { VoyageEmbeddingService } from './embedding/voyage';

/**
 * The single place providers are chosen.
 *
 * Wiring a real implementation in a later phase means adding one `case` here
 * and one adapter file — no route, no handler, and no test touches a vendor SDK
 * directly. Claude is the intended default LLM once Phase 3 lands; the
 * embedding provider is deliberately open, since that choice is coupled to the
 * pgvector column width and should be made once, before ingestion.
 */
export interface ServiceRegistry {
  llm: LLMService;
  embedding: EmbeddingService;
  retrieval: RetrievalService;
  reranking: RerankingService;
  citation: CitationService;
  ingestion: SourceIngestionService;
  speechToText: SpeechToTextService;
  textToSpeech: TextToSpeechService;
  storage: StorageService;
}

function createLLMService(): LLMService {
  switch (env.LLM_PROVIDER) {
    case 'anthropic':
      // Phase 3: new AnthropicLLMService({ apiKey: env.ANTHROPIC_API_KEY, model: env.LLM_MODEL })
      logger.warn('LLM_PROVIDER=anthropic is not wired yet; falling back to the stub.');
      return new StubLLMService();
    case 'stub':
    default:
      return new StubLLMService();
  }
}

function createEmbeddingService(): EmbeddingService {
  switch (env.EMBEDDING_PROVIDER) {
    case 'openai':
      return new OpenAIEmbeddingService({
        apiKey: env.OPENAI_API_KEY ?? '',
        model: env.EMBEDDING_MODEL,
        dimensions: env.EMBEDDING_DIMENSIONS,
      });
    case 'voyage':
      return new VoyageEmbeddingService({
        apiKey: env.VOYAGE_API_KEY ?? '',
        model: env.EMBEDDING_MODEL === 'text-embedding-3-small' ? 'voyage-3' : env.EMBEDDING_MODEL,
        dimensions: env.EMBEDDING_DIMENSIONS,
      });
    case 'cohere':
      // Not implemented — Cohere is a candidate mainly because it also
      // supplies the Phase 3 reranker, which is not yet in play.
      logger.warn('EMBEDDING_PROVIDER=cohere is not implemented; falling back to the stub.');
      return new StubEmbeddingService();
    case 'stub':
    default:
      return new StubEmbeddingService();
  }
}

function createStorageService(): StorageService {
  switch (env.STORAGE_PROVIDER) {
    case 's3':
    case 'r2':
      // Phase 2: a single S3-compatible adapter serves both; R2 differs only
      // in endpoint and region ('auto').
      logger.warn(
        `STORAGE_PROVIDER=${env.STORAGE_PROVIDER} is not wired yet; falling back to the stub.`,
      );
      return new StubStorageService();
    case 'stub':
    default:
      return new StubStorageService();
  }
}

let registry: ServiceRegistry | null = null;

export function getServices(): ServiceRegistry {
  if (registry) return registry;

  registry = {
    llm: createLLMService(),
    embedding: createEmbeddingService(),
    retrieval: new StubRetrievalService(),
    reranking: new PassthroughRerankingService(),
    citation: new StubCitationService(),
    ingestion: new StubSourceIngestionService(),
    speechToText: new StubSpeechToTextService(),
    textToSpeech: new StubTextToSpeechService(),
    storage: createStorageService(),
  };

  logger.info('Service registry initialised', {
    llm: env.LLM_PROVIDER,
    embedding: env.EMBEDDING_PROVIDER,
    reranking: env.RERANKING_PROVIDER,
    storage: env.STORAGE_PROVIDER,
    stt: env.STT_PROVIDER,
    tts: env.TTS_PROVIDER,
  });

  return registry;
}

/**
 * Guard against a silent dimension mismatch: an embedding provider whose
 * vectors are a different width than the pgvector column would fail at insert
 * time, deep inside a long ingestion run. Checked at startup instead.
 */
export function assertEmbeddingDimensionsMatch(): void {
  const services = getServices();
  if (services.embedding.model === 'stub') return;
  if (services.embedding.dimensions !== env.EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding provider returns ${services.embedding.dimensions}-dimensional vectors but the ` +
        `source_chunk.embedding column is ${env.EMBEDDING_DIMENSIONS}-wide. ` +
        'Migrate the column and re-embed, or choose a matching model.',
    );
  }
}
