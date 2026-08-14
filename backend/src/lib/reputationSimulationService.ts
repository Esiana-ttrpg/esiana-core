import { randomUUID } from 'node:crypto';
import type { CampaignReputation, Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
  normalizeReputationNarrative,
  parseCampaignReputationState,
  serializeCampaignReputationState,
  type CampaignReputationSimulationState,
} from '../../../shared/reputationMetadata.js';
import {
  advanceFactionReputation,
  applyReputationScoresAfterAdvance,
  formatReputationAxisBand,
  getOrCreateFactionScores,
  type ReputationFactionDrivers,
} from '../../../shared/reputationSimulation.js';
import { parseHavenSimulationFromHints, formatHavenAxisBand } from '../../../shared/havenSimulation.js';
import { rowToFields } from './downtimeHavenFields.js';
import { EntityRelationKinds } from '../../../shared/entityGraph.js';
import { buildEntityCategoryWhereClause } from './wikiCategoryEntityIndex.js';

export type ReputationSimulationRunResult = {
  entitiesScanned: number;
  entitiesUpdated: number;
  eventsCreated: number;
  suggestionsCreated: number;
  partial: boolean;
};

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === 'string' && item.trim() !== '');
}

export async function ensureCampaignReputation(
  campaignId: string,
  tx?: Prisma.TransactionClient,
): Promise<CampaignReputation> {
  const db = tx ?? (await import('./prisma.js')).prisma;
  const existing = await db.campaignReputation.findUnique({
    where: { campaignId },
  });
  if (existing) return existing;

  return db.campaignReputation.create({
    data: {
      campaignId,
      simulationState: serializeCampaignReputationState({
        version: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
        factions: {},
      }) as Prisma.InputJsonValue,
      semanticsVersion: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
    },
  });
}

async function discoverWatchedFactionPageIds(
  tx: Prisma.TransactionClient,
  campaignId: string,
  state: CampaignReputationSimulationState,
): Promise<string[]> {
  const ids = new Set<string>(Object.keys(state.factions));

  const havens = await tx.downtimeHaven.findMany({
    where: { campaignId, wikiPage: { deletedAt: null } },
    select: { factionPageIds: true },
  });
  for (const haven of havens) {
    for (const id of parseStringArray(haven.factionPageIds)) {
      ids.add(id);
    }
  }

  const relations = await tx.entityRelation.findMany({
    where: {
      campaignId,
      relationKind: {
        in: [EntityRelationKinds.QUEST_FACTION, EntityRelationKinds.HAVEN_FACTION],
      },
    },
    select: { targetEntityId: true },
  });
  for (const rel of relations) {
    if (rel.targetEntityId) ids.add(rel.targetEntityId);
  }

  if (ids.size === 0) return [];

  const orgPages = await tx.wikiPage.findMany({
    where: {
      campaignId,
      id: { in: [...ids] },
      deletedAt: null,
      ...buildEntityCategoryWhereClause('organizations'),
    },
    select: { id: true },
  });

  return orgPages.map((page) => page.id);
}

type HavenFactionContext = {
  havenWikiPageId: string;
  factionPageIds: string[];
  notorietyBand: string;
};

