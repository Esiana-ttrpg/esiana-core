import { Router } from 'express';
import {
  authenticateApiOrSession,
  requireAuth,
  requireAuthenticatedApiOrSession,
  requireTokenScopes,
  type AuthenticatedRequest,
} from '../middleware/auth.js';
import type { RequestHandler } from 'express';
import { API_TOKEN_SCOPES } from '../lib/apiToken.js';
import {
  changePassword,
  deleteUserAccount,
  getUserProfile,
  uploadUserAvatar,
  updateUserProfile,
} from '../controllers/userController.js';
import {
  dismissNotification,
  getNotificationCapabilities,
  getNotificationPreferences,
  getUnreadNotificationCount,
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  patchNotificationPreferences,
} from '../controllers/notificationsController.js';
import { getUserDeveloperQuota } from '../controllers/developerQuotaController.js';
import {
  createUserToken,
  listUserTokens,
  revokeUserToken,
} from '../controllers/userTokensController.js';
import {
  getUserCampaignDefaultsBundle,
  getUserTemplateResource,
  patchUserCampaignDefaults,
  putUserTemplateResource,
} from '../controllers/userCampaignDefaultsController.js';
import { getUserHub } from '../controllers/hubController.js';
import { getOwnerCreatorAttribution, getOwnerUserActivity } from '../controllers/statsController.js';
import {
  pinCampaign,
  reorderCampaignPins,
  unpinCampaign,
} from '../controllers/userCampaignPinController.js';
import {
  dismissHubAttention,
  restoreHubAttention,
} from '../controllers/userHubAttentionController.js';
import {
  getUserSchedule,
  patchUserSchedulePreferencesHandler,
} from '../controllers/userScheduleController.js';
import { imageUpload } from '../lib/multer.js';
import { enforceSystemUploadLimit } from '../middleware/uploadLimit.js';
import {
  apiTokenMintLimiter,
  authPasswordChangeLimiter,
} from '../middleware/rateLimit.js';
import { rateLimitPolicy } from '../lib/rateLimit/index.js';
import {
  addPasswordAuth,
  listLinkedAccounts,
  removePasswordAuth,
  unlinkIdentityProvider,
} from '../controllers/userIdentityController.js';
import {
  addPortfolioCharacterToCampaign,
  archivePortfolioCharacter,
  bulkPortfolioCharacterActions,
  createPortfolioCharacter,
  deletePortfolioCharacter,
  deletePortfolioMedia,
  duplicatePortfolioCharacter,
  endPortfolioAdventure,
  exportPortfolioCharacter,
  getPortfolioCharacter,
  listPortfolioCharacters,
  reorderShowcasePortfolioCharacters,
  setShowcasePortfolioCharacter,
  toggleFavoritePortfolioCharacter,
  updatePortfolioCharacter,
  uploadPortfolioMedia,
} from '../controllers/portfolioController.js';

export const userRouter = Router();

// These content features share the campaign read/write token scopes. Account
// security, token management, and unrelated user routes remain session-only.
const userContentAuth: RequestHandler[] = [
  authenticateApiOrSession,
  requireAuthenticatedApiOrSession,
  (req: AuthenticatedRequest, res, next) => requireTokenScopes([
    req.method === 'GET' || req.method === 'HEAD'
      ? API_TOKEN_SCOPES.CAMPAIGN_READ
      : API_TOKEN_SCOPES.CAMPAIGN_WRITE,
  ])(req, res, next),
  rateLimitPolicy('authenticated'),
  rateLimitPolicy('apiKey'),
  rateLimitPolicy('mutation'),
];

userRouter.get('/schedule', ...userContentAuth, getUserSchedule);
userRouter.patch('/schedule/preferences', ...userContentAuth, patchUserSchedulePreferencesHandler);

