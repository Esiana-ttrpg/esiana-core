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

test('fetchPluginRemoteText accepts raw.githubusercontent.com', async () => {
  globalThis.fetch = mock.fn(async () =>
    new Response('{"ok":true}', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }),
  ) as typeof fetch;

  const result = await fetchPluginRemoteText(
    new URL('https://raw.githubusercontent.com/o/r/main/manifest.json'),
    { maxBytes: 1024, timeoutSeconds: 5 },
  );
  assert.equal(result.text, '{"ok":true}');
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

test('fetchAssetRemoteBuffer enforces size limit via abort path', async () => {
  globalThis.fetch = mock.fn(async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(128));
      },
    });
    return new Response(stream, { status: 200 });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchAssetRemoteBuffer(new URL('https://example.com/image.png'), {
        allowHttp: false,
        maxBytes: 64,
        timeoutSeconds: 5,
      }),
    (error: unknown) => {
      assert.ok(error instanceof NetworkFetchError);
      assert.match(error.message, /size limit/i);
      return true;
    },
  );
});

test('fetchAssetRemoteBuffer maps AbortError timeout to NetworkFetchError', async () => {
  globalThis.fetch = mock.fn((_input, init) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error('missing signal'));
        return;
      }
      const onAbort = () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort);
    });
  }) as typeof fetch;

  await assert.rejects(
    () =>
      fetchAssetRemoteBuffer(new URL('https://example.com/image.png'), {
        allowHttp: false,
        maxBytes: 1024,
        timeoutSeconds: 1,
      }),
    (error: unknown) => {
      assert.ok(error instanceof NetworkFetchError);
      assert.match(error.message, /timed out/i);
      return true;
    },
  );
});
