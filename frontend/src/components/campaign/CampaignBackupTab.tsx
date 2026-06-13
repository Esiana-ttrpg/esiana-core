import { useCallback, useEffect, useRef, useState } from 'react';
import { Archive, Calendar, Download, Upload } from 'lucide-react';
import { downloadCampaignBackup, restoreCampaignBackup } from '@/lib/campaignBackup';
import { startAsyncCampaignBackup } from '@/lib/notifications';
import { listFantasyCalendars, type FantasyCalendarRecord } from '@/lib/fantasyCalendarApi';
import { downloadFantasyCalendarExport } from '@/lib/fantasyCalendarExportApi';

interface CampaignBackupTabProps {
  campaignHandle: string;
}

function sortCalendars(list: FantasyCalendarRecord[]): FantasyCalendarRecord[] {
  return [...list].sort((a, b) => {
    if (a.isMasterTime !== b.isMasterTime) return a.isMasterTime ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function CampaignBackupTab({ campaignHandle }: CampaignBackupTabProps) {
  const [asyncBusy, setAsyncBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [calendarExportBusy, setCalendarExportBusy] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [calendarMessage, setCalendarMessage] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<FantasyCalendarRecord[]>([]);
  const [calendarsLoading, setCalendarsLoading] = useState(true);
  const [selectedCalendarId, setSelectedCalendarId] = useState('');

  const loadCalendars = useCallback(async () => {
    if (!campaignHandle) return;
    setCalendarsLoading(true);
    setCalendarError(null);
    try {
      const list = sortCalendars(await listFantasyCalendars(campaignHandle));
      setCalendars(list);
      setSelectedCalendarId((prev) => {
        if (prev && list.some((calendar) => calendar.id === prev)) return prev;
        return list.find((calendar) => calendar.isMasterTime)?.id ?? list[0]?.id ?? '';
      });
    } catch (err) {
      setCalendars([]);
      setSelectedCalendarId('');
      setCalendarError(
        err instanceof Error ? err.message : 'Failed to load campaign calendars.',
      );
    } finally {
      setCalendarsLoading(false);
    }
  }, [campaignHandle]);

  useEffect(() => {
    void loadCalendars();
  }, [loadCalendars]);

  const selectedCalendar =
    calendars.find((calendar) => calendar.id === selectedCalendarId) ?? null;

  async function handleAsyncDownload() {
    setAsyncBusy(true);
    setError(null);
    setMessage(null);
    try {
      await startAsyncCampaignBackup(campaignHandle);
      setMessage(
        'Export started in the background. You will get an in-app notification with a download link when it is ready.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start background export.');
    } finally {
      setAsyncBusy(false);
    }
  }

  async function handleDownload() {
    const confirmed = window.confirm(
      'Download a portable backup of this campaign?\n\nThe ZIP includes wiki pages as Markdown, media files, page relations, map pins, and wiki-linked operational data (downtime havens/projects, plugin settings).',
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await downloadCampaignBackup(campaignHandle);
      setMessage('Backup download started.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign backup failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRestoreFile(file: File) {
    const confirmed = window.confirm(
      'Restore from this backup ZIP?\n\nThis replaces wiki pages, links, tags, downtime/plugin operational data, and media bindings in this campaign. Members and session history are not restored.\n\nThis cannot be undone.',
    );
    if (!confirmed) return;

    setRestoreBusy(true);
    setError(null);
    setMessage(null);

    try {
      await restoreCampaignBackup(campaignHandle, file);
      setMessage(
        'Restore started in the background. You will get an in-app notification when it completes.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Campaign restore failed.');
    } finally {
      setRestoreBusy(false);
      if (restoreInputRef.current) {
        restoreInputRef.current.value = '';
      }
    }
  }

  async function handleCalendarExport() {
    if (!selectedCalendar) return;

    setCalendarExportBusy(true);
    setCalendarError(null);
    setCalendarMessage(null);

    try {
      await downloadFantasyCalendarExport(
        campaignHandle,
        selectedCalendar.id,
        selectedCalendar.name,
      );
      setCalendarMessage('Fantasy-Calendar export download started.');
    } catch (err) {
      setCalendarError(
        err instanceof Error ? err.message : 'Fantasy-Calendar export failed.',
      );
    } finally {
      setCalendarExportBusy(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Data &amp; backup</h2>
        </div>

        <p className="text-sm text-muted">
          Export your campaign as a sovereign, portable ZIP archive. Wiki pages are
          saved as Markdown with frontmatter; images and maps are stored under{' '}
          <code className="text-foreground">media/</code>. Page relations, map pins,
          and wiki-linked operational data (downtime havens/projects, plugin settings)
          are included for round-trip restore in Esiana or use in other tools.
        </p>

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {error}
          </p>
        )}

        {message && (
          <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {message}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {busy ? 'Preparing backup…' : 'Download now'}
          </button>
          <button
            type="button"
            disabled={asyncBusy}
            onClick={() => void handleAsyncDownload()}
            className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-elevated disabled:opacity-50"
          >
            <Archive className="h-4 w-4" />
            {asyncBusy ? 'Starting…' : 'Export in background'}
          </button>
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Restore from backup</h2>
        </div>

        <p className="text-sm text-muted">
          Upload a prior <code className="text-foreground">esiana-campaign-backup-v2</code>{' '}
          ZIP to replace this campaign&apos;s wiki and wiki-linked operational data. Members,
          session timeline, and ledger history are not restored.
        </p>

        <input
          ref={restoreInputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleRestoreFile(file);
          }}
        />

        <button
          type="button"
          disabled={restoreBusy}
          onClick={() => restoreInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-2 text-sm font-medium text-amber-100 hover:bg-amber-950/50 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {restoreBusy ? 'Starting restore…' : 'Upload backup ZIP'}
        </button>
      </section>

      <section className="space-y-4 border-t border-border pt-8">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-white">Fantasy-Calendar export</h2>
        </div>

        <p className="text-sm text-muted">
          Download a chronology as JSON compatible with{' '}
          <a
            href="https://fantasy-calendar.com"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Fantasy-Calendar
          </a>
          . Months, weekdays, moons, and the current in-world date are included. Import
          the same format from Chronology settings or the campaign wizard.
        </p>

        {calendarError && (
          <p className="rounded-lg border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
            {calendarError}
          </p>
        )}

        {calendarMessage && (
          <p className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
            {calendarMessage}
          </p>
        )}

        {calendarsLoading ? (
          <p className="text-sm text-muted">Loading calendars…</p>
        ) : calendars.length === 0 ? (
          <p className="text-sm text-muted">
            No fantasy calendars yet. Create one from Chronology settings before exporting.
          </p>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Calendar to export</span>
              <select
                value={selectedCalendarId}
                onChange={(event) => setSelectedCalendarId(event.target.value)}
                className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-white"
              >
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.name}
                    {calendar.isMasterTime ? ' (master time)' : ''}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              disabled={calendarExportBusy || !selectedCalendar}
              onClick={() => void handleCalendarExport()}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/50 bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {calendarExportBusy ? 'Preparing export…' : 'Download Fantasy-Calendar JSON'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
