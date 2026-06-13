import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { WikiPageBlock } from '@/types/wiki';
import {
  buildEditorialReflowLayout,
  buildEditorialReflowLayoutStaged,
  buildExpandedStackLayout,
  buildMeasuredCompactLayout,
  pixelsToGridRows,
  sortBlocksByReadingOrder,
} from './wikiLayoutRuntime.ts';
import { WIKI_GRID_COLS } from './wikiGrid.ts';

function block(
  id: string,
  overrides: Partial<WikiPageBlock> = {},
): WikiPageBlock {
  return {
    id,
    type: 'text-biography',
    x: 0,
    y: 0,
    w: 4,
    h: 1,
    content: {},
    ...overrides,
  };
}

describe('wikiLayoutRuntime', () => {
  it('sortBlocksByReadingOrder orders by y then x', () => {
    const sorted = sortBlocksByReadingOrder([
      block('b', { y: 2, x: 0 }),
      block('a', { y: 1, x: 1 }),
      block('c', { y: 1, x: 0 }),
    ]);
    assert.deepEqual(
      sorted.map((b) => b.id),
      ['c', 'a', 'b'],
    );
  });

  it('pixelsToGridRows returns at least 1', () => {
    assert.equal(pixelsToGridRows(0), 1);
    assert.ok(pixelsToGridRows(200) > 1);
  });

  it('buildMeasuredCompactLayout avoids vertical overlap', () => {
    const blocks = [
      block('one', { x: 0, y: 0, w: 6, h: 2 }),
      block('two', { x: 0, y: 0, w: 6, h: 2 }),
    ];
    const heights = { one: 4, two: 3 };
    const layout = buildMeasuredCompactLayout(blocks, heights);
    const one = layout.find((i) => i.i === 'one')!;
    const two = layout.find((i) => i.i === 'two')!;
    assert.ok(two.y >= one.y + one.h);
  });

  it('buildExpandedStackLayout places active block in stack', () => {
    const blocks = [block('a', { y: 0 }), block('b', { y: 1 })];
    const layout = buildExpandedStackLayout(
      blocks,
      'b',
      { a: 2, b: 3 },
      () => WIKI_GRID_COLS,
      () => 4,
    );
    assert.equal(layout.find((i) => i.i === 'b')?.w, WIKI_GRID_COLS);
    assert.ok(layout.every((i) => i.x === 0));
  });

  it('buildEditorialReflowLayout expands active block to full width', () => {
    const blocks = [
      block('left', { x: 0, y: 0, w: 4 }),
      block('right', { x: 4, y: 0, w: 4 }),
    ];
    const layout = buildEditorialReflowLayout(blocks, 'left', { left: 2, right: 2 });
    assert.equal(layout.find((i) => i.i === 'left')?.w, WIKI_GRID_COLS);
    assert.equal(layout.find((i) => i.i === 'right')?.w, 3);
  });

  it('buildEditorialReflowLayoutStaged keeps sibling positions', () => {
    const blocks = [
      block('left', { x: 0, y: 0, w: 1 }),
      block('right', { x: 1, y: 0, w: 1 }),
    ];
    const layout = buildEditorialReflowLayoutStaged(
      blocks,
      'left',
      { left: 2, right: 2 },
      (b) => (b.id === 'left' ? 2 : b.w),
    );
    const right = layout.find((i) => i.i === 'right')!;
    assert.equal(right.x, 1);
    assert.equal(right.w, 1);
    const left = layout.find((i) => i.i === 'left')!;
    assert.equal(left.w, 2);
    assert.equal(left.x, 0);
  });

  it('buildEditorialReflowLayoutStaged anchors active block at x=0 when full width', () => {
    const blocks = [block('left', { x: 2, y: 0, w: 4 })];
    const layout = buildEditorialReflowLayoutStaged(
      blocks,
      'left',
      { left: 2 },
      () => WIKI_GRID_COLS,
    );
    const left = layout.find((i) => i.i === 'left')!;
    assert.equal(left.x, 0);
    assert.equal(left.w, WIKI_GRID_COLS);
  });
});
