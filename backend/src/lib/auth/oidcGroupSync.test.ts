import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRoles } from '../../types/domain.js';
import {
  extractGroupsFromClaims,
  parseGroupRoleMappings,
  resolveRoleFromOidcGroupMappings,
} from './oidcGroupSync.js';
import { getOidcEnvConfig, resetOidcEnvConfigCache } from '../../config/oidcEnv.js';

test('extractGroupsFromClaims uses configured claim path', () => {
  const groups = extractGroupsFromClaims(
    { groups: ['admins', 'players'] },
    'groups',
  );
  assert.deepEqual(groups, ['admins', 'players']);
});

test('extractGroupsFromClaims returns empty when claim unset', () => {
  assert.deepEqual(extractGroupsFromClaims({ groups: ['a'] }, null), []);
});

test('parseGroupRoleMappings filters invalid roles', () => {
  const mappings = parseGroupRoleMappings({
    admins: 'SYSTEM_ADMIN',
    bad: 'SUPERUSER',
    users: 'USER',
  });
  assert.equal(mappings.admins, UserRoles.SYSTEM_ADMIN);
  assert.equal(mappings.users, UserRoles.USER);
  assert.equal(mappings.bad, undefined);
});

test('resolveRoleFromOidcGroupMappings demotes when admin mapping configured', () => {
  const prior = { ...process.env };
  process.env.OIDC_ADMIN_GROUP = 'esiana-admins';
  resetOidcEnvConfigCache();
  getOidcEnvConfig();
  try {
    const role = resolveRoleFromOidcGroupMappings({
      currentRole: UserRoles.SYSTEM_ADMIN,
      groups: ['players'],
      mappings: {},
    });
    assert.equal(role, UserRoles.USER);
  } finally {
    process.env = prior;
    resetOidcEnvConfigCache();
  }
});

test('resolveRoleFromOidcGroupMappings promotes admin group member', () => {
  const role = resolveRoleFromOidcGroupMappings({
    currentRole: UserRoles.USER,
    groups: ['esiana-admins'],
    mappings: { 'esiana-admins': UserRoles.SYSTEM_ADMIN },
  });
  assert.equal(role, UserRoles.SYSTEM_ADMIN);
});

test('admin group satisfies user group gate in pipeline', async () => {
  const prior = { ...process.env };
  process.env.OIDC_USER_GROUP = 'esiana-users';
  process.env.OIDC_ADMIN_GROUP = 'esiana-admins';
  resetOidcEnvConfigCache();
  getOidcEnvConfig();
  try {
    const { runOidcLoginPipelinePreUser } = await import('./oidcLoginPipeline.js');
    const result = await runOidcLoginPipelinePreUser({
      provider: {
        id: 'oidc',
        template: 'oidc',
        enabled: true,
        displayName: 'Test',
        issuerUrl: 'https://idp.example.com',
        clientId: 'c',
        clientSecretEnc: 'x',
        scopes: 'openid',
        tenantId: null,
        groupsClaim: 'groups',
        groupRoleMappings: {},
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      claims: { groups: ['esiana-admins'] },
      isFirstTimeUser: true,
      oidcAllowSignup: false,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'registration_disabled');
  } finally {
    process.env = prior;
    resetOidcEnvConfigCache();
  }
});
