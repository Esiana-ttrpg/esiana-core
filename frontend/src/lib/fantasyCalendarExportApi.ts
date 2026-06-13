const API_BASE = '/api';

export async function downloadFantasyCalendarExport(
  campaignHandle: string,
  calendarId: string,
  calendarName: string,
): Promise<void> {
  const res = await fetch(
    `${API_BASE}/campaigns/${encodeURIComponent(campaignHandle)}/calendars/${encodeURIComponent(calendarId)}/fantasy-calendar-export`,
    { credentials: 'include' },
  );

  if (!res.ok) {
    let message = 'Fantasy-Calendar export failed';
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = /filename="([^"]+)"/i.exec(disposition);
  const slug = calendarName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const filename =
    match?.[1] ?? `${slug || 'calendar'}-fantasy-calendar.json`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
