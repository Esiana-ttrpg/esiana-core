import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ContentRevelationStates,
} from '../../../shared/contentPresence.js';
import { MembershipRoles } from '../../../shared/campaignPolicy/membershipRoles.js';
import {
  buildNarrativeViewerContext,
  fromChronologyVisibility,
  fromRelationVisibility,
  fromWikiMapVisibility,
  isTimelineEventVisible,
  projectEntityRelation,
  projectRevelation,
  projectRoleVisibility,
  projectTimelineEventVisibility,
  projectWikiPageVisibility,
  resolveMapObjectRevelationState,
  resolveTemporalView,
  TemporalProjectionSurface,
  NarrativeVisibilityTier,
} from '../../../shared/narrativeProjection.js';

const campaignNow = {
  epochMinute: 1000n,
  dateParts: { year: 1024, month: 3, day: 15 },
};

function partyCtx() {
  return buildNarrativeViewerContext({
    role: MembershipRoles.PARTICIPANT,
    campaignNow,
  });
}

function elevatedCtx() {
  return buildNarrativeViewerContext({
    role: MembershipRoles.GAMEMASTER,
    campaignNow,
  });
}

test('visibility adapters normalize domain enums', () => {
  assert.equal(fromChronologyVisibility('DM_ONLY'), NarrativeVisibilityTier.ELEVATED_ONLY);
  assert.equal(fromWikiMapVisibility('DM_Only'), NarrativeVisibilityTier.ELEVATED_ONLY);
  assert.equal(fromRelationVisibility('SECRET'), NarrativeVisibilityTier.SECRET);
});

test('projectRevelation hides fog from party', () => {
  const party = projectRevelation(ContentRevelationStates.HIDDEN, partyCtx());
  assert.equal(party.visible, false);
  assert.equal(party.denyReason, 'unrevealed');
  const dm = projectRevelation(ContentRevelationStates.HIDDEN, elevatedCtx());
  assert.equal(dm.visible, true);
});

test('party map temporal view clamps to campaign now', () => {
  const resolution = resolveTemporalView({
    surface: TemporalProjectionSurface.MAP_SCENE,
    ctx: partyCtx(),
    requestedEpochMinute: 500n,
  });
  assert.equal(resolution.effectiveEpochMinute, 1000n);
  assert.equal(resolution.requestedEpochIgnored, true);
  assert.equal(resolution.isCampaignPresent, true);
});

test('elevated map temporal view honors requested epoch', () => {
  const resolution = resolveTemporalView({
    surface: TemporalProjectionSurface.MAP_SCENE,
    ctx: elevatedCtx(),
    requestedEpochMinute: 500n,
  });
  assert.equal(resolution.effectiveEpochMinute, 500n);
  assert.equal(resolution.requestedEpochIgnored, false);
  assert.equal(resolution.isCampaignPresent, false);
});

test('lore summary accepts party viewDate without clamp', () => {
  const viewDate = { year: 900, month: 1, day: 1 };
  const resolution = resolveTemporalView({
    surface: TemporalProjectionSurface.LORE_SUMMARY,
    ctx: partyCtx(),
    requestedDateParts: viewDate,
  });
  assert.deepEqual(resolution.effectiveDateParts, viewDate);
  assert.equal(resolution.requestedDateIgnored, false);
});

test('chronology timeline ignores viewer epoch', () => {
  const resolution = resolveTemporalView({
    surface: TemporalProjectionSurface.CHRONOLOGY_TIMELINE,
    ctx: elevatedCtx(),
    requestedEpochMinute: 500n,
  });
  assert.equal(resolution.effectiveEpochMinute, 1000n);
  assert.equal(resolution.policy.historicalMode, 'present_only');
});

test('map revelation merge order: presence overrides column', () => {
  assert.equal(
    resolveMapObjectRevelationState({
      columnRevelation: 'REVEALED',
      presenceOverride: ContentRevelationStates.HIDDEN,
    }),
    ContentRevelationStates.HIDDEN,
  );
  assert.equal(
    resolveMapObjectRevelationState({
      columnRevelation: 'HIDDEN',
      keyframeRevelation: 'REVEALED',
    }),
    ContentRevelationStates.REVEALED,
  );
});

test('projectWikiPageVisibility aligns discovery and revelation', () => {
  const map = new Map([['p1', ContentRevelationStates.HIDDEN]]);
  const result = projectWikiPageVisibility('p1', map, partyCtx());
  assert.equal(result.visible, false);
  assert.equal(result.discovery.isDiscovered, false);
});

test('projectTimelineEventVisibility combines role and revelation', () => {
  const map = new Map([['e1', ContentRevelationStates.REVEALED]]);
  const hidden = projectTimelineEventVisibility(
    'e1',
    'DM_ONLY',
    map,
    partyCtx(),
  );
  assert.equal(hidden.visible, false);
  const visible = projectTimelineEventVisibility(
    'e1',
    'PARTY',
    map,
    partyCtx(),
  );
  assert.equal(isTimelineEventVisible(visible), true);
});

test('projectEntityRelation hides GM_ONLY from party', () => {
  const result = projectEntityRelation('GM_ONLY', partyCtx());
  assert.equal(result.visible, false);
  assert.equal(result.role.denyReason, 'role_elevated_only');
});
