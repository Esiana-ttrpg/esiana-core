import type { Prisma } from '@prisma/client';
import { prisma } from '../prisma.js';
import {
  EMAIL_DEFAULT_ON_TYPES,
  NOTIFICATION_TYPE_GROUPS,
  type NotificationChannelPrefs,
  type NotificationPreferenceMap,
  type NotificationTypeValue,
  NotificationType,
} from './types.js';

export function buildDefaultNotificationPreferences(): NotificationPreferenceMap {
  const defaults: NotificationPreferenceMap = {};
  for (const group of NOTIFICATION_TYPE_GROUPS) {
    for (const type of group.types) {
      defaults[type] = {
        inApp: true,
        email: EMAIL_DEFAULT_ON_TYPES.has(type),
      };
    }
  }
  defaults[NotificationType.GENERIC] = { inApp: true, email: false };
  return defaults;
}

function parseChannelPrefs(value: unknown): NotificationChannelPrefs | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.inApp !== 'boolean' || typeof raw.email !== 'boolean') {
    return null;
  }
  return { inApp: raw.inApp, email: raw.email };
}

export function parseNotificationPreferenceChannels(
  raw: unknown,
): NotificationPreferenceMap {
  const defaults = buildDefaultNotificationPreferences();
  if (!raw || typeof raw !== 'object') return defaults;
  const input = raw as Record<string, unknown>;
  const merged: NotificationPreferenceMap = { ...defaults };
  for (const [key, value] of Object.entries(input)) {
    const parsed = parseChannelPrefs(value);
    if (parsed) {
      merged[key as NotificationTypeValue] = parsed;
    }
  }
  return merged;
}

export async function getUserNotificationPreferences(
  userId: string,
): Promise<{ channels: NotificationPreferenceMap; mutedUntil: Date | null }> {
  const row = await prisma.userNotificationPreference.findUnique({
    where: { userId },
  });
  if (!row) {
    return { channels: buildDefaultNotificationPreferences(), mutedUntil: null };
  }
  return {
    channels: parseNotificationPreferenceChannels(row.channels),
    mutedUntil: row.mutedUntil,
  };
}

export function resolveChannelPrefs(
  channels: NotificationPreferenceMap,
  type: NotificationTypeValue,
): NotificationChannelPrefs {
  return (
    channels[type] ??
    channels[NotificationType.GENERIC] ??
    buildDefaultNotificationPreferences()[NotificationType.GENERIC]!
  );
}

export async function upsertUserNotificationPreferences(
  userId: string,
  input: {
    channels?: NotificationPreferenceMap;
    mutedUntil?: Date | null;
  },
): Promise<{ channels: NotificationPreferenceMap; mutedUntil: Date | null }> {
  const existing = await getUserNotificationPreferences(userId);
  const channels = input.channels ?? existing.channels;
  const mutedUntil =
    input.mutedUntil !== undefined ? input.mutedUntil : existing.mutedUntil;

  await prisma.userNotificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      channels: channels as Prisma.InputJsonValue,
      mutedUntil,
    },
    update: {
      channels: channels as Prisma.InputJsonValue,
      mutedUntil,
    },
  });

  return { channels, mutedUntil };
}
