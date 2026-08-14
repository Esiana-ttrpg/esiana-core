import { prisma } from './prisma.js';
import {
  ALL_PAGE_NARRATIVE_STATUSES,
  normalizePageNarrativeStatus,
  PageNarrativeStatuses,
  type PageNarrativeStatusValue,
  projectPageNarrativeStatus,
  resolvePageNarrativeStatus,
} from '../../../shared/pageNarrativeStatus.js';
import type { NarrativeViewerContext } from '../../../shared/narrativeProjection.js';
import {
  parseCharacterMetadata,
  resolveCharacterStatus,
} from './characterMetadata.js';
import { readEntityCategoryFromMetadata, buildEntityCategoryWhereClause } from './wikiCategoryEntityIndex.js';
import { parseCharacterLineageMetadata } from './characterLineageMetadata.js';

export type StoredPageNarrativeStatus = {
  wikiPageId: string;
  status: PageNarrativeStatusValue;
  reason: string | null;
};

function toStoredStatus(row: {
  wikiPageId: string;
  status: string;
  reason: string | null;
}): StoredPageNarrativeStatus {
  return {
    wikiPageId: row.wikiPageId,
    status: row.status as PageNarrativeStatusValue,
    reason: row.reason,
  };
}

export async function getPageNarrativeStatusMap(
  campaignId: string,
  pageIds: readonly string[],
): Promise<Map<string, StoredPageNarrativeStatus>> {
  if (pageIds.length === 0) return new Map();
  const rows = await prisma.pageNarrativeStatus.findMany({
    where: { campaignId, wikiPageId: { in: [...pageIds] } },
    select: { wikiPageId: true, status: true, reason: true },
  });
  const map = new Map<string, StoredPageNarrativeStatus>();
  for (const row of rows) {
    map.set(row.wikiPageId, toStoredStatus(row));
  }
  return map;
}

export async function getPageNarrativeStatus(
  campaignId: string,
  wikiPageId: string,
): Promise<StoredPageNarrativeStatus | null> {
  const row = await prisma.pageNarrativeStatus.findUnique({
    where: { wikiPageId },
    select: { wikiPageId: true, status: true, reason: true, campaignId: true },
  });
  if (!row || row.campaignId !== campaignId) return null;
  return toStoredStatus(row);
}

function resolveCharacterFallbackForPage(
  metadata: unknown,
): PageNarrativeStatusValue | null {
  if (readEntityCategoryFromMetadata(metadata) !== 'characters') return null;
  const identity = parseCharacterMetadata(metadata);
  const lineage = parseCharacterLineageMetadata(metadata);
  const lifeStatus = resolveCharacterStatus(identity, lineage);
  return resolvePageNarrativeStatus({ characterLifeStatus: lifeStatus });
}

export function resolveEffectivePageNarrativeStatus(input: {
  stored?: StoredPageNarrativeStatus | null;
  metadata?: unknown;
}): PageNarrativeStatusValue {
  if (input.stored) return input.stored.status;
  const fallback =
    input.metadata != null
      ? resolveCharacterFallbackForPage(input.metadata)
      : null;
  return fallback ?? PageNarrativeStatuses.ACTIVE;
}

export function projectStoredPageNarrativeStatus(
  stored: StoredPageNarrativeStatus | null | undefined,
  ctx: NarrativeViewerContext,
  fallback?: PageNarrativeStatusValue,
): ReturnType<typeof projectPageNarrativeStatus> {
  const status =
    stored?.status ?? fallback ?? PageNarrativeStatuses.ACTIVE;
  return projectPageNarrativeStatus(status, ctx, stored?.reason ?? null);
}

export async function buildPageNarrativeStatusProjectionMap(input: {
  campaignId: string;
  pageIds: readonly string[];
  ctx: NarrativeViewerContext;
  pages?: ReadonlyArray<{
    id: string;
    metadata: unknown;
  }>;
}): Promise<Map<string, ReturnType<typeof projectPageNarrativeStatus>>> {
  const storedMap = await getPageNarrativeStatusMap(
    input.campaignId,
    input.pageIds,
  );
  const pageMeta = new Map(
    (input.pages ?? []).map((p) => [p.id, p] as const),
  );
  const result = new Map<string, ReturnType<typeof projectPageNarrativeStatus>>();
  for (const pageId of input.pageIds) {
    const stored = storedMap.get(pageId) ?? null;
    const meta = pageMeta.get(pageId);
    const effective = resolveEffectivePageNarrativeStatus({
      stored,
      metadata: meta?.metadata,
    });
    result.set(
      pageId,
      projectPageNarrativeStatus(
        effective,
        input.ctx,
        stored?.reason ?? null,
      ),
    );
  }
  return result;
}

export async function upsertPageNarrativeStatus(input: {
  campaignId: string;
  wikiPageId: string;
  status: PageNarrativeStatusValue;
  reason?: string | null;
  updatedByUserId?: string | null;
}): Promise<StoredPageNarrativeStatus> {
  const row = await prisma.pageNarrativeStatus.upsert({
    where: { wikiPageId: input.wikiPageId },
    create: {
      campaignId: input.campaignId,
      wikiPageId: input.wikiPageId,
      status: input.status,
      reason: input.reason ?? null,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    update: {
      status: input.status,
      reason: input.reason ?? null,
      updatedByUserId: input.updatedByUserId ?? null,
    },
    select: { wikiPageId: true, status: true, reason: true },
  });
  return toStoredStatus(row);
}

export async function ensurePageNarrativeStatusOnCreate(input: {
  campaignId: string;
  wikiPageId: string;
  status?: PageNarrativeStatusValue;
}): Promise<void> {
  await prisma.pageNarrativeStatus.upsert({
    where: { wikiPageId: input.wikiPageId },
    create: {
      campaignId: input.campaignId,
      wikiPageId: input.wikiPageId,
      status: input.status ?? PageNarrativeStatuses.ACTIVE,
    },
    update: {},
  });
}

export async function backfillPageNarrativeStatusFromCharacterMetadata(
  campaignId: string,
): Promise<number> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null, ...buildEntityCategoryWhereClause('characters') },
    select: { id: true, metadata: true },
  });
  let updated = 0;
  for (const page of pages) {
    const fallback = resolveCharacterFallbackForPage(page.metadata);
    if (!fallback || fallback === PageNarrativeStatuses.ACTIVE) continue;
    await prisma.pageNarrativeStatus.updateMany({
      where: { wikiPageId: page.id, status: PageNarrativeStatuses.ACTIVE },
      data: { status: fallback },
    });
    updated += 1;
  }
  return updated;
}

export function assertPageNarrativeStatusCatalog(): void {
  const unique = new Set(ALL_PAGE_NARRATIVE_STATUSES);
  if (unique.size !== ALL_PAGE_NARRATIVE_STATUSES.length) {
    throw new Error('PageNarrativeStatuses contains duplicate values');
  }
  for (const value of ALL_PAGE_NARRATIVE_STATUSES) {
    if (!normalizePageNarrativeStatus(value)) {
      throw new Error(`Invalid catalog value: ${value}`);
    }
  }
}

export function parsePageNarrativeStatusBody(
  body: Record<string, unknown>,
): { status: PageNarrativeStatusValue; reason: string | null } | null {
  const normalized = normalizePageNarrativeStatus(body.status);
  if (!normalized) return null;
  const reason =
    typeof body.reason === 'string'
      ? body.reason.trim() || null
      : body.reason === null
        ? null
        : undefined;
  return {
    status: normalized,
    reason: reason === undefined ? null : reason,
  };
}
