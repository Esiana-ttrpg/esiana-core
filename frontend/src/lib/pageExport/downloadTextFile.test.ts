import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { downloadTextFile } from './downloadTextFile.js';

describe('downloadTextFile', () => {
  afterEach(() => {
    mock.restoreAll();
    // @ts-expect-error test cleanup
    delete globalThis.document;
  });

  it('revokes the object URL immediately after triggering download', () => {
    const createObjectURL = mock.method(URL, 'createObjectURL', () => 'blob:mock-url');
    const revokeObjectURL = mock.method(URL, 'revokeObjectURL', () => {});
    const click = mock.fn();
    // @ts-expect-error minimal DOM stub for download helper
    globalThis.document = {
      createElement: () => ({
        click,
        href: '',
        download: '',
      }),
    };

    downloadTextFile({
      filename: 'test.md',
      content: '# Hello',
      mimeType: 'text/markdown;charset=utf-8',
    });

    assert.equal(createObjectURL.mock.callCount(), 1);
    assert.equal(click.mock.callCount(), 1);
    assert.equal(revokeObjectURL.mock.callCount(), 1);
    assert.equal(revokeObjectURL.mock.calls[0]?.arguments[0], 'blob:mock-url');
  });
});
