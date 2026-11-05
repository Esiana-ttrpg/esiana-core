import type { Response } from 'express';
import type { CampaignScopedRequest } from '../middleware/campaignScope.js';
import {
  canCreateDowntimeResource,
  canManageDowntime,
  canChangeDowntimeVisibility,
  canDeleteDowntimeResource,
  canEditDowntimeResource,
  loadHavenWikiOwnership,
} from '../lib/downtimeAuthorization.js';
import {
  createDowntimeHaven,
  deleteDowntimeHaven,
  getDowntimeHaven,
  getDowntimeHavenByWikiPageId,
  listDowntimeHavens,
  resolveWikiPageTitles,
  updateDowntimeHaven,
} from '../lib/downtimeHavenService.js';
import { listDowntimeProjectDetails } from '../lib/downtimeProjectService.js';
import { buildHavenOverviewPayload } from '../lib/buildHavenPresentation.js';
import { prisma } from '../lib/prisma.js';
import { listDowntimePeople } from '../lib/downtimePeopleService.js';

export async function listDowntimeHavensHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;

  const havens = await listDowntimeHavens(ctx.campaignId, campaignHandle, ctx);
  res.json({ havens });
}

export async function getDowntimeHavenHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const havenId = String(req.params.id);

  const haven = await getDowntimeHaven(
    ctx.campaignId,
    campaignHandle,
    havenId,
    ctx,
  );

  if (!haven) {
    res.status(404).json({ error: 'Haven not found.' });
    return;
  }

  const ownership = await loadHavenWikiOwnership(ctx.campaignId, haven.id);
  res.json({
    haven,
    canDelete: ownership ? canDeleteDowntimeResource(ctx.actor, ownership) : false,
    canEdit: ownership
      ? canEditDowntimeResource(ctx.actor, ownership)
      : false,
  });
}

export async function getDowntimeHavenByWikiPageHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const wikiPageId = String(req.params.wikiPageId);

  const haven = await getDowntimeHavenByWikiPageId(
    ctx.campaignId,
    campaignHandle,
    wikiPageId,
    ctx,
  );

  if (!haven) {
    res.status(404).json({ error: 'Haven not found.' });
    return;
  }

  const { blocks: _blocks, ...detail } = haven;
  const ownership = await loadHavenWikiOwnership(ctx.campaignId, detail.id);
  res.json({
    haven: detail,
    canDelete: ownership ? canDeleteDowntimeResource(ctx.actor, ownership) : false,
    canEdit: ownership
      ? canEditDowntimeResource(ctx.actor, ownership)
      : false,
  });
}

export async function getDowntimeHavenOverviewHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const campaignHandle = ctx.campaignHandle ?? ctx.campaignId;
  const havenId = String(req.params.id);

  const havenRecord = await prisma.downtimeHaven.findFirst({
    where: { id: havenId, campaignId: ctx.campaignId },
    select: { wikiPageId: true },
  });

  if (!havenRecord) {
    res.status(404).json({ error: 'Haven not found.' });
    return;
  }

  const havenWithBlocks = await getDowntimeHavenByWikiPageId(
    ctx.campaignId,
    campaignHandle,
    havenRecord.wikiPageId,
    ctx,
  );

  if (!havenWithBlocks) {
    res.status(404).json({ error: 'Haven not found.' });
    return;
  }

  const [campaign, activeProjects, residentLabels, wikiPage, people] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: ctx.campaignId },
      select: { currentEpochMinute: true },
    }),
    listDowntimeProjectDetails(ctx.campaignId, campaignHandle, ctx, {
      havenPageId: havenWithBlocks.wikiPageId,
      includeTerminal: false,
    }),
    resolveWikiPageTitles(ctx.campaignId, havenWithBlocks.residentPageIds, ctx),
    prisma.wikiPage.findFirst({
      where: { id: havenWithBlocks.wikiPageId, campaignId: ctx.campaignId },
      select: { featuredImageId: true },
    }),
    listDowntimePeople(ctx.campaignId, campaignHandle, ctx, false),
  ]);

  const { blocks, ...haven } = havenWithBlocks;

  const overview = await buildHavenOverviewPayload({
    haven,
    blocks,
    featuredImageId: wikiPage?.featuredImageId ?? null,
    campaignId: ctx.campaignId,
    campaignHandle,
    activeProjects,
    residentLabels,
    currentEpochMinute: campaign?.currentEpochMinute ?? 0n,
    assignedPeople: people.people.filter((person) => person.status === 'ACTIVE' && person.assignment?.kind === 'haven' && person.assignment.id === havenId),
  });

  res.json({ overview });
}

