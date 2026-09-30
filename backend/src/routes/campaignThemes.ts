import { Router } from 'express';
import { listCampaignThemes } from '../controllers/campaignThemesController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const campaignThemesRouter = Router();

campaignThemesRouter.use(rateLimitPolicy('public'));

campaignThemesRouter.get('/', listCampaignThemes);
