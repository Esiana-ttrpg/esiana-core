import { randomUUID } from 'node:crypto';
import type {
  EntityHistoricalAlias,
  LoreClaim,
  LoreClaimSource,
  LoreInterpretationAccount,
  LoreInterpretationGroup,
  Prisma,
} from '@prisma/client';
import { prisma } from './prisma.js';
import { assertScopedMutationCount } from './scopedMutation.js';
import {
  normalizeChronologyDate,
  normalizeRelationVisibility,
  normalizeStringArray,
  normalizeNullableText,
  isRelationVisibleToViewer,
  type RelationVisibility,
} from './entityRelationTypes.js';
import { isElevatedWikiRole } from './wikiLinkService.js';
import { ContentRevelationStates } from '../../../shared/contentPresence.js';
import {
  buildPageDiscoveryMap,
  buildPagePresenceMetaMap,
  projectPageVisibilityFromMap,
  resolveCampaignNowEpochMinute,
} from './discoveryProjectionService.js';
import {
  AliasUsageTypes,
  LoreAccountKinds,
  LoreConfidences,
  ClaimSourceRoles,
  LoreSourceTypes,
  LoreSourceEntityTypes,
  NarrativeWeights,
  KnowledgeStates,
  buildEntityHistoricalNameProjection,
  type EntityHistoricalAliasRecord,
  type LoreInterpretationAccountRecord,
  type LoreClaimRecord,
  type LoreClaimSourceRecord,
  type LoreInterpretationGroupRecord,
  type ChronologyDateParts,
  type InterpretiveLoreSummary,
} from '../../../shared/loreKnowledge.js';
import {
  RevelationSourceTypes,
  computeIsContested,
  computePartyKnowledgeGroups,
  filterClaimsForPartyKnowledge,
  projectDiscoveryState,
  serializeClaimRevelation,
  type PartyKnowledgeProjection,
} from '../../../shared/discoveryProjection.js';

type Tx = Prisma.TransactionClient;

function normalizeUsageType(raw: unknown): string {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (Object.values(AliasUsageTypes).includes(upper as (typeof AliasUsageTypes)[keyof typeof AliasUsageTypes])) {
      return upper;
    }
  }
  return AliasUsageTypes.OFFICIAL;
}

function normalizeAccountKind(raw: unknown): string {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (Object.values(LoreAccountKinds).includes(upper as (typeof LoreAccountKinds)[keyof typeof LoreAccountKinds])) {
      return upper;
    }
  }
  return LoreAccountKinds.UNVERIFIED;
}

function normalizeConfidence(raw: unknown): string {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (Object.values(LoreConfidences).includes(upper as (typeof LoreConfidences)[keyof typeof LoreConfidences])) {
      return upper;
    }
  }
  return LoreConfidences.UNVERIFIED;
}

function normalizeSourceRole(raw: unknown): string {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (Object.values(ClaimSourceRoles).includes(upper as (typeof ClaimSourceRoles)[keyof typeof ClaimSourceRoles])) {
      return upper;
    }
  }
  return ClaimSourceRoles.SUPPORTS;
}

function normalizeSourceType(raw: unknown): string {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if (Object.values(LoreSourceTypes).includes(upper as (typeof LoreSourceTypes)[keyof typeof LoreSourceTypes])) {
      return upper;
    }
  }
  return LoreSourceTypes.OTHER;
}

function normalizeSourceEntityType(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const upper = raw.trim().toUpperCase();
  if (Object.values(LoreSourceEntityTypes).includes(upper as (typeof LoreSourceEntityTypes)[keyof typeof LoreSourceEntityTypes])) {
    return upper;
  }
  return null;
}

function normalizeNarrativeWeight(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const upper = raw.trim().toUpperCase();
  if (Object.values(NarrativeWeights).includes(upper as (typeof NarrativeWeights)[keyof typeof NarrativeWeights])) {
    return upper;
  }
  return null;
}

function normalizeKnowledgeState(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const upper = raw.trim().toUpperCase();
  if (Object.values(KnowledgeStates).includes(upper as (typeof KnowledgeStates)[keyof typeof KnowledgeStates])) {
    return upper;
  }
  return null;
}

