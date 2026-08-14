import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldConfirmLeaveWikiForWorkshop } from './workshopLaunchGuard.js';
import type { WikiPageBlock } from '@/types/wiki';

const emptyProseBlocks: WikiPageBlock[] = [
  {
    id: 'prose-1',
    type: 'text-tiptap',
    x: 0,
    y: 0,
    w: 4,
    h: 4,
    content: { markdown: '' },
  },
];

describe('workshopLaunchGuard', () => {
  it('returns false when nothing is dirty', () => {
    assert.equal(
      shouldConfirmLeaveWikiForWorkshop({
        isLayoutDirty: false,
        hasSemanticDirty: false,
        blocks: emptyProseBlocks,
        savedBlocks: emptyProseBlocks,
      }),
      false,
    );
  });

  it('returns false for blank prose with matching snapshots', () => {
    assert.equal(
      shouldConfirmLeaveWikiForWorkshop({
        isLayoutDirty: true,
        hasSemanticDirty: false,
        blocks: emptyProseBlocks,
        savedBlocks: emptyProseBlocks,
      }),
      false,
    );
  });

  it('returns true when semantic drafts are dirty', () => {
    assert.equal(
      shouldConfirmLeaveWikiForWorkshop({
        isLayoutDirty: false,
        hasSemanticDirty: true,
        blocks: emptyProseBlocks,
        savedBlocks: emptyProseBlocks,
      }),
      true,
    );
  });

  it('returns true when prose content changed', () => {
    const changed = [
      {
        ...emptyProseBlocks[0]!,
        content: { markdown: 'Hello world' },
      },
    ];
    assert.equal(
      shouldConfirmLeaveWikiForWorkshop({
        isLayoutDirty: true,
        hasSemanticDirty: false,
        blocks: changed,
        savedBlocks: emptyProseBlocks,
      }),
      true,
    );
  });
});
