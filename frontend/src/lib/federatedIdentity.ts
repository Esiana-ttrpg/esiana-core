import { apiFetch } from '@/lib/api';

export interface AuthProviderSummary {
  id: string;
  displayName: string;
}

export interface LinkedIdentityProvider {
  providerId: string;
  displayName: string;
  providerEnabled: boolean;
  idpGroups: string[];
  groupsSyncedAt: string | null;
  linkedAt: string;
}

export interface LinkedAccountsPayload {
  linked: LinkedIdentityProvider[];
  linkable: AuthProviderSummary[];
  passwordAuthEnabled: boolean;
}

export interface AdminIdentityProvider {
  id: string;
  template: string;
  enabled: boolean;
  displayName: string;
  issuerUrl: string;
  resolvedIssuerUrl: string;
  clientId: string;
  clientSecretConfigured: boolean;
  scopes: string;
  tenantId: string | null;
  groupsClaim: string | null;
  groupRoleMappings: Record<string, string>;
  sortOrder: number;
  redirectUri: string;
  createdAt: string;
  updatedAt: string;
}

export async function fetchAuthProviders(): Promise<AuthProviderSummary[]> {
  const data = await apiFetch<{ providers: AuthProviderSummary[] }>(
    '/auth/providers',
  );
  return data.providers ?? [];
}

export function federatedSignInUrl(
  providerId: string,
  options?: { mode?: 'login' | 'link'; returnTo?: string },
): string {
  const params = new URLSearchParams();
  if (options?.mode === 'link') params.set('mode', 'link');
  if (options?.returnTo) params.set('returnTo', options.returnTo);
  const qs = params.toString();
  return `/api/auth/oidc/${encodeURIComponent(providerId)}/start${qs ? `?${qs}` : ''}`;
}

export async function fetchLinkedAccounts(): Promise<LinkedAccountsPayload> {
  return apiFetch<LinkedAccountsPayload>('/user/linked-accounts');
}

export async function unlinkIdentityProvider(providerId: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/user/linked-accounts/${encodeURIComponent(providerId)}`,
    { method: 'DELETE' },
  );
}

export async function addPasswordSignIn(input: {
  password: string;
  confirmPassword: string;
}): Promise<void> {
  await apiFetch<{ ok: boolean }>('/user/password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function removePasswordSignIn(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/user/password', { method: 'DELETE' });
}

export async function fetchAdminIdentityProviders(): Promise<{
  providers: AdminIdentityProvider[];
  secretEncryptionConfigured: boolean;
}> {
  return apiFetch('/admin/identity-providers');
}

export async function saveAdminIdentityProvider(
  id: string,
  body: Record<string, unknown>,
): Promise<AdminIdentityProvider> {
  const data = await apiFetch<{ provider: AdminIdentityProvider }>(
    `/admin/identity-providers/${encodeURIComponent(id)}`,
    { method: 'PUT', body: JSON.stringify(body) },
  );
  return data.provider;
}

export async function deleteAdminIdentityProvider(id: string): Promise<void> {
  await apiFetch<{ ok: boolean }>(
    `/admin/identity-providers/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}

export const AUTH_ERROR_MESSAGES: Record<string, string> = {
  email_collision:
    'An account with this email already exists. Sign in with your password, then link your organization identity in Settings.',
  registration_disabled:
    'New account registration is disabled on this instance.',
  domain_blocked:
    'Your email domain is not approved for registration on this instance.',
  email_mismatch:
    'The identity provider email must match your Esiana account email.',
  sub_in_use: 'This identity is already linked to another account.',
  provider_start_failed: 'Unable to start federated sign-in. Check provider configuration.',
  invalid_state: 'Sign-in session expired. Please try again.',
  session_expired: 'Sign-in session expired. Please try again.',
  token_exchange_failed: 'Identity provider rejected the sign-in request.',
  missing_subject: 'Identity provider did not return a subject identifier.',
};
