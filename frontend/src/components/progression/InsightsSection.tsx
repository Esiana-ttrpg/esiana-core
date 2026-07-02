import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdventureHub } from '@/lib/adventure';
import { fetchCreativeDrift } from '@/lib/creativeDrift';
import { campaignAdventureHubPath } from '@/lib/campaignPaths';
import { adventureViewHref } from '@/lib/adventureLayout';
import { CampaignPulse, type CampaignPulseData } from '@/components/adventure/CampaignPulse';
import { ContinuitySection } from '@/components/adventure/ContinuitySection';
import { ProgressionTrajectoriesSection } from '@/components/progression/ProgressionTrajectoriesSection';
import { CampaignGrowthMetricsPanel } from '@/components/authoring/CampaignGrowthMetricsPanel';
import { NarrativeScaffoldPanel } from '@/components/authoring/NarrativeScaffoldPanel';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface InsightsSectionProps {
  campaignHandle: string;
  questsCategoryId: string;
}

export function InsightsSection({ campaignHandle, questsCategoryId }: InsightsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [pulseCollapsed, setPulseCollapsed] = useState(false);
  const [pulseData, setPulseData] = useState<CampaignPulseData>({});
  const [pressureFeed, setPressureFeed] = useState<
    import('@/lib/sceneMetadata').NarrativePressureItem[]
  >([]);
  const [issueCount, setIssueCount] = useState(0);
  const [unresolvedCount, setUnresolvedCount] = useState<number | undefined>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [continuityPayload, arcsPayload, driftScan] = await Promise.all([
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'continuity',
          }),
          fetchAdventureHub(campaignHandle, {
            pageId: questsCategoryId,
            section: 'arcs',
          }),
          fetchCreativeDrift(campaignHandle).catch(() => null),
        ]);
        if (cancelled) return;
        const continuity = continuityPayload.continuity;
        setPressureFeed(continuity?.pressureFeed ?? []);
        setIssueCount(continuity?.issues?.length ?? 0);
        setUnresolvedCount(driftScan?.summary.totalActive);
        setPulseData({
          activeArcCount: arcsPayload.arcHierarchy?.roots?.length,
          unresolvedCount: driftScan?.summary.totalActive,
          pressureSignals: continuity?.pressureFeed,
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, questsCategoryId]);

  const unresolvedHref = useMemo(
    () => adventureViewHref(campaignAdventureHubPath(campaignHandle), 'unresolved'),
    [campaignHandle],
  );

  if (loading) {
    return <LoadingSpinner label="Loading insights…" />;
  }

  return (
    <div className="space-y-10">
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Campaign pulse</h2>
        <CampaignPulse
          data={pulseData}
          collapsed={pulseCollapsed}
          onToggleCollapsed={() => setPulseCollapsed((value) => !value)}
        />
      </section>

      <ContinuitySection pressureFeed={pressureFeed} issueCount={issueCount} />

      <ProgressionTrajectoriesSection campaignHandle={campaignHandle} />

      <section className="space-y-2 rounded-lg border border-border bg-elevated/20 p-4">
        <h2 className="text-sm font-semibold text-foreground">Unresolved narrative drift</h2>
        <p className="text-sm text-muted-foreground">
          {unresolvedCount != null && unresolvedCount > 0
            ? `${unresolvedCount} active drift signal${unresolvedCount === 1 ? '' : 's'} across the campaign.`
            : 'No active drift signals detected.'}
        </p>
        <Link to={unresolvedHref} className="text-sm text-primary hover:underline">
          Open Story › Unresolved
        </Link>
      </section>

      <section className="space-y-4">
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-foreground">Authoring analytics</h2>
          <p className="text-sm text-muted-foreground">
            Growth metrics and narrative scaffolds — diagnostics. Draft in Progression › Workshop.
          </p>
        </header>
        <CampaignGrowthMetricsPanel campaignHandle={campaignHandle} />
        <NarrativeScaffoldPanel campaignHandle={campaignHandle} />
      </section>
    </div>
  );
}
