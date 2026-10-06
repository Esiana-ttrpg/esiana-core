import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { DowntimeHubOverviewPayload } from '@shared/downtimeHub';
import { DowntimeOverviewSection } from './DowntimeOverviewSection';

function emptyOverview(): DowntimeHubOverviewPayload {
  return {
    currentTimeLabel: 'Campaign time not configured',
    elapsedSinceLabel: null,
    currentDowntimePeriod: null,
    projects: [],
    havens: [],
    ledger: { hasEntries: false, balanceLabel: null, entries: [] },
    reputation: { standingCount: 0, standings: [] },
    partyOperations: [
      { id: 'holdings', label: 'Holdings', supported: true, value: 0, valueLabel: '0 havens' },
      { id: 'hirelings_followers', label: 'Hirelings', supported: false },
      { id: 'obligations', label: 'Obligations', supported: false },
      { id: 'other_resources', label: 'Other resources', supported: false },
    ],
    recentActivity: [],
    pendingWorldEventSuggestionsCount: 0,
  };
}

function render(overview: DowntimeHubOverviewPayload, canManage = false): string {
  return renderToStaticMarkup(
    <MemoryRouter>
      <DowntimeOverviewSection
        campaignHandle="winter-road"
        overview={overview}
        canManage={canManage}
        canContributeToLedger={canManage}
        onCreateProject={() => undefined}
        onCreateHaven={() => undefined}
        onAddLedgerEntry={() => undefined}
      />
    </MemoryRouter>,
  );
}

test('DowntimeOverviewSection keeps every empty sheet region visible', () => {
  const html = render(emptyOverview());
  for (const label of ['Current period', 'Projects', 'Party funds', 'Havens &amp; holdings', 'Reputation', 'Party operations', 'Recent activity']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /No active projects/);
  assert.match(html, /0 havens/);
  assert.match(html, /Hirelings: Not tracked yet/);
  assert.doesNotMatch(html, />Downtime</);
  assert.doesNotMatch(html, /Start a project/);
});

test('DowntimeOverviewSection exposes contextual actions and pending event review', () => {
  const overview = emptyOverview();
  overview.pendingWorldEventSuggestionsCount = 3;
  const html = render(overview, true);
  assert.match(html, /Start a project/);
  assert.match(html, /Add a haven/);
  assert.match(html, /Add entry/);
  assert.match(html, /3 events awaiting review/);
  assert.match(html, /section=worldEvents/);
});
