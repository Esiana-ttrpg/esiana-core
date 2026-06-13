import assert from 'node:assert/strict';
import test from 'node:test';
import { isTimeAdvanceUnit, TIME_ADVANCE_UNITS } from './timeAdvanceUnits.js';

test('TIME_ADVANCE_UNITS includes weeks and months', () => {
  assert.ok(TIME_ADVANCE_UNITS.includes('weeks'));
  assert.ok(TIME_ADVANCE_UNITS.includes('months'));
});

test('isTimeAdvanceUnit validates units', () => {
  assert.equal(isTimeAdvanceUnit('weeks'), true);
  assert.equal(isTimeAdvanceUnit('months'), true);
  assert.equal(isTimeAdvanceUnit('years'), false);
});
