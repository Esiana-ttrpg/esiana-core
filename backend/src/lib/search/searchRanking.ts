import type { GlobalSearchMatchedOn } from '../../../../shared/globalSearch.js';
import { isRecordSearchTypeKey } from '../../../../shared/globalSearchTypes.js';

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
  /** Canonical search type key (character, session-note, …). */
  typeKey?: string;
  /** Timestamp used for within-tier recency (session date or page updatedAt). */
  recencyAt?: Date | null;
  /**
   * When set, the document was retrieved via the fuzzy name pass rather than
   * a strict token match. Ranking uses fuzzyTitle / fuzzyAlias tiers.
   */
  fuzzy?: { similarity: number; on: 'title' | 'alias' };
}

export interface RankedMatch {
  score: number;
  matchedOn: GlobalSearchMatchedOn;
  /** The field that produced the best non-title match (for excerpts). */
  matchField: SearchDocumentField | null;
  /**
   * Internal ranking breakdown. Shape is intentionally unstable — only
   * surfaced under explain=1 as a free-form diagnostic object.
   */
  explain?: Record<string, unknown>;
}

/** Base tier weights — 100k apart so within-tier signals stay inside a band. */
export const TIER = {
  exactTitle: 1_000_000,
  titlePrefix: 800_000,
  titleWord: 700_000,
  titleContains: 600_000,
  exactAlias: 500_000,
  aliasPrefix: 450_000,
  aliasContains: 400_000,
  fuzzyTitle: 380_000,
  fuzzyAlias: 350_000,
  metadata: 300_000,
  customField: 250_000,
  body: 100_000,
} as const;

export type TierName = keyof typeof TIER;

/** Distance between adjacent tiers — used as the best-section dominance margin. */
export const TIER_WIDTH = 100_000;

const SPECIFICITY_MAX = 40_000;
const TYPE_PRIOR_BONUS = 20_000;
const RECENCY_MAX = 10_000;
const RECENCY_HALF_LIFE_MS = 90 * 24 * 60 * 60 * 1000;
const OCCURRENCE_MAX = 2_000;
const ALL_TOKENS_BONUS = 5_000;
const INBOUND_LINKS_MAX = 100;
const FUZZY_SIMILARITY_SCALE = 30_000;

function includesAllTokens(haystack: string, tokens: string[]): boolean {
  const lower = haystack.toLowerCase();
  return tokens.every((t) => lower.includes(t));
}

function matchedCharCount(title: string, tokens: string[]): number {
  const lower = title.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    if (lower.includes(t)) total += t.length;
  }
  return total;
}

function specificityBonus(name: string, tokens: string[]): number {
  const len = name.trim().length;
  if (len <= 0) return 0;
  const coverage = Math.min(1, matchedCharCount(name, tokens) / len);
  return Math.round(coverage * SPECIFICITY_MAX);
}

/**
 * Type prior applies only to weaker name tiers (prefix/word/contains/alias).
 * Exact-title / exact-alias are type-neutral so a session note titled "Yuna"
 * ties a character titled "Yuna" on tier and prior.
 */
function typePriorBonus(tier: TierName, typeKey: string | undefined): number {
  if (!typeKey) return 0;
  if (tier === 'exactTitle' || tier === 'exactAlias') return 0;
  if (
    tier === 'titlePrefix' ||
    tier === 'titleWord' ||
    tier === 'titleContains' ||
    tier === 'aliasPrefix' ||
    tier === 'aliasContains' ||
    tier === 'fuzzyTitle' ||
    tier === 'fuzzyAlias'
  ) {
    return isRecordSearchTypeKey(typeKey) ? 0 : TYPE_PRIOR_BONUS;
  }
  return 0;
}

function recencyBonus(recencyAt: Date | null | undefined, now: number): number {
  if (!recencyAt || Number.isNaN(recencyAt.getTime())) return 0;
  const age = Math.max(0, now - recencyAt.getTime());
  const decay = Math.pow(0.5, age / RECENCY_HALF_LIFE_MS);
  return Math.round(decay * RECENCY_MAX);
}

function countOccurrences(haystack: string, tokens: string[]): number {
  const lower = haystack.toLowerCase();
  let total = 0;
  for (const t of tokens) {
    if (!t) continue;
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(t, idx);
      if (found < 0) break;
      total += 1;
      idx = found + t.length;
    }
  }
  return total;
}

function occurrenceBonus(text: string, tokens: string[]): number {
  const n = countOccurrences(text, tokens);
  return Math.min(OCCURRENCE_MAX, Math.min(n, 10) * 200);
}

