import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNormalizedTrajectoryContext,
  validateTrajectoryRef,
} from './developmentProvider.js';
import { createDefaultPresentEra } from './factionMomentumMetadata.js';
import {
  normalizeDevelopmentPayload,
  serializeDevelopmentPayload,
} from './worldDevelopmentMetadata.js';

const eraI = { ...createDefaultPresentEra(), id: 'era-i', name: 'Era I', sortOrder: 0 };
const eraII = {
  ...createDefaultPresentEra(),
  id: 'era-ii',
  name: 'Era II',
  sortOrder: 1,
  isCurrent: false,
};

test('buildNormalizedTrajectoryContext sets canonical fields and deprecated aliases', () => {
  const ctx = buildNormalizedTrajectoryContext({
    subjectPageId: 'org-1',
    subjectTitle: 'Westgate',
    subjectCategory: 'organizations',
    region: 'Coast',
    trajectory: {
      eraId: 'era-i',
      byEraId: 'era-ii',
      direction: 'Declining',
      outcome: 'Severe famine',
      momentumState: 'declining',
      pressure: 55,
      gmNote: 'Watch harvest',
    },
    resolvedForEraId: 'era-i',
    eras: [eraI, eraII],
    activityLevel: 'low',
    isExplicit: true,
    bullets: ['Trade collapse'],
  });

  assert.equal(ctx.subjectPageId, 'org-1');
  assert.equal(ctx.orgPageId, 'org-1');
  assert.equal(ctx.subjectTitle, 'Westgate');
  assert.equal(ctx.orgTitle, 'Westgate');
  assert.equal(ctx.subjectCategory, 'organizations');
  assert.equal(ctx.organizationState?.momentumState, 'declining');
  assert.equal(ctx.momentumState, 'declining');
  assert.equal(ctx.momentum, 'declining');
  assert.equal(ctx.fromEraId, 'era-i');
  assert.equal(ctx.fromEraName, 'Era I');
  assert.equal(ctx.byEraId, 'era-ii');
  assert.equal(ctx.byEraName, 'Era II');
  assert.equal(ctx.direction, 'Declining');
  assert.equal(ctx.outcome, 'Severe famine');
  assert.equal(ctx.resolvedForEraId, 'era-i');
  assert.equal(ctx.eraId, 'era-i');
  assert.equal(ctx.isExplicit, true);
});

test('buildNormalizedTrajectoryContext clears authorial fields for fallback', () => {
  const ctx = buildNormalizedTrajectoryContext({
    subjectPageId: 'org-1',
    subjectTitle: 'Westgate',
    subjectCategory: 'organizations',
    region: null,
    trajectory: {
      eraId: 'era-i',
      byEraId: 'era-ii',
      direction: 'Should not surface',
      outcome: 'Should not surface',
      momentumState: 'rising',
      pressure: 10,
      gmNote: 'Should not surface',
    },
    resolvedForEraId: 'era-i',
    eras: [eraI, eraII],
    activityLevel: 'medium',
    isExplicit: false,
  });
  assert.equal(ctx.isExplicit, false);
  assert.equal(ctx.direction, null);
  assert.equal(ctx.outcome, null);
  assert.equal(ctx.byEraId, null);
  assert.equal(ctx.gmNote, null);
  assert.equal(ctx.momentumState, 'rising');
  assert.ok(ctx.organizationState);
});

test('buildNormalizedTrajectoryContext for characters has no organizationState', () => {
  const ctx = buildNormalizedTrajectoryContext({
    subjectPageId: 'char-1',
    subjectTitle: 'Mara',
    subjectCategory: 'characters',
    region: null,
    trajectory: {
      eraId: 'era-i',
      byEraId: null,
      direction: 'Rising influence',
      outcome: 'Takes the throne',
      gmNote: null,
    },
    resolvedForEraId: 'era-i',
    eras: [eraI],
    activityLevel: 'medium',
    isExplicit: true,
  });
  assert.equal(ctx.subjectCategory, 'characters');
  assert.equal(ctx.organizationState, undefined);
  assert.equal(ctx.direction, 'Rising influence');
  assert.equal(ctx.outcome, 'Takes the throne');
  assert.equal(ctx.momentumState, 'stable');
});

