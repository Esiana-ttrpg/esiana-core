import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CORE_CHARACTER_PAGE_ORDER,
  isValidOriginRenderMode,
  normalizeCharacterPageBlocks,
  normalizeCharacterPageTitle,
} from './characterPages.js';

test('origin and render mode combinations preserve ownership boundaries', () => {
  assert.equal(isValidOriginRenderMode('CORE', 'CORE'), true);
  assert.equal(isValidOriginRenderMode('CORE', 'CANVAS'), false);
  assert.equal(isValidOriginRenderMode('CUSTOM', 'CANVAS'), true);
  assert.equal(isValidOriginRenderMode('CUSTOM', 'PLUGIN'), false);
  assert.equal(isValidOriginRenderMode('API', 'CANVAS'), true);
  assert.equal(isValidOriginRenderMode('API', 'PLUGIN'), false);
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

test('trajectory fits between existing discovery and continuity positions', () => {
  assert.equal(CORE_CHARACTER_PAGE_ORDER.get('discovery'), 40);
  assert.equal(CORE_CHARACTER_PAGE_ORDER.get('continuity'), 50);
  assert.ok(CORE_CHARACTER_PAGE_ORDER.get('trajectory')! > 40);
  assert.ok(CORE_CHARACTER_PAGE_ORDER.get('trajectory')! < 50);
});
