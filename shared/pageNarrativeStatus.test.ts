import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ALL_PAGE_NARRATIVE_STATUSES,
  formatPageNarrativeStatusLabel,
  mapCharacterLifeStatusToNarrativeStatus,
  normalizePageNarrativeStatus,
  PageNarrativeStatuses,
  pageNarrativeStatusCssModifier,
  pageNarrativeStatusTone,
  parseStatusSearchToken,
  projectPageNarrativeStatus,
  resolvePageNarrativeStatus,
  shouldShowPageNarrativeStatusBadge,
  stripStatusSearchToken,
} from './pageNarrativeStatus.js';
import { buildNarrativeViewerContext } from './narrativeProjection.js';

test('normalizePageNarrativeStatus rejects unknown strings', () => {
  assert.equal(normalizePageNarrativeStatus('DEAD'), PageNarrativeStatuses.DEAD);
  assert.equal(normalizePageNarrativeStatus('dead'), PageNarrativeStatuses.DEAD);
  assert.equal(normalizePageNarrativeStatus('typo'), null);
  assert.equal(normalizePageNarrativeStatus(null), null);
});

test('resolvePageNarrativeStatus prefers stored over character fallback', () => {
  assert.equal(
    resolvePageNarrativeStatus({
      storedStatus: PageNarrativeStatuses.LEGENDARY,
      characterLifeStatus: 'DECEASED',
    }),
    PageNarrativeStatuses.LEGENDARY,
  );
  assert.equal(
    resolvePageNarrativeStatus({ characterLifeStatus: 'DECEASED' }),
    PageNarrativeStatuses.DEAD,
  );
  assert.equal(resolvePageNarrativeStatus({}), PageNarrativeStatuses.ACTIVE);
});

test('character life status mapping', () => {
  assert.equal(
    mapCharacterLifeStatusToNarrativeStatus('EXILED'),
    PageNarrativeStatuses.RETIRED,
  );
  assert.equal(mapCharacterLifeStatusToNarrativeStatus('UNKNOWN'), null);
});

test('exhaustiveness: every status has label tone and css modifier', () => {
  for (const status of ALL_PAGE_NARRATIVE_STATUSES) {
    assert.ok(formatPageNarrativeStatusLabel(status).length > 0);
    assert.ok(pageNarrativeStatusTone(status));
    assert.ok(pageNarrativeStatusCssModifier(status));
  }
});

test('projectPageNarrativeStatus hides SECRET from party', () => {
  const party = buildNarrativeViewerContext({
    role: 'PLAYER',
    campaignNow: { epochMinute: 0n, dateParts: { year: 400, month: null, day: null } },
  });
  const elevated = buildNarrativeViewerContext({
    role: 'GAMEMASTER',
    campaignNow: { epochMinute: 0n, dateParts: { year: 400, month: null, day: null } },
  });
  const partyProj = projectPageNarrativeStatus(PageNarrativeStatuses.SECRET, party);
  const gmProj = projectPageNarrativeStatus(PageNarrativeStatuses.SECRET, elevated);
  assert.equal(partyProj.visibleToParty, false);
  assert.equal(gmProj.visibleToParty, true);
});

test('shouldShowPageNarrativeStatusBadge omits ACTIVE', () => {
  assert.equal(shouldShowPageNarrativeStatusBadge(PageNarrativeStatuses.ACTIVE), false);
  assert.equal(shouldShowPageNarrativeStatusBadge(PageNarrativeStatuses.DEAD), true);
});

test('status search token parsing', () => {
  assert.equal(parseStatusSearchToken('status:dead'), PageNarrativeStatuses.DEAD);
  assert.equal(stripStatusSearchToken('status:dead foo'), 'foo');
});
