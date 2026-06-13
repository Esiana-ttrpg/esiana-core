import type { WikiPageBlock } from '@/types/wiki';
import type { BlockSemanticIndex, RawBlockSemanticIndex } from './types';

export const SEMANTIC_INDEX_TEXT_CAP = 8192;
export const SEMANTIC_KEYWORD_MAX_COUNT = 64;
export const SEMANTIC_KEYWORD_MAX_LENGTH = 128;
export const SEMANTIC_REFERENCE_MAX_COUNT = 128;

const WIKI_PATH_REGEX =
  /\/(?:c|campaigns?)\/[A-Za-z0-9_-]+\/(?:wiki\/([A-Za-z0-9_-]+)|characters\/([A-Za-z0-9_-]+)|event-([A-Za-z0-9_-]+))/g;

const WIKILINK_SPAN_REGEX =
  /data-type="(?:wikiLink|mention)"[^>]*data-id="([^"]*)"[^>]*data-label="([^"]*)"/g;

const WIKILINK_STUB_REGEX = /data-stub="true"/;

const BRACKET_WIKILINK_REGEX = /\[\[([^[\]]+)\]\]/g;

export function joinIndexParts(parts: Array<string | null | undefined>): string {
  const segments = parts
    .map((part) => (typeof part === 'string' ? part.trim().replace(/\s+/g, ' ') : ''))
    .filter(Boolean);
  return segments.join('\n\n');
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

export function markdownFromBlock(block: WikiPageBlock): string {
  const md = (block.content as { markdown?: unknown })?.markdown;
  return typeof md === 'string' ? md : '';
}

/** Plain text for semanticIndexText — strips HTML and bracket wikilinks. */
export function plainTextFromMarkdown(markdown: string): string {
  if (!markdown) return '';
  let text = markdown.replace(/<[^>]+>/g, ' ');
  text = text.replace(BRACKET_WIKILINK_REGEX, ' ');
  text = text.replace(WIKILINK_SPAN_REGEX, ' ');
  text = text.replace(WIKI_PATH_REGEX, ' ');
  return normalizeWhitespace(text);
}

function pageIdFromPathMatch(match: RegExpExecArray): string {
  return match[1] ?? match[2] ?? (match[3] ? `event-${match[3]}` : '');
}

/** Extract resolved wiki page ids from raw markdown (never labels or stubs). */
export function extractWikiReferenceIds(markdown: string): string[] {
  if (!markdown) return [];
  const ids = new Set<string>();

  WIKILINK_SPAN_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = WIKILINK_SPAN_REGEX.exec(markdown)) !== null) {
    const id = match[1]?.trim() ?? '';
    const snippet = markdown.slice(
      Math.max(0, match.index - 20),
      match.index + match[0].length + 20,
    );
    const isStub = !id || WIKILINK_STUB_REGEX.test(snippet);
    if (!isStub && id) ids.add(id);
  }

  WIKI_PATH_REGEX.lastIndex = 0;
  // eslint-disable-next-line no-cond-assign
  while ((match = WIKI_PATH_REGEX.exec(markdown)) !== null) {
    const id = pageIdFromPathMatch(match);
    if (id) ids.add(id);
  }

  return [...ids];
}

/** Bracket wikilink labels as keyword candidates (from raw markdown). */
export function bracketLabels(markdown: string): string[] {
  if (!markdown) return [];
  const labels: string[] = [];
  BRACKET_WIKILINK_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = BRACKET_WIKILINK_REGEX.exec(markdown)) !== null) {
    const before = markdown.slice(Math.max(0, match.index - 80), match.index);
    if (/<span[^>]*data-type="(?:wikiLink|mention)"/i.test(before)) continue;
    const label = match[1]?.trim();
    if (label) labels.push(label);
  }
  return labels;
}

export function normalizeKeywords(candidates: string[]): string[] {
  const byLower = new Map<string, string>();
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    let token = normalizeWhitespace(raw);
    if (!token) continue;
    if (token.length > SEMANTIC_KEYWORD_MAX_LENGTH) {
      token = token.slice(0, SEMANTIC_KEYWORD_MAX_LENGTH);
    }
    const key = token.toLowerCase();
    if (!byLower.has(key)) byLower.set(key, token);
  }
  const sorted = [...byLower.values()].sort((a, b) => a.localeCompare(b));
  return sorted.slice(0, SEMANTIC_KEYWORD_MAX_COUNT);
}

export function normalizeReferences(candidates: string[]): string[] {
  const ids = new Set<string>();
  for (const raw of candidates) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (id) ids.add(id);
  }
  return [...ids].sort((a, b) => a.localeCompare(b)).slice(0, SEMANTIC_REFERENCE_MAX_COUNT);
}

export function normalizeIndexText(text: string): string {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= SEMANTIC_INDEX_TEXT_CAP) return normalized;
  return normalized.slice(0, SEMANTIC_INDEX_TEXT_CAP);
}

export function normalizeBlockSemanticIndex(raw: RawBlockSemanticIndex): BlockSemanticIndex {
  return {
    semanticIndexText: normalizeIndexText(raw.semanticIndexText ?? ''),
    semanticKeywords: normalizeKeywords(raw.semanticKeywords ?? []),
    semanticReferences: normalizeReferences(raw.semanticReferences ?? []),
  };
}

export function emptyRawIndex(): RawBlockSemanticIndex {
  return {
    semanticIndexText: '',
    semanticKeywords: [],
    semanticReferences: [],
  };
}

export function collectStringContentFields(content: unknown): string[] {
  if (!content || typeof content !== 'object' || Array.isArray(content)) return [];
  const values: string[] = [];
  for (const value of Object.values(content as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) values.push(value.trim());
  }
  return values;
}
