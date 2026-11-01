import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Map, BookOpen, ListChecks, BarChart3 } from 'lucide-react';
import type { DashboardCampaignFeatures, DashboardPreview } from '@shared/dashboardCampaignFeatures';
import { readMetricAmount } from '@shared/metricValue';
import { DashboardWidgetShell } from '../DashboardWidgetShell';
import { IdentityPagePicker } from '@/components/campaign/IdentityPagePicker';
import { useWiki } from '@/contexts/WikiContext';

export interface ContextWidgetProps {
  id: string;
  campaignHandle: string;
  features?: DashboardCampaignFeatures;
  config?: Record<string, unknown>;
  customizeMode?: boolean;
  onHide?: () => void;
  onConfigChange: (config: Record<string, unknown>) => void;
}
function Preview({ preview }: { preview: DashboardPreview }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <Link to={preview.href} className="group block min-w-0 space-y-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
    {preview.imageUrl && preview.imageUrl !== failedUrl ? <img src={preview.imageUrl} alt="" loading="lazy" onError={() => setFailedUrl(preview.imageUrl)} className="max-h-64 w-full rounded-lg object-cover" /> : <div className="flex h-24 items-center justify-center rounded-lg bg-elevated text-muted" aria-hidden="true">{preview.type === 'map' ? <Map className="size-8" /> : <BookOpen className="size-8" />}</div>}
    <div><p className="text-xs capitalize text-muted">{preview.type.toLowerCase().replaceAll('_', ' ')}</p><h4 className="break-words font-semibold group-hover:underline decoration-primary">{preview.title}</h4></div>
    {preview.excerpt && <p className="text-sm text-muted">{preview.excerpt}</p>}
    <span className="block text-xs text-foreground underline decoration-primary underline-offset-4">Open {preview.type === 'map' ? 'map' : 'page'} →</span>
  </Link>;
}
export function CampaignContextWidget({ id, campaignHandle, features, config = {}, customizeMode, onHide, onConfigChange }: ContextWidgetProps) {
  const { flatPages } = useWiki();
  const map = id === 'campaignMap';
  const preview = map ? features?.map : features?.spotlight;
  return <DashboardWidgetShell title={map ? 'Campaign Map' : 'Page Spotlight'} icon={map ? <Map className="size-4" /> : <BookOpen className="size-4" />} customizeMode={customizeMode} onHide={onHide}>
    {customizeMode && <details className="mb-3 text-sm"><summary className="cursor-pointer py-2">{map ? 'Choose map' : 'Configure spotlight'}</summary><div className="space-y-3 py-2">
      {map ? <><label className="block">Map<select className="mt-1 w-full rounded border border-border bg-background p-2" value={typeof config.mapId === 'string' ? config.mapId : ''} onChange={event => onConfigChange({ ...config, mapId: event.target.value })}><option value="">Select a map</option>{features?.mapOptions.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="block">Description (optional)<textarea maxLength={1000} className="mt-1 w-full rounded border border-border bg-background p-2" value={typeof config.description === 'string' ? config.description : ''} onChange={event => onConfigChange({ ...config, description: event.target.value })} /></label></> : <>
        <IdentityPagePicker flatPages={flatPages} ariaLabel="Spotlight page" value={typeof config.pageId === 'string' ? config.pageId : null} onChange={pageId => onConfigChange({ ...config, pageId })} clearLabel="No spotlight page" />
        <label className="block">Introduction (optional)<textarea maxLength={1000} className="mt-1 w-full rounded border border-border bg-background p-2" value={typeof config.introduction === 'string' ? config.introduction : ''} onChange={event => onConfigChange({ ...config, introduction: event.target.value })} /></label>
      </>}
    </div></details>}
    {preview ? <>{typeof config[map ? 'description' : 'introduction'] === 'string' && <p className="mb-3 whitespace-pre-wrap break-words text-sm">{String(config[map ? 'description' : 'introduction']).slice(0, 1000)}</p>}<Preview preview={preview} /></> : <p className="text-sm text-muted">{map ? 'No map is available to display.' : 'No spotlight page is available to display.'}{customizeMode ? ' Choose an accessible record above.' : ''}</p>}
    {map && !preview && customizeMode && <Link className="mt-2 block text-sm text-foreground underline decoration-primary underline-offset-4" to={`/campaigns/${campaignHandle}/maps`}>Browse campaign maps</Link>}
  </DashboardWidgetShell>;
}
export function NeedsAttentionWidget({ features, customizeMode, onHide }: ContextWidgetProps) {
  return <DashboardWidgetShell title="Needs Your Attention" icon={<ListChecks className="size-4" />} customizeMode={customizeMode} onHide={onHide}>
    {features?.actions.length ? <ul className="space-y-3">{features.actions.map(item => <li key={item.id}><Link className="text-sm font-medium text-foreground underline decoration-primary underline-offset-4" to={item.href}>{item.title}</Link><p className="text-xs text-muted">{item.optional && 'Optional · '}{item.context}{item.deadline && <> · Respond by <time dateTime={item.deadline}>{new Date(item.deadline).toLocaleString()}</time></>}</p></li>)}</ul> : <p className="text-sm text-muted">Nothing is waiting for your attention.</p>}
  </DashboardWidgetShell>;
}
export function CampaignStatisticsWidget({ campaignHandle, features, customizeMode, onHide }: ContextWidgetProps) {
  const stats = features?.statistics;
  return <DashboardWidgetShell title="Campaign Statistics" icon={<BarChart3 className="size-4" />} customizeMode={customizeMode} onHide={onHide}>
    {stats ? <><p className="mb-3 text-xs text-muted">Last {stats.days} real-world days · visible records</p><dl className="grid grid-cols-2 gap-3">{stats.metrics.slice(0, 4).map(metric => <div key={metric.id}><dt className="text-xs text-muted">{metric.label}</dt><dd className="text-xl font-semibold">{readMetricAmount(metric.value) ?? 'Unavailable'}</dd></div>)}</dl></> : <p className="text-sm text-muted">Statistics are unavailable.</p>}
    <Link className="mt-4 block text-sm text-foreground underline decoration-primary underline-offset-4" to={`/campaigns/${campaignHandle}/campaign-statistics`}>Explore statistics and definitions →</Link>
  </DashboardWidgetShell>;
}
