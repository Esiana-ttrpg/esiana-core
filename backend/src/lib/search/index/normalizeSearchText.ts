/**
 * Normalize searchable text for the derived search index and query tokens.
 *
 * Pipeline: NFKD → strip combining marks → lowercase → fold punctuation to
 * spaces → collapse whitespace. Applied at write time (indexed fields) and
 * read time (query tokens) so PostgreSQL 'simple' tsvector and SQLite LIKE
 * match the same tokens.
 */
export function normalizeSearchText(input: string | null | undefined): string {
  if (!input) return '';
  const nfkd = input.normalize('NFKD');
  let out = '';
  for (const ch of nfkd) {
    const code = ch.codePointAt(0) ?? 0;
    // Combining diacritical marks
    if (code >= 0x0300 && code <= 0x036f) continue;
    if (code >= 0x1ab0 && code <= 0x1aff) continue;
    if (code >= 0x1dc0 && code <= 0x1dff) continue;
    if (code >= 0x20d0 && code <= 0x20ff) continue;
    if (code >= 0xfe20 && code <= 0xfe2f) continue;

    // Whitespace and most punctuation → space
    if (/\s/u.test(ch)) {
      out += ' ';
      continue;
    }
    // Keep letters (any script), digits, apostrophe, hyphen as word chars.
    // Fold other punctuation to space so "foo,bar" → "foo bar".
    if (/^[\p{L}\p{N}'-]$/u.test(ch)) {
      out += ch;
      continue;
    }
    out += ' ';
  }
  return out.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Normalize then split into non-empty tokens. */
export function normalizeSearchTokens(tokens: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of tokens) {
    const norm = normalizeSearchText(raw);
    if (!norm) continue;
    for (const part of norm.split(' ')) {
      if (!part || seen.has(part)) continue;
      seen.add(part);
      out.push(part);
    }
  }
  return out;
}
