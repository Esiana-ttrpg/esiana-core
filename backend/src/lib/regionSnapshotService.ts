import { prisma } from './prisma.js';
import { projectMigrationFromNpcMoves } from './mapOverlayProjectionService.js';
import { parseLocationMetadata } from './locationMetadata.js';
import { parseCharacterMetadata } from './characterMetadata.js';
import {
  parseOrganizationMetadata,
  resolveOrgRelationsAt,
} from './organizationMetadata.js';
import { getContentPresenceStateMap } from './contentPresenceService.js';
import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import {
  buildNarrativeViewerContext,
  projectMapSceneContext,
  type NarrativeViewerContext,
} from '../../../shared/narrativeProjection.js';
import {
  resolveMapObjectPresenceDetailed,
  type MapSceneObjectPresenceInput,
  type PresenceContext,
} from '../../../shared/mapPresence.js';
import { KnowledgeStates } from '../../../shared/loreKnowledge.js';
import { filterClaimsForPartyKnowledge } from '../../../shared/discoveryProjection.js';
import { CirculationTargetKinds } from '../../../shared/rumorEngine.js';
import {
  computeActiveCirculations,
  filterCirculationsForAudience,
} from '../../../shared/rumorProjection.js';
import {
  serializeRumorCirculation,
  toEpochMinuteString,
} from './rumorEngineService.js';
import {
  buildFacetHashes,
  buildRegionSnapshotMeta,
  buildRegionDiff,
  SNAPSHOT_PAYLOAD_VERSION,
  PROJECTION_SEMANTICS_VERSION,
  SNAPSHOT_SCOPE_CAPS,
  SnapshotPayloadTier,
  type RegionSnapshotPayloadV1,
  type RegionSnapshotFacets,
  type RegionDiffV1,
  type SummaryLineCandidate,
  renderSummaryLine,
} from '../../../shared/narrativeSnapshots.js';
import {
  CampaignMemberRoles,
  type CampaignMemberRole,
} from '../types/domain.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { canViewWikiPage } from './wikiTree.js';

export type RegionScope = {
  anchorLocationPageId: string;
  regionKey: string | null;
  locationPageIds: string[];
};

export async function resolveRegionScope(
  campaignId: string,
  anchorLocationPageId: string,
): Promise<RegionScope | null> {
  const anchor = await prisma.wikiPage.findFirst({
    where: { id: anchorLocationPageId, campaignId, deletedAt: null },
    select: { id: true, metadata: true, templateType: true },
  });
  if (!anchor) return null;

  const locMeta = parseLocationMetadata(anchor.metadata);
  const ids = new Set<string>([anchor.id, ...locMeta.relatedLocationIds]);

  const cap = SNAPSHOT_SCOPE_CAPS.maxLocationPages;

  if (locMeta.regionKey) {
    const siblings = await prisma.wikiPage.findMany({
      where: {
        campaignId,
        deletedAt: null,
        templateType: 'LOCATION',
      },
      select: { id: true, metadata: true },
      take: 500,
    });
    for (const page of siblings) {
      if (ids.size >= cap) break;
      const m = parseLocationMetadata(page.metadata);
      if (m.regionKey === locMeta.regionKey) ids.add(page.id);
    }
  } else if (locMeta.region) {
    const norm = locMeta.region.trim().toLowerCase();
    const siblings = await prisma.wikiPage.findMany({
      where: {
        campaignId,
        deletedAt: null,
        templateType: 'LOCATION',
      },
      select: { id: true, metadata: true },
      take: 500,
    });
    for (const page of siblings) {
      if (ids.size >= cap) break;
      const m = parseLocationMetadata(page.metadata);
      if (m.region?.trim().toLowerCase() === norm) ids.add(page.id);
    }
  }

  return {
    anchorLocationPageId: anchor.id,
    regionKey: locMeta.regionKey,
    locationPageIds: [...ids].slice(0, cap),
  };
}

