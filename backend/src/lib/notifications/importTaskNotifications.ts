import { prisma } from '../prisma.js';
import { getBackgroundTask } from '../taskRegistry.js';
import { notifyUsersAsync } from './notificationService.js';
import { NotificationType } from './types.js';
import { campaignSettingsPath } from './deepLinks.js';

function readRequestedByUserId(taskId?: string): string | null {
  if (!taskId) return null;
  const task = getBackgroundTask(taskId);
  const userId = task?.meta?.requestedByUserId;
  return typeof userId === 'string' && userId.trim() ? userId.trim() : null;
}

export async function notifyImportTaskComplete(input: {
  campaignId: string;
  taskId?: string;
  kind: 'import' | 'restore';
}): Promise<void> {
  const userId = readRequestedByUserId(input.taskId);
  if (!userId) return;

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { handle: true, name: true },
  });
  if (!campaign) return;

  notifyUsersAsync({
    userIds: [userId],
    type: NotificationType.IMPORT_COMPLETE,
    title:
      input.kind === 'restore'
        ? `Restore complete: ${campaign.name}`
        : `Import complete: ${campaign.name}`,
    body:
      input.kind === 'restore'
        ? 'Your campaign backup has been restored.'
        : 'Your Obsidian import has finished processing.',
    linkUrl: campaignSettingsPath(campaign.handle, 'advanced'),
    campaignId: input.campaignId,
  });
}

export async function notifyImportTaskFailed(input: {
  campaignId: string;
  taskId?: string;
  kind: 'import' | 'restore';
  message: string;
}): Promise<void> {
  const userId = readRequestedByUserId(input.taskId);
  if (!userId) return;

  const campaign = await prisma.campaign.findUnique({
    where: { id: input.campaignId },
    select: { handle: true, name: true },
  });

  notifyUsersAsync({
    userIds: [userId],
    type: NotificationType.IMPORT_FAILED,
    title:
      input.kind === 'restore'
        ? `Restore failed${campaign ? `: ${campaign.name}` : ''}`
        : `Import failed${campaign ? `: ${campaign.name}` : ''}`,
    body: input.message,
    linkUrl: campaign ? campaignSettingsPath(campaign.handle, 'advanced') : '/hub',
    campaignId: input.campaignId,
  });
}
