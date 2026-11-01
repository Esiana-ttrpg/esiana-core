import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACCESS_INVITE_MEMBERS_HASH,
  campaignAccessSectionHref,
  campaignSettingsSectionHref,
  isCampaignScopedPathname,
  isCampaignSettingsPathname,
  nextCampaignSettingsExitHref,
  parseCampaignAccessSection,
  parseCampaignSettingsTab,
  resolveCampaignSettingsBackHref,
} from './campaignSettingsNavigation';

test('same-section links preserve recruitment and safety request deep links', () => {
  for (const tab of ['recruitment', 'safety-privacy'] as const) {
    const params = new URLSearchParams({ request: 'request-id', tab });
    const href = campaignSettingsSectionHref('florence', params, tab, tab);
    assert.equal(new URL(href, 'https://esiana.test').searchParams.get('request'), 'request-id');
    assert.equal(params.get('request'), 'request-id');
  }
});

test('switching sections removes shared request IDs without discarding unrelated parameters', () => {
  const params = new URLSearchParams('tab=recruitment&request=recruitment-id&other=value');
  const href = campaignSettingsSectionHref('florence', params, 'recruitment', 'safety-privacy');
  assert.equal(href, '/campaigns/florence/settings?tab=safety-privacy&other=value');
  assert.equal(params.get('request'), 'recruitment-id');
});

test('general uses the existing campaign settings URL and clears section details', () => {
  assert.equal(campaignSettingsSectionHref('florence', new URLSearchParams('tab=safety-privacy&request=safety-id'), 'safety-privacy', 'general'), '/campaigns/florence/settings');
});

test('Access local tabs stay on the Access settings route', () => {
  assert.equal(parseCampaignAccessSection(null), 'members');
  assert.equal(parseCampaignAccessSection('roles'), 'roles');
  assert.equal(
    campaignAccessSectionHref('florence', new URLSearchParams('tab=access'), 'members'),
    '/campaigns/florence/settings?tab=access',
  );
  assert.equal(
    campaignAccessSectionHref('florence', new URLSearchParams('tab=access'), 'roles'),
    '/campaigns/florence/settings?tab=access&section=roles',
  );
  assert.equal(
    campaignAccessSectionHref(
      'florence',
      new URLSearchParams('tab=access'),
      'sharing',
      ACCESS_INVITE_MEMBERS_HASH,
    ),
    '/campaigns/florence/settings?tab=access&section=sharing#invite-members',
  );
});

test('leaving Access drops the local section without discarding other details', () => {
  const params = new URLSearchParams('tab=access&section=roles&other=value');
  assert.equal(
    campaignSettingsSectionHref('florence', params, 'access', 'appearance'),
    '/campaigns/florence/settings?tab=appearance&other=value',
  );
  assert.equal(
    campaignSettingsSectionHref('florence', params, 'access', 'access'),
    '/campaigns/florence/settings?tab=access&section=roles&other=value',
  );
});

test('settings path detection stays campaign-scoped', () => {
  assert.equal(isCampaignSettingsPathname('/campaigns/florence/settings', 'florence'), true);
  assert.equal(isCampaignSettingsPathname('/campaigns/florence/settings/extra', 'florence'), true);
  assert.equal(isCampaignSettingsPathname('/campaigns/florence/dashboard', 'florence'), false);
  assert.equal(isCampaignSettingsPathname('/campaigns/florence-two/settings', 'florence'), false);
  assert.equal(isCampaignScopedPathname('/campaigns/florence/party', 'florence'), true);
  assert.equal(isCampaignScopedPathname('/campaigns/florence-two/party', 'florence'), false);
  assert.equal(parseCampaignSettingsTab('access'), 'access');
  assert.equal(parseCampaignSettingsTab('unknown'), 'general');
});

test('Back remembers the last non-settings campaign route and ignores settings hops', () => {
  const adventure = nextCampaignSettingsExitHref({
    handle: 'florence',
    pathname: '/campaigns/florence/adventures',
    search: '?section=story',
    previous: null,
  });
  assert.equal(adventure, '/campaigns/florence/adventures?section=story');

  const afterSettings = nextCampaignSettingsExitHref({
    handle: 'florence',
    pathname: '/campaigns/florence/settings',
    search: '?tab=access&section=sharing',
    hash: '#invite-members',
    previous: adventure,
  });
  assert.equal(afterSettings, adventure);

  const afterSettingsTab = nextCampaignSettingsExitHref({
    handle: 'florence',
    pathname: '/campaigns/florence/settings',
    search: '?tab=appearance',
    previous: afterSettings,
  });
  assert.equal(afterSettingsTab, adventure);
  assert.equal(resolveCampaignSettingsBackHref('florence', afterSettingsTab), adventure);
  assert.equal(
    resolveCampaignSettingsBackHref('florence', null),
    '/campaigns/florence/dashboard',
  );
});
