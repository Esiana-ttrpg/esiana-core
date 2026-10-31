const BOUNDARY_QUOTES = new Set(['\u0027', '\u0022', '\u201c', '\u201d', '\u2018', '\u2019']);

/** Canonical wiki alias lookup, shared by persistence and autocomplete. */
export function normalizeAlias(raw: string): string {
  const value = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  let start = 0;
  let end = value.length;
  while (start < end && BOUNDARY_QUOTES.has(value[start])) start += 1;
  while (end > start && BOUNDARY_QUOTES.has(value[end - 1])) end -= 1;
  return value.slice(start, end).replace(/[^\p{L}\p{N}\s'-]/gu, '').trim();
}
