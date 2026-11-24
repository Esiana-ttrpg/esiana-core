import { getOrCreateSystemSettings } from '../../systemSettings.js';

export async function getWrappedFeatureFlags(): Promise<{
  wrappedEnabled: boolean;
  publicWrappedPublishingEnabled: boolean;
}> {
  const settings = await getOrCreateSystemSettings();
  return {
    wrappedEnabled: settings.wrappedEnabled ?? true,
    publicWrappedPublishingEnabled: settings.publicWrappedPublishingEnabled ?? true,
  };
}
