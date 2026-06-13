import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultNotificationPreferences,
  parseNotificationPreferenceChannels,
  resolveChannelPrefs,
} from './preferences.js';
import { NotificationType } from './types.js';
import {
  campaignDashboardPath,
  campaignDowntimeHubPath,
  campaignNotePath,
  campaignSettingsPath,
  campaignThreadsHubPath,
  campaignTransferOwnershipPath,
  campaignWikiMaintenancePath,
  userNotificationsPath,
} from './deepLinks.js';

test('buildDefaultNotificationPreferences includes all known groups', () => {
  const defaults = buildDefaultNotificationPreferences();
  assert.equal(defaults[NotificationType.JOIN_REQUEST_ACCEPTED]?.inApp, true);
  assert.equal(defaults[NotificationType.JOIN_REQUEST_RECEIVED]?.email, true);
});

test('parseNotificationPreferenceChannels merges overrides', () => {
  const merged = parseNotificationPreferenceChannels({
    [NotificationType.SESSION_PUBLISHED]: { inApp: false, email: true },
  });
  assert.equal(merged[NotificationType.SESSION_PUBLISHED]?.inApp, false);
  assert.equal(merged[NotificationType.SESSION_PUBLISHED]?.email, true);
  assert.equal(merged[NotificationType.JOIN_REQUEST_ACCEPTED]?.inApp, true);
});

test('resolveChannelPrefs falls back to generic defaults', () => {
  const prefs = buildDefaultNotificationPreferences();
  const resolved = resolveChannelPrefs(prefs, NotificationType.GENERIC);
  assert.equal(resolved.inApp, true);
});

test('deepLinks build campaign paths', () => {
  assert.equal(campaignDashboardPath('winter'), '/campaigns/winter/dashboard');
  assert.equal(campaignNotePath('winter', 'tp1'), '/campaigns/winter/notes/tp1');
  assert.equal(campaignDowntimeHubPath('winter'), '/campaigns/winter/downtime');
  assert.equal(campaignThreadsHubPath('winter'), '/campaigns/winter/threads');
  assert.equal(
    campaignWikiMaintenancePath('winter'),
    '/campaigns/winter/wiki/maintenance',
  );
  assert.equal(
    campaignSettingsPath('winter', 'recruitment'),
    '/campaigns/winter/settings?tab=recruitment',
  );
  assert.equal(userNotificationsPath(), '/notifications');
  assert.equal(
    campaignTransferOwnershipPath('winter'),
    '/campaigns/winter/transfer-ownership',
  );
});
