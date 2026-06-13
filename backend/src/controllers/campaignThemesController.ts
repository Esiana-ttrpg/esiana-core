import type { Request, Response } from 'express';
import { CAMPAIGN_THEMES } from '../lib/campaignThemes.js';

export async function listCampaignThemes(_req: Request, res: Response): Promise<void> {
  res.json({ themes: CAMPAIGN_THEMES });
}
