import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { CampaignStatistics, CampaignStatistic } from '@shared/dashboardCampaignFeatures';
import { readMetricAmount, type MetricValue } from '@shared/metricValue';
import { fetchCampaignStatistics } from '@/lib/dashboard';
import { DashboardWidgetShell } from '@/components/dashboard/DashboardWidgetShell';

export function statisticText(value: MetricValue) {
  const amount = readMetricAmount(value);
  return amount === null ? 'Unavailable' : amount.toLocaleString();
}
export function statisticComparison(metric: CampaignStatistic) {
  const current = readMetricAmount(metric.value), previous = readMetricAmount(metric.previous);
  if (current === null || previous === null) return 'No historical comparison';
  const delta = current - previous;
  return `${delta > 0 ? '+' : ''}${delta.toLocaleString()} compared with ${previous.toLocaleString()} in the preceding equal period`;
}
export function CampaignStatisticsPage() {
  const { campaignHandle = '' } = useParams();
  const [days, setDays] = useState(30);
  const [revision, setRevision] = useState(0);
  const [statistics, setStatistics] = useState<CampaignStatistics>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(undefined); setStatistics(undefined);
    void fetchCampaignStatistics(campaignHandle, days).then(result => { if (!cancelled) setStatistics(result); }).catch(err => { if (!cancelled) setError(err instanceof Error ? err.message : 'Statistics could not be loaded.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignHandle, days, revision]);
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
    <header className="space-y-3"><Link className="text-sm text-primary" to={`/campaigns/${campaignHandle}/dashboard`}>← Campaign Home</Link><h1 className="text-2xl font-semibold">Campaign Statistics</h1><p className="text-sm text-muted">Statistics describe records you can currently access. Real-world activity and in-world chronology use separate clocks.</p><label className="block text-sm">Real-world activity period <select className="ml-2 rounded border border-border bg-background p-2" value={days} onChange={event => setDays(Number(event.target.value))}>{[7, 30, 90, 365].map(value => <option key={value} value={value}>Last {value} days</option>)}</select></label></header>
    <DashboardWidgetShell title="Recorded activity and current state" loading={loading} error={error} action={error ? <button type="button" className="text-sm text-primary" onClick={() => setRevision(value => value + 1)}>Retry</button> : undefined}>
      {statistics && <><p className="mb-4 text-xs text-muted">{new Date(statistics.from).toLocaleDateString()} – {new Date(statistics.to).toLocaleDateString()} · calculated {new Date(statistics.computedAt).toLocaleString()}</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{statistics.metrics.map(metric => <article key={metric.id} className="min-w-0 space-y-1 border-t border-border pt-3"><p className="text-xs text-muted">{metric.category}</p><h2 className="font-medium">{metric.label}</h2><p className="text-2xl font-semibold">{statisticText(metric.value)}</p><p className="text-xs text-muted">{statisticComparison(metric)}</p><p className="text-sm text-muted">{metric.explanation}</p></article>)}</div></>}
    </DashboardWidgetShell>
    {statistics && <DashboardWidgetShell title="In-world chronology"><p className="mb-4 text-sm text-muted">{statistics.chronology.label}</p><dl className="flex flex-wrap gap-8">{(['major', 'minor', 'notice'] as const).map(key => <div key={key}><dt className="capitalize text-sm text-muted">{key}</dt><dd className="text-xl font-semibold">{statisticText(statistics.chronology[key])}</dd></div>)}</dl></DashboardWidgetShell>}
  </main>;
}
