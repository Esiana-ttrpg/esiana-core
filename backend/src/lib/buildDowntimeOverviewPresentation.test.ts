import assert from 'node:assert/strict';
import { test } from 'node:test';
import type {
  DowntimeHavenSituationCard,
  DowntimeHubLedgerPayload,
  DowntimeHubReputationPayload,
  DowntimeProjectOperationCard,
} from '../../../shared/downtimeHub.js';
import { buildDowntimeOverviewPresentation } from './buildDowntimePresentation.js';

function project(
  id: string,
  status: DowntimeProjectOperationCard['status'],
  completedAtEpochMinute: string | null = null,
): DowntimeProjectOperationCard {
  return {
    id,
    wikiPageId: `wiki-${id}`,
    title: id,
    href: `/projects/${id}`,
    projectType: 'operations',
    status,
    priority: 'normal',
    progressPercent: status === 'ACTIVE' ? 40 : 0,
    durationTotalMinutes: '100',
    durationElapsedMinutes: '40',
    stalledDurationMinutes: '0',
    startedAtEpochMinute: status === 'PLANNED' ? null : '10',
    completedAtEpochMinute,
    ownerPageId: null,
    havenPageId: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
    remainingLabel: null,
    stalledLabel: null,
    requiresSummary: null,
    blockersSummary: null,
    clockState: status === 'ACTIVE' ? 'running' : status === 'PLANNED' ? 'paused' : 'complete',
    operationPostureLabel: null,
  };
}

function emptyLedger(): DowntimeHubLedgerPayload {
  return {
    treasury: {
      balance: 0,
      balanceLabel: '0 g',
      currencyLabel: 'gold',
      currencySuffix: 'g',
      openingBalance: 0,
      sharedTreasuryEnabled: true,
      openDebtsSummary: null,
    },
    feed: [],
    pendingSuggestions: [],
    pendingSuggestionsCount: 0,
    scheduledTreasury: [],
    scheduledTreasuryActiveCount: 0,
    framing: { headline: '', body: [], phase: 4 },
  };
}

function emptyReputation(): DowntimeHubReputationPayload {
  return {
    standings: [],
    feed: [],
    pendingSuggestions: [],
    pendingSuggestionsCount: 0,
    framing: { headline: '', body: [], phase: 5 },
  };
}

test('buildDowntimeOverviewPresentation preserves the complete empty sheet contract', () => {
  const overview = buildDowntimeOverviewPresentation({
    currentEpochMinute: 0n,
    currentTimeLabel: 'Campaign time not configured',
    elapsedSinceLabel: null,
    currentDowntimePeriod: null,
    projectCards: [],
    havenCards: [],
    havenActivity: [],
    ledger: emptyLedger(),
    reputation: emptyReputation(),
    pendingWorldEventSuggestionsCount: 0,
  });

  assert.deepEqual(overview.projects, []);
  assert.deepEqual(overview.havens, []);
  assert.equal(overview.ledger.balanceLabel, null);
  assert.equal(overview.partyOperations[0]?.id, 'holdings');
  assert.equal(overview.partyOperations[0]?.supported, true);
  assert.equal(overview.partyOperations[0]?.value, 0);
  assert.equal(overview.partyOperations[1]?.supported, false);
  assert.equal(overview.partyOperations[1]?.value, undefined);
});

test('buildDowntimeOverviewPresentation filters projects and merges only operational activity', () => {
  const ledger = emptyLedger();
  ledger.feed.push({
    id: 'entry-1', title: 'Inn income', amountLabel: '+12 g', dateLabel: 'Day 3',
    category: 'income', categoryLabel: 'Income', entryKind: 'credit', amount: 12,
    occurredAtEpochMinute: '300', canEdit: false, canDelete: false,
  });
  const reputation = emptyReputation();
  reputation.feed.push({
    id: 'rep-1', factionTitle: 'River Guild', factionHref: '/factions/river',
    direction: 'up', directionArrow: '↑', bandLabel: 'Friendly', axis: 'trust',
    narrative: 'A promise was kept.', dateLabel: 'Day 2', occurredAtEpochMinute: '200',
  });
  reputation.standings.push({
    factionPageId: 'river', factionTitle: 'River Guild', factionHref: '/factions/river',
    trustBand: 'Friendly', notorietyBand: 'Obscure', trustTone: 'neutral', notorietyTone: 'neutral',
  });
  const havens = [{ id: 'haven-1', title: 'Silver Bell', href: '/havens/1' }] as DowntimeHavenSituationCard[];

  const overview = buildDowntimeOverviewPresentation({
    currentEpochMinute: 600n,
    currentTimeLabel: 'Deepwinter 1',
    elapsedSinceLabel: null,
    currentDowntimePeriod: null,
    projectCards: [project('active', 'ACTIVE'), project('finished', 'COMPLETED', '500')],
    havenCards: havens,
    havenActivity: [{
      id: 'activity-1', havenTitle: 'Silver Bell', havenHref: '/havens/1',
      summary: 'Repairs advanced', occurredAtEpochMinute: '400',
    }],
    ledger,
    reputation,
    pendingWorldEventSuggestionsCount: 3,
  });

  assert.deepEqual(overview.projects.map((item) => item.id), ['active']);
  assert.deepEqual(overview.recentActivity.map((item) => item.source), [
    'project', 'haven', 'ledger', 'reputation',
  ]);
  assert.equal(overview.pendingWorldEventSuggestionsCount, 3);
  assert.equal(overview.partyOperations[0]?.valueLabel, '1 haven');
});
