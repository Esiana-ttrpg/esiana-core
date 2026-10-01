import type { Command } from './types.js';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function scoreMatch(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 80;
  const words = haystack.split(/[\s/_-]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(needle))) return 60;
  if (haystack.includes(needle)) return 40;
  // Subsequence match
  let hi = 0;
  for (let ni = 0; ni < needle.length; ni++) {
    const ch = needle[ni]!;
    const found = haystack.indexOf(ch, hi);
    if (found < 0) return 0;
    hi = found + 1;
  }
  return 20;
}

function commandScore(command: Command, query: string): number {
  const needle = normalize(query);
  if (!needle) return 0;
  let best = scoreMatch(normalize(command.label), needle);
  for (const keyword of command.keywords ?? []) {
    best = Math.max(best, scoreMatch(normalize(keyword), needle));
  }
  return best;
}

/**
 * Filters and ranks commands by query. Empty query returns input order
 * unchanged (group order preserved from the registry).
 */
export function filterCommands(
  commands: readonly Command[],
  query: string,
): Command[] {
  const needle = normalize(query);
  if (!needle) return [...commands];

  return commands
    .map((command, index) => ({
      command,
      index,
      score: commandScore(command, needle),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    })
    .map((entry) => entry.command);
}
