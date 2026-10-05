import { randomUUID } from 'node:crypto';
import { preserveHistoricalEraOccurrences } from './eraOccurrenceHistory.js';
import { prisma } from './prisma.js';
import type { CampaignEra, FantasyCalendar, Prisma } from './prismaClient.js';
import type { CampaignContext } from '../types/api.js';
import type { ChronologyEra, EraDate, EraDeletionImpact, EraInput } from '../../../shared/chronologyEras.js';
import { parseCampaignMomentumState } from '../../../shared/factionMomentumMetadata.js';
import { calendarEpochMinuteForDate, convertEpochToCalendarState, getMonthsForYear, parseMonths, parseLeapRules } from './timeEngine.js';
import { extractDescriptionMarkdown, hydrateEventLoreBlocks } from './eventLoreWiki.js';
import { chronologyCanManage, chronologyCanView, chronologyElevated } from './chronologyAccess.js';
import { upsertWikiPageDocument, deleteDocumentsForPages } from './search/index/searchIndexService.js';
import { canViewWikiPage } from './wikiTree.js';
import { assignPathKeyForNewPage, loadCampaignWikiPathKeyRows } from './wikiPathKeyService.js';
import { syncWikiLinksForSourcePage } from './wikiLinkService.js';

const DAY = 1440n;
type Db = Prisma.TransactionClient;
export class EraError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const json = (value: unknown) => value as Prisma.InputJsonValue;
const wikiVisibility = (visibility: string) => visibility === 'DM_ONLY' ? 'DM_Only' : visibility === 'PUBLIC' ? 'Public' : 'Party';

export function eraDateToMinute(calendar: FantasyCalendar, value: unknown): bigint | null {
  if (value == null) return null;
  const date = value as EraDate;
  if (!Number.isInteger(date.year) || date.year < 1 || date.year > 10000
    || !Number.isInteger(date.month) || !Number.isInteger(date.day)) {
    throw new EraError('Choose a valid campaign-calendar date (year 1–10000).');
  }
  const months = getMonthsForYear(date.year, parseMonths(calendar.months), parseLeapRules(calendar.leapDays));
  const month = months[date.month];
  if (!month) throw new EraError('Choose a month in this calendar.');
  if (date.day < 1 || date.day > month.length) throw new EraError(`${month.name} has ${month.length} days.`);
  return calendarEpochMinuteForDate(calendar, date.year, date.month, date.day);
}
function dateFor(calendar: FantasyCalendar, minute: bigint | null): EraDate | null {
  if (minute == null) return null;
  const date = convertEpochToCalendarState(minute, calendar);
  return { year: date.year, month: date.monthIndex, day: date.day };
}
export function eraMatchesMinute(era: Pick<CampaignEra, 'epochStartMinute' | 'epochEndMinute'>, minute: bigint): boolean {
  return (era.epochStartMinute == null || minute >= era.epochStartMinute)
    && (era.epochEndMinute == null || minute < era.epochEndMinute);
}
export async function createEraOverview(db: Db, campaignId: string, name: string, visibility: string, overview: string, userId?: string) {
  let parent = await db.wikiPage.findFirst({ where: { campaignId, title: 'Timelines', deletedAt: null } });
  if (!parent) {
    const game = await db.wikiPage.findFirst({ where: { campaignId, title: 'Game', deletedAt: null } })
      ?? await db.wikiPage.create({ data: { campaignId, title: 'Game', visibility: 'Party' } });
    parent = await db.wikiPage.create({ data: { campaignId, title: 'Timelines', visibility: 'Party', parentId: game.id } });
  }
  const pageId = randomUUID();
  const routing = await assignPathKeyForNewPage(campaignId, { id: pageId, title: name, parentId: parent.id, templateType: 'DEFAULT', metadata: { eraOverview: true } }, await loadCampaignWikiPathKeyRows(campaignId, db), db);
  const page = await db.wikiPage.create({ data: {
    id: pageId, ...routing, campaignId, title: name, parentId: parent.id,
    visibility: wikiVisibility(visibility), createdByUserId: userId,
    blocks: json(hydrateEventLoreBlocks([], overview).map(block => ({ ...block, title: 'Overview' }))),
    metadata: { eraOverview: true },
  } });
  await upsertWikiPageDocument(db, campaignId, page.id);
  await syncWikiLinksForSourcePage(db, { campaignId, sourcePageId: page.id, blocks: page.blocks as Array<Record<string, unknown>>, emitEvents: false });
  return page;
}

