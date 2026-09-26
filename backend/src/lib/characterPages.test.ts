import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isValidOriginRenderMode,
  normalizeCharacterPageBlocks,
  normalizeCharacterPageTitle,
} from './characterPages.js';

test('origin and render mode combinations preserve ownership boundaries', () => {
  assert.equal(isValidOriginRenderMode('CORE', 'CORE'), true);
  assert.equal(isValidOriginRenderMode('CORE', 'CANVAS'), false);
  assert.equal(isValidOriginRenderMode('CUSTOM', 'CANVAS'), true);
  assert.equal(isValidOriginRenderMode('CUSTOM', 'PLUGIN'), false);
  assert.equal(isValidOriginRenderMode('PLUGIN', 'CANVAS'), true);
  assert.equal(isValidOriginRenderMode('PLUGIN', 'PLUGIN'), true);
});

test('page input normalization rejects invalid titles and block payloads', () => {
  assert.equal(normalizeCharacterPageTitle('  Inventory  '), 'Inventory');
  assert.equal(normalizeCharacterPageTitle(''), null);
  assert.deepEqual(normalizeCharacterPageBlocks([{ id: 'a', type: 'text-tiptap' }]), [
    { id: 'a', type: 'text-tiptap' },
  ]);
  assert.equal(normalizeCharacterPageBlocks('bad'), null);
});
