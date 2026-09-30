/**
 * Portable fuzzy name matching for global search.
 *
 * Optimal string alignment (Damerau–Levenshtein with adjacent transpositions)
 * scored against titleNorm / aliasText words. No DB extension required —
 * identical behaviour on PostgreSQL and SQLite.
 */

export interface FuzzyNameMatch {
  similarity: number;
  on: 'title' | 'alias';
  /** Best-matching name string (title or alias word group). */
  matchedName: string;
}

export interface FuzzyNameCandidate {
  sourceId: string;
  titleNorm: string;
  aliasText: string;
}

/** Max edit distance allowed for a token of the given length. */
export function fuzzyDistanceAllowance(tokenLength: number): number {
  if (tokenLength < 4) return 0;
  if (tokenLength <= 7) return 1;
  return 2;
}

/**
 * Optimal string alignment distance (restricted Damerau–Levenshtein).
 * Adjacent transposition costs 1; no substring/transpose of longer spans.
 */
export function osaDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  // Early exit when length delta already exceeds a generous bound.
  const maxDist = Math.max(m, n);
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array.from({ length: n + 1 }, () => 0),
  );
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(
        dp[i - 1]![j]! + 1, // deletion
        dp[i]![j - 1]! + 1, // insertion
        dp[i - 1]![j - 1]! + cost, // substitution
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        best = Math.min(best, dp[i - 2]![j - 2]! + 1); // transposition
      }
      dp[i]![j] = best;
    }
  }
  return Math.min(dp[m]![n]!, maxDist);
}

function similarityFromDistance(distance: number, tokenLen: number, wordLen: number): number {
  const denom = Math.max(tokenLen, wordLen, 1);
  return Math.max(0, 1 - distance / denom);
}

/**
 * Score one query token against a single name word.
 * Tokens under 4 chars must match as a strict substring/prefix of the word
 * (or the word as a substring of the token for very short names).
 */
function tokenWordScore(token: string, word: string): number | null {
  if (!token || !word) return null;
  if (token.length < 4) {
    if (word.includes(token) || token.includes(word)) return 1;
    return null;
  }
  const allowance = fuzzyDistanceAllowance(token.length);
  // Prefer cheap exact / prefix / contains checks before edit distance.
  if (word === token) return 1;
  if (word.startsWith(token) || token.startsWith(word)) {
    return similarityFromDistance(Math.abs(word.length - token.length), token.length, word.length);
  }
  if (word.includes(token)) {
    return similarityFromDistance(word.length - token.length, token.length, word.length);
  }
  const dist = osaDistance(token, word);
  if (dist > allowance) return null;
  return similarityFromDistance(dist, token.length, word.length);
}

/**
 * Best similarity of all tokens against a space-separated name string.
 * Every token must match some word; returns the min token similarity
 * (weakest link) so multi-token queries stay conservative.
 */
function scoreNameString(tokens: string[], name: string): number | null {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  let minSim = 1;
  for (const token of tokens) {
    let best: number | null = null;
    for (const word of words) {
      const s = tokenWordScore(token, word);
      if (s == null) continue;
      if (best == null || s > best) best = s;
    }
    if (best == null) return null;
    if (best < minSim) minSim = best;
  }
  return minSim;
}

/**
 * Match query tokens against a candidate's titleNorm and aliasText.
 * Returns null when no eligible fuzzy/strict-short match exists.
 */
export function matchFuzzyName(
  tokens: string[],
  titleNorm: string,
  aliasText: string,
): FuzzyNameMatch | null {
  if (tokens.length === 0) return null;
  // At least one token must be fuzzy-eligible (>= 4 chars).
  if (!tokens.some((t) => t.length >= 4)) return null;

  let best: FuzzyNameMatch | null = null;

  const titleSim = scoreNameString(tokens, titleNorm);
  if (titleSim != null) {
    best = { similarity: titleSim, on: 'title', matchedName: titleNorm };
  }

  if (aliasText.trim()) {
    // aliasText may contain multiple aliases joined by spaces from the index;
    // score the whole string (words) — good enough for OSA against individual words.
    const aliasSim = scoreNameString(tokens, aliasText);
    if (aliasSim != null && (best == null || aliasSim > best.similarity)) {
      best = { similarity: aliasSim, on: 'alias', matchedName: aliasText };
    }
  }

  // Require some actual edit / near-miss — pure exact substring matches are
  // already covered by the strict engine. Keep fuzzy results that are not
  // perfect (similarity < 1) OR that only matched via edit distance on a
  // long token. Perfect 1.0 title matches are fine too (strict may have
  // missed due to tokenisation edge cases); ranking will place them correctly.
  return best;
}

/** Default in-process name-row safety cap (env: SEARCH_FUZZY_NAME_ROW_CAP). */
export const DEFAULT_FUZZY_NAME_ROW_CAP = 25_000;

/** Max fuzzy candidates forwarded into authorize/rank after the name scan. */
export const FUZZY_CANDIDATE_FORWARD_CAP = 50;

export function getFuzzyNameRowCap(): number {
  const raw = process.env.SEARCH_FUZZY_NAME_ROW_CAP;
  if (raw == null || raw === '') return DEFAULT_FUZZY_NAME_ROW_CAP;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_FUZZY_NAME_ROW_CAP;
}

export type FuzzyPassStatus = 'ran' | 'skipped-cap' | 'skipped-ineligible';

/**
 * Scan name rows for fuzzy candidates. Pure — no I/O.
 * Returns ranked candidates (best similarity first), capped at `forwardCap`.
 */
export function collectFuzzyCandidates(
  tokens: string[],
  rows: FuzzyNameCandidate[],
  options?: {
    excludeIds?: ReadonlySet<string>;
    forwardCap?: number;
  },
): Array<FuzzyNameCandidate & FuzzyNameMatch> {
  if (!tokens.some((t) => t.length >= 4)) return [];
  const exclude = options?.excludeIds ?? new Set<string>();
  const forwardCap = options?.forwardCap ?? FUZZY_CANDIDATE_FORWARD_CAP;
  const hits: Array<FuzzyNameCandidate & FuzzyNameMatch> = [];

  for (const row of rows) {
    if (exclude.has(row.sourceId)) continue;
    const match = matchFuzzyName(tokens, row.titleNorm, row.aliasText);
    if (!match) continue;
    hits.push({ ...row, ...match });
  }

  hits.sort((a, b) => b.similarity - a.similarity || a.sourceId.localeCompare(b.sourceId));
  return hits.slice(0, forwardCap);
}
