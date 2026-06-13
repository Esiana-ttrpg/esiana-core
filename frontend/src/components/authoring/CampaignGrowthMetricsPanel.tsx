import { useEffect, useState } from 'react';
import { fetchCampaignGrowthMetrics, type CampaignGrowthMetrics } from '@/lib/authoringApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface CampaignGrowthMetricsPanelProps {
  campaignHandle: string;
}

export function CampaignGrowthMetricsPanel({ campaignHandle }: CampaignGrowthMetricsPanelProps) {
  const [metrics, setMetrics] = useState<CampaignGrowthMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchCampaignGrowthMetrics(campaignHandle)
      .then((data) => {
        if (!cancelled) {
          setMetrics(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load growth metrics');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle]);

  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }

  if (!metrics) {
    return <LoadingSpinner label="Loading campaign growth…" />;
  }

  const rows = [
    { label: 'NPCs', value: metrics.npcCount },
    { label: 'Active threads', value: metrics.activeThreadCount },
    { label: 'Scenes', value: metrics.sceneCount },
    { label: 'Active factions', value: metrics.factionCount },
    { label: 'Active quests', value: metrics.activeQuestCount },
  ];

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-sm font-semibold text-foreground">Campaign growth</h2>
        <p className="text-xs text-muted-foreground">
          A quiet snapshot of narrative scale — not a scoreboard.
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded border border-border p-3">
            <dt className="text-xs text-muted-foreground">{row.label}</dt>
            <dd className="text-lg font-semibold text-foreground">{row.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
