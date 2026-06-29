import { WorkspaceHeader } from '@/components/layout/WorkspaceHeader';
import { CategoryIndexToolbar } from '@/components/wiki/indexBrowse/CategoryIndexToolbar';
import { formatWorkspaceCountLabel } from '@/lib/workspaceHeaderPolicy';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight, FolderOpen, History } from 'lucide-react';
import {
  listCampaignActivity,
  type CampaignActivityPagination,
  type CampaignActivityRow,
} from '@/lib/campaignActivityApi';
import {
  readCampaignHandle,
  campaignChronologyPath,
  campaignCategoryChildPath,
  campaignFreeformPagePath,
} from '@/lib/campaignPaths';
import { useWiki } from '@/contexts/WikiContext';
import {
  deltaBadgeClasses,
  formatByteSize,
  formatDeltaBytes,
  groupActivityByDate,
  type ActivityDateBucket,
} from '@/lib/recentChangesGrouping';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { UserAvatar } from '@/components/ui/UserAvatar';

const PAGE_SIZE = 20;

function actionLabel(actionType: string): string {
  const t = actionType.toUpperCase();
  if (t === 'CREATE') return 'created';
  if (t === 'UPDATE') return 'updated';
  if (t === 'DELETE') return 'deleted';
  return actionType.toLowerCase();
}

function resolveEntityHref(
  handle: string,
  row: CampaignActivityRow,
  flatPages: Parameters<typeof campaignCategoryChildPath>[3],
): string | null {
  const type = row.entityType.toUpperCase();
  if (type === 'CHARACTER') {
    return campaignCategoryChildPath(handle, row.entityId, 'Characters', flatPages);
  }
  if (type === 'WIKI_PAGE') {
    if (row.parentContext === 'Characters') {
      return campaignCategoryChildPath(handle, row.entityId, 'Characters', flatPages);
    }
    const page = flatPages?.find((entry) => entry.id === row.entityId);
    if (page?.pathKey) {
      return campaignFreeformPagePath(handle, page.pathKey);
    }
    return campaignCategoryChildPath(handle, row.entityId, undefined, flatPages);
  }
  if (type === 'TIME_TRACKING') {
    return campaignChronologyPath(handle, 'calendar');
  }
  return null;
}

function ActivityRow({
  campaignHandle,
  row,
}: {
  campaignHandle: string;
  row: CampaignActivityRow;
}) {
  const { flatPages } = useWiki();
  const href = resolveEntityHref(campaignHandle, row, flatPages);
  const sizeLabel = formatByteSize(row.pageSizeBytes);
  const deltaLabel = formatDeltaBytes(row.deltaBytes);

  return (
    <li className="rounded-lg border border-border/80 bg-background/40 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-foreground">
        <UserAvatar
          name={row.user.label}
          avatarUrl={row.user.avatarUrl}
          userId={row.user.id}
          size="sm"
        />
        <span className="font-semibold text-foreground">{row.user.label}</span>
        <span className="text-muted">{actionLabel(row.actionType)}</span>
        {href ? (
          <Link to={href} className="font-medium text-primary hover:text-primary">
            {row.entityName}
          </Link>
        ) : (
          <span className="font-medium text-foreground">{row.entityName}</span>
        )}
        {row.parentContext ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted">
            <span className="text-muted">In:</span>
            <FolderOpen className="size-3 text-primary0/70" aria-hidden />
            <span>{row.parentContext}</span>
          </span>
        ) : null}
        {sizeLabel ? (
          <span className="rounded border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted">
            {sizeLabel}
          </span>
        ) : null}
        {deltaLabel !== null ? (
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${deltaBadgeClasses(row.deltaBytes)}`}
          >
            {deltaLabel}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ActivityBucketSection({
  bucket,
  campaignHandle,
  expanded,
  onToggle,
}: {
  bucket: ActivityDateBucket;
  campaignHandle: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface/30">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-elevated/40"
        aria-expanded={expanded}
      >
        <h2 className="text-sm font-semibold tracking-wide text-foreground">{bucket.label}</h2>
        <span className="flex items-center gap-2 text-xs text-muted">
          {bucket.items.length} change{bucket.items.length === 1 ? '' : 's'}
          <ChevronDown
            className={`size-4 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>
      {expanded ? (
        <ul className="space-y-2 border-t border-border px-3 py-3">
          {bucket.items.map((row) => (
            <ActivityRow key={row.id} campaignHandle={campaignHandle} row={row} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function RecentChangesPage() {
  const params = useParams<{ campaignHandle: string }>();
  const campaignHandle = readCampaignHandle(params);
  const [rows, setRows] = useState<CampaignActivityRow[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<CampaignActivityPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPage(1);
  }, [campaignHandle]);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await listCampaignActivity(campaignHandle, {
          page: targetPage,
          limit: PAGE_SIZE,
        });
        setRows(data.activity);
        setPagination(data.pagination);
        setPage(data.pagination.currentPage);
        const buckets = groupActivityByDate(data.activity);
        setExpandedKeys(
          new Set(buckets.filter((b) => b.defaultExpanded).map((b) => b.key)),
        );
      } catch (err) {
        setRows([]);
        setPagination(null);
        setExpandedKeys(new Set());
        setError(err instanceof Error ? err.message : 'Failed to load recent changes.');
      } finally {
        setLoading(false);
      }
    },
    [campaignHandle],
  );

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const buckets = useMemo(() => groupActivityByDate(rows ?? []), [rows]);

  function toggleBucket(key: string) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const canGoPrev = pagination ? pagination.currentPage > 1 : false;
  const canGoNext = pagination ? pagination.currentPage < pagination.totalPages : false;
  const showPagination = pagination ? pagination.totalPages > 1 : false;

  if (loading && rows.length === 0) {
    return <LoadingSpinner label="Loading recent changes…" />;
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title={
          <>
            <History className="size-5 text-primary" strokeWidth={1.5} />
            Recent Changes
          </>
        }
        actions={
          <CategoryIndexToolbar
            createLabel="Refresh"
            onCreate={() => void load(page)}
            resultCountLabel={
              pagination
                ? formatWorkspaceCountLabel(pagination.totalCount, 'change', 'changes')
                : rows.length > 0
                  ? formatWorkspaceCountLabel(rows.length, 'change', 'changes')
                  : null
            }
            trailing={
              <button
                type="button"
                onClick={() => void load(page)}
                disabled={loading}
                className="text-xs text-muted hover:text-primary disabled:opacity-50"
              >
                Refresh
              </button>
            }
            createAction={null}
          />
        }
      />

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {buckets.length === 0 ? (
        <EmptyState
          icon={History}
          title="No changes yet"
          description="When pages are edited or time is advanced, immutable activity items will appear here."
        />
      ) : (
        <div className="space-y-3">
          {buckets.map((bucket) => (
            <ActivityBucketSection
              key={bucket.key}
              bucket={bucket}
              campaignHandle={campaignHandle}
              expanded={expandedKeys.has(bucket.key)}
              onToggle={() => toggleBucket(bucket.key)}
            />
          ))}
        </div>
      )}

      {showPagination && pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <p className="text-xs text-muted">
            Page {pagination.currentPage} of {pagination.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!canGoPrev || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="size-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={!canGoNext || loading}
              onClick={() => setPage((p) => p + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-elevated disabled:opacity-50 transition-colors"
            >
              Next
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
