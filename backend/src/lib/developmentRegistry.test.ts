import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearDevelopmentRegistry,
  initializeDevelopmentRegistry,
  registerDevelopmentProvider,
  registerEligibilityProvider,
  registerRationaleProvider,
  resolveCandidatesForCampaign,
} from './developmentRegistry.js';
import type { DevelopmentProvider, WorldDevelopmentContext } from '../../../shared/developmentProvider.js';
import { createDefaultWorldDevelopmentSettings } from '../../../shared/worldDevelopmentMetadata.js';
import { createDefaultPresentEra } from '../../../shared/factionMomentumMetadata.js';

function baseContext(): WorldDevelopmentContext {
  return {
    campaignId: 'camp-1',
    projectedFactionStates: [
      {
        orgPageId: 'org-1',
        orgTitle: 'Test Faction',
        momentum: 'rising',
        momentumLabel: 'Rising',
        activityLevel: 'medium',
        pressure: null,
        region: null,
        eraId: 'era-1',
        bullets: [],
      },
    ],
    currentEra: createDefaultPresentEra(),
    settings: createDefaultWorldDevelopmentSettings(),
    advanceMagnitude: 'medium',
    nextEpochMinute: '50000',
  };
}

test('registry merges core and plugin candidates', async () => {
  initializeDevelopmentRegistry();

  const pluginProvider: DevelopmentProvider = {
    id: 'demo-plugin',
    developmentDefinitions: () => [
      {
        id: 'demo-plugin:custom',
        developmentType: 'faction_pressure',
        label: 'Custom Event',
        significance: 'minor',
        applicableMomentumStates: ['rising'],
        defaultLifecycle: {
          prepMinutes: 0,
          cooldownMinutes: 0,
          significance: 'minor',
        },
        acceptTarget: 'calendar_event',
        source: { kind: 'plugin', pluginId: 'demo-plugin' },
      },
    ],
    generateCandidates(ctx) {
      return [
        {
          definitionId: 'demo-plugin:custom',
          developmentType: 'faction_pressure',
          title: 'Custom Event',
          narrative: 'Plugin candidate',
          rationale: [{ kind: 'trajectory', text: 'Plugin line' }],
          idempotencyKey: 'plugin-key-1',
          primaryOrgPageId: ctx.projectedFactionStates[0]?.orgPageId ?? null,
          eraId: 'era-1',
          momentumState: 'rising',
          trendDirection: 'growth',
          proposedAcceptTarget: 'calendar_event',
          suggestionKind: 'faction_pressure',
        },
      ];
    },
  };

  registerDevelopmentProvider(pluginProvider);

  const ctx = baseContext();
  const withoutPlugin = await resolveCandidatesForCampaign('camp-1', ctx, {
    enabledPluginIds: new Set(),
  });
  const withPlugin = await resolveCandidatesForCampaign('camp-1', ctx, {
    enabledPluginIds: new Set(['demo-plugin']),
  });

  assert.ok(withoutPlugin.every((c) => !c.definitionId.startsWith('demo-plugin:')));
  assert.ok(withPlugin.some((c) => c.definitionId === 'demo-plugin:custom'));

  clearDevelopmentRegistry();
});

test('eligibility provider filters candidates', async () => {
  initializeDevelopmentRegistry();

  registerDevelopmentProvider({
    id: 'gate-plugin',
    developmentDefinitions: () => [],
    generateCandidates: () => [
      {
        definitionId: 'gate-plugin:gated',
        developmentType: 'faction_pressure',
        title: 'Gated',
        narrative: null,
        rationale: [],
        idempotencyKey: 'gated-1',
        primaryOrgPageId: 'org-1',
        eraId: 'era-1',
        momentumState: 'rising',
        trendDirection: null,
        proposedAcceptTarget: 'calendar_event',
        suggestionKind: 'faction_pressure',
      },
    ],
  });

  registerEligibilityProvider({
    definitionId: 'gate-plugin:gated',
    isEligible: () => false,
  });

  const results = await resolveCandidatesForCampaign('camp-1', baseContext(), {
    enabledPluginIds: new Set(['gate-plugin']),
  });

  assert.equal(results.find((c) => c.definitionId === 'gate-plugin:gated'), undefined);
  clearDevelopmentRegistry();
});

test('rationale provider appends lines', async () => {
  initializeDevelopmentRegistry();

  registerDevelopmentProvider({
    id: 'ratio-plugin',
    developmentDefinitions: () => [],
    generateCandidates: () => [
      {
        definitionId: 'ratio-plugin:event',
        developmentType: 'faction_pressure',
        title: 'Event',
        narrative: null,
        rationale: [{ kind: 'trajectory', text: 'Base' }],
        idempotencyKey: 'ratio-1',
        primaryOrgPageId: 'org-1',
        eraId: 'era-1',
        momentumState: 'rising',
        trendDirection: null,
        proposedAcceptTarget: 'calendar_event',
        suggestionKind: 'faction_pressure',
      },
    ],
  });

  registerRationaleProvider({
    definitionId: 'ratio-plugin:event',
    appendRationale: () => [{ kind: 'canon_signal', text: 'Appended' }],
  });

  const results = await resolveCandidatesForCampaign('camp-1', baseContext(), {
    enabledPluginIds: new Set(['ratio-plugin']),
  });

  const row = results.find((c) => c.definitionId === 'ratio-plugin:event');
  assert.ok(row);
  assert.ok(row!.rationale.some((line) => line.text === 'Appended'));
  clearDevelopmentRegistry();
});
