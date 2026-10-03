/**
 * Ranges in markdown where entity/concept enrichment must not match
 * (existing wiki links, code, markdown links).
 */

export interface TextRange {
  start: number;
  end: number;
}

function pushRange(ranges: TextRange[], start: number, end: number): void {
  if (end <= start) return;
  ranges.push({ start, end });
}

/** Collect protected [start, end) ranges in markdown source. */
export function findProtectedMarkdownRanges(markdown: string): TextRange[] {
  const ranges: TextRange[] = [];
  const patterns: RegExp[] = [
    // Fenced code blocks
    /```[\s\S]*?```/g,
    // Inline code
    /`[^`\n]+`/g,
    // Wiki link spans (TipTap serialized)
    /<span[^>]*data-type="(?:wikiLink|mention)"[^>]*>\[\[[^\]]+\]\]<\/span>/gi,
    // Bracket wikilinks
    /\[\[[^\]]+\]\]/g,
    // Markdown links [text](url)
    /\[[^\]]*\]\([^)]*\)/g,
    // Autolinks / bare wiki paths used as hrefs are covered by markdown links;
    // also protect raw HTML tags coarsely
    /<\/?[a-zA-Z][^>]*>/g,
  ];

  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = pattern.exec(markdown)) !== null) {
      pushRange(ranges, match.index, match.index + match[0].length);
    }
  }

  return mergeRanges(ranges);
}

export function mergeRanges(ranges: TextRange[]): TextRange[] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextRange[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i]!;
    const last = merged[merged.length - 1]!;
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

export function overlapsProtected(
  start: number,
  end: number,
  protectedRanges: TextRange[],
): boolean {
  for (const range of protectedRanges) {
    if (start < range.end && end > range.start) return true;
  }
  return false;
}

/** Split markdown into paragraphs with absolute offsets into the full string. */
export function splitParagraphs(
  markdown: string,
): Array<{ start: number; end: number; text: string }> {
  if (!markdown) return [];
  const paragraphs: Array<{ start: number; end: number; text: string }> = [];
  const re = /(?:\r?\n){2,}/g;
  let last = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(markdown)) !== null) {
    const start = last;
    const end = match.index;
    const text = markdown.slice(start, end);
    if (text.trim().length > 0) {
      paragraphs.push({ start, end, text });
    }
    last = match.index + match[0].length;
  }
  const tail = markdown.slice(last);
  if (tail.trim().length > 0) {
    paragraphs.push({ start: last, end: markdown.length, text: tail });
  }
  if (paragraphs.length === 0 && markdown.trim().length > 0) {
    paragraphs.push({ start: 0, end: markdown.length, text: markdown });
  }
  return paragraphs;
}

const WORD_BOUNDARY_LEFT = /[A-Za-z0-9'_]/;
const WORD_BOUNDARY_RIGHT = /[A-Za-z0-9'_]/;

export function findPhraseMatches(
  haystack: string,
  phrase: string,
  protectedRanges: TextRange[],
): Array<{ start: number; end: number }> {
  if (!phrase.trim() || !haystack) return [];
  const lowerHay = haystack.toLowerCase();
  const lowerPhrase = phrase.toLowerCase();
  const matches: Array<{ start: number; end: number }> = [];
  let from = 0;
  while (from <= lowerHay.length - lowerPhrase.length) {
    const idx = lowerHay.indexOf(lowerPhrase, from);
    if (idx < 0) break;
    const end = idx + lowerPhrase.length;
    const leftOk = idx === 0 || !WORD_BOUNDARY_LEFT.test(haystack[idx - 1]!);
    const rightOk =
      end >= haystack.length || !WORD_BOUNDARY_RIGHT.test(haystack[end]!);
    if (leftOk && rightOk && !overlapsProtected(idx, end, protectedRanges)) {
      matches.push({ start: idx, end });
    }
    from = idx + 1;
  }
  return matches;
}
