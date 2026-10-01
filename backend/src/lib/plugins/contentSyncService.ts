import { randomUUID } from 'node:crypto';
import type { Prisma } from '../prismaClient.js';
import { prisma } from '../prisma.js';
import { CoreDomainEvents, dispatchDomainEvent, toWikiPageEventDto } from '../domainEvents/index.js';
import type {
  ContentSyncCollectionDescriptor,
  ContentSyncListResult,
  ContentSyncMutation,
  ContentSyncResource,
} from '../../../../shared/contentSync.js';

const commonWikiFields = [
  { key: 'name', label: 'Name', type: 'text' as const, writable: true, defaultSelected: true },
  { key: 'body', label: 'Narrative body', type: 'markdown' as const, writable: true, defaultSelected: true },
  { key: 'image', label: 'Featured image', type: 'image' as const, writable: false },
  { key: 'metadata', label: 'Structured details', type: 'text' as const, writable: true },
];

const enabled: ContentSyncCollectionDescriptor[] = [
  { key: 'characters', label: 'Characters', resourceKind: 'wiki-page', available: true, preferredRepresentation: 'actor-optional', fields: commonWikiFields, operations: { create: true, update: true, delete: false } },
  { key: 'journal', label: 'Journal', resourceKind: 'journal-publication', available: true, preferredRepresentation: 'journal', fields: [
    { key: 'name', label: 'Title', type: 'text', writable: true, defaultSelected: true },
    { key: 'body', label: 'Content', type: 'markdown', writable: true, defaultSelected: true },
    { key: 'summary', label: 'Summary', type: 'text', writable: true },
    { key: 'publicationType', label: 'Publication type', type: 'enum', writable: true, options: ['notice', 'broadsheet', 'gazette', 'journal_entry'] },
    { key: 'status', label: 'Release status', type: 'enum', writable: false, options: ['draft', 'scheduled', 'released', 'archived'] },
  ], operations: { create: true, update: true, delete: false }, warning: 'Release rules and lifecycle remain authoritative in Esiana.' },
  { key: 'session-notes', label: 'Session Notes', resourceKind: 'wiki-page', available: true, preferredRepresentation: 'journal', fields: [...commonWikiFields, { key: 'session', label: 'Session metadata', type: 'text', writable: true }], operations: { create: true, update: true, delete: false } },
  { key: 'bestiary', label: 'Bestiary', resourceKind: 'wiki-page', available: true, preferredRepresentation: 'journal', fields: commonWikiFields, operations: { create: true, update: true, delete: false } },
  { key: 'locations', label: 'Locations', resourceKind: 'wiki-page', available: true, preferredRepresentation: 'journal', fields: commonWikiFields, operations: { create: true, update: true, delete: false } },
  { key: 'organizations', label: 'Organizations', resourceKind: 'wiki-page', available: true, preferredRepresentation: 'journal', fields: commonWikiFields, operations: { create: true, update: true, delete: false } },
  { key: 'quests', label: 'Quests', resourceKind: 'wiki-page', available: true, preferredRepresentation: 'journal', fields: [...commonWikiFields, { key: 'questStatus', label: 'Quest status', type: 'text', writable: true }], operations: { create: true, update: true, delete: false } },
  { key: 'timeline-events', label: 'Timeline Events', resourceKind: 'calendar-event', available: true, preferredRepresentation: 'journal', fields: [
    { key: 'name', label: 'Name', type: 'text', writable: true, defaultSelected: true },
    { key: 'body', label: 'Description', type: 'markdown', writable: true, defaultSelected: true },
    { key: 'calendarId', label: 'Calendar', type: 'text', writable: true },
    { key: 'categoryId', label: 'Category', type: 'text', writable: true },
    { key: 'targetEpochMinute', label: 'Epoch minute', type: 'number', writable: true },
    { key: 'duration', label: 'Duration', type: 'number', writable: true },
  ], operations: { create: true, update: true, delete: false } },
];

const deferredLabels: Array<[string, string]> = [
  ['ancestries', 'Ancestries'], ['objects', 'Objects'], ['families', 'Families'],
  ['rules-resources', 'Rules/Resources'], ['threads', 'Threads'], ['scenes', 'Scenes'],
  ['havens', 'Havens'], ['projects', 'Projects'], ['pages', 'Pages'], ['maps', 'Maps'],
  ['relations', 'Relations'],
];

