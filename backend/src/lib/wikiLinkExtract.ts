/**
 * Extract internal wiki link targets from block JSON payloads.
 */

import { normalizeAlias } from './normalizeAlias.js';

export interface ExtractedWikiTarget {
  targetPageId: string;
  label?: string;
  /** True when the mention/link has no resolvable page id. */
  isBrokenStub?: boolean;
}

export interface ExtractedWikiEdge {
  targetPageId: string;
  aliasText?: string;
}

export interface ExtractedUnresolvedWikilink {
  rawText: string;
  normalizedText: string;
  occurrenceCount: number;
}

export interface ExtractedSocialMention {
  mentionType: 'USER' | 'CHARACTER';
  targetUserId?: string;
  identityPageId?: string;
  label: string;
}

const WIKI_PATH_REGEX =
  /\/(?:c|campaigns?)\/[A-Za-z0-9_-]+\/(?:wiki\/([A-Za-z0-9_-]+)|characters\/([A-Za-z0-9_-]+)|event-([A-Za-z0-9_-]+))/g;

const WIKILINK_STUB_REGEX = /data-stub="true"/;

const BRACKET_WIKILINK_REGEX = /\[\[([^[\]]+)\]\]/g;

const MARKDOWN_BLOCK_TYPES = new Set(['text-tiptap', 'text-biography']);

function hasMentionSpanPrefix(text: string): boolean {
  // The legacy non-Unicode /i expression folds ASCII markers only.
  const folded = text.replace(/[A-Z]/g, (char) => char.toLowerCase());
  return folded.split('>').some((segment) => {
    const span = segment.indexOf('<span');
    return span >= 0 && (
      segment.indexOf('data-type="wikilink"', span + 5) >= 0 ||
      segment.indexOf('data-type="mention"', span + 5) >= 0
    );
  });
}

/**
 * Match the existing ordered, double-quoted mention attributes without regex
 * backtracking. Suffix tables retain the old greedy [^>]* and optional-capture
 * semantics, even for malformed quotes crossing a >. Each table is built once.
 */
function* mentionAttributeMatches(
  markdown: string,
  social = false,
  rename?: { pageId: string; body: boolean },
): Generator<RegExpExecArray> {
  const attributes: Array<{
    prefix: string; optional: boolean; values?: string[]; body?: boolean;
  }> = rename
    ? [
        { prefix: 'data-type="', optional: false, values: ['wikiLink', 'mention'] },
        { prefix: 'data-id="', optional: false, values: [rename.pageId] },
        rename.body
          ? { prefix: '>[[', optional: false, body: true }
          : { prefix: 'data-label="', optional: false },
      ]
    : social
    ? [
        { prefix: 'data-mention-type="', optional: false },
        { prefix: 'data-target-user-id="', optional: true },
        { prefix: 'data-identity-page-id="', optional: true },
        { prefix: 'data-label="', optional: false },
      ]
    : [
        { prefix: 'data-id="', optional: false },
        { prefix: 'data-label="', optional: false },
      ];
  const markers = rename ? ['<span'] : social
    ? ['data-type="socialMention"']
    : ['data-type="wikiLink"', 'data-type="mention"'];
  if (!markers.some((marker) => markdown.includes(marker))) return;

  const size = markdown.length + 1;
  const nextQuote = new Int32Array(size).fill(-1);
  const nextBracket = rename?.body ? new Int32Array(size).fill(-1) : undefined;
  let quote = -1;
  let bracket = -1;
  for (let i = markdown.length - 1; i >= 0; i -= 1) {
    if (markdown[i] === '"') quote = i;
    nextQuote[i] = quote;
    if (markdown[i] === ']') bracket = i;
    if (nextBracket) nextBracket[i] = bracket;
  }
  let nextEnd = Int32Array.from({ length: size }, (_, i) => i);
  const choices: Int32Array[] = [];
  for (let stage = attributes.length - 1; stage >= 0; stage -= 1) {
    const { prefix, optional, values, body } = attributes[stage];
    const ends = new Int32Array(size).fill(-1);
    const chosen = new Int32Array(size).fill(-1);
    for (let i = markdown.length; i >= 0; i -= 1) {
      // Prefer consuming another character, just as a greedy wildcard does.
      if (i < markdown.length && markdown[i] !== '>' && ends[i + 1] >= 0) {
        ends[i] = ends[i + 1];
        chosen[i] = chosen[i + 1];
        continue;
      }
      if (markdown.startsWith(prefix, i)) {
        const close = (body ? nextBracket! : nextQuote)[i + prefix.length];
        const suffix = body ? ']]</span>' : '"';
        const after = close + suffix.length;
        if (close >= 0 && markdown.startsWith(suffix, close) &&
            (!values || values.includes(markdown.slice(i + prefix.length, close))) &&
            nextEnd[after] >= 0) {
          ends[i] = nextEnd[after];
          chosen[i] = i;
          continue;
        }
      }
      if (optional && nextEnd[i] >= 0) {
        ends[i] = nextEnd[i];
        chosen[i] = -i - 2; // Encode a skipped optional attribute and its position.
      }
    }
    choices[stage] = chosen;
    nextEnd = ends;
  }

  for (let i = 0; i < markdown.length; i += 1) {
    const marker = markers.find((value) => markdown.startsWith(value, i));
    if (!marker) continue;
    let cursor = i + marker.length;
    const end = nextEnd[cursor];
    if (end < 0) continue;
    const captures: Array<string | undefined> = [];
    for (let stage = 0; stage < attributes.length; stage += 1) {
      const chosen = choices[stage][cursor];
      if (chosen < -1) {
        captures.push(undefined);
        cursor = -chosen - 2;
      } else {
        const start = chosen + attributes[stage].prefix.length;
        const close = (attributes[stage].body ? nextBracket! : nextQuote)[start];
        captures.push(markdown.slice(start, close));
        cursor = close + (attributes[stage].body ? ']]</span>'.length : 1);
      }
    }
    yield Object.assign([markdown.slice(i, end), ...captures], {
      index: i, input: markdown,
    }) as RegExpExecArray;
    i = end - 1;
  }
}

