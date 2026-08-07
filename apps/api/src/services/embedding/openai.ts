import type { EmbeddingService } from '../types';
import { AppError } from '../../lib/errors';
import { withRetry } from './retry';

interface OpenAIEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage?: { prompt_tokens: number; total_tokens: number };
}

/**
 * OpenAI embeddings.
 *
 * `text-embedding-3-small` is 1536-dimensional, matching the pgvector column
 * as migrated. The `-3` models also support a `dimensions` parameter for
 * Matryoshka truncation, which is passed explicitly so the width is asserted
 * at the API rather than assumed.
 *
 * No SDK: this is two fetch calls, and a vendor SDK would pull a large
 * dependency tree into a job that mostly waits on the network.
 */
export class OpenAIEmbeddingService implements EmbeddingService {
  readonly dimensions: number;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  /** Provider's documented ceiling; batches are chunked to stay under it. */
  private static readonly MAX_BATCH = 128;

  constructor(options: { apiKey: string; model?: string; dimensions?: number; baseUrl?: string }) {
    if (!options.apiKey) {
      throw new Error('OPENAI_API_KEY is required when EMBEDDING_PROVIDER=openai');
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'text-embedding-3-small';
    this.dimensions = options.dimensions ?? 1536;
    this.baseUrl = options.baseUrl ?? 'https://api.openai.com/v1';
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    if (!vector) throw AppError.internal('OpenAI returned no embedding');
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += OpenAIEmbeddingService.MAX_BATCH) {
      const batch = texts.slice(i, i + OpenAIEmbeddingService.MAX_BATCH);
      out.push(...(await this.requestBatch(batch)));
    }
    return out;
  }

  private async requestBatch(batch: string[]): Promise<number[][]> {
    return withRetry(async () => {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: batch,
          dimensions: this.dimensions,
          encoding_format: 'float',
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new EmbeddingHttpError(response.status, `OpenAI embeddings failed: ${detail}`);
      }

      const payload = (await response.json()) as OpenAIEmbeddingResponse;

      // The API is documented to preserve order, but the response carries an
      // explicit index — sorting by it means a future change cannot silently
      // pair a vector with the wrong chunk.
      const ordered = [...payload.data].sort((a, b) => a.index - b.index);

      if (ordered.length !== batch.length) {
        throw AppError.internal(
          `OpenAI returned ${ordered.length} embeddings for ${batch.length} inputs`,
        );
      }
      for (const item of ordered) {
        if (item.embedding.length !== this.dimensions) {
          throw AppError.internal(
            `OpenAI returned ${item.embedding.length}-dimensional vectors, expected ${this.dimensions}`,
          );
        }
      }

      return ordered.map((item) => item.embedding);
    });
  }
}

export class EmbeddingHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'EmbeddingHttpError';
  }
}
