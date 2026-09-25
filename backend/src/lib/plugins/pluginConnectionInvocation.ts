import type { Request } from 'express';

export interface PluginConnectionInvocation {
  campaignId: string;
}

const invocations = new WeakMap<Request, PluginConnectionInvocation>();

/** Called only by core middleware after authentication and campaign-membership checks. */
export function registerPluginConnectionInvocation(req: Request, invocation: PluginConnectionInvocation): void {
  invocations.set(req, invocation);
}

/** Rejects fabricated request-like objects and returns only core-established identity. */
export function requirePluginConnectionInvocation(req: Request): PluginConnectionInvocation {
  const invocation = invocations.get(req);
  if (!invocation) throw new Error('Authenticated plugin request context is required');
  return invocation;
}
