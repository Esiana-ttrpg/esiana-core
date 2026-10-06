import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveLifecycleAssignment } from './downtimePeopleService.js';

test('inactive and former relationships clear their current assignment', () => {
  assert.deepEqual(resolveLifecycleAssignment('INACTIVE', { havenId: 'haven-1', projectId: null }), { havenId: null, projectId: null });
  assert.deepEqual(resolveLifecycleAssignment('FORMER', { havenId: null, projectId: 'project-1' }), { havenId: null, projectId: null });
});

test('returning to active does not manufacture a previous assignment', () => {
  assert.deepEqual(resolveLifecycleAssignment('ACTIVE', { havenId: null, projectId: null }), { havenId: null, projectId: null });
});

test('active relationships retain exactly their current assignment', () => {
  assert.deepEqual(resolveLifecycleAssignment('ACTIVE', { havenId: 'haven-1', projectId: null }), { havenId: 'haven-1', projectId: null });
});
