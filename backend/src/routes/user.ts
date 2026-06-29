import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
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
import { getOwnerCreatorAttribution } from '../controllers/statsController.js';
import {
  pinCampaign,
  reorderCampaignPins,
  unpinCampaign,
} from '../controllers/userCampaignPinController.js';
import {
  dismissHubAttention,
  restoreHubAttention,
} from '../controllers/userHubAttentionController.js';
import { imageUpload } from '../lib/multer.js';
import { enforceSystemUploadLimit } from '../middleware/uploadLimit.js';
import {
  apiTokenMintLimiter,
  authPasswordChangeLimiter,
} from '../middleware/rateLimit.js';
import {
  addPasswordAuth,
  listLinkedAccounts,
  removePasswordAuth,
  unlinkIdentityProvider,
} from '../controllers/userIdentityController.js';

export const userRouter = Router();

userRouter.use(requireAuth);

userRouter.get('/hub', getUserHub);
userRouter.get('/creator-attribution', getOwnerCreatorAttribution);
userRouter.put('/campaigns/:campaignId/pin', pinCampaign);
userRouter.delete('/campaigns/:campaignId/pin', unpinCampaign);
userRouter.patch('/campaign-pins/reorder', reorderCampaignPins);
userRouter.post('/hub/attention/dismiss', dismissHubAttention);
userRouter.delete('/hub/attention/dismiss/:dismissKey', restoreHubAttention);
userRouter.get('/profile', getUserProfile);
userRouter.put('/profile', updateUserProfile);
userRouter.post(
  '/profile/avatar',
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
