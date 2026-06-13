import assert from 'node:assert/strict';
import test from 'node:test';
import {
  satisfiesEngineConstraint,
  validatePluginEngines,
} from './pluginEngine.js';

test('satisfiesEngineConstraint supports caret semver', () => {
  assert.equal(satisfiesEngineConstraint('0.8.0', '^0.8.0'), true);
  assert.equal(satisfiesEngineConstraint('0.9.0', '^0.8.0'), true);
  assert.equal(satisfiesEngineConstraint('1.0.0', '^0.8.0'), false);
});

test('validatePluginEngines returns message on mismatch', () => {
  const message = validatePluginEngines('0.7.0', { 'esiana-core': '^0.8.0' });
  assert.ok(message?.includes('0.8.0'));
});

test('validatePluginEngines passes when constraint satisfied', () => {
  assert.equal(
    validatePluginEngines('0.8.0', { 'esiana-core': '^0.8.0' }),
    null,
  );
});
