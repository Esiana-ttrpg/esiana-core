const ASCII_TAGLINES = [
  'The story continues...',
  'Adventure Awaits.',
  'May your dice roll true.',
  'The world remembers.',
] as const;

/** Deterministic string hash (djb2). */
export function hashAsciiSeed(seed: string): number {
  let hash = 5381;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33) ^ seed.charCodeAt(index);
  }
  return hash >>> 0;
}

export function pickAsciiTagline(seed: string): string {
  const normalized = seed.trim() || 'untitled';
  const index = hashAsciiSeed(normalized) % ASCII_TAGLINES.length;
  return ASCII_TAGLINES[index] ?? ASCII_TAGLINES[0];
}

export { ASCII_TAGLINES };
