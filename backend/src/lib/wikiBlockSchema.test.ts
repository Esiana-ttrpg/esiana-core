import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultBlocks } from './pageTemplates.js';
import { parseAndValidateWikiBlocks } from './wikiBlockSchema.js';

test('parseAndValidateWikiBlocks accepts default character layout', () => {
  const result = parseAndValidateWikiBlocks(buildDefaultBlocks('DEFAULT', 'characters'));
  assert.equal(result.ok, true);
});

test('parseAndValidateWikiBlocks rejects empty array', () => {
  const result = parseAndValidateWikiBlocks([]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least one block/i);
  }
});

test('parseAndValidateWikiBlocks rejects layout without narrative body', () => {
  const result = parseAndValidateWikiBlocks([
    {
      id: 'infobox-1',
      type: 'wiki-infobox',
      x: 0,
      y: 0,
      w: 1,
      h: 2,
      content: { fields: [] },
      isPrivate: false,
    },
  ]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /narrative body block/i);
  }
});

test('parseAndValidateWikiBlocks rejects block outside grid width', () => {
  const blocks = buildDefaultBlocks();
  const wide = { ...blocks[0], x: 2, w: 2 };
  const result = parseAndValidateWikiBlocks([wide, blocks[1]]);
  assert.equal(result.ok, false);
});
