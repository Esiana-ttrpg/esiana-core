import { randomUUID } from 'node:crypto';
import type { LoreClaim, Prisma, RumorCirculation } from '@prisma/client';
import { prisma } from './prisma.js';
import { buildEntityCategoryWhereClause } from './wikiCategoryEntityIndex.js';
import { resolveRegionScope } from './regionSnapshotService.js';
import { parseLocationMetadata } from './locationMetadata.js';
import { parseOrganizationMetadata } from './organizationMetadata.js';
import { isElevatedWikiRole } from './wikiLinkService.js';
import {
  serializeLoreClaim,
  serializeClaimSource,
  serializeInterpretationAccount,
} from './loreKnowledgeService.js';
import {
  AwarenessScopes,
  CirculationEdgeKinds,
  CirculationTargetKinds,
  CirculationVisibilities,
  type EpochMinuteString,
  type RumorCirculationRecord,
  inferAwarenessScopeForTarget,
  normalizeAwarenessScope,
  normalizeCirculationVisibility,
  normalizeRumorStance,
  type RumorStance,
  type AwarenessScope,
  type CirculationVisibility,
  type FactionProjectionScope,
  type RegionProjectionScope,
} from '../../../shared/rumorEngine.js';
import {
  assembleFactionGossipFeed,
  assembleRegionRumorFeed,
} from '../../../shared/rumorProjection.js';
import { KnowledgeStates } from '../../../shared/loreKnowledge.js';
import { RevelationSourceTypes } from '../../../shared/discoveryProjection.js';

const RUMOR_SPREAD_CATEGORY = 'Rumor spread';
const RUMOR_RETRACTION_CATEGORY = 'Rumor retraction';
const SPREAD_PAYLOAD_VERSION = 'spreadAction-v1';
const RETRACTION_PAYLOAD_VERSION = 'retraction-v1';
const MAX_CIRCULATIONS_LOAD = 500;
const MAX_CLAIMS_LOAD = 500;

export type RumorCirculationApi = RumorCirculationRecord;

export function toEpochMinuteString(value: bigint | number | string): EpochMinuteString {
  return typeof value === 'bigint' ? value.toString() : String(value);
}

export function serializeRumorCirculation(row: RumorCirculation): RumorCirculationApi {
  return {
    id: row.id,
    stableKey: row.stableKey,
    campaignId: row.campaignId,
    claimId: row.claimId,
    edgeKind: row.edgeKind as RumorCirculationApi['edgeKind'],
    targetKind: row.targetKind as RumorCirculationApi['targetKind'],
    targetRef: row.targetRef,
    stance: normalizeRumorStance(row.stance),
    awarenessScope: normalizeAwarenessScope(row.awarenessScope),
    visibility: normalizeCirculationVisibility(row.visibility),
    spreadEventId: row.spreadEventId,
    circulatedAtEpochMinute: toEpochMinuteString(row.circulatedAtEpochMinute),
    supersedesCirculationId: row.supersedesCirculationId,
  };
}

async function getCampaignEpochMinute(campaignId: string): Promise<bigint> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  return campaign?.currentEpochMinute ?? 0n;
}

async function resolveMasterCalendarId(campaignId: string): Promise<string | null> {
  const cal = await prisma.fantasyCalendar.findFirst({
    where: { campaignId },
    orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
    select: { id: true },
  });
  return cal?.id ?? null;
}

