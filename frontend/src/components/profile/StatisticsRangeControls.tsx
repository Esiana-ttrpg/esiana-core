import type { PersonalStatisticsRangeMode } from '@shared/statsTypes';

export type StatisticsRangeSelection = {
  mode: PersonalStatisticsRangeMode;
  from: string;
  to: string;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function localDateKey(date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function defaultCustomRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getFullYear(), to.getMonth(), 1);
  return { from: localDateKey(from), to: localDateKey(to) };
}

/** Inclusive civil `YYYY-MM-DD` → next civil day for exclusive API `to`. */
export function nextCivilDayKey(dateKey: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return dateKey;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return localDateKey(
    new Date(next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()),
  );
}

export function StatisticsRangeControls({
  selection,
  onChange,
  t,
}: {
  selection: StatisticsRangeSelection;
  onChange: (next: StatisticsRangeSelection) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const setMode = (mode: PersonalStatisticsRangeMode) => {
    if (mode === 'custom') {
      const defaults = defaultCustomRange();
      onChange({
        mode,
        from: selection.from || defaults.from,
        to: selection.to || defaults.to,
      });
      return;
    }
    onChange({ ...selection, mode });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 md:justify-end">
      <label className="text-sm text-muted" htmlFor="stats-range-mode">
        {t('profile.creatorstats.rangeLabel')}
      </label>
      <select
        id="stats-range-mode"
        className="rounded border border-border bg-background px-3 py-2 text-sm text-foreground"
        value={selection.mode}
        onChange={(event) =>
          setMode(event.target.value as PersonalStatisticsRangeMode)
        }
      >
        <option value="month">{t('profile.creatorstats.rangeMonth')}</option>
        <option value="year">{t('profile.creatorstats.rangeYear')}</option>
        <option value="all_time">{t('profile.creatorstats.rangeAllTime')}</option>
        <option value="custom">{t('profile.creatorstats.rangeCustom')}</option>
      </select>
      {selection.mode === 'custom' ? (
        <>
          <label className="text-sm text-muted" htmlFor="stats-range-from">
            {t('profile.creatorstats.rangeFrom')}
            <input
              id="stats-range-from"
              type="date"
              className="ml-2 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              value={selection.from}
              max={selection.to || undefined}
              onChange={(event) =>
                onChange({ ...selection, from: event.target.value })
              }
            />
          </label>
          <label className="text-sm text-muted" htmlFor="stats-range-to">
            {t('profile.creatorstats.rangeTo')}
            <input
              id="stats-range-to"
              type="date"
              className="ml-2 rounded border border-border bg-background px-2 py-1.5 text-sm text-foreground"
              value={selection.to}
              min={selection.from || undefined}
              onChange={(event) =>
                onChange({ ...selection, to: event.target.value })
              }
            />
          </label>
        </>
      ) : null}
    </div>
  );
}
