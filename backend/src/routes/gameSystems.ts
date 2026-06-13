import { Router } from 'express';
import { listGameSystems } from '../controllers/gameSystemsController.js';

export const gameSystemsRouter = Router();

gameSystemsRouter.get('/', listGameSystems);
