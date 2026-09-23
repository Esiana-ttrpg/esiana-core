import { Router } from 'express';
import { authenticateApiOrSession } from '../middleware/auth.js';
import { getAssetById } from '../controllers/assetsController.js';

export const assetsRouter = Router();

assetsRouter.get('/:assetId', authenticateApiOrSession, getAssetById);
