import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, X } from 'lucide-react';
import { FantasyDatePicker } from '@/components/chronology/FantasyDatePicker';
import {
  defaultQuestDate,
  formatQuestDateLabel,
  resolveMasterCalendarLike,
} from '@/lib/chronologyCalendar';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';
import { fetchTimeTracking } from '@/lib/timeTrackingApi';
import type { FantasyCalendarLike } from '@/lib/timeEngine';
import { ChronologyDateFields, formatChronologyDateLabel } from './ChronologyDateFields';

const triggerClass =
  'inline-flex h-8 w-full items-center gap-1.5 rounded-md border border-border bg-background px-2 text-xs hover:border-primary/50';

interface CampaignChronologyDateFieldProps {
  campaignHandle: string;
  label: string;
  value: ChronologyDateParts | null;
  onChange: (next: ChronologyDateParts | null) => void;
  disabled?: boolean;
  calendarLike?: FantasyCalendarLike | null;
  defaultDate?: ChronologyDateParts;
}

export function CampaignChronologyDateField({
  campaignHandle,
  label,
  value,
  onChange,
  disabled = false,
  calendarLike: calendarLikeProp,
  defaultDate: defaultDateProp,
}: CampaignChronologyDateFieldProps) {
  const [calendarLike, setCalendarLike] = useState<FantasyCalendarLike | null>(
    calendarLikeProp ?? null,
  );
  const [defaultDate, setDefaultDate] = useState<ChronologyDateParts>(
    defaultDateProp ?? defaultQuestDate(null),
  );
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarLikeProp !== undefined) {
      setCalendarLike(calendarLikeProp);
    }
  }, [calendarLikeProp]);

  useEffect(() => {
    if (defaultDateProp !== undefined) {
      setDefaultDate(defaultDateProp);
    }
  }, [defaultDateProp]);

  useEffect(() => {
    if (calendarLikeProp !== undefined) return;
    let cancelled = false;
    void fetchTimeTracking(campaignHandle)
      .then((bundle) => {
        if (cancelled) return;
        setCalendarLike(resolveMasterCalendarLike(bundle));
        setDefaultDate(defaultQuestDate(bundle));
      })
      .catch(() => {
        if (!cancelled) setCalendarLike(null);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, calendarLikeProp]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!popoverRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  const dateLabel = useMemo(() => {
    if (!value) return null;
    if (calendarLike) return formatQuestDateLabel(value, calendarLike);
    return formatChronologyDateLabel(value);
  }, [value, calendarLike]);

  if (!calendarLike) {
    return (
      <ChronologyDateFields
        label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    );
  }

  const pickerValue = value ?? defaultDate;

  return (
    <div className="space-y-1" ref={popoverRef}>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </span>
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((prev) => !prev)}
          className={`${triggerClass} ${dateLabel ? 'text-foreground' : 'text-muted'}`}
        >
          <Calendar className="size-3 shrink-0" />
          <span className="truncate">{dateLabel ?? 'Pick date'}</span>
        </button>
        {open ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border border-border bg-background p-2 shadow-xl">
            <FantasyDatePicker
              calendar={calendarLike}
              value={pickerValue}
              disabled={disabled}
              onChange={(parts) => onChange(parts)}
            />
            {value ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted hover:text-red-300"
              >
                <X className="size-3" />
                Clear date
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
