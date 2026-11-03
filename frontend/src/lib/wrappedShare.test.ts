import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  canonicalWrappedUrl,
  downloadWrappedBlob,
  shareWrappedImageFile,
  shareWrappedLink,
} from './wrappedShare.ts';

describe('wrapped share helpers', () => {
  it('builds the canonical owner Wrapped path', () => {
    assert.equal(
      canonicalWrappedUrl('user-1', 2026),
      '/users/user-1/wrapped/2026',
    );
  });

  it('falls back from native image share to download when share is unavailable', async () => {
    const previousNavigator = globalThis.navigator;
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    const previousDocument = globalThis.document;
    const clicks: string[] = [];
    const previousCreateObjectURL = URL.createObjectURL;
    const previousRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:mock';
    URL.revokeObjectURL = () => {};
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        createElement: (tag: string) => {
          assert.equal(tag, 'a');
          return {
            href: '',
            download: '',
            click() {
              clicks.push(this.download);
            },
            remove() {},
          };
        },
        body: {
          appendChild() {},
          removeChild() {},
        },
      },
    });

    try {
      const result = await shareWrappedImageFile({
        blob: new Blob(['png'], { type: 'image/png' }),
        year: 2026,
        title: 'Wrapped',
      });
      assert.equal(result, 'downloaded');
      assert.deepEqual(clicks, ['esiana-wrapped-2026.png']);
      assert.equal(downloadWrappedBlob(new Blob(['x']), 'x.png'), 'downloaded');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previousNavigator,
      });
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: previousDocument,
      });
      URL.createObjectURL = previousCreateObjectURL;
      URL.revokeObjectURL = previousRevokeObjectURL;
    }
  });

  it('falls back from native link share to clipboard copy', async () => {
    const previousNavigator = globalThis.navigator;
    let copied = '';
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        clipboard: {
          writeText: async (text: string) => {
            copied = text;
          },
        },
      },
    });
    try {
      const result = await shareWrappedLink({
        url: 'https://example.test/users/u/wrapped/2026',
        title: 'Wrapped',
      });
      assert.equal(result, 'copied');
      assert.equal(copied, 'https://example.test/users/u/wrapped/2026');
    } finally {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: previousNavigator,
      });
    }
  });
});
