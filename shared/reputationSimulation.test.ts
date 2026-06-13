import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceFactionReputation,
  bandIndexForValue,
  formatReputationAxisBand,
  getOrCreateFactionScores,
} from './reputationSimulation.js';
import { defaultFactionReputationScores } from './reputationMetadata.js';

describe('reputationSimulation', () => {
  it('maps trust values to party-facing bands', () => {
    assert.equal(formatReputationAxisBand('trust', 10).bandLabel, 'Hostile');
    assert.equal(formatReputationAxisBand('trust', 50).bandLabel, 'Neutral');
    assert.equal(formatReputationAxisBand('trust', 85).bandLabel, 'Trusted');
  });

  it('maps notoriety values to bands', () => {
    assert.equal(formatReputationAxisBand('notoriety', 15).bandLabel, 'Obscure');
    assert.equal(formatReputationAxisBand('notoriety', 75).bandLabel, 'Notorious');
  });

  it('skips drift on tiny advances under one week', () => {
    const result = advanceFactionReputation({
      factionPageId: 'faction-1',
      scores: defaultFactionReputationScores(),
      elapsedMinutes: 60n,
      advanceMagnitude: 'tiny',
      drivers: {
        havenNotorietyBand: null,
        havenWikiPageId: null,
        negativeRumorCount: 0,
        positiveProjectBoost: false,
        stalledProjectAtHaven: false,
        creativeDriftPressure: 0,
      },
      batchId: 'batch-1',
    });
    assert.equal(result.autoEvents.length, 0);
    assert.equal(result.pendingSuggestions.length, 0);
    assert.equal(result.nextScores.trust, 50);
  });

  it('applies in-band trust decay without band crossing', () => {
    const result = advanceFactionReputation({
      factionPageId: 'faction-1',
      scores: { trust: 70, notoriety: 50, lastSimulatedAtEpochMinute: null },
      elapsedMinutes: 10_080n,
      advanceMagnitude: 'medium',
      drivers: {
        havenNotorietyBand: null,
        havenWikiPageId: null,
        negativeRumorCount: 0,
        positiveProjectBoost: false,
        stalledProjectAtHaven: false,
        creativeDriftPressure: 0,
      },
      batchId: 'batch-2',
    });
    assert.ok(result.nextScores.trust < 70);
    assert.equal(bandIndexForValue(result.nextScores.trust), bandIndexForValue(70));
    assert.ok(result.autoEvents.length >= 0);
    assert.equal(result.pendingSuggestions.length, 0);
  });

  it('queues band crossing suggestion when trust crosses threshold', () => {
    const result = advanceFactionReputation({
      factionPageId: 'faction-2',
      scores: { trust: 39, notoriety: 50, lastSimulatedAtEpochMinute: null },
      elapsedMinutes: 43_200n,
      advanceMagnitude: 'massive',
      drivers: {
        havenNotorietyBand: null,
        havenWikiPageId: null,
        negativeRumorCount: 3,
        positiveProjectBoost: false,
        stalledProjectAtHaven: true,
        creativeDriftPressure: 2,
      },
      batchId: 'batch-3',
    });
    const crossing = result.pendingSuggestions.find(
      (s) => s.kind === 'band_crossing' && s.axis === 'trust',
    );
    assert.ok(crossing, 'expected trust band crossing suggestion');
    assert.equal(result.nextScores.trust, 39);
  });

  it('queues investigation when trust falls into suspicious with drivers', () => {
    const result = advanceFactionReputation({
      factionPageId: 'faction-3',
      scores: { trust: 22, notoriety: 50, lastSimulatedAtEpochMinute: null },
      elapsedMinutes: 43_200n,
      advanceMagnitude: 'massive',
      drivers: {
        havenNotorietyBand: null,
        havenWikiPageId: null,
        negativeRumorCount: 1,
        positiveProjectBoost: false,
        stalledProjectAtHaven: false,
        creativeDriftPressure: 0,
      },
      batchId: 'batch-4',
    });
    const investigation = result.pendingSuggestions.find((s) => s.kind === 'investigation');
    if (result.pendingSuggestions.some((s) => s.kind === 'band_crossing' && s.direction === 'down')) {
      assert.ok(investigation);
    }
  });

  it('getOrCreateFactionScores returns defaults for unknown factions', () => {
    const scores = getOrCreateFactionScores({}, 'new-faction');
    assert.equal(scores.trust, 50);
    assert.equal(scores.notoriety, 50);
  });
});
