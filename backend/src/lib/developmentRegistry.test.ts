import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clearDevelopmentRegistry,
  initializeDevelopmentRegistry,
  registerDevelopmentProvider,
  registerEligibilityProvider,
  registerRationaleProvider,
  resolveCandidatesForCampaign,
  stampAndValidateCandidate,
} from './developmentRegistry.js';
import {
  buildNormalizedTrajectoryContext,
  type DevelopmentProvider,
  type ProjectedFactionState,
  type WorldDevelopmentContext,
} from '../../../shared/developmentProvider.js';
import { createDefaultWorldDevelopmentSettings } from '../../../shared/worldDevelopmentMetadata.js';
import { createDefaultPresentEra } from '../../../shared/factionMomentumMetadata.js';

function explicitFactionState(
  overrides: Partial<ProjectedFactionState> = {},
): ProjectedFactionState {
  const era = createDefaultPresentEra();
  const base = buildNormalizedTrajectoryContext({
    subjectPageId: 'org-1',
    subjectTitle: 'Test Faction',
    subjectCategory: 'organizations',
    region: null,
    trajectory: {
      eraId: 'era-1',
      byEraId: null,
      direction: 'Militarizing',
      outcome: 'Starts a war',
      momentumState: 'rising',
      pressure: null,
      gmNote: null,
    },
    resolvedForEraId: 'era-1',
    eras: [{ ...era, id: 'era-1', name: 'Era I' }],
    activityLevel: 'medium',
    isExplicit: true,
    bullets: [],
  });
  return { ...base, ...overrides };
}

function baseContext(
  projectedFactionStates: ProjectedFactionState[] = [explicitFactionState()],
): WorldDevelopmentContext {
  return {
    campaignId: 'camp-1',
    projectedFactionStates,
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
          primaryOrgPageId: ctx.projectedFactionStates[0]?.subjectPageId ?? null,
          eraId: 'era-1',
          momentumState: 'rising',
          trendDirection: 'growth',
          proposedAcceptTarget: 'calendar_event',
          suggestionKind: 'faction_pressure',
          trajectoryRef: {
            subjectPageId: 'org-1',
            fromEraId: 'era-1',
          },
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
  const pluginRow = withPlugin.find((c) => c.definitionId === 'demo-plugin:custom');
  assert.ok(pluginRow);
  assert.equal(pluginRow!.providerId, 'demo-plugin');
  assert.deepEqual(pluginRow!.trajectoryRef, { subjectPageId: 'org-1', fromEraId: 'era-1' });

  clearDevelopmentRegistry();
});

test('registry overwrites forged providerId and drops invalid trajectoryRef', () => {
  const ctx = baseContext();
  const stamped = stampAndValidateCandidate(
    'trusted-plugin',
    {
      definitionId: 'trusted-plugin:x',
      developmentType: 'faction_pressure',
      title: 'X',
      narrative: null,
      rationale: [],
      idempotencyKey: 'x-1',
      primaryOrgPageId: 'org-1',
      eraId: 'era-1',
      momentumState: 'rising',
      trendDirection: null,
      proposedAcceptTarget: 'calendar_event',
      suggestionKind: 'faction_pressure',
      trajectoryRef: { subjectPageId: 'org-unknown', fromEraId: 'era-1' },
      providerId: 'forged-other-provider',
    } as never,
    ctx,
  );
  assert.equal(stamped.providerId, 'trusted-plugin');
  assert.equal(stamped.trajectoryRef, null);
});

test('registry keeps trajectoryRef only for explicit projected states', () => {
  const fallback = explicitFactionState({
    isExplicit: false,
    direction: null,
    outcome: null,
  });
  const ctx = baseContext([fallback]);
  const stamped = stampAndValidateCandidate(
    'core',
    {
      definitionId: 'faction_pressure',
      developmentType: 'faction_pressure',
      title: 'X',
      narrative: null,
      rationale: [],
      idempotencyKey: 'x-2',
      primaryOrgPageId: 'org-1',
      eraId: 'era-1',
      momentumState: 'rising',
      trendDirection: null,
      proposedAcceptTarget: 'calendar_event',
      suggestionKind: 'faction_pressure',
      trajectoryRef: { subjectPageId: 'org-1', fromEraId: 'era-1' },
    },
    ctx,
  );
  assert.equal(stamped.trajectoryRef, null);
});

test('registry accepts trajectoryRef for explicit character and location subjects', () => {
  const era = createDefaultPresentEra();
  const character = buildNormalizedTrajectoryContext({
    subjectPageId: 'char-1',
    subjectTitle: 'Mara',
    subjectCategory: 'characters',
    region: null,
    trajectory: {
      eraId: 'era-1',
      byEraId: null,
      direction: 'Rising influence',
      outcome: 'Takes the throne',
      gmNote: null,
    },
    resolvedForEraId: 'era-1',
    eras: [{ ...era, id: 'era-1', name: 'Era I' }],
    activityLevel: 'medium',
    isExplicit: true,
  });
  const location = buildNormalizedTrajectoryContext({
    subjectPageId: 'loc-1',
    subjectTitle: 'Westgate',
    subjectCategory: 'locations',
    region: null,
    trajectory: {
      eraId: 'era-1',
      byEraId: null,
      direction: 'Declining',
      outcome: 'Severe famine',
      gmNote: null,
    },
    resolvedForEraId: 'era-1',
    eras: [{ ...era, id: 'era-1', name: 'Era I' }],
    activityLevel: 'medium',
    isExplicit: true,
  });
  const ctx = baseContext([character, location]);

  const charStamped = stampAndValidateCandidate(
    'core',
    {
      definitionId: 'trajectory_shift',
      developmentType: 'trajectory_shift',
      title: 'Mara — Rising influence',
      narrative: null,
      rationale: [],
      idempotencyKey: 'char-1',
      primaryOrgPageId: 'char-1',
      eraId: 'era-1',
      momentumState: null,
      trendDirection: null,
      proposedAcceptTarget: 'calendar_event',
      suggestionKind: 'faction_pressure',
      trajectoryRef: { subjectPageId: 'char-1', fromEraId: 'era-1' },
    },
    ctx,
  );
  assert.deepEqual(charStamped.trajectoryRef, {
    subjectPageId: 'char-1',
    fromEraId: 'era-1',
  });

  const locStamped = stampAndValidateCandidate(
    'core',
    {
      definitionId: 'trajectory_shift',
      developmentType: 'trajectory_shift',
      title: 'Westgate — Declining',
      narrative: null,
      rationale: [],
      idempotencyKey: 'loc-1',
      primaryOrgPageId: 'loc-1',
      eraId: 'era-1',
      momentumState: null,
      trendDirection: null,
      proposedAcceptTarget: 'calendar_event',
      suggestionKind: 'faction_pressure',
      trajectoryRef: { subjectPageId: 'loc-1', fromEraId: 'era-1' },
    },
    ctx,
  );
  assert.deepEqual(locStamped.trajectoryRef, {
    subjectPageId: 'loc-1',
    fromEraId: 'era-1',
  });
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
        trajectoryRef: null,
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
        trajectoryRef: null,
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
  assert.equal(row!.providerId, 'ratio-plugin');
  assert.ok(row!.rationale.some((line) => line.text === 'Appended'));
  clearDevelopmentRegistry();
});
