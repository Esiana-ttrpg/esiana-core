import assert from 'node:assert/strict';
import test from 'node:test';
import { groupCampaignFeed, groupFeedDevelopments } from './campaignFeedPresentation';
import type { ConvergenceTimelineEntry } from './chronologyOverlayApi';
const row = (id: string, day: string | null, groupId?: string): ConvergenceTimelineEntry => ({
  entryId: id, display: { title: id, dateLabel: day, summary: null }, instant: { epochMinute: day === null ? null : '123', dateParts: null },
  feed: { datePrecision: day === null ? 'undated' : 'day', referenceDay: day ?? undefined, groupId, groupTitle: groupId }, sessionLink: null,
} as ConvergenceTimelineEntry);
test('feed preserves server chronology rather than sorting date labels', () => {
  assert.deepEqual(groupCampaignFeed([row('new', '10'), row('old', '2')]).map(group => group.title), ['10', '2']);
});
test('presentation grouping preserves separate records and duplicate-looking titles', () => {
  const rows = [row('one', '1', 'batch'), row('two', '1', 'batch'), row('three', '1')];
  const groups = groupFeedDevelopments(rows);
  assert.equal(groups.length, 2); assert.deepEqual(groups.flatMap(group => group.entries.map(entry => entry.entryId)), ['one', 'two', 'three']);
});
test('undated, unaligned clocks and explicit session associations retain separate identities', () => {
  const rows = [row('dated', '1'), row('undated', null), { ...row('native', null), feed: { datePrecision: 'unaligned' as const, calendarId: 'other', calendarName: 'Other' } }];
  assert.deepEqual(groupCampaignFeed(rows).map(group => group.key), ['date:1', 'undated', 'native:other']);
  const linked = { ...row('linked', '1'), sessionLink: { timelinePointId: 'session', sequenceOrder: 3 } };
  assert.equal(groupCampaignFeed([linked], true)[0]!.key, 'session:session');
  assert.equal(groupCampaignFeed([linked], false)[0]!.key, 'date:1');
  assert.equal(groupCampaignFeed([{ ...linked, instant: { epochMinute: null, dateParts: null } }], true)[0]!.key, 'undated');
});