function scoreTitle(
  title: string,
  tokens: string[],
  fullQuery: string,
): { score: number; tier: TierName } | null {
  const lower = title.toLowerCase().trim();
  if (!lower) return null;
  if (lower === fullQuery) return { score: TIER.exactTitle, tier: 'exactTitle' };
  if (tokens.length === 1) {
    const t = tokens[0]!;
    if (lower.startsWith(t)) return { score: TIER.titlePrefix, tier: 'titlePrefix' };
    const words = lower.split(/\s+/);
    if (words.some((w) => w === t || w.startsWith(t))) {
      return { score: TIER.titleWord, tier: 'titleWord' };
    }
    if (lower.includes(t)) return { score: TIER.titleContains, tier: 'titleContains' };
    return null;
  }
  if (includesAllTokens(lower, tokens)) {
    if (lower.startsWith(tokens[0]!)) {
      return { score: TIER.titlePrefix, tier: 'titlePrefix' };
    }
    return { score: TIER.titleContains, tier: 'titleContains' };
  }
  return null;
}

function scoreAlias(
  text: string,
  tokens: string[],
  fullQuery: string,
): { score: number; tier: TierName } | null {
  const lower = text.toLowerCase().trim();
  if (!lower || !includesAllTokens(lower, tokens)) return null;
  if (lower === fullQuery) return { score: TIER.exactAlias, tier: 'exactAlias' };
  if (tokens.length === 1 && lower.startsWith(tokens[0]!)) {
    return { score: TIER.aliasPrefix, tier: 'aliasPrefix' };
  }
  return { score: TIER.aliasContains, tier: 'aliasContains' };
}

function scoreGeneric(
  text: string,
  tokens: string[],
  base: number,
  tier: TierName,
): { score: number; tier: TierName } | null {
  if (!text.trim()) return null;
  if (!includesAllTokens(text, tokens)) return null;
  return { score: base, tier };
}