async function loadHavenFactionContexts(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<HavenFactionContext[]> {
  const rows = await tx.downtimeHaven.findMany({
    where: { campaignId, wikiPage: { deletedAt: null } },
    select: { wikiPageId: true, factionPageIds: true, simulationHints: true },
  });

  return rows.map((row) => {
    const simulation = parseHavenSimulationFromHints(
      (row.simulationHints ?? {}) as Record<string, unknown>,
    );
    const notorietyBand = formatHavenAxisBand(
      'notoriety',
      simulation.axes.notoriety,
    ).bandLabel;
    return {
      havenWikiPageId: row.wikiPageId,
      factionPageIds: parseStringArray(row.factionPageIds),
      notorietyBand,
    };
  });
}

async function countNegativeRumorsForFaction(
  tx: Prisma.TransactionClient,
  campaignId: string,
  factionPageId: string,
): Promise<number> {
  return tx.rumorCirculation.count({
    where: {
      campaignId,
      edgeKind: 'circulation',
      targetKind: 'faction',
      targetRef: factionPageId,
      stance: { in: ['denies', 'distorts', 'satirizes'] },
      visibility: { in: ['PARTY', 'GM_ONLY'] },
    },
  });
}

async function hasStalledProjectAtFactionHaven(
  tx: Prisma.TransactionClient,
  campaignId: string,
  havenWikiPageIds: string[],
): Promise<boolean> {
  if (havenWikiPageIds.length === 0) return false;
  const count = await tx.downtimeProject.count({
    where: {
      campaignId,
      havenPageId: { in: havenWikiPageIds },
      status: { in: ['PAUSED', 'SUSPENDED'] },
      wikiPage: { deletedAt: null },
    },
  });
  return count > 0;
}

async function loadCreativeDriftPressure(
  tx: Prisma.TransactionClient,
  campaignId: string,
): Promise<number> {
  const campaign = await tx.campaign.findUnique({
    where: { id: campaignId },
    select: { creativeDriftDispositions: true },
  });
  if (!campaign?.creativeDriftDispositions) return 0;
  const raw = campaign.creativeDriftDispositions;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  return Object.keys(raw as Record<string, unknown>).length;
}

function buildDriversForFaction(
  factionPageId: string,
  havenContexts: HavenFactionContext[],
  negativeRumorCount: number,
  stalledProjectAtHaven: boolean,
  creativeDriftPressure: number,
): ReputationFactionDrivers {
  const linkedHavens = havenContexts.filter((ctx) =>
    ctx.factionPageIds.includes(factionPageId),
  );
  const havenNotorietyBand =
    linkedHavens.length > 0
      ? linkedHavens.reduce((best, ctx) => {
          const index = ['Obscure', 'Whispers', 'Known', 'Notorious', 'Infamous'].indexOf(
            ctx.notorietyBand,
          );
          const bestIndex = ['Obscure', 'Whispers', 'Known', 'Notorious', 'Infamous'].indexOf(
            best,
          );
          return index > bestIndex ? ctx.notorietyBand : best;
        }, linkedHavens[0]!.notorietyBand)
      : null;

  return {
    havenNotorietyBand,
    havenWikiPageId: linkedHavens[0]?.havenWikiPageId ?? null,
    negativeRumorCount,
    positiveProjectBoost: false,
    stalledProjectAtHaven,
    creativeDriftPressure,
  };
}

export async function runReputationSimulation(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<ReputationSimulationRunResult> {
  const deltaMinutes = BigInt(context.elapsedMinutes);
  if (deltaMinutes <= 0n) {
    return {
      entitiesScanned: 0,
      entitiesUpdated: 0,
      eventsCreated: 0,
      suggestionsCreated: 0,
      partial: false,
    };
  }

  const reputation = await ensureCampaignReputation(context.campaignId, tx);
  const state = parseCampaignReputationState(reputation.simulationState);
  const factionPageIds = await discoverWatchedFactionPageIds(
    tx,
    context.campaignId,
    state,
  );

  if (factionPageIds.length === 0) {
    return {
      entitiesScanned: 0,
      entitiesUpdated: 0,
      eventsCreated: 0,
      suggestionsCreated: 0,
      partial: false,
    };
  }

  const havenContexts = await loadHavenFactionContexts(tx, context.campaignId);
  const creativeDriftPressure = await loadCreativeDriftPressure(tx, context.campaignId);
  const batchId = context.batchId ?? context.nextEpochMinute;

  let entitiesUpdated = 0;
  let eventsCreated = 0;
  let suggestionsCreated = 0;
  const nextFactions = { ...state.factions };

  for (const factionPageId of factionPageIds) {
    const scores = getOrCreateFactionScores(nextFactions, factionPageId);
    const negativeRumorCount = await countNegativeRumorsForFaction(
      tx,
      context.campaignId,
      factionPageId,
    );
    const linkedHavenIds = havenContexts
      .filter((ctx) => ctx.factionPageIds.includes(factionPageId))
      .map((ctx) => ctx.havenWikiPageId);
    const stalledProjectAtHaven = await hasStalledProjectAtFactionHaven(
      tx,
      context.campaignId,
      linkedHavenIds,
    );

    const drivers = buildDriversForFaction(
      factionPageId,
      havenContexts,
      negativeRumorCount,
      stalledProjectAtHaven,
      creativeDriftPressure,
    );

    const result = advanceFactionReputation({
      factionPageId,
      scores,
      elapsedMinutes: deltaMinutes,
      advanceMagnitude: context.advanceMagnitude,
      drivers,
      batchId,
    });

    const nextScores = applyReputationScoresAfterAdvance(
      result.nextScores,
      context.nextEpochMinute,
    );

    const stateChanged =
      nextScores.trust !== scores.trust ||
      nextScores.notoriety !== scores.notoriety ||
      nextScores.lastSimulatedAtEpochMinute !== scores.lastSimulatedAtEpochMinute;

    for (const autoEvent of result.autoEvents) {
      await tx.campaignReputationEvent.create({
        data: {
          campaignId: context.campaignId,
          reputationId: reputation.id,
          factionPageId: autoEvent.factionPageId,
          eventKind: autoEvent.eventKind,
          axis: autoEvent.axis,
          direction: autoEvent.direction,
          fromBand: autoEvent.fromBand,
          toBand: autoEvent.toBand,
          title: autoEvent.title,
          narrative: normalizeReputationNarrative(autoEvent.narrative),
          occurredAtEpochMinute: BigInt(context.nextEpochMinute),
          sourceType: autoEvent.sourceType,
          sourceRef: autoEvent.sourceRef,
          projectId: autoEvent.projectId ?? null,
          havenWikiPageId: autoEvent.havenWikiPageId ?? null,
        },
      });
      eventsCreated += 1;
    }

    for (const suggestion of result.pendingSuggestions) {
      const existing = await tx.campaignReputationSuggestion.findUnique({
        where: {
          campaignId_idempotencyKey: {
            campaignId: context.campaignId,
            idempotencyKey: suggestion.idempotencyKey,
          },
        },
        select: { id: true },
      });
      if (existing) continue;

      await tx.campaignReputationSuggestion.create({
        data: {
          campaignId: context.campaignId,
          reputationId: reputation.id,
          status: 'pending',
          kind: suggestion.kind,
          factionPageId: suggestion.factionPageId,
          axis: suggestion.axis,
          direction: suggestion.direction,
          fromBand: suggestion.fromBand,
          toBand: suggestion.toBand,
          title: suggestion.title,
          narrative: normalizeReputationNarrative(suggestion.narrative),
          occurredAtEpochMinute: BigInt(context.nextEpochMinute),
          sourceType: suggestion.sourceType,
          sourceRef: suggestion.sourceRef,
          idempotencyKey: suggestion.idempotencyKey,
          projectId: suggestion.projectId ?? null,
          havenWikiPageId: suggestion.havenWikiPageId ?? null,
          claimId: suggestion.claimId ?? null,
          targetOrgPageId: suggestion.targetOrgPageId ?? null,
          proposedTrust: suggestion.proposedTrust,
          proposedNotoriety: suggestion.proposedNotoriety,
        },
      });
      suggestionsCreated += 1;
    }

    if (stateChanged || result.autoEvents.length > 0 || result.pendingSuggestions.length > 0) {
      nextFactions[factionPageId] = nextScores;
      entitiesUpdated += 1;
    }
  }

  if (entitiesUpdated > 0) {
    await tx.campaignReputation.update({
      where: { id: reputation.id },
      data: {
        simulationState: serializeCampaignReputationState({
          version: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
          factions: nextFactions,
        }) as Prisma.InputJsonValue,
      },
    });
  }

  return {
    entitiesScanned: factionPageIds.length,
    entitiesUpdated,
    eventsCreated,
    suggestionsCreated,
    partial: false,
  };
}

export async function emitProjectReputationOutcome(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    factionPageId: string;
    projectId: string;
    description: string;
    atEpochMinute: string;
    sourceRef: string;
  },
): Promise<void> {
  const reputation = await ensureCampaignReputation(input.campaignId, tx);
  const state = parseCampaignReputationState(reputation.simulationState);
  const scores = getOrCreateFactionScores(state.factions, input.factionPageId);
  const fromBand = formatReputationAxisBand('trust', scores.trust).bandLabel;
  const nextTrust = Math.min(100, scores.trust + 8);
  const toBand = formatReputationAxisBand('trust', nextTrust).bandLabel;
  const direction = nextTrust > scores.trust ? 'up' : nextTrust < scores.trust ? 'down' : 'flat';

  const nextFactions = {
    ...state.factions,
    [input.factionPageId]: {
      trust: nextTrust,
      notoriety: scores.notoriety,
      lastSimulatedAtEpochMinute: input.atEpochMinute,
    },
  };

  await tx.campaignReputation.update({
    where: { id: reputation.id },
    data: {
      simulationState: serializeCampaignReputationState({
        version: CAMPAIGN_REPUTATION_SEMANTICS_VERSION,
        factions: nextFactions,
      }) as Prisma.InputJsonValue,
    },
  });

  await tx.campaignReputationEvent.create({
    data: {
      id: randomUUID(),
      campaignId: input.campaignId,
      reputationId: reputation.id,
      factionPageId: input.factionPageId,
      eventKind: 'project_outcome',
      axis: 'trust',
      direction,
      fromBand,
      toBand,
      title: toBand,
      narrative: normalizeReputationNarrative(input.description),
      occurredAtEpochMinute: BigInt(input.atEpochMinute),
      sourceType: 'project_outcome',
      sourceRef: input.sourceRef,
      projectId: input.projectId,
    },
  });
}
