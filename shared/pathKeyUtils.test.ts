import { describe, expect, it } from 'vitest';
import {
  generatePathKeyFromTitle,
  normalizePathKey,
  pathKeyFromTitle,
  syncPathKeyOnRename,
} from './pathKeyUtils.js';

describe('pathKeyUtils', () => {
  it('preserves punctuation, Unicode and the lenient-title fallback contract', () => {
    expect(normalizePathKey('  Éowyn’s Archive / 北 -- 2  ')).toBe('owyn-s-archive-2');
    expect(pathKeyFromTitle('Mira’s Archive')).toBe('miras-archive');
    expect(pathKeyFromTitle('Mira/Archive')).toBe('miraarchive');
    expect(normalizePathKey('Mira/Archive')).toBe('mira-archive');
    expect(pathKeyFromTitle('a'.repeat(80))).toBe('a'.repeat(80));
    expect(pathKeyFromTitle('a'.repeat(81))).toBe('a'.repeat(81));
    expect(generatePathKeyFromTitle('北', new Set(['untitled']), new Set(['untitled-2']))).toBe('untitled-3');
  });

  it('handles long suffix runs and remains idempotent', () => {
    for (const normalize of [normalizePathKey, pathKeyFromTitle]) {
      for (const input of ['', ' \t\n', '-'.repeat(100_000), 'Mira' + '-'.repeat(100_000), 'Mira///Ash']) {
        const result = normalize(input);
        expect(normalize(result)).toBe(result);
      }
      expect(normalize('Mira' + '-'.repeat(100_000))).toBe('mira');
    }
  });

  it('normalizes titles to path keys', () => {
    expect(normalizePathKey('Peach\'s Castle')).toBe('peach-s-castle');
    expect(normalizePathKey('  Mario  ')).toBe('mario');
  });

  it('suffixes collisions within a workspace', () => {
    const taken = new Set(['mario']);
    expect(generatePathKeyFromTitle('Mario', taken)).toBe('mario-2');
  });

  it('syncs path key on rename when unique', () => {
    expect(syncPathKeyOnRename('old-key', 'Luigi', new Set())).toBe('luigi');
  });
});
