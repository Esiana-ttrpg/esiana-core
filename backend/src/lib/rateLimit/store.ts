import { MemoryStore, type Store } from 'express-rate-limit';
import { env } from '../../config/env.js';

/**
 * Owns construction of the concrete rate-limit store for each policy.
 *
 * Only `memory` is supported in this release. A future distributed adapter
 * (e.g. Redis) would be added by extending this factory and the accepted
 * `RATE_LIMIT_STORE` values together with its connection config — not by
 * advertising an unimplemented selectable mode.
 */
export function createRateLimitStore(_policyName: string): Store {
  // env.rateLimit.store is validated at config load to `memory` only.
  void env.rateLimit.store;
  return new MemoryStore();
}
