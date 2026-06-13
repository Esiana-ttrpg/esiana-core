import { apiFetch } from '@/lib/api';
import type {
  ApiTokenDurationDays,
  CreateUserApiTokenResult,
  UserApiTokenSummary,
} from '@/types/apiToken';
import type { UserProfile, UserProfileUpdateInput } from '@/types/user';

export async function fetchUserProfile(): Promise<UserProfile> {
  const data = await apiFetch<{ profile: UserProfile }>('/user/profile');
  return data.profile;
}

export async function updateUserProfile(
  input: UserProfileUpdateInput,
): Promise<UserProfile> {
  const data = await apiFetch<{ profile: UserProfile }>('/user/profile', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  return data.profile;
}

export async function changeUserPassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>('/user/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function uploadUserAvatar(file: File): Promise<UserProfile> {
  const form = new FormData();
  form.append('avatar', file);
  const data = await apiFetch<{ profile: UserProfile }>('/user/profile/avatar', {
    method: 'POST',
    body: form,
  });
  return data.profile;
}

export async function deleteMyAccount(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/user/account', { method: 'DELETE' });
}

export async function fetchUserApiTokens(): Promise<UserApiTokenSummary[]> {
  const data = await apiFetch<{ tokens: UserApiTokenSummary[] }>('/user/tokens');
  return data.tokens ?? [];
}

export async function createUserApiToken(input: {
  name: string;
  durationDays: ApiTokenDurationDays;
}): Promise<CreateUserApiTokenResult> {
  return apiFetch<CreateUserApiTokenResult>('/user/tokens', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function revokeUserApiToken(tokenId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(`/user/tokens/${tokenId}`, {
    method: 'DELETE',
  });
}

export async function fetchPublicUserProfile(
  userId: string,
): Promise<import('@/types/recruitment').PublicUserProfile> {
  const data = await apiFetch<{
    profile: import('@/types/recruitment').PublicUserProfile;
  }>(`/users/${userId}/public-profile`);
  return data.profile;
}
