import { canInspectSuppressedDowntimeEvents, filterDowntimeOverlayEntries } from './downtimeHubController.js';
import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../lib/prisma.js';
import { buildCampaignActor, resolveActorCapabilities } from '../../../shared/campaignPolicy/policy.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { chronologyCanCreateEvent, chronologyCanCreateEra } from '../lib/chronologyAccess.js';
import { requireChronologyEventCreate, requireChronologyEraCreate, requireChronologyEventDelete } from '../middleware/campaignScope.js';
import { getChronologyTimelineBundle } from './chronologyController.js';
import { listCampaignMaps, getCampaignMap } from './mapsController.js';
import { buildConvergenceOverlay } from '../lib/chronologyConvergenceService.js';
import { narrativeCapabilitiesFromActor } from '../lib/narrativeProjectionContext.js';
import { listDowntimePeople } from '../lib/downtimePeopleService.js';

function scope(role: string, rows: Array<{ capability: string; effect: string }> = []) {
  const actor = buildCampaignActor({ kind: 'member', userId: 'enve', membershipRole: role,
    campaignOwnerUserId: 'gm', discoverability: 'private', allowPlayerChronologyManagement: false,
    roleCapabilityOverrides: rows.map((row) => ({ ...row, role })) });
  return { campaignId: 'campaign', role, isMember: true, actor, capabilities: resolveActorCapabilities(actor) } as any;
}

const response = () => ({ code: 200, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } });

test('Observer chronology create grants require membership and explicit capabilities', () => {
  for (const [capability, guard, policy] of [
    [C.CHRONOLOGY_EVENT_CREATE, requireChronologyEventCreate, chronologyCanCreateEvent],
    [C.CHRONOLOGY_ERA_CREATE, requireChronologyEraCreate, chronologyCanCreateEra],
  ] as const) {
    for (const granted of [false, true]) {
      const campaign = scope('OBSERVER', granted ? [{ capability, effect: 'GRANT' }] : []);
      assert.equal(policy(campaign), granted);
      const res = response(); let next = false;
      guard({ campaign } as any, res as any, () => { next = true; });
      assert.equal(next, granted);
      campaign.isMember = false;
      const rejected = response();
      guard({ campaign } as any, rejected as any, () => assert.fail('membership required'));
      assert.equal(rejected.code, 403);
    }
  }
  const editor = scope('PARTICIPANT', [
    { capability: C.CHRONOLOGY_EVENT_EDIT, effect: 'GRANT' },
    { capability: C.CHRONOLOGY_EVENT_DELETE_OWNED, effect: 'REVOKE' },
  ]);
  const denied = response();
  requireChronologyEventDelete({ campaign: editor } as any, denied as any, () => assert.fail('Edit is not Delete'));
  assert.equal(denied.code, 403);
});

test('suppressed downtime events require both Manage and chronology management plus elevated staff access', () => {
  assert.equal(canInspectSuppressedDowntimeEvents(scope('WRITER')), true);
  for (const capability of [C.DOWNTIME_MANAGE, C.CHRONOLOGY_EDIT, C.NARRATIVE_ELEVATED_VIEW]) {
    assert.equal(canInspectSuppressedDowntimeEvents(scope('WRITER', [{ capability, effect: 'REVOKE' }])), false);
    const hidden = { projection: { visible: true, revelationState: 'HIDDEN' } } as any;
    assert.equal(filterDowntimeOverlayEntries(scope('WRITER', [{ capability, effect: 'REVOKE' }]), [hidden]).length, 0);
  }
  assert.equal(canInspectSuppressedDowntimeEvents(scope('PARTICIPANT', [
    { capability: C.PAGE_EDIT_ANY, effect: 'GRANT' },
    { capability: C.DOWNTIME_MANAGE, effect: 'GRANT' },
  ])), false);
});

test('map lists and detail use effective visibility even for map editors', async (t) => {
  function stub(object: any, key: string, fn: any) { const original = object[key]; object[key] = fn; t.after(() => { object[key] = original; }); }
  const maps = ['Public', 'Party', 'DM_Only'].map((visibility) => ({ id: visibility, visibility,
    url: '/map.webp', type: 'MAP', createdAt: new Date(), displayName: visibility }));
  stub(prisma.asset, 'findMany', async () => maps);
  stub(prisma.asset, 'findFirst', async ({ where }: any) => maps.find((row) => row.id === where.id) ?? null);
  stub(prisma.wikiPage, 'findFirst', async () => null);
  stub(prisma.mapPin, 'count', async () => 0);
  stub(prisma.mapPin, 'findMany', async () => []);
  for (const [campaign, expected] of [
    [scope('PARTICIPANT', [{ capability: C.MAPS_EDIT, effect: 'GRANT' }]), ['Public', 'Party']],
    [scope('WRITER', [{ capability: C.NARRATIVE_ELEVATED_VIEW, effect: 'REVOKE' }]), ['Public', 'Party']],
    [scope('PARTICIPANT', [{ capability: C.WIKI_VIEW_PARTY, effect: 'REVOKE' }]), ['Public']],
    [scope('PARTICIPANT', [{ capability: C.NARRATIVE_ELEVATED_VIEW, effect: 'GRANT' }]), ['Public', 'Party', 'DM_Only']],
  ] as const) {
    const res = response();
    await listCampaignMaps({ campaign } as any, res as any);
    assert.deepEqual(res.body.maps.map((map: any) => map.id), expected);
    const detail = response();
    await getCampaignMap({ campaign, params: { assetId: 'DM_Only' } } as any, detail as any);
    assert.equal(detail.code, expected.includes('DM_Only') ? 200 : 404);
  }
});

