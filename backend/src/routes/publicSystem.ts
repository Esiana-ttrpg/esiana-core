import { Router } from 'express';
import { getPublicSystemStatus } from '../controllers/publicSystemController.js';

export const publicSystemRouter = Router();

publicSystemRouter.get('/status', getPublicSystemStatus);
