import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  MapPin,
  Save,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useWiki } from '@/contexts/WikiContext';
import { resolveIdentityDisplay } from '@/hooks/useIdentityDisplay';
import { saveWikiPageMetadata, updateSessionNotePage } from '@/lib/wiki';
import { WikiTipTapEditor } from '@/components/wiki/WikiTipTapEditor';
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown';
import { SessionCombinedInlineView } from '@/components/session/SessionCombinedInlineView';
import { SessionNotesSidebar } from '@/components/session/SessionNotesSidebar';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WikiWorkspaceShell } from '@/components/layout/WikiWorkspaceShell';
import { resolveReadableMeasureCh } from '@/lib/codexWorkspaceUx';
import { workspaceModeCssVars } from '@/lib/workspaceOrchestration';
import { TYPE_DISPLAY_CLASS } from '@/lib/surfaceLayout';
import type {
  CombinedSessionNotesPayload,
  SessionNotePerspectiveEntry,
  WikiPageLayoutPayload,
} from '@/types/wiki';
import {
  campaignDashboardPath,
  campaignNotesPath,
  campaignWikiPath,
} from '@/lib/campaignPaths';
import {
  formatCreatedDate,
  formatRelativeUpdated,
} from '@/utils/formatDate';
import {
  getSessionNoteMarkdown,
  parseSessionNoteMetadata,
} from '@/utils/sessionNote';
import { SESSION_COMBINED_VIEW_ID } from '@/utils/sessionNoteConstants';
import { useElevatedNarrativeView } from '@/hooks/useWikiCampaignPolicy';

interface SessionNoteEditorProps {
  campaignHandle: string;
  pageId: string;
  pageData: WikiPageLayoutPayload;
  timelinePointId?: string | null;
  combined?: CombinedSessionNotesPayload | null;
  combinedLoading?: boolean;
  onCombinedRefresh?: () => void;
  isDMUser?: boolean;
  onPageUpdated: (patch: Partial<WikiPageLayoutPayload>) => void;
}

