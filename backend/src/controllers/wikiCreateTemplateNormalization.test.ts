import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveLiveCreateWikiPageKind } from '../lib/resolveLiveCreateWikiPageKind.js';

describe('live wiki create page kind', () => {
  it('ignores posted template types and stays DEFAULT without module metadata', () => {
    assert.equal(
      resolveLiveCreateWikiPageKind({
        metadata: {},
        sceneBootstrapped: false,
      }),
      'DEFAULT',
    );
  });

  it('does not stamp character structure from a legacy CHARACTER type in metadata-only payload', () => {
    const kind = resolveLiveCreateWikiPageKind({
      metadata: { profession: 'Scout' },
      sceneBootstrapped: false,
    });
    assert.equal(kind, 'DEFAULT');
  });

  it('uses QUEST when quest metadata is present', () => {
    assert.equal(
      resolveLiveCreateWikiPageKind({
        metadata: { entityCategory: 'quests', questStatus: 'open' },
        sceneBootstrapped: false,
      }),
      'QUEST',
    );
  });

  it('uses SCENE when scene bootstrap ran', () => {
    assert.equal(
      resolveLiveCreateWikiPageKind({
        metadata: {},
        sceneBootstrapped: true,
      }),
      'SCENE',
    );
  });

  it('uses JOURNAL when entityCategory is journals', () => {
    assert.equal(
      resolveLiveCreateWikiPageKind({
        metadata: { entityCategory: 'journals' },
        sceneBootstrapped: false,
      }),
      'JOURNAL',
    );
  });
});
