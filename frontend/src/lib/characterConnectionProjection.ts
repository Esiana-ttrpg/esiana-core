import {
  dateSortKey,
  isRelationVisibleToViewer,
} from './entityRelationTypes';
import {
  parseCharacterLineageMetadata,
  type CharacterLineageFields,
} from './characterLineageMetadata';
import {
  parseCharacterMetadata,
  resolvePrimaryAffiliationId,
} from './characterMetadata';
import type { WikiPageLineageSnapshot } from './entityProjectionQueries';
import type { ChronologyDateParts } from './entityRelationTypes';

export interface CharacterConnectionEntry {
  kind: 'affiliation' | 'family' | 'event' | 'page';
  label: string;
  pageId?: string;
}

export interface CharacterConnectionProjection {
  connectedThrough: CharacterConnectionEntry[];
}

function findPage(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): WikiPageLineageSnapshot | null {
  return flatPages.find((page) => page.id === pageId) ?? null;
}

function resolveTitle(
  flatPages: readonly WikiPageLineageSnapshot[],
  pageId: string,
): string {
  return findPage(flatPages, pageId)?.title ?? pageId;
}

function activeOrgIdsAt(
  lineage: CharacterLineageFields,
  campaignNow: ChronologyDateParts,
  isDMUser: boolean,
): Set<string> {
  const queryKey = dateSortKey(campaignNow);
  const ids = new Set<string>();
  for (const aff of lineage.orgAffiliations) {
    if (!isRelationVisibleToViewer(aff.visibility, isDMUser)) continue;
    if (aff.startDate && dateSortKey(aff.startDate) > queryKey) continue;
    if (aff.endDate && dateSortKey(aff.endDate) < queryKey) continue;
    ids.add(aff.orgId);
  }
  return ids;
}

function collectSourcePageIds(lineage: CharacterLineageFields): Set<string> {
  const ids = new Set<string>();
  for (const aff of lineage.orgAffiliations) {
    for (const id of aff.sourcePageIds ?? []) ids.add(id);
  }
  for (const link of [...lineage.parentLinks, ...lineage.spouseLinks]) {
    for (const id of link.sourcePageIds ?? []) ids.add(id);
  }
  return ids;
}

export function buildCharacterConnectionProjection(
  targetCharacterId: string,
  viewerContext: {
    viewerPageId?: string;
    viewerCharacterId?: string;
    viewerOrgId?: string;
  },
  flatPages: readonly WikiPageLineageSnapshot[],
  campaignNow: ChronologyDateParts,
  isDMUser: boolean,
): CharacterConnectionProjection {
  const targetPage = findPage(flatPages, targetCharacterId);
  if (!targetPage) return { connectedThrough: [] };

  const targetLineage = parseCharacterLineageMetadata(targetPage.metadata);
  const targetIdentity = parseCharacterMetadata(targetPage.metadata);
  const targetOrgIds = activeOrgIdsAt(targetLineage, campaignNow, isDMUser);
  const targetSourceIds = collectSourcePageIds(targetLineage);

  const seen = new Set<string>();
  const connectedThrough: CharacterConnectionEntry[] = [];

  function add(entry: CharacterConnectionEntry) {
    const key = `${entry.kind}:${entry.pageId ?? entry.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    connectedThrough.push(entry);
  }

  if (viewerContext.viewerCharacterId && viewerContext.viewerCharacterId !== targetCharacterId) {
    const viewerPage = findPage(flatPages, viewerContext.viewerCharacterId);
    if (viewerPage) {
      const viewerLineage = parseCharacterLineageMetadata(viewerPage.metadata);
      const viewerOrgIds = activeOrgIdsAt(viewerLineage, campaignNow, isDMUser);

      for (const orgId of targetOrgIds) {
        if (viewerOrgIds.has(orgId)) {
          add({
            kind: 'affiliation',
            label: resolveTitle(flatPages, orgId),
            pageId: orgId,
          });
        }
      }

      if (
        targetLineage.familyId &&
        viewerLineage.familyId &&
        targetLineage.familyId === viewerLineage.familyId
      ) {
        add({
          kind: 'family',
          label: resolveTitle(flatPages, targetLineage.familyId),
          pageId: targetLineage.familyId,
        });
      }

      const viewerSourceIds = collectSourcePageIds(viewerLineage);
      for (const sourceId of targetSourceIds) {
        if (viewerSourceIds.has(sourceId)) {
          add({
            kind: 'event',
            label: resolveTitle(flatPages, sourceId),
            pageId: sourceId,
          });
        }
      }
    }
  }

  if (viewerContext.viewerOrgId && targetOrgIds.has(viewerContext.viewerOrgId)) {
    add({
      kind: 'affiliation',
      label: resolveTitle(flatPages, viewerContext.viewerOrgId),
      pageId: viewerContext.viewerOrgId,
    });
  }

  const primaryAffId = resolvePrimaryAffiliationId(
    targetIdentity,
    targetLineage,
    campaignNow,
  );
  if (viewerContext.viewerPageId) {
    if (targetSourceIds.has(viewerContext.viewerPageId)) {
      add({
        kind: 'page',
        label: resolveTitle(flatPages, viewerContext.viewerPageId),
        pageId: viewerContext.viewerPageId,
      });
    }
    if (primaryAffId && viewerContext.viewerPageId === primaryAffId) {
      add({
        kind: 'affiliation',
        label: resolveTitle(flatPages, primaryAffId),
        pageId: primaryAffId,
      });
    }
  }

  return { connectedThrough };
}
