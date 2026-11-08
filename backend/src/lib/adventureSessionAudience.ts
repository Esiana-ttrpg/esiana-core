import { ContentPresenceEntityType } from '../../../shared/contentPresence.js';
import { prisma } from './prisma.js';

export function isAdventureSessionAvailable(
  row: { state: string; availableFromEpochMinute: bigint | null } | undefined,
  now: bigint,
): boolean {
  return !row || (row.state === 'REVEALED' &&
    (row.availableFromEpochMinute == null || row.availableFromEpochMinute <= now));
}

/** Session anchors require both a visible canonical page and available session presence. */
export async function visibleAdventureSessionIds(
  campaignId: string, pageIds: ReadonlySet<string>,
): Promise<Set<string>> {
  const [sessions, presence, campaign] = await Promise.all([
    prisma.campaignSessionTimeline.findMany({ where: { campaignId, wikiPageId: { in: [...pageIds] } },
      select: { id: true, wikiPageId: true } }),
    prisma.contentPresenceState.findMany({ where: { campaignId,
      entityType: ContentPresenceEntityType.SESSION_NOTE, subEntityId: null },
      select: { entityId: true, state: true, availableFromEpochMinute: true } }),
    prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { currentEpochMinute: true } }),
  ]);
  const byId = new Map(presence.map(row => [row.entityId, row]));
  const available = (id: string) => isAdventureSessionAvailable(byId.get(id), campaign.currentEpochMinute);
  return new Set(sessions.filter(row => available(row.id) && available(row.wikiPageId)).map(row => row.id));
}
