import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import {
  NetworkFetchError,
  fetchAssetRemoteBuffer,
  fetchPluginRemoteText,
} from './networkFetch.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  mock.restoreAll();
});

test('fetchPluginRemoteText rejects non-allowlisted host before fetch', async () => {
  let fetchCalled = false;
  globalThis.fetch = mock.fn(async () => {
    fetchCalled = true;
    return new Response('{}');
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchPluginRemoteText(new URL('https://example.com/manifest.json'), {
        maxBytes: 1024,
        timeoutSeconds: 5,
      }),
    (error: unknown) => {
      assert.ok(error instanceof NetworkFetchError);
      assert.match(error.message, /not allowed/);
      return true;
    },
  );
  assert.equal(fetchCalled, false);
});

test('fetchAssetRemoteBuffer rejects HTTP when allowHttp is false', async () => {
  let fetchCalled = false;
  globalThis.fetch = mock.fn(async () => {
    fetchCalled = true;
    return new Response('x');
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchAssetRemoteBuffer(new URL('http://example.com/image.png'), {
        allowHttp: false,
        maxBytes: 1024,
        timeoutSeconds: 5,
      }),
    NetworkFetchError,
  );
  assert.equal(fetchCalled, false);
});

