import type { SessionCalendarEvent } from './sessionCalendar.js';

const CRLF = '\r\n';

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function formatUtc(value: string): string {
  return new Date(value)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

/** RFC 5545 content lines are folded at 75 octets, excluding CRLF. */
export function foldIcsLine(line: string): string {
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const character of line) {
    const bytes = Buffer.byteLength(character, 'utf8');
    const limit = chunks.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit && current) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += character;
    currentBytes += bytes;
  }
  chunks.push(current);
  return chunks.join(`${CRLF} `);
}

function absoluteEventUrl(event: SessionCalendarEvent, publicOrigin: string): string {
  return new URL(event.href, `${publicOrigin.replace(/\/$/, '')}/`).toString();
}

function serializeEvent(event: SessionCalendarEvent, publicOrigin: string): string[] {
  const location = event.venue?.label ?? event.venue?.url ?? null;
  const description = [
    `Campaign: ${event.campaign.name}`,
    `Status: ${event.status}`,
    event.venue?.url ? `Venue: ${event.venue.url}` : null,
  ].filter((line): line is string => Boolean(line));
  const lines = [
    'BEGIN:VEVENT',
    `UID:${escapeText(`${event.id}@calendar.esiana`)}`,
    `DTSTAMP:${formatUtc(event.updatedAt)}`,
    `DTSTART:${formatUtc(event.startsAt)}`,
    ...(event.endsAt ? [`DTEND:${formatUtc(event.endsAt)}`] : []),
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(description.join('\n'))}`,
    ...(location ? [`LOCATION:${escapeText(location)}`] : []),
    `URL:${escapeText(absoluteEventUrl(event, publicOrigin))}`,
    `SEQUENCE:${Math.floor(new Date(event.updatedAt).getTime() / 1000)}`,
    ...(event.status === 'CANCELLED' ? ['STATUS:CANCELLED'] : ['STATUS:CONFIRMED']),
    'END:VEVENT',
  ];
  return lines;
}

export function serializeSessionCalendarIcs(
  events: SessionCalendarEvent[],
  options: { publicOrigin: string; calendarName?: string },
): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Esiana//Session Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(options.calendarName ?? 'Esiana Sessions')}`,
    ...events.flatMap((event) => serializeEvent(event, options.publicOrigin)),
    'END:VCALENDAR',
  ];
  return `${lines.map(foldIcsLine).join(CRLF)}${CRLF}`;
}
