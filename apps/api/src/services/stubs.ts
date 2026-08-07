import { EMBEDDING_DIMENSIONS } from '@historyai/shared';
import { AppError } from '../lib/errors';
import type {
  CitationService,
  EmbeddingService,
  LLMService,
  RerankingService,
  RetrievalService,
  RetrievedChunk,
  SourceIngestionService,
  SpeechToTextService,
  StorageService,
  TextToSpeechService,
} from './types';

/**
 * No-op implementations for Phase 1.
 *
 * Each throws NOT_IMPLEMENTED rather than returning empty results. A stub that
 * silently returns `[]` would let a half-finished Phase 3 produce ungrounded
 * answers and look like it worked; throwing makes the gap impossible to miss.
 *
 * The exception is RerankingService, where passing chunks through unchanged is
 * a legitimate degraded mode rather than a missing capability.
 */

const notImplemented = (service: string, phase: string): AppError =>
  AppError.notImplemented(`${service} is not implemented yet (arrives in ${phase}).`);

export class StubEmbeddingService implements EmbeddingService {
  readonly dimensions = EMBEDDING_DIMENSIONS;
  readonly model = 'stub';

  embed(): Promise<number[]> {
    throw notImplemented('EmbeddingService', 'Phase 2');
  }

  embedBatch(): Promise<number[][]> {
    throw notImplemented('EmbeddingService', 'Phase 2');
  }
}

export class StubRetrievalService implements RetrievalService {
  retrieve(): Promise<never> {
    throw notImplemented('RetrievalService', 'Phase 3');
  }
}

export class PassthroughRerankingService implements RerankingService {
  /** Degraded but correct: preserve vector-similarity order, apply topK. */
  async rerank(_query: string, chunks: RetrievedChunk[], topK?: number): Promise<RetrievedChunk[]> {
    return typeof topK === 'number' ? chunks.slice(0, topK) : chunks;
  }
}

export class StubLLMService implements LLMService {
  readonly provider = 'stub';
  readonly model = 'stub';

  generate(): Promise<never> {
    throw notImplemented('LLMService', 'Phase 3');
  }
}

export class StubCitationService implements CitationService {
  buildCitations(): Promise<never> {
    throw notImplemented('CitationService', 'Phase 3');
  }

  verifyQuotations(): Promise<never> {
    throw notImplemented('CitationService', 'Phase 3');
  }
}

export class StubSourceIngestionService implements SourceIngestionService {
  ingest(): Promise<never> {
    throw notImplemented('SourceIngestionService', 'Phase 2');
  }
}

export class StubSpeechToTextService implements SpeechToTextService {
  transcribe(): Promise<never> {
    throw notImplemented('SpeechToTextService', 'Phase 5');
  }
}

export class StubTextToSpeechService implements TextToSpeechService {
  synthesize(): Promise<never> {
    throw notImplemented('TextToSpeechService', 'Phase 5');
  }
}

export class StubStorageService implements StorageService {
  readonly provider = 'stub';

  put(): Promise<never> {
    throw notImplemented('StorageService', 'Phase 2');
  }

  get(): Promise<never> {
    throw notImplemented('StorageService', 'Phase 2');
  }

  delete(): Promise<never> {
    throw notImplemented('StorageService', 'Phase 2');
  }

  async exists(): Promise<boolean> {
    return false;
  }

  getSignedUrl(): Promise<never> {
    throw notImplemented('StorageService', 'Phase 2');
  }

  getPublicUrl(key: string): string {
    return `/__stub-storage__/${key}`;
  }
}
