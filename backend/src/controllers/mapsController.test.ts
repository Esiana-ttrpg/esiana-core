import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveWikiFolderForMapPinType } from './mapsController.js';

test('resolveWikiFolderForMapPinType maps spatial pin types to Locations', () => {
  assert.equal(resolveWikiFolderForMapPinType('Location'), 'Locations');
  assert.equal(resolveWikiFolderForMapPinType('Settlement'), 'Locations');
  assert.equal(resolveWikiFolderForMapPinType('Ruin'), 'Locations');
  assert.equal(resolveWikiFolderForMapPinType('Dungeon'), 'Locations');
  assert.equal(resolveWikiFolderForMapPinType('Geography'), 'Locations');
});

test('resolveWikiFolderForMapPinType maps Quest to Quests', () => {
  assert.equal(resolveWikiFolderForMapPinType('Quest'), 'Quests');
});

test('resolveWikiFolderForMapPinType falls back to Locations', () => {
  assert.equal(
    resolveWikiFolderForMapPinType('Battlefield' as unknown as 'Location'),
    'Locations',
  );
});