export function getBlockMarkdown(block: Record<string, unknown>): string {
  const type = (block as { type?: string }).type;
  if (!type || !MARKDOWN_BLOCK_TYPES.has(type)) return '';
  const markdown =
    typeof (block as { content?: { markdown?: unknown } }).content?.markdown ===
    'string'
      ? ((block as { content: { markdown: string } }).content.markdown as string)
      : '';
  return markdown;
}

function collectMarkdownFromBlocks(
  blocks: Array<Record<string, unknown>>,
): string[] {
  const parts: string[] = [];
  for (const block of blocks ?? []) {
    const markdown = getBlockMarkdown(block);
    if (markdown) parts.push(markdown);
  }
  return parts;
}

function pageIdFromPathMatch(match: RegExpExecArray): string {
  return match[1] ?? match[2] ?? (match[3] ? `event-${match[3]}` : '');
}

/** Unique target page ids referenced in blocks (valid hrefs and resolved spans only). */
export function extractWikiLinkTargetIdsFromBlocks(
  blocks: Array<Record<string, unknown>>,
): string[] {
  const edges = extractWikiEdgesFromBlocks(blocks);
  return [...new Set(edges.map((e) => e.targetPageId).filter(Boolean))];
}

/** Resolved wiki graph edges with optional alias text. */
export function extractWikiEdgesFromBlocks(
  blocks: Array<Record<string, unknown>>,
): ExtractedWikiEdge[] {
  const byTarget = new Map<string, ExtractedWikiEdge>();

  for (const markdown of collectMarkdownFromBlocks(blocks)) {
    let match: RegExpExecArray | null;
    WIKI_PATH_REGEX.lastIndex = 0;
    // eslint-disable-next-line no-cond-assign
    while ((match = WIKI_PATH_REGEX.exec(markdown)) !== null) {
      const pageId = pageIdFromPathMatch(match);
      if (pageId && !byTarget.has(pageId)) {
        byTarget.set(pageId, { targetPageId: pageId });
      }
    }

    for (const match of mentionAttributeMatches(markdown)) {
      const id = match[1]?.trim() ?? '';
      const label = match[2]?.trim() || undefined;
      const snippet = markdown.slice(
        Math.max(0, match.index - 20),
        match.index + match[0].length + 20,
      );
      const isStub = !id || WIKILINK_STUB_REGEX.test(snippet);
      if (!isStub && id && !byTarget.has(id)) {
        byTarget.set(id, { targetPageId: id, aliasText: label });
      }
    }
  }

  return Array.from(byTarget.values());
}

