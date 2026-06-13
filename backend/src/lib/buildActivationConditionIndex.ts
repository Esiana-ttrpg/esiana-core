import type { ChronologyDateParts } from '../../../shared/chronologyTypes.js';
import {
  compareChronologyDateParts,
  normalizeChronologyDateParts,
} from '../../../shared/chronologyTypes.js';
import {
  EntityGraphEntityTypes,
  type EntityRelationKind,
} from '../../../shared/entityGraph.js';
import { liveGraphEdgeKey } from '../../../shared/narrativeBranchAnalysis.js';
import type { ActivationConditionIndex } from '../../../shared/narrativeHiddenReachability.js';
import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';
import {
  diagnoseEntityRelationIntegrity,
  type EntityRelationIntegrityIssue,
} from './entityRelationSyncService.js';
import { extractWikiPageGraphEdges } from './entityRelationExtractors.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { prisma } from './prisma.js';

function isEdgeActiveAt(
  startDate: unknown,
  endDate: unknown,
  campaignNow: ChronologyDateParts,
): boolean {
  const start = normalizeChronologyDateParts(startDate);
  const end = normalizeChronologyDateParts(endDate);
  if (start && compareChronologyDateParts(campaignNow, start) < 0) return false;
  if (end && compareChronologyDateParts(end, campaignNow) < 0) return false;
  return true;
}

type WikiPageGraphSource = {
  id: string;
  title: string;
  parentId: string | null;
  metadata: unknown;
  outgoingLinks: Array<{
    id: string;
    targetPageId: string;
    aliasText: string | null;
    targetPage: { title: string };
  }>;
};

export function buildExpectedSourceRecordKeysFromPages(
  pages: readonly WikiPageGraphSource[],
): Set<string> {
  const keys = new Set<string>();
  for (const page of pages) {
    const drafts = extractWikiPageGraphEdges({
      pageId: page.id,
      title: page.title,
      parentId: page.parentId,
      metadata: page.metadata,
      wikiLinks: page.outgoingLinks.map((link) => ({
        id: link.id,
        targetPageId: link.targetPageId,
        aliasText: link.aliasText,
        targetTitle: link.targetPage.title,
      })),
    });
    for (const draft of drafts) {
      keys.add(draft.sourceRecordKey);
    }
  }
  return keys;
}

export async function buildActivationConditionIndex(input: {
  campaignId: string;
  lifecycleBySubjectId: ReadonlyMap<string, NarrativeLifecycleState>;
}): Promise<ActivationConditionIndex> {
  const { campaignId } = input;
  const [pages, calendarEvents, entityRelations, integrityIssues, campaignNow] =
    await Promise.all([
      prisma.wikiPage.findMany({
        where: { campaignId, deletedAt: null },
        select: {
          id: true,
          title: true,
          parentId: true,
          metadata: true,
          outgoingLinks: {
            select: {
              id: true,
              targetPageId: true,
              aliasText: true,
              targetPage: { select: { title: true } },
            },
          },
        },
      }),
      prisma.calendarEvent.findMany({
        where: { calendar: { campaignId } },
        select: { id: true },
      }),
      prisma.entityRelation.findMany({
        where: {
          campaignId,
          sourceEntityType: EntityGraphEntityTypes.WIKI_PAGE,
          targetEntityType: EntityGraphEntityTypes.WIKI_PAGE,
        },
        select: {
          id: true,
          sourceEntityId: true,
          targetEntityId: true,
          relationKind: true,
          sourceRecordKey: true,
          startDate: true,
          endDate: true,
        },
      }),
      diagnoseEntityRelationIntegrity(input.campaignId),
      resolveCampaignChronologyNow(input.campaignId),
    ]);

  const existingPageIds = new Set(pages.map((p) => p.id));
  const calendarEventIds = new Set(calendarEvents.map((e) => e.id));
  const expectedSourceRecordKeys = buildExpectedSourceRecordKeysFromPages(pages);

  const badEdgeIds = new Set(
    integrityIssues.map((issue: EntityRelationIntegrityIssue) => issue.edgeId),
  );

  const liveGraphEdges = new Set<string>();
  for (const edge of entityRelations) {
    if (badEdgeIds.has(edge.id)) continue;
    if (!existingPageIds.has(edge.sourceEntityId)) continue;
    if (!existingPageIds.has(edge.targetEntityId)) continue;
    if (!expectedSourceRecordKeys.has(edge.sourceRecordKey)) continue;
    if (!isEdgeActiveAt(edge.startDate, edge.endDate, campaignNow)) continue;

    liveGraphEdges.add(
      liveGraphEdgeKey(
        edge.sourceEntityId,
        edge.targetEntityId,
        edge.relationKind as EntityRelationKind,
      ),
    );
  }

  return {
    existingPageIds,
    lifecycleBySubjectId: input.lifecycleBySubjectId,
    calendarEventIds,
    liveGraphEdges,
  };
}
