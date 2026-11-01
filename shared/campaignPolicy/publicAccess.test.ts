import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  INSTANCE_REQUIRES_LOGIN_DEFAULT,
  allowsAnonymousCampaignAccess,
  instanceRequiresLogin,
  resolveAnonymousCampaignAccess,
  resolvePublicPreviewGate,
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

  it('keeps Public preview selectable and distinguishes instance vs campaign blocks', () => {
    assert.equal(
      resolvePublicPreviewGate({
        instanceRequiresLogin: true,
        campaignAllowsPublic: false,
      }),
      'campaign',
    );
    assert.equal(
      resolvePublicPreviewGate({
        instanceRequiresLogin: true,
        campaignAllowsPublic: true,
      }),
      'instance-notice',
    );
    assert.equal(
      resolvePublicPreviewGate({
        instanceRequiresLogin: false,
        campaignAllowsPublic: false,
      }),
      'campaign',
    );
    assert.equal(
      resolvePublicPreviewGate({
        instanceRequiresLogin: false,
        campaignAllowsPublic: true,
      }),
      'none',
    );
  });
});
