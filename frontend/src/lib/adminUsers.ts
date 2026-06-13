import { apiFetch } from '@/lib/api';
import type { UserRole } from '@/types/domain';

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  lastLogin: string | null;
  campaignCount: number;
}

export interface AdminUsersPagination {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
}

export interface AdminUsersResponse {
  users: AdminUserRow[];
  pagination: AdminUsersPagination;
}

export async function fetchAdminUsers(
  page: number,
  limit = 10,
): Promise<AdminUsersResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  return apiFetch<AdminUsersResponse>(`/admin/users?${params.toString()}`);
}

export async function updateAdminUserRole(
  userId: string,
  role: UserRole,
): Promise<AdminUserRow> {
  const data = await apiFetch<{ user: AdminUserRow }>(
    `/admin/users/${encodeURIComponent(userId)}/role`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
  );
  return data.user;
}

export async function deleteAdminUser(userId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/admin/users/${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
  );
}