export async function createDowntimeHavenHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  if (!canCreateDowntimeResource(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = req.body ?? {};
  if (!canChangeDowntimeVisibility(ctx.actor, 'PARTY', body.visibility)) {
    res.status(403).json({ error: 'Forbidden: visibility change not permitted' });
    return;
  }
  if (body.ownerType === 'PARTY' && !ctx.partyId) {
    res.status(400).json({ error: 'PARTY ownership requires a default campaign party.' });
    return;
  }
  const title = typeof body.title === 'string' ? body.title : '';

  const result = await createDowntimeHaven(
    ctx.campaignId,
    ctx.campaignHandle ?? ctx.campaignId,
    req.user!.id,
    {
      title,
      description: typeof body.description === 'string' ? body.description : undefined,
      visibility: typeof body.visibility === 'string' ? body.visibility : undefined,
      fields:
        typeof body.fields === 'object' && body.fields ? body.fields : undefined,
      blocks: Array.isArray(body.blocks) ? body.blocks : undefined,
      creatorRole: ctx.role,
      defaultPartyId: ctx.partyId ?? null,
      requestedOwnerType:
        typeof body.ownerType === 'string' ? body.ownerType : undefined,
    },
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(201).json({ haven: result.haven });
}

export async function updateDowntimeHavenHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const havenId = String(req.params.id);
  const ownership = await loadHavenWikiOwnership(ctx.campaignId, havenId);
  if (!ownership) {
    res.status(404).json({ error: 'Haven not found.' });
    return;
  }
  if (!canEditDowntimeResource(ctx.actor, ownership)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const body = req.body ?? {};

  const patch: Record<string, unknown> = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (typeof body.bannerAssetId === 'string' || body.bannerAssetId === null) {
    patch.bannerAssetId = body.bannerAssetId;
  }
  if (typeof body.visibility === 'string') patch.visibility = body.visibility;
  if (typeof body.appendActivity === 'object' && body.appendActivity) {
    patch.appendActivity = body.appendActivity;
  }
  if (body.ledgerSimulationHints !== undefined) patch.ledgerSimulationHints = body.ledgerSimulationHints;
  if (typeof body.havenSimulation === 'object' && body.havenSimulation) {
    patch.havenSimulation = body.havenSimulation;
  }
  if (typeof body.fields === 'object' && body.fields) {
    Object.assign(patch, body.fields);
  } else {
    const directKeys = [
      'havenType',
      'status',
      'locationPageId',
      'scale',
      'ownershipType',
      'primaryTheme',
      'establishedAt',
      'discoveryState',
      'residentPageIds',
      'factionPageIds',
      'crew',
      'upgrades',
      'threats',
      'passiveBenefits',
      'activityLog',
      'relatedPageIds',
      'identityHints',
      'references',
      'spaces',
      'simulationHints',
    ] as const;
    for (const key of directKeys) {
      if (body[key] !== undefined) patch[key] = body[key];
    }
  }

  if (!canChangeDowntimeVisibility(ctx.actor, ownership.visibility, patch.visibility)) {
    res.status(403).json({ error: 'Forbidden: visibility change not permitted' });
    return;
  }

  if ((patch.havenSimulation !== undefined || patch.simulationHints !== undefined || patch.ledgerSimulationHints !== undefined) && !canManageDowntime(ctx.actor)) {
    res.status(403).json({ error: 'Forbidden: simulation settings require downtime.manage' });
    return;
  }

  const result = await updateDowntimeHaven(
    ctx.campaignId,
    ctx.campaignHandle ?? ctx.campaignId,
    havenId,
    req.user!.id,
    patch,
  );

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.json({ haven: result.haven });
}

export async function deleteDowntimeHavenHandler(
  req: CampaignScopedRequest,
  res: Response,
): Promise<void> {
  const ctx = req.campaign!;
  const havenId = String(req.params.id);
  const ownership = await loadHavenWikiOwnership(ctx.campaignId, havenId);
  if (!ownership) {
    res.status(404).json({ error: 'Haven not found.' });
    return;
  }
  if (!canDeleteDowntimeResource(ctx.actor, ownership)) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  const result = await deleteDowntimeHaven(ctx.campaignId, havenId);

  if (!result.ok) {
    res.status(result.status).json({ error: result.error });
    return;
  }

  res.status(204).send();
}
