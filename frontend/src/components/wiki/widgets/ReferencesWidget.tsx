import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Link2, RefreshCw, Users } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useOptionalWiki } from '@/contexts/WikiContext';
import { campaignWikiPath } from '@/lib/campaignPaths';
import {
  buildEntityRelationshipProjection,
  type WikiPageLineageSnapshot,
} from '@/lib/entityProjectionQueries';
import { isProjectionDebugEnabled } from '@/lib/entityProjectionDebug';
import { resolveCanonicalEntityCategory } from '@shared/resolveCanonicalEntityCategory';
import { chronologyDateKey, useCampaignChronologyNow } from '@/hooks/useCampaignChronologyNow';
import { CampaignMemberRoles } from '@/types/domain';
import { EntityRelationChip } from '@/components/entity/EntityRelationChip';
import { ProjectionDebugPanel } from '@/components/entity/ProjectionDebugPanel';
import type {
  AggregatedReferencesPayload,
  WikiBacklink,
  WikiBrokenLink,
  WikiOutlink,
} from '@/types/wiki';
import { fetchWikiBacklinks, fetchWikiOutlinks } from '@/lib/wiki';
import {
  OPERATOR_COMPACT_LIST_CLASS,
  READING_SURFACE_LIST_CLASS,
} from '@/lib/readingSurfaceLayout';
import { WikiReferencePreviewRow } from '@/components/wiki/WikiReferencePreviewRow';

interface ReferencesWidgetProps {
  content: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  isEditingLayout: boolean;
  /** Single-page mode (wiki routes). */
  pageId?: string;
  campaignHandle?: string;
  /** Pre-merged session references from combined API (no extra fetch). */
  aggregateReferences?: AggregatedReferencesPayload | null;
  /** Called when user requests refresh in aggregate mode. */
  onAggregateRefresh?: () => void;
}

function LinkListSkeleton() {
  return (
    <ul className="space-y-1.5" aria-busy="true">
      {[0, 1, 2].map((key) => (
        <li
          key={key}
          className="h-7 animate-pulse rounded-full bg-surface/80"
        />
      ))}
    </ul>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Link2;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed border-border/80 bg-surface/40 px-3 py-4 text-center">
      <Icon className="mx-auto mb-2 size-5 text-muted" aria-hidden />
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1 text-[11px] text-muted">{description}</p>
    </div>
  );
}

function BrokenReferenceRow({
  targetPageId,
  label,
}: {
  targetPageId: string;
  label?: string;
}) {
  const display =
    label?.trim() ||
    (targetPageId ? `Missing page (${targetPageId.slice(0, 8)}…)` : 'Broken link');
  return (
    <div className="rounded-md border border-dashed border-border/80 bg-surface/30 px-2.5 py-2 opacity-70">
      <span className="inline-flex max-w-full items-center gap-1 text-[11px] italic text-muted">
        <ArrowUpRight className="size-3 shrink-0" aria-hidden />
        <span className="truncate">{display}</span>
      </span>
      <span className="mt-0.5 block text-[10px] text-muted">Unresolved mention</span>
    </div>
  );
}

