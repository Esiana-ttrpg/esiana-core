import { parseQuestLedgerReward, type QuestLedgerReward } from '@shared/ledgerMetadata';

export const QUEST_STATUSES = [
  'AVAILABLE',
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'ABANDONED',
] as const;

export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const DEFAULT_QUEST_STATUS: QuestStatus = 'AVAILABLE';

export type { QuestLedgerReward };

export const QUEST_TYPE_PRESETS = [
  'Main',
  'Side',
  'Character',
  'Faction',
  'Downtime',
] as const;

export interface QuestDateParts {
  year: number | null;
  month: number | null;
  day: number | null;
}

export interface QuestMetadataFields {
  questStatus: QuestStatus;
  boardOrder: number | null;
  questType: string | null;
  questDate: QuestDateParts | null;
  questGiverId: string | null;
  factionId: string | null;
  rewardsText: string | null;
  dmRewardsText: string | null;
  ledgerReward: QuestLedgerReward | null;
}

export function normalizeBoardOrder(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeQuestStatus(raw: unknown): QuestStatus {
  if (typeof raw === 'string') {
    const upper = raw.trim().toUpperCase();
    if ((QUEST_STATUSES as readonly string[]).includes(upper)) {
      return upper as QuestStatus;
    }
  }
  return DEFAULT_QUEST_STATUS;
}

function normalizeNullableInt(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.floor(raw);
  if (typeof raw === 'string' && raw.trim()) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function normalizeQuestDate(raw: unknown): QuestDateParts | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const year = normalizeNullableInt(obj.year);
  const month = normalizeNullableInt(obj.month);
  const day = normalizeNullableInt(obj.day);
  if (year === null && month === null && day === null) return null;
  return { year, month, day };
}

function readLegacyField(
  metadata: Record<string, unknown>,
  key: string,
): string | null {
  const fields = metadata.fields;
  if (!Array.isArray(fields)) return null;
  for (const entry of fields) {
    if (
      entry &&
      typeof entry === 'object' &&
      (entry as { key?: unknown }).key === key
    ) {
      const value = (entry as { value?: unknown }).value;
      return typeof value === 'string' && value.trim() ? value.trim() : null;
    }
  }
  return null;
}

export function parseQuestMetadata(metadata: unknown): QuestMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return {
      questStatus: DEFAULT_QUEST_STATUS,
      boardOrder: null,
      questType: null,
      questDate: null,
      questGiverId: null,
      factionId: null,
      rewardsText: null,
      dmRewardsText: null,
      ledgerReward: null,
    };
  }
  const raw = metadata as Record<string, unknown>;
  const text = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim() : null;
  const pageId = (v: unknown) =>
    typeof v === 'string' && v.trim() ? v.trim() : null;

  let questType = text(raw.questType);
  let questDate = normalizeQuestDate(raw.questDate);
  if (!questType) questType = readLegacyField(raw, 'Type');
  if (!questDate && readLegacyField(raw, 'Date')) {
    questDate = { year: null, month: null, day: null };
  }

  return {
    questStatus: normalizeQuestStatus(raw.questStatus),
    boardOrder: normalizeBoardOrder(raw.boardOrder),
    questType,
    questDate,
    questGiverId: pageId(raw.questGiverId),
    factionId: pageId(raw.factionId),
    rewardsText: text(raw.rewardsText),
    dmRewardsText: text(raw.dmRewardsText),
    ledgerReward: parseQuestLedgerReward(raw.ledgerReward),
  };
}

export function sanitizeQuestMetadataForRole(
  parsed: QuestMetadataFields,
  canManage: boolean,
): QuestMetadataFields {
  if (canManage) return parsed;
  return { ...parsed, dmRewardsText: null };
}
