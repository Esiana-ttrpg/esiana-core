import { Router } from 'express';
import {
  getPublicUserProfile,
  getUserAvatar,
} from '../controllers/userPublicController.js';
import { getPublicCreatorAttribution, getPublicUserActivity } from '../controllers/statsController.js';
import {
  getPublicPortfolioCharacter,
  getUserAssetFile,
} from '../controllers/portfolioController.js';
import { authenticateApiOrSession, optionalAuth, requireTokenScopes } from '../middleware/auth.js';
import { API_TOKEN_SCOPES } from '../lib/apiToken.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const usersPublicRouter = Router();

usersPublicRouter.use(rateLimitPolicy('public'));

usersPublicRouter.get(
  '/:id/avatar',
  rateLimitPolicy('expensive', { scope: 'ip' }),
  getUserAvatar,
);
usersPublicRouter.get('/:id/public-profile', optionalAuth, getPublicUserProfile);
usersPublicRouter.get('/:id/creator-attribution', optionalAuth, getPublicCreatorAttribution);
usersPublicRouter.get('/:id/activity', optionalAuth, getPublicUserActivity);
usersPublicRouter.get(
  '/:id/characters/:characterId',
  authenticateApiOrSession,
  requireTokenScopes([API_TOKEN_SCOPES.CAMPAIGN_READ]),
  rateLimitPolicy('apiKey'),
  getPublicPortfolioCharacter,
);
usersPublicRouter.get(
  '/assets/:assetId',
  authenticateApiOrSession,
  requireTokenScopes([API_TOKEN_SCOPES.CAMPAIGN_READ]),
  rateLimitPolicy('apiKey'),
  rateLimitPolicy('expensive', { scope: 'ip' }),
  getUserAssetFile,
);
