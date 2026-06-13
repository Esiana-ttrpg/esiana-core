import { describe, expect, it } from 'vitest';
import {
  generatePathKeyFromTitle,
  normalizePathKey,
  syncPathKeyOnRename,
} from './pathKeyUtils.js';

describe('pathKeyUtils', () => {
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
