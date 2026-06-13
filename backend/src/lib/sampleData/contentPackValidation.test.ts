import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeContentPackGenreThemes,
  validateContentPackEntry,
} from './contentPackValidation.js';

describe('contentPackValidation', () => {
  it('sanitizes catalog genre theme slugs with max three', () => {
    const themes = sanitizeContentPackGenreThemes([
      'cosmic-horror',
      'cosmic-horror',
      'high-fantasy-heroic',
      'invalid-theme',
      'political-intrigue-noble-houses',
      'extra',
    ]);
    assert.deepEqual(themes, [
      'cosmic-horror',
      'high-fantasy-heroic',
      'political-intrigue-noble-houses',
    ]);
  });

  it('flags invalid game system and authorUrl', () => {
    const errors: string[] = [];
    validateContentPackEntry(
      {
        id: 'test-pack',
        name: 'Test',
        description: 'Desc',
        campaignFormat: 'one-shot',
        packPath: 'packs/test',
        gameSystem: 'not-a-real-system',
        authorUrl: 'http://insecure.example',
      },
      0,
      errors,
    );
    assert.ok(errors.some((error) => error.includes('gameSystem')));
    assert.ok(errors.some((error) => error.includes('authorUrl')));
  });
});