/** Idempotent portable backfill. The momentum row serializes migration and subsequent mutations. */
export async function ensureChronologyEras(campaignId: string, tx?: Db): Promise<void> {
  const migrate = async (db: Db) => {
    const row = await db.campaignMomentum.upsert({ where: { campaignId }, update: {}, create: { campaignId } });
    if (row.erasMigrated) return;
    const calendar = await db.fantasyCalendar.findFirst({ where: { campaignId }, orderBy: [{ isMasterTime: 'desc' }, { createdAt: 'asc' }] });
    if (!calendar) return;
    const claimed = await db.campaignMomentum.updateMany({ where: { campaignId, erasMigrated: false }, data: { erasMigrated: true } });
    if (!claimed.count) return;
    for (const era of parseCampaignMomentumState(row.state).eras) {
      const overview = await createEraOverview(db, campaignId, era.name, 'PARTY', era.narrativeNote ?? '');
      await db.campaignEra.create({ data: {
        campaignId, id: era.id, calendarId: calendar.id, name: era.name, sortOrder: era.sortOrder,
        isCurrent: era.isCurrent, overviewPageId: overview.id,
        epochStartMinute: era.epochStartMinute == null ? null : BigInt(era.epochStartMinute),
        epochEndMinute: era.epochEndMinute == null ? null : BigInt(era.epochEndMinute),
      } });
    }
    await syncEraProjection(db, campaignId);
  };
  if (tx) await migrate(tx); else await prisma.$transaction(migrate);
}

/** Compatibility projection only; canonical era writes go through this service. */
export async function syncEraProjection(db: Db, campaignId: string) {
  const [row, eras] = await Promise.all([
    db.campaignMomentum.findUniqueOrThrow({ where: { campaignId } }),
    db.campaignEra.findMany({ where: { campaignId }, orderBy: [{ calendarId: 'asc' }, { sortOrder: 'asc' }], include: { calendar: true } }),
  ]);
  const state = row.state as Record<string, unknown>;
  await db.campaignMomentum.update({ where: { campaignId }, data: { state: json({ ...state, chronologyOwned: true, eras: eras.map(era => ({
    id: era.id, calendarId: era.calendarId, calendarName: era.calendar.name, isMasterTime: era.calendar.isMasterTime,
    name: era.name, sortOrder: era.sortOrder, isCurrent: era.isCurrent, visibility: era.visibility,
    epochStartMinute: era.epochStartMinute?.toString() ?? null, epochEndMinute: era.epochEndMinute?.toString() ?? null,
    narrativeNote: null,
  })) }) } });
}

export async function listChronologyEras(ctx: CampaignContext): Promise<ChronologyEra[]> {
  await ensureChronologyEras(ctx.campaignId);
  const [eras, campaign] = await Promise.all([
    prisma.campaignEra.findMany({ where: { campaignId: ctx.campaignId }, include: { calendar: true, overview: true }, orderBy: [{ calendarId: 'asc' }, { sortOrder: 'asc' }] }),
    prisma.campaign.findUniqueOrThrow({ where: { id: ctx.campaignId }, select: { currentEpochMinute: true } }),
  ]);
  const visibleOrder = new Map<string, number>();
  return eras.filter(era => chronologyCanView(ctx, era.visibility)).map(era => ({
    id: era.id, name: era.name, calendarId: era.calendarId, calendarName: era.calendar.name, isMasterTime: era.calendar.isMasterTime,
    sortOrder: (() => { const order = visibleOrder.get(era.calendarId) ?? 0; visibleOrder.set(era.calendarId, order + 1); return order; })(), isCurrent: era.isCurrent,
    startDate: dateFor(era.calendar, era.epochStartMinute),
    endDate: dateFor(era.calendar, era.epochEndMinute == null ? null : era.epochEndMinute - 1n),
    status: era.epochStartMinute != null && era.epochStartMinute > campaign.currentEpochMinute ? 'FUTURE'
      : era.epochEndMinute != null && era.epochEndMinute <= campaign.currentEpochMinute ? 'PAST' : 'PRESENT',
    visibility: era.visibility as ChronologyEra['visibility'], overviewPageId: era.overviewPageId,
    overview: extractDescriptionMarkdown(era.overview.blocks) ?? '', canManage: chronologyCanManage(ctx),
  }));
}

