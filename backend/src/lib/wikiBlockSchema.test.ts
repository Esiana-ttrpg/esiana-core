import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDefaultBlocks } from './pageTemplates.js';
import { parseAndValidateTemplateBlocks } from './templateBlocks.js';

test('parseAndValidateTemplateBlocks accepts default CHARACTER layout', () => {
  const result = parseAndValidateTemplateBlocks(buildDefaultBlocks('CHARACTER'));
  assert.equal(result.ok, true);
});

test('parseAndValidateTemplateBlocks rejects empty array', () => {
  const result = parseAndValidateTemplateBlocks([]);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.error, /at least one block/i);
  }
});

test('parseAndValidateTemplateBlocks rejects layout without narrative body', () => {
  const result = parseAndValidateTemplateBlocks([
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

test('parseAndValidateTemplateBlocks rejects block outside grid width', () => {
  const blocks = buildDefaultBlocks('DEFAULT');
  const wide = { ...blocks[0], x: 2, w: 2 };
  const result = parseAndValidateTemplateBlocks([wide, blocks[1]]);
  assert.equal(result.ok, false);
});
