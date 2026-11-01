import assert from 'node:assert/strict';
import test from 'node:test';
import { feedExcerpt, feedRange, shiftFeedRange, narrowFeedRange } from '../../../shared/campaignFeed.js';
import { filterFeedImportance, matchesFeedWindow, orderFeedEntries, sessionSummaryExcerpt } from './campaignFeedProjection.js';
import { buildOccurrences, type BaseEvent } from './buildChronologyOccurrences.js';
import type { ConvergenceTimelineEntry } from '../../../shared/chronologyConvergence.js';
const entry = (id: string, minute: string | null, precision: 'day' | 'minute' = 'minute') => ({
  entryId: id, instant: { epochMinute: minute, dateParts: null }, feed: { datePrecision: precision, importance: 'NOTICE' },
} as ConvergenceTimelineEntry);
test('feed sorts bigint epochs numerically with stable ties and undated records last', () => {
  const rows = [entry('a', '-90071992547409934567'), entry('z', '10'), entry('b', '2'), entry('c', '10'), entry('u', null)];
  assert.deepEqual(orderFeedEntries(rows, 'desc').map(row => row.entryId), ['c', 'z', 'b', 'a', 'u']);
  assert.deepEqual(orderFeedEntries(rows, 'asc').map(row => row.entryId), ['a', 'b', 'c', 'z', 'u']);
});
test('history windows are half-open and distinguish current-day from precise future instants', () => {
  assert.equal(matchesFeedWindow(entry('a', '10'), 10n, 20n, 12n, 20n, false), true);
  assert.equal(matchesFeedWindow(entry('a', '20'), 10n, 20n, 12n, 20n, true), false);
  assert.equal(matchesFeedWindow(entry('a', '13'), 10n, 20n, 12n, 20n, false), false);
  assert.equal(matchesFeedWindow(entry('a', '13', 'day'), 10n, 20n, 12n, 20n, false), true);
  assert.equal(matchesFeedWindow(entry('a', null), 10n, 20n, 12n, 20n, false), true);
  assert.equal(filterFeedImportance([entry('a', '10')], []).length, 0);
});
test('window navigation preserves exact adjacent bounds and partial-day offsets', () => {
  const range = feedRange(-100n, -123n);
  assert.equal(BigInt(range.to) - BigInt(range.from), 30n * 1440n);
  assert.equal(range.to, '1317');
  const earlier = shiftFeedRange(range.from, range.to, -1);
  assert.equal(earlier.to, range.from);
  assert.deepEqual(shiftFeedRange(earlier.from, earlier.to, 1), range);
  assert.equal(BigInt(narrowFeedRange(range.from, range.to).from), BigInt(range.from) + 15n * 1440n);
});
test('canonical session excerpts are bounded and never fall back to private notes or transcripts', () => {
  assert.equal(sessionSummaryExcerpt([{ id: 'transcript', content: { markdown: 'Private transcript' } }]), null);
  assert.equal(sessionSummaryExcerpt([{ id: 'session-note-body', isPrivate: true, content: { markdown: 'secret' } }]), null);
  assert.equal(sessionSummaryExcerpt([{ id: 'session-summary', visibility: 'DM_Only', content: { markdown: 'secret' } }]), null);
  const text = '**Mira** found [the archive](/archive). '.repeat(40);
  const excerpt = sessionSummaryExcerpt([{ id: 'session-summary', content: { markdown: text } }])!;
  assert.ok(excerpt.length <= 400); assert.ok(excerpt.endsWith('…')); assert.ok(!excerpt.includes('**'));
  assert.equal(feedExcerpt(''), null);
  assert.equal(feedExcerpt('x'.repeat(500)), '…');
  assert.equal(sessionSummaryExcerpt([{ id: 'session-note-body', content: { markdown: 'Long canonical body' } }, { id: 'session-summary', content: { markdown: 'Canonical summary' } }]), 'Canonical summary');
});
test('shared compact recurrence crosses custom month boundaries without daily duplicate rows', () => {
  const calendar = { id: 'world', epochOffset: 123n, weekdays: [], months: [{ name: 'Rain', length: 17 }, { name: 'Still', length: 2, type: 'intercalary' }], seasons: [], moons: [], leapDays: [] };
  const event = { id: 'journey', calendarId: 'world', categoryId: null, prerequisiteId: null, visibility: 'PARTY', importance: 'NOTICE', title: 'Journey', description: null,
    duration: 3, isRepeating: true, repeatInterval: 2, repeatUnit: 'DAYS', limitRepetitions: 3, targetYear: 1, targetMonth: 0, targetDay: 16, targetEpochMinute: null } as BaseEvent;
  const result = buildOccurrences([event], new Map([['world', calendar]]), null, [], {}, true);
  assert.equal(result.occurrences.length, 3);
  assert.deepEqual(result.occurrences.map(row => row.occurrenceIndex), [0, 1, 2]);
  assert.deepEqual(result.occurrences.map(row => (row.start as { month: number }).month), [0, 1, 0]);
  assert.deepEqual(result.occurrences.map(row => (row.start as { year: number }).year), [1, 1, 2]);
  assert.equal(buildOccurrences([{ ...event, isRepeating: false }], new Map([['world', calendar]]), null).occurrences.length, 3);
  assert.ok(buildOccurrences([{ ...event, limitRepetitions: 1000 }], new Map([['world', calendar]]), null, [], {}, true).warnings.includes('CAP_APPLIED_PER_EVENT'));
});
