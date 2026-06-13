import type { NextFunction, Request, Response, RequestHandler } from 'express';
import { prisma } from '../prisma.js';
import { canAccessCampaign, normalizeCampaignMemberRole } from '../acl.js';
import type { AuthenticatedRequest } from '../../middleware/auth.js';
import { isCampaignPluginEnabled } from '../campaignPlugins.js';

export interface PluginCampaignJailRequest extends AuthenticatedRequest {
  /** Set by campaign-scoped plugin HTTP middleware after validation. */
  pluginJailedCampaignId?: string;
}

export function getPluginJailedCampaignId(req: Request): string | undefined {
  return (req as PluginCampaignJailRequest).pluginJailedCampaignId;
}

/**
 * Campaign-scoped plugin HTTP routes must declare which campaign they operate in.
 * Headless paths (scheduler, domain events) must pass jailedCampaignId into
 * createPluginHostContext separately.
 */
export async function requirePluginCampaignJail(
  req: PluginCampaignJailRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const handle = String(
    req.query.campaignHandle ?? req.headers['x-campaign-handle'] ?? '',
  ).trim();

  if (!handle) {
    res.status(400).json({
      error: 'campaignHandle query parameter (or X-Campaign-Handle header) is required',
    });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { handle },
    select: {
      id: true,
      campaignOwnerUserId: true,
      discoverability: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: { userId: req.user.id, campaignId: campaign.id },
    },
    select: { role: true },
  });

  const role = membership
    ? normalizeCampaignMemberRole(membership.role)
    : null;

  if (
    !canAccessCampaign(
      role,
      campaign.discoverability,
      campaign.campaignOwnerUserId,
      req.user.id,
    )
  ) {
    res.status(403).json({ error: 'Forbidden: no access to this campaign' });
    return;
  }

  if (!membership) {
    res.status(403).json({ error: 'Forbidden: campaign membership required' });
    return;
  }

  req.pluginJailedCampaignId = campaign.id;
  next();
}

export function requireCampaignPluginEnabled(pluginId: string): RequestHandler {
  return async (
    req: PluginCampaignJailRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    const campaignId = getPluginJailedCampaignId(req);
    if (!campaignId) {
      res.status(400).json({ error: 'Campaign context required' });
      return;
    }

    const enabled = await isCampaignPluginEnabled(campaignId, pluginId);
    if (!enabled) {
      res.status(404).json({ error: 'Plugin not enabled for this campaign' });
      return;
    }

    next();
  };
}

export function assertPluginCampaignAccess(
  req: Request,
  campaignId: string,
): void {
  const jailed = getPluginJailedCampaignId(req);
  if (jailed && jailed !== campaignId) {
    throw new Error(
      `Plugin campaign jail violation: requested ${campaignId} but jailed to ${jailed}`,
    );
  }
}
