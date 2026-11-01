import assert from 'node:assert/strict';
import test from 'node:test';
import { dashboardSessionState } from './dashboardSessions.js';

test('scheduled ranges indicate ongoing sessions without fabricating completion', () => {
  const start = '2026-10-31T18:00:00Z';
  const end = '2026-10-31T21:00:00Z';
  assert.equal(dashboardSessionState({ status: 'PUBLISHED', plannedStartAt: start, plannedEndAt: end }, Date.parse('2026-10-31T19:00:00Z')), 'ongoing');
  assert.equal(dashboardSessionState({ status: 'PUBLISHED', plannedStartAt: start }, Date.parse('2026-10-31T19:00:00Z')), 'scheduled');
  for (const [status, expected] of [['CANCELLED', 'cancelled'], ['COMPLETED', 'completed'], ['SKIPPED', 'skipped'], ['DRAFT', 'draft']] as const) {
    assert.equal(dashboardSessionState({ status, plannedStartAt: start, plannedEndAt: end }, Date.parse(start)), expected);
  }
});
