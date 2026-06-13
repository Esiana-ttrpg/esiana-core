import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeContentPackOrigin, readContentPackOrigin } from './contentPackOrigin.js';

describe('contentPackOrigin', () => {
  it('merges and reads origin metadata from appearance profile', () => {
    const merged = mergeContentPackOrigin(
      { themePreset: 'default' },
      {
        pluginId: 'demo-content-packs',
        pluginVersion: '0.1.0',
        packId: 'haunted-lighthouse',
        packName: 'Haunted Lighthouse',
        author: 'Allison',
        importedAt: '2026-06-12T00:00:00.000Z',
      },
    );

    const origin = readContentPackOrigin(merged);
    assert.ok(origin);
    assert.equal(origin?.packId, 'haunted-lighthouse');
    assert.equal(origin?.pluginVersion, '0.1.0');
    assert.equal(origin?.author, 'Allison');
    assert.equal((merged as Record<string, unknown>).themePreset, 'default');
  });
});
