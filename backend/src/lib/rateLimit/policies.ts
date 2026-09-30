import rateLimit, {
  type Options,
  type RateLimitRequestHandler,
} from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';
import { resolveRateLimitActor } from './actor.js';
import { createRateLimitHandler } from './response.js';
import { createRateLimitStore } from './store.js';

/**
 * Named rate-limit policies.
 *
 * Policies are cumulative: a request may consume account, API-key, mutation,
 * and expensive-operation budgets independently. `expensive` never replaces
 * `mutation`. For API-token requests, the effective ceiling is the per-key
 * (`apiKey`) limit while all of a user's keys together remain bounded by the
 * account-wide (`authenticated` / `mutation` / `expensive` / `admin`) limit.
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
 * Create a named rate-limit policy middleware.
 * Attaches a `rateLimitPolicy` marker for coverage audits.
 */
export function rateLimitPolicy(
  name: RateLimitPolicyName,
  options: RateLimitPolicyOptions = {},
): RateLimitPolicyHandler {
  const def = policyDefinitions()[name];
  const scope = options.scope ?? def.scope;
  const max = options.max ?? def.max;
  const windowMs = options.windowMs ?? def.windowMs;
  const mutationsOnly = def.mutationsOnly === true;

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
    store: createRateLimitStore(`${name}:${scope}`),
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

  // Wrap so skipped (and allowed) requests still record the policy for observability.
  const original = limiter.bind(limiter);
  const wrapped = ((req: Request, res: Response, next: NextFunction) => {
    recordPolicy(res, name);
    return original(req, res, next);
  }) as RateLimitPolicyHandler;

  // Preserve express-rate-limit helpers (resetKey, etc.) and coverage markers.
  Object.assign(wrapped, limiter);
  wrapped.rateLimitPolicy = name;
  wrapped.rateLimitScope = scope;

  return wrapped;
}

/**
 * Shared factory for legacy / narrow credential limiters in middleware/rateLimit.ts.
 * Attaches a `rateLimitPolicy` marker so the coverage audit can name them.
 */
export function createMarkedLimiter(
  policyName: string,
  scope: string,
  options: Partial<Options>,
): RateLimitPolicyHandler {
  if (!env.rateLimit.enabled) {
    const passthrough = ((_req: Request, res: Response, next: NextFunction) => {
      recordPolicy(res, policyName);
      next();
    }) as RateLimitPolicyHandler;
    passthrough.rateLimitPolicy = policyName;
    passthrough.rateLimitScope = scope as RateLimitScope;
    return passthrough;
  }

  const limiter = rateLimit({
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    store: createRateLimitStore(policyName),
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
  return wrapped;
}
