import { Router } from 'express';
import { getPublicSystemStatus } from '../controllers/publicSystemController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const publicSystemRouter = Router();

publicSystemRouter.use(rateLimitPolicy('public'));

publicSystemRouter.get('/status', getPublicSystemStatus);
