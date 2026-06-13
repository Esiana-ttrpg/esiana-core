import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  FileUp,
  FolderInput,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useWiki } from '@/contexts/WikiContext';
import { WikiPageDeleteDialog } from '@/components/wiki/WikiPageDeleteDialog';
import {
  bulkMoveNotebookPages,
  bulkDeleteSessionNotes,
  createNotebookArc,
  deleteNotebookArc,
  deleteSessionNotePage,
  fetchSessionNotesIndex,
  fetchWikiDeletePreview,
  uploadSessionNotePage,
  updateSessionNotePage,
  updateNotebookArc,
} from '@/lib/wiki';
import { campaignWikiPath, campaignNotePath } from '@/lib/campaignPaths';
import { hasTimelineSessions } from '@/lib/sessionNotesIndex';
import { CreateSessionNoteDialog } from '@/components/session/CreateSessionNoteDialog';
import { CreateNewSessionDialog } from '@/components/session/CreateNewSessionDialog';
import { CampaignMemberRoles } from '@/types/domain';
import type {
  SessionNotesIndexPayload,
  SessionNotesNotebook,
  SessionNotesNotebookPage,
} from '@/types/wiki';
import {
  SECTION_GAP_CLASS,
  SURFACE_OPERATIONAL_CLASS,
  SURFACE_PRIMARY_CLASS,
  SURFACE_SILENT_CLASS,
  SURFACE_RECESSED_CLASS,
} from '@/lib/surfaceLayout';

function pageHref(
  campaignHandle: string,
  page: SessionNotesNotebookPage,
  flatPages: ReturnType<typeof useWiki>['flatPages'],
): string {
  if (page.timelinePointId) {
    return campaignNotePath(campaignHandle, page.timelinePointId);
  }
  return campaignWikiPath(campaignHandle, page.id, flatPages);
}

function sortSessionNotes(pages: SessionNotesNotebookPage[]): SessionNotesNotebookPage[] {
  return [...pages].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }),
  );
}

function noteMatchesSearch(page: SessionNotesNotebookPage, query: string): boolean {
  if (!query) return true;
  const haystack = `${page.title}\n${page.content ?? ''}`.toLowerCase();
  return haystack.includes(query);
}

