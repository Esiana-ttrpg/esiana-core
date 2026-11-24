import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const source = fs.readFileSync(new URL('./SchedulingStep.tsx', import.meta.url), 'utf8');

test('wizard date/time inputs stay usable inside the constrained dialog', () => {
  assert.match(
    source,
    /type: 'date' \| 'time'/,
    'scheduling uses native date and time inputs',
  );
  assert.match(
    source,
    /wizardTemporalInputClassName/,
    'temporal inputs share a mobile-safe control class',
  );
  assert.match(
    source,
    /min-h-11 w-full min-w-0 .* text-base .* sm:min-h-10 sm:text-sm/,
    'touch targets and 16px mobile text avoid clipped / zoomed pickers',
  );
  assert.match(
    source,
    /scrollIntoView\(\{ block: 'center'/,
    'focusing a temporal field scrolls it clear of the wizard chrome',
  );
  assert.match(
    source,
    /showPicker/,
    'clicking opens the native picker on supporting laptop browsers',
  );
  assert.match(
    source,
    /grid min-w-0 gap-4 sm:grid-cols-2/,
    'date/time row must be able to shrink on narrow viewports',
  );
});
