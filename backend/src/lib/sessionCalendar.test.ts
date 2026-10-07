import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeCalendarTimezone,
  projectSessionCalendarEvent,
} from './sessionCalendar.js';
import { parseSessionCalendarQuery } from '../controllers/sessionCalendarController.js';

test('calendar timezone falls back through campaign timezone to UTC', () => {
  assert.equal(normalizeCalendarTimezone('Europe/Paris', 'America/Chicago'), 'Europe/Paris');
  assert.equal(normalizeCalendarTimezone('invalid', 'America/Chicago'), 'America/Chicago');
  assert.equal(normalizeCalendarTimezone(null, 'invalid'), 'UTC');
});

test('session calendar projection emits canonical UTC instants and cancellation status', () => {
  const event = projectSessionCalendarEvent({
    timelinePointId: 'session-7',
    status: 'CANCELLED',
    plannedStartAt: new Date('2026-11-08T18:00:00-08:00'),
    plannedEndAt: new Date('2026-11-08T22:00:00-08:00'),
    timezone: 'America/Los_Angeles',
    venueType: 'ONLINE',
    venueLabel: 'The Lantern Room',
    venueUrl: 'https://example.test/table',
    locationPageId: null,
    updatedAt: new Date('2026-10-04T12:00:00Z'),
    timelinePoint: {
      sequenceOrder: 7,
      updatedAt: new Date('2026-10-03T12:00:00Z'),
      wikiPage: {
        title: 'The Tide Remembers',
        updatedAt: new Date('2026-10-02T12:00:00Z'),
      },
      campaign: {
        id: 'campaign-1',
        name: 'Saltglass',
        handle: 'salt glass',
        scheduleTimezone: 'UTC',
        updatedAt: new Date('2026-10-01T12:00:00Z'),
      },
    },
  });
  assert.equal(event.startsAt, '2026-11-09T02:00:00.000Z');
  assert.equal(event.endsAt, '2026-11-09T06:00:00.000Z');
  assert.equal(event.status, 'CANCELLED');
  assert.equal(event.timezone, 'America/Los_Angeles');
  assert.equal(event.href, '/campaigns/salt%20glass/sessions/session-7');
  assert.equal(event.venue?.label, 'The Lantern Room');
});

test('calendar query validates ranges and caps page size', () => {
  assert.deepEqual(
    parseSessionCalendarQuery(
      { from: '2026-11-01T00:00:00Z', to: '2026-11-30T00:00:00Z', limit: '999' },
      null,
    ),
    {
      from: new Date('2026-11-01T00:00:00Z'),
      to: new Date('2026-11-30T00:00:00Z'),
      limit: 200,
      cursor: null,
    },
  );
  assert.deepEqual(
    parseSessionCalendarQuery(
      { from: '2026-12-01T00:00:00Z', to: '2026-11-01T00:00:00Z' },
      null,
    ),
    { error: 'from must be before or equal to to' },
  );
});
