import { prisma } from './prisma.js';
import { buildCalendarStates } from './timeTracking.js';
import type { ChronologyDateParts } from './entityRelationTypes.js';

export async function resolveCampaignChronologyNow(
  campaignId: string,
): Promise<ChronologyDateParts> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: {
      fantasyCalendars: {
        orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
      },
    },
  });
  if (!campaign) return { year: 1, month: 0, day: 1 };
  const calendars = buildCalendarStates(
    campaign.currentEpochMinute,
    campaign.fantasyCalendars,
  );
  const master = calendars.find((c) => c.isMasterTime) ?? calendars[0];
  if (!master) return { year: 1, month: 0, day: 1 };
  return {
    year: master.state.year,
    month: master.state.monthIndex,
    day: master.state.day,
  };
}
