import { prisma } from './prisma.js';
import {
  countContinuityIssues,
  type GlobalContinuityPayload,
  type PageContinuityPayload,
} from '../../../shared/continuityIssue.js';
import {
  buildAliasCollisionIssues,
  buildUnresolvedWikilinkIssues,
  buildUnlinkedEntityIssue,
} from './buildContinuityIssues.js';
import { buildBlockScopedLinkIssues } from './wikiContinuityBlocks.js';
import {
  isElevatedWikiRole,
  wikiLinkPeerVisibilityFilter,
} from './wikiLinkService.js';
import {
  isEligibleForUnlinkedEntityIssue,
  type WikiContinuityPageInput,
} from './wikiContinuityRoots.js';
import { normalizeCampaignMemberRole } from './acl.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { canViewWikiPage } from './wikiTree.js';
import { detectTemporalContradictions } from './buildTemporalContinuityIssues.js';
import { buildTemporalContinuityIndex } from './temporalContinuityScan.js';
import {
  buildNarrativeDeadEndContinuityIssues,
} from './narrativeDeadEndScan.js';
import { buildNarrativeHiddenReachabilityContinuityIssues } from './narrativeHiddenReachabilityScan.js';
import { buildNarrativeCircularDependencyContinuityIssues } from './narrativeCircularDependencyScan.js';
import { buildNarrativeOrphanContinuityIssues } from './narrativeOrphanScan.js';
import { buildNarrativeClueRedundancyContinuityIssues } from './narrativeClueRedundancyScan.js';
import { buildNarrativeForeshadowingContinuityIssues } from './narrativeForeshadowingScan.js';
import {
  buildNarrativeDensityContinuityIssues,
  loadNarrativeDensityAnalysis,
} from './narrativeDensityScan.js';
import { buildDramaticTopologyContinuityIssues } from './dramaticTopologyScan.js';
import { loadForeshadowingAnalysis } from './narrativeForeshadowingScan.js';
import {
  GLOBAL_NARRATIVE_CONTINUITY_CAP,
  truncateNarrativeContinuityIssues,
} from '../../../shared/continuityIssuePriority.js';

const GLOBAL_TEMPORAL_ISSUE_CAP = 50;

function resolveContinuityViewerRole(role: string | null): CampaignMemberRole | null {
  return role ? normalizeCampaignMemberRole(role) : null;
}

async function buildTemporalContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  filterPageId?: string;
  maxIssues?: number;
}) {
  if (!isElevatedWikiRole(input.role)) return [];
  const index = await buildTemporalContinuityIndex(input.campaignId);
  return detectTemporalContradictions(index, {
    filterPageId: input.filterPageId,
    maxIssues: input.maxIssues,
  });
}

export async function buildPageContinuityPayload(input: {
  campaignId: string;
  pageId: string;
  role: string | null;
}): Promise<PageContinuityPayload | null> {
  const viewerRole = resolveContinuityViewerRole(input.role);
  const page = await prisma.wikiPage.findFirst({
    where: {
      id: input.pageId,
      campaignId: input.campaignId,
      deletedAt: null,
    },
    select: {
      id: true,
      title: true,
      blocks: true,
      templateType: true,
      metadata: true,
      parentId: true,
      visibility: true,
      stats: { select: { inboundLinkCount: true } },
      _count: { select: { children: true } },
    },
  });

  if (!page || !canViewWikiPage(page.visibility, viewerRole)) {
    return null;
  }

  const blocks = (Array.isArray(page.blocks) ? page.blocks : []) as Array<
    Record<string, unknown>
  >;

  const blockLinkIssues = await buildBlockScopedLinkIssues({
    campaignId: input.campaignId,
    pageId: page.id,
    blocks,
  });

  const unresolvedRows = await prisma.unresolvedWikilink.findMany({
    where: {
      campaignId: input.campaignId,
      sourcePageId: page.id,
      status: 'OPEN',
    },
    select: {
      sourcePageId: true,
      rawText: true,
      normalizedText: true,
    },
  });

  const pageInput: WikiContinuityPageInput = {
    id: page.id,
    title: page.title,
    templateType: page.templateType,
    metadata: page.metadata,
    parentId: page.parentId,
    childCount: page._count.children,
  };

  const inboundLinkCount = page.stats?.inboundLinkCount ?? 0;
  const issues = [
    ...blockLinkIssues,
    ...buildUnresolvedWikilinkIssues(unresolvedRows, 'local'),
  ];

  if (
    isEligibleForUnlinkedEntityIssue(pageInput, inboundLinkCount)
  ) {
    const unlinked = buildUnlinkedEntityIssue(
      { ...pageInput, inboundLinkCount },
      'local',
    );
    if (unlinked) issues.push(unlinked);
  }

  const temporalIssues = await buildTemporalContinuityIssues({
    campaignId: input.campaignId,
    role: viewerRole,
    filterPageId: page.id,
  });
  issues.push(...temporalIssues);

  const [
    narrativeDeadEndIssues,
    hiddenReachabilityIssues,
    circularDependencyIssues,
    orphanIssues,
    clueRedundancyIssues,
    foreshadowingIssues,
    densityIssues,
    dramaticTopologyIssues,
  ] = await Promise.all([
    buildNarrativeDeadEndContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildNarrativeHiddenReachabilityContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildNarrativeCircularDependencyContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildNarrativeOrphanContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildNarrativeClueRedundancyContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildNarrativeForeshadowingContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildNarrativeDensityContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
      filterPageId: page.id,
    }),
    buildDramaticTopologyContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'local',
    }),
  ]);
  issues.push(
    ...narrativeDeadEndIssues,
    ...hiddenReachabilityIssues,
    ...circularDependencyIssues,
    ...orphanIssues,
    ...clueRedundancyIssues,
    ...foreshadowingIssues,
    ...densityIssues,
    ...dramaticTopologyIssues,
  );

  return {
    pageId: page.id,
    title: page.title,
    issues,
    counts: countContinuityIssues(issues),
  };
}

