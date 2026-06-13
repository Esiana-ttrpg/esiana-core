import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CAMPAIGN_CLONE_PRESETS,
  detectPresetFromOptions,
  resolvePresetToOptions,
} from './campaignClonePresets.js';

test('Fresh Sequel preset excludes members and session logs', () => {
  const options = resolvePresetToOptions('fresh-sequel');
  assert.equal(options.scheduling.sessionEventsLogs, false);
  assert.equal(options.community.members, false);
  assert.equal(options.community.joinRequests, false);
  assert.equal(options.structure.wikiPages, true);
  assert.equal(options.recruitment.safety, true);
});

test('New Season preset includes gameplay but not session logs or members', () => {
  const options = resolvePresetToOptions('new-season');
  assert.equal(options.gameplay.characters, true);
  assert.equal(options.gameplay.mapsAssets, true);
  assert.equal(options.scheduling.sessionEventsLogs, false);
  assert.equal(options.community.members, false);
});

test('World Template preset is structure-only', () => {
  const options = resolvePresetToOptions('world-template');
  assert.equal(options.structure.wikiPages, true);
  assert.equal(options.recruitment.settings, false);
  assert.equal(options.scheduling.calendarStructure, false);
});

test('Full Copy preset includes session logs and community', () => {
  const options = resolvePresetToOptions('full-copy');
  assert.equal(options.scheduling.sessionEventsLogs, true);
  assert.equal(options.community.members, true);
  assert.equal(options.community.joinRequests, true);
});

test('detectPresetFromOptions round-trips each preset', () => {
  for (const preset of CAMPAIGN_CLONE_PRESETS) {
    assert.equal(detectPresetFromOptions(preset.options), preset.id);
  }
});
