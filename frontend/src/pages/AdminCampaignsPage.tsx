import { useCallback, useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Database,
  Search,
  Shield,
  Swords,
  Trash2,
  X,
} from 'lucide-react';
import { controlClasses } from '@/components/admin/adminFormStyles';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  deleteAdminCampaign,
  downloadCampaignBackup,
  fetchAdminCampaigns,
  type AdminCampaignRow,
  type AdminCampaignsPagination,
  type AdminCampaignSortBy,
  type AdminCampaignSortOrder,
} from '@/lib/adminCampaigns';

const SORT_OPTIONS = [
  {
    value: 'fileSize-desc',
    label: 'File Size (Largest first)',
    sortBy: 'fileSize' as const,
    sortOrder: 'desc' as const,
  },
  {
    value: 'fileSize-asc',
    label: 'File Size (Smallest first)',
    sortBy: 'fileSize' as const,
    sortOrder: 'asc' as const,
  },
  {
    value: 'title-asc',
    label: 'Alphabetical (A-Z)',
    sortBy: 'title' as const,
    sortOrder: 'asc' as const,
  },
  {
    value: 'title-desc',
    label: 'Alphabetical (Z-A)',
    sortBy: 'title' as const,
    sortOrder: 'desc' as const,
  },
  {
    value: 'createdAt-desc',
    label: 'Date Created',
    sortBy: 'createdAt' as const,
    sortOrder: 'desc' as const,
  },
] as const;

const DEFAULT_SORT_VALUE = 'fileSize-desc';

function parseSortValue(value: string): {
  sortBy: AdminCampaignSortBy;
  sortOrder: AdminCampaignSortOrder;
} {
  const match = SORT_OPTIONS.find((opt) => opt.value === value);
  return match ?? SORT_OPTIONS[0];
}

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<AdminCampaignRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<AdminCampaignsPagination | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortValue, setSortValue] = useState(DEFAULT_SORT_VALUE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<AdminCampaignRow | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sortValue]);

  const { sortBy, sortOrder } = parseSortValue(sortValue);

  const loadPage = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAdminCampaigns({
          page: targetPage,
          limit: 10,
          search: debouncedSearch,
          sortBy,
          sortOrder,
        });
        setCampaigns(data.campaigns);
        setTotalCount(data.totalCount);
        setPagination(data.pagination);
        setPage(data.pagination.currentPage);
      } catch (err) {
        setCampaigns([]);
        setPagination(null);
        setTotalCount(0);
        setError(
          err instanceof Error ? err.message : 'Unable to load campaigns.',
        );
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch, sortBy, sortOrder],
  );

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  async function handleBackup(row: AdminCampaignRow) {
    const confirmed = window.confirm(
      `Download a full restore backup for "${row.title}"?\n\nIncludes sovereign Markdown export plus all campaign settings. This may take a moment for campaigns with large media libraries.`,
    );
    if (!confirmed) return;

    setBusyId(row.id);
    setActionError(null);
    try {
      await downloadCampaignBackup(row.id, row.handle);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Campaign backup failed.',
      );
    } finally {
      setBusyId(null);
    }
  }

  function openDeleteModal(row: AdminCampaignRow) {
    setDeleteTarget(row);
    setDeleteConfirmText('');
    setActionError(null);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
    setDeleteConfirmText('');
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteConfirmText !== deleteTarget.title) {
      setActionError('Type the campaign title exactly to confirm deletion.');
      return;
    }

    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      await deleteAdminCampaign(deleteTarget.id, deleteConfirmText);
      closeDeleteModal();
      const nextPage =
        campaigns.length === 1 && page > 1 ? page - 1 : page;
      await loadPage(nextPage);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete campaign.',
      );
    } finally {
      setBusyId(null);
    }
  }

  const canGoPrev = pagination ? pagination.currentPage > 1 : false;
  const canGoNext = pagination
    ? pagination.currentPage < pagination.totalPages
    : false;

  const deleteMatches =
    deleteTarget !== null && deleteConfirmText === deleteTarget.title;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Campaigns
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Swords className="size-4 shrink-0" />
          Audit isolated game data, media footprint, and per-campaign backups.
        </p>
      </header>

      <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/15 to-surface/60 px-6 py-5">
        <p className="text-xs font-bold uppercase tracking-widest text-primary/90">
          Instance overview
        </p>
        <p className="mt-2 text-2xl font-bold text-foreground">
          Total Active Server Campaigns:{' '}
          <span className="font-mono text-primary">{totalCount}</span>
        </p>
        {debouncedSearch && (
          <p className="mt-1 text-xs text-muted">
            Filtered by search: &ldquo;{debouncedSearch}&rdquo;
          </p>
        )}
      </div>

      {actionError && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {actionError}
        </p>
      )}

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface/40 p-4 sm:flex-row sm:items-end">
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Search campaigns
          </span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Title or owner email…"
              className={`${controlClasses} pl-9`}
            />
          </div>
        </label>
        <label className="w-full sm:w-64">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
            Sort by
          </span>
          <select
            value={sortValue}
            onChange={(e) => setSortValue(e.target.value)}
            className={controlClasses}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading && <LoadingSpinner label="Loading campaigns…" />}

      {error && !loading && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface/40">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-surface/80 text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Title</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">File size</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {campaigns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      No campaigns match your filters.
                    </td>
                  </tr>
                ) : (
                  campaigns.map((row) => {
                    const busy = busyId === row.id;
                    return (
                      <tr key={row.id} className="text-foreground">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">{row.title}</p>
                          <p className="text-xs text-muted">{row.handle}</p>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatWhen(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatWhen(row.updatedAt)}
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {row.ownerEmail ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">
                          {row.fileSizeFormatted}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleBackup(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:text-primary disabled:opacity-50 transition-colors"
                            >
                              <Database className="size-3.5" />
                              Backup
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openDeleteModal(row)}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/40 disabled:opacity-50 transition-colors"
                            >
                              <Trash2 className="size-3.5" />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalCount > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
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
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-campaign-title"
        >
          <div className="w-full max-w-md rounded-xl border border-red-900/50 bg-surface p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h2
                id="delete-campaign-title"
                className="text-lg font-semibold text-red-300"
              >
                Delete campaign permanently?
              </h2>
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg p-1 text-muted hover:bg-elevated hover:text-foreground"
                aria-label="Close"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-3 text-sm text-muted">
              This wipes <strong className="text-foreground">{deleteTarget.title}</strong>,
              all wiki pages, members, and uploaded media. Type the campaign title below
              to confirm.
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted">
                Confirm title
              </span>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteTarget.title}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-red-500/50 focus:outline-none focus:ring-1 focus:ring-red-500/30"
                autoFocus
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-lg border border-border px-4 py-2 text-sm text-foreground hover:bg-elevated transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!deleteMatches || busyId === deleteTarget.id}
                onClick={() => void confirmDelete()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                {busyId === deleteTarget.id ? 'Deleting…' : 'Delete campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
