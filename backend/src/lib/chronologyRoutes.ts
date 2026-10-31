import { prisma } from './prisma.js';
import type { Prisma, ChronologyRoute } from './prismaClient.js';

export function chronologySlug(title: string): string {
  const normalized = title.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/['’]/g, '').replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
  return Array.from(normalized).slice(0, 100).join('').replace(/-$/g, '') || 'untitled';
}

/** Caller holds the campaign row lock. Aliases are never reassigned, even after deletion. */
export async function reserveChronologyRoute(db: Prisma.TransactionClient, campaignId: string,
  entityType: 'events' | 'eras', entityId: string, title: string, knownRoutes?: ChronologyRoute[]) {
  const routes = knownRoutes ?? await db.chronologyRoute.findMany({ where: { campaignId, entityType } });
  const current = routes.find(row => row.entityId === entityId && row.canonical);
  if (current?.title === title) return;
  const base = chronologySlug(title);
  let slug = base, suffix = 2;
  while (routes.some(row => row.slug === slug && row.entityId !== entityId)) slug = `${base}-${suffix++}`;
  await db.chronologyRoute.updateMany({ where: { campaignId, entityType, entityId }, data: { canonical: false } });
  const saved = await db.chronologyRoute.upsert({
    where: { campaignId_entityType_slug: { campaignId, entityType, slug } },
    create: { campaignId, entityType, slug, entityId, title, canonical: true },
    update: { title, canonical: true },
  });
  if (knownRoutes) {
    for (const row of knownRoutes) if (row.entityId === entityId) row.canonical = false;
    const index = knownRoutes.findIndex(row => row.slug === slug);
    if (index >= 0) knownRoutes[index] = saved; else knownRoutes.push(saved);
  }
}

/** Portable, idempotent lazy backfill also covers plugin and generated event writers. */
export async function chronologyRouteMap(campaignId: string, entityType: 'events' | 'eras') {
  const entitiesFor = async (db: Prisma.TransactionClient) => entityType === 'events'
    ? await db.calendarEvent.findMany({ where: { calendar: { campaignId } }, select: { id: true, title: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })
    : (await db.campaignEra.findMany({ where: { campaignId }, select: { id: true, name: true }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }] })).map(row => ({ id: row.id, title: row.name }));
  let [entities, rows] = await Promise.all([entitiesFor(prisma), prisma.chronologyRoute.findMany({ where: { campaignId, entityType } })]);
  const current = new Map(rows.filter(row => row.canonical).map(row => [row.entityId, row]));
  if (entities.some(entity => current.get(entity.id)?.title !== entity.title)) {
    ({ entities, rows } = await prisma.$transaction(async db => {
      await db.campaign.update({ where: { id: campaignId }, data: { updatedAt: new Date() } });
      const entities = await entitiesFor(db);
      const rows = await db.chronologyRoute.findMany({ where: { campaignId, entityType } });
      for (const entity of entities) await reserveChronologyRoute(db, campaignId, entityType, entity.id, entity.title, rows);
      return { entities, rows };
    }, { timeout: 30_000 }));
  }
  const byId = new Map<string, { slug: string; slugAliases: string[] }>();
  for (const row of rows) {
    const route = byId.get(row.entityId) ?? { slug: '', slugAliases: [] };
    if (row.canonical) route.slug = row.slug;
    route.slugAliases.push(row.slug); byId.set(row.entityId, route);
  }
  return byId;
}
