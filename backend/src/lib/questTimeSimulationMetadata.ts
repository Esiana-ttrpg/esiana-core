import type { Prisma } from '@prisma/client';
import {
  mergeQuestTimeRules,
  parseQuestTimePayload,
  QUEST_TIME_METADATA_KEY,
  QUEST_TIME_SIMULATION_VERSION,
  type QuestTimePayload,
  type QuestTimeRules,
  type QuestTimelineTouchReason,
  writeQuestTimeToMetadata,
} from '../../../shared/questTimeSimulation.js';

export function readQuestTimeFromMetadata(metadata: unknown): QuestTimePayload | null {
  return parseQuestTimePayload(metadata);
}

export function mergeQuestTimeRulesIntoMetadata(
  metadata: unknown,
  rulesPatch: Partial<QuestTimeRules>,
): Record<string, unknown> {
  const base =
    metadata && typeof metadata === 'object'
      ? { ...(metadata as Record<string, unknown>) }
      : {};
  const existing = parseQuestTimePayload(base);
  const merged = mergeQuestTimeRules(existing, rulesPatch);
  return writeQuestTimeToMetadata(base, merged);
}

export async function persistQuestTimePayload(
  tx: Prisma.TransactionClient,
  input: {
    campaignId: string;
    questPageId: string;
    payload: QuestTimePayload;
  },
): Promise<void> {
  const page = await tx.wikiPage.findFirst({
    where: { id: input.questPageId, campaignId: input.campaignId },
    select: { metadata: true },
  });
  if (!page) return;
  const base =
    page.metadata && typeof page.metadata === 'object'
      ? { ...(page.metadata as Record<string, unknown>) }
      : {};
  await tx.wikiPage.update({
    where: { id: input.questPageId },
    data: {
      metadata: writeQuestTimeToMetadata(base, input.payload) as never,
    },
  });
}

export function hasQuestTimeMetadataPatch(body: Record<string, unknown>): boolean {
  const nested = body.metadata;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return QUEST_TIME_METADATA_KEY in (nested as Record<string, unknown>);
  }
  return QUEST_TIME_METADATA_KEY in body;
}

export function resolveQuestTimeRulesPatch(
  body: Record<string, unknown>,
): Partial<QuestTimeRules> | null {
  const nested = body.metadata;
  let raw: unknown;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    raw = (nested as Record<string, unknown>)[QUEST_TIME_METADATA_KEY];
  } else {
    raw = body[QUEST_TIME_METADATA_KEY];
  }
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version && obj.version !== QUEST_TIME_SIMULATION_VERSION) return null;
  if (!obj.rules || typeof obj.rules !== 'object') return null;
  return obj.rules as Partial<QuestTimeRules>;
}

export type { QuestTimelineTouchReason };
