import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFilledTableSeats,
  getOpenRecruitingSlots,
  getRecruitingPlayerCapacity,
  isLobbyTableFull,
} from './recruitmentSeats.js';

test('explicit recruiting count describes open seats at the real-world table', () => {
  const limits = { maxPlayers: 5, maxSeats: 2 };
  assert.equal(getFilledTableSeats(limits), 3);
  assert.equal(getOpenRecruitingSlots(99, limits), 2);
  assert.equal(isLobbyTableFull(99, limits), false);
});

test('Esiana membership counts do not change table occupancy', () => {
  const limits = { maxPlayers: 5, maxSeats: 2 };
  assert.equal(getOpenRecruitingSlots(0, limits), 2);
  assert.equal(getOpenRecruitingSlots(12, limits), 2);
  assert.equal(getFilledTableSeats(limits), 3);
});

test('zero recruiting count falls back to party size', () => {
  const limits = { maxPlayers: 5, maxSeats: 0 };
  assert.equal(getRecruitingPlayerCapacity(limits), 5);
  assert.equal(getFilledTableSeats(limits), 0);
  assert.equal(getOpenRecruitingSlots(8, limits), 5);
});
