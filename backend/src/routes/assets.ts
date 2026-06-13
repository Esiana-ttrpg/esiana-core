import { Router } from 'express';
import { optionalAuth } from '../middleware/auth.js';
import { getAssetById } from '../controllers/assetsController.js';

export const assetsRouter = Router();

assetsRouter.get('/:assetId', optionalAuth, getAssetById);