function normalizeRevelationViaType(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const upper = raw.trim().toUpperCase();
  if (
    Object.values(RevelationSourceTypes).includes(
      upper as (typeof RevelationSourceTypes)[keyof typeof RevelationSourceTypes],
    )
  ) {
    return upper;
  }
  return null;
}

function resolveClaimRevelationWrite(input: {
  body: Record<string, unknown>;
  previousKnowledgeState?: string | null;
  nextKnowledgeState?: string | null;
}): {
  discoveredAt?: Date;
  discoveredViaType?: string | null;
  discoveredViaSessionId?: string | null;
  discoveredViaRef?: string | null;
} {
  const sessionId = normalizeNullableText(input.body.discoveredViaSessionId);
  const viaType =
    normalizeRevelationViaType(input.body.discoveredViaType)
    ?? (sessionId ? RevelationSourceTypes.SESSION : null);
  const viaRef = normalizeNullableText(input.body.discoveredViaRef);

  const prev = input.previousKnowledgeState;
  const next = input.nextKnowledgeState ?? prev;
  const wasUndiscovered =
    !prev || prev === KnowledgeStates.UNDISCOVERED;
  const nowDiscovered =
    next != null && next !== KnowledgeStates.UNDISCOVERED;

  const patch: {
    discoveredAt?: Date;
    discoveredViaType?: string | null;
    discoveredViaSessionId?: string | null;
    discoveredViaRef?: string | null;
  } = {};

  if (viaType) patch.discoveredViaType = viaType;
  if (sessionId !== undefined && input.body.discoveredViaSessionId !== undefined) {
    patch.discoveredViaSessionId = sessionId;
  } else if (sessionId && viaType === RevelationSourceTypes.SESSION) {
    patch.discoveredViaSessionId = sessionId;
  }
  if (input.body.discoveredViaRef !== undefined) {
    patch.discoveredViaRef = viaRef;
  } else if (viaRef && viaType && viaType !== RevelationSourceTypes.SESSION) {
    patch.discoveredViaRef = viaRef;
  }

  if (wasUndiscovered && nowDiscovered) {
    patch.discoveredAt = new Date();
    if (!patch.discoveredViaType) {
      patch.discoveredViaType = RevelationSourceTypes.MANUAL;
    }
  }

  return patch;
}

export function serializeHistoricalAlias(row: EntityHistoricalAlias): EntityHistoricalAliasRecord {
  return {
    id: row.id,
    stableKey: row.stableKey,
    pageId: row.pageId,
    campaignId: row.campaignId,
    name: row.name,
    label: row.label,
    context: row.context,
    usageType: row.usageType as EntityHistoricalAliasRecord['usageType'],
    eraStart: normalizeChronologyDate(row.eraStart),
    eraEnd: normalizeChronologyDate(row.eraEnd),
    regions: normalizeStringArray(row.regions),
    visibility: row.visibility as RelationVisibility,
    isPrimaryInEra: row.isPrimaryInEra,
    isSecret: row.isSecret,
    playerDiscoverable: row.playerDiscoverable,
    sortOrder: row.sortOrder,
  };
}

export function serializeInterpretationGroup(
  row: LoreInterpretationGroup,
): LoreInterpretationGroupRecord {
  return {
    id: row.id,
    pageId: row.pageId,
    campaignId: row.campaignId,
    topic: row.topic,
    sortOrder: row.sortOrder,
  };
}

function stripGmResolution<T extends { gmResolution?: string | null }>(
  row: T,
  isElevated: boolean,
): T {
  if (isElevated) return row;
  return { ...row, gmResolution: null };
}

export function serializeInterpretationAccount(
  row: LoreInterpretationAccount,
  isElevated: boolean,
): LoreInterpretationAccountRecord {
  return stripGmResolution(
    {
      id: row.id,
      stableKey: row.stableKey,
      pageId: row.pageId,
      campaignId: row.campaignId,
      interpretationGroupId: row.interpretationGroupId,
      title: row.title,
      narrative: row.narrative,
      accountKind: row.accountKind as LoreInterpretationAccountRecord['accountKind'],
      beliefRegion: row.beliefRegion,
      sourceOrigin: row.sourceOrigin,
      confidence: row.confidence as LoreInterpretationAccountRecord['confidence'],
      visibility: row.visibility as RelationVisibility,
      narrativeWeight: (row.narrativeWeight as LoreInterpretationAccountRecord['narrativeWeight']) ?? null,
      gmResolution: row.gmResolution,
      sortOrder: row.sortOrder,
    },
    isElevated,
  );
}

