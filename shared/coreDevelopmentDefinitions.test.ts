import test from 'node:test';
import assert from 'node:assert/strict';
import { CORE_DEVELOPMENT_DEFINITIONS } from './coreDevelopmentDefinitions.js';

test('core definitions cover planned catalog with tags', () => {
  const ids = CORE_DEVELOPMENT_DEFINITIONS.map((d) => d.id);
  assert.ok(ids.includes('trade_expansion'));
  assert.ok(ids.includes('alliance_proposal'));
  assert.ok(ids.includes('regional_instability'));
  for (const def of CORE_DEVELOPMENT_DEFINITIONS) {
    assert.ok(def.applicableMomentumStates.length > 0);
    assert.ok(def.tags && def.tags.length > 0);
    assert.equal(def.source.kind, 'core');
  }
});
