import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import { CALENDAR_EVENT_IMPORTANCES } from '../../../shared/calendarEventImportance.js';

const VALUES = CALENDAR_EVENT_IMPORTANCES;
function value(input: unknown, fallback: (typeof VALUES)[number]) {
  if (input === undefined) return fallback;
  if (typeof input !== 'string' || !(VALUES as readonly string[]).includes(input.toUpperCase())) return null;
  return input.toUpperCase() as (typeof VALUES)[number];
}

function normalized(input: string | undefined, fallback: (typeof VALUES)[number]): (typeof VALUES)[number] {
  return value(input, fallback) ?? fallback;
}

export async function getChronologySettings(req: CampaignScopedRequest, res: Response): Promise<void> {
  const settings = await prisma.chronologySettings.upsert({
    where: { campaignId: req.campaign!.campaignId },
    create: { campaignId: req.campaign!.campaignId },
    update: {},
  });
  res.json({ settings });
}

export async function updateChronologySettings(req: CampaignScopedRequest, res: Response): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const current = await prisma.chronologySettings.findUnique({ where: { campaignId } });
  const body = (req.body ?? {}) as Record<string, unknown>;
  const manualEventImportance = value(body.manualEventImportance, normalized(current?.manualEventImportance, 'MINOR'));
  const downtimeEventImportance = value(body.downtimeEventImportance, normalized(current?.downtimeEventImportance, 'NOTICE'));
  const progressionEventImportance = value(body.progressionEventImportance, normalized(current?.progressionEventImportance, 'NOTICE'));
  if (!manualEventImportance || !downtimeEventImportance || !progressionEventImportance) {
    res.status(400).json({ error: 'event importance defaults must be NOTICE, MINOR, or MAJOR' }); return;
  }
  const settings = await prisma.chronologySettings.upsert({
    where: { campaignId },
    create: { campaignId, manualEventImportance, downtimeEventImportance, progressionEventImportance },
    update: { manualEventImportance, downtimeEventImportance, progressionEventImportance },
  });
  res.json({ settings });
}