export function serializeLoreClaim(
  row: LoreClaim,
  isElevated: boolean,
): LoreClaimRecord {
  const revelation = serializeClaimRevelation({
    discoveredAt: row.discoveredAt,
    discoveredViaType: row.discoveredViaType,
    discoveredViaSessionId: row.discoveredViaSessionId,
    discoveredViaRef: row.discoveredViaRef,
  });
  return stripGmResolution(
    {
      id: row.id,
      stableKey: row.stableKey,
      pageId: row.pageId,
      campaignId: row.campaignId,
      statement: row.statement,
      interpretationGroupId: row.interpretationGroupId,
      confidence: row.confidence as LoreClaimRecord['confidence'],
      visibility: row.visibility as RelationVisibility,
      narrativeWeight: (row.narrativeWeight as LoreClaimRecord['narrativeWeight']) ?? null,
      gmResolution: row.gmResolution,
      knowledgeState: (row.knowledgeState as LoreClaimRecord['knowledgeState']) ?? null,
      discoveredViaSessionId: row.discoveredViaSessionId,
      discoveredViaType: row.discoveredViaType,
      discoveredViaRef: row.discoveredViaRef,
      discoveredAt: row.discoveredAt?.toISOString() ?? null,
      revelation,
      sortOrder: row.sortOrder,
    },
    isElevated,
  );
}

export function serializeClaimSource(row: LoreClaimSource): LoreClaimSourceRecord {
  return {
    id: row.id,
    claimId: row.claimId,
    role: row.role as LoreClaimSourceRecord['role'],
    sourceType: row.sourceType as LoreClaimSourceRecord['sourceType'],
    sourceEntityType: (row.sourceEntityType as LoreClaimSourceRecord['sourceEntityType']) ?? null,
    sourceEntityId: row.sourceEntityId,
    label: row.label,
    note: row.note,
    visibility: row.visibility as RelationVisibility,
  };
}

function filterByVisibility<T extends { visibility: RelationVisibility }>(
  rows: T[],
  role: string | null,
): T[] {
  const isElevated = isElevatedWikiRole(role);
  return rows.filter((row) =>
    isRelationVisibleToViewer(row.visibility, isElevated),
  );
}

export async function assertWikiPageInCampaign(
  campaignId: string,
  pageId: string,
): Promise<{ id: string; title: string } | null> {
  return prisma.wikiPage.findFirst({
    where: { id: pageId, campaignId, deletedAt: null },
    select: { id: true, title: true },
  });
}

