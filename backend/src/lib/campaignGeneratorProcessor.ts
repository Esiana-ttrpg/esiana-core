import type { WizardGeneratorSpec } from './campaignGenerators.js';
import { processCampaignBootstrap } from './campaignBootstrapProcessor.js';

/** @deprecated Use processCampaignBootstrap from campaignBootstrapProcessor */
export async function processCampaignGeneratorSeed(
  campaignId: string,
  userId: string,
  generatorSpec: WizardGeneratorSpec,
  options?: { taskId?: string },
): Promise<void> {
  return processCampaignBootstrap(campaignId, userId, generatorSpec, options);
}
