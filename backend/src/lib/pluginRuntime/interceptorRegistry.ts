import { env } from '../../config/env.js';
import type {
  DataInterceptorDefinition,
  InterceptorPhase,
  RegisteredDataInterceptor,
} from './types.js';

const hooksByKey = new Map<string, RegisteredDataInterceptor[]>();
const hookCountByPlugin = new Map<string, number>();

function hookKey(entity: string, phase: InterceptorPhase): string {
  return `${entity}:${phase}`;
}

export function registerDataInterceptor(
  pluginId: string,
  pluginRoot: string,
  definition: DataInterceptorDefinition,
): void {
  const count = hookCountByPlugin.get(pluginId) ?? 0;
  if (count >= env.pluginMaxHooksPerPlugin) {
    throw new Error(
      `Plugin "${pluginId}" exceeded max data interceptors (${env.pluginMaxHooksPerPlugin})`,
    );
  }

  const key = hookKey(definition.entity, definition.phase);
  const entry: RegisteredDataInterceptor = {
    ...definition,
    exportName: definition.exportName ?? 'default',
    failMode: definition.failMode ?? 'open',
    pluginId,
    pluginRoot,
  };

  const bucket = hooksByKey.get(key) ?? [];
  bucket.push(entry);
  hooksByKey.set(key, bucket);
  hookCountByPlugin.set(pluginId, count + 1);
}

export function unregisterPluginInterceptors(pluginId: string): void {
  for (const [key, bucket] of hooksByKey.entries()) {
    const next = bucket.filter((hook) => hook.pluginId !== pluginId);
    if (next.length === 0) {
      hooksByKey.delete(key);
    } else {
      hooksByKey.set(key, next);
    }
  }
  hookCountByPlugin.delete(pluginId);
}

export function clearInterceptorRegistry(): void {
  hooksByKey.clear();
  hookCountByPlugin.clear();
}

export function getInterceptorsFor(
  entity: string,
  phase: InterceptorPhase,
): RegisteredDataInterceptor[] {
  return [...(hooksByKey.get(hookKey(entity, phase)) ?? [])];
}

export function getInterceptorHookCount(pluginId: string): number {
  return hookCountByPlugin.get(pluginId) ?? 0;
}
