import { prisma } from './prisma.js';
import { buildCalendarStates } from './timeTracking.js';

export type DashboardChronometerSummary = {
  masterCalendarId: string | null;
  label: string | null;
  season: string | null;
  moonPhase: string | null;
  upcomingEvents: Array<{ id: string; title: string; startAt: string }>;
};

export async function buildDashboardChronometer(
  campaignId: string,
): Promise<DashboardChronometerSummary | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      currentEpochMinute: true,
      fantasyCalendars: {
        orderBy: [{ isMasterTime: 'desc' }, { name: 'asc' }],
      },
    },
  });

  if (!campaign || campaign.fantasyCalendars.length === 0) {
    return null;
  }

  const calendars = buildCalendarStates(
    campaign.currentEpochMinute,
    campaign.fantasyCalendars,
  );
  const master = calendars.find((c) => c.isMasterTime) ?? calendars[0];
  if (!master) return null;

  const state = master.state;
  const dayLabel = `${state.day} ${state.monthName}, Year ${state.year}`;
  const moonPhase =
    state.activeMoonPhases.length > 0
      ? state.activeMoonPhases.map((m) => `${m.name}: ${m.phase}`).join(' · ')
      : null;

  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: { calendarId: master.id },
    select: { id: true, title: true, updatedAt: true },
    orderBy: [{ targetEpochMinute: 'asc' }, { updatedAt: 'desc' }],
    take: 2,
  });

  return {
    masterCalendarId: master.id,
    label: dayLabel,
    season: state.seasonName || null,
    moonPhase,
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.updatedAt.toISOString(),
    })),
  };
}

export function formatChronometerStatusLabel(
  chronometer: DashboardChronometerSummary | null,
): string | null {
  if (!chronometer) return null;
  const parts = [chronometer.season, chronometer.label].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : chronometer.label;
}
