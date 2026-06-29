import { Router } from 'express';
import {
  getPublicUserProfile,
  getUserAvatar,
} from '../controllers/userPublicController.js';
import { getPublicCreatorAttribution } from '../controllers/statsController.js';
import { optionalAuth } from '../middleware/auth.js';

export const usersPublicRouter = Router();

usersPublicRouter.get('/:id/avatar', getUserAvatar);
usersPublicRouter.get('/:id/public-profile', getPublicUserProfile);
usersPublicRouter.get('/:id/creator-attribution', optionalAuth, getPublicCreatorAttribution);
