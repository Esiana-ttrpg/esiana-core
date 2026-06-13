import { env } from '../../config/env.js';
import { createFilesystemDriver, FILESYSTEM_PROVIDER_ID } from './filesystemDriver.js';
import {
  validateFilesystemConfig,
  validateProviderConfig,
} from './storageProviderConfig.js';
import { FILESYSTEM_DRIVER_VERSION } from './storageDescriptor.js';
import type {
  StorageDriver,
  StorageProviderHealthState,
  StorageProviderRegistration,
  StorageProviderSnapshot,
} from './types.js';

const registrations = new Map<string, StorageProviderRegistration>();
const activeInstances = new Map<string, StorageDriver>();
const healthByProvider = new Map<
  string,
  { state: StorageProviderHealthState; detail?: string }
>();

export class ActiveStorageUnavailableError extends Error {
  readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = 'ActiveStorageUnavailableError';
    this.detail = detail;
  }
}

function defaultFilesystemFactory(config: Record<string, unknown>): StorageDriver {
  const uploadsDir =
    typeof config.uploadsDir === 'string' && config.uploadsDir.trim()
      ? config.uploadsDir
      : env.uploadsDir;
  return createFilesystemDriver(uploadsDir);
}

function setProviderHealth(
  providerId: string,
  state: StorageProviderHealthState,
  detail?: string,
): void {
  healthByProvider.set(providerId, { state, detail });
}

export function registerStorageProvider(
  registration: StorageProviderRegistration,
): void;
export function registerStorageProvider(
  providerId: string,
  factory: StorageProviderRegistration['factory'],
  options?: Partial<
    Pick<
      StorageProviderRegistration,
      'displayName' | 'version' | 'resolveConfig' | 'capabilities'
    >
  >,
): void;
export function registerStorageProvider(
  registrationOrId: StorageProviderRegistration | string,
  factory?: StorageProviderRegistration['factory'],
  options?: Partial<
    Pick<
      StorageProviderRegistration,
      'displayName' | 'version' | 'resolveConfig' | 'capabilities'
    >
  >,
): void {
  const registration: StorageProviderRegistration =
    typeof registrationOrId === 'string'
      ? {
          providerId: registrationOrId,
          displayName: options?.displayName ?? registrationOrId,
          version: options?.version ?? 'unknown',
          factory: factory!,
          resolveConfig: options?.resolveConfig,
          capabilities: options?.capabilities ?? {},
        }
      : registrationOrId;

  const id = registration.providerId.trim();
  if (!id) throw new Error('Storage provider id is required');
  if (!registration.factory) throw new Error('Storage provider factory is required');

  registrations.set(id, registration);
  activeInstances.delete(id);
  if (!healthByProvider.has(id)) {
    healthByProvider.set(id, { state: 'uninitialized' });
  }
}

export function getActiveProviderId(): string {
  return process.env.STORAGE_PROVIDER?.trim() || env.storageProvider;
}

export function getRegisteredProviders(): StorageProviderSnapshot[] {
  const activeId = getActiveProviderId();
  return [...registrations.keys()]
    .sort()
    .map((providerId) => {
      const registration = registrations.get(providerId)!;
      const health = healthByProvider.get(providerId) ?? {
        state: 'uninitialized' as const,
      };
      return {
        providerId,
        displayName: registration.displayName,
        version: registration.version,
        capabilities: registration.capabilities,
        health: health.state,
        healthDetail: health.detail,
        isActive: providerId === activeId,
      };
    });
}

export function getProviderHealth(providerId: string): {
  state: StorageProviderHealthState;
  detail?: string;
} {
  return healthByProvider.get(providerId.trim()) ?? { state: 'uninitialized' };
}

export function getActiveProviderHealth(): {
  state: StorageProviderHealthState;
  detail?: string;
} {
  return getProviderHealth(getActiveProviderId());
}