/** Unresolved [[wikilink]] stubs and empty-id spans. */
export function extractUnresolvedWikilinksFromBlocks(
  blocks: Array<Record<string, unknown>>,
): ExtractedUnresolvedWikilink[] {
  const byNormalized = new Map<string, ExtractedUnresolvedWikilink>();

  for (const markdown of collectMarkdownFromBlocks(blocks)) {
    let match: RegExpExecArray | null;
    for (const match of mentionAttributeMatches(markdown)) {
      const id = match[1]?.trim() ?? '';
      const label = match[2]?.trim() || '';
      const snippet = markdown.slice(
        Math.max(0, match.index - 20),
        match.index + match[0].length + 20,
      );
      const isStub = !id || WIKILINK_STUB_REGEX.test(snippet);
      if (!isStub) continue;
      const rawText = label || id;
      const normalizedText = normalizeAlias(rawText);
      if (!normalizedText) continue;
      const existing = byNormalized.get(normalizedText);
      if (existing) {
        existing.occurrenceCount += 1;
      } else {
        byNormalized.set(normalizedText, {
          rawText,
          normalizedText,
          occurrenceCount: 1,
        });
      }
    }

    BRACKET_WIKILINK_REGEX.lastIndex = 0;
    // eslint-disable-next-line no-cond-assign
    while ((match = BRACKET_WIKILINK_REGEX.exec(markdown)) !== null) {
      const before = markdown.slice(Math.max(0, match.index - 80), match.index);
      if (hasMentionSpanPrefix(before)) continue;
      const rawText = match[1].trim();
      const normalizedText = normalizeAlias(rawText);
      if (!normalizedText) continue;
      const existing = byNormalized.get(normalizedText);
      if (existing) {
        existing.occurrenceCount += 1;
      } else {
        byNormalized.set(normalizedText, {
          rawText,
          normalizedText,
          occurrenceCount: 1,
        });
      }
    }
  }

  return Array.from(byNormalized.values());
}

/** Social @mentions — separate from wiki graph. */
export function extractSocialMentionsFromBlocks(
  blocks: Array<Record<string, unknown>>,
): ExtractedSocialMention[] {
  const results: ExtractedSocialMention[] = [];

  for (const markdown of collectMarkdownFromBlocks(blocks)) {
    for (const match of mentionAttributeMatches(markdown, true)) {
      const mentionType =
        match[1]?.toUpperCase() === 'CHARACTER' ? 'CHARACTER' : 'USER';
      results.push({
        mentionType,
        targetUserId: match[2]?.trim() || undefined,
        identityPageId: match[3]?.trim() || undefined,
        label: match[4]?.trim() || '',
      });
    }
  }

  return results;
}

function extractAllWikiTargetsFromMarkdown(markdown: string): ExtractedWikiTarget[] {
  const byId = new Map<string, ExtractedWikiTarget>();

  let match: RegExpExecArray | null;
  WIKI_PATH_REGEX.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = WIKI_PATH_REGEX.exec(markdown)) !== null) {
    const pageId = pageIdFromPathMatch(match);
    if (pageId && !byId.has(pageId)) {
      byId.set(pageId, { targetPageId: pageId });
    }
  }

  for (const match of mentionAttributeMatches(markdown)) {
    const id = match[1]?.trim() ?? '';
    const label = match[2]?.trim() || undefined;
    const snippet = markdown.slice(
      Math.max(0, match.index - 20),
      match.index + match[0].length + 20,
    );
    const isStub = !id || WIKILINK_STUB_REGEX.test(snippet);
    if (isStub) {
      const key = `stub:${normalizeAlias(label || id)}`;
      if (!byId.has(key)) {
        byId.set(key, {
          targetPageId: '',
          label: label || id,
          isBrokenStub: true,
        });
      }
      continue;
    }
    if (!byId.has(id)) {
      byId.set(id, { targetPageId: id, label });
    }
  }

  BRACKET_WIKILINK_REGEX.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = BRACKET_WIKILINK_REGEX.exec(markdown)) !== null) {
    const before = markdown.slice(Math.max(0, match.index - 80), match.index);
    if (hasMentionSpanPrefix(before)) continue;
    const rawText = match[1].trim();
    const key = `stub:${normalizeAlias(rawText)}`;
    if (!byId.has(key)) {
      byId.set(key, {
        targetPageId: '',
        label: rawText,
        isBrokenStub: true,
      });
    }
  }

  return Array.from(byId.values());
}

/** Targets from a single markdown-bearing block. */
export function extractAllWikiTargetsFromBlock(
  block: Record<string, unknown>,
): ExtractedWikiTarget[] {
  const markdown = getBlockMarkdown(block);
  if (!markdown) return [];
  return extractAllWikiTargetsFromMarkdown(markdown);
}

export function extractUnresolvedWikilinksFromBlock(
  block: Record<string, unknown>,
): ExtractedUnresolvedWikilink[] {
  const markdown = getBlockMarkdown(block);
  if (!markdown) return [];
  return extractUnresolvedWikilinksFromBlocks([{ ...block, type: 'text-tiptap', content: { markdown } }]);
}

