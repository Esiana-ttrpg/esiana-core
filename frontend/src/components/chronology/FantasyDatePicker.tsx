import { META_SECTION_LABEL_CLASS } from '@/lib/surfaceLayout';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  advanceChronologyDateByDays,
  clampChronologyDate,
  formatOccurrenceDateLabel,
  retreatChronologyDateByDays,
  type ChronologyDateParts,
} from '@/lib/chronologyDates';
import {
  getMonthsForYear,
  parseLeapRules,
  parseMonths,
  resolveMonthName,
  type FantasyCalendarLike,
} from '@/lib/timeEngine';

interface FantasyDatePickerProps {
  calendar: FantasyCalendarLike;
  value: ChronologyDateParts;
  onChange: (parts: ChronologyDateParts) => void;
  disabled?: boolean;
}

function parseLookupYear(yearInput: string): number {
  if (yearInput.trim() === '') {
    return 1;
  }
  const parsed = Number.parseInt(yearInput, 10);
  if (!Number.isFinite(parsed)) {
    return 1;
  }
  return Math.max(1, Math.floor(parsed));
}

export function FantasyDatePicker({
  calendar,
  value,
  onChange,
  disabled = false,
}: FantasyDatePickerProps) {
  const [yearInput, setYearInput] = useState(() =>
    value.year !== null ? String(value.year) : '1',
  );

  useEffect(() => {
    if (value.year !== null) {
      setYearInput(String(value.year));
    }
  }, [value.year]);

  const lookupYear = useMemo(() => parseLookupYear(yearInput), [yearInput]);

  const monthOptions = useMemo(() => {
    const baseMonths = parseMonths(calendar.months);
    const leapRules = parseLeapRules(calendar.leapDays);
    return getMonthsForYear(lookupYear, baseMonths, leapRules).map((month, index) => ({
      index,
      name: month.name,
      length: month.length,
    }));
  }, [calendar, lookupYear]);

  const clampedValue = useMemo(
    () => clampChronologyDate(calendar, value),
    [calendar, value],
  );

  const selectedMonthIndex = clampedValue.month ?? 0;
  const selectedMonth =
    monthOptions[Math.min(selectedMonthIndex, Math.max(0, monthOptions.length - 1))] ??
    monthOptions[0];

  const dayOptions = useMemo(() => {
    const length = selectedMonth?.length ?? 30;
    return Array.from({ length }, (_, index) => index + 1);
  }, [selectedMonth]);

  const commitParts = useCallback(
    (parts: ChronologyDateParts) => {
      const next = clampChronologyDate(calendar, parts);
      setYearInput(String(next.year ?? 1));
      onChange(next);
    },
    [calendar, onChange],
  );

  const commitYearInput = useCallback(() => {
    commitParts({
      year: parseLookupYear(yearInput),
      month: clampedValue.month,
      day: clampedValue.day,
    });
  }, [yearInput, clampedValue.month, clampedValue.day, commitParts]);

  const summaryLabel = useMemo(() => {
    const monthName = resolveMonthName(calendar, lookupYear, selectedMonthIndex);
    return formatOccurrenceDateLabel(
      {
        year: lookupYear,
        month: selectedMonthIndex,
        day: clampedValue.day,
        monthName,
      },
      monthName,
    );
  }, [calendar, lookupYear, selectedMonthIndex, clampedValue.day]);

  const handlePreviousDay = () => {
    commitParts(retreatChronologyDateByDays(calendar, clampedValue, 1));
  };

  const handleNextDay = () => {
    commitParts(advanceChronologyDateByDays(calendar, clampedValue, 1));
  };

  return (
    <div className="space-y-2 rounded-lg border border-border bg-surface/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">Event date</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={handlePreviousDay}
            className="rounded border border-border p-1 text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50"
            title="Previous day"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={handleNextDay}
            className="rounded border border-border p-1 text-muted hover:bg-elevated hover:text-foreground disabled:opacity-50"
            title="Next day"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[11px] text-primary">{summaryLabel}</p>

      <div className="grid grid-cols-3 gap-2">
        <label className="block space-y-1">
          <span className={META_SECTION_LABEL_CLASS}>Year</span>
          <input
            type="number"
            min={1}
            disabled={disabled}
            value={yearInput}
            onChange={(event) => setYearInput(event.target.value)}
            onBlur={commitYearInput}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
        </label>

        <label className="block space-y-1">
          <span className={META_SECTION_LABEL_CLASS}>Month</span>
          <select
            disabled={disabled || monthOptions.length === 0}
            value={selectedMonthIndex}
            onChange={(event) => {
              const month = Number(event.target.value);
              commitParts({
                year: parseLookupYear(yearInput),
                month,
                day: clampedValue.day,
              });
            }}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {monthOptions.map((month) => (
              <option key={month.index} value={month.index}>
                {month.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className={META_SECTION_LABEL_CLASS}>Day</span>
          <select
            disabled={disabled || dayOptions.length === 0}
            value={clampedValue.day ?? 1}
            onChange={(event) => {
              commitParts({
                year: parseLookupYear(yearInput),
                month: selectedMonthIndex,
                day: Number(event.target.value),
              });
            }}
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground"
          >
            {dayOptions.map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
