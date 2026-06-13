import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listContentPacks } from '../controllers/contentPacksController.js';

export const contentPacksRouter = Router();

contentPacksRouter.use(requireAuth);
contentPacksRouter.get('/', listContentPacks);
