/**
 * Cleaning of extracted text.
 *
 * The governing rule: **remove artifacts of the medium, never edit the
 * document.** Nineteenth-century spelling, capitalisation, punctuation,
 * hyphenation, and grammar are the historical record and must survive
 * cleaning byte-for-byte. "Fourscore" does not become "Four score";
 * "to-day" does not become "today"; a comma splice stays a comma splice.
 *
 * Everything here therefore operates on structure — whitespace, page
 * furniture, scan markers — and never on words. The one exception is
 * de-hyphenation across a line break, which reverses a typesetting artifact
 * rather than a choice the author made, and is applied conservatively (see
 * `rejoinHyphenatedLineBreaks`).
 */

/** Editorial and scan artifacts that appear on their own line. */
const STANDALONE_ARTIFACT_PATTERNS: RegExp[] = [
  /^\s*\[?\s*page\s+\d+\s*\]?\s*$/i,
  /^\s*\[\s*\d+\s*\]\s*$/,
  /^\s*[-–—_*]{3,}\s*$/,
  /^\s*\d+\s*$/, // bare page numbers
  /^\s*\[illustration[^\]]*\]\s*$/i,
  /^\s*\[image[^\]]*\]\s*$/i,
];

/** Inline markers left by scanning and wiki transclusion. */
const INLINE_ARTIFACT_PATTERNS: [RegExp, string][] = [
  [/\[\s*edit\s*\]/gi, ''],
  [/\[\s*sic\s*\]/gi, '[sic]'], // preserved — it is an editorial note about the text
  [/\u00ad/g, ''], // soft hyphen
  [/\ufeff/g, ''], // BOM
  [/\u200b/g, ''], // zero-width space
];

/**
 * Normalise whitespace without collapsing paragraph structure.
 * Paragraphs carry meaning for chunking, so blank lines are preserved.
 */
function normaliseWhitespace(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Rejoin words split by a hyphen at a line break ("govern-\nment").
 *
 * Deliberately conservative: it only fires when a lowercase fragment is
 * followed by a newline and a lowercase fragment, which is the signature of
 * typesetting rather than of a real compound. "self-\nevident" would be
 * rejoined to "selfevident" if applied naively, so genuine compounds are
 * protected by requiring that the hyphen sit at the very end of the line and
 * that the following line start lowercase — and by a stop-list of compounds
 * common in this corpus.
 */
const PROTECTED_COMPOUNDS = new Set([
  'self',
  'anti',
  'non',
  'ex',
  'half',
  'well',
  'ill',
  'pro',
  're',
  'co',
  'to', // "to-day", "to-morrow", "to-night" — period spellings, must survive
  'fellow',
]);

function rejoinHyphenatedLineBreaks(text: string): string {
  return text.replace(/([A-Za-z]+)-\n([a-z]+)/g, (_match, head: string, tail: string) => {
    if (PROTECTED_COMPOUNDS.has(head.toLowerCase())) return `${head}-${tail}`;
    return head + tail;
  });
}

function stripStandaloneArtifacts(text: string): string {
  return text
    .split('\n')
    .filter((line) => !STANDALONE_ARTIFACT_PATTERNS.some((pattern) => pattern.test(line)))
    .join('\n');
}

function stripInlineArtifacts(text: string): string {
  let out = text;
  for (const [pattern, replacement] of INLINE_ARTIFACT_PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Remove leading/trailing boilerplate lines contributed by the host site
 * (navigation, "sister projects", licence footers). Matched against a
 * caller-supplied list so each extraction profile owns its own furniture and
 * no generic rule can silently eat document text.
 */
function stripBoilerplateLines(text: string, patterns: RegExp[]): string {
  if (patterns.length === 0) return text;
  return text
    .split('\n')
    .filter((line) => !patterns.some((pattern) => pattern.test(line.trim())))
    .join('\n');
}

export interface CleanOptions {
  /** Site-specific furniture to drop, supplied by the extraction profile. */
  boilerplatePatterns?: RegExp[];
  /** Disable de-hyphenation for sources known to be born-digital. */
  rejoinHyphens?: boolean;
}

export interface CleanResult {
  text: string;
  /** Characters removed, for reporting in the admin UI. */
  charactersRemoved: number;
}

export function cleanExtractedText(raw: string, options: CleanOptions = {}): CleanResult {
  const original = raw;

  let text = stripInlineArtifacts(raw);
  text = normaliseWhitespace(text);
  text = stripBoilerplateLines(text, options.boilerplatePatterns ?? []);
  text = stripStandaloneArtifacts(text);
  if (options.rejoinHyphens !== false) text = rejoinHyphenatedLineBreaks(text);
  text = normaliseWhitespace(text);

  return {
    text,
    charactersRemoved: Math.max(0, original.length - text.length),
  };
}
