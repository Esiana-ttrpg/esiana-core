import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const source = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), 'DevelopmentsSection.tsx'),
  'utf8',
);

test('developments is an inbox-first surface with compact status and accessible utility links', () => {
  assert.match(source, /Pending \(\{data\.pendingCount\}\)/);
  assert.match(source, /World Development · \{stateLabel\}/);
  assert.match(source, /World Development settings/);
  assert.match(source, /World Development help/);
  assert.doesNotMatch(source, /WorldDevelopmentQuickControls|DevelopmentReadinessPanel|handleTogglePause/);
});

test('pending development cards preserve review actions, editing, dates, and provenance', () => {
  for (const text of ['Why this developed', 'Dismiss', 'Edit', 'Apply']) {
    assert.ok(source.includes(text), `expected ${text}`);
  }
  assert.match(source, /occurredAtEpochMinute/);
  assert.match(source, /title: editTitle\.trim\(\)/);
  assert.match(source, /narrative: editNarrative\.trim\(\) \|\| null/);
});

test('empty and sparse campaigns receive only real, actionable routes', () => {
  assert.match(source, /Nothing is waiting for review\./);
  assert.match(source, /Ways to develop your world/);
  assert.match(source, /campaignChronologyPath\(campaignHandle, 'events'\)/);
  assert.match(source, /campaignWorkspaceIndexPath\(campaignHandle, 'organizations'\)/);
  assert.match(source, /campaignProgressionPath\(campaignHandle, 'insights'\)/);
});

test('advance time reuses the global time advancement flow from every page action', () => {
  assert.match(source, /SessionTimeAdvanceModal/);
  assert.ok((source.match(/setAdvanceOpen\(true\)/g) ?? []).length >= 3);
  assert.match(source, /onAdvanced=\{\(\) => \{ setAdvanceOpen\(false\); void load\(\); \}\}/);
});

test('active, paused, and disabled states remain compact and control suggestion availability', () => {
  assert.match(source, /data\.settings\.enabled && !data\.settings\.paused/);
  assert.match(source, /Suggestions are disabled in campaign settings/);
  assert.match(source, /New suggestions are paused/);
});

test('campaign calendar and existing accepted history provide temporal context', () => {
  assert.match(source, /convertEpochToCalendarState/);
  assert.match(source, /Campaign Time/);
  assert.match(source, /status: \['accepted'\]/);
  assert.match(source, /Recently Applied/);
  assert.match(source, /campaignProgressionPath\(campaignHandle, 'history'\)/);
});
