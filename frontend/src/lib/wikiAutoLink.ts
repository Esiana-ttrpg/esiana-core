import type { Editor } from '@tiptap/react';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { buildPageIdByTitle } from '@/lib/sidebarNav';

/** Word characters for title boundary checks (letters, digits, apostrophe, hyphen). */
const WORD_CHAR = /[\p{L}\p{N}'_-]/u;

export interface WikiTitleIndex {
  titlesByLength: string[];
  byTitle: Map<string, { pageId: string; title: string }>;
}

export interface LinkableSegment {
  text: string;
  posMap: number[];
}

export interface TitleMatch {
  start: number;
  end: number;
  title: string;
  pageId: string;
}

export interface DocLinkMatch {
  from: number;
  to: number;
  pageId: string;
}

export type DocumentScanFailureReason =
  | 'no_campaign'
  | 'no_index'
  | 'no_matches'
  | 'no_editor';

export interface DocumentScanResult {
  linkedCount: number;
  ok: boolean;
  reason?: DocumentScanFailureReason;
}

/** Normalize invisible / unicode whitespace for stable title matching. */
export function normalizeScanText(text: string): string {
  return text
    .replace(/[\u00a0\u2000-\u200b\u202f\u205f\u3000]/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"');
}

interface MatchPattern {
  pattern: string;
  entry: { pageId: string; title: string };
}

/** Longest-first patterns, including article-less forms of "The …" titles. */
function buildMatchPatterns(index: WikiTitleIndex): MatchPattern[] {
  const patterns: MatchPattern[] = [];
  const seen = new Set<string>();

  for (const title of index.titlesByLength) {
    const entry = index.byTitle.get(title);
    if (!entry) continue;

    const add = (pattern: string) => {
      const key = pattern.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      patterns.push({ pattern, entry });
    };

    add(title);

    const articleless = title.replace(/^the\s+/i, '');
    if (articleless !== title) {
      add(articleless);
    }
  }

  return patterns.sort(
    (a, b) => b.pattern.length - a.pattern.length || a.pattern.localeCompare(b.pattern),
  );
}

/** Build title index from wiki pages (longest-first, includes nav title aliases). */
export function buildWikiTitleIndex(
  flatPages: { id: string; title: string }[],
): WikiTitleIndex {
  const byTitle = new Map<string, { pageId: string; title: string }>();

  for (const page of flatPages) {
    const canonical = page.title?.trim();
    if (!canonical) continue;
    byTitle.set(canonical, { pageId: page.id, title: canonical });
  }

  const pageIdByTitle = buildPageIdByTitle(flatPages);
  for (const [key, pageId] of pageIdByTitle) {
    if (byTitle.has(key)) continue;
    const page = flatPages.find((p) => p.id === pageId);
    if (!page?.title?.trim()) continue;
    byTitle.set(key, { pageId: page.id, title: page.title.trim() });
  }

  const titlesByLength = [...byTitle.keys()].sort(
    (a, b) => b.length - a.length || a.localeCompare(b),
  );
  return { titlesByLength, byTitle };
}

/** Ensures a title match is not a substring inside a larger token. */
export function isTitleBoundaryMatch(
  text: string,
  start: number,
  titleLen: number,
): boolean {
  const end = start + titleLen;
  if (start < 0 || end > text.length) return false;

  if (start > 0 && WORD_CHAR.test(text[start - 1]!)) return false;
  if (end < text.length && WORD_CHAR.test(text[end]!)) return false;
  return true;
}

function textMatchesTitleAt(
  plainText: string,
  start: number,
  title: string,
): boolean {
  const slice = plainText.slice(start, start + title.length);
  if (slice.length !== title.length) return false;
  return (
    slice === title ||
    slice.toLowerCase() === title.toLowerCase()
  );
}

/**
 * Find longest-first, non-overlapping title matches in plain text.
 * Scans left-to-right so "Red Dragon Inn" wins over later "Red" / "Dragon Inn" overlaps.
 */
export function findNonOverlappingTitleMatches(
  plainText: string,
  index: WikiTitleIndex,
): TitleMatch[] {
  const normalized = normalizeScanText(plainText);
  if (!normalized.length || !index.titlesByLength.length) return [];

  const patterns = buildMatchPatterns(index);
  const chosen: TitleMatch[] = [];
  let i = 0;

  while (i < normalized.length) {
    let matched = false;

    for (const { pattern, entry } of patterns) {
      if (!textMatchesTitleAt(normalized, i, pattern)) continue;
      if (!isTitleBoundaryMatch(normalized, i, pattern.length)) continue;

      chosen.push({
        start: i,
        end: i + pattern.length,
        title: entry.title,
        pageId: entry.pageId,
      });
      i += pattern.length;
      matched = true;
      break;
    }

    if (!matched) i += 1;
  }

  return chosen;
}

function nodeHasExcludedMark(node: ProseMirrorNode): boolean {
  return node.marks.some(
    (mark) => mark.type.name === 'link' || mark.type.name === 'code',
  );
}

/**
 * Flatten scannable plain text per textblock with a position map back to the doc.
 * Skips existing links, inline code, and code blocks.
 */
export function collectLinkableSegments(doc: ProseMirrorNode): LinkableSegment[] {
  const segments: LinkableSegment[] = [];

  doc.descendants((node, pos) => {
    if (!node.isTextblock) return;
    if (node.type.name === 'codeBlock') return;

    const from = pos + 1;
    const to = pos + node.nodeSize - 1;
    if (from >= to) return;

    let text = '';
    const posMap: number[] = [];

    doc.nodesBetween(from, to, (child, childPos) => {
      if (!child.isText) return;
      if (nodeHasExcludedMark(child)) return;
      const childText = child.text ?? '';
      for (let i = 0; i < childText.length; i++) {
        text += childText[i]!;
        posMap.push(childPos + i);
      }
    });

    if (text.length > 0) {
      segments.push({ text: normalizeScanText(text), posMap });
    }
  });

  return segments;
}

/** Map segment-local matches to absolute document positions. */
export function mapSegmentMatchesToDoc(
  segment: LinkableSegment,
  matches: TitleMatch[],
): DocLinkMatch[] {
  const docMatches: DocLinkMatch[] = [];
  for (const match of matches) {
    const from = segment.posMap[match.start];
    const toPos = segment.posMap[match.end - 1];
    if (from === undefined || toPos === undefined) continue;
    docMatches.push({ from, to: toPos + 1, pageId: match.pageId });
  }
  return docMatches;
}

/**
 * Scan the document and link exact wiki page titles in one ProseMirror transaction.
 * Serialized markdown must stay aligned with backend `WIKI_PATH_REGEX` in wikiLinkExtract.
 */
export function scanDocumentWikiAutoLink(
  editor: Editor,
  options: {
    campaignHandle: string;
    flatPages: { id: string; title: string }[];
  },
): DocumentScanResult {
  if (!options.campaignHandle) {
    return { linkedCount: 0, ok: false, reason: 'no_campaign' };
  }

  const index = buildWikiTitleIndex(options.flatPages);
  if (index.titlesByLength.length === 0) {
    return { linkedCount: 0, ok: false, reason: 'no_index' };
  }

  const { state } = editor;
  const linkType = state.schema.marks.link;
  if (!linkType) {
    return { linkedCount: 0, ok: false, reason: 'no_editor' };
  }

  const docMatches: DocLinkMatch[] = [];
  for (const segment of collectLinkableSegments(state.doc)) {
    const matches = findNonOverlappingTitleMatches(segment.text, index);
    docMatches.push(...mapSegmentMatchesToDoc(segment, matches));
  }

  if (docMatches.length === 0) {
    return { linkedCount: 0, ok: false, reason: 'no_matches' };
  }

  const selection = state.selection;
  const tr = state.tr;
  let linkedCount = 0;

  const sorted = [...docMatches].sort((a, b) => b.from - a.from);
  for (const match of sorted) {
    if (state.doc.rangeHasMark(match.from, match.to, linkType)) continue;
    const href = campaignWikiPath(
      options.campaignHandle,
      match.pageId,
      options.flatPages as unknown as Parameters<typeof campaignWikiPath>[2],
    );
    tr.addMark(match.from, match.to, linkType.create({ href }));
    linkedCount += 1;
  }

  if (tr.docChanged) {
    tr.setSelection(selection.map(tr.doc, tr.mapping));
    editor.view.dispatch(tr);
    return { linkedCount, ok: true };
  }

  return { linkedCount: 0, ok: false, reason: 'no_matches' };
}

export function documentScanMessage(result: DocumentScanResult): string {
  switch (result.reason) {
    case 'no_campaign':
      return 'Campaign context is required to create wiki links.';
    case 'no_index':
      return 'No wiki pages found to link.';
    case 'no_matches':
      return 'No unlinked page titles found in this document.';
    case 'no_editor':
      return 'Could not apply auto-link.';
    default:
      return 'Could not apply auto-link.';
  }
}
