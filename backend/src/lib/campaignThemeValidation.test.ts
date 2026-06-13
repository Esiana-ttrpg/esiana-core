import assert from 'node:assert/strict';
import test from 'node:test';
import {
  campaignMatchesGenreThemeFilter,
  parseGenreThemeFilterQuery,
  sanitizeGenreThemes,
} from './campaignThemeValidation.js';

test('sanitizeGenreThemes normalizes catalog slugs and legacy labels', () => {
  const result = sanitizeGenreThemes([
    'high-fantasy-heroic',
    'Fantasy',
    'Cyberpunk',
    'gothic-horror',
  ]);
  assert.deepEqual(result, [
    'high-fantasy-heroic',
    'cyberpunk',
    'gothic-horror',
  ]);
});

test('sanitizeGenreThemes allows custom themes and dedupes', () => {
  const result = sanitizeGenreThemes([
    'cyberpunk',
    'My Homebrew Tone',
    'my homebrew tone',
    'ab',
  ]);
  assert.deepEqual(result, ['cyberpunk', 'My Homebrew Tone']);
});

test('sanitizeGenreThemes rejects catalog label collisions for custom values', () => {
  const result = sanitizeGenreThemes(['Space Opera', 'Custom Noir']);
  assert.deepEqual(result, ['space-opera', 'Custom Noir']);
});

test('sanitizeGenreThemes caps at 20 entries', () => {
  const many = Array.from({ length: 25 }, (_, i) => `custom-theme-${i + 1}`);
  assert.equal(sanitizeGenreThemes(many).length, 20);
});

test('parseGenreThemeFilterQuery accepts comma-separated catalog slugs', () => {
  assert.deepEqual(parseGenreThemeFilterQuery('cyberpunk,invalid,space-opera'), [
    'cyberpunk',
    'space-opera',
  ]);
});

test('campaignMatchesGenreThemeFilter uses OR matching on normalized slugs', () => {
  assert.equal(
    campaignMatchesGenreThemeFilter(['high-fantasy-heroic', 'Custom Tone'], ['cyberpunk']),
    false,
  );
  assert.equal(
    campaignMatchesGenreThemeFilter(['Fantasy', 'dungeon-crawler'], ['high-fantasy-heroic']),
    true,
  );
  assert.equal(
    campaignMatchesGenreThemeFilter(['dungeon-crawler'], ['cyberpunk', 'dungeon-crawler']),
    true,
  );
});
