/**
 * Centralized rate limiting for Esiana.
 *
 * Rate limiting is an abuse-control layer only. It must not alter existing
 * authentication, authorization, visibility, or public/private access semantics.
 *
 * Policies are cumulative. A request may consume account, API-key, mutation,
 * and expensive-operation budgets independently.
 *
 * Budgets are process-global per effective `(policy, scope)`: constructing
 * `rateLimitPolicy('expensive')` on many routes returns the same middleware
 * (and thus the same allowance). Different policies and scope overrides stay
 * separate.
 *
 * Identity resolution reuses existing session / API-token auth annotations —
 * no separate credential system for rate limiting.
 *
 * Coverage audit helpers live in `./coverage.js` and must not be re-exported
 * here — they import routers and would create a circular dependency with
 * `middleware/rateLimit.ts`.
 */
export { resolveRateLimitActor, clientIpKey } from './actor.js';
export type { RateLimitActor, RateLimitActorKind } from './actor.js';
export {
  rateLimitPolicy,
  createMarkedLimiter,
  resetRateLimitPolicyCacheForTests,
} from './policies.js';
export type {
  RateLimitPolicyName,
  RateLimitScope,
  RateLimitPolicyOptions,
  RateLimitPolicyHandler,
} from './policies.js';
export {
  createRateLimitStore,
  resetRateLimitStoresForTests,
  rateLimitStoreKey,
} from './store.js';
export { createRateLimitHandler } from './response.js';
export { configureTrustProxy } from './trustProxy.js';
