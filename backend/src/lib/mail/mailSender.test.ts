import test from 'node:test';
import assert from 'node:assert/strict';
import { invalidateMailTransporterCache } from '../mail/mailSender.js';

test('invalidateMailTransporterCache is safe to call repeatedly', () => {
  assert.doesNotThrow(() => {
    invalidateMailTransporterCache();
    invalidateMailTransporterCache();
  });
});
