import { MemoryStore, type Store } from 'express-rate-limit';
import { env } from '../../config/env.js';

/**
 * Process-wide store registry keyed by effective budget identity.
 *
 * Named policies share one store per `(policy, scope)` so constructing
 * `rateLimitPolicy('expensive')` on many routes does not create independent
 * allowances. Different policies and scope overrides remain separate.
 *
 * Only `memory` is supported in this release. A future distributed adapter
 * (e.g. Redis) would be added by extending this factory and the accepted
 * `RATE_LIMIT_STORE` values together with its connection config — not by
 * advertising an unimplemented selectable mode.
 */
const storesByKey = new Map<string, Store>();

export function rateLimitStoreKey(
  policyName: string,
  scope: string,
  /** Present only for test/override limiters so they do not collide with production budgets. */
  override?: { max?: number; windowMs?: number },
): string {
  if (
    override &&
    (override.max !== undefined || override.windowMs !== undefined)
  ) {
    return `${policyName}:${scope}:max=${override.max ?? 'default'}:window=${override.windowMs ?? 'default'}`;
  }
  return `${policyName}:${scope}`;
}

export function createRateLimitStore(storeKey: string): Store {
  // env.rateLimit.store is validated at config load to `memory` only.
  void env.rateLimit.store;

  const existing = storesByKey.get(storeKey);
  if (existing) return existing;

  const store = new MemoryStore();
  storesByKey.set(storeKey, store);
  return store;
}

/** Test helper: drop cached stores so unit tests start from a clean budget. */
export function resetRateLimitStoresForTests(): void {
  storesByKey.clear();
}
