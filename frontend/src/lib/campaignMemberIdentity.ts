import { apiFetch } from '@/lib/api';

export interface CampaignMemberIdentity {
  userId: string;
  name?: string;
  displayName?: string | null;
  label?: string;
  playerLabel?: string;
  playerContext?: string;
  role: string;
  identityPageId: string | null;
}

export async function fetchCampaignMembersForIdentity(
  campaignHandle: string,
): Promise<CampaignMemberIdentity[]> {
  const data = await apiFetch<{ members: CampaignMemberIdentity[] }>(
    `/campaigns/${campaignHandle}/members`,
  );
  return (data.members ?? []).map(normalizeMemberIdentity);
}

export async function updateMemberIdentityPage(
  campaignHandle: string,
  userId: string,
  identityPageId: string | null,
): Promise<CampaignMemberIdentity> {
  const data = await apiFetch<{ member: CampaignMemberIdentity }>(
    `/campaigns/${campaignHandle}/members/${userId}/identity`,
    {
      method: 'PATCH',
      body: JSON.stringify({ identityPageId }),
    },
  );
  return data.member;
}

export function memberDisplayLabel(member: CampaignMemberIdentity): string {
  return (
    member.displayName?.trim() ||
    member.name?.trim() ||
    member.playerLabel?.trim() ||
    member.label?.trim() ||
    member.playerContext?.trim() ||
    'PARTICIPANT'
  );
}

export function findMemberLinkedToPage(
  members: CampaignMemberIdentity[],
  pageId: string,
): CampaignMemberIdentity | null {
  return members.find((m) => m.identityPageId === pageId) ?? null;
}

export function normalizeMemberIdentity(
  member: CampaignMemberIdentity,
): CampaignMemberIdentity {
  return {
    ...member,
    identityPageId: member.identityPageId ?? null,
  };
}
