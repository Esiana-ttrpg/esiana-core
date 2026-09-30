/**
 * Pure structured-query parser for campaign global search.
 *
 * Supports quoted phrases, exclusions (-term), and operators:
 * type:, in:, from:, before:, after:
 *
 * Unknown operators degrade to free text. Invalid dates are dropped with a
 * warning. Parsing is independent of SQL / database implementation.
 */

import {
  globalSearchTypeLabel,
  resolveInScope,
  resolveTypeAlias,
} from './globalSearchTypes.js';

export type GlobalSearchQueryWarningKind =
  | 'unknown-type'
  | 'invalid-date'
  | 'unknown-scope';

export interface GlobalSearchQueryWarning {
  kind: GlobalSearchQueryWarningKind;
  value: string;
}

export interface GlobalSearchParsedFilters {
  types?: string[];
  /** Raw user-facing author names from `from:` (not resolved userIds). */
  authors?: string[];
  /** Validated YYYY-MM-DD calendar dates. */
  before?: string;
  after?: string;
  /**
   * Original `in:` scope tokens that contributed type filters (for chips).
   * When present, chips prefer these over raw type keys.
   */
  scopes?: string[];
}

export interface GlobalSearchParsedQuery {
  /** Original request string (trimmed). Preserved for display/history. */
  raw: string;
  /** Lowercased free-text portion (terms + phrases joined) used for ranking. */
  text: string;
  /** Positive bare tokens (lowercased). */
  terms: string[];
  /** Quoted phrases (lowercased, inner whitespace collapsed). */
  phrases: string[];
  /** Excluded terms/phrases (lowercased). */
  excludedTerms: string[];
  filters: GlobalSearchParsedFilters;
  warnings: GlobalSearchQueryWarning[];
}

export type GlobalSearchFilterChipKind =
  | 'type'
  | 'in'
  | 'from'
  | 'before'
  | 'after';

export interface GlobalSearchFilterChip {
  kind: GlobalSearchFilterChipKind;
  /** Canonical type key, scope name, author name, or YYYY-MM-DD. */
  value: string;
  /** User-facing chip label. */
  label: string;
}

const KNOWN_OPERATORS = new Set(['type', 'in', 'from', 'before', 'after']);

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

/**
 * Validate a calendar YYYY-MM-DD date. Returns the normalized string or null.
 * Does not throw on invalid input.
 */
