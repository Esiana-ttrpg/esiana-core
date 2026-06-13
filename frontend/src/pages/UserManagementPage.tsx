import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Shield, Trash2, UserCog, Users } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUserRole,
  type AdminUserRow,
  type AdminUsersPagination,
} from '@/lib/adminUsers';
import { useAuth } from '@/contexts/AuthContext';
import { UserRoles, type UserRole } from '@/types/domain';

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function displayName(row: AdminUserRow): string {
  return row.displayName?.trim() || row.email;
}

export function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [pagination, setPagination] = useState<AdminUsersPagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const loadPage = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminUsers(targetPage, 10);
      setUsers(data.users);
      setPagination(data.pagination);
      setPage(data.pagination.currentPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load users.');
      setUsers([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPage(page);
  }, [page, loadPage]);

  async function handleToggleRole(row: AdminUserRow) {
    const nextRole: UserRole =
      row.role === UserRoles.SYSTEM_ADMIN
        ? UserRoles.USER
        : UserRoles.SYSTEM_ADMIN;
    const actionLabel =
      nextRole === UserRoles.SYSTEM_ADMIN ? 'promote to system admin' : 'demote to user';

    const confirmed = window.confirm(
      `${actionLabel.charAt(0).toUpperCase() + actionLabel.slice(1)} for ${displayName(row)}?\n\nThis changes platform-wide permissions immediately.`,
    );
    if (!confirmed) return;

    setBusyUserId(row.id);
    setActionError(null);
    try {
      await updateAdminUserRole(row.id, nextRole);
      await loadPage(page);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update user role.',
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function handleDelete(row: AdminUserRow) {
    const confirmed = window.confirm(
      `Permanently delete ${displayName(row)}?\n\nThis removes their account, campaign memberships, and cannot be undone.`,
    );
    if (!confirmed) return;

    setBusyUserId(row.id);
    setActionError(null);
    try {
      await deleteAdminUser(row.id);
      const nextPage =
        users.length === 1 && page > 1 ? page - 1 : page;
      await loadPage(nextPage);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to delete user.',
      );
    } finally {
      setBusyUserId(null);
    }
  }

  const canGoPrev = pagination ? pagination.currentPage > 1 : false;
  const canGoNext = pagination
    ? pagination.currentPage < pagination.totalPages
    : false;

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Shield className="size-7" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Memberships
          </h1>
        </div>
        <p className="flex items-center gap-2 text-sm text-muted">
          <Users className="size-4 shrink-0" />
          Directory of registered accounts, roles, and campaign participation.
        </p>
      </header>

      {actionError && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {actionError}
        </p>
      )}

      {loading && <LoadingSpinner label="Loading members…" />}

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
                  <th className="px-4 py-3 font-semibold">Member</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Campaigns</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Last login</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/80">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((row) => {
                    const isSelf = row.id === currentUser?.id;
                    const busy = busyUserId === row.id;
                    return (
                      <tr key={row.id} className="text-foreground">
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {displayName(row)}
                            {isSelf && (
                              <span className="ml-2 text-xs text-primary">(you)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted">{row.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                              row.role === UserRoles.SYSTEM_ADMIN
                                ? 'bg-primary/15 text-primary'
                                : 'bg-elevated text-muted'
                            }`}
                          >
                            {row.role === UserRoles.SYSTEM_ADMIN
                              ? 'System Admin'
                              : 'User'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-foreground">
                          {row.campaignCount}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatWhen(row.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatWhen(row.lastLogin)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              disabled={busy || isSelf}
                              onClick={() => void handleToggleRole(row)}
                              title={
                                isSelf
                                  ? 'You cannot change your own admin role here'
                                  : undefined
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                            >
                              <UserCog className="size-3.5" />
                              {row.role === UserRoles.SYSTEM_ADMIN
                                ? 'Demote'
                                : 'Promote'}
                            </button>
                            <button
                              type="button"
                              disabled={busy || isSelf}
                              onClick={() => void handleDelete(row)}
                              title={
                                isSelf
                                  ? 'You cannot delete your own account here'
                                  : undefined
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-red-900/50 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
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
                Page {pagination.currentPage} of {pagination.totalPages} ·{' '}
                {pagination.totalCount} member
                {pagination.totalCount === 1 ? '' : 's'}
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
    </div>
  );
}
