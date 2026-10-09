import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';

const VALUES = ['NOTICE', 'MINOR', 'MAJOR'] as const;
function value(input: unknown, fallback: (typeof VALUES)[number]) {
  if (input === undefined) return fallback;
  if (typeof input !== 'string' || !(VALUES as readonly string[]).includes(input.toUpperCase())) return null;
  return input.toUpperCase() as (typeof VALUES)[number];
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
  const manualEventImportance = value(body.manualEventImportance, current?.manualEventImportance ?? 'MINOR');
  const downtimeEventImportance = value(body.downtimeEventImportance, current?.downtimeEventImportance ?? 'NOTICE');
  const progressionEventImportance = value(body.progressionEventImportance, current?.progressionEventImportance ?? 'NOTICE');
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
