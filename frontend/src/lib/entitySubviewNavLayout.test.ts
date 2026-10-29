import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fitEntitySubviewTabs } from './entitySubviewNavLayout.ts';

test('all tabs can fit without reserving More or a trailing gap', () => {
  assert.equal(fitEntitySubviewTabs([80, 100], 182, 70, 2), null);
  assert.equal(fitEntitySubviewTabs([], 0, 70, 2), null);
});

test('a long first label moves every tab into More', () => {
  assert.equal(fitEntitySubviewTabs([300, 80], 250, 70, 2), 0);
});

test('a first tab that fits alone still moves into More when the pair cannot fit', () => {
  assert.equal(fitEntitySubviewTabs([180, 100], 250, 70, 2), 0);
});

test('uses measured badge and More widths at exact fit boundaries', () => {
  assert.equal(fitEntitySubviewTabs([106.5, 150], 180, 71.5, 2), 1);
  assert.equal(fitEntitySubviewTabs([106.5, 150], 179, 71.5, 2), 0);
});

test('reserves a gap for each inline tab before More', () => {
  assert.equal(fitEntitySubviewTabs([60, 60, 120], 194, 70, 2), 2);
  assert.equal(fitEntitySubviewTabs([60, 60, 120], 193, 70, 2), 1);
});
