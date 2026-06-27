import { Link } from 'react-router-dom';
import type { CampaignNarrativeSnapshot } from '@/lib/dashboardNarrativeSnapshot';
import { META_SECTION_LABEL_CLASS, TYPE_META_CLASS, TYPE_PROSE_CLASS } from '@/lib/surfaceLayout';

interface CampaignHomeDeepSystemsProps {
  deepSystems: NonNullable<CampaignNarrativeSnapshot['deepSystems']>;
}

export function CampaignHomeDeepSystems({ deepSystems }: CampaignHomeDeepSystemsProps) {
  const hasPressure = Boolean(deepSystems.worldPressure);
  const hasThreads = (deepSystems.threadSummaries?.length ?? 0) > 0;
  const hasDigest = (deepSystems.continuityDigest?.length ?? 0) > 0;

  if (!hasPressure && !hasThreads && !hasDigest) return null;

  return (
    <details className="region-depth-1 rounded-lg border border-border/20 px-4 py-3">
      <summary
        className={`${META_SECTION_LABEL_CLASS} cursor-pointer list-none text-recessed-foreground marker:content-none [&::-webkit-details-marker]:hidden`}
      >
        World &amp; continuity
      </summary>
      <div className="mt-4 space-y-4">
        {deepSystems.worldPressure ? (
          <div>
            <Link
              to={deepSystems.worldPressure.href}
              className="text-sm font-medium text-focal-foreground hover:text-primary"
            >
              {deepSystems.worldPressure.levelLabel}
            </Link>
            <ul className={`${TYPE_PROSE_CLASS} mt-2 space-y-1 text-sm text-prose-muted`}>
              {deepSystems.worldPressure.summaryLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {hasThreads ? (
          <ul className="space-y-1.5">
            {deepSystems.threadSummaries!.map((thread) => (
              <li key={thread.id}>
                <Link
                  to={thread.href}
                  className="text-sm text-focal-foreground/85 hover:text-primary"
                >
                  {thread.title}
                  <span className="ml-2 text-[10px] uppercase text-focal-muted">
                    {thread.statusLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
        {hasDigest ? (
          <ul className={`${TYPE_META_CLASS} space-y-1 normal-case tracking-normal text-recessed-foreground`}>
            {deepSystems.continuityDigest!.map((row) => (
              <li key={row.label}>
                {row.href ? (
                  <Link to={row.href} className="hover:text-primary">
                    {row.count} {row.label}
                  </Link>
                ) : (
                  <span>
                    {row.count} {row.label}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </details>
  );
}
