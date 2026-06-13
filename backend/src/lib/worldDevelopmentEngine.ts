import type { Prisma } from '@prisma/client';
import type { GlobalTimeAdvanceContext } from '../../../shared/globalTimeHooks.js';
import {
  computeBudgetSlotsForAdvance,
  isWorldDevelopmentEnabled,
  normalizeDevelopmentPayload,
  PREP_CHAIN_STAGES,
  serializeDevelopmentPayload,
  shouldAutoApplySuggestion,
  type DevelopmentDependencyRef,
  type DevelopmentPayload,
  type DevelopmentRationaleLine,
  type DevelopmentType,
  type WorldDevelopmentSettings,
} from '../../../shared/worldDevelopmentMetadata.js';
import type { DevelopmentCandidate } from '../../../shared/developmentProvider.js';
import { isEligibleAdvanceMagnitudeForPrompts } from '../../../shared/worldEventSuggestionMetadata.js';
import { normalizeWorldEventNarrative } from '../../../shared/worldEventSuggestionMetadata.js';
import {
  appendBudgetRationale,
  resolveCandidatesForCampaign,
} from './developmentRegistry.js';
import { buildWorldDevelopmentContext } from './worldDevelopmentContextService.js';
import { resolveWorldDevelopmentSettings } from './worldDevelopmentSettingsService.js';
import {
  computeSuggestionExpiresAt,
  incrementPendingAdvanceCycles,
  sweepExpiredWorldDevelopments,
} from './developmentExpirationService.js';
import { markStalePendingDevelopments } from './developmentStalenessService.js';
import { hasRecentSimilarSuggestion, WORLD_EVENT_PROMPTS_HANDLER_VERSION } from './worldEventSuggestionService.js';
import { getEnabledDevelopmentPluginIds } from './developmentPluginService.js';
import { deriveConfidenceFromRationale } from '../../../shared/worldDevelopmentMetadata.js';

export const WORLD_DEVELOPMENT_ENGINE_VERSION = 'world-development-engine-v2';

function buildDependencyRefs(candidate: DevelopmentCandidate): DevelopmentDependencyRef[] {
  const refs: DevelopmentDependencyRef[] = [];
  if (candidate.primaryOrgPageId) {
    refs.push({ kind: 'org', id: candidate.primaryOrgPageId });
  }
  return refs;
}

async function isTypeCooldownSatisfied(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    orgPageId: string | null;
    developmentType: DevelopmentType;
    nextEpochMinute: string;
    settings: WorldDevelopmentSettings;
  },
): Promise<boolean> {
  const lifecycle = input.settings.typeLifecycles[input.developmentType];
  if (!lifecycle || lifecycle.cooldownMinutes <= 0) return true;

  const windowStart = BigInt(input.nextEpochMinute) - BigInt(lifecycle.cooldownMinutes);
  const recent = await tx.campaignWorldEventSuggestion.findMany({
    where: {
      campaignId: input.campaignId,
      primaryOrgPageId: input.orgPageId ?? undefined,
      status: { in: ['pending', 'accepted', 'dismissed', 'archived', 'obsolete'] },
      occurredAtEpochMinute: { gte: windowStart },
    },
    select: { developmentPayload: true },
    take: 50,
  });
  const blocked = recent.some((row) => {
    const payload = normalizeDevelopmentPayload(row.developmentPayload);
    return payload?.developmentType === input.developmentType;
  });
  return !blocked;
}

