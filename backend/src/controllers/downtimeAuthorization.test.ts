import assert from 'node:assert/strict';
import test from 'node:test';
import express from 'express';
import { once } from 'node:events';
import { prisma } from '../lib/prisma.js';
import { buildCampaignActor } from '../../../shared/campaignPolicy/policy.js';
import { CampaignCapabilities as C } from '../../../shared/campaignPolicy/capabilities.js';
import { ownershipFromWiki } from '../lib/downtimeAuthorization.js';
import { requireDowntimeCreate, requireCampaignMember } from '../middleware/campaignScope.js';
import * as havens from './downtimeHavenController.js';
import * as projects from './downtimeProjectController.js';
import * as people from './downtimePeopleController.js';
import { buildDowntimeHubResponse } from './downtimeHubController.js';

// Real HTTP handlers, policy and services, with an isolated persistence adapter.
// No campaign database or user data is accessed by this test.
test('Downtime API authorization and default Player participation', async (t) => {
  const tables: Record<string, any[]> = {
    wikiPage: [], downtimeHaven: [], downtimeProject: [], downtimePersonRelationship: [],
    campaign: [{ id: 'campaign', currentEpochMinute: 0n }],
  };
  let seq = 0;
  const related = (table: string, row: any): any => {
    if (!row) return null;
    if (table === 'downtimeHaven' || table === 'downtimeProject') {
      return { ...row, wikiPage: tables.wikiPage.find((page) => page.id === row.wikiPageId) };
    }
    if (table === 'downtimePersonRelationship') return { ...row,
      characterPage: tables.wikiPage.find((page) => page.id === row.characterPageId),
      haven: related('downtimeHaven', tables.downtimeHaven.find((item) => item.id === row.havenId)),
      project: related('downtimeProject', tables.downtimeProject.find((item) => item.id === row.projectId)),
    };
    return row;
  };
  function matches(row: any, where: any): boolean {
    return Object.entries(where ?? {}).every(([key, value]: [string, any]) => {
      if (value === undefined) return true;
      if (value && typeof value === 'object' && !(value instanceof Date)) {
        if ('in' in value) return value.in.includes(row[key]);
        if ('not' in value) return row[key] !== value.not;
        return matches(row[key], value);
      }
      return row[key] === value;
    });
  }
  function replace(object: any, key: string, fn: any) {
    const original = object[key]; object[key] = fn;
    t.after(() => { object[key] = original; });
  }
  let beforeWikiLock: (() => void) | undefined;
  replace(prisma, '$executeRaw', async (sql: TemplateStringsArray) => {
    if (sql.join('').includes('WikiPage')) { const run = beforeWikiLock; beforeWikiLock = undefined; run?.(); }
    return 1;
  });
  replace(prisma, '$transaction', async (callback: any) => callback(prisma));
  for (const table of Object.keys(tables)) {
    const delegate = (prisma as any)[table];
    const find = ({ where }: any) => tables[table].map((row) => related(table, row)).filter((row) => matches(row, where));
    replace(delegate, 'findMany', async (query: any) => find(query));
    replace(delegate, 'findFirst', async (query: any) => find(query)[0] ?? null);
    replace(delegate, 'findUnique', async (query: any) => find(query)[0] ?? null);
    replace(delegate, 'findUniqueOrThrow', async (query: any) => { const row = find(query)[0]; assert.ok(row); return row; });
    replace(delegate, 'count', async (query: any) => find(query).length);
    replace(delegate, 'create', async ({ data }: any) => {
      const row = { id: `id-${++seq}`, campaignId: 'campaign', deletedAt: null,
        ownerType: 'STAFF', ownerUserId: null, ownerPartyId: null, visibility: 'PARTY',
        metadata: {}, blocks: [], parentId: null, havenId: null, projectId: null,
        status: 'ACTIVE', startedAtEpochMinute: null, endedAtEpochMinute: null,
        createdAt: new Date(), updatedAt: new Date(), ...data };
      tables[table].push(row); return related(table, row);
    });
    replace(delegate, 'update', async ({ where, data }: any) => {
      const row = tables[table].find((item) => matches(item, where)); assert.ok(row);
      Object.assign(row, data); return related(table, row);
    });
    replace(delegate, 'delete', async ({ where }: any) => {
      const index = tables[table].findIndex((item) => matches(item, where));
      assert.ok(index >= 0); return tables[table].splice(index, 1)[0];
    });
  }
  replace(prisma.entityRelation, 'deleteMany', async () => ({ count: 0 }));
  replace(prisma.entityRelation, 'createMany', async ({ data }: any) => ({ count: data.length }));
  await prisma.wikiPage.create({ data: { campaignId: 'campaign', title: 'Game', visibility: 'PARTY' } });
  await prisma.wikiPage.create({ data: { campaignId: 'campaign', title: 'Characters', metadata: { systemCategoryKey: 'characters' } } });

  let role = 'PARTICIPANT';
  let isMember = true;
  let partyId: string | null = 'party';
  let overrides: Array<{ role: string; capability: string; effect: string }> = [];
  const context = () => ({ campaignId: 'campaign', campaignHandle: 'campaign', role,
    partyId, isMember, capabilities: new Set(),
    actor: buildCampaignActor({ kind: isMember ? 'member' : 'anonymous', userId: 'enve', membershipRole: role,
      campaignOwnerUserId: 'gm', discoverability: 'private', allowPlayerChronologyManagement: false,
      partyId, roleCapabilityOverrides: overrides }),
  });
  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => { req.user = { id: 'enve' }; req.campaign = context(); req.authMethod = 'apiToken'; next(); });
  for (const [path, handlers] of [['havens', havens], ['projects', projects]] as const) {
    const h: any = handlers;
    const name = path === 'havens' ? 'Haven' : 'Project';
    app.post(`/${path}`, requireDowntimeCreate as any, h[`createDowntime${name}Handler`]);
    app.get(`/${path}`, h[`listDowntime${name}sHandler`]);
    app.get(`/${path}/:id`, h[`getDowntime${name}Handler`]);
    app.patch(`/${path}/:id`, requireCampaignMember as any, h[`updateDowntime${name}Handler`]);
    app.delete(`/${path}/:id`, requireCampaignMember as any, h[`deleteDowntime${name}Handler`]);
  }
  app.post('/people', requireDowntimeCreate as any, people.createDowntimePersonHandler as any);
  app.patch('/people/:id', requireCampaignMember as any, people.updateDowntimePersonHandler as any);
  app.get('/people', people.listDowntimePeopleHandler as any);
  app.get('/people/character/:pageId', people.getDowntimePersonByCharacterHandler as any);
  app.get('/hub', (req: any, res) => buildDowntimeHubResponse(req, res, tables.wikiPage.find((page) => page.title === 'Downtime').id));
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  async function call(method: string, path: string, body?: unknown) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    const result = text ? JSON.parse(text) : null;
    return { status: response.status, body: result };
  }
  const pageFor = (row: any) => tables.wikiPage.find((page) => page.id === row.wikiPageId);
  let haven: any; let project: any; let hireling: any;
  await t.test('Player creates a personal haven, adds spaces and upgrades, and progresses a personal project', async () => {
    const created = await call('POST', '/havens', { title: 'Enve’s refuge' });
    assert.equal(created.status, 201, JSON.stringify(created)); haven = created.body.haven;
    assert.equal(pageFor(haven).ownerType, 'USER'); assert.equal(pageFor(haven).ownerUserId, 'enve');
    const updated = await call('PATCH', `/havens/${haven.id}`, { fields: {
      spaces: [{ id: 'study', label: 'Map room' }], upgrades: [{ id: 'roof', label: 'Restored roof' }],
    } });
    assert.equal(updated.status, 200); assert.equal(updated.body.haven.spaces[0].label, 'Map room');
    assert.equal(updated.body.haven.upgrades[0].label, 'Restored roof');
    const started = await call('POST', '/projects', { title: 'Restore the archive', fields: { durationTotalMinutes: '1000' } });
    assert.equal(started.status, 201); project = started.body.project;
    assert.equal(pageFor(project).ownerUserId, 'enve');
    assert.equal((await call('PATCH', `/projects/${project.id}`, { fields: { durationElapsedMinutes: '100' } })).status, 200);
    const read = await call('GET', `/projects/${project.id}`);
    assert.equal(read.body.project.durationElapsedMinutes, '100'); assert.equal(read.body.canEdit, true);
  });
  await t.test('Player creates and maintains a hireling, and hub/standalone permissions agree', async () => {
    const created = await call('POST', '/people', { characterName: 'Neris', relationshipType: 'HIRELING', havenId: haven.id });
    assert.equal(created.status, 201, JSON.stringify(created)); hireling = created.body.person;
    assert.equal((await call('PATCH', `/people/${hireling.id}`, { notes: 'Charting the coast' })).status, 200);
    const standalone = await call('GET', '/people');
    const hub = await call('GET', '/hub?section=people');
    assert.equal(hub.status, 200); assert.deepEqual(hub.body.people, standalone.body);
    assert.equal(standalone.body.people[0].canEdit, true);
    assert.ok(standalone.body.characterOptions.some((option: any) => option.id === hireling.characterPageId));
    const byCharacter = await call('GET', `/people/character/${hireling.characterPageId}`);
    assert.deepEqual(byCharacter.body.person, standalone.body.people[0]);
  });
  await t.test('party collaboration includes spaces, progress and hirelings but excludes shared deletion', async () => {
    for (const row of [haven, project]) Object.assign(pageFor(row), { ownerType: 'PARTY', ownerUserId: null, ownerPartyId: 'party' });
    Object.assign(tables.wikiPage.find((page) => page.id === hireling.characterPageId), { ownerType: 'PARTY', ownerUserId: null, ownerPartyId: 'party' });
    assert.equal((await call('PATCH', `/havens/${haven.id}`, { title: 'Our refuge' })).status, 200);
    assert.equal((await call('PATCH', `/projects/${project.id}`, { fields: { durationElapsedMinutes: '200' } })).status, 200);
    assert.equal((await call('PATCH', `/people/${hireling.id}`, { havenId: null, projectId: project.id })).status, 200);
    assert.equal((await call('DELETE', `/projects/${project.id}`)).status, 403);
    assert.equal((await call('DELETE', `/havens/${haven.id}`)).status, 403);
  });
  await t.test('another player’s personal resources and hidden resources resist direct mutations by ID', async () => {
    for (const [path, row] of [['havens', haven], ['projects', project]] as const) {
      Object.assign(pageFor(row), { ownerType: 'USER', ownerUserId: 'other' });
      assert.equal((await call('PATCH', `/${path}/${row.id}`, { title: 'Unauthorized' })).status, 403);
      assert.equal((await call('DELETE', `/${path}/${row.id}`)).status, 403);
      Object.assign(pageFor(row), { ownerUserId: 'enve', visibility: 'GM_ONLY' });
      assert.equal((await call('GET', `/${path}/${row.id}`)).status, 404);
      assert.equal((await call('PATCH', `/${path}/${row.id}`, { title: 'Unauthorized' })).status, 403);
      assert.equal((await call('DELETE', `/${path}/${row.id}`)).status, 403);
      pageFor(row).visibility = 'PARTY';
    }
    const character = tables.wikiPage.find((page) => page.id === hireling.characterPageId);
    Object.assign(character, { ownerType: 'USER', ownerUserId: 'other', ownerPartyId: null });
    assert.equal((await call('PATCH', `/people/${hireling.id}`, { notes: 'Unauthorized' })).status, 403);
    const other = await call('GET', '/people');
    assert.equal(other.body.people[0].canEdit, false);
    assert.ok(!other.body.characterOptions.some((option: any) => option.id === hireling.characterPageId));
    character.ownerUserId = 'enve';
    character.visibility = 'GM_ONLY';
    assert.equal((await call('PATCH', `/people/${hireling.id}`, { notes: 'Unauthorized' })).status, 403);
    character.visibility = 'PARTY';
  });
  await t.test('visibility changes and inaccessible hireling destinations are rejected without side effects', async () => {
    for (const [path, row] of [['havens', haven], ['projects', project]] as const) {
      for (const patch of [{ visibility: 'PUBLIC' }, { fields: { visibility: 'PUBLIC' } }]) {
        assert.equal((await call('PATCH', `/${path}/${row.id}`, patch)).status, 403);
        assert.equal(pageFor(row).visibility, 'PARTY');
      }
    }
    for (const visibility of ['GM_ONLY', 'PARTY']) {
      Object.assign(pageFor(haven), { visibility, ownerUserId: 'other' });
      assert.equal((await call('PATCH', `/people/${hireling.id}`, { projectId: null, havenId: haven.id })).status, 403);
      assert.equal((await call('POST', '/people', { characterName: 'Sera', relationshipType: 'HIRELING', havenId: haven.id })).status, 403);
    }
    Object.assign(pageFor(haven), { visibility: 'PARTY', ownerUserId: 'enve' });
  });
  await t.test('simulation controls stay administrative while ordinary haven saves succeed', async () => {
    for (const body of [{ havenSimulation: { enabled: true } }, { fields: { havenSimulation: { enabled: true } } }, { fields: { simulationHints: { enabled: true } } }]) {
      assert.equal((await call('PATCH', `/havens/${haven.id}`, body)).status, 403);
    }
    assert.equal((await call('PATCH', `/havens/${haven.id}`, { title: 'Ordinary save' })).status, 200);
    partyId = null;
    for (const route of ['/havens', '/projects']) assert.equal((await call('POST', route, { title: 'Orphaned party', ownerType: 'PARTY' })).status, 400);
    partyId = 'party';
  });
  await t.test('non-Character wiki pages cannot become hirelings', async () => {
    const target = await prisma.wikiPage.create({ data: { campaignId: 'campaign', title: 'A location',
      metadata: { entityCategory: 'locations' }, ownerType: 'USER', ownerUserId: 'enve' } });
    assert.equal((await call('POST', '/people', { characterPageId: target.id, relationshipType: 'HIRELING' })).status, 400);
  });
  await t.test('assignment authorization is revalidated after taking canonical wiki write locks', async () => {
    const before = tables.downtimePersonRelationship.find((row) => row.id === hireling.id);
    const originalHaven = before.havenId;
    beforeWikiLock = () => { pageFor(haven).visibility = 'GM_ONLY'; };
    assert.equal((await call('PATCH', `/people/${hireling.id}`, { havenId: haven.id, projectId: null })).status, 403);
    assert.equal(before.havenId, originalHaven);
    pageFor(haven).visibility = 'PARTY';
  });
  await t.test('Observer grants work; Player and Writer revocations affect reads and writes', async () => {
    role = 'OBSERVER';
    assert.equal((await call('POST', '/havens', { title: 'Denied' })).status, 403);
    overrides = [C.DOWNTIME_CREATE, C.PAGE_EDIT_OWNED, C.PAGE_EDIT_PARTY, C.DOWNTIME_DELETE_OWNED]
      .map((capability) => ({ role, capability, effect: 'GRANT' }));
    const created = await call('POST', '/havens', { title: 'Observer’s refuge' });
    assert.equal(created.status, 201);
    assert.equal((await call('PATCH', `/havens/${created.body.haven.id}`, { title: 'Updated' })).status, 200);
    assert.equal((await call('DELETE', `/havens/${created.body.haven.id}`)).status, 204);
    isMember = false;
    assert.equal((await call('POST', '/havens', { title: 'No membership' })).status, 403);
    assert.equal((await call('PATCH', `/havens/${haven.id}`, { title: 'No membership' })).status, 403);
    assert.equal((await call('DELETE', `/projects/${project.id}`)).status, 403);
    isMember = true;
    for (const revokedRole of ['WRITER', 'PARTICIPANT']) {
      role = revokedRole;
      overrides = [C.WIKI_VIEW_PARTY, C.NARRATIVE_ELEVATED_VIEW].map((capability) => ({ role, capability, effect: 'REVOKE' }));
      assert.equal((await call('GET', `/havens/${haven.id}`)).status, 404);
      assert.equal((await call('PATCH', `/havens/${haven.id}`, { title: 'Denied' })).status, 403);
      assert.equal((await call('GET', '/people')).body.people.length, 0);
      assert.equal((await call('GET', '/hub?section=people')).status, 404);
    }
    role = 'PARTICIPANT'; overrides = [];
  });
  await t.test('ordinary progress cannot configure or apply privileged automated world effects', async () => {
    const outcomes = [{ id: 'reveal', outcomeKind: 'unlock_entity', linkedPageIds: ['hidden-page'], status: 'pending' }];
    assert.equal((await call('POST', '/projects', { title: 'Reveal hidden content', fields: { outcomes } })).status, 403);
    assert.equal((await call('PATCH', `/projects/${project.id}`, { fields: { outcomes } })).status, 403);
    const row = tables.downtimeProject.find((item) => item.id === project.id);
    row.outcomes = outcomes;
    assert.equal((await call('PATCH', `/projects/${project.id}`, { fields: { status: 'COMPLETED' } })).status, 403);
    // Pre-existing effects are preserved when ordinary progress is updated.
    assert.equal((await call('PATCH', `/projects/${project.id}`, { fields: { durationElapsedMinutes: '300' } })).status, 200);
    assert.equal(row.outcomes[0].outcomeKind, 'unlock_entity');
    row.outcomes = [];
  });
  await t.test('legacy ownership remains administrative; Delete Own is independent from Edit', async () => {
    assert.equal(ownershipFromWiki({ visibility: 'PARTY', deletedAt: null, ownerType: 'unknown', ownerUserId: null, ownerPartyId: null }).ownerType, 'STAFF');
    Object.assign(pageFor(haven), { ownerType: 'STAFF', ownerUserId: null });
    assert.equal((await call('PATCH', `/havens/${haven.id}`, { title: 'Denied' })).status, 403);
    role = 'WRITER';
    assert.equal((await call('PATCH', `/havens/${haven.id}`, { title: 'Legacy refuge' })).status, 200);
    role = 'PARTICIPANT';
    overrides = [{ role, capability: C.DOWNTIME_DELETE_OWNED, effect: 'REVOKE' }];
    assert.equal((await call('PATCH', `/projects/${project.id}`, { title: 'Still editable' })).status, 200);
    assert.equal((await call('DELETE', `/projects/${project.id}`)).status, 403);
    overrides = [];
    assert.equal((await call('DELETE', `/projects/${project.id}`)).status, 204);
  });
});