export async function buildGlobalContinuityPayload(input: {
  campaignId: string;
  role: string | null;
}): Promise<GlobalContinuityPayload> {
  const viewerRole = resolveContinuityViewerRole(input.role);
  const isElevated = isElevatedWikiRole(input.role);
  const peerFilter = wikiLinkPeerVisibilityFilter(isElevated);

  const pages = await prisma.wikiPage.findMany({
    where: {
      campaignId: input.campaignId,
      deletedAt: null,
      ...(peerFilter ?? {}),
    },
    select: {
      id: true,
      title: true,
      templateType: true,
      metadata: true,
      parentId: true,
      updatedAt: true,
      stats: { select: { inboundLinkCount: true } },
      _count: { select: { children: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const parentIdsWithChildren = new Set(
    pages.filter((p) => p._count.children > 0).map((p) => p.id),
  );

  const unlinkedIssues = [];
  for (const page of pages) {
    if (unlinkedIssues.length >= 50) break;
    const pageInput: WikiContinuityPageInput = {
      id: page.id,
      title: page.title,
      templateType: page.templateType,
      metadata: page.metadata,
      parentId: page.parentId,
      childCount: page._count.children,
    };
    const inbound = page.stats?.inboundLinkCount ?? 0;
    if (
      !isEligibleForUnlinkedEntityIssue(
        pageInput,
        inbound,
        parentIdsWithChildren,
      )
    ) {
      continue;
    }
    const issue = buildUnlinkedEntityIssue(
      { ...pageInput, inboundLinkCount: inbound },
      'global',
    );
    if (issue) unlinkedIssues.push(issue);
  }

  const aliasRows = await prisma.wikiPageAlias.findMany({
    where: { campaignId: input.campaignId },
    select: { normalizedAlias: true, pageId: true },
  });
  const byNorm = new Map<string, string[]>();
  for (const row of aliasRows) {
    const list = byNorm.get(row.normalizedAlias) ?? [];
    list.push(row.pageId);
    byNorm.set(row.normalizedAlias, list);
  }
  const aliasCollisions = [];
  for (const [normalizedAlias, pageIds] of byNorm) {
    const unique = [...new Set(pageIds)];
    if (unique.length > 1) {
      aliasCollisions.push({ normalizedAlias, pageIds: unique });
    }
  }

  const temporalIssues = await buildTemporalContinuityIssues({
    campaignId: input.campaignId,
    role: viewerRole,
    maxIssues: GLOBAL_TEMPORAL_ISSUE_CAP,
  });

  const [
    narrativeDeadEndIssues,
    hiddenReachabilityIssues,
    circularDependencyIssues,
    orphanIssues,
    clueRedundancyIssues,
    foreshadowingIssues,
    densityIssues,
    dramaticTopologyIssues,
    foreshadowingAnalysis,
    narrativeDensity,
  ] = await Promise.all([
    buildNarrativeDeadEndContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildNarrativeHiddenReachabilityContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildNarrativeCircularDependencyContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildNarrativeOrphanContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildNarrativeClueRedundancyContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildNarrativeForeshadowingContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildNarrativeDensityContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    buildDramaticTopologyContinuityIssues({
      campaignId: input.campaignId,
      role: viewerRole,
      scope: 'global',
    }),
    loadForeshadowingAnalysis({
      campaignId: input.campaignId,
      role: viewerRole,
    }),
    loadNarrativeDensityAnalysis({
      campaignId: input.campaignId,
      role: viewerRole,
    }),
  ]);

  const recencyByPageId = new Map(
    pages.map((p) => [p.id, p.updatedAt.getTime()]),
  );

  const narrativeIssues = truncateNarrativeContinuityIssues(
    [
      ...narrativeDeadEndIssues,
      ...hiddenReachabilityIssues,
      ...circularDependencyIssues,
      ...orphanIssues,
      ...clueRedundancyIssues,
      ...foreshadowingIssues,
      ...densityIssues,
      ...dramaticTopologyIssues,
    ],
    GLOBAL_NARRATIVE_CONTINUITY_CAP,
    { recencyByPageId },
  );

  const issues = [
    ...unlinkedIssues,
    ...buildAliasCollisionIssues(aliasCollisions.slice(0, 20)),
    ...temporalIssues,
    ...narrativeIssues,
  ];

  const openUnresolvedCount = await prisma.unresolvedWikilink.count({
    where: {
      campaignId: input.campaignId,
      status: 'OPEN',
      sourcePage: peerFilter
        ? { ...peerFilter, deletedAt: null }
        : { deletedAt: null },
    },
  });

  return {
    issues,
    counts: countContinuityIssues(issues),
    openUnresolvedCount,
    foreshadowingChains: foreshadowingAnalysis.chains,
    narrativeDensity: narrativeDensity ?? undefined,
  };
}
