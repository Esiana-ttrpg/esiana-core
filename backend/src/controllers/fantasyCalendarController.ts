import type { Response } from 'express';
import { Prisma } from '@prisma/client';
import { getCampaignPrisma } from '../lib/campaignPrisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  buildFantasyCalendarExportPayload,
  fantasyCalendarExportFilename,
} from '../lib/fantasyCalendarExport.js';
import {
  createBoilerplateFantasyCalendarData,
  mergeFantasyCalendarPatch,
  serializeEpochMinute,
} from '../lib/timeTracking.js';

const calendarOrderBy = [{ isMasterTime: 'desc' as const }, { name: 'asc' as const }];

export function serializeFantasyCalendar(row: {
  id: string;
  campaignId: string;
  name: string;
  isMasterTime: boolean;
  epochOffset: bigint;
  weekdays: unknown;
  months: unknown;
  seasons: unknown;
  moons: unknown;
  leapDays: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    campaignId: row.campaignId,
    name: row.name,
    isMasterTime: row.isMasterTime,
    epochOffset: serializeEpochMinute(row.epochOffset),
    weekdays: row.weekdays,
    months: row.months,
    seasons: row.seasons,
    moons: row.moons,
    leapDays: row.leapDays,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listFantasyCalendars(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaignPrisma = getCampaignPrisma(campaignId);
  const calendars = await campaignPrisma.fantasyCalendar.findMany({
    orderBy: calendarOrderBy,
  });
  res.json({
    calendars: calendars.map((c) => serializeFantasyCalendar(c)),
  });
}

export async function createFantasyCalendar(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaignPrisma = getCampaignPrisma(campaignId);
  const body = (req.body ?? {}) as Record<string, unknown>;

  const preferredName =
    typeof body.name === 'string' && body.name.trim() ? body.name.trim() : 'New chronology';

  const count = await campaignPrisma.fantasyCalendar.count();
  const assumeMaster =
    typeof body.isMasterTime === 'boolean' ? body.isMasterTime : count === 0;

  const blueprint = createBoilerplateFantasyCalendarData(preferredName, {
    isMasterTime: assumeMaster,
  });

  const created = await campaignPrisma.$transaction(async (tx) => {
    if (blueprint.isMasterTime) {
      await tx.fantasyCalendar.updateMany({
        where: { campaignId },
        data: { isMasterTime: false },
      });
    }

    return tx.fantasyCalendar.create({
      data: {
        campaignId,
        name: blueprint.name,
        isMasterTime: blueprint.isMasterTime,
        epochOffset: blueprint.epochOffset,
        weekdays: blueprint.weekdays as unknown as Prisma.InputJsonValue,
        months: blueprint.months as unknown as Prisma.InputJsonValue,
        seasons: blueprint.seasons as unknown as Prisma.InputJsonValue,
        moons: blueprint.moons as unknown as Prisma.InputJsonValue,
        leapDays: blueprint.leapDays as unknown as Prisma.InputJsonValue,
      },
    });
  });

  res.status(201).json({
    calendar: serializeFantasyCalendar(created),
  });
}

export async function updateFantasyCalendar(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaignPrisma = getCampaignPrisma(campaignId);
  const calendarId = String(req.params.calendarId ?? '');

  if (!calendarId) {
    res.status(400).json({ error: 'calendarId is required' });
    return;
  }

  const existing = await campaignPrisma.fantasyCalendar.findFirst({
    where: { id: calendarId, campaignId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  const body = req.body as Record<string, unknown> | null;
  if (!body || typeof body !== 'object') {
    res.status(400).json({ error: 'Expected JSON body' });
    return;
  }

  const merged = mergeFantasyCalendarPatch(
    {
      name: existing.name,
      isMasterTime: existing.isMasterTime,
      epochOffset: existing.epochOffset,
      weekdays: existing.weekdays,
      months: existing.months,
      seasons: existing.seasons,
      moons: existing.moons,
      leapDays: existing.leapDays,
    },
    body,
  );

  if (!merged) {
    res.status(400).json({
      error:
        'Invalid calendar payload. Ensure name, epochOffset, weekdays, months (non-empty), seasons, moons, and leapDays are valid.',
    });
    return;
  }

  const updated = await campaignPrisma.$transaction(async (tx) => {
    if (merged.isMasterTime) {
      await tx.fantasyCalendar.updateMany({
        where: { campaignId, NOT: { id: calendarId } },
        data: { isMasterTime: false },
      });
    }

    const result = await tx.fantasyCalendar.updateMany({
      where: { id: calendarId, campaignId },
      data: {
        name: merged.name,
        isMasterTime: merged.isMasterTime,
        epochOffset: merged.epochOffset,
        weekdays: merged.weekdays as unknown as Prisma.InputJsonValue,
        months: merged.months as unknown as Prisma.InputJsonValue,
        seasons: merged.seasons as unknown as Prisma.InputJsonValue,
        moons: merged.moons as unknown as Prisma.InputJsonValue,
        leapDays: merged.leapDays as unknown as Prisma.InputJsonValue,
      },
    });

    if (result.count === 0) return null;
    return tx.fantasyCalendar.findFirst({ where: { id: calendarId, campaignId } });
  });

  if (!updated) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  res.json({
    calendar: serializeFantasyCalendar(updated),
  });
}

export async function deleteFantasyCalendar(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaignPrisma = getCampaignPrisma(campaignId);
  const calendarId = String(req.params.calendarId ?? '');

  if (!calendarId) {
    res.status(400).json({ error: 'calendarId is required' });
    return;
  }

  const existing = await campaignPrisma.fantasyCalendar.findFirst({
    where: { id: calendarId, campaignId },
  });

  if (!existing) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  if (existing.isMasterTime) {
    res.status(400).json({
      error:
        'Cannot delete the master chronology calendar. Promote another calendar to master before deleting this one.',
    });
    return;
  }

  await campaignPrisma.fantasyCalendar.deleteMany({
    where: { id: calendarId, campaignId },
  });

  res.json({ ok: true });
}

export async function exportFantasyCalendarJson(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaignPrisma = getCampaignPrisma(campaignId);
  const calendarId = String(req.params.calendarId ?? '');

  if (!calendarId) {
    res.status(400).json({ error: 'calendarId is required' });
    return;
  }

  const [campaign, calendar] = await Promise.all([
    campaignPrisma.campaign.findUniqueOrThrow({
      where: { id: campaignId },
      select: { currentEpochMinute: true },
    }),
    campaignPrisma.fantasyCalendar.findFirst({
      where: { id: calendarId, campaignId },
    }),
  ]);

  if (!calendar) {
    res.status(404).json({ error: 'Calendar not found' });
    return;
  }

  const payload = buildFantasyCalendarExportPayload({
    name: calendar.name,
    epochOffset: calendar.epochOffset,
    weekdays: calendar.weekdays,
    months: calendar.months,
    moons: calendar.moons,
    seasons: calendar.seasons,
    leapDays: calendar.leapDays,
    currentEpochMinute: campaign.currentEpochMinute,
  });

  const filename = fantasyCalendarExportFilename(calendar.name);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(payload);
}
