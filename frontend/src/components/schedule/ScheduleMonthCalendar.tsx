import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { UserScheduleEntry, UserSchedulePreferences } from '@/types/userSchedule';
import { isVacationDay } from '@/lib/userSchedule';
import {
  brandingToThemeProfile,
  DEFAULT_THEME_PROFILE,
  getProfilePreviewPalette,
} from '@/lib/theme/themeProfile';
import { resolveThemeAccentColor } from '@/lib/hubAmbientTheme';
import { RsvpCompletenessIndicator } from '@/components/schedule/RsvpCompletenessIndicator';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function accentFromAppearance(appearanceProfile: unknown): string {
  const fallback = resolveThemeAccentColor(DEFAULT_THEME_PROFILE);
  const profile = brandingToThemeProfile({
    appearanceProfile: appearanceProfile as never,
    globalThemePreset: 'dark',
  });
  return getProfilePreviewPalette(profile).primary ?? fallback;
}

function dayKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function entryDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface ScheduleMonthCalendarProps {
  year: number;
  monthIndex: number;
  entries: UserScheduleEntry[];
  preferences: UserSchedulePreferences;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
}

export function ScheduleMonthCalendar({
  year,
  monthIndex,
  entries,
  preferences,
  onPrevMonth,
  onNextMonth,
  onToday,
}: ScheduleMonthCalendarProps) {
  const today = new Date();
  const todayKey = dayKey(today.getFullYear(), today.getMonth(), today.getDate());

  const title = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, monthIndex, 1));

  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    const startOffset = first.getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const result: Array<{ key: string; day: number; inMonth: boolean }> = [];
    for (let i = 0; i < total; i += 1) {
      const date = new Date(year, monthIndex, i - startOffset + 1);
      result.push({
        key: dayKey(date.getFullYear(), date.getMonth(), date.getDate()),
        day: date.getDate(),
        inMonth: date.getMonth() === monthIndex,
      });
    }
    return result;
  }, [year, monthIndex]);

  const byDay = useMemo(() => {
    const map = new Map<string, UserScheduleEntry[]>();
    for (const entry of entries) {
      if (!entry.plannedStartAt) continue;
      const key = entryDayKey(entry.plannedStartAt);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [entries]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToday}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-elevated"
          >
            Today
          </button>
          <button
            type="button"
            onClick={onPrevMonth}
            className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={onNextMonth}
            className="rounded-md p-1.5 text-muted hover:bg-elevated hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-border bg-border">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="bg-surface px-1 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-muted"
          >
            {label}
          </div>
        ))}
        {cells.map((cell) => {
          const dayEntries = byDay.get(cell.key) ?? [];
          const onVacation = isVacationDay(cell.key, preferences);
          const isToday = cell.key === todayKey;
          return (
            <div
              key={cell.key}
              className={`min-h-[5.5rem] bg-surface p-1.5 ${
                cell.inMonth ? '' : 'opacity-45'
              } ${onVacation ? 'bg-amber-500/5' : ''} ${
                isToday ? 'ring-1 ring-inset ring-primary/50' : ''
              }`}
            >
              <p
                className={`text-xs ${
                  isToday ? 'font-bold text-primary' : 'text-muted'
                }`}
              >
                {cell.day}
              </p>
              <ul className="mt-0.5 space-y-1">
                {dayEntries.map((entry) => {
                  const accent = accentFromAppearance(entry.appearanceProfile);
                  if (entry.kind === 'PROJECTED') {
                    return (
                      <li
                        key={entry.id}
                        className="rounded px-1 py-0.5 text-[10px] leading-tight text-muted"
                        title="Expected session — not scheduled yet"
                      >
                        <span className="flex min-w-0 items-start gap-1">
                          <span className="mt-0.5 size-1.5 shrink-0 rounded-full border border-current opacity-60" />
                          <span className="line-clamp-2 min-w-0">{entry.campaignName}</span>
                        </span>
                        <span className="hidden pl-2.5 opacity-80 sm:block">Expected</span>
                      </li>
                    );
                  }
                  const skipped = entry.status === 'SKIPPED';
                  const body = (
                    <>
                      <span className="flex min-w-0 items-start gap-1">
                        <span
                          className="mt-0.5 size-1.5 shrink-0 rounded-full"
                          style={{ backgroundColor: skipped ? 'transparent' : accent, border: skipped ? `1px solid ${accent}` : undefined }}
                        />
                        <span className="line-clamp-2 min-w-0">{entry.campaignName}</span>
                      </span>
                      <span className="hidden items-center justify-between gap-1 pl-2.5 sm:flex">
                        <span className="opacity-80">
                          {skipped
                            ? 'No session'
                            : `Session ${entry.sessionNumber}`}
                        </span>
                        {!skipped && entry.attendanceSummary ? (
                          <RsvpCompletenessIndicator
                            summary={entry.attendanceSummary}
                            compact
                          />
                        ) : null}
                      </span>
                      {skipped ? (
                        <span className="block pl-2.5 opacity-80 sm:hidden">No session</span>
                      ) : null}
                    </>
                  );
                  return (
                    <li key={entry.id} className="rounded px-1 py-0.5 text-[10px] leading-tight text-foreground">
                      {skipped ? (
                        <span className="opacity-70">{body}</span>
                      ) : (
                        <Link to={entry.deepLinkPath} className="block hover:opacity-90">
                          {body}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
