import type { Prisma } from '@prisma/client';
import type { NarrativeLifecycleState } from '../../../shared/narrativeLifecycle.js';
import {
  parseConsequenceRuleSet,
  type ConsequenceEffect,
  type ConsequenceRule,
  type ConsequenceRuleSet,
} from '../../../shared/narrativeConsequence.js';
import { prisma } from './prisma.js';
import { resolveCampaignChronologyNow } from './chronologyDefaults.js';
import { applyCanonicalWorldEffect } from './canonicalWorldEffect.js';

const CONSEQUENCE_METADATA_KEY = 'narrativeConsequenceRules';

export function readConsequenceRulesFromMetadata(metadata: unknown): ConsequenceRuleSet | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return parseConsequenceRuleSet(
    (metadata as Record<string, unknown>)[CONSEQUENCE_METADATA_KEY],
  );
}

async function hasReceipt(
  campaignId: string,
  idempotencyKey: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<boolean> {
  const existing = await db.narrativeConsequenceReceipt.findUnique({
    where: { campaignId_idempotencyKey: { campaignId, idempotencyKey } },
    select: { id: true },
  });
  return Boolean(existing);
}

async function recordReceipt(
  campaignId: string,
  idempotencyKey: string,
  ruleId: string,
  subjectId: string,
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  await db.narrativeConsequenceReceipt.create({
    data: { campaignId, idempotencyKey, ruleId, subjectId },
  });
}

async function applyEffect(
  effect: ConsequenceEffect,
  input: {
    campaignId: string;
    subjectId: string;
    actorUserId: string;
    canManage: boolean;
  },
  db: Prisma.TransactionClient | typeof prisma,
): Promise<void> {
  const campaign = await db.campaign.findUnique({
    where: { id: input.campaignId },
    select: { currentEpochMinute: true },
  });
  const atEpoch = campaign?.currentEpochMinute?.toString() ?? '0';
  const effectiveDate = await resolveCampaignChronologyNow(input.campaignId);
  await applyCanonicalWorldEffect(
    effect,
    {
      campaignId: input.campaignId,
      subjectId: input.subjectId,
      actorUserId: input.actorUserId,
      canManage: input.canManage,
      atEpochMinute: atEpoch,
      effectiveDate,
    },
    db,
  );
}

function rulesMatchingLifecycle(
  rules: ConsequenceRule[],
  toState: NarrativeLifecycleState,
): ConsequenceRule[] {
  return rules.filter(
    (rule) =>
      rule.trigger.type === 'on_lifecycle' &&
      rule.trigger.lifecycleTarget === toState,
  );
}

export async function executeConsequenceEffects(
  input: {
    campaignId: string;
    subjectId: string;
    effects: ConsequenceEffect[];
    idempotencyPrefix: string;
    actorUserId: string;
    canManage: boolean;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  if (input.effects.length === 0) return 0;
  const idempotencyKey = input.idempotencyPrefix;
  if (await hasReceipt(input.campaignId, idempotencyKey, db)) return 0;
  for (const effect of input.effects) {
    await applyEffect(effect, input, db);
  }
  await recordReceipt(
    input.campaignId,
    idempotencyKey,
    'quest-time-effect',
    input.subjectId,
    db,
  );
  return 1;
}

export async function executeConsequencesForLifecycleTransition(
  input: {
    campaignId: string;
    subjectId: string;
    toState: NarrativeLifecycleState;
    transitionId: string;
    actorUserId: string;
    canManage: boolean;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const page = await db.wikiPage.findFirst({
    where: { id: input.subjectId, campaignId: input.campaignId },
    select: { metadata: true },
  });
  const ruleSet = page ? readConsequenceRulesFromMetadata(page.metadata) : null;
  if (!ruleSet || ruleSet.rules.length === 0) return 0;

  const matching = rulesMatchingLifecycle(ruleSet.rules, input.toState);
  let executed = 0;
  for (const rule of matching) {
    const idempotencyKey = `${input.transitionId}:${rule.id}`;
    if (await hasReceipt(input.campaignId, idempotencyKey, db)) continue;
    for (const effect of rule.effects) {
      await applyEffect(effect, input, db);
    }
    await recordReceipt(
      input.campaignId,
      idempotencyKey,
      rule.id,
      input.subjectId,
      db,
    );
    executed += 1;
  }
  return executed;
}

export async function executeConsequencesForBranchNode(
  input: {
    campaignId: string;
    subjectId: string;
    branchNodeId: string;
    transitionId: string;
    actorUserId: string;
    canManage: boolean;
  },
  db: Prisma.TransactionClient | typeof prisma = prisma,
): Promise<number> {
  const page = await db.wikiPage.findFirst({
    where: { id: input.subjectId, campaignId: input.campaignId },
    select: { metadata: true },
  });
  const ruleSet = page ? readConsequenceRulesFromMetadata(page.metadata) : null;
  if (!ruleSet) return 0;

  const matching = ruleSet.rules.filter(
    (rule) =>
      rule.trigger.type === 'on_enter_node' &&
      rule.trigger.branchNodeId === input.branchNodeId,
  );
  let executed = 0;
  for (const rule of matching) {
    const idempotencyKey = `${input.transitionId}:${rule.id}`;
    if (await hasReceipt(input.campaignId, idempotencyKey, db)) continue;
    for (const effect of rule.effects) {
      await applyEffect(effect, input, db);
    }
    await recordReceipt(
      input.campaignId,
      idempotencyKey,
      rule.id,
      input.subjectId,
      db,
    );
    executed += 1;
  }
  return executed;
}
