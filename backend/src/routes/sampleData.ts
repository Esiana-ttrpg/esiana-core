import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listSampleDataProfiles } from '../controllers/sampleDataController.js';

export const sampleDataRouter = Router();

sampleDataRouter.use(requireAuth);
sampleDataRouter.get('/profiles', listSampleDataProfiles);