// Character Portfolio
userRouter.get('/portfolio/characters', ...userContentAuth, listPortfolioCharacters);
userRouter.post('/portfolio/characters', ...userContentAuth, createPortfolioCharacter);
userRouter.post('/portfolio/characters/bulk', ...userContentAuth, bulkPortfolioCharacterActions);
userRouter.patch('/portfolio/showcase/reorder', ...userContentAuth, reorderShowcasePortfolioCharacters);
userRouter.get('/portfolio/characters/:id', ...userContentAuth, getPortfolioCharacter);
userRouter.patch('/portfolio/characters/:id', ...userContentAuth, updatePortfolioCharacter);
userRouter.delete('/portfolio/characters/:id', ...userContentAuth, deletePortfolioCharacter);
userRouter.post('/portfolio/characters/:id/duplicate', ...userContentAuth, duplicatePortfolioCharacter);
userRouter.post('/portfolio/characters/:id/favorite', ...userContentAuth, toggleFavoritePortfolioCharacter);
userRouter.post('/portfolio/characters/:id/archive', ...userContentAuth, archivePortfolioCharacter);
userRouter.post('/portfolio/characters/:id/showcase', ...userContentAuth, setShowcasePortfolioCharacter);
userRouter.post('/portfolio/characters/:id/add-to-campaign', ...userContentAuth, addPortfolioCharacterToCampaign);
userRouter.post('/portfolio/characters/:id/export', ...userContentAuth, exportPortfolioCharacter);
userRouter.post(
  '/portfolio/characters/:id/media',
  ...userContentAuth,
  rateLimitPolicy('expensive'),
  imageUpload.single('file'),
  enforceSystemUploadLimit,
  uploadPortfolioMedia,
);
userRouter.delete('/portfolio/characters/:id/media/:mediaId', ...userContentAuth, deletePortfolioMedia);
userRouter.post(
  '/portfolio/adventures/:adventureId/end',
  ...userContentAuth,
  endPortfolioAdventure,
);

userRouter.use(requireAuth);
userRouter.use(rateLimitPolicy('authenticated'));
userRouter.use(rateLimitPolicy('mutation'));

userRouter.get('/hub', getUserHub);
userRouter.get('/creator-attribution', getOwnerCreatorAttribution);
userRouter.get('/activity', getOwnerUserActivity);
userRouter.put('/campaigns/:campaignId/pin', pinCampaign);
userRouter.delete('/campaigns/:campaignId/pin', unpinCampaign);
userRouter.patch('/campaign-pins/reorder', reorderCampaignPins);
userRouter.post('/hub/attention/dismiss', dismissHubAttention);
userRouter.delete('/hub/attention/dismiss/:dismissKey', restoreHubAttention);
userRouter.get('/profile', getUserProfile);
userRouter.put('/profile', updateUserProfile);
userRouter.post(
  '/profile/avatar',
  rateLimitPolicy('expensive'),
  imageUpload.single('avatar'),
  enforceSystemUploadLimit,
  uploadUserAvatar,
);
userRouter.delete('/account', deleteUserAccount);
userRouter.post('/change-password', authPasswordChangeLimiter, changePassword);
userRouter.get('/linked-accounts', listLinkedAccounts);
userRouter.delete('/linked-accounts/:providerId', unlinkIdentityProvider);
userRouter.post('/password', authPasswordChangeLimiter, addPasswordAuth);
userRouter.delete('/password', authPasswordChangeLimiter, removePasswordAuth);

userRouter.get('/tokens', listUserTokens);
userRouter.post('/tokens', apiTokenMintLimiter, createUserToken);
userRouter.delete('/tokens/:tokenId', revokeUserToken);
userRouter.get('/developer/quota', getUserDeveloperQuota);

userRouter.get('/notifications', listUserNotifications);
userRouter.get('/notifications/unread-count', getUnreadNotificationCount);
userRouter.get('/notification-capabilities', getNotificationCapabilities);
userRouter.patch('/notifications/:id/read', markNotificationRead);
userRouter.post('/notifications/read-all', markAllNotificationsRead);
userRouter.delete('/notifications/:id', dismissNotification);
userRouter.get('/notification-preferences', getNotificationPreferences);
userRouter.patch('/notification-preferences', patchNotificationPreferences);

userRouter.get('/campaign-defaults', getUserCampaignDefaultsBundle);
userRouter.patch('/campaign-defaults', patchUserCampaignDefaults);
userRouter.get('/template-resources/:kind', getUserTemplateResource);
userRouter.put('/template-resources/:kind', putUserTemplateResource);
