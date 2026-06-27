import { META_FIELD_LABEL_CLASS } from '@/lib/surfaceLayout';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';

const fieldClass =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60';

interface ChronologyDateFieldsProps {
  label: string;
  value: ChronologyDateParts | null;
  disabled?: boolean;
  onChange: (next: ChronologyDateParts | null) => void;
}

function parsePart(raw: string): number | null {
  if (!raw.trim()) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ChronologyDateFields({
  label,
  value,
  disabled = false,
  onChange,
}: ChronologyDateFieldsProps) {
  const parts = value ?? { year: null, month: null, day: null };

  function update(patch: Partial<ChronologyDateParts>) {
    const next = { ...parts, ...patch };
    if (next.year === null && next.month === null && next.day === null) {
      onChange(null);
      return;
    }
    onChange(next);
  }

  return (
    <div className="space-y-1">
      <span className={META_FIELD_LABEL_CLASS}>
        {label}
      </span>
      <div className="grid grid-cols-3 gap-1">
        <input
          type="number"
          value={parts.year ?? ''}
          disabled={disabled}
          placeholder="Year"
          aria-label={`${label} year`}
          className={fieldClass}
          onChange={(event) => update({ year: parsePart(event.target.value) })}
        />
        <input
          type="number"
          value={parts.month ?? ''}
          disabled={disabled}
          placeholder="Mo"
          aria-label={`${label} month`}
          className={fieldClass}
          onChange={(event) => update({ month: parsePart(event.target.value) })}
        />
        <input
          type="number"
          value={parts.day ?? ''}
          disabled={disabled}
          placeholder="Day"
          aria-label={`${label} day`}
          className={fieldClass}
          onChange={(event) => update({ day: parsePart(event.target.value) })}
        />
      </div>
    </div>
  );
}

export function formatChronologyDateLabel(parts: ChronologyDateParts | null): string {
  if (!parts) return '—';
  const year = parts.year ?? '—';
  const month = parts.month !== null ? parts.month + 1 : null;
  const day = parts.day;
  if (month !== null && day !== null) return `Year ${year}, M${month} D${day}`;
  if (month !== null) return `Year ${year}, M${month}`;
  return `Year ${year}`;
}
