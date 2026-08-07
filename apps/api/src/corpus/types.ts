import type { RightsStatus, SourceType, VerificationStatus } from '@historyai/shared';

/**
 * A document in a curated corpus.
 *
 * The manifest carries *metadata only*. Document text is never stored here and
 * never written by hand — it is downloaded from `transcriptionUrl` at ingest
 * time and stored verbatim. That is deliberate: a transcription typed into a
 * source file is a transcription nobody can check, and this library's entire
 * claim rests on citations resolving to real documents.
 *
 * Consequently every URL in a manifest must respond 200 before its document
 * can be published. `npm run corpus:verify` enforces that.
 */
export interface CorpusDocument {
  /** Stable identity for re-runs. Also the natural key for upserts. */
  slug: string;
  title: string;
  /** 'speech', 'letter', 'proclamation', 'message to congress', 'debate', … */
  documentType: string;

  /**
   * ISO date the document was created or delivered. Required — temporal
   * retrieval and knowledge-cutoff filtering both key off it, and a source
   * without a date silently drops out of date-bounded queries.
   */
  dateCreated: string;
  /** Human hedge shown when precision is uncertain. */
  approximateDate?: string;
  historicalPeriod?: string;

  description: string;

  /** The archive that holds the authoritative text. */
  archiveName: string;
  collectionName?: string;

  /** Citation target shown to users. Must resolve. */
  canonicalUrl: string;
  /**
   * Where the transcription is actually downloaded from. Often the same as
   * `canonicalUrl`; kept distinct so a citation can point at the definitive
   * archive while the text comes from a machine-readable mirror.
   */
  transcriptionUrl?: string;
  /** Facsimile or scan of the original, when one is online. */
  originalDocumentUrl?: string;

  sourceType: SourceType;
  rightsStatus: RightsStatus;
  rightsNotes?: string;
  copyrightJurisdiction?: string;

  /**
   * Editorial confidence. Anything other than 'verified' must not publish —
   * `publishByDefault` is ignored unless this is 'verified'.
   */
  verificationStatus: VerificationStatus;
  /** Withhold from the public API even when verified (e.g. disputed authorship). */
  publishByDefault?: boolean;

  /**
   * Set when the document spans a date range and individual passages inside it
   * cannot be dated from the document alone — a collected-works volume, say.
   *
   * Chunks from such a source are stored with a NULL `dateContext`, which
   * excludes them from every date-bounded query. That costs recall, but the
   * alternative is worse: stamping every chunk with the volume's range-end
   * asserts a date we do not know, and a passage that is actually later than
   * its stamp will leak past a knowledge cutoff. Measured on this corpus,
   * Volume 1 (labelled 1832-1843) contains four chunks quoting the 1865 second
   * inaugural — so the stamp was not merely imprecise, it was wrong.
   */
  perChunkDatesUnknown?: boolean;

  /** Free-form provenance notes carried into source.metadata. */
  notes?: string;
}

export interface Corpus {
  personSlug: string;
  documents: CorpusDocument[];
}
