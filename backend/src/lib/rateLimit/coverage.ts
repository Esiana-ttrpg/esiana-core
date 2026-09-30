import type { RequestHandler } from 'express';
import { listRouterMounts } from '../../mountRouters.js';
import { RATE_LIMIT_COVERAGE_EXEMPTIONS } from './coverage.exemptions.js';

export interface RateLimitCoverageEntry {
  method: string;
  path: string;
  policies: string[];
}

type StackLayer = {
  handle?: RequestHandler & {
    rateLimitPolicy?: string;
    stack?: StackLayer[];
  };
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
    stack: Array<{
      handle: RequestHandler & { rateLimitPolicy?: string };
    }>;
  };
};

function joinPaths(base: string, segment: string): string {
  const left = base.replace(/\/+$/, '') || '';
  const right =
    segment === '/'
      ? '/'
      : segment.startsWith('/')
        ? segment
        : `/${segment}`;
  if (!left) return right || '/';
  if (right === '/') return left === '' ? '/' : `${left}/`;
  return `${left}${right}`;
}

function extractPolicy(handle: unknown): string | null {
  if (!handle || typeof handle !== 'function') return null;
  const marked = handle as { rateLimitPolicy?: string };
  return typeof marked.rateLimitPolicy === 'string'
    ? marked.rateLimitPolicy
    : null;
}

function walkRouterStack(
  stack: StackLayer[],
  basePath: string,
  inheritedPolicies: string[],
  out: RateLimitCoverageEntry[],
): void {
  let routerPolicies = [...inheritedPolicies];

  for (const layer of stack) {
    if (layer.route) {
      const routePaths = Array.isArray(layer.route.path)
        ? layer.route.path
        : [layer.route.path];
      const routePolicies = [...routerPolicies];
      for (const layerHandle of layer.route.stack) {
        const policy = extractPolicy(layerHandle.handle);
        if (policy && !routePolicies.includes(policy)) {
          routePolicies.push(policy);
        }
      }
      const methods = Object.keys(layer.route.methods)
        .filter((m) => layer.route!.methods[m])
        .map((m) => m.toUpperCase());
      for (const routePath of routePaths) {
        const fullPath = joinPaths(basePath, String(routePath));
        for (const method of methods) {
          out.push({
            method,
            path: fullPath,
            policies: [...routePolicies],
          });
        }
      }
      continue;
    }

    const policy = extractPolicy(layer.handle);
    if (policy) {
      if (!routerPolicies.includes(policy)) {
        routerPolicies.push(policy);
      }
    }
  }
}

/**
 * Collect effective rate-limit policies per HTTP operation from the
 * canonical mount table + each router's middleware stack.
 *
 * Invariant: every externally reachable static HTTP operation has at least
 * one effective policy, unless listed in coverage.exemptions.ts with a reason.
 */
export function collectRateLimitCoverage(): RateLimitCoverageEntry[] {
  const out: RateLimitCoverageEntry[] = [];

  for (const mount of listRouterMounts()) {
    const mountPolicies: string[] = [];
    if (mount.middleware) {
      for (const mw of mount.middleware) {
        const policy = extractPolicy(mw);
        if (policy && !mountPolicies.includes(policy)) {
          mountPolicies.push(policy);
        }
      }
    }

    if (!mount.router) {
      // App-level single route (e.g. GET /uploads/:filename)
      out.push({
        method: 'GET',
        path: mount.path,
        policies: mountPolicies,
      });
      continue;
    }

    const stack = (mount.router as unknown as { stack: StackLayer[] }).stack;
    walkRouterStack(stack, mount.path, mountPolicies, out);
  }

  const byKey = new Map<string, RateLimitCoverageEntry>();
  for (const entry of out) {
    const key = `${entry.method} ${entry.path}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { ...entry, policies: [...entry.policies] });
      continue;
    }
    for (const p of entry.policies) {
      if (!existing.policies.includes(p)) existing.policies.push(p);
    }
  }
  return [...byKey.values()].sort((a, b) =>
    `${a.method} ${a.path}`.localeCompare(`${b.method} ${b.path}`),
  );
}

export function formatRateLimitCoverageReport(
  entries: RateLimitCoverageEntry[],
): string {
  return entries
    .map((e) => {
      const method = e.method.padEnd(6);
      const path = e.path.padEnd(56);
      const policies = e.policies.length > 0 ? e.policies.join(' + ') : '(none)';
      return `${method} ${path} ${policies}`;
    })
    .join('\n');
}

export function findUncoveredOperations(
  entries: RateLimitCoverageEntry[],
): RateLimitCoverageEntry[] {
  const exemptions = new Set(
    RATE_LIMIT_COVERAGE_EXEMPTIONS.map(
      (e) => `${e.method.toUpperCase()} ${e.path}`,
    ),
  );
  return entries.filter((e) => {
    if (e.policies.length > 0) return false;
    return !exemptions.has(`${e.method} ${e.path}`);
  });
}

export function findEntry(
  entries: RateLimitCoverageEntry[],
  method: string,
  pathIncludes: string,
): RateLimitCoverageEntry | undefined {
  return entries.find(
    (e) =>
      e.method === method.toUpperCase() && e.path.includes(pathIncludes),
  );
}
