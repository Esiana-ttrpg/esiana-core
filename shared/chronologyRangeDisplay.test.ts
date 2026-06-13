import assert from 'node:assert/strict';
import test from 'node:test';
import { ChronologyDomainKind } from './chronologyDomainKinds.js';
import {
  anchorFromDowntimePeriod,
  chronologyInstantFromParts,
  formatChronologyRangeDateLabel,
} from './chronologyTypes.js';
import { buildConvergenceEntry } from './chronologyConvergence.js';
import { buildNarrativeViewerContext } from './narrativeProjection.js';

test('formatChronologyRangeDateLabel joins start and end labels', () => {
  const label = formatChronologyRangeDateLabel({
    start: chronologyInstantFromParts({ year: 1024, month: 2, day: 3 }, '1000'),
    end: chronologyInstantFromParts({ year: 1024, month: 2, day: 24 }, '30000'),
  });
  assert.equal(label, '1024-3-3 – 1024-3-24');
});

test('buildConvergenceEntry uses range dateLabel for downtime periods', () => {
  const anchor = anchorFromDowntimePeriod({
    gapId: 'gap:1000:5000',
    startEpochMinute: '1000',
    endEpochMinute: '5000',
    startDateParts: { year: 1, month: 0, day: 1 },
    endDateParts: { year: 1, month: 0, day: 5 },
    title: '4 days between sessions',
    summary: '4 days passed between sessions — relative calm.',
    sessionBeforeId: 's1',
    sessionAfterId: null,
    sessionBeforeSequenceOrder: 1,
    isOpen: true,
    advanceRunCount: 0,
    projectCompletions: 0,
    projectFailures: 0,
    rollupHeadline: '4 days passed between sessions — relative calm.',
  });

  const entry = buildConvergenceEntry(
    anchor,
    buildNarrativeViewerContext({
      role: 'GAMEMASTER',
      campaignNow: { epochMinute: 5000n, dateParts: { year: 1, month: 0, day: 5 } },
      allowPlayerChronologyManagement: true,
    }),
    { campaignHandle: 'test-campaign' },
    new Map(),
  );

  assert.equal(entry.domain, ChronologyDomainKind.DOWNTIME_PERIOD);
  assert.equal(entry.display.dateLabel, '1-1-1 – 1-1-5');
  assert.equal(entry.links[0]?.hrefKind, 'downtime_hub');
});
