import {
  GLOBAL_TIME_HOOK_DEFINITIONS,
  GLOBAL_TIME_HOOK_ORDER,
  STUB_HANDLER_VERSION,
  type GlobalTimeHookId,
} from '../../../../../shared/globalTimeHooks.js';
import { PHASE_1_STUB_HANDLERS } from './stubs.js';
import type { RegisteredGlobalTimeHook } from './types.js';

const registry = new Map<GlobalTimeHookId, RegisteredGlobalTimeHook>();

function ensureRegistry(): void {
  for (const hookId of GLOBAL_TIME_HOOK_ORDER) {
    if (registry.has(hookId)) continue;
    const stub = PHASE_1_STUB_HANDLERS[hookId];
    registry.set(hookId, {
      hookId,
      handlerVersion: STUB_HANDLER_VERSION,
      run: stub.run,
    });
  }
}

export function getRegisteredGlobalTimeHooks(): RegisteredGlobalTimeHook[] {
  ensureRegistry();
  return GLOBAL_TIME_HOOK_ORDER.map((hookId) => {
    const entry = registry.get(hookId);
    if (!entry) {
      throw new Error(`Missing registered handler for ${hookId}`);
    }
    return entry;
  });
}

export function getHookKind(hookId: GlobalTimeHookId) {
  const def = GLOBAL_TIME_HOOK_DEFINITIONS.find((entry) => entry.id === hookId);
  if (!def) throw new Error(`Unknown hook: ${hookId}`);
  return def.kind;
}

/** Phase 2+ replaces entries via this registry API. */
export function registerGlobalTimeHook(entry: RegisteredGlobalTimeHook): void {
  ensureRegistry();
  registry.set(entry.hookId, entry);
}

export function clearGlobalTimeHookRegistryForTests(): void {
  registry.clear();
}
