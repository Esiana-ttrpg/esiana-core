import assert from 'node:assert/strict';
import test from 'node:test';
import { safePluginReturnTo } from './pluginConnectionOAuthController.js';

test('plugin OAuth return paths stay on the configured frontend origin', () => {
  assert.equal(safePluginReturnTo('/campaigns/moonfall?tab=integrations'), '/campaigns/moonfall?tab=integrations');
  assert.equal(safePluginReturnTo('//evil.example/path'), '/');
  assert.equal(safePluginReturnTo('/\\evil.example/path'), '/');
  assert.equal(safePluginReturnTo('https://evil.example/path'), '/');
});
