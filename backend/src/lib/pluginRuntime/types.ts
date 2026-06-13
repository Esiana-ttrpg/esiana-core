export const InterceptorPhases = {
  BEFORE_CREATE: 'beforeCreate',
  BEFORE_UPDATE: 'beforeUpdate',
  BEFORE_DELETE: 'beforeDelete',
} as const;

export type InterceptorPhase =
  (typeof InterceptorPhases)[keyof typeof InterceptorPhases];

export type InterceptorFailMode = 'open' | 'closed';

export interface DataInterceptorDefinition {
  entity: string;
  phase: InterceptorPhase;
  /** Path relative to plugin root, e.g. `hooks/wiki-before-create.js`. */
  scriptPath: string;
  exportName?: string;
  /** open = skip on failure; closed = reject request (422). Default open. */
  failMode?: InterceptorFailMode;
}

export interface RegisteredDataInterceptor extends DataInterceptorDefinition {
  pluginId: string;
  pluginRoot: string;
  failMode: InterceptorFailMode;
}

export interface InterceptorRuntimeContext {
  pluginId: string;
  entity: string;
  phase: InterceptorPhase;
  /** Immutable campaign scope injected by host (campaign jail). */
  campaignId: string;
}

export interface RunInterceptorsInput {
  entity: string;
  phase: InterceptorPhase;
  campaignId: string;
  payload: Record<string, unknown>;
}

export interface InterceptorWorkerResult {
  ok: boolean;
  payload?: unknown;
  error?: string;
}

export class InterceptorRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InterceptorRejectedError';
  }
}
