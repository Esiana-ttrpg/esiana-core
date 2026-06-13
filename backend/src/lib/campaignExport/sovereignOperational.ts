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
  };
}

export async function buildOperationalPayload(
  campaignId: string,
): Promise<SovereignOperational> {
  const [downtimeHavens, downtimeProjects, pluginData, pluginSettings] =
    await Promise.all([
      prisma.downtimeHaven.findMany({ where: { campaignId } }),
      prisma.downtimeProject.findMany({ where: { campaignId } }),
      prisma.pluginData.findMany({ where: { campaignId } }),
      prisma.campaignPluginSetting.findMany({ where: { campaignId } }),
    ]);

  return serializeForOperationalJson({
    downtimeHavens,
    downtimeProjects,
    pluginData,
    pluginSettings,
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

export async function restoreOperationalPayload(
  campaignId: string,
  payload: SovereignOperational | null,
): Promise<{ havenCount: number; projectCount: number; pluginDataCount: number }> {
  if (!payload) {
    return { havenCount: 0, projectCount: 0, pluginDataCount: 0 };
  }

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

  return { havenCount, projectCount, pluginDataCount };
}
