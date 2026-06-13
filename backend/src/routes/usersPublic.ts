import { Router } from 'express';
import {
  getPublicUserProfile,
  getUserAvatar,
} from '../controllers/userPublicController.js';

export const usersPublicRouter = Router();

usersPublicRouter.get('/:id/avatar', getUserAvatar);
usersPublicRouter.get('/:id/public-profile', getPublicUserProfile);
