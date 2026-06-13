import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import {
  NarrativeLifecycleStates,
  NarrativeLifecycleSubjectKinds,
} from '../../../shared/narrativeLifecycle.js';
import type { ConsequenceEffect } from '../../../shared/narrativeConsequence.js';
import { transitionLifecycle } from './narrativeLifecycleService.js';
import { executeSpreadAction } from './rumorEngineService.js';
import {
  CirculationVisibilities,
  normalizeAwarenessScope,
  normalizeCirculationVisibility,
  normalizeRumorStance,
} from '../../../shared/rumorEngine.js';
import {
  mergeObjectStyleWithOverlay,
  parseMapObjectOverlayStyle,
} from '../../../shared/mapOverlayTypes.js';
import {
  mergeOrganizationMetadata,
  parseOrganizationMetadata,
} from './organizationMetadata.js';
import {
  normalizeOrgRelationCategory,
  normalizeOrgRelationStance,
  normalizeRelationVisibility,
  type ChronologyDateParts,
} from './entityRelationTypes.js';

export type CanonicalWorldEffectContext = {
  campaignId: string;
  actorUserId: string;
  canManage: boolean;
  /** Quest/page subject for lifecycle transitions. */
  subjectId?: string;
  atEpochMinute: string;
  effectiveDate: ChronologyDateParts;
  sourceEventIds?: string[];
};

/** Marks linked political border overlays for GM keyframe confirmation — does not mutate geometry. */
export async function suggestTerritoryShiftOnLinkedBorders(
  campaignId: string,
  orgPageId: string,
  stance: string,
  atEpochMinute: string,
  db: Prisma.TransactionClient,
  source = 'set_faction_stance',
): Promise<void> {
  const objects = await db.mapSceneObject.findMany({
    where: { campaignId, kind: { in: ['region', 'path'] } },
    select: { id: true, style: true },
  });
  for (const obj of objects) {
    const overlay = parseMapObjectOverlayStyle(obj.style);
    if (overlay.controllingOrgPageId !== orgPageId) continue;
    const nextStyle = mergeObjectStyleWithOverlay(obj.style ?? {}, {
      territorySuggestion: {
        atEpochMinute,
        stance,
        source,
      },
    });
    await db.mapSceneObject.update({
      where: { id: obj.id },
      data: { style: nextStyle as never },
    });
  }
}

export async function suggestTerritoryShiftOnSceneObject(
  campaignId: string,
  sceneObjectId: string,
  orgPageId: string | undefined,
  stance: string | undefined,
  atEpochMinute: string,
  db: Prisma.TransactionClient,
): Promise<void> {
  const obj = await db.mapSceneObject.findFirst({
    where: { id: sceneObjectId, campaignId },
    select: { id: true, style: true },
  });
  if (!obj) return;
  const nextStyle = mergeObjectStyleWithOverlay(obj.style ?? {}, {
    territorySuggestion: {
      atEpochMinute,
      stance: stance ?? 'pressure',
      source: 'world_advance',
    },
  });
  await db.mapSceneObject.update({
    where: { id: obj.id },
    data: { style: nextStyle as never },
  });
}

export async function appendOrgRelationEvent(
  campaignId: string,
  orgPageId: string,
  input: {
    targetOrgId: string;
    relationType: string;
    stance: string;
    visibility?: string;
    note?: string;
    effectiveDate: ChronologyDateParts;
    sourceEventIds?: string[];
  },
  db: Prisma.TransactionClient,
): Promise<void> {
  const page = await db.wikiPage.findFirst({
    where: { id: orgPageId, campaignId },
    select: { metadata: true },
  });
  if (!page) return;
  const org = parseOrganizationMetadata(page.metadata);
  const relations = [...org.relations];
  let relation = relations.find((r) => r.targetOrgId === input.targetOrgId);
  if (!relation) {
    relation = {
      id: randomUUID(),
      targetOrgId: input.targetOrgId,
      history: [],
    };
    relations.push(relation);
  }
  relation.history.push({
    id: randomUUID(),
    effectiveDate: input.effectiveDate,
    relationType: normalizeOrgRelationCategory(input.relationType),
    stance: normalizeOrgRelationStance(input.stance),
    visibility: normalizeRelationVisibility(input.visibility),
    note: input.note ?? null,
    sourcePageIds: [],
    sourceEventIds: input.sourceEventIds ?? [],
  });
  const merged = mergeOrganizationMetadata(page.metadata, { relations });
  await db.wikiPage.update({
    where: { id: orgPageId },
    data: { metadata: merged as never },
  });
}

export async function applyCanonicalWorldEffect(
  effect: ConsequenceEffect,
  ctx: CanonicalWorldEffectContext,
  db: Prisma.TransactionClient,
): Promise<void> {
  const subjectId = ctx.subjectId ?? '';
  switch (effect.type) {
    case 'discover_wiki_page':
    case 'discover_quest': {
      const pageId =
        effect.type === 'discover_quest' ? effect.questPageId : effect.pageId;
      const kind =
        effect.type === 'discover_quest'
          ? NarrativeLifecycleSubjectKinds.QUEST
          : NarrativeLifecycleSubjectKinds.OPEN_THREAD;
      await transitionLifecycle(
        {
          campaignId: ctx.campaignId,
          subjectKind: kind,
          subjectId: pageId,
          toState: NarrativeLifecycleStates.DISCOVERED,
          actorUserId: ctx.actorUserId,
          canManage: ctx.canManage,
        },
        db,
      );
      break;
    }
    case 'set_faction_stance': {
      await suggestTerritoryShiftOnLinkedBorders(
        ctx.campaignId,
        effect.factionPageId,
        effect.stance,
        ctx.atEpochMinute,
        db,
      );
      break;
    }
    case 'append_snapshot_facet':
      break;
    case 'circulate_rumor': {
      const targets: Array<{
        kind: 'region' | 'faction';
        locationPageId?: string;
        orgPageId?: string;
      }> = [];
      if (effect.targetLocationPageId) {
        targets.push({
          kind: 'region',
          locationPageId: effect.targetLocationPageId,
        });
      }
      if (effect.targetOrgPageId) {
        targets.push({
          kind: 'faction',
          orgPageId: effect.targetOrgPageId,
        });
      }
      if (!targets.length) break;
      await executeSpreadAction({
        campaignId: ctx.campaignId,
        actorUserId: ctx.actorUserId,
        sourceClaimId: effect.claimId,
        draft: effect.draft,
        targets,
        stance: effect.stance ? normalizeRumorStance(effect.stance) : undefined,
        awarenessScope: effect.awarenessScope
          ? normalizeAwarenessScope(effect.awarenessScope)
          : undefined,
        visibility: effect.visibility
          ? normalizeCirculationVisibility(effect.visibility)
          : CirculationVisibilities.GM_ONLY,
      });
      break;
    }
    default:
      break;
  }
}