export async function listHistoricalAliases(
  campaignId: string,
  pageId: string,
  role: string | null,
): Promise<EntityHistoricalAliasRecord[]> {
  const rows = await prisma.entityHistoricalAlias.findMany({
    where: { campaignId, pageId },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return filterByVisibility(
    rows.map(serializeHistoricalAlias),
    role,
  );
}

export async function createHistoricalAlias(
  campaignId: string,
  pageId: string,
  body: Record<string, unknown>,
): Promise<EntityHistoricalAliasRecord> {
  const eraStart = normalizeChronologyDate(body.eraStart);
  const eraEnd = normalizeChronologyDate(body.eraEnd);
  const created = await prisma.entityHistoricalAlias.create({
    data: {
      stableKey: randomUUID(),
      campaignId,
      pageId,
      name: String(body.name ?? '').trim(),
      label: normalizeNullableText(body.label),
      context: normalizeNullableText(body.context),
      usageType: normalizeUsageType(body.usageType),
      eraStart: eraStart
        ? (eraStart as unknown as Prisma.InputJsonValue)
        : undefined,
      eraEnd: eraEnd ? (eraEnd as unknown as Prisma.InputJsonValue) : undefined,
      regions: normalizeStringArray(body.regions),
      visibility: normalizeRelationVisibility(body.visibility),
      isPrimaryInEra: Boolean(body.isPrimaryInEra),
      isSecret: Boolean(body.isSecret),
      playerDiscoverable: body.playerDiscoverable !== false,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    },
  });
  return serializeHistoricalAlias(created);
}

export async function updateHistoricalAlias(
  campaignId: string,
  aliasId: string,
  body: Record<string, unknown>,
): Promise<EntityHistoricalAliasRecord | null> {
  const existing = await prisma.entityHistoricalAlias.findFirst({
    where: { id: aliasId, campaignId },
  });
  if (!existing) return null;

  const aliasData = {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.label !== undefined ? { label: normalizeNullableText(body.label) } : {}),
      ...(body.context !== undefined ? { context: normalizeNullableText(body.context) } : {}),
      ...(body.usageType !== undefined ? { usageType: normalizeUsageType(body.usageType) } : {}),
      ...(body.eraStart !== undefined
        ? {
            eraStart: normalizeChronologyDate(body.eraStart) as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(body.eraEnd !== undefined
        ? {
            eraEnd: normalizeChronologyDate(body.eraEnd) as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(body.regions !== undefined ? { regions: normalizeStringArray(body.regions) } : {}),
      ...(body.visibility !== undefined
        ? { visibility: normalizeRelationVisibility(body.visibility) }
        : {}),
      ...(body.isPrimaryInEra !== undefined
        ? { isPrimaryInEra: Boolean(body.isPrimaryInEra) }
        : {}),
      ...(body.isSecret !== undefined ? { isSecret: Boolean(body.isSecret) } : {}),
      ...(body.playerDiscoverable !== undefined
        ? { playerDiscoverable: Boolean(body.playerDiscoverable) }
        : {}),
      ...(body.sortOrder !== undefined && typeof body.sortOrder === 'number'
        ? { sortOrder: body.sortOrder }
        : {}),
    };
  const aliasUpdateResult = await prisma.entityHistoricalAlias.updateMany({
    where: { id: aliasId, campaignId },
    data: aliasData,
  });
  assertScopedMutationCount(aliasUpdateResult.count);
  const updated = await prisma.entityHistoricalAlias.findFirst({
    where: { id: aliasId, campaignId },
  });
  if (!updated) return null;
  return serializeHistoricalAlias(updated);
}

export async function deleteHistoricalAlias(
  campaignId: string,
  aliasId: string,
): Promise<boolean> {
  const result = await prisma.entityHistoricalAlias.deleteMany({
    where: { id: aliasId, campaignId },
  });
  return result.count > 0;
}

export async function buildInterpretiveSummary(
  campaignId: string,
  pageId: string,
  pageTitle: string,
  role: string | null,
  viewDate: ChronologyDateParts,
): Promise<InterpretiveLoreSummary & { nameProjection: ReturnType<typeof buildEntityHistoricalNameProjection> }> {
  const isElevated = isElevatedWikiRole(role);
  const aliases = await listHistoricalAliases(campaignId, pageId, role);
  const nameProjection = buildEntityHistoricalNameProjection(
    pageTitle,
    aliases,
    viewDate,
  );

  const accounts = filterByVisibility(
    (
      await prisma.loreInterpretationAccount.findMany({
        where: { campaignId, pageId },
      })
    ).map((row) => serializeInterpretationAccount(row, isElevated)),
    role,
  );

  const claims = filterByVisibility(
    (
      await prisma.loreClaim.findMany({
        where: { campaignId, pageId },
        include: { sources: true },
      })
    ).map((row) => serializeLoreClaim(row, isElevated)),
    role,
  );

  const accountKinds = new Set(accounts.map((a) => a.accountKind));
  const disputed =
    accounts.length >= 2 && accountKinds.size > 1
      || accounts.some((a) => a.confidence === LoreConfidences.CONTESTED)
      || claims.some((c) => c.confidence === LoreConfidences.CONTESTED);

  const hasPartial =
    claims.some((c) => c.confidence === LoreConfidences.PARTIAL)
    || accounts.some((a) => a.confidence === LoreConfidences.PARTIAL);

  let confidenceLabel: string | null = null;
  if (claims.some((c) => c.confidence === LoreConfidences.VERIFIED)) {
    confidenceLabel = 'Verified';
  } else if (hasPartial) {
    confidenceLabel = 'Partially Verified';
  } else if (disputed) {
    confidenceLabel = 'Contested';
  }

  const isContested = computeIsContested(claims, accounts);

  return {
    formerChip: nameProjection.formerChip,
    disputed,
    isContested,
    confidenceLabel,
    partialVerification: hasPartial,
    nameProjection,
  };
}

export async function listInterpretationBundle(
  campaignId: string,
  pageId: string,
  role: string | null,
): Promise<{
  groups: LoreInterpretationGroupRecord[];
  accounts: LoreInterpretationAccountRecord[];
}> {
  const isElevated = isElevatedWikiRole(role);
  const groups = (
    await prisma.loreInterpretationGroup.findMany({
      where: { campaignId, pageId },
      orderBy: [{ sortOrder: 'asc' }, { topic: 'asc' }],
    })
  ).map(serializeInterpretationGroup);

  const accounts = filterByVisibility(
    (
      await prisma.loreInterpretationAccount.findMany({
        where: { campaignId, pageId },
        orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
      })
    ).map((row) => serializeInterpretationAccount(row, isElevated)),
    role,
  );

  return { groups, accounts };
}

export async function createInterpretationGroup(
  campaignId: string,
  pageId: string,
  body: Record<string, unknown>,
): Promise<LoreInterpretationGroupRecord> {
  const created = await prisma.loreInterpretationGroup.create({
    data: {
      campaignId,
      pageId,
      topic: normalizeNullableText(body.topic),
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    },
  });
  return serializeInterpretationGroup(created);
}

export async function updateInterpretationGroup(
  campaignId: string,
  groupId: string,
  body: Record<string, unknown>,
): Promise<LoreInterpretationGroupRecord | null> {
  const existing = await prisma.loreInterpretationGroup.findFirst({
    where: { id: groupId, campaignId },
  });
  if (!existing) return null;
  const groupData = {
      ...(body.topic !== undefined ? { topic: normalizeNullableText(body.topic) } : {}),
      ...(body.sortOrder !== undefined && typeof body.sortOrder === 'number'
        ? { sortOrder: body.sortOrder }
        : {}),
    };
  const groupUpdateResult = await prisma.loreInterpretationGroup.updateMany({
    where: { id: groupId, campaignId },
    data: groupData,
  });
  assertScopedMutationCount(groupUpdateResult.count);
  const updated = await prisma.loreInterpretationGroup.findFirst({
    where: { id: groupId, campaignId },
  });
  if (!updated) return null;
  return serializeInterpretationGroup(updated);
}

export async function deleteInterpretationGroup(
  campaignId: string,
  groupId: string,
): Promise<boolean> {
  const result = await prisma.loreInterpretationGroup.deleteMany({
    where: { id: groupId, campaignId },
  });
  return result.count > 0;
}

export async function createInterpretationAccount(
  campaignId: string,
  pageId: string,
  body: Record<string, unknown>,
): Promise<LoreInterpretationAccountRecord> {
  const created = await prisma.loreInterpretationAccount.create({
    data: {
      stableKey: randomUUID(),
      campaignId,
      pageId,
      interpretationGroupId: normalizeNullableText(body.interpretationGroupId),
      title: String(body.title ?? '').trim(),
      narrative: String(body.narrative ?? '').trim(),
      accountKind: normalizeAccountKind(body.accountKind),
      beliefRegion: normalizeNullableText(body.beliefRegion),
      sourceOrigin: normalizeNullableText(body.sourceOrigin),
      confidence: normalizeConfidence(body.confidence),
      visibility: normalizeRelationVisibility(body.visibility),
      narrativeWeight: normalizeNarrativeWeight(body.narrativeWeight),
      gmResolution: normalizeNullableText(body.gmResolution),
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
    },
  });
  return serializeInterpretationAccount(created, true);
}

export async function updateInterpretationAccount(
  campaignId: string,
  accountId: string,
  body: Record<string, unknown>,
): Promise<LoreInterpretationAccountRecord | null> {
  const existing = await prisma.loreInterpretationAccount.findFirst({
    where: { id: accountId, campaignId },
  });
  if (!existing) return null;
  const accountData = {
      ...(body.interpretationGroupId !== undefined
        ? { interpretationGroupId: normalizeNullableText(body.interpretationGroupId) }
        : {}),
      ...(body.title !== undefined ? { title: String(body.title).trim() } : {}),
      ...(body.narrative !== undefined ? { narrative: String(body.narrative).trim() } : {}),
      ...(body.accountKind !== undefined
        ? { accountKind: normalizeAccountKind(body.accountKind) }
        : {}),
      ...(body.beliefRegion !== undefined
        ? { beliefRegion: normalizeNullableText(body.beliefRegion) }
        : {}),
      ...(body.sourceOrigin !== undefined
        ? { sourceOrigin: normalizeNullableText(body.sourceOrigin) }
        : {}),
      ...(body.confidence !== undefined
        ? { confidence: normalizeConfidence(body.confidence) }
        : {}),
      ...(body.visibility !== undefined
        ? { visibility: normalizeRelationVisibility(body.visibility) }
        : {}),
      ...(body.narrativeWeight !== undefined
        ? { narrativeWeight: normalizeNarrativeWeight(body.narrativeWeight) }
        : {}),
      ...(body.gmResolution !== undefined
        ? { gmResolution: normalizeNullableText(body.gmResolution) }
        : {}),
      ...(body.sortOrder !== undefined && typeof body.sortOrder === 'number'
        ? { sortOrder: body.sortOrder }
        : {}),
    };
  const accountUpdateResult = await prisma.loreInterpretationAccount.updateMany({
    where: { id: accountId, campaignId },
    data: accountData,
  });
  assertScopedMutationCount(accountUpdateResult.count);
  const updated = await prisma.loreInterpretationAccount.findFirst({
    where: { id: accountId, campaignId },
  });
  if (!updated) return null;
  return serializeInterpretationAccount(updated, true);
}

export async function deleteInterpretationAccount(
  campaignId: string,
  accountId: string,
): Promise<boolean> {
  const result = await prisma.loreInterpretationAccount.deleteMany({
    where: { id: accountId, campaignId },
  });
  return result.count > 0;
}

export async function listLoreClaims(
  campaignId: string,
  pageId: string,
  role: string | null,
): Promise<Array<LoreClaimRecord & { sources: LoreClaimSourceRecord[] }>> {
  const isElevated = isElevatedWikiRole(role);
  const rows = await prisma.loreClaim.findMany({
    where: { campaignId, pageId },
    include: { sources: { orderBy: { createdAt: 'asc' } } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  return filterByVisibility(
    filterClaimsForPartyKnowledge(
      rows.map((row) => ({
        ...serializeLoreClaim(row, isElevated),
        sources: filterByVisibility(
          row.sources.map(serializeClaimSource),
          role,
        ),
      })),
      isElevated,
    ),
    role,
  ) as Array<LoreClaimRecord & { sources: LoreClaimSourceRecord[] }>;
}

export async function createLoreClaim(
  campaignId: string,
  pageId: string,
  body: Record<string, unknown>,
): Promise<LoreClaimRecord & { sources: LoreClaimSourceRecord[] }> {
  const sourcesInput = Array.isArray(body.sources) ? body.sources : [];
  const knowledgeState = normalizeKnowledgeState(body.knowledgeState);
  const revelationPatch = resolveClaimRevelationWrite({
    body,
    nextKnowledgeState: knowledgeState,
  });
  const created = await prisma.loreClaim.create({
    data: {
      stableKey: randomUUID(),
      campaignId,
      pageId,
      statement: String(body.statement ?? '').trim(),
      interpretationGroupId: normalizeNullableText(body.interpretationGroupId),
      confidence: normalizeConfidence(body.confidence),
      visibility: normalizeRelationVisibility(body.visibility),
      narrativeWeight: normalizeNarrativeWeight(body.narrativeWeight),
      gmResolution: normalizeNullableText(body.gmResolution),
      knowledgeState,
      discoveredViaSessionId: revelationPatch.discoveredViaSessionId
        ?? normalizeNullableText(body.discoveredViaSessionId),
      discoveredViaType: revelationPatch.discoveredViaType ?? null,
      discoveredViaRef: revelationPatch.discoveredViaRef ?? null,
      discoveredAt: revelationPatch.discoveredAt ?? null,
      sortOrder: typeof body.sortOrder === 'number' ? body.sortOrder : 0,
      sources: {
        create: sourcesInput.map((raw) => {
          const entry = raw as Record<string, unknown>;
          return {
            role: normalizeSourceRole(entry.role),
            sourceType: normalizeSourceType(entry.sourceType),
            sourceEntityType: normalizeSourceEntityType(entry.sourceEntityType),
            sourceEntityId: normalizeNullableText(entry.sourceEntityId),
            label: normalizeNullableText(entry.label),
            note: normalizeNullableText(entry.note),
            visibility: normalizeRelationVisibility(entry.visibility),
          };
        }),
      },
    },
    include: { sources: true },
  });
  return {
    ...serializeLoreClaim(created, true),
    sources: created.sources.map(serializeClaimSource),
  };
}

export async function updateLoreClaim(
  campaignId: string,
  claimId: string,
  body: Record<string, unknown>,
): Promise<(LoreClaimRecord & { sources: LoreClaimSourceRecord[] }) | null> {
  const existing = await prisma.loreClaim.findFirst({
    where: { id: claimId, campaignId },
  });
  if (!existing) return null;

  const nextKnowledgeState =
    body.knowledgeState !== undefined
      ? normalizeKnowledgeState(body.knowledgeState)
      : existing.knowledgeState;
  const revelationPatch = resolveClaimRevelationWrite({
    body,
    previousKnowledgeState: existing.knowledgeState,
    nextKnowledgeState,
  });

  const claimData = {
      ...(body.statement !== undefined ? { statement: String(body.statement).trim() } : {}),
      ...(body.interpretationGroupId !== undefined
        ? { interpretationGroupId: normalizeNullableText(body.interpretationGroupId) }
        : {}),
      ...(body.confidence !== undefined
        ? { confidence: normalizeConfidence(body.confidence) }
        : {}),
      ...(body.visibility !== undefined
        ? { visibility: normalizeRelationVisibility(body.visibility) }
        : {}),
      ...(body.narrativeWeight !== undefined
        ? { narrativeWeight: normalizeNarrativeWeight(body.narrativeWeight) }
        : {}),
      ...(body.gmResolution !== undefined
        ? { gmResolution: normalizeNullableText(body.gmResolution) }
        : {}),
      ...(body.knowledgeState !== undefined
        ? { knowledgeState: normalizeKnowledgeState(body.knowledgeState) }
        : {}),
      ...(body.discoveredViaSessionId !== undefined
        ? { discoveredViaSessionId: normalizeNullableText(body.discoveredViaSessionId) }
        : {}),
      ...(body.discoveredViaType !== undefined
        ? { discoveredViaType: normalizeRevelationViaType(body.discoveredViaType) }
        : {}),
      ...(body.discoveredViaRef !== undefined
        ? { discoveredViaRef: normalizeNullableText(body.discoveredViaRef) }
        : {}),
      ...(revelationPatch.discoveredAt
        ? { discoveredAt: revelationPatch.discoveredAt }
        : {}),
      ...(revelationPatch.discoveredViaType && body.knowledgeState !== undefined
        ? { discoveredViaType: revelationPatch.discoveredViaType }
        : {}),
      ...(body.sortOrder !== undefined && typeof body.sortOrder === 'number'
        ? { sortOrder: body.sortOrder }
        : {}),
    };
  const claimUpdateResult = await prisma.loreClaim.updateMany({
    where: { id: claimId, campaignId },
    data: claimData,
  });
  assertScopedMutationCount(claimUpdateResult.count);

  if (Array.isArray(body.sources)) {
    await prisma.loreClaimSource.deleteMany({ where: { claimId } });
    await prisma.loreClaimSource.createMany({
      data: body.sources.map((raw) => {
        const entry = raw as Record<string, unknown>;
        return {
          claimId,
          role: normalizeSourceRole(entry.role),
          sourceType: normalizeSourceType(entry.sourceType),
          sourceEntityType: normalizeSourceEntityType(entry.sourceEntityType),
          sourceEntityId: normalizeNullableText(entry.sourceEntityId),
          label: normalizeNullableText(entry.label),
          note: normalizeNullableText(entry.note),
          visibility: normalizeRelationVisibility(entry.visibility),
        };
      }),
    });
  }

  const refreshed = await prisma.loreClaim.findFirst({
    where: { id: claimId },
    include: { sources: true },
  });
  if (!refreshed) return null;
  return {
    ...serializeLoreClaim(refreshed, true),
    sources: refreshed.sources.map(serializeClaimSource),
  };
}

export async function deleteLoreClaim(
  campaignId: string,
  claimId: string,
): Promise<boolean> {
  const result = await prisma.loreClaim.deleteMany({
    where: { id: claimId, campaignId },
  });
  return result.count > 0;
}

export type PartyKnowledgeClaim = LoreClaimRecord & {
  sources: LoreClaimSourceRecord[];
};

export type PartyKnowledgeResponse = PartyKnowledgeProjection & {
  claims: PartyKnowledgeClaim[];
  interpretations: LoreInterpretationAccountRecord[];
  availableFromEpochMinute?: number | null;
  canonDelta?: Array<{
    claimId: string;
    statement: string;
    partyState: string | null;
    gmResolution: string | null;
  }>;
};

export async function buildPartyKnowledge(
  campaignId: string,
  pageId: string,
  role: string | null,
): Promise<PartyKnowledgeResponse> {
  const isElevated = isElevatedWikiRole(role);
  const claims = await listLoreClaims(campaignId, pageId, role);
  const { accounts } = await listInterpretationBundle(campaignId, pageId, role);
  const partyClaims = filterClaimsForPartyKnowledge(claims, isElevated);
  const groups = computePartyKnowledgeGroups(partyClaims, accounts);
  const isContested = computeIsContested(partyClaims, accounts);
  const [pagePresence, pagePresenceMeta, campaignNowEpochMinute] = await Promise.all([
    buildPageDiscoveryMap(campaignId, [pageId]),
    buildPagePresenceMetaMap(campaignId, [pageId]),
    resolveCampaignNowEpochMinute(campaignId),
  ]);
  const meta = pagePresenceMeta.get(pageId);
  const discovery = projectDiscoveryState({
    presenceState: pagePresence.get(pageId) ?? meta?.state ?? ContentRevelationStates.REVEALED,
    availableFromEpochMinute: meta?.availableFromEpochMinute ?? null,
    campaignNowEpochMinute,
    claims: partyClaims,
    interpretations: accounts,
    isManagerView: isElevated,
  });
  const pageVisibility = projectPageVisibilityFromMap(
    pageId,
    pagePresence,
    isElevated,
    undefined,
    role,
  );

  const response: PartyKnowledgeResponse = {
    isDiscovered: discovery.available,
    presenceState: pageVisibility.discovery.presenceState,
    isManagerView: isElevated,
    groups,
    isContested,
    discovery,
    claims: partyClaims as PartyKnowledgeClaim[],
    interpretations: accounts,
    revelation: pageVisibility.revelation.revelation,
    availableFromEpochMinute: meta?.availableFromEpochMinute ?? null,
  };

  if (isElevated) {
    const allClaims = await prisma.loreClaim.findMany({
      where: { campaignId, pageId },
    });
    response.canonDelta = allClaims
      .filter((row) => {
        if (!row.gmResolution?.trim()) return false;
        const partyClaim = partyClaims.find((c) => c.id === row.id);
        if (!partyClaim?.knowledgeState) return true;
        return (
          row.gmResolution.trim().toLowerCase()
          !== partyClaim.knowledgeState.toLowerCase()
        );
      })
      .map((row) => ({
        claimId: row.id,
        statement: row.statement,
        partyState:
          partyClaims.find((c) => c.id === row.id)?.knowledgeState ?? null,
        gmResolution: row.gmResolution,
      }));
  }

  return response;
}

export { type Tx };
