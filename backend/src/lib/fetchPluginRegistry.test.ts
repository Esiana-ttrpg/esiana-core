import assert from 'node:assert/strict';
import test from 'node:test';
import { NetworkFetchError } from './networkFetch.js';
import { fetchAndParsePluginRegistry } from './fetchPluginRegistry.js';

const emptyRegistry = JSON.stringify({ plugins: [] });

test('canonical GitHub repository registry URL fetches raw content from the default branch', async () => {
  let requestedUrl = '';
  const result = await fetchAndParsePluginRegistry(
    new URL('https://github.com/Esiana-ttrpg/community-plugins/registry.json'),
    async (url) => {
      requestedUrl = url.toString();
      return { text: emptyRegistry, contentType: 'application/json' };
    },
  );

  assert.equal(
    requestedUrl,
    'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/HEAD/registry.json',
  );
  assert.deepEqual(result, { ok: true, plugins: [] });
});

test('direct raw registry URLs continue to work unchanged', async () => {
  const rawUrl = 'https://raw.githubusercontent.com/Esiana-ttrpg/community-plugins/main/registry.json';
  let requestedUrl = '';
  const result = await fetchAndParsePluginRegistry(new URL(rawUrl), async (url) => {
    requestedUrl = url.toString();
    return { text: emptyRegistry, contentType: 'text/plain; charset=utf-8' };
  });

  assert.equal(requestedUrl, rawUrl);
  assert.equal(result.ok, true);
});

test('registry network failures remain failed loads', async () => {
  const result = await fetchAndParsePluginRegistry(
    new URL('https://example.com/registry.json'),
    async () => {
      throw new NetworkFetchError('URL returned HTTP 503');
    },
  );

  assert.deepEqual(result, { ok: false, status: 502, error: 'URL returned HTTP 503' });
});

test('registry rejects non-JSON content types', async () => {
  const result = await fetchAndParsePluginRegistry(
    new URL('https://example.com/registry.json'),
    async () => ({ text: '<html>not JSON</html>', contentType: 'text/html' }),
  );

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: 'Registry URL must return JSON (application/json)',
  });
});

test('registry rejects malformed JSON', async () => {
  const result = await fetchAndParsePluginRegistry(
    new URL('https://example.com/registry.json'),
    async () => ({ text: '{"plugins":', contentType: 'application/json' }),
  );

  assert.deepEqual(result, {
    ok: false,
    status: 400,
    error: 'Registry URL did not return valid JSON',
  });
});

test('a genuinely empty parsed registry is a successful load', async () => {
  const result = await fetchAndParsePluginRegistry(
    new URL('https://example.com/registry.json'),
    async () => ({ text: emptyRegistry, contentType: 'application/json' }),
  );

  assert.deepEqual(result, { ok: true, plugins: [] });
});
