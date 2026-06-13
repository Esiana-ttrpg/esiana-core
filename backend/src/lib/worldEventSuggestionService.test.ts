import assert from 'node:assert/strict';
import test from 'node:test';
import {
  serializeCampaignMomentumState,
  createDefaultCampaignMomentumState,
} from '../../../shared/factionMomentumMetadata.js';
import { createDefaultWorldDevelopmentSettings } from '../../../shared/worldDevelopmentMetadata.js';
import { emitWorldEventSuggestions } from './worldEventSuggestionService.js';

test('emitWorldEventSuggestions returns paused when worldPressurePaused', async () => {
  const pausedState = {
    ...createDefaultCampaignMomentumState(),
    worldPressurePaused: true,
    worldDevelopment: {
      ...createDefaultWorldDevelopmentSettings(),
      mode: 'manual' as const,
      worldPressurePaused: true,
    },
  };

  const tx = {
    campaignMomentum: {
      findUnique: async () => ({
        id: 'momentum-1',
        campaignId: 'camp-1',
        state: serializeCampaignMomentumState(pausedState),
        semanticsVersion: 'campaign-momentum-v1',
        updatedByUserId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      create: async () => {
        throw new Error('should not create momentum');
      },
    },
    campaignWorldEventSuggestion: {
      findUnique: async () => null,
      findFirst: async () => null,
      findMany: async () => [],
      updateMany: async () => ({ count: 0 }),
      create: async () => {
        throw new Error('should not create suggestions when paused');
      },
    },
  };

  const result = await emitWorldEventSuggestions(tx as never, {
    campaignId: 'camp-1',
    previousEpochMinute: '0',
    nextEpochMinute: '10000',
    elapsedMinutes: '10000',
    advancedBy: { amount: '7', unit: 'days' },
    advanceMagnitude: 'medium',
    source: 'time_tracking',
  });

  assert.equal(result.paused, true);
  assert.equal(result.suggestionsCreated, 0);
  assert.equal(result.entitiesScanned, 0);
});