function requireManager(ctx: CampaignContext) {
  if (!chronologyCanManage(ctx)) throw new EraError('Chronology management is not permitted.', 403);
}
async function accessibleEra(db: Db, ctx: CampaignContext, id: string) {
  const era = await db.campaignEra.findUnique({ where: { campaignId_id: { campaignId: ctx.campaignId, id } }, include: { calendar: true, overview: true } });
  if (!era || !chronologyCanView(ctx, era.visibility)) throw new EraError('Era not found.', 404);
  return era;
}
async function lock(db: Db, campaignId: string) {
  await db.campaignMomentum.update({ where: { campaignId }, data: { updatedAt: new Date() } });
  await preserveHistoricalEraOccurrences(db, campaignId);
}

export async function saveChronologyEra(ctx: CampaignContext, input: EraInput, userId?: string, id?: string) {
  requireManager(ctx);
  await ensureChronologyEras(ctx.campaignId);
  return prisma.$transaction(async db => {
    await lock(db, ctx.campaignId);
    const existing = id ? await accessibleEra(db, ctx, id) : null;
    const calendar = await db.fantasyCalendar.findFirst({ where: { id: input.calendarId, campaignId: ctx.campaignId } });
    if (!calendar) throw new EraError('Choose a timeline in this campaign.');
    if (existing && existing.calendarId !== calendar.id) throw new EraError('An existing era stays on its timeline.');
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    if (!name || name.length > 120) throw new EraError('Enter an era name of 1–120 characters.');
    if (!['PUBLIC', 'PARTY', 'DM_ONLY'].includes(input.visibility)) throw new EraError('Choose a valid visibility.');
    if (input.visibility === 'DM_ONLY' && !chronologyElevated(ctx)) throw new EraError('DM-only content requires elevated narrative access.', 403);
    const start = eraDateToMinute(calendar, input.startDate);
    const lastDay = eraDateToMinute(calendar, input.endDate);
    const end = lastDay == null ? null : lastDay + DAY;
    if (start != null && end != null && start >= end) throw new EraError('End date must be on or after the start date.');
    if (typeof input.isCurrent !== 'boolean') throw new EraError('Choose whether this era is current.');
    if (input.overview != null && typeof input.overview !== 'string') throw new EraError('Overview must be text.');
    // Setting current must not silently mutate a hidden current era.
    if (input.isCurrent) {
      const current = await db.campaignEra.findFirst({ where: { campaignId: ctx.campaignId, calendarId: calendar.id, isCurrent: true } });
      if (current && !chronologyCanView(ctx, current.visibility)) throw new EraError('The current era cannot be changed with your access.', 403);
      await db.campaignEra.updateMany({ where: { campaignId: ctx.campaignId, calendarId: calendar.id, isCurrent: true }, data: { isCurrent: false } });
    }
    const page = existing?.overview ?? await createEraOverview(db, ctx.campaignId, name, input.visibility, input.overview ?? '', userId);
    const savedPage = await db.wikiPage.update({ where: { id: page.id }, data: {
      title: name, visibility: wikiVisibility(input.visibility),
      ...(input.overview !== undefined ? { blocks: json(hydrateEventLoreBlocks(page.blocks, input.overview).map(block => ({ ...block, title: 'Overview' }))) } : {}),
    } });
    const data = { name, calendarId: calendar.id, isCurrent: input.isCurrent, visibility: input.visibility,
      epochStartMinute: start, epochEndMinute: end, updatedByUserId: userId };
    const era = existing
      ? await db.campaignEra.update({ where: { campaignId_id: { campaignId: ctx.campaignId, id: existing.id } }, data })
      : await db.campaignEra.create({ data: { ...data, id: randomUUID(), campaignId: ctx.campaignId,
          sortOrder: ((await db.campaignEra.aggregate({ where: { campaignId: ctx.campaignId, calendarId: calendar.id }, _max: { sortOrder: true } }))._max.sortOrder ?? -1) + 1,
          overviewPageId: page.id, createdByUserId: userId } });
    await syncEraProjection(db, ctx.campaignId);
    await upsertWikiPageDocument(db, ctx.campaignId, page.id);
    await syncWikiLinksForSourcePage(db, { campaignId: ctx.campaignId, sourcePageId: page.id, blocks: savedPage.blocks as Array<Record<string, unknown>>, emitEvents: false });
    return era.id;
  });
}

