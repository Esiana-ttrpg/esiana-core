import type { Express, Router as ExpressRouter } from 'express';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { campaignsRouter } from './routes/campaigns.js';
import { pluginConnectionsRouter } from './routes/pluginConnections.js';
import { pluginConnectionFixturesRouter } from './routes/pluginConnectionFixtures.js';
import { campaignScopedRouter } from './routes/campaignScoped.js';
import { createPluginsRouter } from './routes/plugins.js';
import { publicDirectoryRouter } from './routes/publicDirectory.js';
import { recruitmentRouter } from './routes/recruitment.js';
import { gameSystemsRouter } from './routes/gameSystems.js';
import { campaignThemesRouter } from './routes/campaignThemes.js';
import { publicSystemRouter } from './routes/publicSystem.js';
import { usersPublicRouter } from './routes/usersPublic.js';
import { adminRouter } from './routes/admin.js';
import { sampleDataRouter } from './routes/sampleData.js';
import { contentPacksRouter } from './routes/contentPacks.js';
import { importProvidersRouter } from './routes/importProviders.js';
import {
  createOpenApiDocsRouter,
  isOpenApiDocsEnabled,
} from './routes/openapiDocs.js';
import { pluginAssetsRouter } from './routes/pluginAssets.js';
import { assetsRouter } from './routes/assets.js';
import { authenticateApiOrSession } from './middleware/auth.js';
import { getUploadByFilename } from './controllers/assetsController.js';
import { rateLimitPolicy } from './lib/rateLimit/index.js';

export interface RouterMount {
  /** Absolute mount path (Express pattern). */
  path: string;
  /** Router or null when the mount is a single app-level route. */
  router: ExpressRouter | null;
  /**
   * App-level middleware applied before the router/handlers at this mount.
   * Used by the coverage audit so app-level policies are visible.
   */
  middleware?: Array<{ rateLimitPolicy?: string } | unknown>;
}

/**
 * Canonical list of statically declared mounts.
 * Shared by `mountRouters` and the rate-limit coverage audit so they cannot drift.
 */
export function listRouterMounts(): RouterMount[] {
  const mounts: RouterMount[] = [
    {
      path: '/uploads/:filename',
      router: null,
      middleware: [
        authenticateApiOrSession,
        rateLimitPolicy('authenticated'),
        getUploadByFilename,
      ],
    },
    { path: '/api/health', router: healthRouter },
    { path: '/api/public-directory', router: publicDirectoryRouter },
    { path: '/api/recruitment', router: recruitmentRouter },
    { path: '/api/game-systems', router: gameSystemsRouter },
    { path: '/api/campaign-themes', router: campaignThemesRouter },
    { path: '/api/public/system', router: publicSystemRouter },
    { path: '/api/users', router: usersPublicRouter },
    { path: '/api/auth', router: authRouter },
    { path: '/api/user', router: userRouter },
    { path: '/api/campaigns', router: campaignsRouter },
    { path: '/api/plugin-connections', router: pluginConnectionsRouter },
    {
      path: '/api/plugin-connection-fixtures',
      router: pluginConnectionFixturesRouter,
    },
    { path: '/api/campaigns/:campaignHandle', router: campaignScopedRouter },
    { path: '/api/assets', router: assetsRouter },
    { path: '/api/plugins', router: createPluginsRouter() },
    { path: '/api/plugin-assets', router: pluginAssetsRouter },
    { path: '/api/admin', router: adminRouter },
    { path: '/api/sample-data', router: sampleDataRouter },
    { path: '/api/content-packs', router: contentPacksRouter },
    { path: '/api/import-providers', router: importProvidersRouter },
  ];

  if (isOpenApiDocsEnabled()) {
    mounts.push({ path: '/api/docs', router: createOpenApiDocsRouter() });
  }

  return mounts;
}

/**
 * Mount every statically-declared HTTP router.
 * Shared by `createApp` and the rate-limit coverage audit so the two cannot drift.
 * Does not mount plugin-runtime hosts (those require plugin bootstrap; host-level
 * rate limits are applied in `mountPluginHost` / `mountPublicPluginHost`).
 */
export function mountRouters(app: Express): void {
  for (const mount of listRouterMounts()) {
    if (mount.router) {
      app.use(mount.path, mount.router);
    } else if (mount.path === '/uploads/:filename') {
      // Single app-level route — keep auth optional (handler ACL decides).
      app.get(
        '/uploads/:filename',
        authenticateApiOrSession,
        rateLimitPolicy('authenticated'),
        getUploadByFilename,
      );
    }
  }
}
