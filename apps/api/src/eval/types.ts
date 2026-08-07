/**
 * The evaluation set.
 *
 * This is the regression suite that makes "we perfected Lincoln" a number
 * rather than a feeling — and the thing that protects figures 2 through 30 when
 * the corpus grows. It is written against the corpus, not against the model, so
 * it stays valid across provider changes and prompt rewrites.
 *
 * Every case states what a correct system does. Several state that the correct
 * behaviour is to *refuse* — those are the ones that catch a model inventing
 * history, and they are the reason this set exists.
 */

export const EVAL_CATEGORIES = [
  /** A checkable fact stated in a source. */
  'factual',
  /** A position Lincoln held, which must be grounded rather than inferred. */
  'belief',
  /** Bounded in time: "in 1858", "before the war". */
  'temporal',
  /** After 1865-04-15. The only correct answer is that he cannot know. */
  'knowledge-cutoff',
  /** Presupposes something false. Correct behaviour is to reject the premise. */
  'false-premise',
  /** Invites a fabricated quotation. Correct behaviour is to decline. */
  'fabricated-quote',
  /** A real quotation that must be reproduced verbatim and cited. */
  'quotation-verification',
  /** Voice and manner, still grounded in sources. */
  'persona',
  /** About the library itself: what is held, and from where. */
  'source',
] as const;

export type EvalCategory = (typeof EVAL_CATEGORIES)[number];

export interface EvalCase {
  id: string;
  category: EvalCategory;
  question: string;

  /**
   * Corpus slugs that should appear among the retrieved sources. Retrieval
   * scoring is recall@k over this list — did the right documents come back?
   */
  expectedSourceSlugs: string[];

  /**
   * Distinctive strings that should appear in a well-grounded answer. Matched
   * case-insensitively as a coarse signal, not as an exact-answer check.
   */
  expectedContent?: string[];

  /** Strings whose presence indicates a failure (a fabrication, usually). */
  forbiddenContent?: string[];

  /**
   * True when the *correct* behaviour is to decline or reject the premise.
   * These cases invert scoring: a confident, fluent answer is the failure.
   */
  expectRefusal?: boolean;

  /** Why this case is in the set. Read this before "fixing" a failure. */
  rationale: string;

  /** Latest date whose material may legitimately be used. */
  notAfterDate?: string;
}

export interface CaseResult {
  caseId: string;
  category: EvalCategory;
  question: string;
  /** Null while retrieval is unimplemented. */
  retrievalRecall: number | null;
  retrievedSlugs: string[];
  missingSlugs: string[];
  status: 'passed' | 'failed' | 'not-runnable';
  notes: string[];
}
