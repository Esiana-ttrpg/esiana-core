import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { resolveInstanceHomeSurface } from './instanceHome';

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
