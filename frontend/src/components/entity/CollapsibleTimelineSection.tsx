import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ChronologyDateParts } from '@/lib/entityRelationTypes';

function formatYearShort(parts: ChronologyDateParts | null): string {
  if (!parts || parts.year === null) return '—';
  return String(parts.year);
}

export function formatTimelineSummary(parts: {
  birthDate: ChronologyDateParts | null;
  deathDate: ChronologyDateParts | null;
  successionStart: ChronologyDateParts | null;
  successionEnd: ChronologyDateParts | null;
}): string {
  return `Born ${formatYearShort(parts.birthDate)} • Died ${formatYearShort(parts.deathDate)} • Succession ${formatYearShort(parts.successionStart)}${parts.successionEnd ? `–${formatYearShort(parts.successionEnd)}` : ''}`;
}

interface CollapsibleTimelineSectionProps {
  birthDate: ChronologyDateParts | null;
  deathDate: ChronologyDateParts | null;
  successionStart: ChronologyDateParts | null;
  successionEnd: ChronologyDateParts | null;
  defaultExpanded?: boolean;
  children: ReactNode;
}

export function CollapsibleTimelineSection({
  birthDate,
  deathDate,
  successionStart,
  successionEnd,
  defaultExpanded = false,
  children,
}: CollapsibleTimelineSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const summary = formatTimelineSummary({
    birthDate,
    deathDate,
    successionStart,
    successionEnd,
  });

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-surface/40 px-2 py-1.5 text-left"
        aria-expanded={expanded}
      >
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted transition-transform ${
            expanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
        <span className="text-[10px] text-muted">{summary}</span>
      </button>
      {expanded ? (
        <div className="grid gap-2">{children}</div>
      ) : null}
    </div>
  );
}
