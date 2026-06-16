import assert from 'node:assert/strict';
import test from 'node:test';
import { UserRoles } from '../../types/domain.js';
import {
  extractGroupsFromClaims,
  parseGroupRoleMappings,
} from './oidcGroupSync.js';

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
