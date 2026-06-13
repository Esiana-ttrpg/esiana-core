import { apiFetch } from './api';

export async function requestPasswordReset(email: string): Promise<void> {
  await apiFetch<{ ok: boolean }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function completePasswordReset(
  token: string,
  password: string,
): Promise<void> {
  await apiFetch<{ ok: boolean }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function sendCampaignInviteEmail(
  campaignHandle: string,
  email: string,
): Promise<{ to: string }> {
  const data = await apiFetch<{ ok: boolean; to: string }>(
    `/campaigns/${campaignHandle}/invite/send`,
    {
      method: 'POST',
      body: JSON.stringify({ email }),
    },
  );
  return { to: data.to };
}
