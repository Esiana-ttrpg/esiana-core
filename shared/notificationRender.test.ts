import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNotificationRenderMetadata,
  interpolateNotificationTemplate,
  parseNotificationRenderMetadata,
  renderNotificationFromCatalog,
  resolveNotificationTemplateKeys,
} from './notificationRender.js';
import { NotificationType } from './notificationTypes.js';

test('interpolateNotificationTemplate replaces variables', () => {
  const result = interpolateNotificationTemplate('Hello {{name}}!', { name: 'Ada' });
  assert.equal(result, 'Hello Ada!');
});

test('parseNotificationRenderMetadata validates shape', () => {
  const meta = buildNotificationRenderMetadata({
    variant: 'withStartTime',
    vars: { sessionTitle: 'Session 3', plannedStartAt: 'Mon 8pm' },
  });
  assert.deepEqual(parseNotificationRenderMetadata(meta), meta);
  assert.equal(parseNotificationRenderMetadata({ renderVersion: 2, vars: {} }), null);
});

test('renderNotificationFromCatalog uses catalog templates', () => {
  const catalog = {
    'profile.notifications.tplJoinRequestAcceptedTitleNamed':
      'Welcome to {{campaignName}}!',
    'profile.notifications.tplJoinRequestAcceptedBody':
      'Your join request was accepted.',
  };
  const meta = buildNotificationRenderMetadata({
    vars: { campaignName: 'Winter Court' },
  });
  const rendered = renderNotificationFromCatalog(
    NotificationType.JOIN_REQUEST_ACCEPTED,
    meta,
    catalog,
    { title: 'fallback', body: 'fallback body' },
  );
  assert.equal(rendered.title, 'Welcome to Winter Court!');
  assert.equal(rendered.body, 'Your join request was accepted.');
});

test('renderNotificationFromCatalog falls back for legacy rows', () => {
  const rendered = renderNotificationFromCatalog(
    NotificationType.GENERIC,
    null,
    {},
    { title: 'Stored title', body: 'Stored body' },
  );
  assert.equal(rendered.title, 'Stored title');
  assert.equal(rendered.body, 'Stored body');
});

test('resolveNotificationTemplateKeys covers RSVP variant', () => {
  const keys = resolveNotificationTemplateKeys(
    NotificationType.RSVP_UPDATED,
    'default',
    { sessionTitle: 'Session 1' },
  );
  assert.ok(keys?.titleKey.includes('tplRsvpUpdatedTitle'));
});
