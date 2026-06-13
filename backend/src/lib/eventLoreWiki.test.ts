import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractDescriptionMarkdown,
  hydrateEventLoreBlocks,
  isEffectivelyEmptyDescription,
  normalizeDescriptionMarkdown,
} from './eventLoreWiki.js';

describe('isEffectivelyEmptyDescription', () => {
  it('treats empty TipTap HTML as blank', () => {
    assert.equal(isEffectivelyEmptyDescription('<p></p>'), true);
    assert.equal(isEffectivelyEmptyDescription('<p><br></p>'), true);
    assert.equal(isEffectivelyEmptyDescription('<p><br/></p>'), true);
    assert.equal(isEffectivelyEmptyDescription('  <p></p>\n<p><br></p>  '), true);
  });

  it('keeps real markdown content', () => {
    assert.equal(isEffectivelyEmptyDescription('The party arrived at dawn.'), false);
    assert.equal(isEffectivelyEmptyDescription('# Heading only'), false);
  });
});

describe('normalizeDescriptionMarkdown', () => {
  it('returns null for whitespace-only headings', () => {
    assert.equal(normalizeDescriptionMarkdown('   #   '), null);
    assert.equal(normalizeDescriptionMarkdown(''), null);
    assert.equal(normalizeDescriptionMarkdown('<p></p>'), null);
  });
});

describe('extractDescriptionMarkdown', () => {
  const blocks = [
    {
      id: 'b1',
      type: 'text-tiptap',
      x: 0,
      y: 0,
      w: 2,
      h: 2,
      content: { markdown: '' },
      isPrivate: false,
    },
    {
      id: 'b2',
      type: 'text-tiptap',
      x: 1,
      y: 0,
      w: 1,
      h: 1,
      content: { markdown: 'secondary' },
      isPrivate: false,
    },
  ];

  it('reads primary block by grid position', () => {
    assert.equal(extractDescriptionMarkdown(blocks), null);
    const withContent = hydrateEventLoreBlocks(blocks, 'Main lore text');
    assert.equal(extractDescriptionMarkdown(withContent), 'Main lore text');
  });

  it('returns null for empty TipTap boilerplate', () => {
    const empty = hydrateEventLoreBlocks(blocks, '<p></p>');
    assert.equal(extractDescriptionMarkdown(empty), null);
    const br = hydrateEventLoreBlocks(blocks, '<p><br></p>');
    assert.equal(extractDescriptionMarkdown(br), null);
  });
});

describe('hydrateEventLoreBlocks', () => {
  it('sets Description title and markdown on primary block', () => {
    const hydrated = hydrateEventLoreBlocks([], 'Chronicle entry');
    assert.equal(hydrated.length, 1);
    assert.equal(hydrated[0]?.title, 'Description');
    assert.equal(hydrated[0]?.content?.markdown, 'Chronicle entry');
  });
});
