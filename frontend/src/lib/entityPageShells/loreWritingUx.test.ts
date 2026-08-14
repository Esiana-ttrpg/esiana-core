import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { familyPageShell } from './familyShell.ts';
import { ORGANIZATION_SUBVIEWS } from './organizationShell.ts';
import { BESTIARY_SUBVIEWS } from './bestiaryShell.ts';
import type { WikiPageBlock } from '@/types/wiki';

describe('familyPageShell', () => {
  it('places lore second and lineage third', () => {
    const tabs = familyPageShell.getVisibleSubviews(true);
    assert.equal(tabs[0]?.id, 'overview');
    assert.equal(tabs[1]?.id, 'lore');
    assert.equal(tabs[2]?.id, 'lineage');
  });

  it('routes prose to lore and metadata to overview', () => {
    const blocks: WikiPageBlock[] = [
      {
        id: 'prose',
        type: 'text-tiptap',
        x: 0,
        y: 0,
        w: 2,
        h: 1,
        content: { markdown: 'history' },
        isPrivate: false,
      },
      {
        id: 'infobox',
        type: 'wiki-infobox',
        x: 0,
        y: 1,
        w: 1,
        h: 1,
        content: { fields: [] },
        isPrivate: false,
      },
    ];

    const lore = familyPageShell.filterBlocksForSubview(blocks, 'lore', true);
    assert.ok(lore.some((b) => b.type === 'text-tiptap'));
    assert.equal(familyPageShell.filterBlocksForSubview(blocks, 'overview', true).length, 0);
    assert.equal(familyPageShell.filterBlocksForSubview(blocks, 'lineage', true).length, 0);
    assert.equal(familyPageShell.subviewForBlockType('text-tiptap'), 'lore');
    assert.equal(familyPageShell.subviewForBlockType('wiki-infobox'), 'overview');
  });
});

describe('lore tab ordering', () => {
  it('places lore second for organization, bestiary, and family', () => {
    const orgTabs = ORGANIZATION_SUBVIEWS.filter((t) => !t.dmOnly);
    const bestiaryTabs = BESTIARY_SUBVIEWS.filter((t) => !t.dmOnly);
    const familyTabs = familyPageShell.getVisibleSubviews(true);
    assert.equal(orgTabs.find((t) => t.id === 'lore')?.navPriority, 1);
    assert.equal(bestiaryTabs.find((t) => t.id === 'lore')?.navPriority, 1);
    assert.equal(familyTabs.find((t) => t.id === 'lore')?.navPriority, 1);
  });
});