test('overlay viewer capabilities override role elevation and retain explicitly granted elevation', async (t) => {
  function stub(object: any, key: string, fn: any) { const original = object[key]; object[key] = fn; t.after(() => { object[key] = original; }); }
  stub(prisma.campaign, 'findUnique', async () => ({ currentEpochMinute: 0n, fantasyCalendars: [] }));
  stub(prisma.fantasyCalendar, 'findMany', async () => [{ id: 'calendar', epochOffset: 0n, weekdays: [], months: [{ name: 'First', length: 30, type: 'standard' }], seasons: [], moons: [], leapDays: [] }]);
  stub(prisma.campaignMomentum, 'findUnique', async () => ({ erasMigrated: true, eraRecurrenceHistory: {} }));
  stub(prisma.campaignEra, 'findMany', async () => []);
  stub(prisma.campaignSessionTimeline, 'findMany', async () => []);
  stub(prisma.contentPresenceState, 'findMany', async () => []);
  // Return a hidden source even when the SQL prefilter would have removed it,
  // so the final narrative projection is also required to enforce visibility.
  stub(prisma.calendarEvent, 'findMany', async () => [{ id: 'secret', title: 'Secret revelation',
    calendarId: 'calendar', visibility: 'DM_ONLY', importance: 'MINOR', duration: 1,
    isRepeating: false, targetEpochMinute: 0n, targetYear: 1, targetMonth: 0, targetDay: 1 }]);
  for (const [role, effect, count] of [['WRITER', 'REVOKE', 0], ['PARTICIPANT', 'GRANT', 1]] as const) {
    const campaign = scope(role, [{ capability: C.NARRATIVE_ELEVATED_VIEW, effect }]);
    const bundle = await buildConvergenceOverlay({ campaignId: 'campaign', campaignHandle: 'campaign', role,
      allowPlayerChronologyManagement: false, capabilityOverrides: narrativeCapabilitiesFromActor(campaign.actor),
      domains: ['world_event'], window: { mode: 'YEAR_RANGE', from: '0', to: '9999' },
      sessionLinkedOnly: false, includeSuppressed: false });
    assert.equal(bundle.entries.length, count);
  }
});

test('hireling character options query is opt-in', async (t) => {
  function stub(object: any, key: string, fn: any) { const original = object[key]; object[key] = fn; t.after(() => { object[key] = original; }); }
  for (const delegate of [prisma.downtimePersonRelationship, prisma.downtimeHaven, prisma.downtimeProject]) stub(delegate, 'findMany', async () => []);
  let reads = 0;
  stub(prisma.wikiPage, 'findMany', async () => { reads++; return []; });
  const ordinary = await listDowntimePeople('campaign', 'campaign', scope('PARTICIPANT'), false);
  assert.equal(reads, 0); assert.equal('characterOptions' in ordinary, false);
  const picker = await listDowntimePeople('campaign', 'campaign', scope('PARTICIPANT'), false, true);
  assert.equal(reads, 1); assert.deepEqual(picker.characterOptions, []);
});

test('chronology timeline advertises event-specific editing and deletion authority', async (t) => {
  function stub(object: any, key: string, fn: any) { const original = object[key]; object[key] = fn; t.after(() => { object[key] = original; }); }
  const calendar = { id: 'calendar', name: 'Calendar', isMasterTime: true, epochOffset: 0n,
    weekdays: [], months: [{ name: 'First', length: 30, type: 'standard' }], seasons: [], moons: [], leapDays: [] };
  stub(prisma.campaign, 'findUnique', async () => ({ currentEpochMinute: 0n, fantasyCalendars: [calendar] }));
  stub(prisma.fantasyCalendar, 'findMany', async () => [calendar]);
  stub(prisma.calendarEventCategory, 'findMany', async () => []);
  stub(prisma.calendarEvent, 'findMany', async () => ['enve', 'other'].map((creator) => ({
    id: creator, createdByUserId: creator, title: 'A discovery', calendarId: calendar.id,
    wikiPageId: null, visibility: 'PARTY', importance: 'MINOR', description: null, duration: 1,
    isRepeating: false, isRecurring: false, targetEpochMinute: 0n, targetYear: 1, targetMonth: 0, targetDay: 1,
    createdAt: new Date(), updatedAt: new Date(), conditions: null, moonOverrides: null,
  })));
  stub(prisma.campaignMomentum, 'findUnique', async () => ({ erasMigrated: true, eraRecurrenceHistory: {} }));
  stub(prisma.campaignEra, 'findMany', async () => []);
  stub(prisma.chronologyRoute, 'findMany', async ({ where }: any) => where.entityType === 'events' ? ['enve', 'other'].map((id) => ({ entityId: id, title: 'A discovery', slug: id, canonical: true })) : []);
  stub(prisma.campaign, 'findUniqueOrThrow', async () => ({ currentEpochMinute: 0n }));
  stub(prisma.contentPresenceState, 'findMany', async () => []);
  stub(prisma.wikiPage, 'findMany', async () => []);
  const own = response();
  await getChronologyTimelineBundle({ campaign: scope('PARTICIPANT'), query: {} } as any, own as any);
  assert.deepEqual(own.body.baseEvents.map((event: any) => [event.canEdit, event.canDelete]), [[true, true], [false, false]]);
  const createOnly = response();
  await getChronologyTimelineBundle({ campaign: scope('PARTICIPANT', [
    { capability: C.CHRONOLOGY_EVENT_EDIT_OWNED, effect: 'REVOKE' },
    { capability: C.CHRONOLOGY_EVENT_DELETE_OWNED, effect: 'REVOKE' },
  ]), query: {} } as any, createOnly as any);
  assert.deepEqual(createOnly.body.baseEvents.map((event: any) => [event.canEdit, event.canDelete]), [[false, false], [false, false]]);
});
