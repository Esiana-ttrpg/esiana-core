import type { ContinuityIssue, ContinuityScope } from '../../../shared/continuityIssue.js';
import {
  continuityFingerprint,
  continuityIssueId,
} from '../../../shared/continuityIssue.js';
import {
  analyzeDramaticTopology,
  sceneMetadataToSequenceEntry,
} from '../../../shared/dramaticTopology.js';
import { topologicalSceneOrder } from '../../../shared/sceneTimelineProjection.js';
import { ensureNarrativeScenesSystemCategoryKey } from './ensureNarrativeScenesSystemCategoryKey.js';
import { collectVisibleSceneSubtreeRows } from './sceneHubTree.js';
import { parseSceneMetadata } from './sceneMetadata.js';
import { prisma } from './prisma.js';
import type { CampaignMemberRole } from '../types/domain.js';
import { CampaignMemberRoles } from '../types/domain.js';

function canRunScan(role: CampaignMemberRole | null): boolean {
  return (
    role === CampaignMemberRoles.GAMEMASTER || role === CampaignMemberRoles.WRITER
  );
}

export async function buildDramaticTopologyContinuityIssues(input: {
  campaignId: string;
  role: CampaignMemberRole | null;
  scope: ContinuityScope;
  maxIssues?: number;
}): Promise<ContinuityIssue[]> {
  if (!canRunScan(input.role)) return [];

  const scenesRootId = await ensureNarrativeScenesSystemCategoryKey(input.campaignId);
  if (!scenesRootId) return [];

  const pages = await prisma.wikiPage.findMany({
    where: { campaignId: input.campaignId, deletedAt: null },
    select: {
      id: true,
      title: true,
      parentId: true,
      visibility: true,
      metadata: true,
      blocks: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const sceneRows = collectVisibleSceneSubtreeRows(
    pages.map((p) => ({
      id: p.id,
      title: p.title,
      parentId: p.parentId,
      visibility: p.visibility,
      metadata: p.metadata,
      blocks: p.blocks,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    scenesRootId,
    input.role,
  );

  const sceneSequenceInputs = sceneRows.map((row) => {
    const sceneMeta = parseSceneMetadata(row.metadata);
    return {
      id: row.id,
      title: row.title,
      scene: {
        sceneStatus: sceneMeta.sceneStatus,
        beatType: sceneMeta.beatType,
        plannedSessionId: sceneMeta.plannedSessionId,
        playedSessionId: sceneMeta.playedSessionId,
        sortOrder: sceneMeta.sortOrder,
        followsScenePageIds: sceneMeta.followsScenePageIds,
        linkedQuestPageIds: sceneMeta.linkedQuestPageIds,
      },
    };
  });
  const sequence = topologicalSceneOrder(sceneSequenceInputs).map((row) =>
    sceneMetadataToSequenceEntry(row.id, parseSceneMetadata(
      sceneRows.find((candidate) => candidate.id === row.id)!.metadata,
    )),
  );

  const findings = analyzeDramaticTopology(sequence);
  const issues: ContinuityIssue[] = findings.map((finding) => {
    const pageId = finding.sceneIds[0];
    const fingerprint = continuityFingerprint('narrative_dramatic_topology', {
      pageId,
      kind: finding.kind,
      sceneIds: finding.sceneIds.join(','),
    });
    return {
      id: continuityIssueId(fingerprint),
      fingerprint,
      severity: finding.severity,
      scope: input.scope,
      type: 'narrative_dramatic_topology',
      producer: 'dramatic_topology_analyzer',
      message: finding.message,
      pageId,
      relatedPageIds: finding.sceneIds,
      issueCategory: 'narrative_intent',
    };
  });

  if (input.maxIssues !== undefined && issues.length > input.maxIssues) {
    return issues.slice(0, input.maxIssues);
  }
  return issues;
}
