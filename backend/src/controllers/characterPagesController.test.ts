import assert from 'node:assert/strict';
import test from 'node:test';
import { canReadCharacterPageTab } from './characterPagesController.js';

test('DM-only core tabs remain unreadable to an ordinary editor', () => {
  assert.equal(canReadCharacterPageTab(
    { hidden: false, visibility: null, coreKey: 'discovery' },
    { canEdit: true, canViewDmOnly: false, shell: 'character' },
    'PARTICIPANT',
  ), false);
});

test('DM-only status is resolved within the entity shell', () => {
  assert.equal(canReadCharacterPageTab(
    { hidden: false, visibility: null, coreKey: 'continuity' },
    { canEdit: false, canViewDmOnly: false, shell: 'organization' },
    'PARTICIPANT',
  ), false);
  assert.equal(canReadCharacterPageTab(
    { hidden: false, visibility: null, coreKey: 'continuity' },
    { canEdit: false, canViewDmOnly: true, shell: 'organization' },
    'GAMEMASTER',
  ), true);
});
