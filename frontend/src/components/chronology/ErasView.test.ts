import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (name: string) => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const eras = read('./ErasView.tsx');

test('Chronology navigation owns Eras and retains the ledger within that view', () => {
  const header = read('./UniverseHeader.tsx');
  assert.match(header, /'calendar'.*'timeline'.*'eras'.*'feed'/);
  assert.doesNotMatch(header, /label: 'Events'/);
  assert.match(eras, /<EventsLedgerView/);
  assert.match(eras, /showYearHeadings/);
  assert.match(eras, /Search events/);
});

test('era editing uses calendar dates and the normal rich-text editor', () => {
  assert.match(eras, /<FantasyDatePicker/);
  assert.match(eras, /<WikiTipTapEditor/);
  assert.match(eras, /End date \(inclusive\)/);
  assert.match(eras, /No start date/);
  assert.match(eras, /No end date/);
  // Internal calendar definitions may carry offsets; no visible copy names them.
  assert.doesNotMatch(eras, /(?:placeholder|aria-label|title)="[^"]*(?:epoch|minute)/i);
  assert.doesNotMatch(read('../progression/CampaignEraEditor.tsx'), /epoch|minute|input/i);
});

test('privacy defaults are creation-only and controls use per-era authority', () => {
  assert.match(eras, /!editing && !visibilityTouched && elevated && future/);
  assert.match(eras, /selected.canManage/);
  assert.match(eras, /visibility === 'DM_ONLY'/);
  assert.match(eras, /sort\(\(a, b\) => a.sortOrder - b.sortOrder\)/);
});

test('deletion requires reviewing impact and explicitly deleting the Overview', () => {
  assert.match(eras, /fetchEraImpact/);
  assert.match(eras, /impact.events/);
  assert.match(eras, /impact.trajectories/);
  assert.match(eras, /impact.recurringRules/);
  assert.match(eras, /impact.overviewWords/);
  assert.match(eras, /Delete era and Overview/);
});
