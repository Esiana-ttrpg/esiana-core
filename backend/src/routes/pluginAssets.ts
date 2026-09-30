import { Router } from 'express';
import { servePluginAsset } from '../controllers/frontendPluginsController.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';

export const pluginAssetsRouter = Router();

pluginAssetsRouter.use(requireAuth);
// Asset delivery is bursty normal traffic — use the authenticated baseline only.
// Do not apply `expensive` here; that budget is reserved for genuine heavy ops
// (plugin sync/install/uninstall, backups, uploads, etc.).
pluginAssetsRouter.use(rateLimitPolicy('authenticated'));

pluginAssetsRouter.get('/:pluginId/*assetPath', servePluginAsset);
