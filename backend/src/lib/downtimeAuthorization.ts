import { prisma } from './prisma.js';
import type { CampaignActor } from '../../../shared/campaignPolicy/policy.js';
import {
  canCreateDowntimeResource,
  canDeleteDowntimeResource,
  canEditDowntimePerson,
  canEditDowntimeResource,
  canManageDowntime,
  canChangeDowntimeVisibility,
  type DowntimeResourceAccess,
} from '../../../shared/campaignPolicy/downtimeAccess.js';
import { PageOwnerTypes } from '../../../shared/campaignPolicy/pageOwnership.js';

export {
  canCreateDowntimeResource,
  canDeleteDowntimeResource,
  canEditDowntimePerson,
  canEditDowntimeResource,
  canManageDowntime,
  canChangeDowntimeVisibility,
  type DowntimeResourceAccess,
};

export function ownershipFromWiki(page: {
  visibility: string;
  deletedAt: Date | null;
  ownerType: string;
  ownerUserId: string | null;
  ownerPartyId: string | null;
}): DowntimeResourceAccess {
  const ownerType =
    page.ownerType === PageOwnerTypes.USER ||
    page.ownerType === PageOwnerTypes.PARTY ||
    page.ownerType === PageOwnerTypes.STAFF
      ? page.ownerType
      : PageOwnerTypes.STAFF;
  return {
    visibility: page.visibility,
    deletedAt: page.deletedAt,
    ownerType,
    ownerUserId: page.ownerUserId,
    ownerPartyId: page.ownerPartyId,
  };
}

export async function loadHavenWikiOwnership(
  campaignId: string,
  havenId: string,
): Promise<DowntimeResourceAccess | null> {
  const row = await prisma.downtimeHaven.findFirst({
    where: { id: havenId, campaignId },
    select: {
      wikiPage: {
        select: { visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true },
      },
    },
  });
  if (!row?.wikiPage) return null;
  return ownershipFromWiki(row.wikiPage);
}

export async function loadProjectWikiOwnership(
  campaignId: string,
  projectId: string,
): Promise<DowntimeResourceAccess | null> {
  const row = await prisma.downtimeProject.findFirst({
    where: { id: projectId, campaignId },
    select: {
      wikiPage: {
        select: { visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true },
      },
    },
  });
  if (!row?.wikiPage) return null;
  return ownershipFromWiki(row.wikiPage);
}

export async function loadPersonCharacterOwnership(
  campaignId: string,
  personId: string,
): Promise<DowntimeResourceAccess | null> {
  const row = await prisma.downtimePersonRelationship.findFirst({
    where: { id: personId, campaignId },
    select: {
      characterPage: {
        select: { visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true },
      },
    },
  });
  if (!row?.characterPage) return null;
  return ownershipFromWiki(row.characterPage);
}

export async function loadCharacterPageOwnership(
  campaignId: string,
  characterPageId: string,
): Promise<DowntimeResourceAccess | null> {
  const page = await prisma.wikiPage.findFirst({
    where: { id: characterPageId, campaignId, deletedAt: null },
    select: { visibility: true, deletedAt: true, ownerType: true, ownerUserId: true, ownerPartyId: true },
  });
  if (!page) return null;
  return ownershipFromWiki(page);
}

export function actorCanEditHaven(
  actor: CampaignActor,
  ownership: DowntimeResourceAccess,
): boolean {
  return canEditDowntimeResource(actor, ownership);
}

export function actorCanDeleteHaven(
  actor: CampaignActor,
  ownership: DowntimeResourceAccess,
): boolean {
  return canDeleteDowntimeResource(actor, ownership);
}

/** Authorize both ends of a reassignment; campaign-scoped lookups fail closed. */
export async function canAssignDowntimePerson(
  actor: CampaignActor,
  campaignId: string,
  patch: Record<string, unknown>,
  current?: { havenId: string | null; projectId: string | null },
): Promise<boolean> {
  const id = (value: unknown) => typeof value === 'string' ? value.trim().slice(0, 100) : null;
  const havenIds = new Set([current?.havenId, id(patch.havenId)].filter((value): value is string => Boolean(value)));
  const projectIds = new Set([current?.projectId, id(patch.projectId)].filter((value): value is string => Boolean(value)));
  for (const havenId of havenIds) {
    const resource = await loadHavenWikiOwnership(campaignId, havenId);
    if (!resource || !canEditDowntimeResource(actor, resource)) return false;
  }
  for (const projectId of projectIds) {
    const resource = await loadProjectWikiOwnership(campaignId, projectId);
    if (!resource || !canEditDowntimeResource(actor, resource)) return false;
  }
  return actor.kind === 'member';
}
