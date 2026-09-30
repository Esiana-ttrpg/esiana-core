/**
 * Centralized rate limiting for Esiana.
 *
 * Rate limiting is an abuse-control layer only. It must not alter existing
 * authentication, authorization, visibility, or public/private access semantics.
 *
 * Policies are cumulative. A request may consume account, API-key, mutation,
 * and expensive-operation budgets independently.
 *
 * Identity resolution reuses existing session / API-token auth annotations —
 * no separate credential system for rate limiting.
 */
export { resolveRateLimitActor, clientIpKey } from './actor.js';
export type { RateLimitActor, RateLimitActorKind } from './actor.js';
export {
  rateLimitPolicy,
  createMarkedLimiter,
} from './policies.js';
export type {
  RateLimitPolicyName,
  RateLimitScope,
  RateLimitPolicyOptions,
  RateLimitPolicyHandler,
} from './policies.js';
export { createRateLimitStore } from './store.js';
export { createRateLimitHandler } from './response.js';
export { configureTrustProxy } from './trustProxy.js';
export {
  collectRateLimitCoverage,
  formatRateLimitCoverageReport,
  findUncoveredOperations,
} from './coverage.js';
