import assert from 'node:assert/strict';
import test from 'node:test';
import { redactEraReferences } from './eraDisclosure.js';

test('Party metadata removes hidden era IDs and their snapshots', () => {
  const metadata = { fields: { byEraId: 'hidden-era',
    byEraSnapshot: { title: 'Secret age', visibility: 'DM_ONLY' },
    visibleEntry: { byEraId: 'shared-era', byEraSnapshot: { title: 'Shared age', visibility: 'PARTY' } } } };
  assert.deepEqual(redactEraReferences(metadata, new Set(['hidden-era'])), {
    fields: { byEraId: null,
      visibleEntry: { byEraId: 'shared-era', byEraSnapshot: { title: 'Shared age', visibility: 'PARTY' } } },
  });
});