/** All extracted targets including broken mention stubs. */
export function extractAllWikiTargetsFromBlocks(
  blocks: Array<Record<string, unknown>>,
): ExtractedWikiTarget[] {
  const byId = new Map<string, ExtractedWikiTarget>();

  for (const edge of extractWikiEdgesFromBlocks(blocks)) {
    if (!byId.has(edge.targetPageId)) {
      byId.set(edge.targetPageId, {
        targetPageId: edge.targetPageId,
        label: edge.aliasText,
      });
    }
  }

  for (const unresolved of extractUnresolvedWikilinksFromBlocks(blocks)) {
    const key = `stub:${unresolved.normalizedText}`;
    if (!byId.has(key)) {
      byId.set(key, {
        targetPageId: '',
        label: unresolved.rawText,
        isBrokenStub: true,
      });
    }
  }

  return Array.from(byId.values());
}

export function countWordsInBlocks(
  blocks: Array<Record<string, unknown>>,
): { wordCount: number; characterCount: number } {
  let characterCount = 0;
  let wordCount = 0;
  for (const markdown of collectMarkdownFromBlocks(blocks)) {
    characterCount += markdown.length;
    const words = markdown.trim().split(/\s+/).filter(Boolean);
    wordCount += words.length;
  }
  return { wordCount, characterCount };
}

export function rewriteMarkdownForPageRename(
  markdown: string,
  pageId: string,
  oldTitle: string,
  newTitle: string,
): string {
  if (!markdown || oldTitle === newTitle) return markdown;

  const escapedId = pageId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pathPattern = `(/(?:c|campaign)/[A-Za-z0-9_-]+/(?:wiki/${escapedId}|characters/${escapedId}|event-${escapedId.replace(/^event-/, '')}))`;

  // Check each closing bracket once. A failed href is shared by all preceding
  // opening brackets, rather than retried for each unmatched '['.
  const hrefPattern = new RegExp(`${pathPattern}\\)`, 'y');
  const parts: string[] = [];
  let copied = 0;
  let opening = markdown.indexOf('[');
  let closing = -1;
  while (opening >= 0) {
    if (closing < opening) closing = markdown.indexOf(']', opening + 1);
    if (closing < 0) break;
    hrefPattern.lastIndex = closing + 2;
    const href = markdown[closing + 1] === '(' ? hrefPattern.exec(markdown) : null;
    if (!href) {
      opening = markdown.indexOf('[', closing + 1);
      continue;
    }
    const label = markdown.slice(opening + 1, closing).trim();
    const end = hrefPattern.lastIndex;
    parts.push(markdown.slice(copied, opening));
    parts.push(label === oldTitle || !label
      ? `[${newTitle}](${href[1]})`
      : markdown.slice(opening, end));
    copied = end;
    opening = markdown.indexOf('[', end);
  }
  parts.push(markdown.slice(copied));
  let next = parts.join('');

  for (const body of [false, true]) {
    const rewritten: string[] = [];
    let cursor = 0;
    for (const match of mentionAttributeMatches(next, false, { pageId, body })) {
      const suffix = body ? ']]</span>' : '"';
      const valueStart = match.index + match[0].length - match[3].length - suffix.length;
      // Retain the existing String.replace substitution contract for titles
      // containing $, while replacing only the scanner-selected match.
      const prefix = next.slice(match.index, valueStart);
      const replacement = `$1${newTitle}$2`.replace(/\$(\$|&|`|'|0?[12])/g, (_token, code: string) => {
        if (code === '$') return '$';
        if (code === '&') return match[0];
        if (code === '`') return next.slice(0, match.index);
        if (code === "'") return next.slice(match.index + match[0].length);
        return Number(code) === 1 ? prefix : suffix;
      });
      rewritten.push(next.slice(cursor, match.index), replacement);
      cursor = match.index + match[0].length;
    }
    rewritten.push(next.slice(cursor));
    next = rewritten.join('');
  }

  return next;
}

export function rewriteBlocksForPageRename(
  blocks: Array<Record<string, unknown>>,
  pageId: string,
  oldTitle: string,
  newTitle: string,
): Array<Record<string, unknown>> {
  let changed = false;
  const next = (blocks ?? []).map((block) => {
    if (!block || (block as { type?: string }).type !== 'text-tiptap') {
      return block;
    }
    const content = (block as { content?: { markdown?: string } }).content;
    const markdown =
      typeof content?.markdown === 'string' ? content.markdown : '';
    if (!markdown) return block;
    const rewritten = rewriteMarkdownForPageRename(
      markdown,
      pageId,
      oldTitle,
      newTitle,
    );
    if (rewritten === markdown) return block;
    changed = true;
    return {
      ...block,
      content: { ...content, markdown: rewritten },
    };
  });
  return changed ? next : blocks;
}
