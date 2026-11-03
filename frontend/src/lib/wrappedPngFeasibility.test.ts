import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRemoteCampaignArtworkUrl,
  shareSafeArtworkUrl,
  waitForDocumentFonts,
  WRAPPED_EXPORT_HEIGHT,
  WRAPPED_EXPORT_WIDTH,
} from './wrappedPngFeasibility.ts';

describe('wrapped PNG feasibility guards', () => {
  it('exports at 1080x1920', () => {
    assert.equal(WRAPPED_EXPORT_WIDTH, 1080);
    assert.equal(WRAPPED_EXPORT_HEIGHT, 1920);
  });

  it('treats absolute http(s) artwork as unsafe for export', () => {
    assert.equal(isRemoteCampaignArtworkUrl('https://cdn.example.com/cover.jpg'), true);
    assert.equal(isRemoteCampaignArtworkUrl('http://cdn.example.com/cover.jpg'), true);
  });

  it('never returns artwork for unauthorized campaigns', () => {
    assert.equal(
      shareSafeArtworkUrl('https://cdn.example.com/x.jpg', false),
      null,
    );
    assert.equal(shareSafeArtworkUrl(null, true), null);
  });

  it('bounds font readiness waiting so export can proceed when fonts stay pending', async () => {
    const previousDocument = globalThis.document;
    let cleared = false;
    const ready = new Promise<void>(() => {
      /* intentionally unsettled */
    });
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        fonts: {
          ready,
        },
      },
    });
    const originalSetTimeout = globalThis.setTimeout;
    const originalClearTimeout = globalThis.clearTimeout;
    globalThis.setTimeout = ((fn: () => void, ms?: number) => {
      assert.equal(ms, 1500);
      return originalSetTimeout(fn, 0);
    }) as typeof setTimeout;
    globalThis.clearTimeout = ((id: ReturnType<typeof setTimeout>) => {
      cleared = true;
      return originalClearTimeout(id);
    }) as typeof clearTimeout;
    try {
      await waitForDocumentFonts();
      assert.equal(cleared, true);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: previousDocument,
      });
    }
  });
});
