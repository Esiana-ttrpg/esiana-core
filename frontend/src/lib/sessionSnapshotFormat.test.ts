import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatSessionSnapshotMarkdown,
  sortColumnsChronologically,
  visibleColumns,
} from './sessionSnapshotFormat.js';
import type { CombinedSessionNotesPayload } from '@/types/wiki';

const basePayload: CombinedSessionNotesPayload = {
  session: {
    sessionGroupId: 'sg-1',
    timelinePointId: 'tp-1',
    anchorPageId: 'a-1',
    title: 'Session 2',
    sequenceOrder: 2,
    sessionCreatedAt: '2026-01-15T20:00:00.000Z',
    fantasyEpochMinute: '100',
    fantasyDateLabel: 'Moonday, Frost 2',
    locationPageId: null,
    locationTitle: null,
  },
  entitiesMentioned: [{ pageId: 'hero', title: 'Hero' }],
  referenceSourcePageIds: ['p1'],
  references: { backlinks: [], outlinks: [], brokenOutlinks: [] },
  columns: [
    {
      userId: 'p2',
      label: 'Bob',
      role: 'Player',
      pageId: 'p2',
      title: 'Bob notes',
      markdown: 'Later note',
      visibility: 'Party',
      hasNotes: true,
      isDmRole: false,
      masked: false,
      createdAt: '2026-01-16T00:00:00.000Z',
      updatedAt: '2026-01-16T00:00:00.000Z',
      fantasyEpochMinute: '200',
      sortKey: '200|2026-01-16T00:00:00.000Z',
    },
    {
      userId: 'p1',
      label: 'Alice',
      role: 'Player',
      pageId: 'p1',
      title: 'Alice notes',
      markdown: 'Earlier note',
      visibility: 'Party',
      hasNotes: true,
      isDmRole: false,
      masked: false,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      fantasyEpochMinute: '100',
      sortKey: '100|2026-01-15T00:00:00.000Z',
    },
    {
      userId: 'GAMEMASTER',
      label: 'GAMEMASTER',
      role: 'GAMEMASTER',
      pageId: 'GAMEMASTER',
      title: 'GAMEMASTER',
      markdown: 'secret',
      visibility: 'DM_Only',
      hasNotes: true,
      isDmRole: true,
      masked: true,
      createdAt: '2026-01-15T00:00:00.000Z',
      updatedAt: '2026-01-15T00:00:00.000Z',
      fantasyEpochMinute: null,
      sortKey: '|2026-01-15T00:00:00.000Z',
    },
  ],
};

describe('sessionSnapshotFormat', () => {
  it('visibleColumns excludes masked and empty', () => {
    const visible = visibleColumns(basePayload);
    assert.equal(visible.length, 2);
    assert.ok(visible.every((c) => !c.masked && c.hasNotes));
  });

  it('sortColumnsChronologically orders by sortKey', () => {
    const sorted = sortColumnsChronologically(visibleColumns(basePayload));
    assert.equal(sorted[0]?.label, 'Alice');
    assert.equal(sorted[1]?.label, 'Bob');
  });

  it('formatSessionSnapshotMarkdown includes title and entities', () => {
    const { markdown } = formatSessionSnapshotMarkdown(basePayload, {
      campaignName: 'Test Campaign',
    });
    assert.ok(markdown.includes('# Session 2'));
    assert.ok(markdown.includes('**Campaign:** Test Campaign'));
    assert.ok(markdown.includes('- Hero'));
    assert.ok(markdown.includes('## Alice'));
    assert.ok(!markdown.includes('## DM'));
  });
});
