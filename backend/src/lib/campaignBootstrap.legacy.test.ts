import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { legacyGeneratorToBootstrap } from './campaignBootstrap.js';

describe('legacyGeneratorToBootstrap', () => {
  it('maps tomb preset to demo-content-packs', () => {
    const spec = legacyGeneratorToBootstrap({
      pluginId: 'campaign-seeder',
      presetId: 'tomb-of-horrors-demo',
    });
    assert.deepEqual(spec, {
      kind: 'contentPack',
      pluginId: 'demo-content-packs',
      packId: 'tomb-of-horrors-demo',
    });
  });

  it('maps player experience preset to demo-content-packs', () => {
    const spec = legacyGeneratorToBootstrap({
      pluginId: 'campaign-seeder',
      presetId: 'player-experience-demo',
    });
    assert.equal(spec?.kind, 'contentPack');
    assert.equal(spec?.packId, 'player-experience-demo');
  });

  it('maps west-marches to sample data with flavor', () => {
    const spec = legacyGeneratorToBootstrap({
      pluginId: 'campaign-seeder',
      presetId: 'west-marches',
      seed: 'west-marches-v1',
    });
    assert.equal(spec?.kind, 'sampleData');
    assert.equal(spec?.profileId, 'benchmark-medium');
    assert.equal(spec?.skeletonFlavor, 'west-marches');
    assert.equal(spec?.seed, 'west-marches-v1');
  });
});
