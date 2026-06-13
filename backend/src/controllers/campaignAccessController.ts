import type { Response } from 'express';
import { prisma } from '../lib/prisma.js';
import {
  canManageCampaignMembership,
  isCampaignMemberRole,
  normalizeCampaignMemberRole,
} from '../lib/acl.js';
import { invalidateCampaignCapabilityOverrideCache } from '../lib/campaignScopeContext.js';
import {
  NON_OVERRIDABLE_CAPABILITIES,
  CapabilityOverrideEffect,
} from '../../../shared/campaignPolicy/capabilityOverrides.js';
import {
  ALL_CAMPAIGN_CAPABILITIES,
  CampaignCapabilities,
} from '../../../shared/campaignPolicy/capabilities.js';
import { membershipRoleUiLabel } from '../../../shared/campaignPolicy/membershipRoles.js';
import {
  mapMemberToIdentityFields,
  resolveIdentityPageOwnershipUpdate,
  resolveMemberIdentityDisplay,
} from '../lib/memberIdentity.js';
import { resolveUserDisplayName, normalizeEmail } from '../lib/userDisplay.js';
import { canViewWikiPage } from '../lib/wikiTree.js';
import { CampaignMemberRoles, type CampaignMemberRole } from '../types/domain.js';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { generateInviteToken } from '../lib/inviteToken.js';
import {
  buildNotificationEmailHtml,
  isSmtpConfigured,
  sendMail,
} from '../lib/mail/mailSender.js';
import { getOrCreateSystemSettings, DEFAULT_GLOBAL_TITLE } from '../lib/systemSettings.js';
import {
  notifyUsersAsync,
  getOperationalManagerUserIds,
} from '../lib/notifications/notificationService.js';
import { NotificationType } from '../lib/notifications/types.js';
import { campaignSettingsPath } from '../lib/notifications/deepLinks.js';

const MUTABLE_MEMBER_ROLES: readonly CampaignMemberRole[] = [
  CampaignMemberRoles.GAMEMASTER,
  CampaignMemberRoles.WRITER,
  CampaignMemberRoles.PARTICIPANT,
  CampaignMemberRoles.OBSERVER,
];

function isMutableMemberRole(value: string): value is CampaignMemberRole {
  return MUTABLE_MEMBER_ROLES.includes(value as CampaignMemberRole);
}

export async function listCampaignMembers(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const members = await prisma.campaignMember.findMany({
    where: { campaignId },
    select: {
      userId: true,
      role: true,
      chronologyContributor: true,
      partyId: true,
      createdAt: true,
      identityPageId: true,
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
    },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  });

  const campaignOwnerUserId = req.campaign!.campaignOwnerUserId;

  res.json({
    members: members.map((member, index) => {
      const identity = resolveMemberIdentityDisplay({
        user: member.user,
        identityPage: member.identityPage,
        index,
      });

      return {
        userId: member.user.id,
        name: resolveUserDisplayName(member.user),
        email: member.user.email,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        chronologyContributor: member.chronologyContributor,
        partyId: member.partyId,
        joinedAt: member.createdAt.toISOString(),
        isCampaignOwner: member.user.id === campaignOwnerUserId,
        roleLabel: membershipRoleUiLabel(
          normalizeCampaignMemberRole(member.role) ?? member.role as CampaignMemberRole,
        ),
        identityPageId: identity.identityPageId,
        identityPageTitle: identity.displayName,
        playerContext: identity.playerContext,
        label: identity.label,
      };
    }),
  });
}

export async function getCampaignInvite(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      handle: true,
      inviteToken: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const inviteToken = campaign.inviteToken?.trim() || generateInviteToken();
  if (inviteToken !== campaign.inviteToken) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        inviteToken,
      },
    });
  }

  res.json({
    slug: campaign.handle,
    inviteToken,
    emailAvailable: await isSmtpConfigured(),
  });
}

export async function rotateCampaignInvite(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      handle: true,
      inviteToken: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const inviteToken = generateInviteToken();

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      inviteToken,
    },
  });

  res.json({
    slug: campaign.handle,
    inviteToken,
  });
}

