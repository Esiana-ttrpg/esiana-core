import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGenericWikiPageShell } from './genericWikiShell.ts';
import type { WikiPageBlock } from '@/types/wiki';

describe('genericWikiPageShell', () => {
  const shell = createGenericWikiPageShell('none');

  it('includes narrative property blocks on overview', () => {
    const blocks: WikiPageBlock[] = [
      {
        id: 'thread-props',
        type: 'entity-thread-properties',
        x: 0,
        y: 0,
        w: 3,
        h: 1,
        content: {},
        isPrivate: false,
      },
      {
        id: 'infobox',
        type: 'wiki-infobox',
        x: 0,
        y: 1,
        w: 2,
        h: 1,
        content: { fields: [] },
        isPrivate: false,
      },
    ];

    const overview = shell.filterBlocksForSubview(blocks, 'overview', true);
    assert.ok(overview.some((b) => b.type === 'entity-thread-properties'));
    assert.ok(overview.some((b) => b.type === 'wiki-infobox'));
  });

  it('maps quest properties block type to overview subview', () => {
    assert.equal(
      shell.subviewForBlockType('entity-quest-properties'),
      'overview',
    );
  });

  it('gates appearance subview by appearance mode', () => {
    const fullShell = createGenericWikiPageShell('full');
    const noneShell = createGenericWikiPageShell('none');
    assert.ok(fullShell.isValidSubview('appearance', false));
    assert.ok(!noneShell.isValidSubview('appearance', false));
  });
});