test('validateTrajectoryRef accepts only explicit matching contexts', () => {
  const explicit = buildNormalizedTrajectoryContext({
    subjectPageId: 'org-1',
    subjectTitle: 'A',
    subjectCategory: 'organizations',
    region: null,
    trajectory: {
      eraId: 'era-i',
      byEraId: null,
      direction: 'Rising',
      outcome: null,
      momentumState: 'rising',
      pressure: null,
      gmNote: null,
    },
    resolvedForEraId: 'era-i',
    eras: [eraI],
    activityLevel: 'medium',
    isExplicit: true,
  });
  assert.deepEqual(
    validateTrajectoryRef({ subjectPageId: 'org-1', fromEraId: 'era-i' }, [explicit]),
    { subjectPageId: 'org-1', fromEraId: 'era-i' },
  );
  assert.equal(
    validateTrajectoryRef({ subjectPageId: 'org-1', fromEraId: 'era-i' }, [
      { ...explicit, isExplicit: false },
    ]),
    null,
  );
  assert.equal(
    validateTrajectoryRef({ subjectPageId: 'org-2', fromEraId: 'era-i' }, [explicit]),
    null,
  );
});

test('validateTrajectoryRef accepts character and location explicit contexts', () => {
  const character = buildNormalizedTrajectoryContext({
    subjectPageId: 'char-1',
    subjectTitle: 'Mara',
    subjectCategory: 'characters',
    region: null,
    trajectory: {
      eraId: 'era-i',
      byEraId: null,
      direction: 'Rising influence',
      outcome: 'Takes the throne',
      gmNote: null,
    },
    resolvedForEraId: 'era-i',
    eras: [eraI],
    activityLevel: 'medium',
    isExplicit: true,
  });
  const location = buildNormalizedTrajectoryContext({
    subjectPageId: 'loc-1',
    subjectTitle: 'Westgate',
    subjectCategory: 'locations',
    region: null,
    trajectory: {
      eraId: 'era-i',
      byEraId: null,
      direction: 'Declining',
      outcome: 'Severe famine',
      gmNote: null,
    },
    resolvedForEraId: 'era-i',
    eras: [eraI],
    activityLevel: 'medium',
    isExplicit: true,
  });
  assert.deepEqual(
    validateTrajectoryRef({ subjectPageId: 'char-1', fromEraId: 'era-i' }, [
      character,
      location,
    ]),
    { subjectPageId: 'char-1', fromEraId: 'era-i' },
  );
  assert.deepEqual(
    validateTrajectoryRef({ subjectPageId: 'loc-1', fromEraId: 'era-i' }, [
      character,
      location,
    ]),
    { subjectPageId: 'loc-1', fromEraId: 'era-i' },
  );
});

test('development payload round-trips providerId and trajectoryRef', () => {
  const payload = normalizeDevelopmentPayload({
    developmentType: 'faction_pressure',
    significance: 'minor',
    rationale: [{ kind: 'trajectory', text: 'A — Rising' }],
    confidence: 'medium',
    dependencyRefs: [],
    definitionId: 'faction_pressure',
    providerId: 'core',
    trajectoryRef: { subjectPageId: 'org-1', fromEraId: 'era-i' },
  });
  assert.ok(payload);
  assert.equal(payload!.providerId, 'core');
  assert.deepEqual(payload!.trajectoryRef, {
    subjectPageId: 'org-1',
    fromEraId: 'era-i',
  });
  const serialized = serializeDevelopmentPayload(payload!);
  const again = normalizeDevelopmentPayload(serialized);
  assert.equal(again!.providerId, 'core');
  assert.deepEqual(again!.trajectoryRef, payload!.trajectoryRef);
});