async function loadTitleMap(
  campaignId: string,
  pageIds: string[],
): Promise<Map<string, string>> {
  const pages = await prisma.wikiPage.findMany({
    where: { campaignId, id: { in: pageIds }, deletedAt: null },
    select: { id: true, title: true },
  });
  return new Map(pages.map((p) => [p.id, p.title]));
}

export async function collectRegionFacets(input: {
  campaignId: string;
  scope: RegionScope;
  ctx: NarrativeViewerContext;
  capturedAtEpochMinute: bigint;
}): Promise<{ facets: RegionSnapshotFacets; truncation: RegionSnapshotPayloadV1['meta']['truncation'] }> {
  const { campaignId, scope, ctx, capturedAtEpochMinute } = input;
  const scopeSet = new Set(scope.locationPageIds);
  const isElevated = ctx.capabilities.isElevatedWiki;
  const dateParts = ctx.campaignNow.dateParts;
  const truncation: RegionSnapshotPayloadV1['meta']['truncation'] = {};

  const characterPages = await prisma.wikiPage.findMany({
    where: {
      campaignId,
      deletedAt: null,
      templateType: 'CHARACTER',
    },
    select: { id: true, title: true, metadata: true },
    take: 500,
  });

  const npcPresence: RegionSnapshotFacets['npcPresence'] = [];
  for (const page of characterPages) {
    if (npcPresence.length >= SNAPSHOT_SCOPE_CAPS.maxNpcs) {
      truncation.npcPresence = true;
      break;
    }
    const identity = parseCharacterMetadata(page.metadata);
    const locId = identity.currentLocationId;
    if (!locId || !scopeSet.has(locId)) continue;
    npcPresence.push({
      pageId: page.id,
      locationPageId: locId,
      title: page.title,
    });
  }

  const orgPages = await prisma.wikiPage.findMany({
    where: {
      campaignId,
      deletedAt: null,
      templateType: 'ORGANIZATION',
    },
    select: { id: true, title: true, metadata: true },
    take: 300,
  });

  const locationPages = await prisma.wikiPage.findMany({
    where: { id: { in: scope.locationPageIds }, campaignId, deletedAt: null },
    select: { id: true, metadata: true },
  });
  const regionNorms = new Set<string>();
  const regionKeys = new Set<string>();
  for (const lp of locationPages) {
    const m = parseLocationMetadata(lp.metadata);
    if (m.region) regionNorms.add(m.region.trim().toLowerCase());
    if (m.regionKey) regionKeys.add(m.regionKey);
  }

  const orgStance: RegionSnapshotFacets['orgStance'] = [];
  for (const page of orgPages) {
    if (orgStance.length >= SNAPSHOT_SCOPE_CAPS.maxOrgStances) {
      truncation.orgStance = true;
      break;
    }
    const org = parseOrganizationMetadata(page.metadata);
    const orgRegionNorm = org.region?.trim().toLowerCase() ?? null;
    let matchesRegion = false;
    if (org.headquartersId && scopeSet.has(org.headquartersId)) {
      matchesRegion = true;
    }
    if (!matchesRegion && orgRegionNorm && regionNorms.has(orgRegionNorm)) {
      matchesRegion = true;
    }
    if (!matchesRegion && scope.regionKey && org.region === scope.regionKey) {
      matchesRegion = true;
    }
    if (!matchesRegion && org.region && regionKeys.has(org.region)) {
      matchesRegion = true;
    }

    if (!matchesRegion) continue;

    const resolved = resolveOrgRelationsAt(org, dateParts);
    for (const { relation, event } of resolved) {
      if (orgStance.length >= SNAPSHOT_SCOPE_CAPS.maxOrgStances) {
        truncation.orgStance = true;
        break;
      }
      orgStance.push({
        orgPageId: page.id,
        targetOrgPageId: relation.targetOrgId,
        stance: event.stance,
        relationType: event.relationType,
      });
    }
  }

  const anchorPage = await prisma.wikiPage.findFirst({
    where: { id: scope.anchorLocationPageId },
    select: { mapAssetId: true, metadata: true },
  });
  const anchorLoc = parseLocationMetadata(anchorPage?.metadata);
  let assetId: string | null = anchorPage?.mapAssetId ?? null;
  if (!assetId && anchorLoc.mapPageId) {
    const mapWiki = await prisma.wikiPage.findFirst({
      where: { id: anchorLoc.mapPageId, campaignId },
      select: { mapAssetId: true },
    });
    assetId = mapWiki?.mapAssetId ?? null;
  }

  const mapPresence: RegionSnapshotFacets['mapPresence'] = {
    visibleObjectIds: [],
    revelationByObjectId: {},
  };

  if (assetId) {

    const layers = await prisma.mapLayer.findMany({
      where: { campaignId, mapAssetId: assetId! },
      select: { id: true, defaultEnabled: true },
    });
    const enabledLayerIds = new Set(
      layers.filter((l) => l.defaultEnabled).map((l) => l.id),
    );

    const roleForWiki =
      ctx.perspective === 'elevated'
        ? CampaignMemberRoles.GAMEMASTER
        : CampaignMemberRoles.PARTICIPANT;
    const { presenceContext: presenceCtx } = projectMapSceneContext(ctx, {
      requestedViewEpochMinute: capturedAtEpochMinute.toString(),
      enabledLayerIds,
      canViewWiki: (visibility: string) =>
        canViewWikiPage(visibility, roleForWiki),
    });

    const objects = await prisma.mapSceneObject.findMany({
      where: { campaignId, mapAssetId: assetId! },
      select: {
        id: true,
        layerId: true,
        visibility: true,
        revelation: true,
        visibleFromEpochMinute: true,
        visibleUntilEpochMinute: true,
        targetPageId: true,
        targetAssetId: true,
        kind: true,
      },
      take: SNAPSHOT_SCOPE_CAPS.maxMapObjects + 1,
    });

    if (objects.length > SNAPSHOT_SCOPE_CAPS.maxMapObjects) {
      truncation.mapPresence = true;
    }

    const presenceMap = await getContentPresenceStateMap(
      campaignId,
      ContentPresenceEntityType.MAP_OBJECT,
      objects.map((o) => o.id),
    );

    for (const obj of objects.slice(0, SNAPSHOT_SCOPE_CAPS.maxMapObjects)) {
      const input: MapSceneObjectPresenceInput = {
        id: obj.id,
        layerId: obj.layerId,
        visibility: obj.visibility,
        revelation: presenceMap.get(obj.id) ?? obj.revelation,
        visibleFromEpochMinute: obj.visibleFromEpochMinute,
        visibleUntilEpochMinute: obj.visibleUntilEpochMinute,
        targetPageId: obj.targetPageId,
        targetAssetId: obj.targetAssetId,
        requiresTarget: obj.kind === 'pin',
      };
      const res = resolveMapObjectPresenceDetailed(input, presenceCtx);
      if (res.visible) {
        mapPresence.visibleObjectIds.push(obj.id);
        mapPresence.revelationByObjectId[obj.id] =
          presenceMap.get(obj.id) ?? obj.revelation ?? 'REVEALED';
      }
    }
    mapPresence.visibleObjectIds.sort();
  }

  const claims = await prisma.loreClaim.findMany({
    where: { campaignId },
    select: {
      id: true,
      pageId: true,
      knowledgeState: true,
      statement: true,
      visibility: true,
      discoveredAt: true,
      discoveredViaType: true,
      discoveredViaSessionId: true,
      discoveredViaRef: true,
    },
    take: 500,
  });

  const partyClaims = filterClaimsForPartyKnowledge(
    claims.map((c) => ({
      id: c.id,
      pageId: c.pageId,
      knowledgeState: c.knowledgeState,
      statement: c.statement,
      visibility: c.visibility,
      discoveredAt: c.discoveredAt,
      discoveredViaType: c.discoveredViaType,
      discoveredViaSessionId: c.discoveredViaSessionId,
      discoveredViaRef: c.discoveredViaRef,
    })) as Parameters<typeof filterClaimsForPartyKnowledge>[0],
    isElevated,
  );

  const regionRefs = [...scope.locationPageIds];
  const circRows = await prisma.rumorCirculation.findMany({
    where: {
      campaignId,
      targetKind: CirculationTargetKinds.REGION,
      targetRef: { in: regionRefs },
    },
    take: SNAPSHOT_SCOPE_CAPS.maxKnowledgeClaims * 3,
  });
  const asOfStr = toEpochMinuteString(capturedAtEpochMinute);
  let activeCirc = computeActiveCirculations(
    circRows.map(serializeRumorCirculation),
    asOfStr,
  );
  if (!isElevated) {
    activeCirc = filterCirculationsForAudience(activeCirc, false);
  }
  const claimIdsWithActiveCirc = new Set(activeCirc.map((c) => c.claimId));

  const partyKnowledge: RegionSnapshotFacets['partyKnowledge'] = [];
  const seenClaimIds = new Set<string>();
  for (const claim of partyClaims) {
    if (partyKnowledge.length >= SNAPSHOT_SCOPE_CAPS.maxKnowledgeClaims) {
      truncation.partyKnowledge = true;
      break;
    }
    if (seenClaimIds.has(claim.id)) continue;
    const subjectId = claim.pageId;
    const intrinsicSuspected =
      claim.knowledgeState === KnowledgeStates.SUSPECTED
      && subjectId
      && scopeSet.has(subjectId);
    const viaCirculation = claimIdsWithActiveCirc.has(claim.id);
    if (!intrinsicSuspected && !viaCirculation) continue;
    if (!isElevated && !viaCirculation) continue;
    seenClaimIds.add(claim.id);
    partyKnowledge.push({
      claimId: claim.id,
      subjectPageId: subjectId,
      label: claim.statement,
    });
  }
  for (const circ of activeCirc) {
    if (partyKnowledge.length >= SNAPSHOT_SCOPE_CAPS.maxKnowledgeClaims) {
      truncation.partyKnowledge = true;
      break;
    }
    if (seenClaimIds.has(circ.claimId)) continue;
    const claimRow = claims.find((c) => c.id === circ.claimId);
    if (!claimRow) continue;
    seenClaimIds.add(circ.claimId);
    partyKnowledge.push({
      claimId: circ.claimId,
      subjectPageId: claimRow.pageId,
      label: claimRow.statement,
    });
  }

  const danger: RegionSnapshotFacets['danger'] = [];
  for (const locId of scope.locationPageIds) {
    const page =
      locId === scope.anchorLocationPageId
        ? anchorPage
        : await prisma.wikiPage.findFirst({
            where: { id: locId },
            select: { metadata: true },
          });
    const meta = parseLocationMetadata(page?.metadata);
    if (meta.dangerLevel != null) {
      danger.push({ locationPageId: locId, level: meta.dangerLevel });
    }
  }

  return {
    facets: {
      npcPresence,
      orgStance,
      mapPresence,
      partyKnowledge,
      danger,
    },
    truncation: Object.keys(truncation).length > 0 ? truncation : undefined,
  };
}

