import { Router } from 'express';
import {
  getAllRecruitmentCampaigns,
  getFeaturedRecruitmentCampaigns,
  getRecruitmentLobbyBySlug,
} from '../controllers/recruitmentMarketplaceController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const recruitmentRouter = Router();

recruitmentRouter.use(rateLimitPolicy('public'));

recruitmentRouter.get('/featured', getFeaturedRecruitmentCampaigns);
recruitmentRouter.get('/all', getAllRecruitmentCampaigns);
recruitmentRouter.get('/lobby/:handle', getRecruitmentLobbyBySlug);
