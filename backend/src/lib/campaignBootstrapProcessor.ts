import { canCreateSeededDemoUsers, isSampleDataEnabled } from '../config/env.js';
import { prisma } from './prisma.js';
import { toInputJsonValue } from './inputJsonValue.js';
import {
  campaignBootstrapBaseUrl,
  type CampaignBootstrapSpec,
  toContentPackSpec,
  toSampleDataSpec,
} from './campaignBootstrap.js';
import {
  createEphemeralSeedToken,
  revokeEphemeralSeedTokens,
} from './ephemeralSeedToken.js';
import { validateContentPackRequest } from './sampleData/contentPackRegistry.js';
import { importContentPack } from './sampleData/contentPackImporter.js';
import { mergeContentPackOrigin } from './sampleData/contentPackOrigin.js';
import { buildSkeletonParentKeyMap } from './markdownPackImporter.js';
import {
  buildSeedPlan,
  createRng,
  executeSeedPlan,
  resolveSampleDataSpec,
  SimulationClock,
} from './sampleData/index.js';
import { readManifestForRecord, resolvePluginRoot } from '../plugins/pluginManager.js';
import { updateBackgroundTask } from './taskRegistry.js';
import type { WizardGeneratorSpec } from './campaignGenerators.js';
import { legacyGeneratorToBootstrap } from './campaignBootstrap.js';

async function resolveFirstCalendarId(campaignId: string): Promise<string | null> {
  const calendar = await prisma.fantasyCalendar.findFirst({
    where: { campaignId },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return calendar?.id ?? null;
}

function normalizeBootstrapSpec(
  spec: CampaignBootstrapSpec | WizardGeneratorSpec,
): CampaignBootstrapSpec | null {
  if ('kind' in spec && (spec.kind === 'sampleData' || spec.kind === 'contentPack')) {
    return spec;
  }
  if ('pluginId' in spec && 'presetId' in spec) {
    return legacyGeneratorToBootstrap(spec as WizardGeneratorSpec);
  }
  return null;
}

export async function processCampaignBootstrap(
  campaignId: string,
  userId: string,
  bootstrapSpec: CampaignBootstrapSpec | WizardGeneratorSpec,
  options?: { taskId?: string },
): Promise<void> {
  const taskId = options?.taskId;
  const updateTask = (patch: Parameters<typeof updateBackgroundTask>[1]) => {
    if (taskId) updateBackgroundTask(taskId, patch);
  };

  try {
    updateTask({ status: 'PROCESSING', progress: 5, metaMerge: { phase: 'validating' } });

    const spec = normalizeBootstrapSpec(bootstrapSpec);
    if (!spec) {
      throw new Error('Invalid campaign bootstrap spec');
    }

    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { handle: true, appearanceProfile: true },
    });
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (spec.kind === 'contentPack') {
      const packSpec = toContentPackSpec(spec);
      if (!packSpec) throw new Error('Invalid content pack spec');

      const validated = await validateContentPackRequest(packSpec);
      if (!validated.ok) throw new Error(validated.error);

      const installed = await prisma.installedPlugin.findUnique({
        where: { name: validated.validated.pluginId },
      });
      if (!installed) throw new Error('Content pack plugin not installed');

      const pluginRoot = resolvePluginRoot(installed);
      const packPath = validated.validated.pack.packPath;

      updateTask({
        progress: 15,
        metaMerge: { phase: 'importing-pack', packId: validated.validated.pack.id },
      });

      await importContentPack({
        campaignId,
        campaignSlug: campaign.handle,
        userId,
        pluginId: validated.validated.pluginId,
        packId: validated.validated.pack.id,
        packPath: `${pluginRoot}/${packPath}`.replace(/\\/g, '/'),
        taskId,
      });

      const manifest = readManifestForRecord(installed);
      const origin = mergeContentPackOrigin(campaign.appearanceProfile, {
        pluginId: validated.validated.pluginId,
        pluginVersion: manifest?.version ?? 'unknown',
        packId: validated.validated.pack.id,
        packName: validated.validated.pack.name,
        ...(validated.validated.pack.author ? { author: validated.validated.pack.author } : {}),
        ...(validated.validated.pack.authorUrl ? { authorUrl: validated.validated.pack.authorUrl } : {}),
        importedAt: new Date().toISOString(),
      });

      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          appearanceProfile: toInputJsonValue(origin),
          ...(validated.validated.pack.gameSystem
            ? { gameSystem: validated.validated.pack.gameSystem }
            : {}),
          campaignFormat: validated.validated.recruitmentCampaignFormat,
          ...(validated.validated.pack.genreThemes?.length
            ? { genreThemes: validated.validated.pack.genreThemes }
            : {}),
        },
      });

      updateTask({
        status: 'COMPLETED',
        progress: 100,
        metaMerge: { phase: 'done', packId: validated.validated.pack.id },
      });
      return;
    }

    if (!isSampleDataEnabled()) {
      throw new Error('Sample Data is disabled (ENABLE_SAMPLE_DATA=false)');
    }

    const sampleSpec = toSampleDataSpec(spec);
    if (!sampleSpec) throw new Error('Invalid sample data spec');

    const resolved = resolveSampleDataSpec(sampleSpec);
    if (!resolved.ok) throw new Error(resolved.error);

    updateTask({
      progress: 10,
      metaMerge: { phase: 'planning', profileId: resolved.resolved.profileId },
    });

    const rng = createRng(resolved.resolved.seed);
    const start = new Date();
    start.setUTCDate(start.getUTCDate() - 21);
    const clock = new SimulationClock(start, rng);

    const plan = buildSeedPlan({
      clock,
      rng,
      dmUserId: userId,
      playerUserIds: [userId],
      unresolvedRate: resolved.resolved.params.unresolvedRate,
      density: resolved.resolved.density,
      seedString: resolved.resolved.seed,
      profileParams: resolved.resolved.params,
      enableDemoUsers: canCreateSeededDemoUsers(),
      campaignSlug: campaign.handle,
      skeletonFlavor: spec.skeletonFlavor ?? 'standard',
    });

    updateTask({
      progress: 20,
      metaMerge: { phase: 'executing', opCount: plan.ops.length },
    });

    const bearerToken = await createEphemeralSeedToken(userId);
    const bootstrapIdMap = await buildSkeletonParentKeyMap(campaignId);
    const calendarId = await resolveFirstCalendarId(campaignId);

    try {
      await executeSeedPlan(plan, {
        baseUrl: campaignBootstrapBaseUrl(),
        campaignSlug: campaign.handle,
        bearerToken,
        bootstrapIdMap,
        calendarId,
        concurrency: resolved.resolved.executorConcurrency,
        onProgress: ({ completed, total }) => {
          const pct = total > 0 ? 20 + Math.round((completed / total) * 70) : 20;
          updateTask({ progress: pct, metaMerge: { completed, total } });
        },
      });
    } finally {
      await revokeEphemeralSeedTokens(userId);
    }

    updateTask({
      status: 'COMPLETED',
      progress: 100,
      metaMerge: { phase: 'done', seed: resolved.resolved.seed, profileId: resolved.resolved.profileId },
    });
  } catch (error) {
    updateTask({
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Campaign bootstrap failed',
      metaMerge: { phase: 'failed' },
    });
    throw error;
  }
}