export async function buildRegionSnapshotPayload(input: {
  campaignId: string;
  scope: RegionScope;
  ctx: NarrativeViewerContext;
  capturedAtEpochMinute: bigint;
}): Promise<RegionSnapshotPayloadV1> {
  const { facets, truncation } = await collectRegionFacets(input);
  const meta = buildRegionSnapshotMeta(
    input.ctx,
    input.scope.anchorLocationPageId,
    input.scope.regionKey,
    input.capturedAtEpochMinute,
  );
  if (truncation) meta.truncation = truncation;

  const facetHashes = buildFacetHashes(facets);
  return {
    meta,
    facets,
    facetHashes,
  };
}

export async function captureDualRegionPayloads(input: {
  campaignId: string;
  scope: RegionScope;
  role: CampaignMemberRole | null;
  capturedAtEpochMinute: bigint;
}): Promise<{ dmPayload: RegionSnapshotPayloadV1; partyPayload: RegionSnapshotPayloadV1 }> {
  const dateParts = await resolveCampaignChronologyNow(input.campaignId);

  const dmCtx = buildNarrativeViewerContext({
    role: input.role ?? CampaignMemberRoles.GAMEMASTER,
    campaignNow: {
      epochMinute: input.capturedAtEpochMinute,
      dateParts,
    },
  });

  const partyCtx = buildNarrativeViewerContext({
    role: CampaignMemberRoles.PARTICIPANT,
    campaignNow: {
      epochMinute: input.capturedAtEpochMinute,
      dateParts,
    },
  });

  const dmPayload = await buildRegionSnapshotPayload({
    campaignId: input.campaignId,
    scope: input.scope,
    ctx: dmCtx,
    capturedAtEpochMinute: input.capturedAtEpochMinute,
  });

  const partyPayload = await buildRegionSnapshotPayload({
    campaignId: input.campaignId,
    scope: input.scope,
    ctx: partyCtx,
    capturedAtEpochMinute: input.capturedAtEpochMinute,
  });

  const summaryLinesAtCapture: string[] = [];

  return {
    dmPayload: { ...dmPayload, summaryLinesAtCapture },
    partyPayload: { ...partyPayload, summaryLinesAtCapture },
  };
}

