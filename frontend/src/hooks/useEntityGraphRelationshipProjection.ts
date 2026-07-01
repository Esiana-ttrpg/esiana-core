import { shouldShowPageNarrativeStatusBadge } from '@shared/pageNarrativeStatus';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import { useEffect, useMemo, useState } from 'react';
import {
  EntityGraphEntityTypes,
  EntityRelationKinds,
  nodeRefKey,
  type EntityGraphEdge,
  type LocalGraphQueryResult,
} from '@shared/entityGraph';
import type { OrgRelationStance } from '@/lib/entityRelationTypes';
import {
  buildEntityRelationshipProjection,
  type EntityRelationshipProjection,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';
import { fetchLocalEntityGraph } from '@/lib/entityGraphApi';
import { buildProjectionProvenance } from '@/lib/projectionProvenance';

function otherWikiPageId(edge: EntityGraphEdge, pageId: string): string | null {
  if (
    edge.source.entityType === EntityGraphEntityTypes.WIKI_PAGE &&
    edge.source.entityId === pageId
  ) {
    return edge.target.entityType === EntityGraphEntityTypes.WIKI_PAGE
      ? edge.target.entityId
      : null;
  }
  if (
    edge.target.entityType === EntityGraphEntityTypes.WIKI_PAGE &&
    edge.target.entityId === pageId
  ) {
    return edge.source.entityType === EntityGraphEntityTypes.WIKI_PAGE
      ? edge.source.entityId
      : null;
  }
  return null;
}

export function mapEntityGraphToRelationshipProjection(
  graph: LocalGraphQueryResult,
  pageId: string,
  _templateType: string,
  flatPages: readonly WikiPageLineageSnapshot[],
  date: ChronologyDateParts,
): EntityRelationshipProjection {
  const pageById = new Map(flatPages.map((page) => [page.id, page]));
  const sourcePage = pageById.get(pageId);
  const entityCategory = sourcePage
    ? resolveCanonicalEntityCategory(
        {
          id: sourcePage.id,
          title: sourcePage.title,
          parentId: sourcePage.parentId ?? null,
          templateType: sourcePage.templateType,
          metadata: sourcePage.metadata,
        },
        flatPages,
      )
    : null;
  const previewByKey = new Map(graph.nodes.map((node) => [nodeRefKey(node), node]));
  const resolvedFromDate: ChronologyDateParts = {
    year: date.year,
    month: date.month,
    day: date.day,
  };

  const snapshotFor = (wikiPageId: string): WikiPageLineageSnapshot | null => {
    const page = pageById.get(wikiPageId);
    if (page) return page;
    const preview = previewByKey.get(
      nodeRefKey({ entityType: EntityGraphEntityTypes.WIKI_PAGE, entityId: wikiPageId }),
    );
    if (!preview) return null;
    return {
      id: wikiPageId,
      title: preview.title,
      templateType: preview.codexType ?? 'DEFAULT',
      metadata: {},
    };
  };

  const affiliations: EntityRelationshipProjection['affiliations'] = [];
  const bloodlineRoots: EntityRelationshipProjection['bloodlineRoots'] = [];
  const diplomaticTensions: EntityRelationshipProjection['diplomaticTensions'] = [];

  for (const edge of graph.edges) {
    const otherId = otherWikiPageId(edge, pageId);
    if (!otherId) continue;
    const other = snapshotFor(otherId);
    if (!other) continue;

    if (edge.relationKind === EntityRelationKinds.CHARACTER_AFFILIATION) {
      affiliations.push({
        org: other,
        role:
          edge.payload?.kind === EntityRelationKinds.CHARACTER_AFFILIATION
            ? edge.payload.role ?? null
            : null,
        startDate: edge.startDate,
        endDate: edge.endDate,
        ...buildProjectionProvenance({
          relationIds: [edge.sourceRecordKey],
          resolvedFromDate,
        }),
      });
    } else if (edge.relationKind === EntityRelationKinds.CHARACTER_LINEAGE) {
      bloodlineRoots.push({
        character: other,
        relationshipType:
          edge.payload?.kind === EntityRelationKinds.CHARACTER_LINEAGE
            ? edge.payload.relationshipType
            : 'OTHER',
        ...buildProjectionProvenance({
          lineageIds: [edge.sourceRecordKey],
          resolvedFromDate,
        }),
      });
    } else if (
      edge.relationKind === EntityRelationKinds.ORG_DIPLOMATIC &&
      entityCategory === 'organizations'
    ) {
      const payload =
        edge.payload?.kind === EntityRelationKinds.ORG_DIPLOMATIC ? edge.payload : null;
      diplomaticTensions.push({
        org: other,
        stance: (payload?.stance ?? 'UNKNOWN') as OrgRelationStance,
        direction:
          edge.source.entityId === pageId ? ('outgoing' as const) : ('incoming' as const),
        note: payload?.note,
        ...buildProjectionProvenance({
          relationIds: [edge.sourceRecordKey],
          resolvedFromDate,
        }),
      });
    }
  }

  return {
    affiliations,
    bloodlineRoots,
    diplomaticTensions,
    resolvedFromDate,
    narrativeStatusByPageId: Object.fromEntries(
      graph.nodes
        .filter(
          (node) =>
            node.entityType === EntityGraphEntityTypes.WIKI_PAGE &&
            node.narrativeStatus &&
            shouldShowPageNarrativeStatusBadge(node.narrativeStatus.status) &&
            node.narrativeStatus.visibleToParty,
        )
        .map((node) => [node.entityId, node.narrativeStatus!.label] as const),
    ),
  };
}

export function useEntityGraphRelationshipProjection(input: {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  flatPages: readonly WikiPageLineageSnapshot[];
  campaignNow: ChronologyDateParts;
  isDMUser: boolean;
  enabled?: boolean;
}): EntityRelationshipProjection {
  const clientProjection = useMemo(
    () =>
      buildEntityRelationshipProjection(
        input.pageId,
        input.templateType,
        input.flatPages,
        input.campaignNow,
        input.isDMUser,
      ),
    [
      input.pageId,
      input.templateType,
      input.flatPages,
      input.campaignNow,
      input.isDMUser,
    ],
  );

  const [serverProjection, setServerProjection] =
    useState<EntityRelationshipProjection | null>(null);

  useEffect(() => {
    if (input.enabled === false) {
      setServerProjection(null);
      return;
    }
    let cancelled = false;
    fetchLocalEntityGraph({
      campaignHandle: input.campaignHandle,
      entityType: EntityGraphEntityTypes.WIKI_PAGE,
      entityId: input.pageId,
      depth: 1,
    })
      .then((graph) => {
        if (cancelled) return;
        setServerProjection(
          mapEntityGraphToRelationshipProjection(
            graph,
            input.pageId,
            input.templateType,
            input.flatPages,
            input.campaignNow,
          ),
        );
      })
      .catch(() => {
        if (!cancelled) setServerProjection(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    input.campaignHandle,
    input.pageId,
    input.templateType,
    input.flatPages,
    input.campaignNow,
    input.enabled,
  ]);

  return serverProjection ?? clientProjection;
}
