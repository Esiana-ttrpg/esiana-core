import { prisma } from '../prisma.js';
import { NarrativeEventType } from '../narrativeEventService.js';
import { resolveUserDisplayName } from '../userDisplay.js';
import type { RecentEditor } from '../../../../shared/statsTypes.js';

const EDITOR_EVENT_TYPES = [
  NarrativeEventType.PAGE_EDITED,
  NarrativeEventType.PAGE_CREATED,
  NarrativeEventType.LINK_CREATED,
] as const;

export async function buildCampaignRecentEditors(
  campaignId: string,
  periodDays = 30,
): Promise<RecentEditor[]> {
  const since = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const grouped = await prisma.narrativeEvent.groupBy({
    by: ['actorUserId'],
    where: {
      campaignId,
      source: 'user',
      createdAt: { gte: since },
      actorUserId: { not: null },
      type: { in: [...EDITOR_EVENT_TYPES] },
    },
    _count: { _all: true },
  });

  const actorIds = grouped
    .map((row) => row.actorUserId)
    .filter((id): id is string => id != null);

  if (actorIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
    },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const editors: RecentEditor[] = grouped
    .filter((row) => row.actorUserId != null)
    .map((row) => {
      const user = userById.get(row.actorUserId!);
      return {
        userId: row.actorUserId!,
        displayName: user
          ? resolveUserDisplayName(user)
          : 'Unknown writer',
        avatarUrl: user?.avatarUrl ?? null,
        editsInPeriod: row._count._all,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return editors;
}