async function createSuggestionFromCandidate(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    candidate: DevelopmentCandidate;
    settings: WorldDevelopmentSettings;
    context: GlobalTimeAdvanceContext;
    rank: number;
    totalSlots: number;
    parentSuggestionId?: string | null;
    chainStage?: number;
    chainStageLabel?: string;
    chainStageCount?: number;
    occurredAtEpochMinute?: string;
  },
): Promise<boolean> {
  const { candidate } = input;
  const developmentType = candidate.developmentType;
  const lifecycle = input.settings.typeLifecycles[developmentType];
  const cooldownSatisfied = await isTypeCooldownSatisfied(tx, {
    campaignId: input.campaignId,
    orgPageId: candidate.primaryOrgPageId,
    developmentType,
    nextEpochMinute: input.context.nextEpochMinute,
    settings: input.settings,
  });
  if (!cooldownSatisfied) return false;

  const existingKey = await tx.campaignWorldEventSuggestion.findUnique({
    where: {
      campaignId_idempotencyKey: {
        campaignId: input.campaignId,
        idempotencyKey: candidate.idempotencyKey,
      },
    },
    select: { id: true },
  });
  if (existingKey) return false;

  const similar = await hasRecentSimilarSuggestion(tx, {
    campaignId: input.campaignId,
    nextEpochMinute: input.context.nextEpochMinute,
    primaryOrgPageId: candidate.primaryOrgPageId,
    momentumState: candidate.momentumState,
    eraId: candidate.eraId,
    trendDirection: candidate.trendDirection,
    kind: candidate.suggestionKind,
  });
  if (similar) return false;

  let rationale: DevelopmentRationaleLine[] = appendBudgetRationale(
    candidate.rationale,
    input.rank,
    input.totalSlots,
  );
  rationale.push({
    kind: cooldownSatisfied ? 'cooldown' : 'cooldown_blocked',
    text: cooldownSatisfied ? 'Cooldown satisfied' : 'Cooldown active — skipped similar type',
  });

  if (input.chainStageLabel) {
    rationale.unshift({
      kind: 'prep_chain',
      text: `Preparation stage ${input.chainStage ?? 1} of ${input.chainStageCount ?? 1}: ${input.chainStageLabel}`,
    });
  }

  const payload: DevelopmentPayload = {
    version: 'world-development-v1',
    developmentType,
    significance: lifecycle.significance,
    rationale,
    confidence: deriveConfidenceFromRationale(rationale),
    dependencyRefs: buildDependencyRefs(candidate),
    parentSuggestionId: input.parentSuggestionId ?? null,
    chainStage: input.chainStage ?? null,
    chainStageLabel: input.chainStageLabel ?? null,
    chainStageCount: input.chainStageCount ?? null,
    proposedAcceptTarget: candidate.proposedAcceptTarget,
    budgetAllocationRank: input.rank,
    definitionId: candidate.definitionId,
  };

  const expiresAt = computeSuggestionExpiresAt(input.settings.expiration.wallClockDays);
  const sourceRef = input.context.batchId ?? input.context.nextEpochMinute;
  const epochMinute = input.occurredAtEpochMinute ?? input.context.nextEpochMinute;

  await tx.campaignWorldEventSuggestion.create({
    data: {
      campaignId: input.campaignId,
      status: 'pending',
      kind: candidate.suggestionKind,
      title: input.chainStageLabel ?? candidate.title,
      narrative: normalizeWorldEventNarrative(candidate.narrative),
      occurredAtEpochMinute: BigInt(epochMinute),
      sourceType: 'time_hook',
      sourceRef,
      idempotencyKey: candidate.idempotencyKey,
      primaryOrgPageId: candidate.primaryOrgPageId,
      eraId: candidate.eraId,
      momentumState: candidate.momentumState,
      trendDirection: candidate.trendDirection,
      developmentPayload: serializeDevelopmentPayload(payload) as Prisma.InputJsonValue,
      expiresAt,
      parentSuggestionId: input.parentSuggestionId ?? undefined,
    },
  });

  return true;
}

export async function autoApplyEligibleSuggestions(
  campaignId: string,
  userId: string | undefined,
  settings: WorldDevelopmentSettings,
): Promise<number> {
  if (!userId || settings.mode === 'off' || settings.mode === 'manual') {
    return 0;
  }

  const pending = await (
    await import('./prisma.js')
  ).prisma.campaignWorldEventSuggestion.findMany({
    where: { campaignId, status: 'pending' },
    select: { id: true, developmentPayload: true },
  });

  const { resolveWorldDevelopmentSuggestion } = await import(
    './worldDevelopmentResolveService.js'
  );

  let resolved = 0;
  for (const row of pending) {
    const payload = normalizeDevelopmentPayload(row.developmentPayload);
    if (!payload) continue;
    if (!shouldAutoApplySuggestion(settings, payload.significance)) continue;
    await resolveWorldDevelopmentSuggestion({
      suggestionId: row.id,
      campaignId,
      campaignHandle: '',
      role: null,
      userId,
      action: 'accept',
      acceptTarget: payload.proposedAcceptTarget ?? 'calendar_event',
      autoApply: true,
    });
    resolved += 1;
  }
  return resolved;
}

export type EmitWorldDevelopmentsResult = {
  entitiesScanned: number;
  suggestionsCreated: number;
  autoResolved: number;
  paused?: boolean;
  disabled?: boolean;
  skipReason?: 'disabled' | 'paused' | 'no_pressure_signals' | 'budget_exhausted';
};

