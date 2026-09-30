import type { GlobalSearchMatchedOn } from '../../../../shared/globalSearch.js';

export type SearchMatchFieldKind =
  | 'title'
  | 'alias'
  | 'metadata'
  | 'custom_field'
  | 'body';

export interface SearchDocumentField {
  kind: SearchMatchFieldKind;
  /** User-facing label for excerpt display (e.g. "Biography", "Alias"). */
  label: string;
  text: string;
}

export interface SearchDocument {
  title: string;
  /** Identifying subtitle (profession, motto, …) — also searchable as metadata. */
  subtitle?: string;
  fields: SearchDocumentField[];
  inboundLinkCount?: number;
}

export interface RankedMatch {
  score: number;
  matchedOn: GlobalSearchMatchedOn;
  /** The field that produced the best non-title match (for excerpts). */
  matchField: SearchDocumentField | null;
}

const TIER = {
  exactTitle: 1_000_000,
  titlePrefix: 800_000,
  titleWord: 700_000,
  titleContains: 600_000,
  exactAlias: 500_000,
  aliasPrefix: 450_000,
  aliasContains: 400_000,
  metadata: 300_000,
  customField: 250_000,
  body: 100_000,
} as const;

function includesAllTokens(haystack: string, tokens: string[]): boolean {
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

function scoreTitle(title: string, tokens: string[], fullQuery: string): number | null {
  const lower = title.toLowerCase().trim();
  if (!lower) return null;
  if (lower === fullQuery) return TIER.exactTitle;
  if (tokens.length === 1) {
    const t = tokens[0]!;
    if (lower.startsWith(t)) return TIER.titlePrefix;
    const words = lower.split(/\s+/);
    if (words.some((w) => w === t || w.startsWith(t))) return TIER.titleWord;
    if (lower.includes(t)) return TIER.titleContains;
    return null;
  }
  if (includesAllTokens(lower, tokens)) {
    if (lower.startsWith(tokens[0]!)) return TIER.titlePrefix;
    return TIER.titleContains;
  }
  return null;
}

function scoreAlias(text: string, tokens: string[], fullQuery: string): number | null {
  const lower = text.toLowerCase().trim();
  if (!lower || !includesAllTokens(lower, tokens)) return null;
  if (lower === fullQuery) return TIER.exactAlias;
  if (tokens.length === 1 && lower.startsWith(tokens[0]!)) return TIER.aliasPrefix;
  return TIER.aliasContains;
}

function scoreGeneric(
  text: string,
  tokens: string[],
  base: number,
): number | null {
  if (!text.trim()) return null;
  if (!includesAllTokens(text, tokens)) return null;
  return base;
}

/**
 * Rank a search document against a query.
 * Prefer exact/prefix title matches over body matches so content search
 * does not degrade name lookup.
 */
export function rankSearchDocument(
  doc: SearchDocument,
  tokens: string[],
  fullQuery: string,
): RankedMatch | null {
  if (tokens.length === 0) return null;

  let bestScore = -1;
  let matchedOn: GlobalSearchMatchedOn = 'title';
  let matchField: SearchDocumentField | null = null;

  const titleScore = scoreTitle(doc.title, tokens, fullQuery);
  if (titleScore != null && titleScore > bestScore) {
    bestScore = titleScore;
    matchedOn = 'title';
    matchField = null;
  }

  for (const field of doc.fields) {
    let fieldScore: number | null = null;
    if (field.kind === 'alias') {
      fieldScore = scoreAlias(field.text, tokens, fullQuery);
    } else if (field.kind === 'metadata') {
      fieldScore = scoreGeneric(field.text, tokens, TIER.metadata);
    } else if (field.kind === 'custom_field') {
      fieldScore = scoreGeneric(field.text, tokens, TIER.customField);
    } else if (field.kind === 'body') {
      fieldScore = scoreGeneric(field.text, tokens, TIER.body);
    } else if (field.kind === 'title') {
      fieldScore = scoreTitle(field.text, tokens, fullQuery);
    }
    if (fieldScore != null && fieldScore > bestScore) {
      bestScore = fieldScore;
      matchedOn =
        field.kind === 'custom_field'
          ? 'custom_field'
          : field.kind === 'alias'
            ? 'alias'
            : field.kind === 'body'
              ? 'body'
              : field.kind === 'metadata'
                ? 'metadata'
                : 'title';
      matchField = field.kind === 'title' ? null : field;
    }
  }

  if (doc.subtitle) {
    const subScore = scoreGeneric(doc.subtitle, tokens, TIER.metadata);
    if (subScore != null && subScore > bestScore) {
      bestScore = subScore;
      matchedOn = 'metadata';
      matchField = {
        kind: 'metadata',
        label: 'Identity',
        text: doc.subtitle,
      };
    }
  }

  if (bestScore < 0) return null;

  // Bonus when every token appears somewhere in the document haystack.
  const haystack = [
    doc.title,
    doc.subtitle ?? '',
    ...doc.fields.map((f) => f.text),
  ]
    .join(' ')
    .toLowerCase();
  if (tokens.length > 1 && includesAllTokens(haystack, tokens)) {
    bestScore += 5_000;
  }

  bestScore += Math.min(doc.inboundLinkCount ?? 0, 100);

  return { score: bestScore, matchedOn, matchField };
}

/** Stable sort: higher score first, then title A→Z. */
export function compareRankedResults(
  a: { score: number; title: string },
  b: { score: number; title: string },
): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.title.localeCompare(b.title);
}
