import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listContentPacks } from '../controllers/contentPacksController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const contentPacksRouter = Router();

contentPacksRouter.use(requireAuth);
contentPacksRouter.use(rateLimitPolicy('authenticated'));
contentPacksRouter.get('/', listContentPacks);
