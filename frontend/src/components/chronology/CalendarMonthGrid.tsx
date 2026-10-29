import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import {
  getClimateAspectHeaderIcon,
  type ClimateAspect,
} from '@/lib/climateAspect';
import type { CalendarState, MonthGridRow } from '@/lib/timeEngine';
import type { TimelineOccurrenceRecord } from '@/lib/chronologyApi';
import {
  compareCalendarEvents,
  eventDayState,
  MOON_SYMBOLS,
} from '@/lib/calendarPresentation';

export interface DayCellOverlay {
  count: number;
  hasContinuation: boolean;
}

interface CalendarMonthGridProps {
  presentation?: 'compact' | 'expanded';
  occurrencesByDay?: Map<number, TimelineOccurrenceRecord[]>;
  dayStates?: Map<number, CalendarState>;
  todayDay?: number | null;
  onEventClick?: (event: TimelineOccurrenceRecord) => void;
  columnLabels: string[];
  monthTitle: string;
  climateAspect?: ClimateAspect | null;
  rows: MonthGridRow[];
  isIntercalaryMonth: boolean;
  eventsByDay?: Map<number, DayCellOverlay>;
  selectedDay?: number | null;
  onDayClick?: (day: number) => void;
}

function MonthTitleBanner({
  monthTitle,
  climateAspect,
}: {
  monthTitle: string;
  climateAspect?: ClimateAspect | null;
}) {
  const icon = climateAspect ? getClimateAspectHeaderIcon(climateAspect) : null;
  return (
    <p className="mb-2 flex items-center justify-center gap-1.5 text-center META_SECTION_LABEL_CLASS">
      {icon ? (
        <span className="text-[10px] text-muted-foreground/60" aria-hidden>
          {icon}
        </span>
      ) : null}
      <span>{monthTitle}</span>
    </p>
  );
}

