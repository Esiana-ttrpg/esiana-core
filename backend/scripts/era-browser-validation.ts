import assert from 'node:assert/strict';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { chromium } from 'playwright';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

// Load config before Prisma, then pin every database setting to the disposable runner.
const fixtureUrl = process.env.CHRONOLOGY_ERA_TEST_DATABASE_URL;
if (!fixtureUrl || !fixtureUrl.includes('/era_validation')) throw new Error('Run through validate-chronology-postgres.mjs --browser');
const { env } = await import('../src/config/env.js');
process.env.DATABASE_URL = fixtureUrl;
process.env.DATABASE_PROVIDER = 'postgresql';
process.env.NODE_ENV = 'test';
Object.assign(env, { databaseUrl: fixtureUrl, databaseProvider: 'postgresql', nodeEnv: 'test' });
const { prisma } = await import('../src/lib/prisma.js');
const { buildCampaignContext } = await import('../src/lib/campaignScopeContext.js');
const handlers = await import('../src/controllers/chronologyErasController.js');
const { ensureChronologyEras } = await import('../src/lib/chronologyEraService.js');
const owner = await prisma.user.create({ data: { email: `browser-${Date.now()}@example.test`, passwordHash: 'fixture' } });
const campaign = await prisma.campaign.create({ data: { name: 'Browser chronology', handle: `browser-${Date.now()}`, campaignOwnerUserId: owner.id } });
const calendar = await prisma.fantasyCalendar.create({ data: { campaignId: campaign.id, name: 'World history', isMasterTime: true, months: [{ name: 'Deepwinter', length: 30, type: 'standard' }], weekdays: [{ name: 'Dawn', length: 1 }], leapDays: [], moons: [], seasons: [] } });
await ensureChronologyEras(campaign.id);
const contexts = Object.fromEntries(await Promise.all(['GAMEMASTER', 'PARTICIPANT', 'OBSERVER'].map(async role => [role, await buildCampaignContext({ campaignId: campaign.id, campaignHandle: campaign.handle, campaignOwnerUserId: owner.id, discoverability: 'PRIVATE', userId: role === 'GAMEMASTER' ? owner.id : role, membershipRole: role as any, allowPlayerChronologyManagement: true, chronologyContributor: false, partyId: null })])));
const app = express();
app.use(express.json());
// Only authentication/context is a fixture. Requests use production handlers, authorization and PostgreSQL.
app.use((req: any, _res, next) => { const role = req.headers.cookie?.match(/eraRole=([^;]+)/)?.[1] ?? 'GAMEMASTER'; req.campaign = contexts[role]; req.user = { id: owner.id }; next(); });
app.get('/fixture', (_req, res) => res.json({ campaignHandle: campaign.handle, calendar: { ...calendar, epochOffset: '0', state: { year: 1, monthIndex: 0, day: 1, hour: 0, minute: 0 } } }));
const base = '/api/campaigns/:campaignHandle/chronology/eras';
app.get(base, handlers.listEras as any); app.post(base, handlers.createEra as any);
app.put(`${base}/order`, handlers.reorderEras as any);
app.put(`${base}/:eraId`, handlers.updateEra as any);
app.get(`${base}/:eraId/impact`, handlers.eraImpact as any);
app.delete(`${base}/:eraId`, handlers.deleteEra as any);
const server = app.listen(0, '127.0.0.1');
await new Promise<void>(resolve => server.once('listening', resolve));
const port = (server.address() as any).port;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../frontend');
const vite = await createServer({ configFile: false, root, optimizeDeps: { entries: ['e2e/eras.html'] }, plugins: [{ name: 'shared-typescript', enforce: 'pre', resolveId(source, importer) {
  if (importer && source.startsWith('.') && source.endsWith('.js') && /[\\/]shared[\\/]/.test(importer)) {
    const file = path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts')); if (existsSync(file)) return file;
  }
}, transform(code, id) {
  if (/[\\/]shared[\\/].*\.ts$/.test(id)) {
    return code.replace(/(from\s+['"]\.\.?\/[^'"]+)\.js(['"])/g, '$1.ts$2');
  }
} }, react()], resolve: { alias: { '@/contexts/WikiContext': path.join(root, 'e2e/era-wiki-context.ts'), '@': path.join(root, 'src'), '@shared': path.resolve(root, '../shared') } }, server: { host: '127.0.0.1', port: 0, proxy: { '/api': `http://127.0.0.1:${port}`, '/fixture': `http://127.0.0.1:${port}` } } });
await vite.listen();
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const errors: string[] = [];
  page.on('pageerror', error => { errors.push(error.message); console.error('Browser error:', error.message); });
  const url = `${vite.resolvedUrls!.local[0]}e2e/eras.html`;
  await page.goto(url);
  await page.getByRole('button', { name: '+ Add era' }).waitFor();
  async function create(name: string, visibility = 'PARTY') {
    await page.getByRole('button', { name: '+ Add era' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add era' });
    await dialog.getByLabel('Name', { exact: true }).fill(name);
    await dialog.getByLabel('Visibility', { exact: true }).selectOption(visibility);
    await dialog.locator('[contenteditable=true]').fill('Our shared discovery.');
    await dialog.getByRole('button', { name: 'Save era', exact: true }).click();
    await page.getByRole('heading', { name, exact: true }).waitFor();
  }
  await create('Age of Embers');
  await page.getByRole('button', { name: 'Edit era', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Name', { exact: true }).fill('Age of Discovery');
  await page.getByRole('dialog').getByRole('button', { name: 'Save era', exact: true }).click();
  await page.getByRole('heading', { name: 'Age of Discovery', exact: true }).waitFor();
  await create('Unnumbered future', 'DM_ONLY');
  await page.getByRole('button', { name: 'Move earlier' }).click();
  await page.waitForFunction(() => Array.from(document.querySelectorAll('label')).find(label => label.textContent?.startsWith('Era '))?.querySelectorAll('option')[2]?.textContent?.includes('Unnumbered future'));
  await page.context().addCookies([{ name: 'eraRole', value: 'PARTICIPANT', url }]);
  await page.reload();
  await page.getByRole('button', { name: '+ Add era' }).waitFor();
  assert.equal(await page.getByRole('option', { name: /Unnumbered future/ }).count(), 0);
  await create('Player discovery');
  await page.context().addCookies([{ name: 'eraRole', value: 'OBSERVER', url }]);
  await page.reload(); await page.getByLabel('Search events').waitFor();
  assert.equal(await page.getByRole('button', { name: '+ Add era' }).count(), 0);
  await page.context().addCookies([{ name: 'eraRole', value: 'GAMEMASTER', url }]);
  await page.reload(); await page.getByRole('button', { name: '+ Add era' }).waitFor();
  await page.getByRole('button', { name: 'Delete era…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete era', exact: true });
  await dialog.getByRole('button', { name: 'Delete era and Overview' }).click();
  await dialog.waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('option', { name: 'Player discovery', exact: true }).count(), 0);
  assert.equal(/epoch|epoch minute/i.test(await page.locator('body').innerText()), false);
  assert.deepEqual(errors, []);
  console.log('Browser E2E passed: rich-text create, edit, reorder, DM disclosure, player creation, observer denial, confirmed delete.');
} finally {
  await browser.close(); await vite.close(); server.close();
  await prisma.campaignEra.deleteMany({ where: { campaignId: campaign.id } });
  await prisma.campaign.delete({ where: { id: campaign.id } });
  await prisma.user.delete({ where: { id: owner.id } });
  await prisma.$disconnect();
}
