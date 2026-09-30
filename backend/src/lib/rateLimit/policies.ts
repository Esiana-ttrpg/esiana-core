import rateLimit, {
  type Options,
  type RateLimitRequestHandler,
} from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { resolveRateLimitActor } from './actor.js';
import { createRateLimitHandler } from './response.js';
import {
  createRateLimitStore,
  rateLimitStoreKey,
} from './store.js';

/**
 * Named rate-limit policies.
 *
 * Policies are cumulative: a request may consume account, API-key, mutation,
 * and expensive-operation budgets independently. `expensive` never replaces
 * `mutation`. For API-token requests, the effective ceiling is the per-key
 * (`apiKey`) limit while all of a user's keys together remain bounded by the
 * account-wide (`authenticated` / `mutation` / `expensive` / `admin`) limit.
 *
 * Budgets are process-global per effective `(policy, scope)`. Multiple
 * middleware placements for the same policy/scope reuse one cached handler
 * (express-rate-limit forbids sharing a MemoryStore across distinct limiter
 * instances — caching the handler is how we share the allowance safely).
 */
export type RateLimitPolicyName =
  | 'authenticated'
  | 'mutation'
  | 'expensive'
  | 'public'
  | 'admin'
  | 'apiKey';

export type RateLimitScope = 'account' | 'ip' | 'key';

export interface RateLimitPolicyOptions {
  /** Override the policy's default scope (e.g. `{ scope: 'ip' }` for anonymous disk streams). */
  scope?: RateLimitScope;
  /** Override max for tests / special mounts. */
  max?: number;
  /** Override window for tests / special mounts. */
  windowMs?: number;
}

export type RateLimitPolicyHandler = RateLimitRequestHandler & {
  rateLimitPolicy: string;
  rateLimitScope: RateLimitScope;
};

interface PolicyDefinition {
  name: RateLimitPolicyName;
  scope: RateLimitScope;
  max: number;
  windowMs: number;
  /** When true, skip GET/HEAD/OPTIONS. */
  mutationsOnly?: boolean;
}

function policyDefinitions(): Record<RateLimitPolicyName, PolicyDefinition> {
  const rl = env.rateLimit;
  return {
    authenticated: {
      name: 'authenticated',
      scope: 'account',
      max: rl.authenticatedMax,
      windowMs: rl.authenticatedWindowMs,
    },
    mutation: {
      name: 'mutation',
      scope: 'account',
      max: rl.mutationMax,
      windowMs: rl.mutationWindowMs,
      mutationsOnly: true,
    },
    expensive: {
      name: 'expensive',
      scope: 'account',
      max: rl.expensiveMax,
      windowMs: rl.expensiveWindowMs,
    },
    public: {
      name: 'public',
      scope: 'ip',
      max: rl.publicMax,
      windowMs: rl.publicWindowMs,
    },
    admin: {
      name: 'admin',
      scope: 'account',
      max: rl.adminMax,
      windowMs: rl.adminWindowMs,
    },
    apiKey: {
      name: 'apiKey',
      scope: 'key',
      max: rl.apiKeyMax,
      windowMs: rl.apiKeyWindowMs,
    },
  };
}

function recordPolicy(res: Response, name: string): void {
  const locals = res.locals as { rateLimitPolicies?: string[] };
  if (!locals.rateLimitPolicies) locals.rateLimitPolicies = [];
  if (!locals.rateLimitPolicies.includes(name)) {
    locals.rateLimitPolicies.push(name);
  }
}

function keyForScope(
  req: Request,
  scope: RateLimitScope,
  policyName: string,
): string {
  const actor = resolveRateLimitActor(req);
  switch (scope) {
    case 'ip':
      return `${policyName}:ip:${actor.ip}`;
    case 'key':
      return `${policyName}:key:${actor.apiTokenId ?? 'none'}`;
    case 'account':
    default:
      return `${policyName}:${actor.accountKey}`;
  }
}

/**
 * Cached handlers keyed by effective budget identity.
 * express-rate-limit requires one MemoryStore per limiter instance; we share
 * budgets by returning the same handler rather than reusing stores.
 */
const handlersByBudgetKey = new Map<string, RateLimitPolicyHandler>();