async function ensureEventCategory(
  campaignId: string,
  name: string,
): Promise<string> {
  const existing = await prisma.calendarEventCategory.findFirst({
    where: { campaignId, name },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await prisma.calendarEventCategory.create({
    data: { campaignId, name, color: '#6b7280' },
  });
  return created.id;
}

async function buildRegionProjectionScope(
  campaignId: string,
  anchorLocationPageId: string,
): Promise<RegionProjectionScope | null> {
  const base = await resolveRegionScope(campaignId, anchorLocationPageId);
  if (!base) return null;

  const locationPages = await prisma.wikiPage.findMany({
    where: { id: { in: base.locationPageIds }, campaignId, deletedAt: null },
    select: { id: true, metadata: true },
  });
  const regionNorms = new Set<string>();
  const regionKeys = new Set<string>();
  for (const lp of locationPages) {
    const m = parseLocationMetadata(lp.metadata);
    if (m.region) regionNorms.add(m.region.trim().toLowerCase());
    if (m.regionKey) regionKeys.add(m.regionKey);
  }
  if (base.regionKey) regionKeys.add(base.regionKey);

  const orgPages = await prisma.wikiPage.findMany({
    where: { campaignId, deletedAt: null, ...buildEntityCategoryWhereClause('organizations') },
    select: { id: true, metadata: true },
    take: 300,
  });
  const scopeSet = new Set(base.locationPageIds);
  const orgPageIdsInScope: string[] = [];
  for (const page of orgPages) {
    const org = parseOrganizationMetadata(page.metadata);
    let matches = false;
    if (org.headquartersId && scopeSet.has(org.headquartersId)) matches = true;
    if (!matches && org.region?.trim()) {
      const norm = org.region.trim().toLowerCase();
      if (regionNorms.has(norm)) matches = true;
    }
    if (!matches && base.regionKey && org.region === base.regionKey) matches = true;
    if (!matches && org.region && regionKeys.has(org.region)) matches = true;
    if (matches) orgPageIdsInScope.push(page.id);
  }

  return {
    anchorLocationPageId: base.anchorLocationPageId,
    regionKey: base.regionKey,
    locationPageIds: base.locationPageIds,
    regionLabels: [...regionNorms, ...regionKeys],
    orgPageIdsInScope,
  };
}

async function buildFactionProjectionScope(
  campaignId: string,
  orgPageId: string,
): Promise<FactionProjectionScope | null> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: orgPageId, campaignId, deletedAt: null, ...buildEntityCategoryWhereClause('organizations') },
    select: { id: true, metadata: true },
  });
  if (!page) return null;
  const org = parseOrganizationMetadata(page.metadata);
  const relatedOrgPageIds = [orgPageId];
  if (org.parentOrgId) relatedOrgPageIds.push(org.parentOrgId);
  return {
    orgPageId,
    orgRegion: org.region,
    relatedOrgPageIds: [...new Set(relatedOrgPageIds)],
  };
}

async function loadCirculationsForCampaign(
  campaignId: string,
  filter?: Prisma.RumorCirculationWhereInput,
): Promise<RumorCirculationApi[]> {
  const rows = await prisma.rumorCirculation.findMany({
    where: { campaignId, ...filter },
    orderBy: { circulatedAtEpochMinute: 'asc' },
    take: MAX_CIRCULATIONS_LOAD,
  });
  return rows.map(serializeRumorCirculation);
}

async function loadProjectionLoreBundle(
  campaignId: string,
  claimIds: string[],
  pageIds: string[],
  isElevated: boolean,
) {
  const claims = await prisma.loreClaim.findMany({
    where: {
      campaignId,
      OR: [
        { id: { in: claimIds.length ? claimIds : ['__none__'] } },
        { pageId: { in: pageIds.length ? pageIds : ['__none__'] } },
      ],
    },
    include: { sources: true },
    take: MAX_CLAIMS_LOAD,
  });
  const interpretations = await prisma.loreInterpretationAccount.findMany({
    where: { campaignId, pageId: { in: pageIds.length ? pageIds : ['__none__'] } },
    take: MAX_CLAIMS_LOAD,
  });
  return {
    claims: claims.map((c) => serializeLoreClaim(c, isElevated)),
    claimSources: claims.flatMap((c) =>
      c.sources.map(serializeClaimSource),
    ),
    interpretations: interpretations.map((a) =>
      serializeInterpretationAccount(a, isElevated),
    ),
  };
}

export async function projectRegionRumors(input: {
  campaignId: string;
  anchorLocationPageId: string;
  role: string | null;
  asOfEpoch?: string | null;
}) {
  const scope = await buildRegionProjectionScope(
    input.campaignId,
    input.anchorLocationPageId,
  );
  if (!scope) return null;

  const isElevated = isElevatedWikiRole(input.role);
  const epoch =
    input.asOfEpoch?.trim()
    || toEpochMinuteString(await getCampaignEpochMinute(input.campaignId));

  const regionRefs = new Set([
    scope.anchorLocationPageId,
    ...scope.locationPageIds,
  ]);
  const circulations = await loadCirculationsForCampaign(input.campaignId, {
    OR: [
      {
        targetKind: CirculationTargetKinds.REGION,
        targetRef: { in: [...regionRefs] },
      },
      {
        targetKind: CirculationTargetKinds.FACTION,
        targetRef: { in: scope.orgPageIdsInScope },
      },
    ],
  });

  const claimIds = [...new Set(circulations.map((c) => c.claimId))];
  const lore = await loadProjectionLoreBundle(
    input.campaignId,
    claimIds,
    scope.locationPageIds,
    isElevated,
  );

  const feed = assembleRegionRumorFeed({
    ctx: { asOfEpochMinute: epoch, isElevated },
    scope,
    circulations,
    claims: lore.claims,
    claimSources: lore.claimSources,
    interpretations: lore.interpretations,
  });

  return { scope, feed, circulations: isElevated ? circulations : undefined };
}