function matchedOnFromTier(
  tier: TierName,
  fieldKind: SearchMatchFieldKind | 'title',
): GlobalSearchMatchedOn {
  if (tier === 'fuzzyTitle') return 'title_fuzzy';
  if (tier === 'fuzzyAlias') return 'alias_fuzzy';
  if (fieldKind === 'custom_field') return 'custom_field';
  if (fieldKind === 'alias') return 'alias';
  if (fieldKind === 'body') return 'body';
  if (fieldKind === 'metadata') return 'metadata';
  return 'title';
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
  options?: { now?: number },
): RankedMatch | null {
  if (tokens.length === 0) return null;
  const now = options?.now ?? Date.now();

  let bestScore = -1;
  let bestTier: TierName | null = null;
  let matchedOn: GlobalSearchMatchedOn = 'title';
  let matchField: SearchDocumentField | null = null;
  let nameForSpecificity = doc.title;
  let bodyTextForOccurrence = '';

  // Fuzzy retrieval bypasses strict token matching — score via fuzzy tiers.
  if (doc.fuzzy) {
    const tier: TierName =
      doc.fuzzy.on === 'alias' ? 'fuzzyAlias' : 'fuzzyTitle';
    const base = TIER[tier];
    const simBonus = Math.round(
      Math.min(1, Math.max(0, doc.fuzzy.similarity)) * FUZZY_SIMILARITY_SCALE,
    );
    bestScore = base + simBonus;
    bestTier = tier;
    matchedOn = matchedOnFromTier(tier, doc.fuzzy.on);
    matchField = null;
    nameForSpecificity = doc.title;
  } else {
    const titleScore = scoreTitle(doc.title, tokens, fullQuery);
    if (titleScore != null && titleScore.score > bestScore) {
      bestScore = titleScore.score;
      bestTier = titleScore.tier;
      matchedOn = 'title';
      matchField = null;
      nameForSpecificity = doc.title;
    }

    for (const field of doc.fields) {
      let fieldScore: { score: number; tier: TierName } | null = null;
      if (field.kind === 'alias') {
        fieldScore = scoreAlias(field.text, tokens, fullQuery);
      } else if (field.kind === 'metadata') {
        fieldScore = scoreGeneric(field.text, tokens, TIER.metadata, 'metadata');
      } else if (field.kind === 'custom_field') {
        fieldScore = scoreGeneric(
          field.text,
          tokens,
          TIER.customField,
          'customField',
        );
      } else if (field.kind === 'body') {
        fieldScore = scoreGeneric(field.text, tokens, TIER.body, 'body');
        if (fieldScore) {
          bodyTextForOccurrence =
            bodyTextForOccurrence.length >= field.text.length
              ? bodyTextForOccurrence
              : field.text;
        }
      } else if (field.kind === 'title') {
        fieldScore = scoreTitle(field.text, tokens, fullQuery);
      }
      if (fieldScore != null && fieldScore.score > bestScore) {
        bestScore = fieldScore.score;
        bestTier = fieldScore.tier;
        matchedOn = matchedOnFromTier(fieldScore.tier, field.kind);
        matchField = field.kind === 'title' ? null : field;
        if (field.kind === 'alias' || field.kind === 'title') {
          nameForSpecificity = field.text;
        }
      }
    }

    if (doc.subtitle) {
      const subScore = scoreGeneric(
        doc.subtitle,
        tokens,
        TIER.metadata,
        'metadata',
      );
      if (subScore != null && subScore.score > bestScore) {
        bestScore = subScore.score;
        bestTier = subScore.tier;
        matchedOn = 'metadata';
        matchField = {
          kind: 'metadata',
          label: 'Identity',
          text: doc.subtitle,
        };
      }
    }
  }

  if (bestScore < 0 || bestTier == null) return null;

  const signals: Record<string, number> = {};

  // Specificity on name tiers (including fuzzy).
  if (
    bestTier === 'exactTitle' ||
    bestTier === 'titlePrefix' ||
    bestTier === 'titleWord' ||
    bestTier === 'titleContains' ||
    bestTier === 'exactAlias' ||
    bestTier === 'aliasPrefix' ||
    bestTier === 'aliasContains' ||
    bestTier === 'fuzzyTitle' ||
    bestTier === 'fuzzyAlias'
  ) {
    const spec = specificityBonus(nameForSpecificity, tokens);
    if (spec > 0) {
      bestScore += spec;
      signals.specificity = spec;
    }
    const prior = typePriorBonus(bestTier, doc.typeKey);
    if (prior > 0) {
      bestScore += prior;
      signals.typePrior = prior;
    }
  }

  // Recency on content tiers.
  if (
    bestTier === 'metadata' ||
    bestTier === 'customField' ||
    bestTier === 'body'
  ) {
    const rec = recencyBonus(doc.recencyAt, now);
    if (rec > 0) {
      bestScore += rec;
      signals.recency = rec;
    }
  }

  // Occurrence density on body tier.
  if (bestTier === 'body' && bodyTextForOccurrence) {
    const occ = occurrenceBonus(bodyTextForOccurrence, tokens);
    if (occ > 0) {
      bestScore += occ;
      signals.occurrence = occ;
    }
  }

  // Bonus when every token appears somewhere in the document haystack.
  const haystack = [
    doc.title,
    doc.subtitle ?? '',
    ...doc.fields.map((f) => f.text),
  ]
    .join(' ')
    .toLowerCase();
  if (tokens.length > 1 && includesAllTokens(haystack, tokens)) {
    bestScore += ALL_TOKENS_BONUS;
    signals.allTokens = ALL_TOKENS_BONUS;
  }

  const links = Math.min(doc.inboundLinkCount ?? 0, INBOUND_LINKS_MAX);
  if (links > 0) {
    bestScore += links;
    signals.inboundLinks = links;
  }

  return {
    score: bestScore,
    matchedOn,
    matchField,
    explain: {
      tier: bestTier,
      base: TIER[bestTier],
      signals,
      typeKey: doc.typeKey ?? null,
      ...(doc.fuzzy
        ? { fuzzy: { similarity: doc.fuzzy.similarity, on: doc.fuzzy.on } }
        : {}),
    },
  };
}

/** Stable sort: higher score first, then title A→Z. */
export function compareRankedResults(
  a: { score: number; title: string },
  b: { score: number; title: string },
): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.title.localeCompare(b.title);
}

/** True when matchedOn indicates a name (title/alias) hit, including fuzzy. */
export function isNameMatch(matchedOn: GlobalSearchMatchedOn): boolean {
  return (
    matchedOn === 'title' ||
    matchedOn === 'alias' ||
    matchedOn === 'title_fuzzy' ||
    matchedOn === 'alias_fuzzy'
  );
}

/** True when the match came from body/metadata/custom content. */
export function isContentMatch(matchedOn: GlobalSearchMatchedOn): boolean {
  return (
    matchedOn === 'body' ||
    matchedOn === 'metadata' ||
    matchedOn === 'custom_field'
  );
}

/** True when score sits in the exact-title or exact-alias tier band. */
export function isExactNameTier(score: number): boolean {
  // Allow within-tier signals (up to ~65k) below exactTitle / exactAlias bases.
  if (score >= TIER.exactTitle) return true;
  if (score >= TIER.exactAlias && score < TIER.titleContains) return true;
  return false;
}
