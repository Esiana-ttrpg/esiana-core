import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isKankaSkippedFolder,
  KANKA_SKIP_POLICY,
  kankaSkipReason,
} from './importSkipPolicy.js';

test('KANKA_SKIP_POLICY marks system folders as skipped', () => {
  assert.equal(kankaSkipReason('abilities'), 'system_module');
  assert.equal(kankaSkipReason('maps'), 'not_supported');
  assert.equal(isKankaSkippedFolder('w'), true);
  assert.equal(isKankaSkippedFolder('characters'), false);
  assert.equal(Object.keys(KANKA_SKIP_POLICY).length, 6);
});
