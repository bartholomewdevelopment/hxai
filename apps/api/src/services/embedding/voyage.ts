import type { EmbeddingService } from '../types';
import { AppError } from '../../lib/errors';
import { EmbeddingHttpError } from './openai';
import { withRetry } from './retry';

interface VoyageEmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  model: string;
  usage?: { total_tokens: number };
}

/**
 * Voyage AI embeddings — the A/B counterpart to OpenAI.
 *
 * Two differences from OpenAI matter here:
 *
 * 1. **Dimensionality.** `voyage-3` is 1024-wide, `voyage-3-lite` is 512, and
 *    the pgvector column is 1536. Running the A/B on `voyage-3` therefore
 *    needs a migration and a full re-embed — which is precisely why the
 *    comparison is worth doing on one person's corpus rather than thirty.
 *    The constructor takes `dimensions` explicitly and the registry asserts it
 *    against the column at startup rather than failing mid-run.
 *
 * 2. **Asymmetric embeddings.** Voyage distinguishes `document` from `query`
 *    inputs. Documents must be embedded with `input_type: 'document'` and
 *    search queries with `'query'`; mixing them degrades retrieval quietly.
 *    `embedBatch` is the ingestion path so it defaults to 'document';
 *    `embedQuery` exists for the retrieval side in Phase 3.
 */
export class VoyageEmbeddingService implements EmbeddingService {
  readonly dimensions: number;
  readonly model: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  private static readonly MAX_BATCH = 128;

  constructor(options: { apiKey: string; model?: string; dimensions?: number; baseUrl?: string }) {
    if (!options.apiKey) {
      throw new Error('VOYAGE_API_KEY is required when EMBEDDING_PROVIDER=voyage');
    }
    this.apiKey = options.apiKey;
    this.model = options.model ?? 'voyage-3';
    this.dimensions = options.dimensions ?? 1024;
    this.baseUrl = options.baseUrl ?? 'https://api.voyageai.com/v1';
  }

  async embed(text: string): Promise<number[]> {
    const [vector] = await this.embedBatch([text]);
    if (!vector) throw AppError.internal('Voyage returned no embedding');
    return vector;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.run(texts, 'document');
  }

  /** Retrieval-side counterpart. Phase 3 uses this for the user's question. */
  async embedQuery(text: string): Promise<number[]> {
    const [vector] = await this.run([text], 'query');
    if (!vector) throw AppError.internal('Voyage returned no embedding');
    return vector;
  }

  private async run(texts: string[], inputType: 'document' | 'query'): Promise<number[][]> {
    if (texts.length === 0) return [];

    const out: number[][] = [];
    for (let i = 0; i < texts.length; i += VoyageEmbeddingService.MAX_BATCH) {
      const batch = texts.slice(i, i + VoyageEmbeddingService.MAX_BATCH);
      out.push(...(await this.requestBatch(batch, inputType)));
    }
    return out;
  }

  private async requestBatch(
    batch: string[],
    inputType: 'document' | 'query',
  ): Promise<number[][]> {
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
          input_type: inputType,
          output_dimension: this.dimensions,
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new EmbeddingHttpError(response.status, `Voyage embeddings failed: ${detail}`);
      }

      const payload = (await response.json()) as VoyageEmbeddingResponse;
      const ordered = [...payload.data].sort((a, b) => a.index - b.index);

      if (ordered.length !== batch.length) {
        throw AppError.internal(
          `Voyage returned ${ordered.length} embeddings for ${batch.length} inputs`,
        );
      }
      for (const item of ordered) {
        if (item.embedding.length !== this.dimensions) {
          throw AppError.internal(
            `Voyage returned ${item.embedding.length}-dimensional vectors, expected ${this.dimensions}`,
          );
        }
      }

      return ordered.map((item) => item.embedding);
    });
  }
}
