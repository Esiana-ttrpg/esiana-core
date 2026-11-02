export type WordDiff = {
  wordsAdded: number;
  wordsRemoved: number;
  netChange: number;
};

const WORD_LIKE_FALLBACK = /\p{L}[\p{L}\p{M}\p{N}'’-]*/gu;

function tokenizeWords(text: string): string[] {
  const normalized = text.normalize('NFC').trim();
  if (!normalized) return [];

  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    const tokens: string[] = [];
    for (const part of segmenter.segment(normalized)) {
      if (part.isWordLike) tokens.push(part.segment.toLocaleLowerCase());
    }
    return tokens;
  }

  return [...normalized.matchAll(WORD_LIKE_FALLBACK)].map((match) =>
    match[0].toLocaleLowerCase(),
  );
}

function bag(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }
  return counts;
}

/**
 * Multiset word diff. Reordered identical tokens are not churn; replacements
 * and rewrites count as both added and removed. Formatting-only input that
 * tokenizes the same yields 0/0/0.
 */
export function diffWords(previousProse: string, nextProse: string): WordDiff {
  const previous = bag(tokenizeWords(previousProse));
  const next = bag(tokenizeWords(nextProse));
  const keys = new Set([...previous.keys(), ...next.keys()]);
  let wordsAdded = 0;
  let wordsRemoved = 0;
  for (const key of keys) {
    const delta = (next.get(key) ?? 0) - (previous.get(key) ?? 0);
    if (delta > 0) wordsAdded += delta;
    else if (delta < 0) wordsRemoved += -delta;
  }
  return {
    wordsAdded,
    wordsRemoved,
    netChange: wordsAdded - wordsRemoved,
  };
}

export function tokenizeProseForTests(text: string): string[] {
  return tokenizeWords(text);
}
