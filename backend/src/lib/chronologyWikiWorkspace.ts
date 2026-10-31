import type { Prisma } from './prismaClient.js';
import { prisma } from './prisma.js';
import { CampaignWorkspace } from '../../../shared/campaignWorkspace.js';
import { chronologyWikiDocumentKind, resolveWorkspaceForPage } from '../../../shared/wikiWorkspaceResolve.js';
import { assignPathKeyForNewPage, loadCampaignWikiPathKeyRows } from './wikiPathKeyService.js';
import { upsertWikiPageDocument } from './search/index/searchIndexService.js';

type Db = Prisma.TransactionClient;
type Kind = 'event' | 'era';
const definitions = {
  event: { workspace: CampaignWorkspace.EVENTS, title: 'Events', key: 'chronology_events' },
  era: { workspace: CampaignWorkspace.ERAS, title: 'Eras', key: 'chronology_eras' },
} as const;
const metadataOf = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

export class ChronologyWorkspaceError extends Error { status = 409; }

/** Reuses system-category metadata, the wiki tree and normal path-key allocation. */
export async function ownChronologyWikiPage(db: Db, campaignId: string, kind: Kind, pageId: string) {
  await db.campaign.update({ where: { id: campaignId }, data: { updatedAt: new Date() } });
  const pages = await loadCampaignWikiPathKeyRows(campaignId, db);
  const page = pages.find(row => row.id === pageId);
  if (!page) return;
  const definition = definitions[kind];
  const existingKind = chronologyWikiDocumentKind(page);
  if (existingKind && existingKind !== kind) throw new ChronologyWorkspaceError('This document belongs to another chronology workspace.');
  if (metadataOf(page.metadata).systemCategoryKey) {
    throw new ChronologyWorkspaceError('Choose an authored document, not a system folder.');
  }
  let root = pages.find(row => metadataOf(row.metadata).systemCategoryKey === definition.key)
    ?? pages.find(row => row.id !== pageId && row.title === definition.title && !chronologyWikiDocumentKind(row) && !metadataOf(row.metadata).systemCategoryKey);
  if (!root) {
    root = await db.wikiPage.create({ data: { campaignId, title: definition.title,
      parentId: pages.find(row => row.title === 'Game' && !row.parentId)?.id ?? null,
      visibility: 'Public', metadata: { systemCategoryKey: definition.key } }, select: { id: true, title: true, parentId: true, templateType: true, metadata: true } });
  } else if (metadataOf(root.metadata).systemCategoryKey !== definition.key) {
    await db.wikiPage.update({ where: { id: root.id }, data: { metadata: { ...metadataOf(root.metadata), systemCategoryKey: definition.key } as Prisma.InputJsonValue } });
  }
  const previousMetadata = metadataOf(page.metadata);
  const aliases = Array.isArray(previousMetadata.wikiRouteAliases) ? previousMetadata.wikiRouteAliases : [];
  const metadata = { ...previousMetadata, chronologyDocument: kind,
    ...(page.workspace && page.pathKey && page.workspace !== definition.workspace
      ? { wikiRouteAliases: [...aliases, { workspace: page.workspace, pathKey: page.pathKey }] } : {}),
  };
  const parent = pages.find(row => row.id === page.parentId);
  const parentId = parent && (parent.id === root.id || resolveWorkspaceForPage(parent, pages) === definition.workspace) ? parent.id : root.id;
  const routing = page.workspace === definition.workspace && page.pathKey
    ? { workspace: definition.workspace, pathKey: page.pathKey }
    : await assignPathKeyForNewPage(campaignId, { ...page, parentId, metadata }, pages, db);
  if (page.parentId === parentId && metadataOf(page.metadata).chronologyDocument === kind
    && page.workspace === routing.workspace && page.pathKey === routing.pathKey) return;
  await db.wikiPage.update({ where: { id: page.id }, data: { ...routing, parentId, metadata: metadata as Prisma.InputJsonValue } });
  await upsertWikiPageDocument(db, campaignId, page.id);
}

async function ownershipCandidates(db: Db, campaignId: string) {
  const [pages, events, eras] = await Promise.all([
    loadCampaignWikiPathKeyRows(campaignId, db),
    db.calendarEvent.findMany({ where: { calendar: { campaignId }, wikiPageId: { not: null } }, select: { wikiPageId: true } }),
    db.campaignEra.findMany({ where: { campaignId, overviewPageId: { not: null } }, select: { overviewPageId: true } }),
  ]);
  const eventIds = new Set(events.map(row => row.wikiPageId));
  const eraIds = new Set(eras.map(row => row.overviewPageId));
  const byId = new Map(pages.map(page => [page.id, page]));
  const inheritedKind = (id: string): Kind | null => {
    const seen = new Set<string>();
    let parent = byId.get(id)?.parentId;
    while (parent && !seen.has(parent)) {
      seen.add(parent);
      const row = byId.get(parent);
      if (!row) break;
      const kind = chronologyWikiDocumentKind(row) ?? (eventIds.has(row.id) ? 'event' : eraIds.has(row.id) ? 'era' : null);
      if (kind) return kind;
      parent = row.parentId;
    }
    return null;
  };
  const candidates = pages.flatMap(page => {
    const workspace = resolveWorkspaceForPage(page, pages);
    const kind = chronologyWikiDocumentKind(page) ?? (eventIds.has(page.id) ? 'event' : eraIds.has(page.id) ? 'era' : null)
      ?? (workspace === CampaignWorkspace.EVENTS ? 'event' : workspace === CampaignWorkspace.ERAS ? 'era' : inheritedKind(page.id));
    if (!kind) return [];
    const definition = definitions[kind];
    const root = pages.find(row => metadataOf(row.metadata).systemCategoryKey === definition.key);
    let parent = page.parentId;
    const visited = new Set<string>();
    while (parent && parent !== root?.id && !visited.has(parent)) { visited.add(parent); parent = byId.get(parent)?.parentId ?? null; }
    return root && parent === root.id && page.workspace === definition.workspace && page.pathKey
      && metadataOf(page.metadata).chronologyDocument === kind ? [] : [{ id: page.id, kind }];
  });
  const depth = (id: string) => {
    const seen = new Set<string>();
    let parent = byId.get(id)?.parentId;
    while (parent && !seen.has(parent)) { seen.add(parent); parent = byId.get(parent)?.parentId; }
    return seen.size;
  };
  return candidates.sort((a, b) => depth(a.id) - depth(b.id));
}

/** Portable idempotent data migration. Never creates documents for chronology-only records. */
export async function ensureChronologyWikiWorkspaces(campaignId: string) {
  if (!(await ownershipCandidates(prisma, campaignId)).length) return;
  await prisma.$transaction(async db => {
    await db.campaign.update({ where: { id: campaignId }, data: { updatedAt: new Date() } });
    for (const page of await ownershipCandidates(db, campaignId)) await ownChronologyWikiPage(db, campaignId, page.kind, page.id);
  }, { timeout: 30_000 });
}
