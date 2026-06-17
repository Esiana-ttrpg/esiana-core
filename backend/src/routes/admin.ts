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
} from '../controllers/adminSystemPluginsController.js';
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

adminRouter.get(
  '/system/backup',
  requireAuth,
  verifySystemAdmin,
  downloadSystemBackup,
);

adminRouter.get(
  '/system/logs',
  requireAuth,
  verifySystemAdmin,
  getSystemLogs,
);

adminRouter.get(
  '/system/storage-stats',
  requireAuth,
  verifySystemAdmin,
  getSystemStorageStats,
);

adminRouter.post(
  '/system/prune-media',
  requireAuth,
  verifySystemAdmin,
  pruneUnusedMediaAssets,
);

adminRouter.get(
  '/system/check-version',
  requireAuth,
  verifySystemAdmin,
  checkSystemVersion,
);

adminRouter.get(
  '/users',
  requireAuth,
  verifySystemAdmin,
  listAdminUsers,
);

adminRouter.patch(
  '/users/:userId/role',
  requireAuth,
  verifySystemAdmin,
  patchAdminUserRole,
);

adminRouter.delete(
  '/users/:userId',
  requireAuth,
  verifySystemAdmin,
  deleteAdminUser,
);

adminRouter.get(
  '/campaigns',
  requireAuth,
  verifySystemAdmin,
  listAdminCampaigns,
);

adminRouter.get(
  '/campaigns/:campaignId/backup',
  requireAuth,
  verifySystemAdmin,
  downloadAdminCampaignBackup,
);

adminRouter.delete(
  '/campaigns/:campaignId',
  requireAuth,
  verifySystemAdmin,
  deleteAdminCampaign,
);

adminRouter.get(
  '/analytics/top-usage',
  requireAuth,
  verifySystemAdmin,
  getTopApiUsage,
);

adminRouter.get(
  '/analytics/usage',
  requireAuth,
  verifySystemAdmin,
  getAdminUsageAnalytics,
);

adminRouter.get(
  '/settings',
  requireAuth,
  verifySystemAdmin,
  getAdminSettings,
);

adminRouter.patch(
  '/settings',
  requireAuth,
  verifySystemAdmin,
  patchAdminSettings,
);

adminRouter.get(
  '/storage/status',
  requireAuth,
  verifySystemAdmin,
  getAdminStorageStatus,
);

adminRouter.get(
  '/storage/metrics',
  requireAuth,
  verifySystemAdmin,
  getAdminStorageMetrics,
);

adminRouter.get(
  '/identity-providers',
  requireAuth,
  verifySystemAdmin,
  listAdminIdentityProviders,
);

adminRouter.put(
  '/identity-providers/:providerId',
  requireAuth,
  verifySystemAdmin,
  putAdminIdentityProvider,
);

adminRouter.delete(
  '/identity-providers/:providerId',
  requireAuth,
  verifySystemAdmin,
  deleteAdminIdentityProvider,
);

adminRouter.post(
  '/settings/smtp/test',
  requireAuth,
  verifySystemAdmin,
  sendAdminTestEmail,
);

adminRouter.get(
  '/plugins/registry',
  requireAuth,
  verifySystemAdmin,
  fetchAdminPluginRegistry,
);

adminRouter.post(
  '/plugins/install-from-registry',
  requireAuth,
  verifySystemAdmin,
  installAdminPluginFromRegistry,
);

adminRouter.post(
  '/plugins/reload-runtime',
  requireAuth,
  verifySystemAdmin,
  reloadAdminPluginRuntime,
);

adminRouter.get(
  '/plugins',
  requireAuth,
  verifySystemAdmin,
  listAdminPlugins,
);

adminRouter.post(
  '/plugins/:pluginId/config',
  requireAuth,
  verifySystemAdmin,
  saveAdminPluginConfig,
);

adminRouter.post(
  '/plugins/register-manifest',
  requireAuth,
  verifySystemAdmin,
  registerAdminPluginManifest,
);

adminRouter.post(
  '/plugins/install-from-link',
  requireAuth,
  verifySystemAdmin,
  installPluginFromLink,
);

adminRouter.get(
  '/sample-data',
  requireAuth,
  verifySystemAdmin,
  getAdminSampleDataStatus,
);
adminRouter.post(
  '/sample-data/generate-campaign',
  requireAuth,
  verifySystemAdmin,
  postAdminGenerateSampleCampaign,
);

adminRouter.get('/tasks', requireAuth, verifySystemAdmin, listAdminTasks);
adminRouter.get(
  '/tasks/history',
  requireAuth,
  verifySystemAdmin,
  listAdminTaskHistory,
);
adminRouter.post(
  '/tasks/:id/dismiss',
  requireAuth,
  verifySystemAdmin,
  dismissAdminTask,
);
adminRouter.post(
  '/tasks/:id/abort',
  requireAuth,
  verifySystemAdmin,
  abortAdminTask,
);
