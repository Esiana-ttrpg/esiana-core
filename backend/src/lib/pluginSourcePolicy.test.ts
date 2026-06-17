import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PluginSourcePolicyError,
  assertPluginSourceHost,
  assertPluginSourceUrl,
  isPluginSourceUrlSync,
  normalizePluginSourceHostname,
} from './pluginSourcePolicy.js';

test('normalizePluginSourceHostname lowercases and strips trailing dot', () => {
  assert.equal(normalizePluginSourceHostname('GitHub.COM.'), 'github.com');
});

test('isPluginSourceUrlSync mirrors assertPluginSourceUrl allowlist', () => {
  assert.equal(
    isPluginSourceUrlSync(new URL('https://raw.githubusercontent.com/o/r/main/m.json')),
    true,
  );
  assert.equal(isPluginSourceUrlSync(new URL('https://example.com/manifest.json')), false);
});

test('assertPluginSourceUrl rejects userinfo trick (github.com@evil.com)', () => {
  assert.throws(
    () => assertPluginSourceUrl(new URL('https://github.com@evil.com/manifest.json')),
    PluginSourcePolicyError,
  );
});

test('assertPluginSourceUrl rejects subdomain trick (github.com.evil.com)', () => {
  assert.throws(
    () => assertPluginSourceUrl(new URL('https://github.com.evil.com/manifest.json')),
    PluginSourcePolicyError,
  );
});

test('assertPluginSourceUrl accepts trailing-dot github.com', () => {
  assert.doesNotThrow(() =>
    assertPluginSourceUrl(new URL('https://github.com./owner/repo/manifest.json')),
  );
});

test('assertPluginSourceUrl accepts case-insensitive GitHub host', () => {
  assert.doesNotThrow(() =>
    assertPluginSourceUrl(new URL('https://GitHub.COM/owner/repo/manifest.json')),
  );
});

test('assertPluginSourceUrl accepts raw.githubusercontent.com', () => {
  assert.doesNotThrow(() =>
    assertPluginSourceUrl(
      new URL('https://raw.githubusercontent.com/o/r/main/manifest.json'),
    ),
  );
});

test('assertPluginSourceUrl rejects path decoy host', () => {
  assert.throws(
    () => assertPluginSourceUrl(new URL('https://evil.com/github.com/manifest.json')),
    PluginSourcePolicyError,
  );
});

test('assertPluginSourceUrl rejects example.com', () => {
  assert.throws(
    () => assertPluginSourceUrl(new URL('https://example.com/manifest.json')),
    PluginSourcePolicyError,
  );
});

test('assertPluginSourceHost rejects empty hostname', () => {
  assert.throws(() => assertPluginSourceHost(''), PluginSourcePolicyError);
});
