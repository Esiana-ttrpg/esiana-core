import { Router } from 'express';
import { getPublicDirectory } from '../controllers/publicDirectoryController.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const publicDirectoryRouter = Router();

publicDirectoryRouter.use(rateLimitPolicy('public'));

publicDirectoryRouter.get('/', getPublicDirectory);