function buildLimiter(
  name: string,
  scope: RateLimitScope,
  max: number,
  windowMs: number,
  mutationsOnly: boolean,
  storeKey: string,
): RateLimitPolicyHandler {
  if (!env.rateLimit.enabled) {
    const passthrough = ((_req: Request, res: Response, next: NextFunction) => {
      recordPolicy(res, name);
      next();
    }) as RateLimitPolicyHandler;
    passthrough.rateLimitPolicy = name;
    passthrough.rateLimitScope = scope;
    return passthrough;
  }

  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // One store per cached handler (store key matches budget key).
    store: createRateLimitStore(storeKey),
    // Disable the unshared-store check: we intentionally own the store via
    // createRateLimitStore and never attach it to a second rateLimit() call.
    validate: { unsharedStore: false },
    handler: createRateLimitHandler({ policy: name, scope }),
    keyGenerator: (req) => keyForScope(req, scope, name),
    skip: (req) => {
      if (mutationsOnly) {
        const method = req.method.toUpperCase();
        if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
          return true;
        }
      }
      if (scope === 'key') {
        const actor = resolveRateLimitActor(req);
        return !actor.apiTokenId;
      }
      return false;
    },
  }) as RateLimitPolicyHandler;

  const original = limiter.bind(limiter);
  const wrapped = ((req: Request, res: Response, next: NextFunction) => {
    recordPolicy(res, name);
    return original(req, res, next);
  }) as RateLimitPolicyHandler;

  Object.assign(wrapped, limiter);
  wrapped.rateLimitPolicy = name;
  wrapped.rateLimitScope = scope;
  return wrapped;
}

/**
 * Create a named rate-limit policy middleware.
 * Attaches a `rateLimitPolicy` marker for coverage audits.
 *
 * Instances for a given effective `(name, scope[, max, windowMs])` are cached
 * so middleware construction does not create independent budgets.
 */
export function rateLimitPolicy(
  name: RateLimitPolicyName,
  options: RateLimitPolicyOptions = {},
): RateLimitPolicyHandler {
  const def = policyDefinitions()[name];
  const scope = options.scope ?? def.scope;
  const hasOverride =
    options.max !== undefined || options.windowMs !== undefined;
  const max = options.max ?? def.max;
  const windowMs = options.windowMs ?? def.windowMs;
  const mutationsOnly = def.mutationsOnly === true;

  const storeKey = rateLimitStoreKey(
    name,
    scope,
    hasOverride ? { max, windowMs } : undefined,
  );

  const cached = handlersByBudgetKey.get(storeKey);
  if (cached) return cached;

  const handler = buildLimiter(
    name,
    scope,
    max,
    windowMs,
    mutationsOnly,
    storeKey,
  );
  handlersByBudgetKey.set(storeKey, handler);
  return handler;
}

/**
 * Shared factory for legacy / narrow credential limiters in middleware/rateLimit.ts.
 * Attaches a `rateLimitPolicy` marker so the coverage audit can name them.
 * Each legacy name is unique and constructed once at module load.
 */
export function createMarkedLimiter(
  policyName: string,
  scope: string,
  options: Partial<Options>,
): RateLimitPolicyHandler {
  const storeKey = rateLimitStoreKey(policyName, scope);
  const cached = handlersByBudgetKey.get(storeKey);
  if (cached) return cached;

  if (!env.rateLimit.enabled) {
    const passthrough = ((_req: Request, res: Response, next: NextFunction) => {
      recordPolicy(res, policyName);
      next();
    }) as RateLimitPolicyHandler;
    passthrough.rateLimitPolicy = policyName;
    passthrough.rateLimitScope = scope as RateLimitScope;
    handlersByBudgetKey.set(storeKey, passthrough);
    return passthrough;
  }

  const limiter = rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: createRateLimitStore(storeKey),
    validate: { unsharedStore: false },
    handler: createRateLimitHandler({ policy: policyName, scope }),
    ...options,
  }) as RateLimitPolicyHandler;

  const original = limiter.bind(limiter);
  const wrapped = ((req: Request, res: Response, next: NextFunction) => {
    recordPolicy(res, policyName);
    return original(req, res, next);
  }) as RateLimitPolicyHandler;

  Object.assign(wrapped, limiter);
  wrapped.rateLimitPolicy = policyName;
  wrapped.rateLimitScope = scope as RateLimitScope;
  handlersByBudgetKey.set(storeKey, wrapped);
  return wrapped;
}

/** Test helper: clear cached handlers (pair with resetRateLimitStoresForTests). */
export function resetRateLimitPolicyCacheForTests(): void {
  handlersByBudgetKey.clear();
}
