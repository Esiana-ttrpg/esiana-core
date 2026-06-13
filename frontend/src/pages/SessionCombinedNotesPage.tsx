import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, EyeOff, LayoutGrid, FileText, User } from 'lucide-react';
import {
  campaignDashboardPath,
  campaignNotePath,
  campaignNotesPath,
  campaignWikiPath,
} from '@/lib/campaignPaths';
import { useSessionCombined } from '@/hooks/useSessionCombined';
import { useWiki } from '@/contexts/WikiContext';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { SessionSnapshotExporter } from '@/components/session/SessionSnapshotExporter';
import { MemberIdentityLabel } from '@/components/campaign/MemberIdentityLabel';
import { SessionNotesSidebar } from '@/components/session/SessionNotesSidebar';
import { SESSION_COMBINED_VIEW_ID } from '@/utils/sessionNoteConstants';
import { CampaignMemberRoles } from '@/types/domain';
import type { SessionNotePerspectiveEntry } from '@/types/wiki';

type ViewMode = 'grid' | 'snapshot';

export function SessionCombinedNotesPage() {
  const { campaignHandle = '', timelinePointId = '' } = useParams<{
    campaignHandle: string;
    timelinePointId: string;
  }>();
  const { campaign, flatPages } = useWiki();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const { data, loading, error, refetch } = useSessionCombined(campaignHandle, {
    timelinePointId,
  });

  const campaignName = campaign?.name ?? 'Campaign';
  const canManage =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;

  const roster: SessionNotePerspectiveEntry[] =
    data?.columns.map((col) => ({
      id: col.userId,
      label: col.label,
      displayName: col.displayName,
      playerContext: col.playerContext,
      identityPageId: col.identityPageId,
      role: col.role,
      isDmRole: col.isDmRole,
      masked: col.masked,
      hasNotes: col.hasNotes,
      pageId: col.pageId,
      markdown: col.markdown,
    })) ?? [];

  if (loading) {
    return <LoadingSpinner label="Loading all session notes…" />;
  }

  if (error || !data) {
    return <p className="text-red-300">{error ?? 'Combined view unavailable.'}</p>;
  }

  return (
    <article className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted"
      >
        <Link to={campaignDashboardPath(campaignHandle)} className="hover:text-foreground">
          {campaignName}
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link to={campaignNotesPath(campaignHandle)} className="hover:text-foreground">
          Session Notes
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <Link
          to={campaignNotePath(campaignHandle, timelinePointId)}
          className="hover:text-foreground"
        >
          {data.session.title}
        </Link>
        <ChevronRight className="size-3" aria-hidden />
        <span className="text-foreground">All View</span>
      </nav>

      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
            <LayoutGrid className="size-7 text-primary" aria-hidden />
            All Notes View
          </h1>
          <p className="mt-2 text-sm text-muted">
            {data.session.fantasyDateLabel ?? 'Date unknown'} ·{' '}
            {new Date(data.session.sessionCreatedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`rounded-md px-3 py-1.5 text-sm ${
              viewMode === 'grid'
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Grid
          </button>
          <button
            type="button"
            onClick={() => setViewMode('snapshot')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${
              viewMode === 'snapshot'
                ? 'bg-primary/15 text-primary'
                : 'text-muted hover:text-foreground'
            }`}
          >
            <FileText className="size-3.5" aria-hidden />
            Snapshot
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {viewMode === 'snapshot' ? (
            <SessionSnapshotExporter payload={data} campaignName={campaignName} />
          ) : (
            <>
              {data.entitiesMentioned.length > 0 && (
                <section className="rounded-xl border border-border bg-surface/40 p-4">
                  <h2 className="mb-3 text-sm font-semibold text-foreground">
                    Entities mentioned tonight
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {data.entitiesMentioned.map((entity) => (
                      <Link
                        key={entity.pageId}
                        to={campaignWikiPath(campaignHandle, entity.pageId, flatPages)}
                        className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                      >
                        {entity.title}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {data.columns.map((column) => (
                  <section
                    key={column.userId}
                    className={`flex min-h-48 flex-col rounded-xl border bg-background/60 ${
                      column.masked
                        ? 'border-dashed border-border opacity-80'
                        : 'border-border'
                    }`}
                  >
                    <header className="flex items-start justify-between gap-2 border-b border-border px-4 py-3">
                      <div className="min-w-0">
                        <h3 className="flex items-center gap-1.5 font-semibold text-foreground">
                          <User className="size-4 shrink-0 text-muted" aria-hidden />
                          <MemberIdentityLabel
                            source={column}
                            primaryClassName="truncate font-semibold text-foreground"
                          />
                        </h3>
                        <p className="text-[11px] text-muted">{column.role}</p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1">
                        {column.isDmRole && (
                          <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-[10px] font-medium uppercase text-amber-200">
                            DM
                          </span>
                        )}
                        {column.masked && (
                          <EyeOff
                            className="size-4 text-muted"
                            aria-label="Hidden from party"
                          />
                        )}
                      </span>
                    </header>
                    <div className="flex-1 overflow-y-auto p-4">
                      {column.masked ? (
                        <p className="text-sm italic text-muted">
                          {canManage
                            ? 'DM-only notes (hidden from players).'
                            : 'These notes are visible to the DM only.'}
                        </p>
                      ) : column.hasNotes ? (
                        <div className="prose prose-invert max-w-none text-sm">
                          <WikiMarkdown content={column.markdown} />
                        </div>
                      ) : (
                        <p className="text-sm text-muted">
                          No notes logged for this session.
                        </p>
                      )}
                    </div>
                  </section>
                ))}
              </div>
            </>
          )}
        </div>

        <SessionNotesSidebar
          campaignHandle={campaignHandle}
          timelinePointId={timelinePointId}
          combined={data}
          roster={roster}
          rosterLoading={false}
          activeUserId={SESSION_COMBINED_VIEW_ID}
          onSelectCombined={() => {}}
          onSelectMember={() => {}}
          showAllViewLink={false}
          onAggregateRefresh={() => void refetch()}
        />
      </div>

      <Link
        to={campaignNotePath(campaignHandle, timelinePointId)}
        className="inline-block text-sm text-primary hover:underline"
      >
        Back to session editor
      </Link>
    </article>
  );
}
