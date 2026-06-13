import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ENSEMBLE_SPOTLIGHT_RANDOM,
  getDefaultEnsembleConfig,
  isEnsembleSpotlightRandom,
  normalizeEnsembleConfig,
  parseEnsembleConfigPayload,
} from './ensembleConfig.js';

describe('ensembleConfig', () => {
  it('normalizes spotlight and featured quest fields', () => {
    const config = normalizeEnsembleConfig({
      name: '  The Ashen Company ',
      spotlightCharacterId: 'char-1',
      spotlightQuote: 'We endure.',
      featuredQuestIds: ['q1', 'q1', 'q2'],
      themes: [' exiles ', 'oath'],
      landingSurface: 'party',
    });

    assert.equal(config.name, 'The Ashen Company');
    assert.equal(config.spotlightCharacterId, 'char-1');
    assert.equal(config.featuredQuestIds.length, 2);
    assert.equal(config.landingSurface, 'party');
  });

  it('returns defaults for empty input', () => {
    const config = getDefaultEnsembleConfig();
    assert.equal(config.spotlightCharacterId, null);
    assert.deepEqual(config.tensionNotes, []);
  });

  it('preserves the random spotlight sentinel', () => {
    const config = normalizeEnsembleConfig({
      spotlightCharacterId: ENSEMBLE_SPOTLIGHT_RANDOM,
    });

    assert.equal(config.spotlightCharacterId, ENSEMBLE_SPOTLIGHT_RANDOM);
    assert.equal(isEnsembleSpotlightRandom(config.spotlightCharacterId), true);
    assert.equal(isEnsembleSpotlightRandom('char-1'), false);
  });

  it('parses patch payloads', () => {
    const parsed = parseEnsembleConfigPayload({
      summary: 'Five exiles bound by oath.',
    });
    assert.ok(parsed);
    assert.equal(parsed!.summary, 'Five exiles bound by oath.');
  });
});