export function parseSnapshotPayload(json: unknown): RegionSnapshotPayloadV1 | null {
  if (!json || typeof json !== 'object') return null;
  const raw = json as RegionSnapshotPayloadV1;
  if (!raw.meta || !raw.facetHashes) return null;
  return raw;
}

export async function buildLivePayloadForDiff(input: {
  campaignId: string;
  scope: RegionScope;
  role: CampaignMemberRole | null;
  perspective: 'party' | 'dm';
  capturedAtEpochMinute: bigint;
}): Promise<RegionSnapshotPayloadV1> {
  const dateParts = await resolveCampaignChronologyNow(input.campaignId);
  const ctx = buildNarrativeViewerContext({
    role:
      input.perspective === 'dm'
        ? (input.role ?? CampaignMemberRoles.GAMEMASTER)
        : CampaignMemberRoles.PARTICIPANT,
    campaignNow: { epochMinute: input.capturedAtEpochMinute, dateParts },
  });
  return buildRegionSnapshotPayload({
    campaignId: input.campaignId,
    scope: input.scope,
    ctx,
    capturedAtEpochMinute: input.capturedAtEpochMinute,
  });
}

export async function computeSinceLastVisitDiff(input: {
  campaignId: string;
  scope: RegionScope;
  role: CampaignMemberRole | null;
  audience: 'party' | 'dm';
  baselinePayload: RegionSnapshotPayloadV1;
  currentEpochMinute: bigint;
}): Promise<RegionDiffV1> {
  const live = await buildLivePayloadForDiff({
    campaignId: input.campaignId,
    scope: input.scope,
    role: input.role,
    perspective: input.audience,
    capturedAtEpochMinute: input.currentEpochMinute,
  });

  const pageIds = new Set<string>([
    input.scope.anchorLocationPageId,
    ...input.scope.locationPageIds,
  ]);
  for (const row of input.baselinePayload.facets.npcPresence) {
    pageIds.add(row.pageId);
    if (row.locationPageId) pageIds.add(row.locationPageId);
  }
  for (const row of input.baselinePayload.facets.orgStance) {
    pageIds.add(row.orgPageId);
    pageIds.add(row.targetOrgPageId);
  }

  const titleById = await loadTitleMap(input.campaignId, [...pageIds]);
  const locationLabelById = titleById;

  const diff = buildRegionDiff({
    audience: input.audience,
    baseline: input.baselinePayload,
    live,
    titleById,
    locationLabelById,
  });

  if (input.audience === 'dm' && diff.structuredDiff?.npcPresence?.moved?.length) {
    try {
      await projectMigrationFromNpcMoves(
        input.campaignId,
        diff.structuredDiff.npcPresence.moved,
        input.currentEpochMinute.toString(),
        prisma,
      );
    } catch {
      // Optional snapshot → migration projection hook.
    }
  }

  return diff;
}

export function generateCaptureSummaryLines(
  dmPayload: RegionSnapshotPayloadV1,
): string[] {
  return dmPayload.summaryLinesAtCapture ?? [];
}
