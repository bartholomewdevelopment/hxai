import { cleanExtractedText, type CleanResult } from './clean';
import { htmlToText, sliceBetween, sliceByClass } from './html';

/**
 * Per-archive extraction profiles.
 *
 * Each archive presents its documents differently, and a generic "strip all
 * tags" pass would pull navigation menus and licence footers into the
 * historical record. A profile knows how to isolate the document body on one
 * specific site, and nothing else.
 *
 * Adding an archive means adding a profile here — no other file changes.
 */

export interface ExtractionInput {
  /** Raw response body. */
  body: string;
  /** URL it came from, used to select a profile. */
  url: string;
}

export interface ExtractionOutput {
  text: string;
  profile: string;
  charactersRemoved: number;
  warnings: string[];
}

export interface ExtractionProfile {
  name: string;
  /** Whether this profile handles the given URL. */
  matches(url: string): boolean;
  /** Isolate the document body from the response. Return null if not found. */
  isolate(body: string): string | null;
  boilerplatePatterns?: RegExp[];
}

/**
 * Yale Law School, Avalon Project.
 * Body sits between the `document-title` div and the footer navigation.
 */
const avalon: ExtractionProfile = {
  name: 'avalon',
  matches: (url) => /(^|\.)avalon\.law\.yale\.edu/i.test(new URL(url).hostname),
  isolate: (body) =>
    sliceBetween(
      body,
      /<div\s+class="document-title"[^>]*>[\s\S]*?<\/div>/i,
      /<div\s+class="(NavBottom|FooterContainer|Copyright)"/i,
    ),
  boilerplatePatterns: [
    /^Avalon Home$/i,
    /^Document Collections$/i,
    /^Ancient\b/i,
    /^Medieval\b/i,
    /^\d+\s*(st|nd|rd|th)?\s*Century\b/i,
  ],
};

/**
 * Wikisource, via the MediaWiki `action=parse` HTML.
 *
 * The parsed HTML is wrapped in `.mw-parser-output`. Header templates,
 * navigation between works, and the "sister projects" box are stripped by
 * pattern because they render as ordinary text inside that container.
 */
const wikisource: ExtractionProfile = {
  name: 'wikisource',
  matches: (url) => /wikisource\.org$/i.test(new URL(url).hostname),
  isolate: (body) => sliceByClass(body, 'mw-parser-output') ?? body,
  boilerplatePatterns: [
    /^←/,
    /^→/,
    /^related portals\s*:/i,
    /^sister projects\s*:/i,
    /^Wikidata item$/i,
    /^This work is in the public domain/i,
    /^This page was last edited/i,
    /^\[?\s*edit\s*\]?$/i,
    /^Versions? of/i,
    /^For works with similar titles/i,
  ],
};

/**
 * Project Gutenberg plain-text files.
 * The licence boilerplate is delimited by well-known start/end markers.
 */
const gutenberg: ExtractionProfile = {
  name: 'gutenberg',
  matches: (url) => /(^|\.)gutenberg\.org$/i.test(new URL(url).hostname),
  isolate: (body) => {
    const between = sliceBetween(
      body,
      /\*\*\*\s*START OF (THE|THIS) PROJECT GUTENBERG EBOOK[^*]*\*\*\*/i,
      /\*\*\*\s*END OF (THE|THIS) PROJECT GUTENBERG EBOOK/i,
    );
    return between ?? body;
  },
};

/** Fallback: whole document, tags stripped. Flagged as lower confidence. */
const generic: ExtractionProfile = {
  name: 'generic',
  matches: () => true,
  isolate: (body) => body,
};

const PROFILES: ExtractionProfile[] = [avalon, wikisource, gutenberg, generic];

export function selectProfile(url: string): ExtractionProfile {
  return PROFILES.find((profile) => profile.matches(url)) ?? generic;
}

/**
 * Extract document text from a fetched response.
 *
 * Plain-text bodies skip HTML handling entirely; anything else goes through
 * the matching profile's isolation step first so site furniture never reaches
 * the cleaner.
 */
export function extractText(input: ExtractionInput, contentType = 'text/html'): ExtractionOutput {
  const profile = selectProfile(input.url);
  const warnings: string[] = [];

  if (profile.name === 'generic') {
    warnings.push(
      `No extraction profile for ${new URL(input.url).hostname}; used the generic fallback. ` +
        'Review the stored text before publishing.',
    );
  }

  const isPlainText = /text\/plain/i.test(contentType) && !/<html/i.test(input.body.slice(0, 2000));

  let working: string;
  if (isPlainText) {
    working = profile.isolate(input.body) ?? input.body;
  } else {
    const isolated = profile.isolate(input.body);
    if (isolated === null) {
      warnings.push(
        `Profile '${profile.name}' could not locate the document container; ` +
          'fell back to the whole page.',
      );
    }
    working = htmlToText(isolated ?? input.body);
  }

  const cleaned: CleanResult = cleanExtractedText(working, {
    boilerplatePatterns: profile.boilerplatePatterns ?? [],
    rejoinHyphens: !isPlainText || profile.name === 'gutenberg',
  });

  if (cleaned.text.length < 200) {
    warnings.push(
      `Extracted only ${cleaned.text.length} characters — likely an extraction failure.`,
    );
  }

  return {
    text: cleaned.text,
    profile: profile.name,
    charactersRemoved: cleaned.charactersRemoved,
    warnings,
  };
}
