import assert from 'node:assert/strict';
import test from 'node:test';
import {
  characterResourceDeleteWarning,
  characterResourceSourceLabel,
} from './characterResourceProvenance';

test('API provenance identifies the external application and warns about synchronization', () => {
  const resource = { origin: 'API' as const, apiSourceName: 'Campaign Sync' };
  assert.equal(characterResourceSourceLabel(resource), 'External app · Campaign Sync');
  assert.match(characterResourceDeleteWarning(resource, 'Inventory'), /may be recreated during synchronization/);
});

test('plugin provenance remains distinct and intact', () => {
  const resource = { origin: 'PLUGIN' as const, pluginId: 'inventory-plugin' };
  assert.equal(characterResourceSourceLabel(resource), 'Plugin · inventory-plugin');
  assert.equal(characterResourceDeleteWarning(resource, 'Inventory'), 'Delete Inventory?');
});
