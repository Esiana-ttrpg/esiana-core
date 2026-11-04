// Isolated SQLite acceptance check. Run: node --import tsx scripts/test-downtime-permissions.mjs
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import Database from 'better-sqlite3';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { normalizeSchemaPrismaForSqlite } from '../prisma/scripts/sqliteSchema.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'node_modules/.cache');
fs.mkdirSync(cache, { recursive: true });
const directory = fs.mkdtempSync(path.join(cache, 'downtime-permissions-'));
const schemaPath = path.join(directory, 'schema.prisma');
const databaseUrl = `file:${path.join(directory, 'acceptance.db').replaceAll('\\', '/')}`;
const configPath = path.join(directory, 'prisma.config.ts');
const require = createRequire(import.meta.url);
const cli = path.join(path.dirname(require.resolve('prisma/package.json')), 'build/index.js');
let db;
let server;
try {
  const schema = normalizeSchemaPrismaForSqlite(fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8'))
    .replace(/output\s*=\s*"[^"]+"/, 'output = "./client"');
  fs.writeFileSync(schemaPath, schema);
  fs.writeFileSync(configPath, `export default ${JSON.stringify({ schema: schemaPath, datasource: { url: databaseUrl } })};`);
  execFileSync(process.execPath, [cli, 'generate', '--config', configPath], { cwd: root, stdio: 'pipe' });
  const sql = execFileSync(process.execPath, [cli, 'migrate', 'diff', '--from-empty',
    '--to-schema', schemaPath, '--script', '--config', configPath], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  const sqlite = new Database(path.join(directory, 'acceptance.db'));
  try {
    // Prisma's SQLite diff emits bare JSON defaults; quote them in this temporary DDL.
    sqlite.exec(sql.replaceAll('DEFAULT {}', "DEFAULT '{}'").replaceAll('DEFAULT []', "DEFAULT '[]'"));
  } finally { sqlite.close(); }
  const { PrismaClient } = await import(pathToFileURL(path.join(directory, 'client/client.ts')).href);
  db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: databaseUrl }, { timestampFormat: 'unixepoch-ms' }) });
  // Controllers/services share this isolated client via the existing Prisma boundary.
  globalThis.prisma = db;
  process.env.NODE_ENV = 'test';
  const { buildCampaignActor } = await import('../../shared/campaignPolicy/policy.ts');
  const { requireDowntimeCreate, requireCampaignMember } = await import('../src/middleware/campaignScope.ts');
  const havens = await import('../src/controllers/downtimeHavenController.ts');
  const projects = await import('../src/controllers/downtimeProjectController.ts');
  const people = await import('../src/controllers/downtimePeopleController.ts');
  const { buildDowntimeHubResponse } = await import('../src/controllers/downtimeHubController.ts');
  const owner = await db.user.create({ data: { email: 'gm@downtime.test' } });
  const player = await db.user.create({ data: { email: 'enve@downtime.test' } });
  const campaign = await db.campaign.create({ data: { name: 'Downtime acceptance', handle: 'downtime-acceptance', campaignOwnerUserId: owner.id } });
  const party = await db.party.create({ data: { campaignId: campaign.id, displayName: 'The archive keepers' } });
  await db.campaignMember.create({ data: { campaignId: campaign.id, userId: player.id, role: 'PARTICIPANT', partyId: party.id } });
  await db.wikiPage.create({ data: { campaignId: campaign.id, title: 'Game', visibility: 'PARTY' } });
  await db.wikiPage.create({ data: { campaignId: campaign.id, title: 'Characters', visibility: 'PARTY', metadata: { systemCategoryKey: 'characters' } } });
  const actor = buildCampaignActor({ kind: 'member', userId: player.id, campaignOwnerUserId: owner.id,
    membershipRole: 'PARTICIPANT', discoverability: 'private', allowPlayerChronologyManagement: false, partyId: party.id });
  const context = { campaignId: campaign.id, campaignHandle: campaign.handle, role: 'PARTICIPANT',
    isMember: true, partyId: party.id, actor };
  const app = express(); app.use(express.json());
  app.use((req, _res, next) => { req.campaign = context; req.user = { id: player.id }; next(); });
  for (const [path, handlers, name] of [['havens', havens, 'Haven'], ['projects', projects, 'Project']]) {
    app.post(`/${path}`, requireDowntimeCreate, handlers[`createDowntime${name}Handler`]);
    app.get(`/${path}/:id`, handlers[`getDowntime${name}Handler`]);
    app.patch(`/${path}/:id`, requireCampaignMember, handlers[`updateDowntime${name}Handler`]);
    app.delete(`/${path}/:id`, requireCampaignMember, handlers[`deleteDowntime${name}Handler`]);
  }
  app.post('/people', requireDowntimeCreate, people.createDowntimePersonHandler);
  app.patch('/people/:id', requireCampaignMember, people.updateDowntimePersonHandler);
  app.get('/people', people.listDowntimePeopleHandler);
  app.get('/hub/:id', (req, res) => buildDowntimeHubResponse(req, res, req.params.id));
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening');
  const port = server.address().port;
  async function request(method, route, body, expected = 200) {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, { method,
      headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await response.text();
    assert.equal(response.status, expected, `${method} ${route}: ${text}`);
    return text ? JSON.parse(text) : null;
  }
  const { haven } = await request('POST', '/havens', { title: 'Enve’s refuge' }, 201);
  await request('PATCH', `/havens/${haven.id}`, { fields: { spaces: [{ id: 'study', label: 'Map room' }], upgrades: [{ id: 'roof', label: 'Restored roof' }] } });
  const { project } = await request('POST', '/projects', { title: 'Restore the archive', fields: { durationTotalMinutes: '1000' } }, 201);
  await request('PATCH', `/projects/${project.id}`, { fields: { durationElapsedMinutes: '100' } });
  const { person } = await request('POST', '/people', { characterName: 'Neris', relationshipType: 'HIRELING', havenId: haven.id }, 201);
  await request('PATCH', `/people/${person.id}`, { notes: 'Charting the coast' });
  const stored = await db.downtimeHaven.findUniqueOrThrow({ where: { id: haven.id }, include: { wikiPage: true } });
  assert.equal(stored.wikiPage.ownerUserId, player.id);
  assert.equal(stored.spaces[0].label, 'Map room'); assert.equal(stored.upgrades[0].label, 'Restored roof');
  assert.equal((await db.downtimeProject.findUniqueOrThrow({ where: { id: project.id } })).durationElapsedMinutes, 100n);
  // Existing IDs are preserved while ownership controls the same endpoints.
  await db.wikiPage.update({ where: { id: haven.wikiPageId }, data: { ownerType: 'PARTY', ownerUserId: null, ownerPartyId: party.id } });
  await request('PATCH', `/havens/${haven.id}`, { title: 'Our refuge' });
  await request('DELETE', `/havens/${haven.id}`, undefined, 403);
  await db.wikiPage.update({ where: { id: project.wikiPageId }, data: { ownerType: 'PARTY', ownerUserId: null, ownerPartyId: party.id } });
  await request('PATCH', `/projects/${project.id}`, { fields: { durationElapsedMinutes: '200' } });
  const downtime = await db.wikiPage.findFirstOrThrow({ where: { campaignId: campaign.id, title: 'Downtime' } });
  const list = await request('GET', '/people');
  const hub = await request('GET', `/hub/${downtime.id}?section=people`);
  assert.deepEqual(hub.people, list); assert.equal(list.people[0].canEdit, true);
  await request('PATCH', `/havens/${haven.id}`, { visibility: 'PUBLIC' }, 403);
  await db.wikiPage.update({ where: { id: haven.wikiPageId }, data: { ownerType: 'USER', ownerUserId: owner.id, ownerPartyId: null } });
  await request('PATCH', `/havens/${haven.id}`, { title: 'Denied' }, 403);
  await request('PATCH', `/people/${person.id}`, { havenId: null, projectId: project.id }, 403);
  await db.wikiPage.update({ where: { id: haven.wikiPageId }, data: { ownerUserId: player.id, visibility: 'GM_ONLY' } });
  await request('GET', `/havens/${haven.id}`, undefined, 404);
  await request('PATCH', `/havens/${haven.id}`, { title: 'Denied' }, 403);
  await request('DELETE', `/havens/${haven.id}`, undefined, 403);
  console.log('PASS: default Player acceptance flow over HTTP with isolated SQLite persistence, including ownership and visibility denials.');
} finally {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (db) await db.$disconnect();
  // Only remove the verified temporary workspace created by this process.
  const resolved = path.resolve(directory);
  assert.ok(resolved.startsWith(path.resolve(cache) + path.sep));
  fs.rmSync(resolved, { recursive: true, force: true });
}
