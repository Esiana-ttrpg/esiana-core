import { Router } from 'express';
import { listCampaignThemes } from '../controllers/campaignThemesController.js';

export const campaignThemesRouter = Router();

campaignThemesRouter.get('/', listCampaignThemes);