export async function projectFactionGossip(input: {
  campaignId: string;
  orgPageId: string;
  role: string | null;
  asOfEpoch?: string | null;
}) {
  const scope = await buildFactionProjectionScope(input.campaignId, input.orgPageId);
  if (!scope) return null;

  const isElevated = isElevatedWikiRole(input.role);
  const epoch =
    input.asOfEpoch?.trim()
    || toEpochMinuteString(await getCampaignEpochMinute(input.campaignId));

  const circulations = await loadCirculationsForCampaign(input.campaignId, {
    targetKind: CirculationTargetKinds.FACTION,
    targetRef: { in: scope.relatedOrgPageIds },
  });

  const claimIds = [...new Set(circulations.map((c) => c.claimId))];
  const lore = await loadProjectionLoreBundle(
    input.campaignId,
    claimIds,
    [input.orgPageId, ...scope.relatedOrgPageIds],
    isElevated,
  );

  const feed = assembleFactionGossipFeed({
    ctx: { asOfEpochMinute: epoch, isElevated },
    scope,
    circulations,
    claims: lore.claims,
    claimSources: lore.claimSources,
    interpretations: lore.interpretations,
  });

  return { scope, feed, circulations: isElevated ? circulations : undefined };
}

export async function listCirculationHistory(
  campaignId: string,
  claimId: string,
): Promise<RumorCirculationApi[]> {
  const rows = await prisma.rumorCirculation.findMany({
    where: { campaignId, claimId },
    orderBy: { circulatedAtEpochMinute: 'asc' },
  });
  return rows.map(serializeRumorCirculation);
}

type SpreadTarget = {
  kind: 'region' | 'faction';
  locationPageId?: string;
  orgPageId?: string;
};

async function resolveOrCreateClaim(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    sourceClaimId?: string;
    draft?: { statement: string; subjectPageId: string; stableKey?: string };
  },
): Promise<LoreClaim> {
  if (input.sourceClaimId) {
    const existing = await tx.loreClaim.findFirst({
      where: { id: input.sourceClaimId, campaignId: input.campaignId },
    });
    if (!existing) throw new Error('CLAIM_NOT_FOUND');
    return existing;
  }
  if (!input.draft?.statement?.trim() || !input.draft.subjectPageId) {
    throw new Error('DRAFT_REQUIRED');
  }
  const stableKey = input.draft.stableKey?.trim() || randomUUID();
  const page = await tx.wikiPage.findFirst({
    where: { id: input.draft.subjectPageId, campaignId: input.campaignId, deletedAt: null },
  });
  if (!page) throw new Error('SUBJECT_PAGE_NOT_FOUND');

  try {
    return await tx.loreClaim.create({
      data: {
        stableKey,
        campaignId: input.campaignId,
        pageId: input.draft.subjectPageId,
        statement: input.draft.statement.trim(),
        confidence: 'UNVERIFIED',
        visibility: 'GM_ONLY',
        knowledgeState: KnowledgeStates.SUSPECTED,
      },
    });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P2002') {
      const found = await tx.loreClaim.findUnique({ where: { stableKey } });
      if (found) return found;
    }
    throw err;
  }
}

function normalizeTarget(t: SpreadTarget): {
  targetKind: typeof CirculationTargetKinds.REGION | typeof CirculationTargetKinds.FACTION;
  targetRef: string;
} {
  if (t.kind === 'region' && t.locationPageId) {
    return { targetKind: CirculationTargetKinds.REGION, targetRef: t.locationPageId };
  }
  if (t.kind === 'faction' && t.orgPageId) {
    return { targetKind: CirculationTargetKinds.FACTION, targetRef: t.orgPageId };
  }
  throw new Error('INVALID_TARGET');
}

