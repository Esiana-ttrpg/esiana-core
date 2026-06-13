import { prisma } from '../prisma.js';

export const PLUGIN_RUNTIME_STATUS = {
  ACTIVE: 'active',
  QUARANTINED: 'quarantined',
} as const;

export type PluginRuntimeStatus =
  (typeof PLUGIN_RUNTIME_STATUS)[keyof typeof PLUGIN_RUNTIME_STATUS];

export interface PluginErrorTrace {
  at: string;
  entity: string;
  phase: string;
  message: string;
}

const QUARANTINE_FAILURE_THRESHOLD = 5;
const QUARANTINE_WINDOW_MS = 10 * 60 * 1000;
const MAX_RECENT_ERRORS = 5;

const failureTimestamps = new Map<string, number[]>();

function pruneFailures(pluginId: string, now: number): number[] {
  const windowStart = now - QUARANTINE_WINDOW_MS;
  const recent = (failureTimestamps.get(pluginId) ?? []).filter((ts) => ts >= windowStart);
  failureTimestamps.set(pluginId, recent);
  return recent;
}

export function getRecentFailureCount(pluginId: string): number {
  return pruneFailures(pluginId, Date.now()).length;
}

export function shouldQuarantinePlugin(pluginId: string): boolean {
  return getRecentFailureCount(pluginId) >= QUARANTINE_FAILURE_THRESHOLD;
}

export async function recordPluginHookFailure(input: {
  pluginId: string;
  entity: string;
  phase: string;
  message: string;
}): Promise<{ quarantine: boolean; failureCount: number }> {
  const now = Date.now();
  const recent = pruneFailures(input.pluginId, now);
  recent.push(now);
  failureTimestamps.set(input.pluginId, recent);

  const trace: PluginErrorTrace = {
    at: new Date(now).toISOString(),
    entity: input.entity,
    phase: input.phase,
    message: input.message,
  };

  const record = await prisma.installedPlugin.findUnique({
    where: { name: input.pluginId },
    select: { recentErrors: true },
  });

  if (record) {
    const existing = Array.isArray(record.recentErrors)
      ? (record.recentErrors as unknown as PluginErrorTrace[])
      : [];
    const nextErrors = [trace, ...existing].slice(0, MAX_RECENT_ERRORS);
    await prisma.installedPlugin.update({
      where: { name: input.pluginId },
      data: { recentErrors: nextErrors as object[] },
    });
  }

  const quarantine = recent.length >= QUARANTINE_FAILURE_THRESHOLD;
  return { quarantine, failureCount: recent.length };
}

export async function setPluginQuarantined(
  pluginId: string,
  reason: string,
): Promise<void> {
  await prisma.installedPlugin.updateMany({
    where: { name: pluginId },
    data: {
      runtimeStatus: PLUGIN_RUNTIME_STATUS.QUARANTINED,
      quarantineReason: reason,
      quarantinedAt: new Date(),
    },
  });
}

export async function clearPluginQuarantineState(pluginId: string): Promise<void> {
  failureTimestamps.delete(pluginId);
  await prisma.installedPlugin.updateMany({
    where: { name: pluginId },
    data: {
      runtimeStatus: PLUGIN_RUNTIME_STATUS.ACTIVE,
      quarantineReason: null,
      quarantinedAt: null,
      recentErrors: [],
    },
  });
}

export function resetPluginFailureTrackingForTests(): void {
  failureTimestamps.clear();
}
