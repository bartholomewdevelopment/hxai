/**
 * HTML to text.
 *
 * Dependency-free rather than cheerio/jsdom: the extraction profiles target a
 * handful of known archive layouts, and a full DOM parser buys nothing here
 * while adding a large dependency to a job that runs offline.
 */

const BLOCK_TAGS =
  /<\/?(p|div|br|h[1-6]|li|tr|blockquote|section|article|hr|table|pre|dd|dt)\b[^>]*>/gi;

const DROP_ELEMENTS =
  /<(script|style|noscript|head|nav|footer|form|select|button)\b[^>]*>[\s\S]*?<\/\1>/gi;

const SELF_CLOSING_DROP = /<(img|input|link|meta)\b[^>]*\/?>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  deg: '°',
  sect: '§',
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Convert an HTML fragment to plain text, preserving paragraph breaks.
 * Block-level tags become newlines so paragraph structure survives for the
 * chunker; everything else is dropped.
 */
export function htmlToText(html: string): string {
  let text = html;
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');
  text = text.replace(DROP_ELEMENTS, ' ');
  text = text.replace(SELF_CLOSING_DROP, ' ');
  text = text.replace(BLOCK_TAGS, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = decodeEntities(text);
  return text;
}

/**
 * Return the inner HTML of the first element carrying `class="...name..."`,
 * or null. Depth-aware over the given tag so nested elements of the same type
 * do not truncate the slice early.
 */
export function sliceByClass(html: string, className: string, tag = 'div'): string | null {
  const opener = new RegExp(`<${tag}\\b[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>`, 'i');
  const match = opener.exec(html);
  if (!match) return null;

  const start = match.index + match[0].length;
  const scanner = new RegExp(`<${tag}\\b[^>]*>|</${tag}>`, 'gi');
  scanner.lastIndex = start;

  let depth = 1;
  let found: RegExpExecArray | null;
  while ((found = scanner.exec(html)) !== null) {
    depth += found[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(start, found.index);
  }
  return html.slice(start);
}

/** Text between two markers, exclusive. Used where a site has no clean container. */
export function sliceBetween(
  html: string,
  startPattern: RegExp,
  endPattern: RegExp,
): string | null {
  const start = startPattern.exec(html);
  if (!start) return null;
  const from = start.index + start[0].length;
  const rest = html.slice(from);
  const end = endPattern.exec(rest);
  return end ? rest.slice(0, end.index) : rest;
}
