import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCreateApiTokenScopes,
  canSubmitApiTokenPermissions,
  formatApiTokenScopesLabel,
} from './apiTokenDisplay.ts';

describe('formatApiTokenScopesLabel', () => {
  it('shows Full access for empty scopes', () => {
    assert.equal(formatApiTokenScopesLabel([]), 'Full access');
  });

  it('shows Full access for missing scopes', () => {
    assert.equal(formatApiTokenScopesLabel(undefined), 'Full access');
    assert.equal(formatApiTokenScopesLabel(null), 'Full access');
  });

  it('joins nonempty scopes as raw identifiers', () => {
    assert.equal(
      formatApiTokenScopesLabel(['campaign:read', 'plugins:manage']),
      'campaign:read, plugins:manage',
    );
  });

  it('does not use friendly picker labels', () => {
    const label = formatApiTokenScopesLabel(['campaign:write']);
    assert.equal(label, 'campaign:write');
    assert.equal(label.includes('Campaign write'), false);
  });
});

describe('buildCreateApiTokenScopes', () => {
  it('returns empty array for Full access mode', () => {
    assert.deepEqual(buildCreateApiTokenScopes('full', []), []);
    assert.deepEqual(
      buildCreateApiTokenScopes('full', ['campaign:read']),
      [],
    );
  });

  it('returns selected scopes in Scoped mode', () => {
    assert.deepEqual(
      buildCreateApiTokenScopes('scoped', ['campaign:read', 'plugins:manage']),
      ['campaign:read', 'plugins:manage'],
    );
  });

  it('returns null when Scoped mode has no selections', () => {
    assert.equal(buildCreateApiTokenScopes('scoped', []), null);
  });
});

describe('canSubmitApiTokenPermissions', () => {
  it('allows Full access with no chips selected', () => {
    assert.equal(canSubmitApiTokenPermissions('full', []), true);
  });

  it('allows Scoped when at least one scope is selected', () => {
    assert.equal(
      canSubmitApiTokenPermissions('scoped', ['plugins:read']),
      true,
    );
  });

  it('rejects Scoped with no selections', () => {
    assert.equal(canSubmitApiTokenPermissions('scoped', []), false);
  });
});
