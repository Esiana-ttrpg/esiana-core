import type { Response } from 'express';
import { isSampleDataEnabled } from '../config/env.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';
import { toInputJsonValue } from '../lib/inputJsonValue.js';
import { generateHandle, makeUniqueHandle } from '../lib/handleUtils.js';
import { seedWikiSkeleton } from '../lib/seedWiki.js';
import { getDefaultSidebarConfig } from '../lib/sidebarConfig.js';
import { getDefaultDashboardConfig } from '../lib/dashboardConfig.js';
import { DEFAULT_GAME_SYSTEM_SLUG } from '../lib/gameSystems.js';
import { CampaignMemberRoles } from '../types/domain.js';
import { generateInviteToken } from '../lib/inviteToken.js';
import {
  createBackgroundTask,
  updateBackgroundTask,
} from '../lib/taskRegistry.js';
import { enqueueCampaignBootstrap } from '../lib/importQueue.js';
import {
  listCoreSampleDataProfiles,
  resolveSampleDataSpec,
} from '../lib/sampleData/sampleDataRegistry.js';
import type { CampaignBootstrapSpec } from '../lib/campaignBootstrap.js';

export async function getAdminSampleDataStatus(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!isSampleDataEnabled()) {
    res.json({
      enabled: false,
      profiles: [],
    });
    return;
  }

  res.json({
    enabled: true,
    profiles: listCoreSampleDataProfiles(),
  });
}

export async function postAdminGenerateSampleCampaign(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  if (!isSampleDataEnabled()) {
    res.status(403).json({
      error: 'Sample Data is disabled. Set ENABLE_SAMPLE_DATA=true to use developer fixtures.',
    });
    return;
  }

  const body = req.body as {
    name?: string;
    profileId?: string;
    seed?: string;
    density?: 'quiet' | 'active' | 'obsessive';
  };

  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const profileId = typeof body.profileId === 'string' ? body.profileId.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'name is required' });
    return;
  }
  if (!profileId) {
    res.status(400).json({ error: 'profileId is required' });
    return;
  }

  const bootstrap: CampaignBootstrapSpec = {
    kind: 'sampleData',
    profileId,
    ...(typeof body.seed === 'string' && body.seed.trim() ? { seed: body.seed.trim() } : {}),
    ...(body.density === 'quiet' || body.density === 'active' || body.density === 'obsessive'
      ? { density: body.density }
      : {}),
  };

  const resolved = resolveSampleDataSpec({
    kind: 'sampleData',
    profileId,
    ...(bootstrap.seed ? { seed: bootstrap.seed } : {}),
    ...(bootstrap.density ? { density: bootstrap.density } : {}),
  });
  if (!resolved.ok) {
    res.status(400).json({ error: resolved.error });
    return;
  }

  const bootstrapTask = createBackgroundTask({
    taskName: `Sample Data: ${resolved.resolved.label}`,
    targetCampaign: name,
    type: 'AD_HOC',
    status: 'PROCESSING',
    progress: 5,
    abortable: false,
    meta: {
      requestedByUserId: req.user!.id,
      profileId: resolved.resolved.profileId,
      kind: 'sampleData',
    },
  });

  try {
    const baseHandle = generateHandle(name);
    const campaign = await prisma.$transaction(async (tx) => {
      const existingHandles = new Set(
        (
          await tx.campaign.findMany({
            where: { handle: { startsWith: baseHandle } },
            select: { handle: true },
          })
        ).map((row) => row.handle),
      );
      const finalHandle = makeUniqueHandle(baseHandle, existingHandles);

      const created = await tx.campaign.create({
        data: {
          name,
          handle: finalHandle,
          inviteToken: generateInviteToken(),
          campaignOwnerUserId: req.user!.id,
          gameSystem: DEFAULT_GAME_SYSTEM_SLUG,
          sidebarConfig: toInputJsonValue(getDefaultSidebarConfig()),
          dashboardConfig: toInputJsonValue({
            ...getDefaultDashboardConfig(),
            importManifest: {
              bootstrap,
              bootstrapTaskId: bootstrapTask.id,
            },
          }),
        },
        select: { id: true, handle: true, name: true },
      });

      const { ensureDefaultPartyForCampaign, linkCampaignMembersToDefaultParty } =
        await import('../lib/partyService.js');
      const partyId = await ensureDefaultPartyForCampaign(tx, created.id, created.name);
      await linkCampaignMembersToDefaultParty(tx, created.id, partyId);

      await tx.campaignMember.create({
        data: {
          userId: req.user!.id,
          campaignId: created.id,
          role: CampaignMemberRoles.GAMEMASTER,
          chronologyContributor: false,
          partyId,
        },
      });

      await seedWikiSkeleton(tx, created.id);
      return created;
    });

    updateBackgroundTask(bootstrapTask.id, {
      progress: 15,
      metaMerge: { phase: 'queued-bootstrap', campaignId: campaign.id },
    });
    enqueueCampaignBootstrap(campaign.id, req.user!.id, bootstrapTask.id, bootstrap);

    res.status(201).json({
      campaign: {
        id: campaign.id,
        handle: campaign.handle,
        name: campaign.name,
      },
      taskId: bootstrapTask.id,
    });
  } catch (error) {
    updateBackgroundTask(bootstrapTask.id, {
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to create sample campaign',
    });
    console.error('[admin-sample-data] generate-campaign failed', error);
    res.status(500).json({ error: 'Failed to create sample data campaign' });
  }
}