export function ReferencesWidget({
  content,
  onChange,
  isEditingLayout,
  pageId: pageIdProp,
  campaignHandle: campaignHandleProp,
  aggregateReferences = null,
  onAggregateRefresh,
}: ReferencesWidgetProps) {
  const params = useParams<{
    campaignHandle?: string;
    pageId?: string;
    characterId?: string;
  }>();
  const pageId = pageIdProp ?? params.pageId ?? params.characterId ?? '';
  const wiki = useOptionalWiki();
  const campaignHandle = campaignHandleProp ?? wiki?.campaignHandle ?? '';
  const isAggregateMode = aggregateReferences != null;
  const [searchParams] = useSearchParams();

  const isDMUser =
    wiki?.campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    wiki?.campaign?.role === CampaignMemberRoles.WRITER;

  const currentPage = useMemo(
    () => wiki?.flatPages.find((p) => p.id === pageId) ?? null,
    [wiki?.flatPages, pageId],
  );

  const campaignNow = useCampaignChronologyNow(campaignHandle);
  const debugEnabled = isProjectionDebugEnabled(searchParams, isDMUser);

  const snapshots: WikiPageLineageSnapshot[] = useMemo(
    () =>
      (wiki?.flatPages ?? []).map((page) => ({
        id: page.id,
        title: page.title,
        templateType: page.templateType,
        metadata: page.metadata,
        parentId: page.parentId,
      })),
    [wiki?.flatPages],
  );

  const flatPagesKey = useMemo(
    () => snapshots.map((p) => `${p.id}:${p.title}`).join('|'),
    [snapshots],
  );

  const relationshipProjection = useMemo(() => {
    if (isAggregateMode || !currentPage || !pageId) return null;
    return buildEntityRelationshipProjection(
      pageId,
      currentPage.templateType,
      snapshots,
      campaignNow,
      isDMUser,
    );
  }, [
    isAggregateMode,
    currentPage,
    pageId,
    flatPagesKey,
    snapshots,
    campaignNow,
    isDMUser,
  ]);

  const pageEntityCategory = useMemo(
    () =>
      currentPage
        ? resolveCanonicalEntityCategory(currentPage, wiki?.flatPages ?? [])
        : null,
    [currentPage, wiki?.flatPages],
  );

  const relationshipsEmptyDescription = useMemo(() => {
    if (pageEntityCategory === 'characters') {
      return 'No known allegiances at campaign time.';
    }
    if (pageEntityCategory === 'families') {
      return 'No head of house or bloodline root linked yet.';
    }
    if (pageEntityCategory === 'organizations') {
      return 'No active diplomatic tensions recorded at campaign time.';
    }
    return 'No relationships recorded for this page.';
  }, [pageEntityCategory]);

  const previewContext = useMemo(
    () => ({
      campaignNow,
      isDMUser,
      viewerOrgId:
        pageEntityCategory === 'organizations' ? pageId : undefined,
      viewerPageId: pageId,
      viewerCharacterId:
        pageEntityCategory === 'characters' ? pageId : undefined,
    }),
    [campaignNow, isDMUser, pageId, pageEntityCategory],
  );

  const relationshipRows = useMemo(() => {
    if (!relationshipProjection) return [];
    const { affiliations, bloodlineRoots, diplomaticTensions } = relationshipProjection;
    const rows: Array<{
      key: string;
      pageId: string;
      title: string;
      templateType: string;
      stance?: typeof diplomaticTensions[0]['stance'];
      subtitle?: string;
    }> = [];
    for (const aff of affiliations) {
      rows.push({
        key: `aff-${aff.org.id}`,
        pageId: aff.org.id,
        title: aff.org.title,
        templateType: aff.org.templateType,
        subtitle: aff.role ?? undefined,
      });
    }
    for (const root of bloodlineRoots) {
      rows.push({
        key: `root-${root.character.id}`,
        pageId: root.character.id,
        title: root.character.title,
        templateType: root.character.templateType,
        subtitle: root.relationshipType,
      });
    }
    for (const tension of diplomaticTensions) {
      rows.push({
        key: `tension-${tension.org.id}-${tension.direction}`,
        pageId: tension.org.id,
        title: tension.org.title,
        templateType: tension.org.templateType,
        stance: tension.stance,
        subtitle: tension.direction,
      });
    }
    return rows;
  }, [relationshipProjection]);

  const [backlinks, setBacklinks] = useState<WikiBacklink[] | null>(null);
  const [backlinksError, setBacklinksError] = useState<string | null>(null);

  const [outlinks, setOutlinks] = useState<WikiOutlink[] | null>(null);
  const [brokenOutlinks, setBrokenOutlinks] = useState<WikiBrokenLink[]>([]);
  const [outlinksError, setOutlinksError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const loadReferences = useCallback(async () => {
    if (isAggregateMode) return;
    if (!campaignHandle || !pageId) return;
    setLoading(true);
    setBacklinksError(null);
    setOutlinksError(null);
    setBacklinks(null);
    setOutlinks(null);

    try {
      const [backlinkData, outlinkPayload] = await Promise.all([
        fetchWikiBacklinks(campaignHandle, pageId),
        fetchWikiOutlinks(campaignHandle, pageId),
      ]);
      setBacklinks(backlinkData);
      setOutlinks(outlinkPayload.outlinks);
      setBrokenOutlinks(outlinkPayload.brokenOutlinks);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load references.';
      setBacklinksError(message);
      setOutlinksError(message);
    } finally {
      setLoading(false);
    }
  }, [campaignHandle, pageId, isAggregateMode]);

  useEffect(() => {
    if (isAggregateMode) return;
    void loadReferences();
  }, [loadReferences, reloadToken, isAggregateMode]);

  useEffect(() => {
    if (!content || typeof content !== 'object') {
      onChange({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayBacklinks = isAggregateMode
    ? (aggregateReferences?.backlinks ?? [])
    : (backlinks ?? []);
  const displayOutlinks = isAggregateMode
    ? (aggregateReferences?.outlinks ?? [])
    : (outlinks ?? []);
  const displayBroken = isAggregateMode
    ? (aggregateReferences?.brokenOutlinks ?? [])
    : brokenOutlinks;

  if (!isAggregateMode && (!campaignHandle || !pageId)) {
    return (
      <div className="text-xs text-muted">
        Select a note with wiki links to see references.
      </div>
    );
  }

  if (isAggregateMode && !campaignHandle) {
    return (
      <div className="text-xs text-muted">References load with session data.</div>
    );
  }

  const backlinksCount = displayBacklinks.length;
  const mentionsCount = displayOutlinks.length + displayBroken.length;
  const showLoading = !isAggregateMode && loading && backlinks === null;
  const listClass = isEditingLayout
    ? OPERATOR_COMPACT_LIST_CLASS
    : READING_SURFACE_LIST_CLASS;

  function handleRefresh() {
    if (isAggregateMode) {
      onAggregateRefresh?.();
      return;
    }
    setReloadToken((t) => t + 1);
  }

  return (
    <div className="flex min-w-0 flex-col gap-2 text-xs">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
        <div className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Link2 className="size-3.5 shrink-0 text-primary" aria-hidden />
          <span>{isAggregateMode ? 'Session references' : 'References'}</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={showLoading}
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-muted hover:bg-surface hover:text-foreground disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`size-3 ${showLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {isAggregateMode && (
        <p className="text-[11px] text-muted">
          Merged from all visible session notes in this game night.
        </p>
      )}

      {isEditingLayout && !isAggregateMode && (
        <p className="text-[11px] text-muted">
          Incoming and outgoing links refresh when you save the page.
        </p>
      )}

      {!isAggregateMode && currentPage && relationshipProjection ? (
        <section className="flex flex-col gap-2 border-b border-border/60 pb-3" aria-label="Relationships">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5 text-primary" aria-hidden />
              Relationships
            </span>
            <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-normal">
              {relationshipRows.length}
            </span>
          </h3>
          {relationshipRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No relationships at campaign time"
              description={relationshipsEmptyDescription}
            />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {relationshipRows.map((row) => (
                <li key={row.key}>
                  <EntityRelationChip
                    campaignHandle={campaignHandle}
                    pageId={row.pageId}
                    title={row.title}
                    templateType={row.templateType}
                    stance={row.stance ?? null}
                    subtitle={row.subtitle}
                    flatPages={snapshots}
                    previewContext={previewContext}
                    compact
                  />
                </li>
              ))}
            </ul>
          )}
          {debugEnabled && relationshipProjection ? (
            <ProjectionDebugPanel
              projection={relationshipProjection}
              queryInputs={{
                pageId,
                templateType: currentPage.templateType,
                campaignNow,
                isDMUser,
                dateKey: chronologyDateKey(campaignNow),
              }}
            />
          ) : null}
        </section>
      ) : null}

      <div className="grid min-w-0 gap-3 md:grid-cols-1">
        <section className="flex min-w-0 flex-col gap-2" aria-label="Appears in">
          <h3 className="text-sm font-semibold text-foreground">
            Appears in
            <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-normal">
              {showLoading ? '…' : backlinksCount}
            </span>
          </h3>

          {showLoading && <LinkListSkeleton />}
          {backlinksError && (
            <p className="text-rose-400">{backlinksError}</p>
          )}
          {!showLoading && !backlinksError && backlinksCount === 0 && (
            <EmptyState
              icon={Link2}
              title="No incoming links yet"
              description={
                isAggregateMode
                  ? 'No other pages link to notes in this session yet.'
                  : 'Other pages that link here appear after they are saved.'
              }
            />
          )}
          {!backlinksError && backlinksCount > 0 && (
            <ul className={listClass}>
              {displayBacklinks.map((link) => (
                <li key={link.id}>
                  <WikiReferencePreviewRow
                    campaignHandle={campaignHandle}
                    sourcePageId={link.id}
                    targetPageId={pageId}
                    title={link.title}
                    href={
                      link.href ??
                      campaignWikiPath(campaignHandle, link.id, wiki?.flatPages ?? [])
                    }
                    breadcrumbLabel={link.breadcrumbLabel}
                    icon={Link2}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex min-w-0 flex-col gap-2" aria-label="Mentions">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Mentions
            <span className="ml-1.5 rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-normal">
              {showLoading ? '…' : mentionsCount}
            </span>
          </h3>

          {showLoading && <LinkListSkeleton />}
          {outlinksError && (
            <p className="text-rose-400">{outlinksError}</p>
          )}
          {!showLoading && !outlinksError && mentionsCount === 0 && (
            <EmptyState
              icon={ArrowUpRight}
              title="No outgoing mentions yet"
              description={
                isAggregateMode
                  ? 'Wiki links in session notes appear here after save.'
                  : 'Add internal wiki links in text blocks on this page, then save the page.'
              }
            />
          )}
          {!outlinksError && mentionsCount > 0 && (
            <ul className={listClass}>
              {displayOutlinks.map((link) => (
                <li key={link.id}>
                  <WikiReferencePreviewRow
                    campaignHandle={campaignHandle}
                    sourcePageId={pageId}
                    targetPageId={link.id}
                    title={link.title}
                    href={
                      link.href ??
                      campaignWikiPath(campaignHandle, link.id, wiki?.flatPages ?? [])
                    }
                    breadcrumbLabel={link.breadcrumbLabel}
                    icon={ArrowUpRight}
                  />
                </li>
              ))}
              {displayBroken.map((broken, index) => (
                <li key={`${broken.targetPageId || 'stub'}-${index}`}>
                  <BrokenReferenceRow
                    targetPageId={broken.targetPageId}
                    label={broken.label}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