export async function sendCampaignInviteEmail(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = req.body as { email?: unknown };
  const recipient = normalizeEmail(body.email);
  if (!recipient) {
    res.status(400).json({ error: 'A valid email address is required' });
    return;
  }

  if (!(await isSmtpConfigured())) {
    res.status(400).json({
      error: 'SMTP is not configured on this instance. Ask your admin to set up email delivery.',
    });
    return;
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      handle: true,
      name: true,
      inviteToken: true,
    },
  });

  if (!campaign) {
    res.status(404).json({ error: 'Campaign not found' });
    return;
  }

  const inviteToken = campaign.inviteToken?.trim() || generateInviteToken();
  if (inviteToken !== campaign.inviteToken) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { inviteToken },
    });
  }

  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';
  const inviteUrl = `${frontendOrigin.replace(/\/+$/, '')}/campaigns/${campaign.handle}?invite=${encodeURIComponent(inviteToken)}`;
  const settings = await getOrCreateSystemSettings();
  const appTitle = settings.globalTitle ?? DEFAULT_GLOBAL_TITLE;
  const senderName = req.user?.displayName?.trim() || req.user?.username || 'Your DM';
  const subject = `You're invited to ${campaign.name}`;
  const text = `${senderName} invited you to join "${campaign.name}" on ${appTitle}.\n\n${inviteUrl}`;
  const html = buildNotificationEmailHtml({
    title: `Join ${campaign.name}`,
    body: `${senderName} invited you to join this campaign workspace.`,
    linkUrl: inviteUrl,
    appTitle,
  });

  const sent = await sendMail({ to: recipient, subject, text, html });
  if (!sent) {
    res.status(500).json({ error: 'Failed to send invite email' });
    return;
  }

  res.json({ ok: true, to: recipient });
}

export async function updateCampaignMemberIdentity(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const callerId = req.user?.id;
  const callerRole = req.campaign!.role;
  const targetUserId = String(req.params.userId ?? '');

  if (!callerId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!targetUserId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const body = req.body as { identityPageId?: string | null };
  const identityPageId =
    body.identityPageId === undefined
      ? undefined
      : body.identityPageId === null || body.identityPageId === ''
        ? null
        : String(body.identityPageId).trim();

  if (identityPageId === undefined) {
    res.status(400).json({ error: 'identityPageId is required (use null to clear)' });
    return;
  }

  const isSelf = callerId === targetUserId;
  const canManageOthers = canManageCampaignMembership(req.campaign!.actor);
  if (!isSelf && !canManageOthers) {
    res.status(403).json({ error: 'Forbidden: cannot update another member identity' });
    return;
  }

  const targetMembership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: targetUserId,
        campaignId,
      },
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
  });

  if (!targetMembership) {
    res.status(404).json({ error: 'Campaign member not found' });
    return;
  }

  let identityPage: {
    id: string;
    title: string;
    visibility: string;
    templateType: string | null;
    metadata: unknown;
  } | null = null;

  if (identityPageId) {
    identityPage = await prisma.wikiPage.findFirst({
      where: {
        id: identityPageId,
        campaignId,
      },
      select: {
        id: true,
        title: true,
        visibility: true,
        templateType: true,
        metadata: true,
      },
    });

    if (!identityPage) {
      res.status(400).json({
        error: 'Identity page not found in this campaign',
      });
      return;
    }

    const assigneeRole = isCampaignMemberRole(targetMembership.role)
      ? targetMembership.role
      : null;

    if (!canViewWikiPage(identityPage.visibility, assigneeRole)) {
      res.status(400).json({
        error: 'Selected page is not visible to this member',
      });
      return;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    const member = await tx.campaignMember.update({
      where: {
        userId_campaignId: {
          userId: targetUserId,
          campaignId,
        },
      },
      data: { identityPageId },
      select: {
        userId: true,
        role: true,
        identityPageId: true,
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
      },
    });

    if (identityPageId && identityPage) {
      const ownership = resolveIdentityPageOwnershipUpdate(
        identityPage,
        targetUserId,
      );
      if (ownership) {
        await tx.wikiPage.update({
          where: {
            id: identityPageId,
            campaignId,
          },
          data: ownership,
        });
      }
    }

    return member;
  });

  const campaignOwnerUserId = req.campaign!.campaignOwnerUserId;
  const identity = mapMemberToIdentityFields(
    {
      userId: updated.userId,
      role: updated.role,
      user: updated.user,
      identityPage: updated.identityPage,
    },
    0,
  );

  res.json({
    member: {
      userId: updated.user.id,
      name: resolveUserDisplayName(updated.user),
      email: updated.user.email,
      avatarUrl: updated.user.avatarUrl,
      role: updated.role,
      isCampaignOwner: updated.user.id === campaignOwnerUserId,
      identityPageId: identity.identityPageId,
      identityPageTitle: identity.displayName,
      playerContext: identity.playerContext,
      label: identity.label,
    },
  });
}

