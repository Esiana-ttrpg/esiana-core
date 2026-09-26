import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import type { SovereignOperational } from './types.js';

export const SOVEREIGN_OPERATIONAL_PATH = 'sovereign/operational.json' as const;

const PROJECT_BIGINT_FIELDS = new Set([
  'durationTotalMinutes',
  'durationElapsedMinutes',
  'stalledDurationMinutes',
  'startedAtEpochMinute',
  'completedAtEpochMinute',
  'targetCompletionEpochMinute',
]);

function serializeForOperationalJson<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v)),
  ) as T;
}

export function parseOperationalPayload(raw: unknown): SovereignOperational | null {
  if (!raw || typeof raw !== 'object') return null;
  const payload = raw as SovereignOperational;
  return {
    downtimeHavens: Array.isArray(payload.downtimeHavens) ? payload.downtimeHavens : [],
    downtimeProjects: Array.isArray(payload.downtimeProjects) ? payload.downtimeProjects : [],
    pluginData: Array.isArray(payload.pluginData) ? payload.pluginData : [],
    pluginSettings: Array.isArray(payload.pluginSettings) ? payload.pluginSettings : [],
    characterPageTabs: Array.isArray(payload.characterPageTabs) ? payload.characterPageTabs : [],
    pluginCharacterPageStates: Array.isArray(payload.pluginCharacterPageStates)
      ? payload.pluginCharacterPageStates
      : [],
    characterFields: Array.isArray(payload.characterFields) ? payload.characterFields : [],
  };
}

export async function buildOperationalPayload(
  campaignId: string,
): Promise<SovereignOperational> {
  const characterDb = prisma as typeof prisma & {
    characterPageTab: { findMany(args: unknown): Promise<unknown[]> };
    pluginCharacterPageState: { findMany(args: unknown): Promise<unknown[]> };
    characterField: { findMany(args: unknown): Promise<unknown[]> };
  };
  const [downtimeHavens, downtimeProjects, pluginData, pluginSettings, characterPageTabs, pluginCharacterPageStates, characterFields] =
    await Promise.all([
      prisma.downtimeHaven.findMany({ where: { campaignId } }),
      prisma.downtimeProject.findMany({ where: { campaignId } }),
      prisma.pluginData.findMany({ where: { campaignId } }),
      prisma.campaignPluginSetting.findMany({ where: { campaignId } }),
      characterDb.characterPageTab.findMany({ where: { campaignId } }),
      characterDb.pluginCharacterPageState.findMany({ where: { campaignId } }),
      characterDb.characterField.findMany({ where: { campaignId } }),
    ]);

  return serializeForOperationalJson({
    downtimeHavens,
    downtimeProjects,
    pluginData,
    pluginSettings,
    characterPageTabs: characterPageTabs as Array<Record<string, unknown>>,
    pluginCharacterPageStates: pluginCharacterPageStates as Array<Record<string, unknown>>,
    characterFields: characterFields as Array<Record<string, unknown>>,
  });
}

function reviveProjectBigints(
  row: Record<string, unknown>,
): Prisma.DowntimeProjectUncheckedCreateInput {
  const data = { ...row } as Record<string, unknown>;
  for (const field of PROJECT_BIGINT_FIELDS) {
    const value = data[field];
    if (value == null) continue;
    data[field] = BigInt(String(value));
  }
  return data as Prisma.DowntimeProjectUncheckedCreateInput;
}

function reviveHavenRow(
  row: Record<string, unknown>,
): Prisma.DowntimeHavenUncheckedCreateInput {
  const data = { ...row } as Record<string, unknown>;
  if (typeof data.establishedAt === 'string') {
    data.establishedAt = new Date(data.establishedAt);
  }
  return data as Prisma.DowntimeHavenUncheckedCreateInput;
}

