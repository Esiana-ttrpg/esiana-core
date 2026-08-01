import assert from 'node:assert/strict';
import test from 'node:test';
import type { IdentityProvider } from '@prisma/client';
import {
  resetOidcEnvConfigCache,
  loadOidcEnvConfig,
} from '../../config/oidcEnv.js';
import { runOidcLoginPipelinePreUser } from './oidcLoginPipeline.js';

const baseProvider = {
  id: 'oidc',
  template: 'oidc',
  enabled: true,
  displayName: 'Test',
  issuerUrl: 'https://idp.example.com',
  clientId: 'c',
  clientSecretEnc: 'x',
  scopes: 'openid profile email',
  tenantId: null,
  groupsClaim: 'groups',
  groupRoleMappings: {},
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies IdentityProvider;

function withEnv(
  vars: Record<string, string | undefined>,
  fn: () => void | Promise<void>,
): Promise<void> {
  const prior = { ...process.env };
  for (const [key, value] of Object.entries(vars)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  resetOidcEnvConfigCache();
  return Promise.resolve(fn()).finally(() => {
    process.env = prior;
    resetOidcEnvConfigCache();
  });
}

test('pipeline rejects user not in allowed groups', async () => {
  await withEnv(
    {
      OIDC_USER_GROUP: 'esiana-users',
      OIDC_ADMIN_GROUP: 'esiana-admins',
    },
    async () => {
      loadOidcEnvConfig();
      const result = await runOidcLoginPipelinePreUser({
        provider: baseProvider,
        claims: { groups: ['other'] },
        isFirstTimeUser: true,
        oidcAllowSignup: true,
      });
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.code, 'group_not_allowed');
    },
  );
});

test('pipeline allows admin group without user group', async () => {
  await withEnv(
    {
      OIDC_USER_GROUP: 'esiana-users',
      OIDC_ADMIN_GROUP: 'esiana-admins',
    },
    async () => {
      loadOidcEnvConfig();
      const result = await runOidcLoginPipelinePreUser({
        provider: baseProvider,
        claims: { groups: ['esiana-admins'] },
        isFirstTimeUser: true,
        oidcAllowSignup: true,
      });
      assert.equal(result.ok, true);
    },
  );
});

test('pipeline rejects first-time user when signup disabled', async () => {
  await withEnv({}, async () => {
    loadOidcEnvConfig();
    const result = await runOidcLoginPipelinePreUser({
      provider: baseProvider,
      claims: { groups: [] },
      isFirstTimeUser: true,
      oidcAllowSignup: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'registration_disabled');
  });
});
