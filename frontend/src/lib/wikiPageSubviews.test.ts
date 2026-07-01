import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterBlocksForSubview,
  getVisibleSubviews,
  isValidSubview,
  shouldShowLoreSemanticSections,
  subviewForBlockType,
} from './wikiPageSubviews.ts';
import type { WikiPageBlock } from '@/types/wiki';

describe('getVisibleSubviews', () => {
  it('includes appearance for readers when appearanceMode is full', () => {
    const tabs = getVisibleSubviews('full', false);
    assert.ok(tabs.includes('appearance'));
    assert.ok(!tabs.includes('discovery'));
    assert.ok(!tabs.includes('continuity'));
  });

  it('omits appearance when appearanceMode is not full', () => {
    const tabs = getVisibleSubviews('section', false);
    assert.ok(!tabs.includes('appearance'));
  });

  it('adds DM-only subviews for DMs', () => {
    const tabs = getVisibleSubviews('full', true);
    assert.ok(tabs.includes('discovery'));
    assert.ok(tabs.includes('continuity'));
  });
});

describe('filterBlocksForSubview', () => {
  const blocks: WikiPageBlock[] = [
    {
      id: 'hero',
      type: 'entity-hero',
      x: 0,
      y: 0,
      w: 3,
      h: 1,
      content: {},
      isPrivate: false,
    },
    {
      id: 'appearance',
      type: 'entity-appearance',
      x: 0,
      y: 1,
      w: 3,
      h: 1,
      content: {},
      isPrivate: false,
    },
  ];

  it('returns appearance blocks only on appearance subview', () => {
    const overview = filterBlocksForSubview(blocks, 'overview', true);
    assert.ok(overview.some((b) => b.type === 'entity-hero'));
    assert.ok(!overview.some((b) => b.type === 'entity-appearance'));

    const appearance = filterBlocksForSubview(blocks, 'appearance', true);
    assert.ok(appearance.some((b) => b.type === 'entity-appearance'));
    assert.ok(!appearance.some((b) => b.type === 'entity-hero'));
  });

  it('includes narrative property blocks on overview', () => {
    const questBlocks: WikiPageBlock[] = [
      {
        id: 'quest-props',
        type: 'entity-quest-properties',
        x: 0,
        y: 0,
        w: 3,
        h: 1,
        content: {},
        isPrivate: false,
      },
      {
        id: 'prose',
        type: 'text-tiptap',
        x: 0,
        y: 1,
        w: 3,
        h: 2,
        content: { markdown: '' },
        isPrivate: false,
      },
    ];
    const overview = filterBlocksForSubview(questBlocks, 'overview', true);
    assert.ok(overview.some((b) => b.type === 'entity-quest-properties'));
    assert.ok(overview.some((b) => b.type === 'text-tiptap'));

    const lore = filterBlocksForSubview(questBlocks, 'lore', true);
    assert.ok(!lore.some((b) => b.type === 'entity-quest-properties'));
  });
});

describe('subviewForBlockType', () => {
  it('maps entity-appearance to appearance subview', () => {
    assert.equal(subviewForBlockType('entity-appearance'), 'appearance');
  });

  it('maps entity-quest-properties to overview', () => {
    assert.equal(subviewForBlockType('entity-quest-properties'), 'overview');
  });
});

describe('isValidSubview', () => {
  it('rejects appearance subview when mode is section', () => {
    assert.equal(isValidSubview('appearance', 'section', false), false);
    assert.equal(isValidSubview('appearance', 'full', false), true);
  });
});

describe('shouldShowLoreSemanticSections', () => {
  it('shows on lore subview when section tabs are visible', () => {
    assert.equal(
      shouldShowLoreSemanticSections('lore', true, 'lore'),
      true,
    );
  });

  it('hides on overview subview', () => {
    assert.equal(
      shouldShowLoreSemanticSections('overview', true, 'lore'),
      false,
    );
  });

  it('shows on entity lore tab when wiki subview tabs are hidden', () => {
    assert.equal(
      shouldShowLoreSemanticSections('overview', false, 'lore'),
      true,
    );
  });

  it('hides on entity structure tab when wiki subview tabs are hidden', () => {
    assert.equal(
      shouldShowLoreSemanticSections('overview', false, 'structure'),
      false,
    );
  });
});
