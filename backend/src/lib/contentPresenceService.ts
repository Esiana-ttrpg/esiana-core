import { prisma } from './prisma.js';
import {
  ContentPresenceEntityType,
  ContentRevelationStates,
  type ContentPresenceEntityType as ContentPresenceEntityTypeValue,
  type ContentRevelationState,
} from '../../../shared/contentPresence.js';

const prismaAny = prisma as any;

function isMissingContentPresenceTableError(err: unknown): boolean {
  const code =
    err && typeof err === 'object' && 'code' in err
      ? (err as { code?: unknown }).code
      : undefined;
  return code === 'P2021';
}

export type ContentPresenceRef = {
  entityType: ContentPresenceEntityTypeValue;
  entityId: string;
  subEntityId?: string | null;
};

export type RevealContentPresenceInput = ContentPresenceRef & {
  state: ContentRevelationState;
  campaignId: string;
  revealedByUserId?: string | null;
  workflowKey?: string | null;
  reason?: string | null;
  availableFromEpochMinute?: number | bigint | null;
};

function normalizeAvailableFromEpochMinute(
  value: number | bigint | string | null | undefined,
): bigint | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return BigInt(Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    return BigInt(value.trim());
  }
  return null;
}

function normalizeSubEntityId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

type PresenceWriteData = {
  state: ContentRevelationState;
  workflowKey: string | null;
  reason: string | null;
  revealedByUserId: string | null;
  revealedAt: Date;
  availableFromEpochMinute?: bigint | null;
};

function presenceWriteData(
  state: ContentRevelationState,
  options?: {
    workflowKey?: string | null;
    reason?: string | null;
    revealedByUserId?: string | null;
    availableFromEpochMinute?: number | bigint | null;
  },
): PresenceWriteData {
  const data: PresenceWriteData = {
    state,
    workflowKey: options?.workflowKey ?? null,
    reason: options?.reason ?? null,
    revealedByUserId: options?.revealedByUserId ?? null,
    revealedAt: new Date(),
  };
  if (options && 'availableFromEpochMinute' in options) {
    data.availableFromEpochMinute = normalizeAvailableFromEpochMinute(
      options.availableFromEpochMinute,
    );
  }
  return data;
}

type ContentPresenceDb = typeof prismaAny;

/** Prisma compound unique on nullable subEntityId cannot use null in upsert where. */
async function upsertContentPresenceRow(
  ref: {
    campaignId: string;
    entityType: string;
    entityId: string;
    subEntityId: string | null;
  },
  data: PresenceWriteData,
  db: ContentPresenceDb = prismaAny,
): Promise<void> {
  const subEntityId = normalizeSubEntityId(ref.subEntityId);

  if (subEntityId === null) {
    const existing = await db.contentPresenceState.findFirst({
      where: {
        campaignId: ref.campaignId,
        entityType: ref.entityType,
        entityId: ref.entityId,
        subEntityId: null,
      },
      select: { id: true },
    });
    if (existing) {
      await db.contentPresenceState.update({
        where: { id: existing.id },
        data,
      });
      return;
    }
    await db.contentPresenceState.create({
      data: {
        campaignId: ref.campaignId,
        entityType: ref.entityType,
        entityId: ref.entityId,
        subEntityId: null,
        ...data,
      },
    });
    return;
  }

  await db.contentPresenceState.upsert({
    where: {
      campaignId_entityType_entityId_subEntityId: {
        campaignId: ref.campaignId,
        entityType: ref.entityType,
        entityId: ref.entityId,
        subEntityId,
      },
    },
    create: {
      campaignId: ref.campaignId,
      entityType: ref.entityType,
      entityId: ref.entityId,
      subEntityId,
      ...data,
    },
    update: data,
  });
}

export async function setContentPresenceState(
  input: RevealContentPresenceInput,
): Promise<void> {
  try {
    await upsertContentPresenceRow(
      {
        campaignId: input.campaignId,
        entityType: input.entityType,
        entityId: input.entityId,
        subEntityId: normalizeSubEntityId(input.subEntityId),
      },
      presenceWriteData(input.state, {
        workflowKey: input.workflowKey,
        reason: input.reason,
        revealedByUserId: input.revealedByUserId,
        ...(input.availableFromEpochMinute !== undefined
          ? { availableFromEpochMinute: input.availableFromEpochMinute }
          : {}),
      }),
    );
  } catch (err) {
    if (isMissingContentPresenceTableError(err)) return;
    throw err;
  }
}

export type ContentPresenceMeta = {
  state: ContentRevelationState;
  revealedAt: Date | null;
  workflowKey: string | null;
  reason: string | null;
  availableFromEpochMinute: number | null;
};

export async function getContentPresenceMetaMap(
  campaignId: string,
  entityType: ContentPresenceEntityTypeValue,
  entityIds: string[],
): Promise<Map<string, ContentPresenceMeta>> {
  const cleanedIds = [...new Set(entityIds.map((id) => id.trim()).filter(Boolean))];
  if (cleanedIds.length === 0) return new Map();

  let rows: Array<{
    entityId: string;
    state: string;
    revealedAt: Date | null;
    workflowKey: string | null;
    reason: string | null;
    availableFromEpochMinute: bigint | null;
  }> = [];
  try {
    rows = await prismaAny.contentPresenceState.findMany({
      where: {
        campaignId,
        entityType,
        entityId: { in: cleanedIds },
        subEntityId: null,
      },
      select: {
        entityId: true,
        state: true,
        revealedAt: true,
        workflowKey: true,
        reason: true,
        availableFromEpochMinute: true,
      },
    });
  } catch (err) {
    if (isMissingContentPresenceTableError(err)) return new Map();
    throw err;
  }

  const map = new Map<string, ContentPresenceMeta>();
  for (const row of rows) {
    if (
      row.state === ContentRevelationStates.REVEALED ||
      row.state === ContentRevelationStates.HIDDEN ||
      row.state === ContentRevelationStates.DRAFT
    ) {
      map.set(row.entityId, {
        state: row.state,
        revealedAt: row.revealedAt,
        workflowKey: row.workflowKey,
        reason: row.reason,
        availableFromEpochMinute:
          row.availableFromEpochMinute != null
            ? Number(row.availableFromEpochMinute)
            : null,
      });
    }
  }
  return map;
}

