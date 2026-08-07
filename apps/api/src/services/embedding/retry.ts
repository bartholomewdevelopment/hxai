import { EmbeddingHttpError } from './openai';

/**
 * Retry with exponential backoff on rate limits and transient server errors.
 *
 * Embedding a corpus is a long batch job against a rate-limited API, so a 429
 * partway through must not lose the run. 4xx errors other than 429 are not
 * retried — a bad key or a malformed request will not fix itself.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const retryable =
        error instanceof EmbeddingHttpError
          ? error.status === 429 || error.status >= 500
          : error instanceof TypeError; // fetch network failure

      if (!retryable || attempt === attempts - 1) throw error;

      const delay = baseDelayMs * 2 ** attempt + Math.floor(Math.random() * 250);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
