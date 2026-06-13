import { useMemo, useState } from 'react';
import type { WorldAdvanceEffect, WorldAdvancePreview } from '@shared/worldAdvance';
import { formatConditionAxisLabel } from '@shared/worldConditionSurfaces';
import { explainWorldAdvancePreview } from '@shared/explainWorldConditions';

type Props = {
  preview: WorldAdvancePreview;
  effects: WorldAdvanceEffect[];
  pageTitles?: Map<string, string>;
  /** When true, include campaign rollup surfaces (not only regions). */
  includeCampaignRollups?: boolean;
};

export function WorldAdvanceConditionPanel({
  preview,
  effects,
  pageTitles,
  includeCampaignRollups = false,
}: Props) {
  const [expandedConditionKey, setExpandedConditionKey] = useState<string | null>(
    null,
  );

  const explanations = useMemo(
    () => explainWorldAdvancePreview(preview, effects, pageTitles),
    [preview, effects, pageTitles],
  );

  const surfaces = preview.conditionSurfaces.filter(
    (s) => includeCampaignRollups || s.scopeKind === 'region',
  );

  if (!surfaces.length) {
    return (
      <p className="text-sm text-muted">No derived condition surfaces for this batch.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-amber-600 dark:text-amber-400">
        Derived · not canon — click a condition for provenance
      </p>
      <div className="flex flex-wrap gap-2">
        {surfaces.map((s) => {
          const key = `${s.scopeKind}-${s.regionPageId ?? 'campaign'}-${s.axis}`;
          const explanation = explanations.find(
            (e) =>
              e.axis === s.axis &&
              e.scopeKind === s.scopeKind &&
              e.regionLabel === s.regionLabel,
          );
          const expanded = expandedConditionKey === key;
          const chipLabel =
            s.scopeKind === 'campaign'
              ? `Campaign: ${formatConditionAxisLabel(s.axis)}`
              : `${s.regionLabel ?? 'Region'}: ${formatConditionAxisLabel(s.axis)}`;
          return (
            <div key={key} className="w-full sm:w-auto">
              <button
                type="button"
                className="rounded-full border border-border px-2 py-0.5 text-xs hover:bg-muted/30"
                onClick={() => setExpandedConditionKey(expanded ? null : key)}
                aria-expanded={expanded}
              >
                {chipLabel} — {s.level}
              </button>
              {expanded && explanation ? (
                <div className="mt-2 rounded-md border border-border/60 bg-background p-3 text-xs">
                  <p className="font-medium text-foreground">
                    Why {explanation.regionLabel ?? 'this scope'} — {explanation.axisLabel}{' '}
                    is {explanation.level}
                  </p>
                  <ul className="mt-2 space-y-2 text-muted">
                    {explanation.reasons.map((r, i) => (
                      <li key={i}>
                        <span className="text-foreground">{r.summary}</span>
                        {r.citationClauses.map((c, j) => (
                          <p key={j} className="mt-0.5 italic">
                            “{c}”
                          </p>
                        ))}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    className="mt-2 text-[10px] text-muted hover:text-foreground"
                    onClick={() => {
                      const block = [
                        `${chipLabel} = ${explanation.level}`,
                        ...explanation.reasons.map((r) => `- ${r.summary}`),
                      ].join('\n');
                      void navigator.clipboard.writeText(block);
                    }}
                  >
                    Copy provenance
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
