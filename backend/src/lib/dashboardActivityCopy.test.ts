import assert from 'node:assert/strict';
import test from 'node:test';
import { mapCampaignActivityToBulletinItem } from './dashboardActivityCopy.js';

test('mapCampaignActivityToBulletinItem uses workspace-first wiki hrefs', () => {
  const item = mapCampaignActivityToBulletinItem(
    {
      id: 'a1',
      actionType: 'UPDATE',
      entityType: 'WIKI_PAGE',
      entityId: 'page-1',
      entityName: 'Blackwater Keep',
      parentContext: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    'winter-campaign',
    {
      id: 'page-1',
      title: 'Blackwater Keep',
      parentId: 'loc-root',
      templateType: 'DEFAULT',
      workspace: 'LOCATIONS',
      pathKey: 'blackwater-keep',
    },
  );

  assert.equal(item.line, 'Blackwater Keep was expanded');
  assert.equal(item.href, '/campaigns/winter-campaign/locations/blackwater-keep');
  assert.ok(!item.href?.includes('/wiki/'));
});

test('mapCampaignActivityToBulletinItem formats session notes', () => {
  const item = mapCampaignActivityToBulletinItem(
    {
      id: 'a2',
      actionType: 'CREATE',
      entityType: 'SESSION_NOTE',
      entityId: 'tp-1',
      entityName: 'Session 14',
      parentContext: null,
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    },
    'winter-campaign',
  );

  assert.match(item.line, /Session 14 notes were published/);
  assert.equal(item.href, '/campaigns/winter-campaign/notes/tp-1');
});