export function SessionNotesView() {
  const { campaignHandle = '' } = useParams<{ campaignHandle: string }>();
  const navigate = useNavigate();
  const { campaign, flatPages } = useWiki();
  const [data, setData] = useState<SessionNotesIndexPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [pageTitleInput, setPageTitleInput] = useState('');
  const [newArcTitle, setNewArcTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [bulkDestinationBookId, setBulkDestinationBookId] = useState('__uncategorized__');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileError, setUploadFileError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  function validateSessionNoteUpload(file: File | null): string | null {
    if (!file) return null;
    const name = file.name.toLowerCase();
    if (name.endsWith('.doc')) {
      return 'Legacy .doc files are not supported. Convert to .docx before uploading.';
    }
    if (!/\.(txt|docx|md)$/i.test(name)) {
      return 'Only .txt, .docx, and .md files are supported.';
    }
    return null;
  }
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [showCreateArcDialog, setShowCreateArcDialog] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [noteDeleteTarget, setNoteDeleteTarget] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showCreateSessionDialog, setShowCreateSessionDialog] = useState(false);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const canManageRole =
    campaign?.role === CampaignMemberRoles.GAMEMASTER ||
    campaign?.role === CampaignMemberRoles.WRITER;
  const canManage = canManageRole && (data?.canManage ?? false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchSessionNotesIndex(campaignHandle);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notes index.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [campaignHandle]);

  useEffect(() => {
    if (!isOrganizing) {
      setSelectedNoteIds([]);
      setBulkDestinationBookId('__uncategorized__');
    }
  }, [isOrganizing]);

  useEffect(() => {
    if (!isCreateMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        createMenuRef.current &&
        !createMenuRef.current.contains(event.target as Node)
      ) {
        setIsCreateMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isCreateMenuOpen]);

  const filteredIndex = useMemo(() => {
    if (!data) return null;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const notebooks = data.notebooks
      .map((notebook) => ({
        ...notebook,
        pages: sortSessionNotes(notebook.pages).filter((page) =>
          noteMatchesSearch(page, normalizedQuery),
        ),
      }))
      .filter((notebook) => notebook.pages.length > 0);

    const uncategorized = sortSessionNotes(data.uncategorized).filter((page) =>
      noteMatchesSearch(page, normalizedQuery),
    );

    const totalMatches =
      notebooks.reduce((sum, notebook) => sum + notebook.pages.length, 0) +
      uncategorized.length;

    return {
      notebooks,
      uncategorized,
      totalMatches,
      isSearching: normalizedQuery.length > 0,
    };
  }, [data, searchQuery]);

  const organizableNoteIds = useMemo(() => {
    if (!filteredIndex) return [];
    return [
      ...filteredIndex.notebooks.flatMap((notebook) =>
        notebook.pages.map((page) => page.id),
      ),
      ...filteredIndex.uncategorized.map((page) => page.id),
    ];
  }, [filteredIndex]);

  const allVisibleSelected =
    organizableNoteIds.length > 0 &&
    organizableNoteIds.every((id) => selectedNoteIds.includes(id));

  const someVisibleSelected =
    !allVisibleSelected &&
    organizableNoteIds.some((id) => selectedNoteIds.includes(id));

  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = selectAllCheckboxRef.current;
    if (!el) return;
    el.indeterminate = someVisibleSelected;
  }, [someVisibleSelected, allVisibleSelected, organizableNoteIds.length]);

  async function handleCreateArc() {
    setSaving(true);
    try {
      const created = await createNotebookArc(campaignHandle, { title: newArcTitle });
      setData((prev) =>
        prev
          ? {
              ...prev,
              notebooks: [...prev.notebooks, { ...created, pages: [] }],
            }
          : prev,
      );
      setNewArcTitle('');
      setShowCreateArcDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create notebook.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveTitle(notebookId: string) {
    if (!titleInput.trim()) return;
    setSaving(true);
    try {
      const updated = await updateNotebookArc(campaignHandle, notebookId, titleInput);
      setData((prev) =>
        prev
          ? {
              ...prev,
              notebooks: prev.notebooks.map((n) =>
                n.id === updated.id ? { ...n, title: updated.title } : n,
              ),
            }
          : prev,
      );
      setEditingId(null);
      setTitleInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update title.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteHeader(notebookId: string) {
    if (!window.confirm('Delete this header? Notes will move to Uncategorized.')) {
      return;
    }
    setSaving(true);
    try {
      await deleteNotebookArc(campaignHandle, notebookId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete header.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePageTitle(pageId: string) {
    if (!pageTitleInput.trim()) {
      setEditingPageId(null);
      return;
    }
    setSaving(true);
    try {
      await updateSessionNotePage(campaignHandle, pageId, { title: pageTitleInput.trim() });
      setEditingPageId(null);
      setPageTitleInput('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename note.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePage(pageId: string, pageTitle: string) {
    try {
      const preview = await fetchWikiDeletePreview(campaignHandle, pageId);
      if (preview.directChildCount > 0 || preview.descendantCount > 0) {
        setNoteDeleteTarget({ id: pageId, title: pageTitle });
        return;
      }
    } catch {
      // Fall back to simple confirm if preview unavailable
    }

    if (!window.confirm('Delete this session note? This cannot be undone.')) return;
    setSaving(true);
    try {
      await deleteSessionNotePage(campaignHandle, pageId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note.');
    } finally {
      setSaving(false);
    }
  }

  const hasSessions = hasTimelineSessions(data);

  function openCreatePageDialog() {
    setIsCreateMenuOpen(false);
    setShowCreatePageDialog(true);
  }

  function openCreateSessionDialog() {
    setIsCreateMenuOpen(false);
    setShowCreateSessionDialog(true);
  }

  function handleEmptyStateCreate() {
    if (hasSessions) {
      openCreatePageDialog();
      return;
    }
    if (canManageRole) {
      openCreateSessionDialog();
    }
  }

  async function handleUploadPage() {
    if (!uploadFile) {
      setError('Please choose a file before uploading.');
      return;
    }
    const clientErr = validateSessionNoteUpload(uploadFile);
    if (clientErr) {
      setUploadFileError(clientErr);
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const page = await uploadSessionNotePage(campaignHandle, uploadFile);
      setShowUploadModal(false);
      setUploadFile(null);
      navigate(campaignWikiPath(campaignHandle, page.id, flatPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to upload page.');
    } finally {
      setUploading(false);
    }
  }

  function toggleSelectedNote(pageId: string) {
    setSelectedNoteIds((prev) =>
      prev.includes(pageId) ? prev.filter((id) => id !== pageId) : [...prev, pageId],
    );
  }

  function toggleSelectAllVisible() {
    if (organizableNoteIds.length === 0) return;
    if (allVisibleSelected) {
      setSelectedNoteIds((prev) =>
        prev.filter((id) => !organizableNoteIds.includes(id)),
      );
      return;
    }
    setSelectedNoteIds((prev) => [...new Set([...prev, ...organizableNoteIds])]);
  }

  async function handleBulkMoveSelection() {
    if (selectedNoteIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await bulkMoveNotebookPages(
        campaignHandle,
        selectedNoteIds,
        bulkDestinationBookId === '__uncategorized__' ? null : bulkDestinationBookId,
      );
      await load();
      setIsOrganizing(false);
      setSelectedNoteIds([]);
      setBulkDestinationBookId('__uncategorized__');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move selected notes.');
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkDeleteSelected() {
    if (selectedNoteIds.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await bulkDeleteSessionNotes(campaignHandle, selectedNoteIds);
      setIsDeleteModalOpen(false);
      setSelectedNoteIds([]);
      setIsOrganizing(false);
      setBulkDestinationBookId('__uncategorized__');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete selected notes.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner label="Loading session notes index…" />;
  if (error) return <p className="text-sm text-red-300">{error}</p>;
  if (!data) return null;

  const hasAnyNotes =
    data.notebooks.some((n) => n.pages.length > 0) || data.uncategorized.length > 0;
  const showSearchEmptyState =
    Boolean(filteredIndex?.isSearching) && filteredIndex?.totalMatches === 0;

  return (
    <div className={`w-full min-w-0 flex flex-col ${SECTION_GAP_CLASS}`}>
      <header className={SURFACE_PRIMARY_CLASS}>
        <div className="flex flex-col items-stretch justify-between gap-3 border-b border-border/40 pb-4 md:flex-row md:items-center">
          <div className="min-w-0 shrink-0 space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Session Notes</h1>
            <p className={SURFACE_RECESSED_CLASS}>
              Session notes grouped by books, arcs, or sidequests.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:flex-nowrap md:gap-3">
            {hasAnyNotes && (
              <label className="relative flex w-full shrink-0 items-center rounded-lg border border-border bg-surface transition-all focus-within:border-indigo-500 md:w-64">
                <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search notes for words or phrases..."
                  className="h-10 w-full rounded-lg bg-transparent py-2 pl-10 pr-3 text-sm text-foreground placeholder:text-muted outline-none"
                  aria-label="Search session notes"
                />
              </label>
            )}
            {campaign?.isMember && (
              <>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOrganizing((prev) => {
                        const next = !prev;
                        if (!next) {
                          setSelectedNoteIds([]);
                          setBulkDestinationBookId('__uncategorized__');
                        }
                        return next;
                      });
                    }}
                    className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-3 py-2 text-sm transition-colors ${
                      isOrganizing
                        ? 'border-indigo-500/70 bg-indigo-600/15 text-indigo-200'
                        : 'border-border bg-surface/40 text-foreground hover:bg-surface'
                    }`}
                  >
                    <FolderInput className="size-4" />
                    Organize
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-surface/40 px-3 py-2 text-sm text-foreground hover:bg-surface"
                >
                  <FileUp className="size-4" />
                  Upload Page
                </button>
                <div className="relative shrink-0" ref={createMenuRef}>
                  <div className="flex items-stretch overflow-hidden rounded-lg border border-border bg-surface/40 text-sm text-foreground transition-colors hover:bg-surface">
                    <button
                      type="button"
                      onClick={openCreatePageDialog}
                      className="flex cursor-pointer items-center justify-center border-r border-border px-3 py-2"
                      aria-label="Create new page"
                    >
                      <Plus className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateMenuOpen((open) => !open)}
                      className="flex cursor-pointer items-center justify-center px-2 py-2 hover:bg-elevated/80"
                      aria-label="Open create menu"
                      aria-expanded={isCreateMenuOpen}
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                  {isCreateMenuOpen && (
                    <div className="absolute right-0 z-50 mt-2 w-48 animate-in rounded-lg border border-border bg-surface py-1 shadow-2xl fade-in slide-in-from-top-2">
                      <button
                        type="button"
                        onClick={openCreatePageDialog}
                        className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs text-foreground hover:bg-elevated"
                      >
                        <span aria-hidden>📝</span>
                        Create New Page
                      </button>
                      {canManageRole ? (
                        <button
                          type="button"
                          onClick={openCreateSessionDialog}
                          className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs text-foreground hover:bg-elevated"
                        >
                          <span aria-hidden>📅</span>
                          Create New Session
                        </button>
                      ) : null}
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreateMenuOpen(false);
                            setShowCreateArcDialog(true);
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-xs text-foreground hover:bg-elevated"
                        >
                          <span aria-hidden>📖</span>
                          Create New Heading/Group
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {isOrganizing && hasAnyNotes && !showSearchEmptyState && organizableNoteIds.length > 0 && (
        <div
          className={`${SURFACE_OPERATIONAL_CLASS} flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-surface/40 px-4 py-3`}
        >
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-foreground">
            <input
              ref={selectAllCheckboxRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAllVisible}
              className="size-4 rounded border-border bg-surface text-indigo-600 focus:ring-primary"
              aria-label={
                allVisibleSelected
                  ? 'Deselect all visible session notes'
                  : 'Select all visible session notes'
              }
            />
            <span>
              {allVisibleSelected ? 'Deselect all' : 'Select all'}
              <span className="text-muted">
                {' '}
                ({organizableNoteIds.length}{' '}
                {filteredIndex?.isSearching ? 'matching ' : ''}
                {organizableNoteIds.length === 1 ? 'note' : 'notes'})
              </span>
            </span>
          </label>
          {selectedNoteIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedNoteIds([])}
              className="text-sm text-muted hover:text-foreground"
            >
              Clear selection ({selectedNoteIds.length})
            </button>
          )}
        </div>
      )}

      {!hasAnyNotes && (
        <section className="rounded-xl border-2 border-dashed border-border p-8 text-center">
          <div className="mb-3 flex justify-center">
            <BookOpen className="size-8 text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            No session notes yet
          </h2>
          <p className={`mt-2 ${SURFACE_RECESSED_CLASS}`}>
            Start a recap after your first session — grouped by book, arc, or sidequest.
          </p>
          {campaign?.isMember && (
            <button
              type="button"
              onClick={handleEmptyStateCreate}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-background hover:bg-primary-hover"
            >
              {hasSessions || !canManageRole
                ? '+ Write Session Note'
                : '+ Create First Session'}
            </button>
          )}
        </section>
      )}

      {showSearchEmptyState && (
        <section className="rounded-xl border border-border bg-surface/40 p-8 text-center">
          <p className="text-sm text-foreground">
            No session notes matched your search phrase.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
          >
            <X className="size-4" />
            Clear search
          </button>
        </section>
      )}

      {hasAnyNotes && !showSearchEmptyState &&
        filteredIndex?.notebooks.map((notebook: SessionNotesNotebook) => (
        <section
          key={notebook.id}
          className={`${SURFACE_SILENT_CLASS} p-4`}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            {editingId === notebook.id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={() => void handleSaveTitle(notebook.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void handleSaveTitle(notebook.id);
                    }
                  }}
                  className="h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                />
                <button
                  type="button"
                  onClick={() => void handleSaveTitle(notebook.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/40 px-2.5 py-2 text-xs text-indigo-300"
                >
                  <Save className="size-3.5" />
                  Save
                </button>
              </div>
            ) : (
              <h2 className="text-lg font-semibold text-foreground">{notebook.title}</h2>
            )}

            {canManage && editingId !== notebook.id && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title="Rename header"
                  onClick={() => {
                    setEditingId(notebook.id);
                    setTitleInput(notebook.title);
                  }}
                  className="rounded p-1 text-muted transition-colors hover:text-indigo-400"
                >
                  <Settings className="size-[15px]" />
                </button>
                <button
                  type="button"
                  title="Delete header"
                  onClick={() => void handleDeleteHeader(notebook.id)}
                  className="rounded p-1 text-muted transition-colors hover:text-red-400"
                >
                  <Trash2 className="size-[15px]" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {notebook.pages.map((page) => (
              <div
                key={page.id}
                className="group rounded-lg border border-border bg-background/70 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  {editingPageId === page.id ? (
                    <input
                      autoFocus
                      value={pageTitleInput}
                      onChange={(e) => setPageTitleInput(e.target.value)}
                      onBlur={() => void handleSavePageTitle(page.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          void handleSavePageTitle(page.id);
                        }
                      }}
                      className="h-8 w-full rounded border border-border bg-surface px-2 text-sm text-foreground"
                    />
                  ) : (
                    <div className="flex min-w-0 items-center">
                      {isOrganizing && (
                        <input
                          type="checkbox"
                          checked={selectedNoteIds.includes(page.id)}
                          onChange={() => toggleSelectedNote(page.id)}
                          className="mr-2 rounded border-border bg-surface text-indigo-600 focus:ring-primary"
                        />
                      )}
                      <Link
                        to={pageHref(campaignHandle, page, flatPages)}
                        className="min-w-0 truncate text-sm text-foreground hover:text-primary"
                      >
                        {page.title}
                      </Link>
                    </div>
                  )}
                  {(page.canEdit || page.canDelete) && editingPageId !== page.id && (
                    <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      {page.canEdit && (
                        <button
                          type="button"
                          title="Rename note"
                          onClick={() => {
                            setEditingPageId(page.id);
                            setPageTitleInput(page.title);
                          }}
                          className="rounded p-1 text-muted hover:bg-elevated hover:text-indigo-300"
                        >
                          <Settings className="size-3.5" />
                        </button>
                      )}
                      {page.canDelete && (
                        <button
                          type="button"
                          title="Delete note"
                          onClick={() => void handleDeletePage(page.id, page.title)}
                          className="rounded p-1 text-muted hover:bg-red-950/40 hover:text-red-300"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {hasAnyNotes && !showSearchEmptyState && (filteredIndex?.uncategorized.length ?? 0) > 0 && (
        <section className={`${SURFACE_SILENT_CLASS} border-dashed p-4`}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Uncategorized session notes
          </h2>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
            {filteredIndex?.uncategorized.map((page) => (
            <div key={page.id} className="group space-y-2 rounded-lg border border-border p-2">
              <div className="flex items-start justify-between gap-2">
                {editingPageId === page.id ? (
                  <input
                    autoFocus
                    value={pageTitleInput}
                    onChange={(e) => setPageTitleInput(e.target.value)}
                    onBlur={() => void handleSavePageTitle(page.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSavePageTitle(page.id);
                      }
                    }}
                    className="h-8 w-full rounded border border-border bg-surface px-2 text-sm text-foreground"
                  />
                ) : (
                  <div className="flex min-w-0 items-center">
                    {isOrganizing && (
                      <input
                        type="checkbox"
                        checked={selectedNoteIds.includes(page.id)}
                        onChange={() => toggleSelectedNote(page.id)}
                        className="mr-2 rounded border-border bg-surface text-indigo-600 focus:ring-primary"
                      />
                    )}
                    <Link
                      to={pageHref(campaignHandle, page, flatPages)}
                      className="block min-w-0 truncate text-sm text-foreground hover:text-primary"
                    >
                      {page.title}
                    </Link>
                  </div>
                )}
                {(page.canEdit || page.canDelete) && editingPageId !== page.id && (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {page.canEdit && (
                      <button
                        type="button"
                        title="Rename note"
                        onClick={() => {
                          setEditingPageId(page.id);
                          setPageTitleInput(page.title);
                        }}
                        className="rounded p-1 text-muted hover:bg-elevated hover:text-indigo-300"
                      >
                        <Settings className="size-3.5" />
                      </button>
                    )}
                    {page.canDelete && (
                      <button
                        type="button"
                        title="Delete note"
                        onClick={() => void handleDeletePage(page.id, page.title)}
                        className="rounded p-1 text-muted hover:bg-red-950/40 hover:text-red-300"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </section>
      )}
      {showCreateArcDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Create New Heading/Group
              </h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateArcDialog(false);
                  setNewArcTitle('');
                }}
                className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">
              Add a book, arc, or sidequest header to organize session notes on the
              index.
            </p>
            <input
              type="text"
              autoFocus
              value={newArcTitle}
              onChange={(event) => setNewArcTitle(event.target.value)}
              maxLength={80}
              placeholder="Heading or group title"
              className="mb-4 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm text-foreground"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleCreateArc();
                }
              }}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateArcDialog(false);
                  setNewArcTitle('');
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleCreateArc()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <Plus className="size-4" />
                {saving ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-xl rounded-xl border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Upload Page</h2>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="rounded p-1 text-muted hover:bg-surface hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="mb-3 rounded border border-indigo-900/50 bg-indigo-950/30 p-3 text-xs text-indigo-300">
              Note: The campaign journal runs on Markdown text format by default.
              Imported document paragraphs will adapt cleanly to markdown prose
              presentation structures.
            </div>
            <input
              type="file"
              multiple={false}
              accept=".txt,.docx,.md"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                setUploadFile(next);
                setUploadFileError(validateSessionNoteUpload(next));
              }}
              className="mb-4 block w-full rounded-lg border border-border bg-surface/40 p-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-elevated file:px-3 file:py-1.5 file:text-xs file:text-foreground"
            />
            {uploadFileError ? (
              <p className="mb-3 text-sm text-red-400">{uploadFileError}</p>
            ) : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                }}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!uploadFile || uploading || Boolean(uploadFileError)}
                onClick={() => void handleUploadPage()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                <FileUp className="size-4" />
                {uploading ? 'Uploading…' : 'Upload Page'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isOrganizing && organizableNoteIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 animate-in items-center gap-4 rounded-xl border border-border bg-surface px-6 py-4 shadow-2xl fade-in slide-in-from-bottom-4">
          <p className="text-sm text-foreground">
            {selectedNoteIds.length === 0
              ? 'Select notes to move or delete'
              : `Organizing ${selectedNoteIds.length} selected ${
                  selectedNoteIds.length === 1 ? 'note' : 'notes'
                }`}
          </p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <select
                value={bulkDestinationBookId}
                onChange={(event) => setBulkDestinationBookId(event.target.value)}
                disabled={selectedNoteIds.length === 0}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground disabled:opacity-50"
              >
                <option value="__uncategorized__">Uncategorized session notes</option>
                {data.notebooks.map((notebook) => (
                  <option key={notebook.id} value={notebook.id}>
                    {notebook.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleBulkMoveSelection()}
                disabled={saving || selectedNoteIds.length === 0}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                Move Selection
              </button>
            </div>
            {canManageRole && (
              <>
                <div className="h-8 w-px bg-elevated" aria-hidden />
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={saving || selectedNoteIds.length === 0}
                  className="flex items-center gap-2 rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2 text-red-400 transition-all hover:bg-red-600 hover:text-white disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  Delete Selected
                </button>
              </>
            )}
          </div>
        </div>
      )}
      {noteDeleteTarget && (
        <WikiPageDeleteDialog
          open={Boolean(noteDeleteTarget)}
          campaignHandle={campaignHandle}
          pageId={noteDeleteTarget.id}
          pageTitle={noteDeleteTarget.title}
          variant="session-note"
          onClose={() => setNoteDeleteTarget(null)}
          onDeleted={async () => {
            setNoteDeleteTarget(null);
            await load();
          }}
        />
      )}
      <CreateSessionNoteDialog
        open={showCreatePageDialog}
        campaignHandle={campaignHandle}
        canManageRole={canManageRole}
        hasSessions={hasSessions}
        onClose={() => setShowCreatePageDialog(false)}
        onCreateNewSession={openCreateSessionDialog}
      />
      {canManageRole ? (
        <CreateNewSessionDialog
          open={showCreateSessionDialog}
          campaignHandle={campaignHandle}
          sessionDuration={campaign?.sessionDuration}
          indexData={data}
          onClose={() => setShowCreateSessionDialog(false)}
          onCreated={() => void load()}
        />
      ) : null}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-background p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-foreground">Delete session notes</h2>
            <p className="mt-3 text-sm leading-relaxed text-foreground">
              Are you sure you want to permanently erase {selectedNoteIds.length} selected
              session notes? This action will destroy all connected player logs and cannot
              be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={saving}
                className="rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-surface disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleBulkDeleteSelected()}
                disabled={saving}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {saving ? 'Deleting…' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
