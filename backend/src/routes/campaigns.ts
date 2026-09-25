import { Router } from 'express';
import {
  authenticateApiOrSession,
  requireAuthenticatedApiOrSession,
} from '../middleware/auth.js';
import {
  createCampaign,
  deleteCampaign,
  duplicateCampaignHandler,
  listCampaigns,
  listPublicCampaigns,
  previewFantasyCalendarImportForWizard,
  updateCampaign,
} from '../controllers/campaignsController.js';
import { campaignWizardUpload } from '../lib/multer.js';
import { enforceWizardUploadLimits } from '../middleware/uploadLimit.js';
import {
  applyToCampaign,
  resolveCampaignJoinRequest,
} from '../controllers/recruitmentController.js';
import {
  attachCampaignByIdParam,
  requireCampaignMembership,
  requireCampaignOwner,
  requireGamemasterSettings,
} from '../middleware/campaignScope.js';
import { apiRequestTelemetry } from '../middleware/apiRequestTelemetry.js';
import {
  enableCampaignPluginHandler,
  listCampaignPlugins,
  removeCampaignPluginHandler,
  saveCampaignPluginConfig,
} from '../controllers/campaignPluginsController.js';
import { listCampaignFrontendRuntime } from '../controllers/frontendPluginsController.js';
import { searchCampaignPlugins } from '../controllers/pluginSearchController.js';
import { listCampaignSourceProviders, resolveCampaignSource, resolveCampaignSourceOpenTarget, searchCampaignSources } from '../controllers/sourceProvidersController.js';
import { connectStatic, disconnectConnection, listConnections } from '../controllers/pluginConnectionsController.js';
import { startPluginOAuth } from '../controllers/pluginConnectionOAuthController.js';
import {
  applyGlobalLimiter,
  applyToCampaignLimiter,
  oidcStartLimiter,
} from '../middleware/rateLimit.js';

export const campaignsRouter = Router();

campaignsRouter.get('/public', listPublicCampaigns);

campaignsRouter.use(authenticateApiOrSession, requireAuthenticatedApiOrSession);

campaignsRouter.get('/', listCampaigns);
campaignsRouter.post('/fantasy-calendar/import-preview', previewFantasyCalendarImportForWizard);
campaignsRouter.post(
  '/',
  campaignWizardUpload.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'markdownZipFile', maxCount: 1 },
    { name: 'backupZipFile', maxCount: 1 },
    { name: 'calendarConfigFile', maxCount: 1 },
  ]),
  enforceWizardUploadLimits,
  createCampaign,
);
campaignsRouter.patch('/:id', updateCampaign);
campaignsRouter.post('/:id/duplicate', duplicateCampaignHandler);
campaignsRouter.post(
  '/:campaignId/apply',
  applyGlobalLimiter,
  applyToCampaignLimiter,
  applyToCampaign,
);
campaignsRouter.post(
  '/:id/apply',
  applyGlobalLimiter,
  applyToCampaignLimiter,
  applyToCampaign,
);
campaignsRouter.put(
  '/:campaignId/requests/:requestId',
  authenticateApiOrSession,
  apiRequestTelemetry,
  attachCampaignByIdParam,
  requireCampaignOwner,
  resolveCampaignJoinRequest,
);
campaignsRouter.delete('/:id', deleteCampaign);

campaignsRouter.get(
  '/:campaignId/plugins/frontend-runtime',
  attachCampaignByIdParam,
  requireCampaignMembership,
  listCampaignFrontendRuntime,
);
campaignsRouter.get(
  '/:campaignId/plugins/search',
  attachCampaignByIdParam,
  requireCampaignMembership,
  searchCampaignPlugins,
);
campaignsRouter.get('/:campaignId/plugins/:pluginId/connections', attachCampaignByIdParam, requireCampaignMembership, listConnections);
campaignsRouter.post('/:campaignId/plugins/:pluginId/connections/static', attachCampaignByIdParam, requireCampaignMembership, connectStatic);
campaignsRouter.post('/:campaignId/plugins/:pluginId/connections/oauth/start', oidcStartLimiter, attachCampaignByIdParam, requireCampaignMembership, startPluginOAuth);
campaignsRouter.delete('/:campaignId/plugins/:pluginId/connections/:connectionId', attachCampaignByIdParam, requireCampaignMembership, disconnectConnection);
campaignsRouter.get('/:campaignId/source-providers', attachCampaignByIdParam, requireCampaignMembership, listCampaignSourceProviders);
campaignsRouter.get('/:campaignId/sources/search', attachCampaignByIdParam, requireCampaignMembership, searchCampaignSources);
campaignsRouter.post('/:campaignId/sources/resolve', attachCampaignByIdParam, requireCampaignMembership, resolveCampaignSource);
campaignsRouter.post('/:campaignId/sources/open-target', attachCampaignByIdParam, requireCampaignMembership, resolveCampaignSourceOpenTarget);
campaignsRouter.get(
  '/:campaignId/plugins',
  attachCampaignByIdParam,
  requireGamemasterSettings,
  listCampaignPlugins,
);
campaignsRouter.post(
  '/:campaignId/plugins/:pluginId/enable',
  attachCampaignByIdParam,
  requireGamemasterSettings,
  enableCampaignPluginHandler,
);
campaignsRouter.delete(
  '/:campaignId/plugins/:pluginId',
  attachCampaignByIdParam,
  requireGamemasterSettings,
  removeCampaignPluginHandler,
);
campaignsRouter.post(
  '/:campaignId/plugins/:pluginId/config',
  attachCampaignByIdParam,
  requireGamemasterSettings,
  saveCampaignPluginConfig,
);
