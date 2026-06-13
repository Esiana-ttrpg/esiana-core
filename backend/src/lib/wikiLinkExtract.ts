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

const WIKILINK_SPAN_REGEX =
  /data-type="(?:wikiLink|mention)"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"/g;
const WIKILINK_STUB_REGEX = /data-stub="true"/;

const SOCIAL_MENTION_REGEX =
  /data-type="socialMention"[^>]*data-mention-type="([^"]*)"[^>]*(?:data-target-user-id="([^"]*)")?[^>]*(?:data-identity-page-id="([^"]*)")?[^>]*data-label="([^"]*)"/g;

const BRACKET_WIKILINK_REGEX = /\[\[([^[\]]+)\]\]/g;

const MARKDOWN_BLOCK_TYPES = new Set(['text-tiptap', 'text-biography']);

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

    WIKILINK_SPAN_REGEX.lastIndex = 0;
    // eslint-disable-next-line no-cond-assign
    while ((match = WIKILINK_SPAN_REGEX.exec(markdown)) !== null) {
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
    WIKILINK_SPAN_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = WIKILINK_SPAN_REGEX.exec(markdown)) !== null) {
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
      if (/<span[^>]*data-type="(?:wikiLink|mention)"/i.test(before)) continue;
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
    SOCIAL_MENTION_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;
    // eslint-disable-next-line no-cond-assign
    while ((match = SOCIAL_MENTION_REGEX.exec(markdown)) !== null) {
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

  WIKILINK_SPAN_REGEX.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = WIKILINK_SPAN_REGEX.exec(markdown)) !== null) {
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
    if (/<span[^>]*data-type="(?:wikiLink|mention)"/i.test(before)) continue;
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

  let next = markdown.replace(
    new RegExp(`\\[([^\\]]*)\\]\\(${pathPattern}\\)`, 'g'),
    (_m, label: string, href: string) => {
      const trimmed = label.trim();
      if (trimmed === oldTitle || trimmed === '') {
        return `[${newTitle}](${href})`;
      }
      return _m;
    },
  );

  const spanPattern = `(<span[^>]*data-type="(?:wikiLink|mention)"[^>]*data-id="${escapedId}"[^>]*data-label=")[^"]*(")`;
  next = next.replace(new RegExp(spanPattern, 'g'), `$1${newTitle}$2`);
  next = next.replace(
    new RegExp(
      `(<span[^>]*data-type="(?:wikiLink|mention)"[^>]*data-id="${escapedId}"[^>]*>\\[\\[)[^\\]]*(\\]\\]</span>)`,
      'g',
    ),
    `$1${newTitle}$2`,
  );

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
