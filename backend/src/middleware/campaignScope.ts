import type { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  canAccessCampaign,
  canManageChronology,
  canModifyCampaign,
  normalizeCampaignMemberRole,
} from '../lib/acl.js';
import { buildCampaignContext } from '../lib/campaignScopeContext.js';
import { can as policyCan } from '../../../shared/campaignPolicy/policy.js';
import {
  CampaignCapabilities,
  type CampaignCapability,
} from '../../../shared/campaignPolicy/capabilities.js';
import { MembershipRoles } from '../../../shared/campaignPolicy/membershipRoles.js';
import type { CampaignContext } from '../types/api.js';
import {
  type AuthenticatedRequest,
  authenticateApiOrSession,
  optionalAuth,
} from './auth.js';
import { apiRequestTelemetry } from './apiRequestTelemetry.js';

export interface CampaignScopedRequest extends AuthenticatedRequest {
  campaign?: CampaignContext;
}

const campaignSelect = {
  id: true,
  handle: true,
  campaignOwnerUserId: true,
  discoverability: true,
  allowPlayerChronologyManagement: true,
} as const;

async function loadMembership(
  userId: string,
  campaignId: string,
): Promise<{
  role: string;
  chronologyContributor: boolean;
  partyId: string | null;
} | null> {
  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: { userId, campaignId },
    },
    select: { role: true, chronologyContributor: true, partyId: true },
  });
  return membership;
}

async function resolveScopeForCampaign(
  req: CampaignScopedRequest,
  res: Response,
  campaignKey: string,
): Promise<boolean> {
  const campaign = await prisma.campaign.findUnique({
    where: { handle: campaignKey },
    select: campaignSelect,
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return false;
  }

  let role = null as ReturnType<typeof normalizeCampaignMemberRole>;
  let chronologyContributor = false;
  let partyId: string | null = null;

  if (req.user) {
    const membership = await loadMembership(req.user.id, campaign.id);
    if (membership) {
      role = normalizeCampaignMemberRole(membership.role);
      chronologyContributor = membership.chronologyContributor;
      partyId = membership.partyId;
    }
  }

  if (
    !canAccessCampaign(
      role,
      campaign.discoverability,
      campaign.campaignOwnerUserId,
      req.user?.id,
    )
  ) {
    res.status(403).json({ error: 'Forbidden: no access to this campaign' });
    return false;
  }

  req.campaign = await buildCampaignContext({
    campaignId: campaign.id,
    campaignHandle: campaign.handle,
    campaignOwnerUserId: campaign.campaignOwnerUserId,
    discoverability: campaign.discoverability,
    allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
    userId: req.user?.id ?? null,
    membershipRole: role,
    chronologyContributor,
    partyId,
  });

  return true;
}

export async function resolveCampaignScope(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const campaignKey = String(req.params.campaignHandle ?? '');
  const ok = await resolveScopeForCampaign(req, res, campaignKey);
  if (ok) next();
}

export function requireCampaignMember(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.campaign?.isMember) {
    res.status(403).json({ error: 'Forbidden: campaign membership required' });
    return;
  }
  next();
}

/** Phase A — observers may read but not mutate campaign content. */
export function requireNonObserverMember(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.campaign?.isMember) {
    res.status(403).json({ error: 'Forbidden: campaign membership required' });
    return;
  }
  if (req.campaign.role === MembershipRoles.OBSERVER) {
    res.status(403).json({ error: 'Forbidden: observers cannot modify content' });
    return;
  }
  next();
}

export function requireCapability(capability: CampaignCapability) {
  return (
    req: CampaignScopedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.campaign?.actor || !policyCan(req.campaign.actor, capability)) {
      res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      return;
    }
    next();
  };
}

export function requireCampaignMembership(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  if (!req.campaign?.isMember) {
    res.status(403).json({
      error: 'Forbidden: you must be a member of this campaign',
    });
    return;
  }
  next();
}

