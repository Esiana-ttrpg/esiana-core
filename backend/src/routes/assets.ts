import { Router } from 'express';
import { authenticateApiOrSession } from '../middleware/auth.js';
import { getAssetById } from '../controllers/assetsController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const assetsRouter = Router();

assetsRouter.get(
  '/:assetId',
  authenticateApiOrSession,
  rateLimitPolicy('authenticated'),
  rateLimitPolicy('apiKey'),
  getAssetById,
);
