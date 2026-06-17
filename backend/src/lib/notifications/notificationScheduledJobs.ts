import { prisma } from '../prisma.js';
import {
  notifyUsersAsync,
  getCampaignMemberUserIds,
} from './notificationService.js';
import {
  NotificationType,
  SessionScheduleStatus,
  SessionAttendanceStatus,
} from './types.js';
import { campaignNotePath } from './deepLinks.js';
import { expireStaleOwnershipTransfers } from '../ownershipTransferExpiry.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from '../taskRegistry.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export async function runSessionReminderSweep(): Promise<number> {
  const now = Date.now();
  const windowStart = new Date(now + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now + 25 * 60 * 60 * 1000);

  const schedules = await prisma.campaignSessionSchedule.findMany({
    where: {
      status: SessionScheduleStatus.PUBLISHED,
      plannedStartAt: { gte: windowStart, lte: windowEnd },
      reminderSentAt: null,
    },
    include: {
      timelinePoint: {
        include: {
          campaign: { select: { id: true, handle: true } },
          wikiPage: { select: { title: true } },
        },
      },
    },
  });

  let sent = 0;
  for (const schedule of schedules) {
    const campaignId = schedule.timelinePoint.campaignId;
    const slug = schedule.timelinePoint.campaign.handle;

    const attendance = await prisma.sessionAttendance.findMany({
      where: { timelinePointId: schedule.timelinePointId },
    });
    const absentUserIds = new Set(
      attendance
        .filter((row) => row.status === SessionAttendanceStatus.ABSENT)
        .map((row) => row.userId),
    );

    let recipientIds = await getCampaignMemberUserIds(campaignId);
    if (attendance.length > 0) {
      recipientIds = recipientIds.filter((id) => !absentUserIds.has(id));
    }

    if (recipientIds.length === 0) continue;

    const marked = await prisma.campaignSessionSchedule.updateMany({
      where: {
        timelinePointId: schedule.timelinePointId,
        reminderSentAt: null,
      },
      data: { reminderSentAt: new Date() },
    });

    if (marked.count === 0) continue;

    notifyUsersAsync({
      userIds: recipientIds,
      type: NotificationType.SESSION_REMINDER_24H,
      title: `Session tomorrow: ${schedule.timelinePoint.wikiPage.title}`,
      body: schedule.plannedStartAt
        ? `Starts ${schedule.plannedStartAt.toLocaleString()}`
        : 'Your session is coming up in about 24 hours.',
      linkUrl: campaignNotePath(slug, schedule.timelinePointId),
      campaignId,
    });
    sent += 1;
  }

  return sent;
}

async function runNotificationSweepOnce(): Promise<void> {
  const task = createBackgroundTask({
    taskName: 'Notification sweep',
    type: 'SCHEDULED',
    status: 'PROCESSING',
    progress: 10,
    abortable: false,
    cronKey: 'notification-sweep',
  });

  try {
    const reminders = await runSessionReminderSweep();
    updateBackgroundTask(task.id, { progress: 60 });
    const expiredTransfers = await expireStaleOwnershipTransfers({ notify: true });
    updateBackgroundTask(task.id, {
      status: 'COMPLETED',
      progress: 100,
      metaMerge: { remindersSent: reminders, expiredTransfers },
    });
  } catch (error) {
    updateBackgroundTask(task.id, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Notification sweep failed',
    });
  }
}

export function startNotificationSweep(): void {
  void runNotificationSweepOnce();
  setInterval(() => {
    void runNotificationSweepOnce();
  }, FIFTEEN_MINUTES_MS).unref();
}
