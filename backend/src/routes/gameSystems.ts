import { Router } from 'express';
import { listGameSystems } from '../controllers/gameSystemsController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const gameSystemsRouter = Router();

gameSystemsRouter.use(rateLimitPolicy('public'));

gameSystemsRouter.get('/', listGameSystems);
