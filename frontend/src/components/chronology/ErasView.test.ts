import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (name: string) => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const eras = read('./ErasView.tsx');

test('Chronology navigation owns the era workspace alongside an Events directory', () => {
  const header = read('./UniverseHeader.tsx');
  assert.match(header, /'calendar'.*'timeline'.*'eras'.*'feed'/);
  assert.match(header, /label: 'Events'/);
  assert.doesNotMatch(eras, /EventsLedgerView/);
  assert.match(eras, /Events in this era/);
  assert.match(eras, /aria-label="Historical context"/);
  assert.match(eras, /ChronologyEventSidebar/);
});

test('era editing uses calendar dates and the normal rich-text editor', () => {
  assert.match(eras, /<FantasyDatePicker/);
  assert.match(eras, /<WikiTipTapEditor/);
  assert.match(eras, /End date \(inclusive\)/);
  assert.doesNotMatch(eras, /Start unspecified|End unspecified|Display position|Browse eras|Manage era|loaded matching/);
  // Internal calendar definitions may carry offsets; no visible copy names them.
  assert.doesNotMatch(eras, /(?:placeholder|aria-label|title)="[^"]*(?:epoch|minute)/i);
  assert.doesNotMatch(read('../progression/CampaignEraEditor.tsx'), /epoch|minute|input/i);
});

test('privacy defaults are creation-only and controls use per-era authority', () => {
  assert.match(eras, /!editing && !visibilityTouched && elevated && future/);
  assert.match(eras, /selected.canManage/);
  assert.match(eras, /visibility === 'DM_ONLY'/);
  assert.match(eras, /a.sortOrder - b.sortOrder/);
});

test('deletion requires reviewing impact and preserving linked pages', () => {
  assert.match(eras, /fetchEraImpact/);
  assert.match(eras, /impact.details.events/);
  assert.match(eras, /impact.details.trajectories/);
  assert.match(eras, /impact.details.recurringRules/);
  assert.match(eras, /impact.details.overviewWords/);
  assert.match(eras, /Linked pages will remain available/);
});
