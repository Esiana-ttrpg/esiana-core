import type { Response } from 'express';
import type { Prisma } from '@prisma/client';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import {
  getUserNotificationPreferences,
  parseNotificationPreferenceChannels,
  upsertUserNotificationPreferences,
} from '../lib/notifications/preferences.js';
import {
  NOTIFICATION_TYPE_GROUPS,
  NOTIFICATION_TYPE_LABELS,
  type NotificationTypeValue,
} from '../lib/notifications/types.js';
import { getOrCreateSystemSettings } from '../lib/systemSettings.js';
import { isSmtpConfigured } from '../lib/mail/mailSender.js';
import { resolveEffectiveTimezone } from '../lib/timezone.js';

const DEFAULT_POLL_INTERVAL_SECONDS = 60;
const MIN_POLL_INTERVAL_SECONDS = 30;
const MAX_POLL_INTERVAL_SECONDS = 300;

function clampPollInterval(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_POLL_INTERVAL_SECONDS;
  return Math.max(
    MIN_POLL_INTERVAL_SECONDS,
    Math.min(MAX_POLL_INTERVAL_SECONDS, Math.round(value)),
  );
}

function serializeNotification(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  isRead: boolean;
  readAt: Date | null;
  linkUrl: string | null;
  campaignId: string | null;
  metadata: unknown;
  expiresAt: Date | null;
  createdAt: Date;
}) {
  return {
    id: row.id,
    type: row.type,
    typeLabel: NOTIFICATION_TYPE_LABELS[row.type as NotificationTypeValue] ?? row.type,
    title: row.title,
    body: row.body,
    isRead: row.isRead || row.readAt !== null,
    readAt: row.readAt?.toISOString() ?? null,
    linkUrl: row.linkUrl,
    campaignId: row.campaignId,
    metadata: row.metadata ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listUserNotifications(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const unreadOnly = req.query.unreadOnly === 'true';
  const campaignId =
    typeof req.query.campaignId === 'string' ? req.query.campaignId.trim() : '';
  const cursor =
    typeof req.query.cursor === 'string' ? req.query.cursor.trim() : '';
  const limitRaw = Number.parseInt(String(req.query.limit ?? '20'), 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.max(1, Math.min(50, limitRaw))
    : 20;

  const where: Prisma.NotificationWhereInput = {
    userId,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
  if (unreadOnly) {
    where.readAt = null;
  }
  if (campaignId) {
    where.campaignId = campaignId;
  }

  const rows = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

  res.json({
    notifications: items.map(serializeNotification),
    nextCursor,
  });
}

export async function getUnreadNotificationCount(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const count = await prisma.notification.count({
    where: {
      userId,
      readAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
  });
  res.json({ count });
}

export async function markNotificationRead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id ?? '');
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  const updated = await prisma.notification.update({
    where: { id },
    data: {
      isRead: true,
      readAt: existing.readAt ?? new Date(),
    },
  });
  res.json({ notification: serializeNotification(updated) });
}

export async function markAllNotificationsRead(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const now = new Date();
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { isRead: true, readAt: now },
  });
  res.json({ ok: true });
}

export async function dismissNotification(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const id = String(req.params.id ?? '');
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) {
    res.status(404).json({ error: 'Notification not found' });
    return;
  }
  await prisma.notification.delete({ where: { id } });
  res.json({ ok: true });
}

export async function getNotificationPreferences(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const prefs = await getUserNotificationPreferences(userId);
  res.json({
    channels: prefs.channels,
    mutedUntil: prefs.mutedUntil?.toISOString() ?? null,
    groups: NOTIFICATION_TYPE_GROUPS.map((group) => ({
      ...group,
      types: group.types.map((type) => ({
        type,
        label: NOTIFICATION_TYPE_LABELS[type],
        channels: prefs.channels[type] ?? { inApp: true, email: false },
      })),
    })),
  });
}

export async function patchNotificationPreferences(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const userId = req.user!.id;
  const body = req.body as {
    channels?: Record<string, { inApp?: boolean; email?: boolean }>;
    mutedUntil?: string | null;
  };

  const existing = await getUserNotificationPreferences(userId);
  const channels = { ...existing.channels };

  if (body.channels && typeof body.channels === 'object') {
    for (const [type, value] of Object.entries(body.channels)) {
      if (!value || typeof value !== 'object') continue;
      const current = channels[type as NotificationTypeValue] ?? {
        inApp: true,
        email: false,
      };
      channels[type as NotificationTypeValue] = {
        inApp: typeof value.inApp === 'boolean' ? value.inApp : current.inApp,
        email: typeof value.email === 'boolean' ? value.email : current.email,
      };
    }
  }

  let mutedUntil: Date | null = existing.mutedUntil;
  if (body.mutedUntil !== undefined) {
    if (body.mutedUntil === null || body.mutedUntil === '') {
      mutedUntil = null;
    } else {
      const parsed = new Date(body.mutedUntil);
      if (Number.isNaN(parsed.getTime())) {
        res.status(400).json({ error: 'Invalid mutedUntil date' });
        return;
      }
      mutedUntil = parsed;
    }
  }

  const updated = await upsertUserNotificationPreferences(userId, {
    channels: parseNotificationPreferenceChannels(channels),
    mutedUntil,
  });

  res.json({
    channels: updated.channels,
    mutedUntil: updated.mutedUntil?.toISOString() ?? null,
  });
}

export async function getNotificationCapabilities(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const [settings, user] = await Promise.all([
    getOrCreateSystemSettings(),
    prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { timezone: true },
    }),
  ]);
  const pollIntervalSeconds = clampPollInterval(
    settings.notificationPollIntervalSeconds,
  );
  const smtpConfigured = await isSmtpConfigured();
  const defaultTimezone = settings.defaultTimezone;
  res.json({
    pollIntervalSeconds,
    emailAvailable: smtpConfigured,
    minPollIntervalSeconds: MIN_POLL_INTERVAL_SECONDS,
    maxPollIntervalSeconds: MAX_POLL_INTERVAL_SECONDS,
    defaultTimezone,
    effectiveTimezone: resolveEffectiveTimezone({
      userTimezone: user?.timezone ?? null,
      systemDefaultTimezone: defaultTimezone,
    }),
  });
}
