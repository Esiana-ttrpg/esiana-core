import type { InterpretiveLoreSummary, EntityHistoricalNameProjection } from '@/lib/loreKnowledgeProjection';
import { formatAliasUsageTypeLabel } from '@/lib/loreKnowledgeProjection';
import { TYPE_META_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

interface InterpretiveLoreChipRowProps {
  summary: InterpretiveLoreSummary | null;
}

export function InterpretiveLoreChipRow({ summary }: InterpretiveLoreChipRowProps) {
  if (!summary) return null;
  const chips: string[] = [];
  if (summary.formerChip) chips.push(`Formerly: ${summary.formerChip}`);
  if (summary.disputed) chips.push('Disputed');
  if (summary.confidenceLabel) chips.push(summary.confidenceLabel);

  if (chips.length === 0) return null;

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5" aria-label="Interpretive lore">
      {chips.map((label) => (
        <span
          key={label}
          className={`${TYPE_META_CLASS} inline-flex items-center rounded-full bg-depth-3/60 px-2 py-0.5 text-[10px] normal-case tracking-normal`}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

interface EraNameCalloutProps {
  nameProjection: EntityHistoricalNameProjection | null;
}

export function EraNameCallout({ nameProjection }: EraNameCalloutProps) {
  if (!nameProjection?.eraCallout?.length) return null;

  return (
    <div className={`${TYPE_PROSE_CLASS} region-depth-3 mt-2 rounded-md px-3 py-2 text-xs`}>
      <p className={`${TYPE_META_CLASS} font-medium uppercase`}>
        Known in this era as
      </p>
      <ul className="mt-1 space-y-0.5 text-focal-foreground">
        {nameProjection.eraCallout.map((entry) => (
          <li key={`${entry.name}-${entry.usageType}`}>
            {entry.name}
            <span className="ml-1.5 text-muted">
              ({formatAliasUsageTypeLabel(entry.usageType)})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface InterpretiveLoreHeaderProps {
  summary: InterpretiveLoreSummary | null;
  nameProjection: EntityHistoricalNameProjection | null;
}

export function InterpretiveLoreHeader({
  summary,
  nameProjection,
}: InterpretiveLoreHeaderProps) {
  return (
    <>
      <InterpretiveLoreChipRow summary={summary} />
      <EraNameCallout nameProjection={nameProjection} />
    </>
  );
}