function stripOperationalRow(
  entry: Record<string, unknown>,
): Record<string, unknown> {
  const {
    campaignId: _campaignId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = entry;
  return rest;
}

async function validateCharacterRestoreOwnership(
  campaignId: string,
  payload: SovereignOperational,
): Promise<void> {
  const characterDb = prisma as typeof prisma & {
    characterPageTab: any;
    pluginCharacterPageState: any;
    characterField: any;
  };
  const groups = [
    ['plugin character page state', payload.pluginCharacterPageStates ?? [], characterDb.pluginCharacterPageState],
    ['character page tab', payload.characterPageTabs ?? [], characterDb.characterPageTab],
    ['character field', payload.characterFields ?? [], characterDb.characterField],
  ] as const;
  const pageIds = new Set<string>();
  for (const [, rows] of groups) {
    for (const row of rows) {
      if (row && typeof row === 'object' && typeof row.characterPageId === 'string') pageIds.add(row.characterPageId);
    }
  }
  if (pageIds.size > 0) {
    const ownedPages = await prisma.wikiPage.findMany({
      where: { campaignId, id: { in: [...pageIds] } },
      select: { id: true },
    });
    const ownedIds = new Set(ownedPages.map((page) => page.id));
    const foreignOrMissing = [...pageIds].find((id) => !ownedIds.has(id));
    if (foreignOrMissing) throw new Error(`Character restore references a page outside the target campaign: ${foreignOrMissing}`);
  }
  for (const [label, rows, model] of groups) {
    const ids = rows
      .filter((row): row is Record<string, unknown> => Boolean(row && typeof row === 'object' && typeof row.id === 'string'))
      .map((row) => row.id as string);
    if (ids.length === 0) continue;
    const collisions = await model.findMany({
      where: { id: { in: ids }, campaignId: { not: campaignId } },
      select: { id: true },
    });
    if (collisions.length > 0) throw new Error(`${label} id belongs to another campaign: ${collisions[0].id}`);
  }
}

export async function restoreOperationalPayload(
  campaignId: string,
  payload: SovereignOperational | null,
): Promise<{ havenCount: number; projectCount: number; pluginDataCount: number }> {
  if (!payload) {
    return { havenCount: 0, projectCount: 0, pluginDataCount: 0 };
  }

  // Validate all new character-shell rows before any operational row is
  // mutated, so a malformed/colliding backup fails atomically at this layer.
  await validateCharacterRestoreOwnership(campaignId, payload);

  let havenCount = 0;
  let projectCount = 0;
  let pluginDataCount = 0;

  for (const row of payload.downtimeHavens) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string') continue;
    const entry = row as Record<string, unknown>;
    if (typeof entry.wikiPageId !== 'string') continue;
    const data = reviveHavenRow(stripOperationalRow(entry));
    await prisma.downtimeHaven.upsert({
      where: { id: data.id as string },
      create: { ...data, campaignId },
      update: {
        ...data,
        campaignId,
      },
    });
    havenCount += 1;
  }

  for (const row of payload.downtimeProjects) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string') continue;
    const entry = row as Record<string, unknown>;
    if (typeof entry.wikiPageId !== 'string') continue;
    const data = reviveProjectBigints(stripOperationalRow(entry));
    await prisma.downtimeProject.upsert({
      where: { id: data.id as string },
      create: { ...data, campaignId },
      update: {
        ...data,
        campaignId,
      },
    });
    projectCount += 1;
  }

  for (const row of payload.pluginData) {
    if (!row || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    if (typeof entry.pluginId !== 'string' || typeof entry.key !== 'string') continue;
    const id = typeof entry.id === 'string' ? entry.id : undefined;
    if (id) {
      await prisma.pluginData.upsert({
        where: { id },
        create: {
          id,
          campaignId,
          pluginId: entry.pluginId,
          key: entry.key,
          value: (entry.value ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          value: (entry.value ?? {}) as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.pluginData.upsert({
        where: {
          pluginId_campaignId_key: {
            pluginId: entry.pluginId,
            campaignId,
            key: entry.key,
          },
        },
        create: {
          campaignId,
          pluginId: entry.pluginId,
          key: entry.key,
          value: (entry.value ?? {}) as Prisma.InputJsonValue,
        },
        update: {
          value: (entry.value ?? {}) as Prisma.InputJsonValue,
        },
      });
    }
    pluginDataCount += 1;
  }

  for (const row of payload.pluginSettings ?? []) {
    if (!row || typeof row !== 'object') continue;
    const entry = row as Record<string, unknown>;
    if (typeof entry.pluginId !== 'string') continue;
    await prisma.campaignPluginSetting.upsert({
      where: {
        campaignId_pluginId: {
          campaignId,
          pluginId: entry.pluginId,
        },
      },
      create: {
        campaignId,
        pluginId: entry.pluginId,
        isEnabled: Boolean(entry.isEnabled),
        config: (entry.config ?? {}) as Prisma.InputJsonValue,
      },
      update: {
        isEnabled: Boolean(entry.isEnabled),
        config: (entry.config ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  const characterDb = prisma as typeof prisma & {
    characterPageTab: any;
    pluginCharacterPageState: any;
    characterField: any;
  };
  for (const row of payload.pluginCharacterPageStates ?? []) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.characterPageId !== 'string') continue;
    const data = stripOperationalRow(row);
    await characterDb.pluginCharacterPageState.upsert({
      where: { id: row.id },
      create: { ...data, id: row.id, campaignId },
      update: { ...data, campaignId },
    });
  }
  for (const row of payload.characterPageTabs ?? []) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.characterPageId !== 'string') continue;
    const data = stripOperationalRow(row);
    await characterDb.characterPageTab.upsert({
      where: { id: row.id },
      create: { ...data, id: row.id, campaignId },
      update: { ...data, campaignId },
    });
  }
  for (const row of payload.characterFields ?? []) {
    if (!row || typeof row !== 'object' || typeof row.id !== 'string' || typeof row.characterPageId !== 'string') continue;
    const data = stripOperationalRow(row);
    await characterDb.characterField.upsert({
      where: { id: row.id },
      create: { ...data, id: row.id, campaignId },
      update: { ...data, campaignId },
    });
  }

  return { havenCount, projectCount, pluginDataCount };
}
