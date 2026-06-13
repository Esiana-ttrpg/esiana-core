import { parseQuestLedgerReward, type QuestLedgerReward } from '../../../shared/ledgerMetadata.js';

export type { QuestLedgerReward };

export const QUEST_STATUSES = [
  'AVAILABLE',
  'ACTIVE',
  'COMPLETED',
  'FAILED',
  'ABANDONED',
] as const;

export type QuestStatus = (typeof QUEST_STATUSES)[number];

export const DEFAULT_QUEST_STATUS: QuestStatus = 'AVAILABLE';

export interface QuestDateParts {
  year: number | null;
  month: number | null;
  day: number | null;
}

const QUEST_METADATA_KEYS = [
  'questStatus',
  'boardOrder',
  'questType',
  'questDate',
  'questGiverId',
  'factionId',
  'rewardsText',
  'dmRewardsText',
  'ledgerReward',
] as const;

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

const EMPTY_QUEST: QuestMetadataFields = {
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

export function normalizeNullablePageId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableText(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
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

/** Reads a wiki category infobox field from metadata.fields (e.g. Location, Progress). */
export function readCategoryMetadataField(
  metadata: unknown,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  return readLegacyField(metadata as Record<string, unknown>, key);
}

export function parseQuestMetadata(metadata: unknown): QuestMetadataFields {
  if (!metadata || typeof metadata !== 'object') {
    return { ...EMPTY_QUEST };
  }
  const raw = metadata as Record<string, unknown>;
  let questType = normalizeNullableText(raw.questType);
  let questDate = normalizeQuestDate(raw.questDate);

  if (!questType) {
    questType = readLegacyField(raw, 'Type');
  }
  if (!questDate) {
    const legacyDate = readLegacyField(raw, 'Date');
    if (legacyDate) {
      questDate = { year: null, month: null, day: null };
    }
  }

  return {
    questStatus: normalizeQuestStatus(raw.questStatus),
    boardOrder: normalizeBoardOrder(raw.boardOrder),
    questType,
    questDate,
    questGiverId: normalizeNullablePageId(raw.questGiverId),
    factionId: normalizeNullablePageId(raw.factionId),
    rewardsText: normalizeNullableText(raw.rewardsText),
    dmRewardsText: normalizeNullableText(raw.dmRewardsText),
    ledgerReward: parseQuestLedgerReward(raw.ledgerReward),
  };
}

export function isQuestMetadataPresent(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const raw = metadata as Record<string, unknown>;
  return QUEST_METADATA_KEYS.some((key) => raw[key] !== undefined && raw[key] !== null);
}

export function mergeQuestMetadata(
  existing: unknown,
  patch: Partial<QuestMetadataFields>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  const parsed = parseQuestMetadata(base);
  const merged: QuestMetadataFields = { ...parsed, ...patch };
  const result: Record<string, unknown> = {
    ...base,
    questStatus: merged.questStatus,
    boardOrder: merged.boardOrder,
    questGiverId: merged.questGiverId,
    factionId: merged.factionId,
    rewardsText: merged.rewardsText,
    dmRewardsText: merged.dmRewardsText,
  };

  if ('ledgerReward' in patch) {
    if (patch.ledgerReward === null) {
      delete result.ledgerReward;
    } else if (patch.ledgerReward) {
      result.ledgerReward = patch.ledgerReward;
    }
  } else if (merged.ledgerReward != null) {
    result.ledgerReward = merged.ledgerReward;
  }

  if ('questType' in patch) {
    if (patch.questType === null) {
      delete result.questType;
    } else {
      result.questType = merged.questType;
    }
  } else if (merged.questType != null) {
    result.questType = merged.questType;
  }

  if ('questDate' in patch) {
    if (patch.questDate === null) {
      delete result.questDate;
    } else {
      result.questDate = merged.questDate;
    }
  } else if (merged.questDate != null) {
    result.questDate = merged.questDate;
  }

  return result;
}

export function sanitizeQuestMetadataForRole(
  parsed: QuestMetadataFields,
  hasElevatedView: boolean,
): QuestMetadataFields {
  if (hasElevatedView) return parsed;
  return { ...parsed, dmRewardsText: null };
}

export function clearQuestMetadata(existing: unknown): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object'
      ? { ...(existing as Record<string, unknown>) }
      : {};
  for (const key of QUEST_METADATA_KEYS) {
    delete base[key];
  }
  return base;
}

export function hasQuestMetadataPatch(body: Record<string, unknown>): boolean {
  return QUEST_METADATA_KEYS.some((key) => key in body);
}

/** Nested `{ metadata: patch }` or flat quest fields on the request body. */
export function resolveQuestMetadataPatchInput(
  body: Record<string, unknown>,
): Record<string, unknown> | null {
  const nested = body.metadata;
  if (
    nested &&
    typeof nested === 'object' &&
    !Array.isArray(nested) &&
    hasQuestMetadataPatch(nested as Record<string, unknown>)
  ) {
    return nested as Record<string, unknown>;
  }
  if (hasQuestMetadataPatch(body)) {
    return body;
  }
  return null;
}
