import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  matchesDateFilter,
  resolveSearchDocumentDate,
} from './searchDateSemantics.js';

describe('searchDateSemantics', () => {
  it('uses plannedStartAt → publishedAt → timeline → page for session notes', () => {
    const planned = new Date('2026-03-01T12:00:00Z');
    const published = new Date('2026-02-01T12:00:00Z');
    const timeline = new Date('2026-01-15T12:00:00Z');
    const page = new Date('2026-01-01T12:00:00Z');

    assert.equal(
      resolveSearchDocumentDate('session-note', {
        plannedStartAt: planned,
        publishedAt: published,
        timelineCreatedAt: timeline,
        pageCreatedAt: page,
      }).date?.toISOString(),
      planned.toISOString(),
    );

    assert.equal(
      resolveSearchDocumentDate('session-note', {
        publishedAt: published,
        timelineCreatedAt: timeline,
        pageCreatedAt: page,
      }).date?.toISOString(),
      published.toISOString(),
    );

    assert.equal(
      resolveSearchDocumentDate('session-note', {
        timelineCreatedAt: timeline,
        pageCreatedAt: page,
      }).date?.toISOString(),
      timeline.toISOString(),
    );

    assert.equal(
      resolveSearchDocumentDate('session-note', {
        pageCreatedAt: page,
      }).date?.toISOString(),
      page.toISOString(),
    );
  });

  it('returns null date for non-session types (deferred)', () => {
    const resolved = resolveSearchDocumentDate('character', {
      pageCreatedAt: new Date('2026-01-01T00:00:00Z'),
    });
    assert.equal(resolved.date, null);
  });

  it('excludes non-session types when a date filter is active', () => {
    assert.equal(
      matchesDateFilter(
        'character',
        { pageCreatedAt: new Date('2026-03-01T00:00:00Z') },
        {
          after: new Date('2026-01-01T00:00:00Z'),
          before: null,
          hasDateFilter: true,
        },
      ),
      false,
    );
  });

  it('applies inclusive after and exclusive before', () => {
    const sessionDate = new Date('2026-03-15T18:00:00Z');
    assert.equal(
      matchesDateFilter(
        'session-note',
        { pageCreatedAt: sessionDate },
        {
          after: new Date('2026-03-15T00:00:00Z'),
          before: new Date('2026-03-16T00:00:00Z'),
          hasDateFilter: true,
        },
      ),
      true,
    );
    assert.equal(
      matchesDateFilter(
        'session-note',
        { pageCreatedAt: sessionDate },
        {
          after: null,
          before: new Date('2026-03-15T00:00:00Z'),
          hasDateFilter: true,
        },
      ),
      false,
    );
  });
});