export async function updateCampaignMemberRole(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const targetUserId = String(req.params.userId ?? '');
  const nextRoleRaw = String((req.body as { role?: string }).role ?? '').trim();

  if (!targetUserId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  const nextRole = normalizeCampaignMemberRole(nextRoleRaw);
  if (!nextRole || !isMutableMemberRole(nextRole)) {
    res.status(400).json({
      error: 'Invalid role. Expected one of: GAMEMASTER, WRITER, PARTICIPANT, OBSERVER.',
    });
    return;
  }

  const targetMembership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: targetUserId,
        campaignId,
      },
    },
    select: { role: true },
  });

  if (!targetMembership) {
    res.status(404).json({ error: 'Campaign member not found' });
    return;
  }

  const previousRole = targetMembership.role;
  const chronologyContributor =
    nextRole === CampaignMemberRoles.PARTICIPANT &&
    previousRole === CampaignMemberRoles.PARTICIPANT
      ? undefined
      : nextRole === CampaignMemberRoles.PARTICIPANT
        ? false
        : undefined;

  const updated = await prisma.campaignMember.update({
    where: {
      userId_campaignId: {
        userId: targetUserId,
        campaignId,
      },
    },
    data: {
      role: nextRole,
      ...(chronologyContributor !== undefined
        ? { chronologyContributor }
        : {}),
    },
    select: {
      role: true,
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  if (previousRole !== updated.role) {
    notifyUsersAsync({
      userIds: [targetUserId],
      type: NotificationType.ROLE_CHANGED,
      title: 'Your campaign role changed',
      body: `You are now ${membershipRoleUiLabel(updated.role as CampaignMemberRole)} in this campaign.`,
      linkUrl: campaignSettingsPath(req.campaign!.campaignHandle ?? '', 'access'),
      campaignId,
    });
  }

  res.json({
    member: {
      userId: updated.user.id,
      name: resolveUserDisplayName(updated.user),
      email: updated.user.email,
      avatarUrl: updated.user.avatarUrl,
      role: updated.role,
      isCampaignOwner: updated.user.id === req.campaign!.campaignOwnerUserId,
      roleLabel: membershipRoleUiLabel(updated.role as CampaignMemberRole),
    },
  });
}

export async function transferGamemaster(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const callerId = req.user!.id;
  const targetUserId = String((req.body as { targetUserId?: string }).targetUserId ?? '').trim();
  const demoteCallerToWriter = (req.body as { demoteCallerToWriter?: boolean }).demoteCallerToWriter !== false;

  if (!targetUserId) {
    res.status(400).json({ error: 'targetUserId is required' });
    return;
  }

  if (req.campaign!.role !== CampaignMemberRoles.GAMEMASTER) {
    res.status(403).json({ error: 'Only a gamemaster can transfer gamemaster role' });
    return;
  }

  if (targetUserId === callerId) {
    res.status(400).json({ error: 'Cannot transfer gamemaster role to yourself' });
    return;
  }

  const target = await prisma.campaignMember.findUnique({
    where: { userId_campaignId: { userId: targetUserId, campaignId } },
    select: { role: true },
  });

  if (!target) {
    res.status(404).json({ error: 'Target must be an existing campaign member' });
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaignMember.update({
      where: { userId_campaignId: { userId: targetUserId, campaignId } },
      data: { role: CampaignMemberRoles.GAMEMASTER },
    });
    if (demoteCallerToWriter) {
      await tx.campaignMember.update({
        where: { userId_campaignId: { userId: callerId, campaignId } },
        data: { role: CampaignMemberRoles.WRITER },
      });
    }
  });

  notifyUsersAsync({
    userIds: [targetUserId],
    type: NotificationType.ROLE_CHANGED,
    title: 'You are now the campaign gamemaster',
    body: 'Another member transferred primary gamemaster authority to you.',
    linkUrl: campaignSettingsPath(req.campaign!.campaignHandle ?? '', 'access'),
    campaignId,
  });

  res.json({ ok: true });
}

export async function removeCampaignMember(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const targetUserId = String(req.params.userId ?? '');

  if (!targetUserId) {
    res.status(400).json({ error: 'userId is required' });
    return;
  }

  if (targetUserId === req.campaign!.campaignOwnerUserId) {
    res.status(409).json({
      error: 'Cannot remove the campaign owner. Transfer campaign ownership first.',
    });
    return;
  }

  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: {
        userId: targetUserId,
        campaignId,
      },
    },
    select: {
      userId: true,
      role: true,
      user: { select: { displayName: true, email: true } },
    },
  });

  if (!membership) {
    res.status(404).json({ error: 'Campaign member not found' });
    return;
  }

  await prisma.campaignMember.delete({
    where: {
      userId_campaignId: {
        userId: targetUserId,
        campaignId,
      },
    },
  });

  const slug = req.campaign!.campaignHandle;
  const managerIds = await getOperationalManagerUserIds(campaignId);
  notifyUsersAsync({
    userIds: managerIds,
    type: NotificationType.MEMBER_DEPARTED,
    title: 'A player left the campaign',
    body: `${resolveUserDisplayName(membership.user)} (${membership.role}) was removed from the roster.`,
    linkUrl: campaignSettingsPath(slug ?? '', 'members'),
    campaignId,
  });

  res.json({ ok: true });
}

