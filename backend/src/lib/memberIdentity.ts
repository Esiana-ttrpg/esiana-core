import { PageOwnerTypes } from '../../../shared/campaignPolicy/pageOwnership.js';
import { isCharacterEntityPage } from '../../../shared/resolveCanonicalEntityCategory.js';
import { readEntityCategoryFromMetadata } from './wikiCategoryEntityIndex.js';
import { formatPlayerLabel } from './userDisplay.js';

export interface IdentityPageRef {
  id: string;
  title: string;
  visibility: string;
}

export function isCharacterWikiPage(page: {
  id?: string;
  title?: string;
  parentId?: string | null;
  templateType: string | null;
  metadata: unknown;
}): boolean {
  if (!page.id) {
    return readEntityCategoryFromMetadata(page.metadata) === 'characters';
  }
  return isCharacterEntityPage(
    {
      id: page.id,
      title: page.title ?? '',
      parentId: page.parentId ?? null,
      templateType: page.templateType ?? 'DEFAULT',
      metadata: page.metadata,
    },
    [],
  );
}

export type IdentityPageOwnershipUpdate = {
  ownerType: typeof PageOwnerTypes.USER;
  ownerUserId: string;
  ownerPartyId: null;
};

export function resolveIdentityPageOwnershipUpdate(
  page: {
    id?: string;
    title?: string;
    parentId?: string | null;
    templateType: string | null;
    metadata: unknown;
  },
  targetUserId: string,
): IdentityPageOwnershipUpdate | null {
  if (!isCharacterWikiPage(page)) return null;
  return {
    ownerType: PageOwnerTypes.USER,
    ownerUserId: targetUserId,
    ownerPartyId: null,
  };
}

export interface MemberIdentityDisplay {
  displayName: string | null;
  playerContext: string;
  label: string;
  identityPageId: string | null;
}

export function resolveMemberIdentityDisplay(params: {
  user: { email: string; displayName?: string | null };
  identityPage: IdentityPageRef | null | undefined;
  index: number;
}): MemberIdentityDisplay {
  const playerContext = formatPlayerLabel(params.user, params.index);
  const identityPageId = params.identityPage?.id ?? null;
  const displayName = params.identityPage?.title?.trim() || null;
  const label = displayName ?? playerContext;

  return {
    displayName,
    playerContext,
    label,
    identityPageId,
  };
}

export const campaignMemberIdentityInclude = {
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  identityPage: {
    select: {
      id: true,
      title: true,
      visibility: true,
    },
  },
} as const;

export function mapMemberToIdentityFields(
  member: {
    userId: string;
    role: string;
    user: { email: string; displayName?: string | null };
    identityPage?: IdentityPageRef | null;
  },
  index: number,
) {
  const identity = resolveMemberIdentityDisplay({
    user: member.user,
    identityPage: member.identityPage,
    index,
  });

  return {
    userId: member.userId,
    role: member.role,
    ...identity,
  };
}
