import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listSampleDataProfiles } from '../controllers/sampleDataController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const sampleDataRouter = Router();

sampleDataRouter.use(requireAuth);
sampleDataRouter.use(rateLimitPolicy('authenticated'));
sampleDataRouter.get('/profiles', listSampleDataProfiles);
