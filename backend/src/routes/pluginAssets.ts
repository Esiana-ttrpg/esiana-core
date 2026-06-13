import { Router } from 'express';
import { servePluginAsset } from '../controllers/frontendPluginsController.js';
import { requireAuth } from '../middleware/auth.js';

export const pluginAssetsRouter = Router();

pluginAssetsRouter.use(requireAuth);

pluginAssetsRouter.get('/:pluginId/*assetPath', servePluginAsset);
