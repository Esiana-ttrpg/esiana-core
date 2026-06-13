import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { parseAuthoringContextFromSearch } from '@shared/authoringContext';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignGrowthMetricsPanel } from '@/components/authoring/CampaignGrowthMetricsPanel';
import { NarrativeScaffoldPanel } from '@/components/authoring/NarrativeScaffoldPanel';
import { AuthoringOverlayRail } from '@/components/authoring/AuthoringOverlayRail';
import { fetchWritingPulse } from '@/lib/wikiLoreGraph';
import { campaignWikiPath } from '@/lib/campaignPaths';
import { useEffect, useState } from 'react';

interface AuthoringWorkshopSectionProps {
  campaignHandle: string;
  /** When true, omit top-level workshop header (Insights embed). */
  embedded?: boolean;
}

export function AuthoringWorkshopSection({
  campaignHandle,
  embedded = false,
}: AuthoringWorkshopSectionProps) {
  const location = useLocation();
  const { flatPages } = useWiki();
  const context = useMemo(
    () => parseAuthoringContextFromSearch(location.search),
    [location.search],
  );

  const [pulse, setPulse] = useState<Awaited<ReturnType<typeof fetchWritingPulse>> | null>(null);

  useEffect(() => {
    fetchWritingPulse(campaignHandle, 30).then(setPulse).catch(() => setPulse(null));
  }, [campaignHandle]);

  const anchorPages = (context.anchorEntityIds ?? [])
    .map((id) => flatPages.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => p != null);

  return (
    <div className="space-y-8">
      {!embedded ? (
        <header className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Authoring Workshop</h2>
          <p className="text-sm text-muted-foreground">
            Long-horizon narrative authoring — structured overlays on top of the universal editor,
            never the default for every page.
          </p>
        </header>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(240px,320px)]">
        <div className="space-y-8">
          <CampaignGrowthMetricsPanel campaignHandle={campaignHandle} />

          {pulse ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Your writing pulse (30d)</h3>
              <p className="text-xs text-muted-foreground">
                Private reflection on lore cadence — not shared or ranked.
              </p>
              <dl className="grid grid-cols-2 gap-2">
                <div className="rounded border border-border p-3">
                  <dt className="text-xs text-muted-foreground">Pages edited</dt>
                  <dd className="text-lg font-semibold">{pulse.pagesEdited}</dd>
                </div>
                <div className="rounded border border-border p-3">
                  <dt className="text-xs text-muted-foreground">Words in touched pages</dt>
                  <dd className="text-lg font-semibold">{pulse.totalWordsInTouchedPages}</dd>
                </div>
              </dl>
            </section>
          ) : null}

          <NarrativeScaffoldPanel campaignHandle={campaignHandle} />

          {anchorPages.length > 0 ? (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">This session</h3>
              <ul className="space-y-1 text-sm">
                {anchorPages.map((page) => (
                  <li key={page.id}>
                    <Link
                      to={campaignWikiPath(campaignHandle, page.id, flatPages)}
                      className="text-primary hover:underline"
                    >
                      {page.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <AuthoringOverlayRail campaignHandle={campaignHandle} context={context} />
      </div>
    </div>
  );
}
