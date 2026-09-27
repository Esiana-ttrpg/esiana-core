import { Router } from 'express';
import { pluginOAuthCallback } from '../controllers/pluginConnectionOAuthController.js';
import { authenticateApiOrSession, requireAuthenticatedApiOrSession } from '../middleware/auth.js';
import { oidcCallbackLimiter } from '../middleware/rateLimit.js';
export const pluginConnectionsRouter = Router();
pluginConnectionsRouter.get('/oauth/callback', oidcCallbackLimiter, authenticateApiOrSession, requireAuthenticatedApiOrSession, pluginOAuthCallback);
