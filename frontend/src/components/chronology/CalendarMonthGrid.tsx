import { getClimateAspectHeaderIcon, type ClimateAspect } from '@/lib/climateAspect';
import type { MonthGridRow } from '@/lib/timeEngine';

export interface DayCellOverlay {
  count: number;
  hasContinuation: boolean;
}

interface CalendarMonthGridProps {
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
    <p className="mb-2 flex items-center justify-center gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-muted">
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
  columnLabels,
  monthTitle,
  climateAspect = null,
  rows,
  isIntercalaryMonth,
  eventsByDay,
  selectedDay = null,
  onDayClick,
}: CalendarMonthGridProps) {
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
        This day sits outside the standard weekday grid ({colSpan} column layout preserved for
        surrounding months).
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
          cell.isToday ? 'bg-primary/10 ring-1 ring-inset ring-primary/40' : 'bg-background/40'
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
              {Array.from({ length: Math.min(overlay.count, 3) }).map((_, dotIndex) => (
                <span
                  key={dotIndex}
                  className={`size-1 rounded-full ${
                    overlay.hasContinuation ? 'bg-muted' : 'bg-primary'
                  }`}
                />
              ))}
              {overlay.count > 3 && (
                <span className="text-[9px] text-muted">+{overlay.count - 3}</span>
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
