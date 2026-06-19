import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isPluginEngineMismatchError,
  PluginEngineMismatchError,
} from './pluginEngineMismatchError.js';

test('PluginEngineMismatchError carries 409 status and ENGINE_MISMATCH code', () => {
  const error = new PluginEngineMismatchError(
    'Plugin requires esiana-core ^0.9.0; host is 0.8.0',
  );
  assert.equal(error.status, 409);
  assert.equal(error.code, 'ENGINE_MISMATCH');
  assert.equal(error.message, 'Plugin requires esiana-core ^0.9.0; host is 0.8.0');
  assert.equal(isPluginEngineMismatchError(error), true);
  assert.equal(isPluginEngineMismatchError(new Error('other')), false);
});