export function resolveStorageProvider(providerId: string): StorageDriver | null {
  const id = providerId.trim();
  const cached = activeInstances.get(id);
  if (cached) return cached;

  const registration = registrations.get(id);
  if (!registration) return null;

  try {
    const config = registration.resolveConfig?.() ?? {};
    const instance = registration.factory(config);
    if (instance instanceof Promise) {
      throw new Error(
        `Storage provider "${id}" returned a Promise; resolve async factories before use`,
      );
    }
    activeInstances.set(id, instance);
    return instance;
  } catch (error) {
    console.warn('[storageRegistry] Failed to initialize storage provider', {
      providerId: id,
      error,
    });
    return null;
  }
}

export function listStorageProviders(): string[] {
  return [...registrations.keys()].sort();
}

export function getRegistration(
  providerId: string,
): StorageProviderRegistration | undefined {
  return registrations.get(providerId.trim());
}

export function getActiveStorageDriver(): StorageDriver {
  const activeId = getActiveProviderId();
  const health = getProviderHealth(activeId);

  if (health.state === 'degraded') {
    throw new ActiveStorageUnavailableError(
      health.detail ??
        `Active storage provider "${activeId}" is unavailable. Check Admin Storage or environment configuration.`,
      health.detail,
    );
  }

  const driver = resolveStorageProvider(activeId);
  if (driver) return driver;

  throw new ActiveStorageUnavailableError(
    `No storage provider registered for "${activeId}". Set STORAGE_PROVIDER or bootstrap the registry.`,
  );
}

export function clearProviderInstance(providerId: string): void {
  activeInstances.delete(providerId.trim());
}

/** Bootstrap built-in filesystem provider. Called once at app startup. */
export function bootstrapStorageRegistry(): void {
  if (!registrations.has(FILESYSTEM_PROVIDER_ID)) {
    registerStorageProvider({
      providerId: FILESYSTEM_PROVIDER_ID,
      displayName: 'Filesystem Storage Driver',
      version: FILESYSTEM_DRIVER_VERSION,
      factory: defaultFilesystemFactory,
      resolveConfig: () => ({ uploadsDir: env.uploadsDir }),
      capabilities: {
        redirectDelivery: false,
        metrics: true,
        orphanDetection: true,
      },
    });
  }

  const filesystemValidation = validateFilesystemConfig();
  if (filesystemValidation.ok) {
    setProviderHealth(FILESYSTEM_PROVIDER_ID, 'healthy');
  } else {
    setProviderHealth(FILESYSTEM_PROVIDER_ID, 'degraded', filesystemValidation.error);
  }
}

/** Validate and mark health for the active write provider after all registrations. */
export function initializeActiveStorageProvider(): void {
  const activeId = getActiveProviderId();
  if (!registrations.has(activeId)) {
    setProviderHealth(
      activeId,
      'degraded',
      `Storage provider "${activeId}" is not registered`,
    );
    return;
  }

  const validation = validateProviderConfig(activeId);
  if (!validation.ok) {
    setProviderHealth(activeId, 'degraded', validation.error);
    return;
  }

  setProviderHealth(activeId, 'healthy');
}

export async function checkProviderHealthOnDemand(
  providerId: string,
): Promise<{ state: StorageProviderHealthState; detail?: string }> {
  const validation = validateProviderConfig(providerId);
  if (!validation.ok) {
    setProviderHealth(providerId, 'degraded', validation.error);
    return { state: 'degraded', detail: validation.error };
  }

  const driver = resolveStorageProvider(providerId);
  if (!driver) {
    const detail = `Storage provider "${providerId}" failed to initialize`;
    setProviderHealth(providerId, 'degraded', detail);
    return { state: 'degraded', detail };
  }

  if (typeof driver.checkHealth === 'function') {
    try {
      const result = await driver.checkHealth();
      if (!result.ok) {
        setProviderHealth(providerId, 'degraded', result.detail);
        return { state: 'degraded', detail: result.detail };
      }
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Storage health check failed';
      setProviderHealth(providerId, 'degraded', detail);
      return { state: 'degraded', detail };
    }
  }

  setProviderHealth(providerId, 'healthy');
  return { state: 'healthy' };
}

export function clearStorageRegistryForTests(): void {
  registrations.clear();
  activeInstances.clear();
  healthByProvider.clear();
}
