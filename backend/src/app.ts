import fs from 'node:fs';
import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { userRouter } from './routes/user.js';
import { campaignsRouter } from './routes/campaigns.js';
import { campaignScopedRouter } from './routes/campaignScoped.js';
import { createPluginsRouter } from './routes/plugins.js';
import { publicDirectoryRouter } from './routes/publicDirectory.js';
import { recruitmentRouter } from './routes/recruitment.js';
import { gameSystemsRouter } from './routes/gameSystems.js';
import { campaignThemesRouter } from './routes/campaignThemes.js';
import { publicSystemRouter } from './routes/publicSystem.js';
import { usersPublicRouter } from './routes/usersPublic.js';
import { mountPluginHost, syncGlobalSystemPluginsFromDisk, syncCampaignPluginDefinitionsFromDisk, syncPluginCatalog, reloadPluginHost, mountPublicPluginHost, reconcileStaleSystemPluginsFromDisk } from './plugins/pluginManager.js';
import { adminRouter } from './routes/admin.js';
import { sampleDataRouter } from './routes/sampleData.js';
import { contentPacksRouter } from './routes/contentPacks.js';
import { importProvidersRouter } from './routes/importProviders.js';
import {
  createOpenApiDocsRouter,
  isOpenApiDocsEnabled,
} from './routes/openapiDocs.js';
import { getOrCreateSystemSettings } from './lib/systemSettings.js';
import { setPluginHostReloader } from './lib/pluginRuntime/index.js';
import { bootstrapStorageRegistry, initializeActiveStorageProvider, registerStorageProvider } from './lib/storage/storageRegistry.js';
import { resolveS3CompatibleConfig } from './lib/storage/storageProviderConfig.js';
import { registerS3CompatibleProvider } from '@esiana/storage-s3';
import { bootstrapGlobalTimeHooks } from './lib/globalTimeHooks/index.js';
import { apiUsageLogger } from './middleware/apiLogger.js';
import { installSystemLogCapture } from './lib/systemLogBuffer.js';
import { startAssetRetentionSweep } from './lib/assetRetention.js';
import { startNotificationSweep } from './lib/notifications/notificationScheduledJobs.js';
import { pluginAssetsRouter } from './routes/pluginAssets.js';
import { assetsRouter } from './routes/assets.js';
import { optionalAuth } from './middleware/auth.js';
import { getUploadByFilename } from './controllers/assetsController.js';

export async function createApp(): Promise<Express> {
  installSystemLogCapture();
  const app = express();

  if (env.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
      exposedHeaders: ['Retry-After'],
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(apiUsageLogger);

  fs.mkdirSync(env.uploadsDir, { recursive: true });
  app.get('/uploads/:filename', optionalAuth, getUploadByFilename);

  app.use('/api/health', healthRouter);
  app.use('/api/public-directory', publicDirectoryRouter);
  app.use('/api/recruitment', recruitmentRouter);
  app.use('/api/game-systems', gameSystemsRouter);
  app.use('/api/campaign-themes', campaignThemesRouter);
  app.use('/api/public/system', publicSystemRouter);
  app.use('/api/users', usersPublicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/user', userRouter);
  app.use('/api/campaigns', campaignsRouter);
  app.use('/api/campaigns/:campaignHandle', campaignScopedRouter);
  app.use('/api/assets', assetsRouter);
  app.use('/api/plugins', createPluginsRouter());
  app.use('/api/plugin-assets', pluginAssetsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/sample-data', sampleDataRouter);
  app.use('/api/content-packs', contentPacksRouter);
  app.use('/api/import-providers', importProvidersRouter);

  if (isOpenApiDocsEnabled()) {
    app.use('/api/docs', createOpenApiDocsRouter());
  }

  await getOrCreateSystemSettings();
  bootstrapStorageRegistry();
  registerS3CompatibleProvider(registerStorageProvider, () =>
    resolveS3CompatibleConfig() as unknown as Record<string, unknown>,
  );
  initializeActiveStorageProvider();
  bootstrapGlobalTimeHooks();
  setPluginHostReloader(reloadPluginHost);
  await reconcileStaleSystemPluginsFromDisk();
  await syncGlobalSystemPluginsFromDisk();
  await syncCampaignPluginDefinitionsFromDisk();
  mountPluginHost(app);
  mountPublicPluginHost(app);
  await syncPluginCatalog();
  await reloadPluginHost();

  // Kick off asynchronous, daily asset-retention garbage collection.
  startAssetRetentionSweep();
  startNotificationSweep();

  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (
        err.message.includes('Only webp') ||
        err.message.includes('not supported') ||
        err.message.includes('Only .txt') ||
        err.message.includes('must be') ||
        err.message.includes('Unexpected upload')
      ) {
        res.status(400).json({ error: err.message });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    },
  );

  return app;
}
