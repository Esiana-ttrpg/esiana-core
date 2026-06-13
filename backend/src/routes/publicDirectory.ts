import { Router } from 'express';
import { getPublicDirectory } from '../controllers/publicDirectoryController.js';

export const publicDirectoryRouter = Router();

publicDirectoryRouter.get('/', getPublicDirectory);
