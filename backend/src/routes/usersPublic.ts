import { Router } from 'express';
import {
  getPublicUserProfile,
  getUserAvatar,
} from '../controllers/userPublicController.js';
import { getPublicCreatorAttribution, getPublicUserActivity } from '../controllers/statsController.js';
import { optionalAuth } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const usersPublicRouter = Router();

usersPublicRouter.use(rateLimitPolicy('public'));

usersPublicRouter.get(
  '/:id/avatar',
  rateLimitPolicy('expensive', { scope: 'ip' }),
  getUserAvatar,
);
usersPublicRouter.get('/:id/public-profile', getPublicUserProfile);
usersPublicRouter.get('/:id/creator-attribution', optionalAuth, getPublicCreatorAttribution);
usersPublicRouter.get('/:id/activity', optionalAuth, getPublicUserActivity);
