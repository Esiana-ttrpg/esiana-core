import type { RelationsNarrativeSummary as SummaryModel } from '@shared/relationshipLensProjections';

interface RelationsNarrativeSummaryProps {
  summary: SummaryModel;
}

export function RelationsNarrativeSummary({ summary }: RelationsNarrativeSummaryProps) {
  return (
    <section className="rounded-lg border border-border/60 bg-surface/40 p-4">
      <h2 className="text-sm font-semibold text-foreground">{summary.headline}</h2>
      <ul className="mt-2 space-y-1.5 text-sm text-muted">
        {summary.bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span className="text-primary" aria-hidden>
              •
            </span>
            <span>{bullet}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
