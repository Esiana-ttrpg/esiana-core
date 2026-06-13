import assert from 'node:assert/strict';
import test from 'node:test';
import { CampaignMemberRoles } from '../types/domain.js';
import { buildAttentionItemsForCampaign } from './buildHubAttentionQueue.js';
import type { HubCampaignBatchSignals } from './buildHubBatchSignals.js';
import type { HubCampaignSignals } from './buildHubContinueRanking.js';
import {
  campaignDashboardPath,
  campaignProgressionDevelopmentsPath,
  campaignNotePath,
  campaignSettingsPath,
  campaignThreadsHubPath,
  campaignWikiMaintenancePath,
  userNotificationsPath,
} from './notifications/deepLinks.js';

const HANDLE = 'winter-campaign';
const CAMPAIGN_ID = 'camp-1';

function emptyBatch(overrides: Partial<HubCampaignBatchSignals> = {}): HubCampaignBatchSignals {
  return {
    lastSession: null,
    momentum: { label: 'steady', daysSinceLastSession: null },
    attentionCounts: {
      openThreads: 0,
      unresolvedWikilinks: 0,
      pendingDowntime: 0,
      missingRecap: false,
    },
    recentEdits: [],
    partyPreview: [],
    quickActions: [],
    topThreadTitle: null,
    topThreadHref: null,
    topQuestTitle: null,
    heroCurrentArc: null,
    heroSummary: null,
    ...overrides,
  };
}

function emptySignals(overrides: Partial<HubCampaignSignals> = {}): HubCampaignSignals {
  return {
    lastActivityAt: null,
    unreadCount: 0,
    nextSession: null,
    pendingActions: [],
    continueScore: 0,
    ...overrides,
  };
}

function buildItems(
  batch: HubCampaignBatchSignals,
  signals: HubCampaignSignals,
  role = CampaignMemberRoles.GAMEMASTER,
) {
  return buildAttentionItemsForCampaign({
    campaignId: CAMPAIGN_ID,
    campaignName: 'Winter',
    campaignHandle: HANDLE,
    role,
    baseSignals: signals,
    batch,
  });
}

test('MISSING_RECAP links to session notes', () => {
  const items = buildItems(
    emptyBatch({
      attentionCounts: { openThreads: 0, unresolvedWikilinks: 0, pendingDowntime: 0, missingRecap: true },
      lastSession: {
        title: 'Session 3',
        playedAt: '2026-01-01T00:00:00.000Z',
        snippet: 'x',
        timelinePointId: 'tp-recap',
      },
    }),
    emptySignals(),
  );
  const recap = items.find((i) => i.kind === 'MISSING_RECAP');
  assert.ok(recap);
  assert.equal(recap.href, campaignNotePath(HANDLE, 'tp-recap'));
});

test('RSVP pending action preserves session note href', () => {
  const href = campaignNotePath(HANDLE, 'tp-rsvp');
  const items = buildItems(
    emptyBatch(),
    emptySignals({
      nextSession: {
        title: 'Session 4',
        plannedStartAt: new Date(Date.now() + 3_600_000).toISOString(),
        timelinePointId: 'tp-rsvp',
      },
      pendingActions: [{ type: 'RSVP', label: 'RSVP needed', href }],
    }),
  );
  const rsvp = items.find((i) => i.kind === 'RSVP');
  assert.ok(rsvp);
  assert.equal(rsvp.href, href);
});

test('OPEN_THREADS prefers topThreadHref over threads hub', () => {
  const items = buildItems(
    emptyBatch({
      attentionCounts: { openThreads: 2, unresolvedWikilinks: 0, pendingDowntime: 0, missingRecap: false },
      topThreadTitle: 'The missing heir',
      topThreadHref: `/campaigns/${HANDLE}/threads/missing-heir`,
    }),
    emptySignals(),
  );
  const thread = items.find((i) => i.kind === 'OPEN_THREADS');
  assert.ok(thread);
  assert.equal(thread.href, `/campaigns/${HANDLE}/threads/missing-heir`);
});

test('OPEN_THREADS falls back to threads hub without entity href', () => {
  const items = buildItems(
    emptyBatch({
      attentionCounts: { openThreads: 1, unresolvedWikilinks: 0, pendingDowntime: 0, missingRecap: false },
    }),
    emptySignals(),
  );
  const thread = items.find((i) => i.kind === 'OPEN_THREADS');
  assert.ok(thread);
  assert.equal(thread.href, campaignThreadsHubPath(HANDLE));
});

test('UNRESOLVED_WIKILINKS links to wiki maintenance', () => {
  const items = buildItems(
    emptyBatch({
      attentionCounts: { openThreads: 0, unresolvedWikilinks: 3, pendingDowntime: 0, missingRecap: false },
    }),
    emptySignals(),
  );
  const wikilinks = items.find((i) => i.kind === 'UNRESOLVED_WIKILINKS');
  assert.ok(wikilinks);
  assert.equal(wikilinks.href, campaignWikiMaintenancePath(HANDLE));
});

test('DOWNTIME_PENDING links to progression developments', () => {
  const items = buildItems(
    emptyBatch({
      attentionCounts: { openThreads: 0, unresolvedWikilinks: 0, pendingDowntime: 2, missingRecap: false },
    }),
    emptySignals(),
  );
  const downtime = items.find((i) => i.kind === 'DOWNTIME_PENDING');
  assert.ok(downtime);
  assert.equal(downtime.href, campaignProgressionDevelopmentsPath(HANDLE));
});

test('JOIN_REQUEST uses pending action recruitment settings href', () => {
  const href = campaignSettingsPath(HANDLE, 'recruitment');
  const items = buildItems(
    emptyBatch(),
    emptySignals({
      pendingActions: [{ type: 'JOIN_REQUEST', label: '1 join request', href }],
    }),
  );
  const join = items.find((i) => i.kind === 'JOIN_REQUEST');
  assert.ok(join);
  assert.equal(join.href, href);
});

test('UNREAD links to global notifications', () => {
  const items = buildItems(emptyBatch(), emptySignals({ unreadCount: 2 }));
  const unread = items.find((i) => i.kind === 'UNREAD');
  assert.ok(unread);
  assert.equal(unread.href, userNotificationsPath());
});

test('STALE_SESSION still links to campaign home', () => {
  const items = buildItems(
    emptyBatch({ momentum: { label: 'stalled', daysSinceLastSession: 30 } }),
    emptySignals(),
  );
  const stale = items.find((i) => i.kind === 'STALE_SESSION');
  assert.ok(stale);
  assert.equal(stale.href, campaignDashboardPath(HANDLE));
});
