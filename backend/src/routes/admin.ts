import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { verifySystemAdmin } from '../middleware/systemAdmin.js';
import {
  getAdminSettings,
  patchAdminSettings,
} from '../controllers/adminSettingsController.js';
import { getAdminStorageStatus, getAdminStorageMetrics } from '../controllers/adminStorageController.js';
import { sendAdminTestEmail } from '../controllers/adminMailController.js';
import {
  fetchAdminPluginRegistry,
  installAdminPluginFromRegistry,
  listAdminPlugins,
  registerAdminPluginManifest,
  reloadAdminPluginRuntime,
  saveAdminPluginConfig,
  getAdminPluginOAuthClient,
  putAdminPluginOAuthClient,
} from '../controllers/adminSystemPluginsController.js';
import { connectAdminStatic, disconnectAdminConnection, getAdminConnection } from '../controllers/pluginConnectionsController.js';
import { startAdminPluginOAuth } from '../controllers/pluginConnectionOAuthController.js';
import { oidcStartLimiter } from '../middleware/rateLimit.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import { installPluginFromLink } from '../controllers/pluginController.js';
import { checkSystemVersion } from '../controllers/systemController.js';
import {
  getAdminUsageAnalytics,
  getTopApiUsage,
} from '../controllers/adminAnalyticsController.js';
import {
  deleteAdminUser,
  listAdminUsers,
  patchAdminUserRole,
} from '../controllers/adminUsersController.js';
import {
  downloadSystemBackup,
  getSystemLogs,
  getSystemStorageStats,
  pruneUnusedMediaAssets,
} from '../controllers/systemUtilitiesController.js';
import {
  deleteAdminCampaign,
  downloadAdminCampaignBackup,
  listAdminCampaigns,
} from '../controllers/adminCampaignsController.js';
import {
  abortAdminTask,
  dismissAdminTask,
  listAdminTaskHistory,
  listAdminTasks,
} from '../controllers/adminTasksController.js';
import {
  deleteAdminIdentityProvider,
  listAdminIdentityProviders,
  putAdminIdentityProvider,
} from '../controllers/adminIdentityProvidersController.js';
import {
  getAdminSampleDataStatus,
  postAdminGenerateSampleCampaign,
} from '../controllers/adminSampleDataController.js';

export const adminRouter = Router();

/** Shared admin gate + default rate policy. Preserves requireAuth → verifySystemAdmin order. */
const adminGate = [requireAuth, verifySystemAdmin, rateLimitPolicy('admin')] as const;
const adminExpensive = rateLimitPolicy('expensive');

adminRouter.get(
  '/system/backup',
  ...adminGate,
  adminExpensive,
  downloadSystemBackup,
);

adminRouter.get(
  '/system/logs',
  ...adminGate,
  getSystemLogs,
);

adminRouter.get(
  '/system/storage-stats',
  ...adminGate,
  getSystemStorageStats,
);

adminRouter.post(
  '/system/prune-media',
  ...adminGate,
  adminExpensive,
  pruneUnusedMediaAssets,
);
adminRouter.get('/plugins/:pluginId/oauth-client', ...adminGate, getAdminPluginOAuthClient);
adminRouter.put('/plugins/:pluginId/oauth-client', ...adminGate, putAdminPluginOAuthClient);
adminRouter.get('/plugins/:pluginId/connection', ...adminGate, getAdminConnection);
adminRouter.post('/plugins/:pluginId/connection/static', ...adminGate, connectAdminStatic);
adminRouter.post('/plugins/:pluginId/connection/oauth/start', oidcStartLimiter, ...adminGate, startAdminPluginOAuth);
adminRouter.delete('/plugins/:pluginId/connection', ...adminGate, disconnectAdminConnection);

adminRouter.get(
  '/system/check-version',
  ...adminGate,
  adminExpensive,
  checkSystemVersion,
);

adminRouter.get(
  '/users',
  ...adminGate,
  listAdminUsers,
);

adminRouter.patch(
  '/users/:userId/role',
  ...adminGate,
  patchAdminUserRole,
);

adminRouter.delete(
  '/users/:userId',
  ...adminGate,
  deleteAdminUser,
);

adminRouter.get(
  '/campaigns',
  ...adminGate,
  listAdminCampaigns,
);

adminRouter.get(
  '/campaigns/:campaignId/backup',
  ...adminGate,
  adminExpensive,
  downloadAdminCampaignBackup,
);

adminRouter.delete(
  '/campaigns/:campaignId',
  ...adminGate,
  deleteAdminCampaign,
);

adminRouter.get(
  '/analytics/top-usage',
  ...adminGate,
  getTopApiUsage,
);

adminRouter.get(
  '/analytics/usage',
  ...adminGate,
  getAdminUsageAnalytics,
);

adminRouter.get(
  '/settings',
  ...adminGate,
  getAdminSettings,
);

adminRouter.patch(
  '/settings',
  ...adminGate,
  patchAdminSettings,
);

adminRouter.get(
  '/storage/status',
  ...adminGate,
  getAdminStorageStatus,
);

adminRouter.get(
  '/storage/metrics',
  ...adminGate,
  getAdminStorageMetrics,
);

adminRouter.get(
  '/identity-providers',
  ...adminGate,
  listAdminIdentityProviders,
);

adminRouter.put(
  '/identity-providers/:providerId',
  ...adminGate,
  putAdminIdentityProvider,
);

adminRouter.delete(
  '/identity-providers/:providerId',
  ...adminGate,
  deleteAdminIdentityProvider,
);

adminRouter.post(
  '/settings/smtp/test',
  ...adminGate,
  adminExpensive,
  sendAdminTestEmail,
);

adminRouter.get(
  '/plugins/registry',
  ...adminGate,
  adminExpensive,
  fetchAdminPluginRegistry,
);

adminRouter.post(
  '/plugins/install-from-registry',
  ...adminGate,
  adminExpensive,
  installAdminPluginFromRegistry,
);

adminRouter.post(
  '/plugins/reload-runtime',
  ...adminGate,
  reloadAdminPluginRuntime,
);

adminRouter.get(
  '/plugins',
  ...adminGate,
  listAdminPlugins,
);

adminRouter.post(
  '/plugins/:pluginId/config',
  ...adminGate,
  saveAdminPluginConfig,
);

adminRouter.post(
  '/plugins/register-manifest',
  ...adminGate,
  registerAdminPluginManifest,
);

adminRouter.post(
  '/plugins/install-from-link',
  ...adminGate,
  adminExpensive,
  installPluginFromLink,
);

adminRouter.get(
  '/sample-data',
  ...adminGate,
  getAdminSampleDataStatus,
);
adminRouter.post(
  '/sample-data/generate-campaign',
  ...adminGate,
  adminExpensive,
  postAdminGenerateSampleCampaign,
);

adminRouter.get('/tasks', ...adminGate, listAdminTasks);
adminRouter.get(
  '/tasks/history',
  ...adminGate,
  listAdminTaskHistory,
);
adminRouter.post(
  '/tasks/:id/dismiss',
  ...adminGate,
  dismissAdminTask,
);
adminRouter.post(
  '/tasks/:id/abort',
  ...adminGate,
  abortAdminTask,
);