export async function getContentPresenceStateMap(
  campaignId: string,
  entityType: ContentPresenceEntityTypeValue,
  entityIds: string[],
): Promise<Map<string, ContentRevelationState>> {
  const cleanedIds = [...new Set(entityIds.map((id) => id.trim()).filter(Boolean))];
  if (cleanedIds.length === 0) return new Map();

  let rows: Array<{ entityId: string; state: string }> = [];
  try {
    rows = await prismaAny.contentPresenceState.findMany({
      where: {
        campaignId,
        entityType,
        entityId: { in: cleanedIds },
        subEntityId: null,
      },
      select: { entityId: true, state: true },
    });
  } catch (err) {
    if (isMissingContentPresenceTableError(err)) return new Map();
    throw err;
  }

  const map = new Map<string, ContentRevelationState>();
  for (const row of rows) {
    if (
      row.state === ContentRevelationStates.REVEALED ||
      row.state === ContentRevelationStates.HIDDEN ||
      row.state === ContentRevelationStates.DRAFT
    ) {
      map.set(row.entityId, row.state);
    }
  }
  return map;
}

export async function getContentPresenceStateBySubEntityMap(
  campaignId: string,
  refs: ContentPresenceRef[],
): Promise<Map<string, ContentRevelationState>> {
  const cleanedRefs = refs
    .map((ref) => ({
      ...ref,
      entityId: ref.entityId.trim(),
      subEntityId: normalizeSubEntityId(ref.subEntityId),
    }))
    .filter((ref) => ref.entityId.length > 0 && ref.subEntityId !== null);
  if (cleanedRefs.length === 0) return new Map();

  let rows: Array<{
    entityType: string;
    entityId: string;
    subEntityId: string | null;
    state: string;
  }> = [];
  try {
    rows = await prismaAny.contentPresenceState.findMany({
      where: {
        campaignId,
        OR: cleanedRefs.map((ref) => ({
          entityType: ref.entityType,
          entityId: ref.entityId,
          subEntityId: ref.subEntityId,
        })),
      },
      select: { entityType: true, entityId: true, subEntityId: true, state: true },
    });
  } catch (err) {
    if (isMissingContentPresenceTableError(err)) return new Map();
    throw err;
  }

  const map = new Map<string, ContentRevelationState>();
  for (const row of rows) {
    if (!row.subEntityId) continue;
    if (
      row.state === ContentRevelationStates.REVEALED ||
      row.state === ContentRevelationStates.HIDDEN ||
      row.state === ContentRevelationStates.DRAFT
    ) {
      map.set(`${row.entityType}:${row.entityId}:${row.subEntityId}`, row.state);
    }
  }
  return map;
}

export async function bulkSetContentPresenceState(
  campaignId: string,
  refs: ContentPresenceRef[],
  state: ContentRevelationState,
  options?: {
    revealedByUserId?: string | null;
    workflowKey?: string | null;
    reason?: string | null;
    availableFromEpochMinute?: number | bigint | null;
  },
): Promise<number> {
  const unique = new Map<string, ContentPresenceRef>();
  for (const ref of refs) {
    const entityId = ref.entityId.trim();
    if (!entityId) continue;
    const subEntityId = normalizeSubEntityId(ref.subEntityId);
    const key = `${ref.entityType}:${entityId}:${subEntityId ?? ''}`;
    unique.set(key, { ...ref, entityId, subEntityId });
  }
  const items = [...unique.values()];
  if (items.length === 0) return 0;

  const writeData = presenceWriteData(state, options);

  try {
    await prisma.$transaction(async (tx) => {
      const txDb = tx as ContentPresenceDb;
      for (const ref of items) {
        const rowData = { ...writeData };
        if (!('availableFromEpochMinute' in (options ?? {}))) {
          delete rowData.availableFromEpochMinute;
        }
        await upsertContentPresenceRow(
          {
            campaignId,
            entityType: ref.entityType,
            entityId: ref.entityId,
            subEntityId: normalizeSubEntityId(ref.subEntityId),
          },
          rowData,
          txDb,
        );
      }
    });
  } catch (err) {
    if (isMissingContentPresenceTableError(err)) return 0;
    throw err;
  }

  return items.length;
}

export async function revealMapObjectsContentPresence(
  campaignId: string,
  mapObjectIds: string[],
  options?: {
    revealedByUserId?: string | null;
    workflowKey?: string | null;
    reason?: string | null;
  },
): Promise<number> {
  return bulkSetContentPresenceState(
    campaignId,
    mapObjectIds.map((id) => ({
      entityType: ContentPresenceEntityType.MAP_OBJECT,
      entityId: id,
    })),
    ContentRevelationStates.REVEALED,
    options,
  );
}
