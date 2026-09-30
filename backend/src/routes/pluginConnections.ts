import { Router } from 'express';
import { pluginOAuthCallback } from '../controllers/pluginConnectionOAuthController.js';
import { authenticateApiOrSession, requireAuthenticatedApiOrSession } from '../middleware/auth.js';
import { oidcCallbackLimiter } from '../middleware/rateLimit.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const pluginConnectionsRouter = Router();
pluginConnectionsRouter.get(
  '/oauth/callback',
  rateLimitPolicy('public'),
  oidcCallbackLimiter,
  authenticateApiOrSession,
  requireAuthenticatedApiOrSession,
  pluginOAuthCallback,
);
