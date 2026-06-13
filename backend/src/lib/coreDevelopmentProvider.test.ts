import test from 'node:test';
import assert from 'node:assert/strict';
import { coreDevelopmentProvider } from './coreDevelopmentProvider.js';
import type { WorldDevelopmentContext } from '../../../shared/developmentProvider.js';
import { createDefaultWorldDevelopmentSettings } from '../../../shared/worldDevelopmentMetadata.js';
import { createDefaultPresentEra } from '../../../shared/factionMomentumMetadata.js';

test('core provider emits trade expansion for rising faction', () => {
  const ctx: WorldDevelopmentContext = {
    campaignId: 'camp-1',
    projectedFactionStates: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Silver Harbor',
        momentum: 'rising',
        momentumLabel: 'Rising',
        activityLevel: 'high',
        pressure: 40,
        region: 'north',
        eraId: 'era-1',
        bullets: ['Silver Harbor is gaining momentum and visibility.'],
      },
    ],
    currentEra: createDefaultPresentEra(),
    settings: createDefaultWorldDevelopmentSettings(),
    advanceMagnitude: 'medium',
    nextEpochMinute: '100000',
    projection: {
      currentEra: createDefaultPresentEra(),
      risingTensions: [],
      eraTrends: [],
      nearFutureBullets: [],
      projectedByNextSession: null,
    },
  };

  const candidates = coreDevelopmentProvider.generateCandidates(ctx);
  assert.ok(candidates.length >= 1);
  const match = candidates.find((c) => c.definitionId === 'trade_expansion');
  assert.ok(match);
  assert.match(match!.title, /Silver Harbor/);
  assert.equal(match!.proposedAcceptTarget, 'calendar_event');
});