export async function executeSpreadAction(input: {
  campaignId: string;
  actorUserId: string;
  sourceClaimId?: string;
  draft?: { statement: string; subjectPageId: string; stableKey?: string };
  targets: SpreadTarget[];
  stance?: RumorStance;
  awarenessScope?: AwarenessScope;
  visibility?: CirculationVisibility;
  sessionId?: string;
}): Promise<{
  spreadEventId: string;
  circulationIds: string[];
  claimId: string;
  circulatedAtEpochMinute: EpochMinuteString;
}> {
  if (!input.targets.length) throw new Error('TARGETS_REQUIRED');

  const epoch = await getCampaignEpochMinute(input.campaignId);
  const calendarId = await resolveMasterCalendarId(input.campaignId);
  if (!calendarId) throw new Error('NO_MASTER_CALENDAR');

  const spreadBatchId = randomUUID();
  const stance = normalizeRumorStance(input.stance);
  const visibility = normalizeCirculationVisibility(input.visibility);

  return prisma.$transaction(async (tx) => {
    const claim = await resolveOrCreateClaim(tx, {
      campaignId: input.campaignId,
      sourceClaimId: input.sourceClaimId,
      draft: input.draft,
    });

    const categoryId = await ensureEventCategory(
      input.campaignId,
      RUMOR_SPREAD_CATEGORY,
    );

    const event = await tx.calendarEvent.create({
      data: {
        calendarId,
        categoryId,
        visibility: 'DM_ONLY',
        title: `Rumor spread: ${claim.statement.slice(0, 80)}`,
        description: JSON.stringify({
          version: SPREAD_PAYLOAD_VERSION,
          actorUserId: input.actorUserId,
          claimId: claim.id,
          stance,
          visibility,
          targets: input.targets,
        }),
        targetEpochMinute: epoch,
      },
    });

    const circulationIds: string[] = [];
    for (const target of input.targets) {
      const { targetKind, targetRef } = normalizeTarget(target);
      const awarenessScope = inferAwarenessScopeForTarget(
        targetKind,
        input.awarenessScope,
      );
      const stableKey = `spread:${spreadBatchId}:${targetKind}:${targetRef}`;
      let row: RumorCirculation;
      try {
        row = await tx.rumorCirculation.create({
          data: {
            stableKey,
            campaignId: input.campaignId,
            claimId: claim.id,
            edgeKind: CirculationEdgeKinds.CIRCULATION,
            targetKind,
            targetRef,
            stance,
            awarenessScope,
            visibility,
            spreadEventId: event.id,
            circulatedAtEpochMinute: epoch,
          },
        });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'P2002') {
          const existing = await tx.rumorCirculation.findUnique({
            where: { stableKey },
          });
          if (!existing) throw err;
          row = existing;
        } else {
          throw err;
        }
      }
      circulationIds.push(row.id);
    }

    if (visibility === CirculationVisibilities.PARTY) {
      const hasParty = claim.knowledgeState === KnowledgeStates.SUSPECTED
        || claim.knowledgeState === KnowledgeStates.KNOWN
        || claim.knowledgeState === KnowledgeStates.CONFIRMED;
      if (!hasParty) {
        await tx.loreClaim.update({
          where: { id: claim.id },
          data: {
            knowledgeState: KnowledgeStates.SUSPECTED,
            discoveredViaType: RevelationSourceTypes.RUMOR,
            discoveredAt: new Date(),
          },
        });
      }
    }

    return {
      spreadEventId: event.id,
      circulationIds,
      claimId: claim.id,
      circulatedAtEpochMinute: toEpochMinuteString(epoch),
    };
  });
}

export async function executeRetraction(input: {
  campaignId: string;
  actorUserId: string;
  circulationId: string;
  reason?: string;
}): Promise<{
  spreadEventId: string;
  retractionCirculationId: string;
  circulatedAtEpochMinute: EpochMinuteString;
}> {
  const epoch = await getCampaignEpochMinute(input.campaignId);
  const calendarId = await resolveMasterCalendarId(input.campaignId);
  if (!calendarId) throw new Error('NO_MASTER_CALENDAR');

  return prisma.$transaction(async (tx) => {
    const target = await tx.rumorCirculation.findFirst({
      where: {
        id: input.circulationId,
        campaignId: input.campaignId,
        edgeKind: CirculationEdgeKinds.CIRCULATION,
      },
    });
    if (!target) throw new Error('CIRCULATION_NOT_FOUND');

    const categoryId = await ensureEventCategory(
      input.campaignId,
      RUMOR_RETRACTION_CATEGORY,
    );

    const event = await tx.calendarEvent.create({
      data: {
        calendarId,
        categoryId,
        visibility: 'DM_ONLY',
        title: `Rumor retracted: ${target.id}`,
        description: JSON.stringify({
          version: RETRACTION_PAYLOAD_VERSION,
          actorUserId: input.actorUserId,
          circulationId: target.id,
          claimId: target.claimId,
          reason: input.reason ?? null,
        }),
        targetEpochMinute: epoch,
      },
    });

    const stableKey = `retract:${target.id}:${epoch.toString()}`;
    let retraction: RumorCirculation;
    try {
      retraction = await tx.rumorCirculation.create({
        data: {
          stableKey,
          campaignId: input.campaignId,
          claimId: target.claimId,
          edgeKind: CirculationEdgeKinds.RETRACTION,
          targetKind: target.targetKind,
          targetRef: target.targetRef,
          stance: target.stance,
          awarenessScope: target.awarenessScope,
          visibility: target.visibility,
          spreadEventId: event.id,
          circulatedAtEpochMinute: epoch,
          supersedesCirculationId: target.id,
        },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === 'P2002') {
        const existing = await tx.rumorCirculation.findUnique({
          where: { stableKey },
        });
        if (!existing) throw err;
        retraction = existing;
      } else {
        throw err;
      }
    }

    return {
      spreadEventId: event.id,
      retractionCirculationId: retraction.id,
      circulatedAtEpochMinute: toEpochMinuteString(epoch),
    };
  });
}
