import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNotifyUsersInput } from './notifyFromTemplate.js';
import { NotificationType } from './types.js';
import { parseNotificationRenderMetadata } from '../../../../shared/notificationRender.js';

test('buildNotifyUsersInput stores render metadata and English fallback', () => {
  const payload = buildNotifyUsersInput({
    userIds: ['user-1'],
    type: NotificationType.JOIN_REQUEST_ACCEPTED,
    vars: { campaignName: 'Winter Court' },
    linkUrl: '/campaigns/winter/dashboard',
    campaignId: 'camp-1',
  });

  assert.match(payload.title, /Winter Court/);
  assert.equal(payload.body?.includes('accepted'), true);
  const meta = parseNotificationRenderMetadata(payload.metadata);
  assert.equal(meta?.vars.campaignName, 'Winter Court');
});

test('buildNotifyUsersInput preserves extra metadata fields', () => {
  const payload = buildNotifyUsersInput({
    userIds: ['user-1'],
    type: NotificationType.EXPORT_READY,
    vars: { campaignName: 'Demo' },
    metadata: { assetId: 'asset-1' },
  });

  const row = payload.metadata as Record<string, unknown>;
  assert.equal(row.assetId, 'asset-1');
  assert.equal(row.renderVersion, 1);
});
