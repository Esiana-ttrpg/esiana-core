/**
 * Portable LIKE pattern helpers for the bounded first-pass candidate stage.
 *
 * Over-select is allowed; under-select of advertised searchable content is not.
 * Non-ASCII letters and JSON-escaped characters (`"`, `\`) are replaced with `_`
 * so SQLite's ASCII-only LOWER and JSON string escaping cannot cause misses.
 */

/** Escape LIKE wildcards and then widen non-ASCII / JSON-escape chars to `_`. */
export function buildCandidateLikePattern(token: string): string {
  let escaped = '';
  for (const ch of token) {
    if (ch === '\\' || ch === '%' || ch === '_') {
      escaped += `\\${ch}`;
      continue;
    }
    // ASCII printable letters/digits/common punctuation stay literal.
    const code = ch.codePointAt(0) ?? 0;
    const isAsciiLetterOrDigit =
      (code >= 0x30 && code <= 0x39) ||
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a);
    const isSafeAsciiPunct = ch === ' ' || ch === '-' || ch === "'" || ch === '.' || ch === ',';
    if (isAsciiLetterOrDigit || isSafeAsciiPunct) {
      escaped += ch;
      continue;
    }
    // Non-ASCII, quotes, and other punctuation → single-char wildcard.
    escaped += '_';
  }
  return `%${escaped}%`;
}

/** Longest token wins for the SQL prefilter (all tokens verified in-app). */
export function pickPrefilterToken(tokens: string[]): string | null {
  if (tokens.length === 0) return null;
  return [...tokens].sort((a, b) => b.length - a.length)[0] ?? null;
}

/** Hard cap on candidate rows returned per provider. */
export const SEARCH_CANDIDATE_LIMIT = 200;