export const requireMapsEdit = requireCapability(
  CampaignCapabilities.MAPS_EDIT,
);
export const requireAssetsUpload = requireCapability(
  CampaignCapabilities.ASSETS_UPLOAD,
);
export const requireAssetsDeleteAny = requireCapability(
  CampaignCapabilities.ASSETS_DELETE_ANY,
);
export const requireRumorModerate = requireCapability(
  CampaignCapabilities.RUMOR_MODERATE,
);
export const requireDiscoveryReveal = requireCapability(
  CampaignCapabilities.DISCOVERY_REVEAL,
);
export const requireDowntimeManage = requireCapability(
  CampaignCapabilities.DOWNTIME_MANAGE,
);
export const requirePageVisibilityEdit = requireCapability(
  CampaignCapabilities.PAGE_VISIBILITY_EDIT,
);
export const requirePageEditAny = requireCapability(
  CampaignCapabilities.PAGE_EDIT_ANY,
);
export const requireAdventureStoryboardEdit = requireCapability(
  CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT,
);
export const requireQuestEdit = requireCapability(CampaignCapabilities.QUEST_EDIT);
export const requireThreadEdit = requireCapability(CampaignCapabilities.THREAD_EDIT);
export const requireNotesModerate = requireCapability(
  CampaignCapabilities.NOTES_MODERATE,
);

export function requireChronologyManager(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.campaign) {
    res.status(403).json({
      error: 'Forbidden: chronology management not permitted',
    });
    return;
  }
  if (
    !canManageChronology(
      req.campaign.role,
      req.campaign.allowPlayerChronologyManagement,
      req.campaign.chronologyContributor,
      {
        userId: req.user?.id ?? null,
        membershipRole: req.campaign.role,
        campaignOwnerUserId: req.campaign.campaignOwnerUserId,
        discoverability: req.campaign.discoverability,
        allowPlayerChronologyManagement:
          req.campaign.allowPlayerChronologyManagement,
        chronologyContributor: req.campaign.chronologyContributor,
      },
    )
  ) {
    res.status(403).json({
      error: 'Forbidden: chronology management not permitted',
    });
    return;
  }
  next();
}

/** Narrative/table campaign settings — gamemaster. */
export function requireGamemasterSettings(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (!req.campaign || !canModifyCampaign(req.campaign.actor)) {
    res.status(403).json({
      error: 'Forbidden: gamemaster role required for campaign settings',
    });
    return;
  }
  next();
}

/** @deprecated Use requireGamemasterSettings */
export const requireCampaignDm = requireGamemasterSettings;

export function requireCampaignOwner(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): void {
  if (
    !req.campaign?.actor ||
    !policyCan(req.campaign.actor, CampaignCapabilities.CAMPAIGN_MANAGE_ROLES)
  ) {
    res.status(403).json({
      error: 'Forbidden: campaign owner role required',
    });
    return;
  }
  next();
}

export const campaignScopeMiddleware = [
  authenticateApiOrSession,
  apiRequestTelemetry,
  resolveCampaignScope,
];

export const optionalCampaignScopeMiddleware = [
  optionalAuth,
  resolveCampaignScope,
];

export async function attachCampaignByIdParam(
  req: CampaignScopedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const campaignId = String(req.params.campaignId ?? req.params.id);
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: campaignSelect,
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  let role = null as ReturnType<typeof normalizeCampaignMemberRole>;
  let chronologyContributor = false;
  let partyId: string | null = null;

  if (req.user) {
    const membership = await loadMembership(req.user.id, campaign.id);
    if (membership) {
      role = normalizeCampaignMemberRole(membership.role);
      chronologyContributor = membership.chronologyContributor;
      partyId = membership.partyId;
    }
  }

  if (
    !canAccessCampaign(
      role,
      campaign.discoverability,
      campaign.campaignOwnerUserId,
      req.user?.id,
    )
  ) {
    res.status(403).json({ error: 'Forbidden: no access to this campaign' });
    return;
  }

  req.campaign = await buildCampaignContext({
    campaignId: campaign.id,
    campaignHandle: campaign.handle,
    campaignOwnerUserId: campaign.campaignOwnerUserId,
    discoverability: campaign.discoverability,
    allowPlayerChronologyManagement: campaign.allowPlayerChronologyManagement,
    userId: req.user?.id ?? null,
    membershipRole: role,
    chronologyContributor,
    partyId,
  });

  next();
}
