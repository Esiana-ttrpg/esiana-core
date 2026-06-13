import type { NarrativePressureItem } from '@/lib/sceneMetadata';

interface ContinuitySectionProps {
  pressureFeed: NarrativePressureItem[];
  issueCount: number;
}

export function ContinuitySection({ pressureFeed, issueCount }: ContinuitySectionProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Continuity</h2>
        <p className="text-sm text-muted-foreground">
          Narrative pressure feed and integrity diagnostics ({issueCount} issues)
        </p>
      </div>
      <ul className="space-y-2">
        {pressureFeed.slice(0, 30).map((item) => (
          <li
            key={item.id}
            className={`rounded border px-3 py-2 text-sm ${
              item.severity === 'critical'
                ? 'border-destructive/40 bg-destructive/5'
                : item.severity === 'warning'
                  ? 'border-amber-500/40 bg-amber-500/5'
                  : 'border-border'
            }`}
          >
            <div className="font-medium">{item.message}</div>
            <div className="text-xs text-muted-foreground">
              {item.category} · {item.sourceIssueType}
            </div>
          </li>
        ))}
        {pressureFeed.length === 0 ? (
          <li className="text-sm text-muted-foreground">No narrative pressure detected.</li>
        ) : null}
      </ul>
    </div>
  );
}
