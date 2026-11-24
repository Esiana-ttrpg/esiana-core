import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { shouldDeferSlideAdvanceKey } from './wrappedStoryViewerKeys.ts';

describe('shouldDeferSlideAdvanceKey', () => {
  const { document } = parseHTML(`<!DOCTYPE html><html><body>
    <div id="viewer">
      <a id="close" href="/back">Close</a>
      <button id="export" type="button">Share</button>
      <div id="surface">Slide surface</div>
    </div>
  </body></html>`);

  it('leaves Enter unhandled on the Close link so activation does not change slides', () => {
    const close = document.getElementById('close');
    assert.ok(close);
    assert.equal(shouldDeferSlideAdvanceKey('Enter', close), true);
  });

  it('leaves Enter unhandled on the export button so activation does not change slides', () => {
    const exportBtn = document.getElementById('export');
    assert.ok(exportBtn);
    assert.equal(shouldDeferSlideAdvanceKey('Enter', exportBtn), true);
  });

  it('leaves Space unhandled on interactive controls', () => {
    const exportBtn = document.getElementById('export');
    assert.ok(exportBtn);
    assert.equal(shouldDeferSlideAdvanceKey(' ', exportBtn), true);
  });

  it('still advances on Enter/Space when the target is non-interactive', () => {
    const surface = document.getElementById('surface');
    assert.ok(surface);
    assert.equal(shouldDeferSlideAdvanceKey('Enter', surface), false);
    assert.equal(shouldDeferSlideAdvanceKey(' ', surface), false);
  });

  it('does not defer arrow keys', () => {
    const close = document.getElementById('close');
    assert.ok(close);
    assert.equal(shouldDeferSlideAdvanceKey('ArrowRight', close), false);
  });
});