export function SessionNoteEditor({
  campaignHandle,
  pageId,
  pageData,
  timelinePointId = null,
  combined = null,
  combinedLoading = false,
  onCombinedRefresh,
  isDMUser: isDMUserProp,
  onPageUpdated,
}: SessionNoteEditorProps) {
  const isDMUser = useElevatedNarrativeView(isDMUserProp);
  const { user } = useAuth();
  const currentUserId = user?.id ?? null;
  const { campaign, tree, flatPages, pageIdByTitle, refresh } = useWiki();

  const [title, setTitle] = useState(pageData.title);
  const [content, setContent] = useState(() =>
    getSessionNoteMarkdown(pageData.blocks ?? []),
  );
  const [activeMemberId, setActiveMemberId] = useState<string | null>(
    SESSION_COMBINED_VIEW_ID,
  );
  const [viewMarkdown, setViewMarkdown] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);

  const roster: SessionNotePerspectiveEntry[] = useMemo(() => {
    if (!combined) return [];
    return combined.columns.map((col) => ({
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
    }));
  }, [combined]);

  const sessionMeta = useMemo(
    () => parseSessionNoteMetadata(pageData.metadata),
    [pageData.metadata],
  );

  const isCombinedView = activeMemberId === SESSION_COMBINED_VIEW_ID;

  const isViewingOther =
    !isCombinedView &&
    activeMemberId !== null &&
    currentUserId !== null &&
    activeMemberId !== currentUserId;

  const isViewingOwn =
    !isCombinedView &&
    activeMemberId !== null &&
    currentUserId !== null &&
    activeMemberId === currentUserId;

  const canEditCurrent = isViewingOwn && viewMarkdown === null;

  const locationPageId =
    combined?.session.locationPageId ?? sessionMeta.locationPageId ?? null;

  const locationPage = useMemo(() => {
    if (!locationPageId) return null;
    return flatPages.find((page) => page.id === locationPageId) ?? null;
  }, [flatPages, locationPageId]);

  const locationOptions = useMemo(() => {
    const locationsRootId = pageIdByTitle.get('Locations');
    if (!locationsRootId) return [];
    return flatPages
      .filter((page) => page.parentId === locationsRootId)
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [flatPages, pageIdByTitle]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    setIsEditing(false);
    setTitle(pageData.title);
    setContent(getSessionNoteMarkdown(pageData.blocks ?? []));
    setIsDirty(false);
    setActiveMemberId(SESSION_COMBINED_VIEW_ID);
    setViewMarkdown(null);
  }, [pageData.id]);

  useEffect(() => {
    if (isEditing || isViewingOther || isCombinedView) return;
    setTitle(pageData.title);
    setContent(getSessionNoteMarkdown(pageData.blocks ?? []));
    setIsDirty(false);
  }, [pageData.title, pageData.blocks, isEditing, isViewingOther, isCombinedView]);

  function handleSelectCombined() {
    setActiveMemberId(SESSION_COMBINED_VIEW_ID);
    setViewMarkdown(null);
    setIsEditing(false);
  }

  function handleSelectMember(member: SessionNotePerspectiveEntry) {
    setActiveMemberId(member.id);
    if (member.id === currentUserId) {
      setViewMarkdown(null);
      return;
    }
    if (member.masked) {
      setViewMarkdown('');
      setIsEditing(false);
      return;
    }
    setViewMarkdown(member.markdown);
    setIsEditing(false);
  }

  async function handleSave() {
    if (!canEditCurrent) return;
    setIsSaving(true);
    try {
      const updated = await updateSessionNotePage(campaignHandle, pageId, {
        title: title.trim(),
        content,
      });
      onPageUpdated({
        title: updated.title,
        updatedAt: updated.updatedAt,
      });
      setIsDirty(false);
      setIsEditing(false);
      onCombinedRefresh?.();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Unable to save session note');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLocationSelect(nextLocationPageId: string) {
    if (!isDMUser) return;
    setLocationMenuOpen(false);
    try {
      const nextMetadata = {
        ...(pageData.metadata && typeof pageData.metadata === 'object'
          ? pageData.metadata
          : {}),
        ...sessionMeta,
        locationPageId: nextLocationPageId,
      };
      const result = await saveWikiPageMetadata(campaignHandle, pageId, nextMetadata);
      onPageUpdated({ metadata: result.metadata });
      onCombinedRefresh?.();
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : 'Unable to update session location',
      );
    }
  }

  const campaignName = campaign?.name ?? 'Campaign';
  const notesIndexHref = campaignNotesPath(campaignHandle);
  const campaignHref = campaignDashboardPath(campaignHandle);

  const displayMarkdown = viewMarkdown !== null ? viewMarkdown : content;
  const activeMember = roster.find((m) => m.id === activeMemberId);
  const sessionTitle = combined?.session.title ?? title;

  const headerTitle = isCombinedView
    ? `All Players — ${sessionTitle}`
    : isViewingOther && activeMember
      ? `${resolveIdentityDisplay(activeMember).primaryLabel}'s notes`
      : title.trim() || sessionTitle || 'Untitled session note';

  const showSessionMetaBar = isCombinedView || isViewingOwn;

  return (
    <WikiWorkspaceShell
      composition="codex"
      articleClassName="wiki-page-article"
      articleProps={{ 'data-workspace-mode': 'focused' }}
      style={workspaceModeCssVars(
        'focused',
        resolveReadableMeasureCh('reading', 'wide', 'hybrid'),
      )}
      header={
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-muted"
        >
          <Link to={campaignHref} className="hover:text-foreground">
            {campaignName}
          </Link>
          <ChevronRight className="size-3" aria-hidden />
          <Link to={notesIndexHref} className="hover:text-foreground">
            Session Notes
          </Link>
          <ChevronRight className="size-3" aria-hidden />
          <span className="text-foreground">{sessionTitle}</span>
        </nav>
      }
    >
      <div className="space-y-4 border-b border-focal-muted/15 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {isEditing && canEditCurrent ? (
            <input
              type="text"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setIsDirty(true);
              }}
              className={`${TYPE_DISPLAY_CLASS} min-w-0 flex-1 border-0 bg-transparent text-2xl text-focal-foreground outline-none placeholder:text-muted sm:text-3xl`}
              placeholder="Session note title"
              aria-label="Session note title"
            />
          ) : (
            <h1
              className={`${TYPE_DISPLAY_CLASS} min-w-0 flex-1 text-2xl text-focal-foreground sm:text-3xl`}
            >
              {headerTitle}
            </h1>
          )}
          {canEditCurrent &&
            (isEditing ? (
              <button
                type="button"
                onClick={() => {
                  if (isDirty) {
                    if (!window.confirm('Discard unsaved changes and return to view mode?'))
                      return;
                    setTitle(pageData.title);
                    setContent(getSessionNoteMarkdown(pageData.blocks ?? []));
                    setIsDirty(false);
                  }
                  setIsEditing(false);
                }}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-elevated px-3 py-2 text-sm font-medium text-foreground hover:bg-elevated"
              >
                <Eye className="size-4" />
                View Mode
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                <Edit3 className="size-4" />
                Edit Note
              </button>
            ))}
        </div>

        {showSessionMetaBar && (
          <div className="flex flex-wrap items-center gap-6 rounded-lg border border-border/60 bg-surface/40 p-3 text-xs text-muted">
            {!isCombinedView && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" aria-hidden />
                  Created: {formatCreatedDate(pageData.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden />
                  Updated: {formatRelativeUpdated(pageData.updatedAt)}
                </span>
              </>
            )}
            {combined?.session.fantasyDateLabel && (
              <span className="inline-flex items-center gap-1.5">
                In-world: {combined.session.fantasyDateLabel}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5" aria-hidden />
              Location:{' '}
              {locationPage ? (
                <Link
                  to={campaignWikiPath(campaignHandle, locationPage.id, flatPages)}
                  className="font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
                >
                  {locationPage.title}
                </Link>
              ) : isDMUser ? (
                <span className="relative">
                  <button
                    type="button"
                    onClick={() => setLocationMenuOpen((open) => !open)}
                    className="text-muted hover:text-indigo-300"
                  >
                    + Add Location
                  </button>
                  {locationMenuOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 min-w-48 rounded-lg border border-border bg-background p-1 shadow-xl">
                      {locationOptions.length === 0 ? (
                        <p className="px-2 py-1.5 text-[11px] text-muted">
                          No location pages found.
                        </p>
                      ) : (
                        locationOptions.map((option) => (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => void handleLocationSelect(option.id)}
                            className="block w-full rounded px-2 py-1.5 text-left text-[11px] text-foreground hover:bg-surface"
                          >
                            {option.title}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </span>
              ) : (
                <span className="text-muted">Unassigned</span>
              )}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4">
          {isCombinedView ? (
            combinedLoading && !combined ? (
              <LoadingSpinner label="Loading combined session notes…" />
            ) : combined ? (
              <SessionCombinedInlineView
                campaignHandle={campaignHandle}
                payload={combined}
                canManage={isDMUser}
              />
            ) : (
              <p className="text-sm text-muted">Combined view unavailable.</p>
            )
          ) : isEditing && canEditCurrent ? (
            <>
              <WikiTipTapEditor
                content={content}
                onChange={(next) => {
                  setContent(next);
                  setIsDirty(true);
                }}
                wikiTree={tree}
                minHeight="min-h-[420px]"
              />
              <div className="flex items-center justify-end gap-2">
                {isDirty && (
                  <span className="text-xs text-primary/80">Unsaved changes</span>
                )}
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={isSaving || !isDirty}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
                >
                  <Save className="size-3.5" />
                  {isSaving ? 'Saving…' : 'Save Draft'}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-border bg-background/60 p-4">
              {activeMember?.masked && isViewingOther ? (
                <p className="text-sm italic text-muted">
                  These notes are hidden from the party.
                </p>
              ) : (
                <div className="prose prose-invert w-full max-w-[var(--codex-readable-ch-hybrid)] select-text">
                  <WikiMarkdown content={displayMarkdown} />
                </div>
              )}
            </div>
          )}
        </section>

        <SessionNotesSidebar
          campaignHandle={campaignHandle}
          timelinePointId={timelinePointId}
          combined={combined}
          roster={roster}
          rosterLoading={combinedLoading}
          activeUserId={activeMemberId}
          onSelectCombined={handleSelectCombined}
          onSelectMember={handleSelectMember}
          onAggregateRefresh={onCombinedRefresh}
        />
      </div>
    </WikiWorkspaceShell>
  );
}
