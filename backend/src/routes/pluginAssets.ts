import { Router } from 'express';
import { servePluginAsset } from '../controllers/frontendPluginsController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const pluginAssetsRouter = Router();

pluginAssetsRouter.use(requireAuth);
pluginAssetsRouter.use(rateLimitPolicy('authenticated'));
pluginAssetsRouter.use(rateLimitPolicy('expensive'));

pluginAssetsRouter.get('/:pluginId/*assetPath', servePluginAsset);
