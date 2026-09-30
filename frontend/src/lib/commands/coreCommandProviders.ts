import { registerCommandProvider } from './commandRegistry.js';
import { coreCampaignCommandProvider } from './providers/coreCampaignCommands.js';
import { coreCreateCommandProvider } from './providers/coreCreateCommands.js';
import { coreNavigationCommandProvider } from './providers/coreNavigationCommands.js';
import { corePageCommandProvider } from './providers/corePageCommands.js';

let providersRegistered = false;

/**
 * Explicit, idempotent Core command provider bootstrap.
 * Call from GlobalSearchProvider mount — never as an import side effect.
 */
export function ensureCoreCommandProvidersRegistered(): void {
  if (providersRegistered) return;
  // Page first so registration order matches empty-query group priority
  // when sorting is stable within a group.
  registerCommandProvider(corePageCommandProvider);
  registerCommandProvider(coreCreateCommandProvider);
  registerCommandProvider(coreNavigationCommandProvider);
  registerCommandProvider(coreCampaignCommandProvider);
  providersRegistered = true;
}

/** Test helper — allow re-registration after clearCommandProviders(). */
export function resetCoreCommandProviderBootstrapForTests(): void {
  providersRegistered = false;
}
