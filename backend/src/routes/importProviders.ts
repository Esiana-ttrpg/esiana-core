import { Router } from 'express';
import { authenticateApiOrSession, requireAuthenticatedApiOrSession } from '../middleware/auth.js';
import { listImportProvidersHandler } from '../controllers/importProvidersController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const importProvidersRouter = Router();

importProvidersRouter.use(authenticateApiOrSession);
importProvidersRouter.use(requireAuthenticatedApiOrSession);
importProvidersRouter.use(rateLimitPolicy('authenticated'));
importProvidersRouter.use(rateLimitPolicy('apiKey'));
importProvidersRouter.get('/', listImportProvidersHandler);
