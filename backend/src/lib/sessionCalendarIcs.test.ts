import assert from 'node:assert/strict';
import test from 'node:test';
import type { SessionCalendarEvent } from './sessionCalendar.js';
import { foldIcsLine, serializeSessionCalendarIcs } from './sessionCalendarIcs.js';

const event: SessionCalendarEvent = {
  id: 'session-1',
  kind: 'session',
  title: 'Ashes, Echoes; and \\ Stars',
  status: 'CANCELLED',
  startsAt: '2026-11-09T02:00:00.000Z',
  endsAt: '2026-11-09T06:00:00.000Z',
  timezone: 'America/Los_Angeles',
  campaign: { id: 'campaign-1', name: 'Saltglass', handle: 'saltglass' },
  href: '/campaigns/saltglass/sessions/session-1',
  venue: {
    type: 'ONLINE',
    label: 'Lantern, Room',
    url: 'https://table.example/join',
    locationPageId: null,
  },
  sequenceOrder: 7,
  updatedAt: '2026-10-04T12:00:00.000Z',
};

test('serializes canonical session events as RFC 5545 calendar data', () => {
  const body = serializeSessionCalendarIcs([event], {
    publicOrigin: 'https://esiana.example',
  });
  assert.match(body, /^BEGIN:VCALENDAR\r\n/);
  assert.match(body, /UID:session-1@calendar\.esiana\r\n/);
  assert.match(body, /DTSTART:20261109T020000Z\r\n/);
  assert.match(body, /DTEND:20261109T060000Z\r\n/);
  assert.match(body, /SUMMARY:Ashes\\, Echoes\\; and \\\\ Stars\r\n/);
  assert.match(body, /LOCATION:Lantern\\, Room\r\n/);
  assert.match(body, /URL:https:\/\/esiana\.example\/campaigns\/saltglass\/sessions\/session-1\r\n/);
  assert.match(body, /SEQUENCE:1791115200\r\n/);
  assert.match(body, /STATUS:CANCELLED\r\n/);
  assert.match(body, /END:VCALENDAR\r\n$/);
  assert.equal(body.replace(/\r\n/g, '').includes('\n'), false);
});

test('folds content lines by UTF-8 octets with continuation whitespace', () => {
  const folded = foldIcsLine(`DESCRIPTION:${'é'.repeat(50)}`);
  const physicalLines = folded.split('\r\n');
  assert.ok(physicalLines.length > 1);
  assert.ok(physicalLines.slice(1).every((line) => line.startsWith(' ')));
  assert.ok(physicalLines.every((line) => Buffer.byteLength(line, 'utf8') <= 75));
});