export function parseIsoDateOnly(raw: string): string | null {
  const trimmed = raw.trim();
  const match = ISO_DATE_RE.exec(trimmed);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

interface ScannedToken {
  kind: 'term' | 'phrase' | 'operator';
  /** Lowercased content for terms/phrases; operator name for operators. */
  value: string;
  /** Operator value (raw, un-lowercased for from:; lowercased for type/in/dates). */
  operatorValue?: string;
  /** Whether this token was excluded (-prefix). */
  excluded: boolean;
  /** Original slice indices in the trimmed raw string (for rewrite helpers). */
  start: number;
  end: number;
}

function scanTokens(raw: string): ScannedToken[] {
  const tokens: ScannedToken[] = [];
  let i = 0;
  const n = raw.length;

  while (i < n) {
    while (i < n && /\s/.test(raw[i]!)) i += 1;
    if (i >= n) break;

    const start = i;
    let excluded = false;

    if (raw[i] === '-' && i + 1 < n && !/\s/.test(raw[i + 1]!)) {
      excluded = true;
      i += 1;
    }

    if (raw[i] === '"') {
      i += 1;
      let content = '';
      while (i < n && raw[i] !== '"') {
        content += raw[i];
        i += 1;
      }
      if (i < n && raw[i] === '"') i += 1;
      const phrase = collapseWhitespace(content).toLowerCase();
      if (phrase) {
        tokens.push({
          kind: 'phrase',
          value: phrase,
          excluded,
          start,
          end: i,
        });
      }
      continue;
    }

    // Read a bare token (until whitespace).
    let tokenText = '';
    while (i < n && !/\s/.test(raw[i]!)) {
      tokenText += raw[i];
      i += 1;
    }
    if (!tokenText) continue;

    // Operator form: op:value or op:"quoted value"
    const colonIdx = tokenText.indexOf(':');
    if (colonIdx > 0) {
      const opName = tokenText.slice(0, colonIdx).toLowerCase();
      if (KNOWN_OPERATORS.has(opName)) {
        let opValue = tokenText.slice(colonIdx + 1);
        // Quoted value may continue past the first whitespace token.
        if (opValue.startsWith('"')) {
          // Re-scan from the quote inside the raw string.
          const quoteStart = start + (excluded ? 1 : 0) + colonIdx + 1;
          let j = quoteStart + 1;
          let content = '';
          while (j < n && raw[j] !== '"') {
            content += raw[j];
            j += 1;
          }
          if (j < n && raw[j] === '"') j += 1;
          i = j;
          opValue = collapseWhitespace(content);
        }
        // Empty value (autocomplete in progress) — drop silently.
        if (!opValue) continue;
        tokens.push({
          kind: 'operator',
          value: opName,
          operatorValue: opValue,
          excluded: false,
          start,
          end: i,
        });
        continue;
      }
    }

    tokens.push({
      kind: 'term',
      value: tokenText.toLowerCase(),
      excluded,
      start,
      end: i,
    });
  }

  return tokens;
}

function applyOperator(
  op: string,
  rawValue: string,
  filters: GlobalSearchParsedFilters,
  warnings: GlobalSearchQueryWarning[],
): void {
  if (op === 'type') {
    const resolved = resolveTypeAlias(rawValue);
    if (!resolved) {
      warnings.push({ kind: 'unknown-type', value: rawValue });
      return;
    }
    if (!filters.types) filters.types = [];
    pushUnique(filters.types, resolved);
    return;
  }

  if (op === 'in') {
    const scopeKey = rawValue.trim().toLowerCase();
    const resolved = resolveInScope(rawValue);
    if (!resolved || resolved.length === 0) {
      warnings.push({ kind: 'unknown-scope', value: rawValue });
      return;
    }
    if (!filters.types) filters.types = [];
    for (const key of resolved) pushUnique(filters.types, key);
    if (!filters.scopes) filters.scopes = [];
    pushUnique(filters.scopes, scopeKey);
    return;
  }

  if (op === 'from') {
    const name = collapseWhitespace(rawValue);
    if (!name) return;
    if (!filters.authors) filters.authors = [];
    // Preserve original casing for display; dedupe case-insensitively.
    if (!filters.authors.some((a) => a.toLowerCase() === name.toLowerCase())) {
      filters.authors.push(name);
    }
    return;
  }

  if (op === 'before' || op === 'after') {
    const date = parseIsoDateOnly(rawValue);
    if (!date) {
      warnings.push({ kind: 'invalid-date', value: rawValue });
      return;
    }
    if (op === 'before') filters.before = date;
    else filters.after = date;
  }
}

export function parseGlobalSearchQuery(rawInput: string): GlobalSearchParsedQuery {
  const raw = rawInput.trim();
  const tokens = scanTokens(raw);

  const terms: string[] = [];
  const phrases: string[] = [];
  const excludedTerms: string[] = [];
  const filters: GlobalSearchParsedFilters = {};
  const warnings: GlobalSearchQueryWarning[] = [];

  for (const token of tokens) {
    if (token.kind === 'operator') {
      applyOperator(token.value, token.operatorValue ?? '', filters, warnings);
      continue;
    }
    if (token.excluded) {
      pushUnique(excludedTerms, token.value);
      continue;
    }
    if (token.kind === 'phrase') {
      pushUnique(phrases, token.value);
    } else {
      pushUnique(terms, token.value);
    }
  }

  const textParts = [...terms, ...phrases];
  const text = textParts.join(' ').toLowerCase();

  return {
    raw,
    text,
    terms,
    phrases,
    excludedTerms,
    filters,
    warnings,
  };
}

/**
 * Tokens suitable for candidate SQL prefilter and ranking: bare terms plus
 * words from phrases. Exclusions and operators are omitted.
 */
export function positiveSearchTokens(parsed: GlobalSearchParsedQuery): string[] {
  const out: string[] = [...parsed.terms];
  for (const phrase of parsed.phrases) {
    for (const word of phrase.split(/\s+/)) {
      if (word && !out.includes(word)) out.push(word);
    }
  }
  return out;
}

/**
 * Build removable filter chips from a parsed query. Free-text terms never
 * produce chips.
 */
export function buildFilterChips(
  parsed: GlobalSearchParsedQuery,
): GlobalSearchFilterChip[] {
  const chips: GlobalSearchFilterChip[] = [];
  const scopes = parsed.filters.scopes ?? [];
  const scopedTypeKeys = new Set<string>();
  for (const scope of scopes) {
    const types = resolveInScope(scope) ?? [];
    for (const t of types) scopedTypeKeys.add(t);
    chips.push({
      kind: 'in',
      value: scope,
      label: scope.charAt(0).toUpperCase() + scope.slice(1),
    });
  }
  for (const typeKey of parsed.filters.types ?? []) {
    if (scopedTypeKeys.has(typeKey)) continue;
    chips.push({
      kind: 'type',
      value: typeKey,
      label: globalSearchTypeLabel(typeKey),
    });
  }
  for (const author of parsed.filters.authors ?? []) {
    chips.push({ kind: 'from', value: author, label: `From ${author}` });
  }
  if (parsed.filters.after) {
    chips.push({
      kind: 'after',
      value: parsed.filters.after,
      label: `After ${parsed.filters.after}`,
    });
  }
  if (parsed.filters.before) {
    chips.push({
      kind: 'before',
      value: parsed.filters.before,
      label: `Before ${parsed.filters.before}`,
    });
  }
  return chips;
}

/**
 * Remove one structured filter from the raw query string while preserving
 * free text and other operators.
 */
export function stripFilterFromQuery(
  rawInput: string,
  chip: GlobalSearchFilterChip,
): string {
  const raw = rawInput.trim();
  if (!raw) return '';
  const tokens = scanTokens(raw);
  const keep: Array<{ start: number; end: number }> = [];

  for (const token of tokens) {
    if (token.kind !== 'operator') {
      keep.push({ start: token.start, end: token.end });
      continue;
    }
    const op = token.value;
    const opValue = token.operatorValue ?? '';
    let matches = false;
    if (chip.kind === 'type' && op === 'type') {
      const resolved = resolveTypeAlias(opValue);
      matches = resolved === chip.value;
    } else if (chip.kind === 'in' && op === 'in') {
      matches = opValue.trim().toLowerCase() === chip.value.toLowerCase();
    } else if (chip.kind === 'from' && op === 'from') {
      matches =
        collapseWhitespace(opValue).toLowerCase() === chip.value.toLowerCase();
    } else if (chip.kind === 'before' && op === 'before') {
      matches = parseIsoDateOnly(opValue) === chip.value;
    } else if (chip.kind === 'after' && op === 'after') {
      matches = parseIsoDateOnly(opValue) === chip.value;
    }
    if (!matches) keep.push({ start: token.start, end: token.end });
  }

  return keep
    .map((span) => raw.slice(span.start, span.end))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Replace / clear type:/in: operators in the query text to match a UI tab
 * selection. Free text and other operators are preserved.
 *
 * @param typeKey Canonical type key, or null for "All".
 */
export function setTypeFilterInQuery(
  rawInput: string,
  typeKey: string | null,
): string {
  const raw = rawInput.trim();
  const tokens = scanTokens(raw);
  const keep: string[] = [];

  for (const token of tokens) {
    if (token.kind === 'operator' && (token.value === 'type' || token.value === 'in')) {
      continue;
    }
    // Preserve original casing from the raw slice for free text and other ops.
    keep.push(raw.slice(token.start, token.end));
  }

  if (typeKey) {
    keep.push(`type:${typeKey}`);
  }

  return keep.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * True when the parsed query contains type:/in: operators that define an
 * effective type filter.
 */
export function hasTypeOperators(parsed: GlobalSearchParsedQuery): boolean {
  return (parsed.filters.types?.length ?? 0) > 0;
}
