import { Router } from 'express';
import {
  getAllRecruitmentCampaigns,
  getFeaturedRecruitmentCampaigns,
  getRecruitmentLobbyBySlug,
} from '../controllers/recruitmentMarketplaceController.js';

export const recruitmentRouter = Router();

recruitmentRouter.get('/featured', getFeaturedRecruitmentCampaigns);
recruitmentRouter.get('/all', getAllRecruitmentCampaigns);
recruitmentRouter.get('/lobby/:handle', getRecruitmentLobbyBySlug);
