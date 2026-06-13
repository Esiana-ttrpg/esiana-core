import type { Prisma } from '@prisma/client';
import {
  buildHavenUpkeepSuggestionKey,
  buildProjectCompletionSuggestionKey,
  buildQuestRewardSuggestionKey,
  buildTradeEventSuggestionKey,
  type LedgerCategory,
} from '../../../shared/ledgerMetadata.js';
import {
  parseHavenLedgerSimulationHints,
  type HavenStatus,
} from '../../../shared/havenMetadata.js';
import type {
  DowntimeProjectFields,
  ProjectOutcomeEntry,
  ProjectResourceEntry,
} from '../../../shared/projectMetadata.js';
import type { QuestLedgerReward } from '../../../shared/ledgerMetadata.js';
import { emitLedgerSuggestion, mapEntryKindFromImpactKind } from './ledgerSuggestionService.js';

const MAJOR_HAVEN_STATUSES: HavenStatus[] = ['damaged', 'under_siege'];

export async function emitProjectCompletionLedgerSuggestions(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    projectId: string;
    projectTitle: string;
    havenPageId: string | null;
    resources: ProjectResourceEntry[];
    outcomes: ProjectOutcomeEntry[];
    atEpochMinute: string;
    applicationRunId: string;
  },
): Promise<number> {
  let emitted = 0;
  const ledgerResources = input.resources.filter((r) => r.sourceKind === 'ledger');
  const totalLedgerAmount = ledgerResources.reduce((sum, resource) => {
    if (resource.ledgerAmount != null && resource.ledgerAmount > 0) {
      return sum + resource.ledgerAmount;
    }
    return sum;
  }, 0);

  if (ledgerResources.length > 0) {
    const hasAuthoredAmounts = ledgerResources.some(
      (r) => r.ledgerAmount != null && r.ledgerAmount > 0,
    );
    const impactKind = ledgerResources.find((r) => r.ledgerImpactKind)?.ledgerImpactKind ?? 'debit';
    const resourceLabels = ledgerResources.map((r) => r.label).join(', ');

    const result = await emitLedgerSuggestion(tx, {
      campaignId: input.campaignId,
      idempotencyKey: buildProjectCompletionSuggestionKey(
        input.projectId,
        `${input.applicationRunId}:resources`,
      ),
      sourceType: 'project_completion',
      sourceRef: input.projectId,
      entryKind: mapEntryKindFromImpactKind(impactKind),
      category: 'project',
      title: `${input.projectTitle} — project costs`,
      narrative: resourceLabels.slice(0, 120),
      amount: hasAuthoredAmounts ? totalLedgerAmount || null : null,
      occurredAtEpochMinute: input.atEpochMinute,
      projectId: input.projectId,
      havenWikiPageId: input.havenPageId,
      confidence: hasAuthoredAmounts ? 'authored' : 'inferred',
    });
    if (result.created) emitted += 1;
  }

  for (const outcome of input.outcomes) {
    if (outcome.outcomeKind !== 'treasury_effect' || !outcome.treasuryEffect) continue;
    const effect = outcome.treasuryEffect;
    const category = (effect.category ?? 'project') as LedgerCategory;
    const result = await emitLedgerSuggestion(tx, {
      campaignId: input.campaignId,
      idempotencyKey: buildProjectCompletionSuggestionKey(
        input.projectId,
        `${input.applicationRunId}:outcome:${outcome.id}`,
      ),
      sourceType: 'project_completion',
      sourceRef: input.projectId,
      entryKind: mapEntryKindFromImpactKind(effect.kind),
      category,
      title: effect.title?.trim() || `${input.projectTitle} — treasury outcome`,
      narrative: outcome.description,
      amount: effect.amount,
      occurredAtEpochMinute: input.atEpochMinute,
      projectId: input.projectId,
      havenWikiPageId: input.havenPageId,
      confidence: 'authored',
    });
    if (result.created) emitted += 1;
  }

  return emitted;
}

export async function emitTradeEventLedgerSuggestion(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    effectId: string;
    signal: string;
    note?: string | null;
    atEpochMinute: string;
    pageId: string;
  },
): Promise<boolean> {
  const title = input.note?.trim()
    ? input.note.trim()
    : `Trade activity — ${input.signal.replace(/_/g, ' ')}`;

  const result = await emitLedgerSuggestion(tx, {
    campaignId: input.campaignId,
    idempotencyKey: buildTradeEventSuggestionKey(input.effectId),
    sourceType: 'trade_event',
    sourceRef: input.pageId,
    entryKind: 'credit',
    category: 'trade',
    title,
    narrative: 'Suggested trade income — edit amount before accepting',
    amount: null,
    occurredAtEpochMinute: input.atEpochMinute,
    confidence: 'inferred',
  });

  return result.created;
}

export async function emitQuestRewardLedgerSuggestion(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    questPageId: string;
    questTitle: string;
    ledgerReward: QuestLedgerReward;
    transitionId: string;
    atEpochMinute: string;
  },
): Promise<boolean> {
  const result = await emitLedgerSuggestion(tx, {
    campaignId: input.campaignId,
    idempotencyKey: buildQuestRewardSuggestionKey(input.questPageId, input.transitionId),
    sourceType: 'quest_reward',
    sourceRef: input.questPageId,
    entryKind: 'credit',
    category: 'reward',
    title: `${input.questTitle} — quest reward`,
    narrative:
      input.ledgerReward.recipient === 'individual'
        ? 'Individual reward — assign contributor if needed'
        : 'Party treasury reward',
    amount: input.ledgerReward.amount,
    occurredAtEpochMinute: input.atEpochMinute,
    confidence: 'authored',
  });

  return result.created;
}

/**
 * Haven upkeep suggestions — opt-in, high-threshold, extremely low frequency.
 * Not called from routine simulation drift.
 */
export async function emitHavenUpkeepLedgerSuggestionIfEligible(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    havenWikiPageId: string;
    havenTitle: string;
    previousStatus: HavenStatus;
    nextStatus: HavenStatus;
    simulationHints: Record<string, unknown>;
    transitionKey: string;
    atEpochMinute: string;
  },
): Promise<boolean> {
  const hints = parseHavenLedgerSimulationHints(input.simulationHints);
  if (!hints.ledgerUpkeepSuggestionsEnabled || hints.upkeepCost == null) {
    return false;
  }

  const isMajorTransition =
    MAJOR_HAVEN_STATUSES.includes(input.nextStatus) &&
    input.previousStatus !== input.nextStatus;
  if (!isMajorTransition) {
    return false;
  }

  const pendingCount = await tx.campaignLedgerSuggestion.count({
    where: {
      campaignId: input.campaignId,
      havenWikiPageId: input.havenWikiPageId,
      status: 'pending',
      sourceType: 'haven_upkeep',
    },
  });
  if (pendingCount > 0) {
    return false;
  }

  const result = await emitLedgerSuggestion(tx, {
    campaignId: input.campaignId,
    idempotencyKey: buildHavenUpkeepSuggestionKey(
      input.havenWikiPageId,
      input.transitionKey,
    ),
    sourceType: 'haven_upkeep',
    sourceRef: input.havenWikiPageId,
    entryKind: 'debit',
    category: 'upkeep',
    title: `${input.havenTitle} — haven upkeep`,
    narrative: `Status changed to ${input.nextStatus.replace(/_/g, ' ')}`,
    amount: hints.upkeepCost,
    occurredAtEpochMinute: input.atEpochMinute,
    havenWikiPageId: input.havenWikiPageId,
    confidence: 'authored',
  });

  return result.created;
}

export type { DowntimeProjectFields };
