import { useEffect, useState } from 'react';
import { BookMarked } from 'lucide-react';
import {
  ALL_PAGE_NARRATIVE_STATUSES,
  formatPageNarrativeStatusLabel,
  type PageNarrativeStatusProjection,
  type PageNarrativeStatusValue,
} from '@shared/pageNarrativeStatus';
import {
  fetchPageNarrativeStatus,
  patchPageNarrativeStatus,
} from '@/lib/pageNarrativeStatusApi';
import { NarrativeStatusGmBadge } from '@/components/wiki/NarrativeStatusBadge';
import { OpenInAuthoringWorkshopLink } from '@/components/authoring/OpenInAuthoringWorkshopLink';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface CodexNarrativeStatusSectionProps {
  campaignHandle: string;
  pageId: string;
  templateType: string;
  pageMetadata?: unknown;
  isDMUser?: boolean;
  railCompact: boolean;
}

export function CodexNarrativeStatusSection({
  campaignHandle,
  pageId,
  templateType,
  pageMetadata,
  isDMUser: isDMUserProp,
  railCompact,
}: CodexNarrativeStatusSectionProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const [projection, setProjection] = useState<PageNarrativeStatusProjection | null>(
    null,
  );
  const [status, setStatus] = useState<PageNarrativeStatusValue>('ACTIVE');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDMUser || !pageId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchPageNarrativeStatus(campaignHandle, pageId)
      .then((res) => {
        if (cancelled) return;
        setProjection(res.narrativeStatus);
        setStatus(res.narrativeStatus.status);
        setReason(res.stored?.reason ?? '');
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load narrative status');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [campaignHandle, pageId, isDMUser]);

  async function persist(nextStatus: PageNarrativeStatusValue, nextReason: string) {
    setUpdating(true);
    setError(null);
    try {
      const res = await patchPageNarrativeStatus(campaignHandle, pageId, {
        status: nextStatus,
        reason: nextReason.trim() || null,
      });
      setProjection(res.narrativeStatus);
      setStatus(res.narrativeStatus.status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save narrative status');
    } finally {
      setUpdating(false);
    }
  }

  if (!isDMUser) return null;

  return (
    <div className={railCompact ? 'space-y-2' : 'space-y-3'}>
      <div className="flex items-center gap-2">
        <BookMarked className="size-3.5 text-primary" aria-hidden />
        <span className="text-xs font-medium text-contextual-foreground">Narrative status</span>
        {projection ? (
          <NarrativeStatusGmBadge narrativeStatus={projection} compact />
        ) : null}
      </div>
      {loading ? (
        <p className="text-xs text-muted">Loading narrative status…</p>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Canon status
            </span>
            <select
              className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
              value={status}
              disabled={updating}
              onChange={(e) => {
                const next = e.target.value as PageNarrativeStatusValue;
                setStatus(next);
                void persist(next, reason);
              }}
              aria-label="Page narrative status"
            >
              {ALL_PAGE_NARRATIVE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {formatPageNarrativeStatusLabel(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Reason (optional)
            </span>
            <textarea
              className="min-h-[3rem] w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary/60"
              value={reason}
              disabled={updating}
              placeholder="Why this status applies in canon…"
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => void persist(status, reason)}
            />
          </label>
          <p className="text-[10px] text-muted">
            Editorial canon — distinct from party discovery and content presence.
          </p>
        </>
      )}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <OpenInAuthoringWorkshopLink
        campaignHandle={campaignHandle}
        pageId={pageId}
        templateType={templateType}
        metadata={pageMetadata}
        className="mt-1"
      />
    </div>
  );
}