export async function reorderChronologyEras(ctx: CampaignContext, calendarId: string, ids: string[]) {
  requireManager(ctx);
  if (typeof calendarId !== 'string' || !calendarId) throw new EraError('Choose a timeline.');
  await ensureChronologyEras(ctx.campaignId);
  await prisma.$transaction(async db => {
    await lock(db, ctx.campaignId);
    const all = await db.campaignEra.findMany({ where: { campaignId: ctx.campaignId, calendarId }, orderBy: { sortOrder: 'asc' } });
    const visible = all.filter(era => chronologyCanView(ctx, era.visibility));
    if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length !== visible.length || ids.some(id => !visible.some(era => era.id === id))) {
      throw new EraError('Reload the eras before reordering.');
    }
    // Hidden eras retain their slots; clients never need their IDs or positions.
    let next = 0;
    const reordered = all.map(era => chronologyCanView(ctx, era.visibility) ? ids[next++]! : era.id);
    for (const [sortOrder, id] of reordered.entries()) await db.campaignEra.update({ where: { campaignId_id: { campaignId: ctx.campaignId, id } }, data: { sortOrder } });
    await syncEraProjection(db, ctx.campaignId);
  });
}

function visitTrajectories(value: unknown, eraId: string, snapshot?: { id: string; name: string; calendarName: string; visibility: string }): { value: unknown; count: number } {
  if (!value || typeof value !== 'object') return { value, count: 0 };
  if (Array.isArray(value)) {
    const items = value.map(item => visitTrajectories(item, eraId, snapshot));
    return { value: items.map(item => item.value), count: items.reduce((n, item) => n + item.count, 0) };
  }
  const object = { ...value as Record<string, unknown> };
  let count = 0;
  const matches = object.eraId === eraId || object.byEraId === eraId;
  if (matches) {
    count++;
    if (snapshot) for (const key of ['eraId', 'byEraId']) if (object[key] === eraId) {
      object[key] = null;
      object[key === 'eraId' ? 'eraSnapshot' : 'byEraSnapshot'] = snapshot;
    }
  }
  for (const [key, child] of Object.entries(object)) {
    const result = visitTrajectories(child, eraId, snapshot);
    object[key] = result.value; count += result.count;
  }
  return { value: object, count };
}
async function impact(db: Db, ctx: CampaignContext, id: string): Promise<EraDeletionImpact> {
  const era = await accessibleEra(db, ctx, id);
  const [events, pages] = await Promise.all([
    db.calendarEvent.findMany({ where: { calendarId: era.calendarId } }),
    db.wikiPage.findMany({ where: { campaignId: ctx.campaignId }, select: { metadata: true, visibility: true } }),
  ]);
  return {
    events: events.filter(event => {
      const minute = event.targetEpochMinute ?? (event.targetYear != null && event.targetMonth != null && event.targetDay != null
        ? calendarEpochMinuteForDate(era.calendar, event.targetYear, event.targetMonth, event.targetDay) : null);
      return minute != null && eraMatchesMinute(era, minute) && chronologyCanView(ctx, event.visibility);
    }).length,
    trajectories: pages.filter(page => canViewWikiPage(page.visibility, ctx.role)).reduce((n, page) => n + visitTrajectories(page.metadata, id).count, 0),
    recurringRules: events.filter(event => event.repeatUnit === 'ERAS' && chronologyCanView(ctx, event.visibility)).length,
    overviewWords: (extractDescriptionMarkdown(era.overview.blocks) ?? '').trim().split(/\s+/).filter(Boolean).length,
  };
}
export async function chronologyEraImpact(ctx: CampaignContext, id: string) {
  requireManager(ctx);
  return impact(prisma, ctx, id);
}
export async function deleteChronologyEra(ctx: CampaignContext, id: string) {
  requireManager(ctx);
  await prisma.$transaction(async db => {
    await lock(db, ctx.campaignId);
    const era = await accessibleEra(db, ctx, id);
    const pages = await db.wikiPage.findMany({ where: { campaignId: ctx.campaignId }, select: { id: true, metadata: true } });
    for (const page of pages) {
      const detached = visitTrajectories(page.metadata, id, { id, name: era.name, calendarName: era.calendar.name, visibility: era.visibility });
      if (detached.count) await db.wikiPage.update({ where: { id: page.id }, data: { metadata: json(detached.value) } });
    }
    await db.campaignEra.delete({ where: { campaignId_id: { campaignId: ctx.campaignId, id } } });
    await deleteDocumentsForPages(db, [era.overviewPageId]);
    await db.wikiPage.delete({ where: { id: era.overviewPageId } });
    const remaining = await db.campaignEra.findMany({ where: { campaignId: ctx.campaignId, calendarId: era.calendarId }, orderBy: { sortOrder: 'asc' } });
    for (const [sortOrder, row] of remaining.entries()) await db.campaignEra.update({ where: { campaignId_id: { campaignId: ctx.campaignId, id: row.id } }, data: { sortOrder } });
    await syncEraProjection(db, ctx.campaignId);
  });
}
