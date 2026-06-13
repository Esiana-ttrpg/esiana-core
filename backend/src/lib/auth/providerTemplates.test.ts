import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyProviderTemplate,
  getDefaultGroupsClaim,
} from './providerTemplates.js';

test('getDefaultGroupsClaim for azure and oidc templates', () => {
  assert.equal(getDefaultGroupsClaim('azure'), 'groups');
  assert.equal(getDefaultGroupsClaim('keycloak'), 'groups');
  assert.equal(getDefaultGroupsClaim('discord'), null);
});

test('applyProviderTemplate prefills authentik display name', () => {
  const draft = applyProviderTemplate('authentik', {});
  assert.equal(draft.displayName, 'Authentik');
  assert.equal(draft.groupsClaim, 'groups');
});

test('applyProviderTemplate builds azure issuer from tenant', () => {
  const draft = applyProviderTemplate('azure', { tenantId: 'contoso' });
  assert.ok(draft.issuerUrl?.includes('contoso'));
});
