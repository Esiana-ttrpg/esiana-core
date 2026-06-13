import { Router } from 'express';
import { authenticateApiOrSession, requireAuthenticatedApiOrSession } from '../middleware/auth.js';
import { listImportProvidersHandler } from '../controllers/importProvidersController.js';

export const importProvidersRouter = Router();

importProvidersRouter.use(authenticateApiOrSession);
importProvidersRouter.use(requireAuthenticatedApiOrSession);
importProvidersRouter.get('/', listImportProvidersHandler);
