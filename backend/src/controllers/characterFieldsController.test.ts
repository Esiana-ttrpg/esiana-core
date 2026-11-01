import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../lib/prisma.js';
import { Prisma } from '../lib/prismaClient.js';
import { buildCampaignActor } from '../../../shared/campaignPolicy/policy.js';
import { createCustomCharacterField, listCharacterFields, updateCharacterField, ensurePluginFields } from './characterFieldsController.js';

// Exercise the real controllers and authorization with an isolated in-memory persistence adapter.
test('field registration, placement, values and campaign permissions', async (t) => {
  const replace = (object: any, key: string, method: (...args: any[]) => any) => {
    const original = object[key]; object[key] = method;
    t.after(() => { object[key] = original; });
  };
  const fields: any[] = [];
  const tabs: any[] = [];
  let sequence = 0;
  const entity = { id: 'entity', campaignId: 'campaign', title: 'Neris', metadata: { entityCategory: 'characters' },
    templateType: 'DEFAULT', parentId: null, visibility: 'Party', ownerType: 'STAFF', ownerUserId: null, ownerPartyId: null };
  const match = (row: any, where: any) => Object.entries(where ?? {}).every(([key, value]) => row[key] === value);
  const withTab = (row: any) => row && { ...row, pageTab: tabs.find((tab) => tab.id === row.pageTabId) ?? null };
  const persist = (data: any) => ({ ...data, ...(data.value === Prisma.JsonNull ? { value: null } : {}), updatedAt: new Date() });
  replace(prisma, '$transaction', async (callback: any, options: any) => {
    assert.equal(options.isolationLevel, 'Serializable');
    return callback(prisma);
  });
  replace(prisma.wikiPage, 'findFirst', async ({ where, select }: any) => select?.blocks ? null : match(entity, { id: where.id, campaignId: where.campaignId }) ? entity : null);
  replace(prisma.wikiPage, 'findMany', async () => [entity]);
  replace(prisma.searchIndexDocument, 'deleteMany', async () => ({ count: 0 }));
  replace(prisma.campaignPluginSetting, 'findMany', async () => []);
  replace(prisma.pluginCharacterPageState, 'findMany', async ({ where }: any) => where.providerState === 'REMOVED' ? [] : [{ pluginId: 'archive', sourceKey: 'notes', providerState: 'AVAILABLE' }]);
  replace(prisma.characterPageTab, 'findMany', async ({ where }: any) => tabs.filter((row) => match(row, where)));
  replace(prisma.characterPageTab, 'findFirst', async ({ where, orderBy }: any) => {
    const rows = tabs.filter((row) => match(row, where));
    return (orderBy ? rows.sort((a, b) => b.displayOrder - a.displayOrder) : rows)[0] ?? null;
  });
  replace(prisma.characterPageTab, 'create', async ({ data }: any) => {
    const row = { id: `tab-${++sequence}`, hidden: false, coreKey: null, ...data };
    tabs.push(row); return row;
  });
  replace(prisma.characterField, 'findFirst', async ({ where, orderBy }: any) => {
    const rows = fields.filter((row) => match(row, where));
    return withTab((orderBy ? rows.sort((a, b) => b.displayOrder - a.displayOrder) : rows)[0]) ?? null;
  });
  replace(prisma.characterField, 'findMany', async ({ where }: any) => fields.filter((row) => match(row, where)).map(withTab));
  replace(prisma.characterField, 'create', async ({ data }: any) => {
    const row = persist({ createdAt: new Date(), ...data }); fields.push(row); return withTab(row);
  });
  replace(prisma.characterField, 'update', async ({ where, data }: any) => {
    const row = fields.find((row) => row.id === where.id); assert.ok(row);
    Object.assign(row, persist(data)); return withTab(row);
  });
  function request(body: any = {}, extra: any = {}) {
    return { params: { pageId: 'entity' }, body, authMethod: 'apiToken', apiTokenId: 'enve-token', apiTokenName: 'Enve',
      user: { id: 'owner' }, campaign: { campaignId: 'campaign', role: 'GAMEMASTER', actor: buildCampaignActor({ kind: 'member',
        userId: 'owner', campaignOwnerUserId: 'owner', membershipRole: 'GAMEMASTER', discoverability: 'PRIVATE' }) }, ...extra } as any;
  }
  async function call(handler: any, req: any) {
    const res = { code: 200, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; } };
    await handler(req, res); return res;
  }
  replace(prisma.characterField, 'upsert', async ({ where, create, update }: any) => {
    const existing = fields.find((row) => row.characterPageId === where.characterPageId_fieldKey.characterPageId && row.fieldKey === where.characterPageId_fieldKey.fieldKey);
    if (existing) { Object.assign(existing, persist(update)); return existing; }
    const row = persist({ id: 'plugin-' + ++sequence, createdAt: new Date(), ...create }); fields.push(row); return row;
  });
  let registered: any;
  await t.test('an app name creates one campaign/entity-scoped canvas destination on demand', async () => {
    const first = await call(createCustomCharacterField, request({ label: 'Memory', type: 'NUMBER', value: 0, sourceKey: 'memory' }));
    assert.equal(first.code, 201); registered = first.body.field;
    assert.equal(tabs.length, 1); assert.equal(tabs[0].title, 'Enve'); assert.equal(tabs[0].origin, 'API');
    assert.equal(tabs[0].campaignId, 'campaign'); assert.equal(tabs[0].characterPageId, 'entity');
    assert.equal(registered.pageId, tabs[0].id); assert.equal(registered.value, 0);
    await call(createCustomCharacterField, request({ label: 'Notes', type: 'STRING', value: '', sourceKey: 'notes' }));
    assert.equal(tabs.length, 1);
  });
  await t.test('declared default sheet overrides the app display name', async () => {
    const res = await call(createCustomCharacterField, request({ label: 'Connections', type: 'JSON', value: [], defaultSheetName: 'Living history' }));
    assert.equal(res.code, 201); assert.equal(tabs.find((tab) => tab.id === res.body.field.pageId)?.title, 'Living history');
  });
  await t.test('user fields use their selected sheet and do not acquire API provenance', async () => {
    const res = await call(createCustomCharacterField, request({ label: 'Clues', type: 'STRING', value: 'A silver thread', pageId: 'core:appearance' }, { authMethod: 'session' }));
    assert.equal(res.code, 201); assert.equal(res.body.field.origin, 'CUSTOM'); assert.equal(res.body.field.pageId, 'core:appearance');
    assert.equal(res.body.field.apiSourceId, undefined);
  });
  await t.test('moving and re-registering preserves id, value, ownership and explicit placement', async () => {
    const moved = await call(updateCharacterField, request({ pageId: null, displayOrder: 80 }, { params: { pageId: 'entity', fieldId: registered.id }, authMethod: 'session' }));
    assert.equal(moved.code, 200); assert.equal(moved.body.field.pageId, null);
    const again = await call(createCustomCharacterField, request({ label: 'Campaign memory', type: 'NUMBER', value: 999, sourceKey: 'memory', defaultSheetName: 'Changed default', pageId: tabs[0].id }));
    assert.equal(again.code, 200); assert.equal(again.body.field.id, registered.id); assert.equal(again.body.field.value, 0);
    assert.equal(again.body.field.pageId, null); assert.equal(again.body.field.displayOrder, 80); assert.equal(again.body.field.apiSourceId, 'enve-token');
    assert.ok(!tabs.some((tab) => tab.title === 'Changed default'));
    const sync = await call(updateCharacterField, request({ value: 5 }, { params: { pageId: 'entity', fieldId: registered.id } }));
    assert.equal(sync.body.field.pageId, null); assert.equal(sync.body.field.displayOrder, 80); assert.equal(sync.body.field.value, 5);
  });
  await t.test('stored text, zero, false, JSON, dates, enum and null values retain their types', async () => {
    for (const [type, value] of [['STRING', 'A silver thread'], ['NUMBER', 0], ['BOOLEAN', false],
      ['JSON', { clues: ['glass', 'silver'], count: 0 }], ['JSON', []], ['JSON', null], ['DATE', '2026-10-30'], ['ENUM', 'known']]) {
      const result = await call(createCustomCharacterField, request({ label: 'Typed value', type, value, pageId: null,
        ...(type === 'ENUM' ? { validation: { options: ['known', 'unknown'] } } : {}) }));
      assert.equal(result.code, 201); assert.deepEqual(result.body.field.value, value);
    }
    const invalid = await call(updateCharacterField, request({ value: 'not a number' }, { params: { pageId: 'entity', fieldId: registered.id } }));
    assert.equal(invalid.code, 400);
    assert.equal(fields.find((field) => field.id === registered.id).value, 5);
  });
  await t.test('explicit Overview on creation remains an explicit choice', async () => {
    const res = await call(createCustomCharacterField, request({ label: 'Visible here', type: 'BOOLEAN', value: false, pageId: null }));
    assert.equal(res.body.field.pageId, null); assert.equal(res.body.field.value, false);
  });
  await t.test('read-only plugin values can be placed without changing their identity or value', async () => {
    const field = { ...fields[0], id: 'plugin-field', fieldKey: 'plugin:archive:notes:memory', origin: 'PLUGIN', pluginId: 'archive', sourceKey: 'notes', providerKey: 'memory', capabilities: { readable: true, writable: false } };
    fields.push(field);
    const moved = await call(updateCharacterField, request({ pageId: tabs[0].id }, { params: { pageId: 'entity', fieldId: field.id } }));
    assert.equal(moved.code, 200); assert.equal(moved.body.field.pageId, tabs[0].id);
    assert.equal(moved.body.field.capabilities.placeable, true); assert.equal(moved.body.field.capabilities.writable, false);
    const rejected = await call(updateCharacterField, request({ value: 90 }, { params: { pageId: 'entity', fieldId: field.id } }));
    assert.equal(rejected.code, 403); assert.equal(field.value, 5);
  });
  await t.test('plugin registration refresh retains a user placement override and stored value', async () => {
    tabs.push({ ...tabs[0], id: 'plugin-tab', origin: 'PLUGIN', pluginState: { pluginId: 'archive', sourceKey: 'notes' } });
    const definitions = [{ pluginId: 'archive', definition: { key: 'notes', title: 'Archive', renderMode: 'CANVAS' as const,
      schemaVersion: 1, fields: [{ key: 'memory', label: 'Shared memory', type: 'NUMBER' as const, defaultValue: 999 }] } }];
    await ensurePluginFields('campaign', 'entity', definitions);
    const row = fields.find((field) => field.id === 'plugin-field');
    assert.equal(row.pageTabId, tabs[0].id); assert.equal(row.value, 5); assert.equal(row.label, 'Shared memory');
    assert.equal(row.fieldKey, 'plugin:archive:notes:memory');
    definitions[0].definition.fields.push({ key: 'new', label: 'New field', type: 'NUMBER', defaultValue: 7 });
    await ensurePluginFields('campaign', 'entity', definitions);
    const added = fields.find((field) => field.providerKey === 'new');
    assert.equal(added.pageTabId, 'plugin-tab'); assert.equal(added.value, 7);
  });
  await t.test('foreign entity destinations, campaign ids and invisible sheets are rejected', async () => {
    const foreign = { ...tabs[0], id: 'foreign', characterPageId: 'another-entity' }; tabs.push(foreign);
    const bad = await call(createCustomCharacterField, request({ label: 'No', type: 'STRING', pageId: 'foreign' }));
    assert.equal(bad.code, 400);
    const crossCampaign = await call(createCustomCharacterField, request({ label: 'No', type: 'STRING' }, { campaign: { ...request().campaign, campaignId: 'other' } }));
    assert.equal(crossCampaign.code, 404);
    tabs.push({ ...tabs[0], id: 'secret', title: 'Secret', visibility: 'DM_Only' });
    const member = { campaignId: 'campaign', role: 'PARTICIPANT', actor: buildCampaignActor({ kind: 'member', userId: 'player', campaignOwnerUserId: 'owner', membershipRole: 'PARTICIPANT', discoverability: 'PRIVATE' }) };
    const denied = await call(createCustomCharacterField, request({ label: 'No', type: 'STRING' }, { campaign: member }));
    assert.equal(denied.code, 403);
    const oldOwner = { ownerType: entity.ownerType, ownerUserId: entity.ownerUserId };
    Object.assign(entity, { ownerType: 'USER', ownerUserId: 'player' });
    const invisibleDefault = await call(createCustomCharacterField, request({ label: 'No', type: 'STRING', defaultSheetName: 'Secret' }, { campaign: member }));
    assert.equal(invisibleDefault.code, 403);
    const invisibleCore = await call(createCustomCharacterField, request({ label: 'No', type: 'STRING', pageId: 'core:discovery' }, { campaign: member }));
    assert.equal(invisibleCore.code, 400);
    Object.assign(entity, oldOwner);
  });
  await t.test('readers see persisted placements and legacy Overview fields without reassignment', async () => {
    const before = fields.map((field) => [field.id, field.pageTabId]);
    const res = await call(listCharacterFields, request());
    assert.equal(res.code, 200); assert.ok(res.body.fields.some((field: any) => field.id === registered.id && field.pageId === null));
    assert.deepEqual(fields.map((field) => [field.id, field.pageTabId]), before);
  });
});
