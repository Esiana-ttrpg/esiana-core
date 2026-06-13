import { appendSystemLog } from '../systemLogBuffer.js';
import { prisma } from '../prisma.js';
import { unregisterPluginInterceptors } from './interceptorRegistry.js';
import {
  PLUGIN_RUNTIME_STATUS,
  recordPluginHookFailure,
  setPluginQuarantined,
} from './pluginDiagnostics.js';

let reloadHost: (() => Promise<void>) | null = null;

export function setPluginHostReloader(fn: () => Promise<void>): void {
  reloadHost = fn;
}

export async function handlePluginHookFailure(input: {
  pluginId: string;
  entity: string;
  phase: string;
  reason: string;
  failMode: 'open' | 'closed';
}): Promise<{ rejectRequest: boolean; quarantined: boolean }> {
  const message = `[plugins] Hook failure "${input.pluginId}" (${input.entity}:${input.phase}): ${input.reason}`;
  console.error(message);
  appendSystemLog('error', message);

  const { quarantine, failureCount } = await recordPluginHookFailure({
    pluginId: input.pluginId,
    entity: input.entity,
    phase: input.phase,
    message: input.reason,
  });

  if (quarantine) {
    const quarantineReason = `${failureCount} failures in 10 minutes — last: ${input.reason}`;
    await quarantinePluginHooks(input.pluginId, quarantineReason);
    return {
      rejectRequest: input.failMode === 'closed',
      quarantined: true,
    };
  }

  return {
    rejectRequest: input.failMode === 'closed',
    quarantined: false,
  };
}

export async function quarantinePluginHooks(
  pluginId: string,
  reason: string,
): Promise<void> {
  const fullMessage = `[plugins] Quarantined hooks for "${pluginId}": ${reason}`;
  console.error(fullMessage);
  appendSystemLog('error', fullMessage);

  unregisterPluginInterceptors(pluginId);
  await setPluginQuarantined(pluginId, reason);

  if (reloadHost) {
    setImmediate(() => {
      void reloadHost!().catch((err) => {
        console.error('[plugins] Failed to reload host after quarantine', err);
      });
    });
  }
}

/** @deprecated Use handlePluginHookFailure / quarantinePluginHooks */
export async function disablePluginForViolation(
  pluginId: string,
  reason: string,
): Promise<void> {
  await quarantinePluginHooks(pluginId, reason);
  await prisma.installedPlugin.updateMany({
    where: { name: pluginId },
    data: { isEnabled: false },
  });
  await prisma.systemPlugin.updateMany({
    where: { id: pluginId },
    data: { isEnabled: false },
  });
}

export async function clearPluginRuntimeStatus(pluginId: string): Promise<void> {
  await prisma.installedPlugin.updateMany({
    where: { name: pluginId },
    data: {
      runtimeStatus: PLUGIN_RUNTIME_STATUS.ACTIVE,
      quarantineReason: null,
      quarantinedAt: null,
    },
  });
}