export function CalendarMonthGrid({
  presentation = 'compact',
  occurrencesByDay,
  dayStates,
  todayDay,
  onEventClick,
  columnLabels,
  monthTitle,
  climateAspect = null,
  rows,
  isIntercalaryMonth,
  eventsByDay,
  selectedDay = null,
  onDayClick,
}: CalendarMonthGridProps) {
  if (presentation === 'expanded') {
    return (
      <ExpandedCalendar
        {...{
          columnLabels,
          monthTitle,
          rows,
          isIntercalaryMonth,
          occurrencesByDay,
          dayStates,
          todayDay,
          onEventClick,
          selectedDay,
          onDayClick,
        }}
      />
    );
  }
  return (
    <>
      <MonthTitleBanner monthTitle={monthTitle} climateAspect={climateAspect} />
      {isIntercalaryMonth ? (
        <IntercalaryBannerRow
          row={rows[0]}
          colSpan={columnLabels.length}
          climateAspect={climateAspect}
          onClick={onDayClick}
        />
      ) : (
        <table className="w-full border-collapse text-center text-[11px] sm:text-sm">
          <thead>
            <tr>
              {columnLabels.map((label, index) => (
                <th
                  key={`${label}-${index}`}
                  className="border border-border bg-surface/90 px-0.5 py-1 font-medium text-muted"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <MonthGridTableRow
                key={rowIndex}
                row={row}
                eventsByDay={eventsByDay}
                selectedDay={selectedDay}
                onDayClick={onDayClick}
              />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function ExpandedCalendar({
  columnLabels,
  monthTitle,
  rows,
  isIntercalaryMonth,
  occurrencesByDay,
  dayStates,
  todayDay,
  onEventClick,
  selectedDay,
  onDayClick,
}: CalendarMonthGridProps) {
  const weeks = isIntercalaryMonth
    ? [...(dayStates?.keys() ?? [])].map((day) => [{ day, isToday: false }])
    : rows.flatMap((row) => (row.kind === 'standardWeek' ? [row.cells] : []));
  return (
    <table
      className="w-full table-fixed border-collapse text-left"
      aria-label={monthTitle}
    >
      {isIntercalaryMonth && (
        <caption className="mb-2 text-sm text-muted">
          {monthTitle} · Festival &amp; intercalary days
        </caption>
      )}
      {!isIntercalaryMonth && (
        <thead>
          <tr>
            {columnLabels.map((label, index) => (
              <th
                key={index}
                scope="col"
                className="truncate border border-border bg-surface px-1 py-2 text-center text-xs font-medium text-muted"
                title={label}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {weeks.map((week, rowIndex) => (
          <tr key={rowIndex}>
            {week.map((cell, index) => {
              if (!cell)
                return (
                  <td
                    key={index}
                    className="border border-border bg-surface/20"
                  />
                );
              const events = [...(occurrencesByDay?.get(cell.day) ?? [])].sort(
                compareCalendarEvents,
              );
              const moons = dayStates?.get(cell.day)?.activeMoonPhases ?? [];
              const isToday = todayDay === cell.day;
              const selected = selectedDay === cell.day;
              return (
                <td
                  key={index}
                  className={`border border-border p-1 align-top ${isToday ? 'bg-primary/10' : 'bg-background'} ${selected ? 'ring-2 ring-inset ring-primary' : ''}`}
                >
                  <div className="min-h-16 md:min-h-[132px]">
                    <div className="flex flex-wrap items-start justify-between gap-0.5">
                      <button
                        type="button"
                        aria-label={`${monthTitle} ${cell.day}${isToday ? ', today' : ''}, ${events.length} events`}
                        aria-pressed={selected}
                        aria-current={isToday ? 'date' : undefined}
                        className={`min-h-8 min-w-6 rounded px-1 text-sm focus-visible:outline-2 focus-visible:outline-primary ${isToday ? 'font-bold text-primary' : ''}`}
                        onClick={() => onDayClick?.(cell.day)}
                      >
                        {cell.day}
                      </button>
                      <div className="flex flex-wrap gap-0.5 text-[10px] md:text-xs">
                        {moons.map((moon, moonIndex) => (
                          <span
                            key={moonIndex}
                            role="img"
                            aria-label={`${moon.name}: ${moon.phase}`}
                            title={`${moon.name}: ${moon.phase}`}
                          >
                            {MOON_SYMBOLS[moon.phase] ?? '◯'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="hidden space-y-1 md:block">
                      {events.slice(0, 3).map((event) => {
                        const state = eventDayState(event);
                        const symbol =
                          state === 'Event begins'
                            ? '↦'
                            : state === 'Event ends'
                              ? '↤'
                              : state === 'Event continues'
                                ? '↔'
                                : '•';
                        return (
                          <button
                            key={event.occurrenceId}
                            type="button"
                            aria-label={`${event.title}, ${event.importance.toLowerCase()}, ${state}${event.duration > 1 ? `, Day ${event.dayOffset + 1} of ${event.duration}` : ''}`}
                            title={`${event.title} — ${state}`}
                            onClick={() => onEventClick?.(event)}
                            className={`block w-full rounded border-l-2 px-1.5 py-1 text-left text-xs focus-visible:outline-2 focus-visible:outline-primary ${event.importance === 'MAJOR' ? 'border-primary bg-primary/15 font-semibold text-foreground' : event.importance === 'NOTICE' ? 'border-dotted border-muted text-muted' : 'border-primary/50 bg-surface text-foreground'}`}
                          >
                            <span className="block truncate">
                              {symbol} {event.title}
                            </span>
                            <span className="block truncate text-[10px] font-normal text-muted">
                              {state}
                              {event.duration > 1
                                ? ` · Day ${event.dayOffset + 1} of ${event.duration}`
                                : ''}
                            </span>
                          </button>
                        );
                      })}
                      {events.length > 3 && (
                        <button
                          type="button"
                          onClick={() => onDayClick?.(cell.day)}
                          className="rounded px-1 py-1 text-xs text-primary hover:underline"
                        >
                          +{events.length - 3} more
                        </button>
                      )}
                    </div>
                    {events.length > 0 && (
                      <button
                        type="button"
                        aria-label={`Show ${events.length} events on ${monthTitle} ${cell.day}`}
                        onClick={() => onDayClick?.(cell.day)}
                        className="flex min-h-7 w-full flex-wrap items-center justify-center gap-1 rounded md:hidden"
                      >
                        {events.slice(0, 3).map((event) => (
                          <span
                            key={event.occurrenceId}
                            aria-hidden
                            className={`size-1.5 rounded-full ${event.importance === 'MAJOR' ? 'bg-primary ring-1 ring-primary' : event.importance === 'NOTICE' ? 'bg-muted' : 'bg-primary/60'}`}
                          />
                        ))}
                        {events.length > 3 && (
                          <span className="text-[10px] text-muted">
                            +{events.length - 3}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IntercalaryBannerRow({
  row,
  colSpan,
  climateAspect,
  onClick,
}: {
  row: MonthGridRow | undefined;
  colSpan: number;
  climateAspect?: ClimateAspect | null;
  onClick?: (day: number) => void;
}) {
  const icon = climateAspect ? getClimateAspectHeaderIcon(climateAspect) : null;
  if (!row || row.kind !== 'intercalaryBanner') {
    return (
      <div className="rounded-lg border border-primary/40 bg-gradient-to-r from-primary/10 via-surface to-primary/10 px-4 py-5 text-center text-sm text-primary">
        Festival day
      </div>
    );
  }

  const content = (
    <>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-primary/90">
        Festival & intercalary
      </div>
      <div className="mt-1 flex items-center justify-center gap-1.5 font-serif text-base font-semibold">
        {icon ? (
          <span className="text-sm text-muted-foreground/60" aria-hidden>
            {icon}
          </span>
        ) : null}
        <span>{row.monthName}</span>
      </div>
      <div className="mt-0.5 text-xs text-primary/80">Day {row.day}</div>
      <p className="mt-2 text-[11px] text-muted">
        This day sits outside the standard weekday grid ({colSpan} column layout
        preserved for surrounding months).
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={() => onClick(row.day)}
        className={`w-full rounded-lg border px-4 py-5 text-center text-sm transition hover:border-primary/60 ${
          row.isToday
            ? 'border-primary/50 bg-gradient-to-r from-primary/15 via-surface to-primary/15 text-primary ring-1 ring-primary/30'
            : 'border-primary/40 bg-gradient-to-r from-primary/10 via-surface to-primary/10 text-primary'
        }`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`rounded-lg border px-4 py-5 text-center text-sm ${
        row.isToday
          ? 'border-primary/50 bg-gradient-to-r from-primary/15 via-surface to-primary/15 text-primary ring-1 ring-primary/30'
          : 'border-primary/40 bg-gradient-to-r from-primary/10 via-surface to-primary/10 text-primary'
      }`}
    >
      {content}
    </div>
  );
}

function MonthGridTableRow({
  row,
  eventsByDay,
  selectedDay,
  onDayClick,
}: {
  row: MonthGridRow;
  eventsByDay?: Map<number, DayCellOverlay>;
  selectedDay?: number | null;
  onDayClick?: (day: number) => void;
}) {
  if (row.kind !== 'standardWeek') {
    return null;
  }

  return (
    <tr>
      {row.cells.map((cell, cellIndex) => {
        if (!cell) {
          return (
            <td
              key={cellIndex}
              className="min-h-[2.5rem] border border-border bg-background/40 align-middle"
            >
              <span className="text-muted">·</span>
            </td>
          );
        }

        const overlay = eventsByDay?.get(cell.day);
        const isSelected = selectedDay === cell.day;
        const clickable = Boolean(onDayClick);

        const className = `relative min-h-[2.75rem] border border-border align-top p-0.5 ${
          cell.isToday
            ? 'bg-primary/10 ring-1 ring-inset ring-primary/40'
            : 'bg-background/40'
        } ${isSelected ? 'ring-2 ring-primary' : ''} ${
          clickable ? 'cursor-pointer hover:bg-elevated/60' : ''
        }`;

        const dayLabel = (
          <span
            className={`inline-block py-1 ${
              cell.isToday ? 'font-bold text-primary' : 'text-foreground'
            }`}
          >
            {cell.day}
          </span>
        );

        const eventOverlay =
          overlay && overlay.count > 0 ? (
            <div
              className="mt-0.5 flex flex-wrap justify-center gap-0.5"
              role="presentation"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              {Array.from({ length: Math.min(overlay.count, 3) }).map(
                (_, dotIndex) => (
                  <span
                    key={dotIndex}
                    className={`size-1 rounded-full ${
                      overlay.hasContinuation ? 'bg-muted' : 'bg-primary'
                    }`}
                  />
                ),
              )}
              {overlay.count > 3 && (
                <span className="text-[9px] text-muted">
                  +{overlay.count - 3}
                </span>
              )}
            </div>
          ) : null;

        if (clickable) {
          return (
            <td key={cellIndex} className={className}>
              <div className="flex h-full w-full flex-col items-center justify-start">
                <button
                  type="button"
                  className="w-full rounded-sm hover:bg-elevated/60"
                  onClick={() => onDayClick?.(cell.day)}
                >
                  {dayLabel}
                </button>
                {eventOverlay}
              </div>
            </td>
          );
        }

        return (
          <td key={cellIndex} className={className}>
            <div className="flex flex-col items-center justify-start">
              {dayLabel}
              {eventOverlay}
            </div>
          </td>
        );
      })}
    </tr>
  );
}
