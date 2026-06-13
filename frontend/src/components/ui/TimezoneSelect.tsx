import { useMemo } from 'react';
import { controlClasses } from '@/components/ui/formStyles';

const FALLBACK_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney',
];

function listBrowserTimezones(): string[] {
  if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
    try {
      return [...Intl.supportedValuesOf('timeZone')].sort();
    } catch {
      return FALLBACK_TIMEZONES;
    }
  }
  return FALLBACK_TIMEZONES;
}

interface TimezoneSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  className?: string;
}

export function TimezoneSelect({
  id,
  value,
  onChange,
  allowEmpty = false,
  emptyLabel = 'Use instance default',
  className,
}: TimezoneSelectProps) {
  const timezones = useMemo(() => {
    const base = listBrowserTimezones();
    const trimmed = value.trim();
    if (trimmed && !base.includes(trimmed)) {
      return [...base, trimmed].sort();
    }
    return base;
  }, [value]);

  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={className ?? controlClasses}
    >
      {allowEmpty ? <option value="">{emptyLabel}</option> : null}
      {timezones.map((zone) => (
        <option key={zone} value={zone}>
          {zone}
        </option>
      ))}
    </select>
  );
}

export function resolveClientEffectiveTimezone(input: {
  userTimezone?: string | null;
  systemDefaultTimezone?: string | null;
}): string {
  const user = input.userTimezone?.trim();
  if (user) return user;
  const system = input.systemDefaultTimezone?.trim();
  return system || 'UTC';
}
