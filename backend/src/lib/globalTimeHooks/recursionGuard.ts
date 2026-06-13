import { AsyncLocalStorage } from 'node:async_hooks';

const globalTimeHooksDepth = new AsyncLocalStorage<number>();

export function isGlobalTimeHooksRunning(): boolean {
  return (globalTimeHooksDepth.getStore() ?? 0) > 0;
}

export function assertNotNestedGlobalTimeHooks(): void {
  if (isGlobalTimeHooksRunning()) {
    throw new Error('NESTED_GLOBAL_TIME_HOOKS');
  }
}

export async function withGlobalTimeHooksGuard<T>(fn: () => Promise<T>): Promise<T> {
  const depth = globalTimeHooksDepth.getStore() ?? 0;
  if (depth > 0) {
    throw new Error('NESTED_GLOBAL_TIME_HOOKS');
  }
  return globalTimeHooksDepth.run(1, fn);
}

/** Test helper — reset async local storage between cases. */
export function resetGlobalTimeHooksGuardForTests(): void {
  void globalTimeHooksDepth.disable();
}