export async function emitWorldDevelopments(
  tx: Prisma.TransactionClient,
  context: GlobalTimeAdvanceContext,
): Promise<EmitWorldDevelopmentsResult> {
  await incrementPendingAdvanceCycles(tx, context.campaignId);
  await sweepExpiredWorldDevelopments(tx, context.campaignId);
  await markStalePendingDevelopments(context.campaignId, tx);

  const settings = await resolveWorldDevelopmentSettings(context.campaignId, tx);
  if (!isWorldDevelopmentEnabled(settings)) {
    return {
      entitiesScanned: 0,
      suggestionsCreated: 0,
      autoResolved: 0,
      disabled: true,
      paused: settings.worldPressurePaused === true,
      skipReason: settings.worldPressurePaused ? 'paused' : 'disabled',
    };
  }

  if (!isEligibleAdvanceMagnitudeForPrompts(context.advanceMagnitude)) {
    return { entitiesScanned: 0, suggestionsCreated: 0, autoResolved: 0 };
  }

  const wdContext = await buildWorldDevelopmentContext(context.campaignId, {
    advanceMagnitude: context.advanceMagnitude,
    nextEpochMinute: context.nextEpochMinute,
    batchId: context.batchId,
    tx,
  });

  const hasSignals =
    wdContext.projectedFactionStates.some(
      (f) => f.momentum !== 'stable' && f.momentum !== 'dormant',
    ) || (wdContext.projection?.eraTrends.length ?? 0) > 0;

  if (!hasSignals) {
    return {
      entitiesScanned: wdContext.projectedFactionStates.length,
      suggestionsCreated: 0,
      autoResolved: 0,
      skipReason: 'no_pressure_signals',
    };
  }

  const elapsed = Number(context.elapsedMinutes);
  const totalSlots = computeBudgetSlotsForAdvance(settings, elapsed);
  if (totalSlots <= 0) {
    return {
      entitiesScanned: wdContext.projectedFactionStates.length,
      suggestionsCreated: 0,
      autoResolved: 0,
      skipReason: 'budget_exhausted',
    };
  }

  const enabledPlugins = await getEnabledDevelopmentPluginIds(context.campaignId, tx);
  const allCandidates = await resolveCandidatesForCampaign(
    context.campaignId,
    wdContext,
    { enabledPluginIds: enabledPlugins },
  );

  let suggestionsCreated = 0;
  let autoResolved = 0;
  let rank = 0;

  for (const candidate of allCandidates) {
    if (rank >= totalSlots) break;
    rank += 1;

    const devType = candidate.developmentType;
    const prepStages = PREP_CHAIN_STAGES[devType];
    const lifecycle = settings.typeLifecycles[devType];

    if (prepStages && prepStages.length > 1 && lifecycle.prepMinutes > 0) {
      let parentId: string | null = null;
      const stageCount = prepStages.length;
      const stepMinutes = Math.floor(lifecycle.prepMinutes / stageCount);
      for (let i = 0; i < stageCount; i += 1) {
        const stageLabel = prepStages[i]!;
        const stageEpoch = (
          BigInt(context.nextEpochMinute) - BigInt(stepMinutes * (stageCount - 1 - i))
        ).toString();
        const stageCandidate: DevelopmentCandidate = {
          ...candidate,
          title: stageLabel,
          idempotencyKey: `${candidate.idempotencyKey}:prep:${i}`,
        };
        const created = await createSuggestionFromCandidate(tx, {
          campaignId: context.campaignId,
          candidate: stageCandidate,
          settings,
          context,
          rank,
          totalSlots,
          parentSuggestionId: parentId,
          chainStage: i + 1,
          chainStageLabel: stageLabel,
          chainStageCount: stageCount,
          occurredAtEpochMinute: stageEpoch,
        });
        if (created) {
          suggestionsCreated += 1;
          if (!parentId) {
            const parent = await tx.campaignWorldEventSuggestion.findFirst({
              where: {
                campaignId: context.campaignId,
                idempotencyKey: stageCandidate.idempotencyKey,
              },
              select: { id: true },
            });
            parentId = parent?.id ?? null;
          }
        }
      }
    } else {
      const created = await createSuggestionFromCandidate(tx, {
        campaignId: context.campaignId,
        candidate,
        settings,
        context,
        rank,
        totalSlots,
      });
      if (created) suggestionsCreated += 1;
    }
  }

  if (context.actorUserId) {
    autoResolved = await autoApplyEligibleSuggestions(
      context.campaignId,
      context.actorUserId,
      settings,
    );
  }

  return {
    entitiesScanned: wdContext.projectedFactionStates.length,
    suggestionsCreated,
    autoResolved,
  };
}

export async function generateOnDemandWorldDevelopments(
  campaignId: string,
  _campaignHandle: string,
  userId: string,
): Promise<EmitWorldDevelopmentsResult> {
  const campaign = await (
    await import('./prisma.js')
  ).prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { currentEpochMinute: true },
  });
  if (!campaign?.currentEpochMinute) {
    return { entitiesScanned: 0, suggestionsCreated: 0, autoResolved: 0 };
  }

  const epoch = campaign.currentEpochMinute.toString();
  const context: GlobalTimeAdvanceContext = {
    campaignId,
    previousEpochMinute: epoch,
    nextEpochMinute: epoch,
    elapsedMinutes: '10080',
    advancedBy: { amount: '1', unit: 'weeks' },
    advanceMagnitude: 'medium',
    source: 'time_tracking',
    actorUserId: userId,
  };

  return (
    await import('./prisma.js')
  ).prisma.$transaction((tx) => emitWorldDevelopments(tx, context));
}

export { WORLD_EVENT_PROMPTS_HANDLER_VERSION };
