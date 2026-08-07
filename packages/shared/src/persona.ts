/**
 * Persona configuration — the voice model for a historical figure.
 *
 * Stored as JSONB on `historical_person.persona_configuration` so it can
 * evolve without a migration while the pipeline is still being designed.
 * Phase 4 generates these from the figure's own sources; Phase 1 only defines
 * the shape and ships an empty default.
 *
 * A persona describes *how* a figure speaks. It never supplies facts — every
 * claim in a response comes from retrieved source chunks.
 */
export interface PersonaConfiguration {
  /** Register, pacing, and characteristic manner of address. */
  communicationStyle?: string;
  /** Diction: period-specific words, favored terms, words to avoid. */
  vocabularyCharacteristics?: string;
  /** Argumentative habits — parable, scripture, legal analogy, invective. */
  rhetoricalStyle?: string;
  /** Recurring subjects the figure returns to unprompted. */
  characteristicTopics?: string[];
  /** Stated convictions, sourced to the figure's own writing. */
  knownBeliefs?: string[];
  /** Documented temperament and habits of mind. */
  personalityTraits?: string[];
  /** Verbatim phrases the figure demonstrably used, with source ids. */
  signaturePhrases?: SignaturePhrase[];
  /** Relationships that colour how the figure discusses certain people. */
  notableRelationships?: string[];
  /** How the figure should decline questions beyond the sources. */
  epistemicPosture?: string;
  /** Free-form guidance appended to the system prompt. */
  additionalGuidance?: string;
  /** Provenance of this configuration — who or what produced it. */
  generatedBy?: 'manual' | 'llm' | 'hybrid';
  /** ISO timestamp of the last regeneration. */
  generatedAt?: string;
}

/**
 * A phrase the figure actually used. `sourceId` is required so the phrase can
 * be traced back — persona material is held to the same provenance bar as
 * everything else.
 */
export interface SignaturePhrase {
  text: string;
  sourceId: string;
}

export const EMPTY_PERSONA_CONFIGURATION: PersonaConfiguration = {};