export const CONTENT_SYNC_COLLECTIONS: ContentSyncCollectionDescriptor[] = [
  ...enabled,
  ...deferredLabels.map(([key, label]) => ({
    key, label, resourceKind: 'wiki-page' as const, available: false,
    preferredRepresentation: 'journal' as const, fields: commonWikiFields,
    operations: { create: false, update: false, delete: false as const },
    warning: 'Catalogued from Esiana, but synchronization is deferred to a later release.',
  })),
];

export class ContentSyncError extends Error {
  constructor(public readonly code: 'NOT_FOUND' | 'CONFLICT' | 'INVALID', message: string, public readonly current?: ContentSyncResource) { super(message); }
}

function markdownFromBlocks(raw: unknown): string {
  if (!Array.isArray(raw)) return '';
  return raw.filter((b): b is Record<string, unknown> => Boolean(b && typeof b === 'object'))
    .map((block) => {
      const content = block.content;
      return content && typeof content === 'object' && typeof (content as Record<string, unknown>).markdown === 'string'
        ? String((content as Record<string, unknown>).markdown) : '';
    }).filter(Boolean).join('\n\n');
}

function bodyBlock(markdown: string) {
  return [{ id: randomUUID(), type: 'text-tiptap', x: 0, y: 0, w: 3, h: 2, isPrivate: false, visibility: 'DM_Only', content: { markdown } }];
}

function wikiCollection(page: { templateType: string; metadata: unknown }): string | null {
  const metadata = page.metadata && typeof page.metadata === 'object' ? page.metadata as Record<string, unknown> : {};
  if (page.templateType === 'SESSION_NOTE') return 'session-notes';
  if (page.templateType === 'QUEST') return 'quests';
  const category = typeof metadata.entityCategory === 'string' ? metadata.entityCategory : null;
  return ['characters', 'bestiary', 'locations', 'organizations'].includes(category ?? '') ? category : null;
}

function wikiResource(page: any, collection: string): ContentSyncResource {
  const metadata = page.metadata && typeof page.metadata === 'object' ? page.metadata : {};
  return { collection, id: page.id, displayName: page.title, fields: {
    name: page.title, body: markdownFromBlocks(page.blocks), image: page.featuredImage?.displayUrl ?? page.featuredImage?.url ?? null,
    metadata, ...(collection === 'session-notes' ? { session: metadata } : {}),
    ...(collection === 'quests' ? { questStatus: metadata.questStatus ?? null } : {}),
  }, visibility: page.visibility, revision: page.updatedAt.toISOString(), modifiedAt: page.updatedAt.toISOString(), deleted: Boolean(page.deletedAt), operations: { create: true, update: true, delete: false } };
}

function journalResource(row: any): ContentSyncResource {
  return { collection: 'journal', id: row.id, displayName: row.title, fields: { name: row.title, body: row.contentMarkdown ?? '', summary: row.summary, publicationType: row.type, status: row.status }, visibility: row.status === 'released' ? 'Public' : 'DM_Only', revision: row.updatedAt.toISOString(), modifiedAt: row.updatedAt.toISOString(), deleted: false, operations: { create: true, update: true, delete: false } };
}

function eventResource(row: any): ContentSyncResource {
  return { collection: 'timeline-events', id: row.id, displayName: row.title, fields: { name: row.title, body: row.description ?? '', calendarId: row.calendarId, categoryId: row.categoryId, targetEpochMinute: row.targetEpochMinute?.toString() ?? null, duration: row.duration }, visibility: row.visibility, revision: row.updatedAt.toISOString(), modifiedAt: row.updatedAt.toISOString(), deleted: false, operations: { create: true, update: true, delete: false } };
}

async function projectWikiMutation(page: any, eventType: 'create' | 'update', actorUserId?: string): Promise<void> {
  const { upsertWikiPageDocument } = await import('../search/index/searchIndexService.js');
  const { syncWikiLinksForSourcePage } = await import('../wikiLinkService.js');
  await syncWikiLinksForSourcePage(prisma, { campaignId: page.campaignId, sourcePageId: page.id, blocks: page.blocks ?? [], actorUserId, emitEvents: true });
  await upsertWikiPageDocument(prisma, page.campaignId, page.id);
  dispatchDomainEvent({ type: eventType === 'create' ? CoreDomainEvents.WIKI_CREATED : CoreDomainEvents.WIKI_UPDATED, campaignId: page.campaignId, actorId: actorUserId, resourceType: 'wiki_page', resourceId: page.id, payload: toWikiPageEventDto(page) as unknown as Record<string, unknown> });
}

