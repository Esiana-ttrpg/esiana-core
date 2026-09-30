/**
 * Authoritative phrase / exclusion matching against a sanitized SearchDocument.
 *
 * Candidate SQL may over-select; this module is the source of truth for
 * quoted phrases and -exclusions.
 */

import type { SearchDocument } from './searchRanking.js';

function normalizeHaystack(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function documentHaystacks(doc: SearchDocument): string[] {
  const parts = [
    doc.title,
    doc.subtitle ?? '',
    ...doc.fields.map((f) => f.text),
  ];
  return parts.map(normalizeHaystack).filter(Boolean);
}

function combinedHaystack(doc: SearchDocument): string {
  return documentHaystacks(doc).join(' ');
}

/**
 * True when every phrase appears as a contiguous substring in at least one
 * authorized field (or across the combined haystack for multi-field phrases
 * that happen to sit in one field). Phrases are checked per-field first so a
 * phrase must occur together in an authoritative searchable representation.
 */
export function documentContainsPhrase(
  doc: SearchDocument,
  phrase: string,
): boolean {
  const needle = normalizeHaystack(phrase);
  if (!needle) return true;
  return documentHaystacks(doc).some((h) => h.includes(needle));
}

export function documentContainsTerm(
  doc: SearchDocument,
  term: string,
): boolean {
  const needle = normalizeHaystack(term);
  if (!needle) return true;
  return combinedHaystack(doc).includes(needle);
}

/**
 * Apply structured text constraints: all phrases must match; no excluded
 * term/phrase may appear in the authorized document.
 *
 * Bare positive terms continue to be enforced by rankSearchDocument.
 */
export function matchesStructuredText(
  doc: SearchDocument,
  input: {
    phrases: string[];
    excludedTerms: string[];
  },
): boolean {
  for (const phrase of input.phrases) {
    if (!documentContainsPhrase(doc, phrase)) return false;
  }
  for (const excluded of input.excludedTerms) {
    if (documentContainsTerm(doc, excluded)) return false;
  }
  return true;
}
