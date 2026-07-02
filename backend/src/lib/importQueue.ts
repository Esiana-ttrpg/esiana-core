import { processCampaignImportZip } from './campaignImportProcessor.js';
import { processCampaignBackupRestore } from './campaignBackupRestore.js';
import { processCampaignBootstrap } from './campaignBootstrapProcessor.js';
import type { CampaignBootstrapSpec } from './campaignBootstrap.js';
import type { WizardGeneratorSpec } from './campaignGenerators.js';
import { updateBackgroundTask } from './taskRegistry.js';

/**
 * Fire-and-forget campaign ZIP ingestion worker.
 * Keeps HTTP handlers responsive while the import processor runs asynchronously.
 */
export function enqueueCampaignImportZip(
  campaignId: string,
  taskId: string,
): void {
  updateBackgroundTask(taskId, {
    status: 'PENDING',
    progress: 10,
    metaMerge: { campaignId, phase: 'queued' },
  });

  void processCampaignImportZip(campaignId, { taskId }).catch((error) => {
    console.error('[import-queue] Campaign ZIP import failed', {
      campaignId,
      taskId,
      error,
    });
  });
}

export function enqueueCampaignBackupRestore(
  campaignId: string,
  taskId: string,
): void {
  updateBackgroundTask(taskId, {
    status: 'PENDING',
    progress: 10,
    metaMerge: { campaignId, phase: 'queued-restore' },
  });

  void processCampaignBackupRestore(campaignId, { taskId }).catch((error) => {
    console.error('[import-queue] Campaign backup restore failed', {
      campaignId,
      taskId,
      error,
    });
  });
}

export function enqueueCampaignBootstrap(
  campaignId: string,
  userId: string,
  taskId: string,
  bootstrapSpec: CampaignBootstrapSpec | WizardGeneratorSpec,
): void {
  const phase =
    'kind' in bootstrapSpec && bootstrapSpec.kind === 'contentPack'
      ? 'queued-content-pack'
      : 'kind' in bootstrapSpec && bootstrapSpec.kind === 'sampleData'
        ? 'queued-sample-data'
        : 'queued-generator';

  updateBackgroundTask(taskId, {
    status: 'PENDING',
    progress: 10,
    metaMerge: {
      campaignId,
      phase,
      ...('profileId' in bootstrapSpec && bootstrapSpec.profileId
        ? { profileId: bootstrapSpec.profileId }
        : {}),
      ...('packId' in bootstrapSpec && bootstrapSpec.packId
        ? { packId: bootstrapSpec.packId }
        : {}),
      ...('presetId' in bootstrapSpec && bootstrapSpec.presetId
        ? { presetId: bootstrapSpec.presetId }
        : {}),
    },
  });

  void processCampaignBootstrap(campaignId, userId, bootstrapSpec, { taskId }).catch(
    (error) => {
      console.error('[import-queue] Campaign bootstrap failed', {
        campaignId,
        taskId,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
    },
  );
}
