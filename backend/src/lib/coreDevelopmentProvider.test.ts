import test from 'node:test';
import assert from 'node:assert/strict';
import { coreDevelopmentProvider } from './coreDevelopmentProvider.js';
import {
  buildNormalizedTrajectoryContext,
  type WorldDevelopmentContext,
} from '../../../shared/developmentProvider.js';
import { createDefaultWorldDevelopmentSettings } from '../../../shared/worldDevelopmentMetadata.js';
import { createDefaultPresentEra } from '../../../shared/factionMomentumMetadata.js';

function makeContext(
  overrides: Partial<WorldDevelopmentContext> = {},
): WorldDevelopmentContext {
  const era = { ...createDefaultPresentEra(), id: 'era-1', name: 'Era I' };
  return {
    campaignId: 'camp-1',
    projectedFactionStates: [
      buildNormalizedTrajectoryContext({
        subjectPageId: 'org-1',
        subjectTitle: 'Silver Harbor',
        subjectCategory: 'organizations',
        region: 'north',
        trajectory: {
          eraId: 'era-1',
          byEraId: null,
          direction: null,
          outcome: null,
          momentumState: 'rising',
          pressure: 40,
          gmNote: null,
        },
        resolvedForEraId: 'era-1',
        eras: [era],
        activityLevel: 'high',
        isExplicit: true,
        bullets: ['Silver Harbor is gaining momentum and visibility.'],
      }),
    ],
    currentEra: era,
    settings: createDefaultWorldDevelopmentSettings(),
    advanceMagnitude: 'medium',
    nextEpochMinute: '100000',
    projection: {
      currentEra: era,
      risingTensions: [],
      eraTrends: [],
      nearFutureBullets: [],
      projectedByNextSession: null,
    },
    ...overrides,
  };
}

test('core provider emits trade expansion for rising faction', () => {
  const candidates = coreDevelopmentProvider.generateCandidates(makeContext());
  assert.ok(candidates.length >= 1);
  const match = candidates.find((c) => c.definitionId === 'trade_expansion');
  assert.ok(match);
  assert.match(match!.title, /Silver Harbor/);
  assert.equal(match!.proposedAcceptTarget, 'calendar_event');
  assert.deepEqual(match!.trajectoryRef, {
    subjectPageId: 'org-1',
    fromEraId: 'era-1',
  });
});

test('core provider includes direction in rationale for explicit trajectories', () => {
  const era = { ...createDefaultPresentEra(), id: 'era-1', name: 'Era I' };
  const candidates = coreDevelopmentProvider.generateCandidates(
    makeContext({
      projectedFactionStates: [
        buildNormalizedTrajectoryContext({
          subjectPageId: 'org-1',
          subjectTitle: 'Iron Compact',
          subjectCategory: 'organizations',
          region: null,
          trajectory: {
            eraId: 'era-1',
            byEraId: null,
            direction: 'Militarizing',
            outcome: 'Starts a war',
            momentumState: 'rising',
            pressure: 40,
            gmNote: null,
          },
          resolvedForEraId: 'era-1',
          eras: [era],
          activityLevel: 'high',
          isExplicit: true,
          bullets: ['Border provocations'],
        }),
      ],
    }),
  );
  const faction = candidates.find((c) => c.suggestionKind === 'faction_pressure');
  assert.ok(faction);
  assert.ok(faction!.rationale.some((line) => line.text.includes('Militarizing')));
  assert.ok(faction!.rationale.some((line) => line.text.includes('Starts a war')));
});

test('core provider omits trajectoryRef for worldState fallback contexts', () => {
  const era = { ...createDefaultPresentEra(), id: 'era-1', name: 'Era I' };
  const fallback = buildNormalizedTrajectoryContext({
    subjectPageId: 'org-1',
    subjectTitle: 'Iron Compact',
    subjectCategory: 'organizations',
    region: null,
    trajectory: {
      eraId: 'era-1',
      byEraId: null,
      direction: null,
      outcome: null,
      momentumState: 'rising',
      pressure: null,
      gmNote: null,
    },
    resolvedForEraId: 'era-1',
    eras: [era],
    activityLevel: 'medium',
    isExplicit: false,
    bullets: [],
  });
  const candidates = coreDevelopmentProvider.generateCandidates(
    makeContext({ projectedFactionStates: [fallback] }),
  );
  const faction = candidates.find((c) => c.suggestionKind === 'faction_pressure');
  assert.ok(faction);
  assert.equal(faction!.trajectoryRef, null);
});

test('core provider emits modest trajectory_shift for explicit character trajectories', () => {
  const era = { ...createDefaultPresentEra(), id: 'era-1', name: 'Era I' };
  const candidates = coreDevelopmentProvider.generateCandidates(
    makeContext({
      projectedFactionStates: [
        buildNormalizedTrajectoryContext({
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
          eras: [era],
          activityLevel: 'medium',
          isExplicit: true,
        }),
      ],
    }),
  );
  const match = candidates.find((c) => c.definitionId === 'trajectory_shift');
  assert.ok(match);
  assert.equal(match!.title, 'Mara — Rising influence');
  assert.match(match!.narrative ?? '', /rising influence/i);
  assert.match(match!.narrative ?? '', /takes the throne/i);
  assert.doesNotMatch(match!.narrative ?? '', /courtier|grain|famine pulse/i);
  assert.deepEqual(match!.trajectoryRef, {
    subjectPageId: 'char-1',
    fromEraId: 'era-1',
  });
  assert.equal(match!.primaryOrgPageId, 'char-1');
});

test('core provider emits modest trajectory_shift for explicit location trajectories', () => {
  const era = { ...createDefaultPresentEra(), id: 'era-1', name: 'Era I' };
  const candidates = coreDevelopmentProvider.generateCandidates(
    makeContext({
      projectedFactionStates: [
        buildNormalizedTrajectoryContext({
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
          eras: [era],
          activityLevel: 'medium',
          isExplicit: true,
        }),
      ],
    }),
  );
  const match = candidates.find((c) => c.definitionId === 'trajectory_shift');
  assert.ok(match);
  assert.equal(match!.title, 'Westgate — Declining');
  assert.match(match!.narrative ?? '', /declining/i);
  assert.match(match!.narrative ?? '', /severe famine/i);
  assert.doesNotMatch(match!.narrative ?? '', /grain prices/i);
  assert.deepEqual(match!.trajectoryRef, {
    subjectPageId: 'loc-1',
    fromEraId: 'era-1',
  });
});

test('core provider skips character/location without direction or outcome', () => {
  const era = { ...createDefaultPresentEra(), id: 'era-1', name: 'Era I' };
  const candidates = coreDevelopmentProvider.generateCandidates(
    makeContext({
      projectedFactionStates: [
        buildNormalizedTrajectoryContext({
          subjectPageId: 'loc-1',
          subjectTitle: 'Westgate',
          subjectCategory: 'locations',
          region: null,
          trajectory: {
            eraId: 'era-1',
            byEraId: null,
            direction: null,
            outcome: null,
            gmNote: 'note only',
          },
          resolvedForEraId: 'era-1',
          eras: [era],
          activityLevel: 'medium',
          isExplicit: true,
        }),
      ],
    }),
  );
  assert.equal(
    candidates.filter((c) => c.definitionId === 'trajectory_shift').length,
    0,
  );
});
