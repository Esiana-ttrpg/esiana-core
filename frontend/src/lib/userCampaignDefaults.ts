import { apiFetch } from '@/lib/api';
import type {
  PatchUserCampaignDefaultsInput,
  UserCampaignDefaultsBundle,
  UserTemplateResourceDetail,
  UserTemplateResourceKind,
} from '@/types/userCampaignDefaults';

export async function fetchUserCampaignDefaults(): Promise<UserCampaignDefaultsBundle> {
  const data = await apiFetch<{ defaults: UserCampaignDefaultsBundle }>(
    '/user/campaign-defaults',
  );
  return data.defaults;
}

export async function patchUserCampaignDefaults(
  input: PatchUserCampaignDefaultsInput,
): Promise<UserCampaignDefaultsBundle> {
  const data = await apiFetch<{ defaults: UserCampaignDefaultsBundle }>(
    '/user/campaign-defaults',
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return data.defaults;
}

export async function fetchUserTemplateResource(
  kind: UserTemplateResourceKind,
): Promise<UserTemplateResourceDetail> {
  const data = await apiFetch<{ resource: UserTemplateResourceDetail }>(
    `/user/template-resources/${kind}`,
  );
  return data.resource;
}

export async function saveUserTemplateResource(
  kind: UserTemplateResourceKind,
  markdown: string,
): Promise<void> {
  await apiFetch(`/user/template-resources/${kind}`, {
    method: 'PUT',
    body: JSON.stringify({ markdown }),
  });
}