export async function leaveCampaign(
  req: CampaignScopedRequest & AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const slug = req.campaign!.campaignHandle;
  const userId = req.user!.id;

  if (req.campaign!.isCampaignOwner) {
    res.status(409).json({
      error: 'Campaign owner cannot leave until campaign ownership is transferred.',
    });
    return;
  }

  const membership = await prisma.campaignMember.findUnique({
    where: {
      userId_campaignId: { userId, campaignId },
    },
    select: {
      role: true,
      user: { select: { displayName: true, email: true } },
    },
  });

  if (!membership) {
    res.status(404).json({ error: 'You are not a member of this campaign' });
    return;
  }

  await prisma.campaignMember.delete({
    where: {
      userId_campaignId: { userId, campaignId },
    },
  });

  const managerIds = await getOperationalManagerUserIds(campaignId);
  notifyUsersAsync({
    userIds: managerIds,
    type: NotificationType.MEMBER_DEPARTED,
    title: 'A player left the campaign',
    body: `${resolveUserDisplayName(membership.user)} (${membership.role}) left the campaign.`,
    linkUrl: campaignSettingsPath(slug ?? '', 'members'),
    campaignId,
  });

  res.json({ ok: true });
}

const COLLABORATIVE_OVERRIDE_CAPS = [
  CampaignCapabilities.PAGE_CREATE,
  CampaignCapabilities.PAGE_EDIT_OWNED,
  CampaignCapabilities.PAGE_EDIT_PARTY,
  CampaignCapabilities.QUEST_EDIT,
  CampaignCapabilities.THREAD_EDIT,
  CampaignCapabilities.LEDGER_CONTRIBUTE,
  CampaignCapabilities.ASSETS_UPLOAD,
  CampaignCapabilities.ASSETS_DELETE_OWNED,
  CampaignCapabilities.CHRONOLOGY_EDIT,
] as const;

const OPERATIONAL_OVERRIDE_CAPS = [
  CampaignCapabilities.PAGE_EDIT_ANY,
  CampaignCapabilities.PAGE_VISIBILITY_EDIT,
  CampaignCapabilities.MAPS_EDIT,
  CampaignCapabilities.DOWNTIME_MANAGE,
  CampaignCapabilities.ASSETS_DELETE_ANY,
  CampaignCapabilities.ADVENTURE_STORYBOARD_EDIT,
] as const;

export async function listCampaignCapabilityOverrides(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const rows = await prisma.campaignRoleCapabilityOverride.findMany({
    where: { campaignId },
    select: { role: true, capability: true, effect: true },
    orderBy: [{ role: 'asc' }, { capability: 'asc' }],
  });
  res.json({
    overrides: rows,
    configurableCapabilities: {
      collaborative: COLLABORATIVE_OVERRIDE_CAPS,
      operational: OPERATIONAL_OVERRIDE_CAPS,
    },
  });
}

export async function saveCampaignCapabilityOverrides(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const campaignId = req.campaign!.campaignId;
  const body = req.body as {
    overrides?: Array<{ role: string; capability: string; effect: string }>;
  };
  if (!Array.isArray(body.overrides)) {
    res.status(400).json({ error: 'overrides array required' });
    return;
  }

  for (const row of body.overrides) {
    if (
      !ALL_CAMPAIGN_CAPABILITIES.includes(
        row.capability as (typeof ALL_CAMPAIGN_CAPABILITIES)[number],
      )
    ) {
      res.status(400).json({ error: `Unknown capability: ${row.capability}` });
      return;
    }
    if (
      NON_OVERRIDABLE_CAPABILITIES.has(
        row.capability as (typeof ALL_CAMPAIGN_CAPABILITIES)[number],
      )
    ) {
      res.status(400).json({
        error: `Capability cannot be overridden: ${row.capability}`,
      });
      return;
    }
    if (
      row.effect !== CapabilityOverrideEffect.GRANT &&
      row.effect !== CapabilityOverrideEffect.REVOKE
    ) {
      res.status(400).json({ error: 'effect must be GRANT or REVOKE' });
      return;
    }
    if (!isMutableMemberRole(row.role)) {
      res.status(400).json({ error: `Invalid role: ${row.role}` });
      return;
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.campaignRoleCapabilityOverride.deleteMany({ where: { campaignId } });
    if (body.overrides!.length > 0) {
      await tx.campaignRoleCapabilityOverride.createMany({
        data: body.overrides!.map((row) => ({
          campaignId,
          role: row.role,
          capability: row.capability,
          effect: row.effect,
        })),
      });
    }
  });

  invalidateCampaignCapabilityOverrideCache(campaignId);
  res.json({ ok: true });
}
