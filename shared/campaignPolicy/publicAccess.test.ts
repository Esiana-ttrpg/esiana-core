import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANONYMOUS_CAMPAIGN_ROUTES_AVAILABLE,
  INSTANCE_REQUIRES_LOGIN_DEFAULT,
  allowsAnonymousCampaignAccess,
  instanceRequiresLogin,
  publicCampaignAccessStatusMessage,
  resolveAnonymousCampaignAccess,
  resolvePublicCampaignAccessStatus,
} from './publicAccess.js';

describe('public access gates', () => {
  it('defaults the instance login gate to require login until Pass 4', () => {
    assert.equal(INSTANCE_REQUIRES_LOGIN_DEFAULT, true);
    assert.equal(instanceRequiresLogin(), true);
    assert.equal(instanceRequiresLogin({ requireLogin: true }), true);
    assert.equal(instanceRequiresLogin({ requireLogin: false }), false);
  });

  it('requires both gates for anonymous campaign access', () => {
    assert.equal(
      resolveAnonymousCampaignAccess({
        instanceRequiresLogin: true,
        campaignAllowsPublic: false,
      }),
      'blocked-instance',
    );
    assert.equal(
      resolveAnonymousCampaignAccess({
        instanceRequiresLogin: true,
        campaignAllowsPublic: true,
      }),
      'blocked-instance',
    );
    assert.equal(
      resolveAnonymousCampaignAccess({
        instanceRequiresLogin: false,
        campaignAllowsPublic: false,
      }),
      'blocked-campaign',
    );
    assert.equal(
      resolveAnonymousCampaignAccess({
        instanceRequiresLogin: false,
        campaignAllowsPublic: true,
      }),
      'allowed',
    );
    assert.equal(
      allowsAnonymousCampaignAccess({
        instanceRequiresLogin: false,
        campaignAllowsPublic: true,
      }),
      true,
    );
    assert.equal(
      allowsAnonymousCampaignAccess({
        instanceRequiresLogin: true,
        campaignAllowsPublic: true,
      }),
      false,
    );
  });

  it('distinguishes instance login from unshipped anonymous routes', () => {
    assert.equal(ANONYMOUS_CAMPAIGN_ROUTES_AVAILABLE, false);
    assert.equal(
      resolvePublicCampaignAccessStatus({ instanceRequiresLogin: true }),
      'instance-login',
    );
    assert.equal(
      resolvePublicCampaignAccessStatus({ instanceRequiresLogin: false }),
      'routes-unavailable',
    );
    assert.match(
      publicCampaignAccessStatusMessage('instance-login') ?? '',
      /requires login/,
    );
    assert.match(
      publicCampaignAccessStatusMessage('routes-unavailable') ?? '',
      /not yet supported/,
    );
    assert.equal(publicCampaignAccessStatusMessage('ready'), null);
  });
});
