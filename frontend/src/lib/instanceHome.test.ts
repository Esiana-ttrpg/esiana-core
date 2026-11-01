import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canCreateAccount,
  canOfferRegistrationAction,
  resolveInstanceHomeSurface,
} from './instanceHome';

describe('instance home surface', () => {
  it('waits until auth and public settings resolve', () => {
    assert.equal(
      resolveInstanceHomeSurface({
        authLoading: true,
        brandingReady: true,
        isAuthenticated: false,
        instanceRequiresLogin: true,
      }),
      'loading',
    );
    assert.equal(
      resolveInstanceHomeSurface({
        authLoading: false,
        brandingReady: false,
        isAuthenticated: false,
        instanceRequiresLogin: true,
      }),
      'loading',
    );
  });

  it('keeps authenticated visitors on the hub', () => {
    assert.equal(
      resolveInstanceHomeSurface({
        authLoading: false,
        brandingReady: true,
        isAuthenticated: true,
        instanceRequiresLogin: true,
      }),
      'hub',
    );
  });

  it('shows the landing page when login is required and the visitor is anonymous', () => {
    assert.equal(
      resolveInstanceHomeSurface({
        authLoading: false,
        brandingReady: true,
        isAuthenticated: false,
        instanceRequiresLogin: true,
      }),
      'landing',
    );
  });

  it('keeps public hub routing when the login gate is off', () => {
    assert.equal(
      resolveInstanceHomeSurface({
        authLoading: false,
        brandingReady: true,
        isAuthenticated: false,
        instanceRequiresLogin: false,
      }),
      'hub',
    );
  });
});

describe('account creation eligibility', () => {
  it('allows the first user when registrations are otherwise off', () => {
    assert.equal(
      canCreateAccount({ allowRegistrations: false, userTableEmpty: true }),
      true,
    );
    assert.equal(
      canCreateAccount({ allowRegistrations: false, userTableEmpty: false }),
      false,
    );
    assert.equal(canCreateAccount({ allowRegistrations: true }), true);
  });

  it('hides create-account when no local or OIDC action exists', () => {
    assert.equal(
      canOfferRegistrationAction({
        canCreateAccount: true,
        localLoginEnabled: false,
        hasOidcProviders: false,
      }),
      false,
    );
    assert.equal(
      canOfferRegistrationAction({
        canCreateAccount: true,
        localLoginEnabled: false,
        hasOidcProviders: true,
      }),
      true,
    );
  });
});
