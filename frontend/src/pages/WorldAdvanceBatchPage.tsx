import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWiki } from '@/contexts/WikiContext';
import { CampaignMemberRoles } from '@/types/domain';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MascotErrorPanel } from '@/components/errors/MascotErrorPanel';
import { WorldAdvanceConditionPanel } from '@/components/worldAdvance/WorldAdvanceConditionPanel';
import {
  getWorldAdvanceBatchDetail,
  type WorldAdvanceBatchDetail,
} from '@/lib/worldAdvanceApi';
import { buildPageTitlesFromEffects } from '@shared/explainWorldConditions';
import {
  campaignTimeTrackingPath,
  campaignWorldAdvancePath,
  readCampaignHandle,
} from '@/lib/campaignPaths';

export function WorldAdvanceBatchPage() {
  const params = useParams<{ campaignHandle?: string; eventId?: string }>();
  const campaignHandle = readCampaignHandle(params);
  const eventId = params.eventId ?? '';
  const { campaign, loading: campaignLoading } = useWiki();
  const canManage =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const [detail, setDetail] = useState<WorldAdvanceBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage || !eventId) return;
    setLoading(true);
    getWorldAdvanceBatchDetail(campaignHandle, eventId)
      .then(setDetail)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [canManage, campaignHandle, eventId]);

  const pageTitles = useMemo(() => {
    if (!detail?.preview || !detail.payload?.effects.length) return undefined;
    const titles = new Map<string, string>();
    for (const surface of detail.preview.conditionSurfaces) {
      if (surface.regionPageId && surface.regionLabel) {
        titles.set(surface.regionPageId, surface.regionLabel);
      }
    }
    return buildPageTitlesFromEffects(detail.payload.effects, titles);
  }, [detail]);

  if (campaignLoading || loading) {
    return <LoadingSpinner label="Loading batch…" />;
  }

  if (!canManage) {
    return (
      <MascotErrorPanel
        title="Access denied"
        description="Only the DM or Co-DM can view world advance batches."
      />
    );
  }

  if (error || !detail?.preview || !detail.payload) {
    return (
      <MascotErrorPanel
        title="Batch not found"
        description={error ?? 'Could not load world advance batch detail.'}
      />
    );
  }

  const { preview, payload, event } = detail;

  return (
    <article className="mx-auto max-w-3xl space-y-6 p-4">
      <header className="space-y-1">
        <p className="text-xs text-muted">
          <Link to={campaignTimeTrackingPath(campaignHandle)} className="hover:text-foreground">
            Time tracking
          </Link>
          {' · '}
          <Link to={campaignWorldAdvancePath(campaignHandle)} className="hover:text-foreground">
            Advance world
          </Link>
        </p>
        <h1 className={TYPE_DISPLAY_CLASS}>{event.title}</h1>
        <p className="text-xs text-muted">
          Epoch {event.targetEpochMinute} · {payload.effects.length} effects · batch{' '}
          <span className="font-mono">{payload.batchId}</span>
        </p>
      </header>

      <section className="space-y-2 rounded-lg border border-border bg-muted/5 p-4">
        <h2 className="text-sm font-semibold text-foreground">Narrative synthesis (projection)</h2>
        <p className="text-sm font-medium">{preview.narrativeSynthesis.headline}</p>
        {preview.narrativeSynthesis.paragraphs.map((p, i) => (
          <p key={i} className="text-sm text-foreground">
            {p}
          </p>
        ))}
      </section>

      <section className="space-y-2 rounded-lg border border-border bg-muted/5 p-4">
        <h2 className="text-sm font-semibold text-foreground">Why conditions look this way</h2>
        <WorldAdvanceConditionPanel
          preview={preview}
          effects={payload.effects}
          pageTitles={pageTitles}
          includeCampaignRollups
        />
      </section>
    </article>
  );
}
