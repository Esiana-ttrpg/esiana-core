import type { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import {
  getAssetStorageMetrics,
  getActiveStorageHealthSummary,
  getRegisteredProviderSnapshots,
} from '../lib/assetStorageMetrics.js';
import { describeStorageDriverFromRegistration } from '../lib/storage/storageDescriptor.js';
import {
  getActiveProviderId,
  getRegistration,
} from '../lib/storage/storageRegistry.js';
import { sanitizeConfigSummary } from '../lib/storage/storageProviderConfig.js';

export async function getAdminStorageStatus(
  _req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const activeId = getActiveProviderId();
  const healthSummary = getActiveStorageHealthSummary();
  const registeredProviders = getRegisteredProviderSnapshots();
  const activeRegistration = getRegistration(activeId);

  const activeDriver = activeRegistration
    ? describeStorageDriverFromRegistration(activeRegistration, { isActive: true })
    : {
        driverId: activeId,
        displayName: activeId,
        version: 'unknown',
        capabilities: {
          upload: false,
          read: false,
          delete: false,
          thumbnailStorage: false,
        },
        registrationCapabilities: {},
        health: healthSummary.state,
        healthDetail: healthSummary.detail,
        isActive: true,
      };

  const registeredDrivers = registeredProviders.map((snapshot) => {
    const registration = getRegistration(snapshot.providerId);
    if (!registration) {
      return {
        driverId: snapshot.providerId,
        displayName: snapshot.displayName,
        version: snapshot.version,
        capabilities: {
          upload: false,
          read: false,
          delete: false,
          thumbnailStorage: false,
        },
        registrationCapabilities: snapshot.capabilities,
        health: snapshot.health,
        healthDetail: snapshot.healthDetail,
        isActive: snapshot.isActive,
      };
    }
    return describeStorageDriverFromRegistration(registration, {
      isActive: snapshot.isActive,
    });
  });

  res.json({
    activeDriver,
    registeredDrivers,
    health: healthSummary,
    configSummary: sanitizeConfigSummary(activeId),
  });
}

export async function getAdminStorageMetrics(
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> {
  const refresh = String(req.query.refresh ?? '').toLowerCase() === 'true';
  const activeRegistration = getRegistration(getActiveProviderId());
  const metricsEnabled = activeRegistration?.capabilities.metrics === true;

  if (!metricsEnabled) {
    res.status(404).json({
      error: 'Metrics are not available for the active storage provider',
    });
    return;
  }

  const metrics = await getAssetStorageMetrics({ refresh });
  res.json(metrics);
}
