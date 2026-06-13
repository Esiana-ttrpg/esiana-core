import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  clampCharacterHubRailWidth,
  CHARACTER_HUB_RAIL_WIDTH_DEFAULT,
  CHARACTER_HUB_RAIL_WIDTH_MAX,
  CHARACTER_HUB_RAIL_WIDTH_MIN,
  normalizeCharacterHubRailWidth,
} from './characterHubRailWidthPreference.ts';

describe('characterHubRailWidthPreference', () => {
  it('clamps within min and max', () => {
    assert.equal(clampCharacterHubRailWidth(100), CHARACTER_HUB_RAIL_WIDTH_MIN);
    assert.equal(clampCharacterHubRailWidth(900), CHARACTER_HUB_RAIL_WIDTH_MAX);
    assert.equal(clampCharacterHubRailWidth(450), 450);
  });

  it('normalizes invalid values to default', () => {
    assert.equal(normalizeCharacterHubRailWidth('nope'), CHARACTER_HUB_RAIL_WIDTH_DEFAULT);
    assert.equal(normalizeCharacterHubRailWidth('420'), 420);
  });
});
