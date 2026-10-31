import assert from 'node:assert/strict';
import { test } from 'node:test';
import { campaignSettingsSectionHref } from './campaignSettingsNavigation';

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