export class ContentSyncService {
  constructor(private readonly campaignId: string) {}
  listCollections() { return CONTENT_SYNC_COLLECTIONS; }

  async list(collection: string, options: { cursor?: string; limit?: number; modifiedSince?: string } = {}): Promise<ContentSyncListResult> {
    const descriptor = CONTENT_SYNC_COLLECTIONS.find((item) => item.key === collection);
    if (!descriptor?.available) throw new ContentSyncError('INVALID', 'Collection is not available for synchronization');
    const limit = Math.min(200, Math.max(1, options.limit ?? 100));
    const modified = options.modifiedSince ? new Date(options.modifiedSince) : null;
    if (modified && Number.isNaN(modified.getTime())) throw new ContentSyncError('INVALID', 'modifiedSince must be an ISO timestamp');
    let resources: ContentSyncResource[];
    if (descriptor.resourceKind === 'wiki-page') {
      const rows = await prisma.wikiPage.findMany({ where: { campaignId: this.campaignId, ...(modified ? { updatedAt: { gt: modified } } : {}) }, include: { featuredImage: { select: { url: true, displayUrl: true } } }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }] });
      resources = rows.filter((row) => wikiCollection(row) === collection).map((row) => wikiResource(row, collection));
    } else if (descriptor.resourceKind === 'journal-publication') {
      const rows = await prisma.journalPublication.findMany({ where: { campaignId: this.campaignId, ...(modified ? { updatedAt: { gt: modified } } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }] });
      resources = rows.map(journalResource);
    } else {
      const rows = await prisma.calendarEvent.findMany({ where: { calendar: { campaignId: this.campaignId }, ...(modified ? { updatedAt: { gt: modified } } : {}) }, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }] });
      resources = rows.map(eventResource);
    }
    const start = options.cursor ? Math.max(0, Number.parseInt(options.cursor, 10) || 0) : 0;
    const page = resources.slice(start, start + limit);
    return { resources: page, nextCursor: start + limit < resources.length ? String(start + limit) : null };
  }

  async get(collection: string, id: string): Promise<ContentSyncResource | null> {
    const descriptor = CONTENT_SYNC_COLLECTIONS.find((item) => item.key === collection && item.available);
    if (!descriptor) return null;
    if (descriptor.resourceKind === 'wiki-page') {
      const row = await prisma.wikiPage.findFirst({ where: { id, campaignId: this.campaignId }, include: { featuredImage: { select: { url: true, displayUrl: true } } } });
      return row && wikiCollection(row) === collection ? wikiResource(row, collection) : null;
    }
    if (descriptor.resourceKind === 'journal-publication') {
      const row = await prisma.journalPublication.findFirst({ where: { id, campaignId: this.campaignId } }); return row ? journalResource(row) : null;
    }
    const row = await prisma.calendarEvent.findFirst({ where: { id, calendar: { campaignId: this.campaignId } } }); return row ? eventResource(row) : null;
  }

  async create(collection: string, mutation: ContentSyncMutation, actorUserId?: string): Promise<ContentSyncResource> {
    const fields = mutation.fields; const name = typeof fields.name === 'string' ? fields.name.trim() : '';
    if (!name || !mutation.clientMutationId) throw new ContentSyncError('INVALID', 'name and clientMutationId are required');
    if (collection === 'journal') {
      const row = await prisma.journalPublication.create({ data: { campaignId: this.campaignId, title: name, summary: typeof fields.summary === 'string' ? fields.summary : null, type: typeof fields.publicationType === 'string' ? fields.publicationType : 'notice', contentMarkdown: typeof fields.body === 'string' ? fields.body : '', createdByUserId: actorUserId ?? null } }); return journalResource(row);
    }
    if (collection === 'timeline-events') {
      const calendarId = typeof fields.calendarId === 'string' ? fields.calendarId : (await prisma.fantasyCalendar.findFirst({ where: { campaignId: this.campaignId, isMasterTime: true }, select: { id: true } }))?.id;
      if (!calendarId || !await prisma.fantasyCalendar.findFirst({ where: { id: calendarId, campaignId: this.campaignId } })) throw new ContentSyncError('INVALID', 'A campaign calendar is required');
      const row = await prisma.calendarEvent.create({ data: { calendarId, title: name, description: typeof fields.body === 'string' ? fields.body : null, duration: typeof fields.duration === 'number' ? Math.max(1, Math.floor(fields.duration)) : 1, targetEpochMinute: fields.targetEpochMinute != null ? BigInt(String(fields.targetEpochMinute)) : null } }); return eventResource(row);
    }
    const descriptor = CONTENT_SYNC_COLLECTIONS.find((item) => item.key === collection && item.available && item.resourceKind === 'wiki-page');
    if (!descriptor) throw new ContentSyncError('INVALID', 'Unsupported collection');
    const supplied = fields.metadata && typeof fields.metadata === 'object' && !Array.isArray(fields.metadata) ? fields.metadata as Record<string, unknown> : {};
    const metadata: Record<string, unknown> = { ...supplied, ...(collection === 'session-notes' ? { isSessionAuthor: true } : { entityCategory: collection }), ...(collection === 'quests' && fields.questStatus ? { questStatus: fields.questStatus } : {}) };
    const row = await prisma.wikiPage.create({ data: { campaignId: this.campaignId, title: name, templateType: collection === 'session-notes' ? 'SESSION_NOTE' : collection === 'quests' ? 'QUEST' : 'DEFAULT', visibility: 'DM_Only', blocks: bodyBlock(typeof fields.body === 'string' ? fields.body : '') as unknown as Prisma.InputJsonValue, metadata: metadata as Prisma.InputJsonValue, createdByUserId: actorUserId ?? null } });
    await projectWikiMutation(row, 'create', actorUserId);
    return wikiResource(row, collection);
  }

  async update(collection: string, id: string, mutation: ContentSyncMutation): Promise<ContentSyncResource> {
    const current = await this.get(collection, id);
    if (!current) throw new ContentSyncError('NOT_FOUND', 'Resource not found');
    if (!mutation.baseRevision || mutation.baseRevision !== current.revision) throw new ContentSyncError('CONFLICT', 'Resource changed since the supplied base revision', current);
    const f = mutation.fields;
    if (collection === 'journal') {
      await prisma.journalPublication.update({ where: { id }, data: { ...(typeof f.name === 'string' ? { title: f.name } : {}), ...(typeof f.body === 'string' ? { contentMarkdown: f.body } : {}), ...(typeof f.summary === 'string' || f.summary === null ? { summary: f.summary } : {}), ...(typeof f.publicationType === 'string' ? { type: f.publicationType } : {}) } });
    } else if (collection === 'timeline-events') {
      await prisma.calendarEvent.update({ where: { id }, data: { ...(typeof f.name === 'string' ? { title: f.name } : {}), ...(typeof f.body === 'string' ? { description: f.body } : {}), ...(typeof f.categoryId === 'string' || f.categoryId === null ? { categoryId: f.categoryId } : {}), ...(f.targetEpochMinute !== undefined ? { targetEpochMinute: f.targetEpochMinute === null ? null : BigInt(String(f.targetEpochMinute)) } : {}), ...(typeof f.duration === 'number' ? { duration: Math.max(1, Math.floor(f.duration)) } : {}) } });
    } else {
      const page = await prisma.wikiPage.findFirstOrThrow({ where: { id, campaignId: this.campaignId } });
      const nextMeta = { ...(page.metadata && typeof page.metadata === 'object' ? page.metadata as Record<string, unknown> : {}), ...(f.metadata && typeof f.metadata === 'object' && !Array.isArray(f.metadata) ? f.metadata as Record<string, unknown> : {}), ...(collection === 'quests' && f.questStatus !== undefined ? { questStatus: f.questStatus } : {}) };
      const updated = await prisma.wikiPage.update({ where: { id }, data: { ...(typeof f.name === 'string' ? { title: f.name } : {}), ...(typeof f.body === 'string' ? { blocks: bodyBlock(f.body) as unknown as Prisma.InputJsonValue } : {}), metadata: nextMeta as Prisma.InputJsonValue } });
      await projectWikiMutation(updated, 'update');
    }
    return (await this.get(collection, id))!;
  }
}
