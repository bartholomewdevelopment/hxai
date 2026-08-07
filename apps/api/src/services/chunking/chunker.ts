/**
 * Semantic chunking.
 *
 * Chunks are the unit of retrieval *and* the unit of quotation, which pulls in
 * two directions: large chunks give the model context, small chunks give
 * precise citations. The compromise here is to split on natural boundaries
 * (paragraph, then sentence) and never mid-sentence, so a quotation sliced
 * from a chunk is always a complete thought that appears verbatim in the
 * source.
 *
 * Overlap carries a little context across boundaries so a passage split
 * between two chunks is still retrievable from either side.
 */

export interface ChunkOptions {
  /** Target size in tokens. Chunks may run under, and slightly over for long sentences. */
  targetTokens?: number;
  /** Tokens of trailing context repeated at the start of the next chunk. */
  overlapTokens?: number;
  /** Chunks below this are merged into their neighbour rather than stored alone. */
  minTokens?: number;
}

export interface TextChunk {
  index: number;
  text: string;
  tokenCount: number;
  /** Character offsets into the source text — lets the viewer highlight a passage. */
  startOffset: number;
  endOffset: number;
}

export const DEFAULT_CHUNK_OPTIONS: Required<ChunkOptions> = {
  targetTokens: 350,
  overlapTokens: 60,
  minTokens: 40,
};

/**
 * Token estimate without a tokenizer dependency.
 *
 * ~4 characters per token is the usual English approximation and is accurate
 * enough for sizing chunks. It is deliberately *not* used for billing or for
 * context-window arithmetic — when a real count matters, the provider's own
 * tokenizer is authoritative.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Split into sentences without breaking on common abbreviations or initials. */
function splitSentences(paragraph: string): string[] {
  const protectedText = paragraph
    .replace(/\b(Mr|Mrs|Ms|Dr|Gen|Gov|Col|Capt|Lt|Sgt|Hon|Rev|St|Jr|Sr|Esq)\./g, '$1<DOT>')
    .replace(/\b([A-Z])\./g, '$1<DOT>') // initials: "A. Lincoln"
    .replace(/\b(vs|etc|viz|cf|ibid|op|cit|No|Art|Sec)\./gi, '$1<DOT>');

  const parts = protectedText.split(/(?<=[.!?])["')\]]*\s+/);

  return parts.map((part) => part.replace(/<DOT>/g, '.').trim()).filter((part) => part.length > 0);
}

/** Trailing sentences of `text` totalling at most `tokens`, for overlap. */
function tailContext(text: string, tokens: number): string {
  if (tokens <= 0) return '';
  const sentences = splitSentences(text);
  const kept: string[] = [];
  let total = 0;

  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    const sentence = sentences[i];
    if (!sentence) continue;
    const cost = estimateTokens(sentence);
    if (total + cost > tokens && kept.length > 0) break;
    kept.unshift(sentence);
    total += cost;
  }

  return kept.join(' ');
}

/**
 * Chunk a document.
 *
 * Paragraphs are the primary boundary. A paragraph that fits is emitted whole;
 * one that does not is split at sentence boundaries. A single sentence longer
 * than the target is emitted intact and allowed to exceed it — splitting
 * mid-sentence would break the verbatim-quotation guarantee.
 */
export function chunkText(text: string, options: ChunkOptions = {}): TextChunk[] {
  const { targetTokens, overlapTokens, minTokens } = { ...DEFAULT_CHUNK_OPTIONS, ...options };

  const normalised = text.trim();
  if (normalised.length === 0) return [];

  const units: string[] = [];
  for (const paragraph of normalised.split(/\n{2,}/)) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;
    if (estimateTokens(trimmed) <= targetTokens) {
      units.push(trimmed);
    } else {
      units.push(...splitSentences(trimmed));
    }
  }

  const chunks: TextChunk[] = [];
  let buffer = '';
  let searchFrom = 0;

  const flush = (): void => {
    const body = buffer.trim();
    if (!body) return;

    // Locate the chunk in the original text so the viewer can highlight it.
    // Search from the previous chunk's start to keep offsets monotonic even
    // when a passage repeats.
    const probe = body.slice(0, 120);
    const found = normalised.indexOf(probe, searchFrom);
    const startOffset = found === -1 ? searchFrom : found;

    chunks.push({
      index: chunks.length,
      text: body,
      tokenCount: estimateTokens(body),
      startOffset,
      endOffset: startOffset + body.length,
    });

    searchFrom = startOffset + Math.max(1, Math.floor(body.length / 2));
    buffer = overlapTokens > 0 ? tailContext(body, overlapTokens) : '';
  };

  for (const unit of units) {
    const candidate = buffer ? `${buffer}\n\n${unit}` : unit;
    if (estimateTokens(candidate) > targetTokens && buffer) {
      flush();
      buffer = buffer ? `${buffer}\n\n${unit}` : unit;
    } else {
      buffer = candidate;
    }
  }
  flush();

  // Fold a trailing runt into its predecessor rather than storing a fragment
  // that would retrieve poorly and cite badly.
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1];
    const previous = chunks[chunks.length - 2];
    if (last && previous && last.tokenCount < minTokens) {
      previous.text = `${previous.text}\n\n${last.text}`;
      previous.tokenCount = estimateTokens(previous.text);
      previous.endOffset = last.endOffset;
      chunks.pop();
    }
  }

  return chunks;
}
